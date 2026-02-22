const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const ytDlp = require("yt-dlp-exec");
const GroupsService = require("../services/groupsService");
const StorageService = require("../services/storageService");
const { db } = require("../services/firebase");

// We no longer read local files, except for tmp processing tasks
const tmpDir = os.tmpdir();
const FILES_COLLECTION = "files"; // Firestore collection to store file metadata

const getTmpPath = (filename) => path.join(tmpDir, filename);

// --- GROUP ENDPOINTS ---
router.get("/groups", async (req, res) => {
  try {
    const groups = await GroupsService.getGroups();
    res.json(groups);
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to fetch groups", details: e.message });
  }
});

router.post("/groups", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Group name is required" });
    const newGroup = await GroupsService.createGroup(name);
    res.json(newGroup);
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to create group", details: e.message });
  }
});

router.put("/groups/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedGroup = await GroupsService.updateGroup(id, updates);
    res.json(updatedGroup);
  } catch (e) {
    res
      .status(404)
      .json({ error: "Failed to update group", details: e.message });
  }
});

router.delete("/groups/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await GroupsService.deleteGroup(id);
    res.json({ message: "Group deleted" });
  } catch (e) {
    res
      .status(404)
      .json({ error: "Failed to delete group", details: e.message });
  }
});

// --- FILE LISTING & METADATA ---
router.get("/files", async (req, res) => {
  try {
    // Read from Firestore instead of local fs
    const snapshot = await db.collection(FILES_COLLECTION).get();
    const files = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        name: doc.id,
        // Replace absolute paths with dynamic API endpoints that generate Signed URLs
        url: `/api/stream/${encodeURIComponent(doc.id)}`,
        imageUrl: data.imageUrl
          ? `/api/thumbnail/${encodeURIComponent(data.imageUrl)}`
          : null,
      };
    });
    res.json(files);
  } catch (e) {
    console.error("Error in /files:", e);
    res.status(500).json({ error: "Failed to list files", details: e.message });
  }
});

// --- STREAMING (SIGNED URL PROXY) ---
router.get("/stream/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const gcsPath = `audio/${filename}`;
    const url = await StorageService.getSignedUrl(gcsPath, 60);

    if (url) {
      res.redirect(url); // Let the browser seamlessly fetch from GCS signed URL
    } else {
      res.status(404).json({ error: "File not found in storage" });
    }
  } catch (e) {
    console.error("Error in /stream:", e);
    res.status(500).json({ error: "Stream failed" });
  }
});

router.get("/thumbnail/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const gcsPath = `thumbnails/${filename}`;
    const url = await StorageService.getSignedUrl(gcsPath, 60);

    if (url) {
      res.redirect(url);
    } else {
      res.status(404).json({ error: "Thumbnail not found" });
    }
  } catch (e) {
    console.error("Error in /thumbnail:", e);
    res.status(500).json({ error: "Thumbnail load failed" });
  }
});

router.get("/stems/:folder/:stem", async (req, res) => {
  const { folder, stem } = req.params;
  const gcsPath = `stems/${folder}/${stem}`;
  // Use a shorter expiration since it's just audio snippets loading
  const url = await StorageService.getSignedUrl(gcsPath, 60);

  if (url) {
    res.redirect(url);
  } else {
    res.status(404).json({ error: "Stem not found" });
  }
});

// --- YOUTUBE DOWNLOAD (PROCESS LOCALLY -> UPLOAD GCS) ---
router.post("/info", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const pythonBinPath = "/opt/homebrew/bin";
    const newPath = `${pythonBinPath}:${process.env.PATH}`;

    const output = await ytDlp(
      url,
      {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
      },
      {
        env: {
          ...process.env,
          PATH: newPath,
          PYTHON: "/opt/homebrew/bin/python3.11",
        },
      },
    );

    const info = {
      title: output.title,
      thumbnail: output.thumbnail,
      duration: output.duration_string,
      channel: output.uploader,
    };

    res.json(info);
  } catch (error) {
    console.error("Error fetching info:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch video info", details: error.message });
  }
});

router.get("/download", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const newPath = `/opt/homebrew/bin:${process.env.PATH}`;

    // Step 1: Get metadata for unique name
    let filename = `audio_${Date.now()}.mp3`;
    let baseName = `audio_${Date.now()}`;
    const info = await ytDlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
    });

    if (info.title) {
      baseName = info.title.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");
      filename = `${baseName}.mp3`;
    }

    // Since we are serverless, we don't have a reliable way to check "duplicate names" on disk.
    // We check Firestore instead.
    const fileDoc = await db.collection(FILES_COLLECTION).doc(filename).get();
    if (fileDoc.exists) {
      // Appending timestamp to avoid conflict
      baseName = `${baseName}_${Date.now()}`;
      filename = `${baseName}.mp3`;
    }

    // Step 2: Download to /tmp
    const localTemplate = getTmpPath(`${baseName}.%(ext)s`);
    await ytDlp(
      url,
      {
        extractAudio: true,
        audioFormat: "mp3",
        output: localTemplate,
        writeThumbnail: true,
        noWarnings: true,
      },
      { env: { ...process.env, PATH: newPath } },
    );

    // Step 3: Check files and Upload to GCS
    const localAudioPath = getTmpPath(`${baseName}.mp3`);
    if (fs.existsSync(localAudioPath)) {
      await StorageService.uploadFile(localAudioPath, `audio/${filename}`);

      let imageUrl = null;
      // Check for thumbnail and upload
      const extensions = [".jpg", ".jpeg", ".png", ".webp"];
      for (const ext of extensions) {
        const localImg = getTmpPath(`${baseName}${ext}`);
        if (fs.existsSync(localImg)) {
          const imgName = `${baseName}${ext}`;
          await StorageService.uploadFile(localImg, `thumbnails/${imgName}`);
          imageUrl = imgName;
          fs.unlinkSync(localImg); // cleanup local img
          break;
        }
      }

      // Step 4: Save metadata to Firestore
      await db
        .collection(FILES_COLLECTION)
        .doc(filename)
        .set({
          hasStems: false,
          stems: [],
          stemFolder: null,
          imageUrl: imageUrl,
          path: `audio/${filename}`, // Internal reference
        });

      // Step 5: Cleanup local audio
      fs.unlinkSync(localAudioPath);

      // Step 6: Trigger browser download via Signed URL or straight json success
      const downloadUrl = await StorageService.getSignedUrl(
        `audio/${filename}`,
        15,
      );
      res.redirect(downloadUrl);
    } else {
      res
        .status(500)
        .json({ error: "Failed to process audio file locally before upload." });
    }
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Download failed", details: error.message });
  }
});

// --- SPLEETER (DOWNLOAD FROM GCS -> LOCAL SPLEET -> UPLOAD GCS) ---
router.post("/separate", async (req, res) => {
  const { filename, model = "spleeter:5stems" } = req.body;
  if (!filename) return res.status(400).json({ error: "Filename required" });

  const baseName = path.parse(filename).name;
  const localInput = getTmpPath(filename);
  const localOutputDir = tmpDir; // Spleeter naturally produces /tmp/basename/stems

  try {
    // 1. Download file from GCS to local tmp
    await StorageService.downloadFile(`audio/${filename}`, localInput);

    // 2. Run Spleeter
    const modelPath = path.join(__dirname, "../pretrained_models");
    const command = `spleeter separate -p ${model} -o "${localOutputDir}" "${localInput}"`;

    exec(
      command,
      { env: { ...process.env, MODEL_PATH: modelPath } },
      async (err, stdout, stderr) => {
        if (err) {
          console.error(`Spleeter Error:`, err);
          return res
            .status(500)
            .json({ error: "Spleeter failed", details: err.message });
        }

        const stemDir = getTmpPath(baseName);
        if (fs.existsSync(stemDir)) {
          const stems = fs
            .readdirSync(stemDir)
            .filter((f) => f.endsWith(".wav"));

          // 3. Upload stems directly to GCS
          for (const stem of stems) {
            await StorageService.uploadFile(
              path.join(stemDir, stem),
              `stems/${baseName}/${stem}`,
            );
          }

          // 4. Update Firestore doc to reflect stems generated
          await db.collection(FILES_COLLECTION).doc(filename).update({
            hasStems: true,
            stems: stems,
            stemFolder: baseName,
          });

          // 5. Cleanup
          fs.rmSync(stemDir, { recursive: true, force: true });
          fs.unlinkSync(localInput);

          res.json({
            message: "Separation complete & uploaded to Cloud Storage",
            folder: baseName,
          });
        } else {
          res
            .status(500)
            .json({ error: "Stem output directory not found locally" });
        }
      },
    );
  } catch (e) {
    res.status(500).json({
      error: "Failed infrastructure logic for spleeter",
      details: e.message,
    });
  }
});

// --- PITCH SHIFT AUDIO (DOWNLOAD -> FFMPEG -> UPLOAD GCS) ---
router.post("/process/pitch", async (req, res) => {
  const { filename, semitones } = req.body;
  if (!filename || semitones === undefined) {
    return res
      .status(400)
      .json({ error: "Filename and semitones are required" });
  }

  const parsed = path.parse(filename);
  const sign = semitones >= 0 ? "+" : "";
  const outputFilename = `${parsed.name}_pitch${sign}${semitones}${parsed.ext}`;
  const localInput = getTmpPath(filename);
  const localOutput = getTmpPath(outputFilename);

  try {
    // 1. Download original from GCS
    await StorageService.downloadFile(`audio/${filename}`, localInput);

    // 2. Process with ffmpeg
    const scale = Math.pow(2, semitones / 12);
    const command = `ffmpeg -i "${localInput}" -af "rubberband=pitch=${scale}" -y "${localOutput}"`;

    exec(command, async (err) => {
      if (err) {
        console.error("FFMPEG error:", err);
        return res.status(500).json({ error: "Pitch shift failed" });
      }

      // 3. Upload to GCS
      await StorageService.uploadFile(localOutput, `audio/${outputFilename}`);

      // 4. Save to Firestore (reusing same thumbnail if available)
      const originalDoc = await db
        .collection(FILES_COLLECTION)
        .doc(filename)
        .get();
      let imageUrl = null;
      if (originalDoc.exists) imageUrl = originalDoc.data().imageUrl;

      await db
        .collection(FILES_COLLECTION)
        .doc(outputFilename)
        .set({
          hasStems: false,
          stems: [],
          stemFolder: null,
          imageUrl: imageUrl,
          path: `audio/${outputFilename}`,
        });

      // 5. Cleanup
      fs.unlinkSync(localInput);
      fs.unlinkSync(localOutput);

      res.json({ message: "Pitch shift complete", filename: outputFilename });
    });
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to process pitch", details: e.message });
  }
});

// --- PROCESS CHORDS (DOWNLOAD -> PYTHON -> UPLOAD GCS) ---
router.post("/process/chords", async (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: "Filename is required" });

  const parsed = path.parse(filename);
  const jsonFilename = `${parsed.name}_chords.json`;
  const localInput = getTmpPath(filename);
  const localOutput = getTmpPath(jsonFilename);

  try {
    await StorageService.downloadFile(`audio/${filename}`, localInput);

    const scriptPath = path.join(__dirname, "../chord_extractor.py");
    const pythonBin = "/opt/homebrew/bin/python3.11";
    const command = `"${pythonBin}" "${scriptPath}" "${localInput}"`;

    exec(
      command,
      { maxBuffer: 1024 * 1024 * 10 },
      async (err, stdout, stderr) => {
        if (err) {
          console.error("Chord extraction error", err);
          return res.status(500).json({ error: "Extraction failed" });
        }

        try {
          const chordsData = JSON.parse(stdout);
          // Write locally to upload
          fs.writeFileSync(localOutput, JSON.stringify(chordsData));

          await StorageService.uploadFile(
            localOutput,
            `chords/${jsonFilename}`,
          );

          fs.unlinkSync(localInput);
          fs.unlinkSync(localOutput);

          res.json({ message: "Extraction complete", data: chordsData });
        } catch (parseErr) {
          res.status(500).json({ error: "Failed to parse python output" });
        }
      },
    );
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to process chords", details: e.message });
  }
});

router.get("/chords/:filename", async (req, res) => {
  try {
    const parsed = path.parse(req.params.filename);
    const gcsPath = `chords/${parsed.name}_chords.json`;

    // Download directly from GCS to memory and send as JSON response
    // This avoids CORS issues when the frontend tries to fetch a Signed URL for JSON data
    const { bucket } = require("../services/firebase");
    const [fileContent] = await bucket.file(gcsPath).download();

    res.json(JSON.parse(fileContent.toString("utf8")));
  } catch (e) {
    res.json(null); // Return null if chords don't exist yet, matching previous behavior
  }
});

// --- DELETES (GCS + FIRESTORE) ---
router.delete("/files/:filename", async (req, res) => {
  const { filename } = req.params;
  const baseName = path.parse(filename).name;

  try {
    // Delete Main Audio & Thumbnail from GCS (Assume thumbnail png mostly)
    await StorageService.deleteFile(`audio/${filename}`);

    // We should look up the doc first to get thumbnail name
    const fileDoc = await db.collection(FILES_COLLECTION).doc(filename).get();
    if (fileDoc.exists) {
      const data = fileDoc.data();
      if (data.imageUrl)
        await StorageService.deleteFile(`thumbnails/${data.imageUrl}`);
    }

    // Delete Stems from GCS
    await StorageService.deleteFolder(`stems/${baseName}/`);

    // Delete from Firestore
    await db.collection(FILES_COLLECTION).doc(filename).delete();

    // Cleanup from groups
    const groups = await GroupsService.getGroups();
    for (const group of groups) {
      if (group.files.includes(filename)) {
        const updatedFiles = group.files.filter((f) => f !== filename);
        await GroupsService.updateGroup(group.id, { files: updatedFiles });
      }
    }

    res.json({ message: "File, stems and metadata deleted globally." });
  } catch (e) {
    res.status(500).json({ error: "Delete failed", details: e.message });
  }
});

module.exports = router;
