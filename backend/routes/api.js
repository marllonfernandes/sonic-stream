const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const ytDlp = require("yt-dlp-exec");
const ConfigService = require("../config/configService");
const GroupsService = require("../config/groupsService");

// Config endpoints
router.get("/config/path", (req, res) => {
  res.json({ path: ConfigService.getDownloadPath() });
});

router.post("/separate", (req, res) => {
  const { filename, model = "spleeter:5stems" } = req.body;
  if (!filename) return res.status(400).json({ error: "Filename is required" });

  const downloadPath = ConfigService.getDownloadPath();
  const inputFile = path.join(downloadPath, filename);
  const outputDir = downloadPath; // Spleeter creates a subdir in output dir

  if (!fs.existsSync(inputFile)) {
    return res.status(404).json({ error: "File not found" });
  }

  // Command: spleeter separate -p spleeter:5stems -o <output_dir> <input_file>
  // We need to set MODEL_PATH to point to our local models
  const modelPath = path.join(__dirname, "../pretrained_models");

  // Convert model param to just the number of stems if we are using the standard naming convention
  // But wait, spleeter expects -p spleeter:5stems to look for 5stems folder in the model path.
  // So we keep -p as is.

  const command = `spleeter separate -p ${model} -o "${outputDir}" "${inputFile}"`;

  console.log(`Running Spleeter with MODEL_PATH=${modelPath}: ${command}`);

  exec(
    command,
    {
      env: {
        ...process.env,
        MODEL_PATH: modelPath,
      },
    },
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Spleeter error: ${error.message}`);
        return res
          .status(500)
          .json({ error: "Separation failed", details: error.message });
      }
      if (stderr) {
        console.error(`Spleeter stderr: ${stderr}`);
      }

      // Spleeter creates a folder with the input filename (without extension)
      const folderName = path.parse(filename).name;
      res.json({ message: "Separation complete", folder: folderName });
    },
  );
});

router.get("/stems/:folder/:stem", (req, res) => {
  const downloadPath = ConfigService.getDownloadPath();
  const { folder, stem } = req.params;
  const stemPath = path.join(downloadPath, folder, stem);

  if (fs.existsSync(stemPath)) {
    res.sendFile(stemPath);
  } else {
    res.status(404).json({ error: "Stem not found" });
  }
});

router.post("/config/path", (req, res) => {
  const { path: newPath } = req.body;
  if (!newPath) return res.status(400).json({ error: "Path is required" });

  try {
    const savedPath = ConfigService.setDownloadPath(newPath);
    res.json({ path: savedPath });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/config/dirs", (req, res) => {
  let browsePath = req.body.path;

  // Default to current configured path or home dir
  if (!browsePath) {
    browsePath = ConfigService.getDownloadPath();
  }

  try {
    if (!fs.existsSync(browsePath)) {
      browsePath = ConfigService.getDownloadPath();
    }

    const entries = fs.readdirSync(browsePath, { withFileTypes: true });
    const directories = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")) // Hide hidden dirs
      .map((entry) => entry.name);

    res.json({
      current: path.resolve(browsePath),
      parent: path.resolve(browsePath, ".."),
      directories,
    });
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to list directories", details: e.message });
  }
});

// Group Endpoints
router.get("/groups", (req, res) => {
  try {
    const groups = GroupsService.getGroups();
    res.json(groups);
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to fetch groups", details: e.message });
  }
});

router.post("/groups", (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Group name is required" });
    const newGroup = GroupsService.createGroup(name);
    res.json(newGroup);
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to create group", details: e.message });
  }
});

router.put("/groups/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedGroup = GroupsService.updateGroup(id, updates);
    res.json(updatedGroup);
  } catch (e) {
    res
      .status(404)
      .json({ error: "Failed to update group", details: e.message });
  }
});

router.delete("/groups/:id", (req, res) => {
  try {
    const { id } = req.params;
    GroupsService.deleteGroup(id);
    res.json({ message: "Group deleted" });
  } catch (e) {
    res
      .status(404)
      .json({ error: "Failed to delete group", details: e.message });
  }
});

// Library endpoints
router.get("/files", (req, res) => {
  try {
    const downloadPath = ConfigService.getDownloadPath();
    if (!fs.existsSync(downloadPath)) {
      return res.json([]); // Return empty if dir doesn't exist
    }
    const files = fs
      .readdirSync(downloadPath)
      .filter((file) => file.endsWith(".mp3"))
      .map((file) => {
        const nameWithoutExt = path.parse(file).name;
        const stemDir = path.join(downloadPath, nameWithoutExt);
        let stems = [];

        if (fs.existsSync(stemDir) && fs.statSync(stemDir).isDirectory()) {
          stems = fs.readdirSync(stemDir).filter((f) => f.endsWith(".wav"));
        }

        // Check for thumbnail
        const extensions = [".jpg", ".jpeg", ".png", ".webp"];
        let imageFile = null;
        for (const ext of extensions) {
          const imgName = nameWithoutExt + ext;
          if (fs.existsSync(path.join(downloadPath, imgName))) {
            imageFile = imgName;
            break;
          }
        }

        return {
          name: file,
          path: path.join(downloadPath, file),
          url: `/api/stream/${encodeURIComponent(file)}`,
          imageUrl: imageFile
            ? `/api/thumbnail/${encodeURIComponent(imageFile)}`
            : null,
          hasStems: stems.length > 0,
          stems: stems,
          stemFolder: stems.length > 0 ? nameWithoutExt : null,
        };
      });
    res.json(files);
  } catch (e) {
    console.error("Error in /files:", e);
    res.status(500).json({ error: "Failed to list files", details: e.message });
  }
});

router.get("/stream/:filename", (req, res) => {
  try {
    const downloadPath = ConfigService.getDownloadPath();
    const filePath = path.join(downloadPath, req.params.filename);

    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (e) {
    console.error("Error in /stream:", e);
    res.status(500).json({ error: "Stream failed" });
  }
});

router.get("/thumbnail/:filename", (req, res) => {
  try {
    const downloadPath = ConfigService.getDownloadPath();
    const filePath = path.join(downloadPath, req.params.filename);

    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "Thumbnail not found" });
    }
  } catch (e) {
    console.error("Error in /thumbnail:", e);
    res.status(500).json({ error: "Thumbnail load failed" });
  }
});

// Get video info
router.post("/info", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    // Explicitly set python binary path for yt-dlp
    const pythonBinPath = "/opt/homebrew/bin";
    const newPath = `${pythonBinPath}:${process.env.PATH}`;

    console.log(`Using PATH for yt-dlp: ${newPath}`);

    const output = await ytDlp(
      url,
      {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        addHeader: ["referer:youtube.com", "user-agent:googlebot"],
      },
      {
        env: {
          ...process.env,
          PATH: newPath,
          // Force python executable if possible (some wrappers look for this)
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

// Download audio
router.get("/download", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  const downloadPath = ConfigService.getDownloadPath();
  const timestamp = Date.now();

  try {
    // We can try to modify PATH to include our python first.
    // Also try setting YTDLP_PYTHON if supported, or just ensure python3 maps to python3.11

    // Explicitly set python binary path for yt-dlp
    // const pythonPath = "/opt/homebrew/bin"; // Already defined above or use block scope?
    // It was defined in info route, need to check if it leaks or is just a copy paste error in my previous tool call?
    // js var scoping is function/block.

    const pythonBinPath = "/opt/homebrew/bin";
    const newPath = `${pythonBinPath}:${process.env.PATH}`;

    // Get title for filename
    let filename = "audio.mp3";
    let baseName = "audio";
    try {
      const info = await ytDlp(
        url,
        {
          dumpSingleJson: true,
          noCheckCertificates: true,
          noWarnings: true,
          preferFreeFormats: true,
          addHeader: ["referer:youtube.com", "user-agent:googlebot"],
        },
        {
          env: {
            ...process.env,
            PATH: newPath,
            PYTHON: "/opt/homebrew/bin/python3.11",
          },
        },
      );
      if (info.title) {
        // Sanitize filename
        baseName = info.title.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");
        filename = baseName + ".mp3";
      }
    } catch (e) {
      console.error("Error fetching title for download:", e);
    }

    const finalPath = path.join(downloadPath, filename);
    let uniquePath = finalPath;
    let uniqueFilename = filename;
    let uniqueBaseName = baseName;
    let counter = 1;

    // Check for duplicates and append counter
    while (fs.existsSync(uniquePath)) {
      const nameObj = path.parse(filename);
      uniqueBaseName = `${nameObj.name} (${counter})`;
      uniqueFilename = `${uniqueBaseName}${nameObj.ext}`;
      uniquePath = path.join(downloadPath, uniqueFilename);
      counter++;
    }

    // Update baseName to the unique one for thumbnail naming
    baseName = uniqueBaseName;

    console.log(`Starting download for: ${url} to ${uniquePath}`);

    // We output to the unique base name but let yt-dlp handle extensions
    // Actually, we specified output: uniquePath which includes .mp3 extension
    // For thumbnail, we need to tell yt-dlp where to put it.
    // If we give a template like 'path/basename.%(ext)s', it handles it.
    // But we are using `output: uniquePath` which is a full path.
    // Use an output template that matches our unique path but allows extension variability for the thumbnail.
    // uniquePath is like /.../Song_Title.mp3
    // We want /.../Song_Title to be the template base.
    const outputTemplate = path.join(downloadPath, uniqueBaseName + ".%(ext)s");

    await ytDlp(
      url,
      {
        extractAudio: true,
        audioFormat: "mp3",
        output: outputTemplate, // Output template for both audio and thumbnail
        writeThumbnail: true, // Download thumbnail
        noCheckCertificates: true,
        noWarnings: true,
        addHeader: ["referer:youtube.com", "user-agent:googlebot"],
      },
      {
        env: {
          ...process.env,
          PATH: newPath,
          PYTHON: "/opt/homebrew/bin/python3.11",
        },
      },
    );

    // yt-dlp might have saved the audio as Song.mp3 (because we asked for mp3 audio format)
    // We need to find the mp3 file it created. Since we used uniqueBaseName.%(ext)s, it should be uniqueBaseName.mp3
    // But verify existence.
    const expectedAudioPath = path.join(downloadPath, `${uniqueBaseName}.mp3`);

    if (fs.existsSync(expectedAudioPath)) {
      res.download(expectedAudioPath, uniqueFilename, (err) => {
        if (err) {
          console.error("Error sending file:", err);
        }
        // Do NOT unlink - user wants to keep the file in library
      });
    } else {
      // Fallback check if it saved as something else?
      res.status(500).json({
        error: "File not found after download",
        expected: expectedAudioPath,
      });
    }
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Download failed", details: error.message });
  }
});

// Delete file and stems
router.delete("/files/:filename", (req, res) => {
  const { filename } = req.params;
  const downloadPath = ConfigService.getDownloadPath();
  const filePath = path.join(downloadPath, filename);
  const nameWithoutExt = path.parse(filename).name;
  const stemDir = path.join(downloadPath, nameWithoutExt);

  try {
    let deleted = false;

    // Delete Main File
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted = true;
    }

    // Delete Stems Folder (if exists)
    if (fs.existsSync(stemDir) && fs.statSync(stemDir).isDirectory()) {
      fs.rmSync(stemDir, { recursive: true, force: true });
      deleted = true; // Still consider it a successful delete action/intent
    }

    if (deleted) {
      // Remove file from any groups
      try {
        const groups = GroupsService.getGroups();
        let updated = false;
        for (const group of groups) {
          if (group.files.includes(filename)) {
            group.files = group.files.filter((f) => f !== filename);
            updated = true;
          }
        }
        if (updated) {
          GroupsService.saveGroups(groups);
        }
      } catch (err) {
        console.error("Failed to sync groups after file deletion:", err);
      }

      console.log(`Deleted ${filename} and associated stems.`);
      res.json({ message: "File deleted successfully" });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (e) {
    console.error(`Error deleting ${filename}:`, e);
    res.status(500).json({ error: "Delete failed", details: e.message });
  }
});

// Pitch Shift Audio
router.post("/process/pitch", (req, res) => {
  const { filename, semitones } = req.body;
  if (!filename || semitones === undefined) {
    return res
      .status(400)
      .json({ error: "Filename and semitones are required" });
  }

  const downloadPath = ConfigService.getDownloadPath();
  const inputFile = path.join(downloadPath, filename);

  if (!fs.existsSync(inputFile)) {
    return res.status(404).json({ error: "File not found" });
  }

  // Construct output filename: name_pitch+2.mp3 or name_pitch-2.mp3
  const parsed = path.parse(filename);
  const sign = semitones >= 0 ? "+" : "";
  const outputFilename = `${parsed.name}_pitch${sign}${semitones}${parsed.ext}`;
  const outputFile = path.join(downloadPath, outputFilename);

  // rubberband --pitch <semitones> <input> <output>
  // Calculate pitch scale: 2^(semitones/12)
  const scale = Math.pow(2, semitones / 12);

  // ffmpeg -i <input> -af "rubberband=pitch=<scale>" -y <output>
  const command = `ffmpeg -i "${inputFile}" -af "rubberband=pitch=${scale}" -y "${outputFile}"`;

  console.log(`Running ffmpeg (rubberband): ${command}`);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`ffmpeg error: ${error.message}`);
      return res
        .status(500)
        .json({ error: "Pitch shift failed", details: error.message });
    }
    // ffmpeg outputs to stderr usually, so we just log it but don't treat as error unless error obj exists
    if (stderr) {
      console.log(`ffmpeg stderr: ${stderr}`);
    }

    console.log(`Pitch shift complete: ${outputFilename}`);
    res.json({ message: "Pitch shift complete", filename: outputFilename });
  });
});

// Process chords
router.post("/process/chords", (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: "Filename is required" });
  }

  const downloadPath = ConfigService.getDownloadPath();
  const inputFile = path.join(downloadPath, filename);

  if (!fs.existsSync(inputFile)) {
    return res.status(404).json({ error: "File not found" });
  }

  const parsed = path.parse(filename);
  const outputFile = path.join(downloadPath, `${parsed.name}_chords.json`);

  // Script path
  const scriptPath = path.join(__dirname, "../chord_extractor.py");
  const pythonBin = "/opt/homebrew/bin/python3.11";

  const command = `"${pythonBin}" "${scriptPath}" "${inputFile}"`;

  console.log(`Running python chord extraction: ${command}`);

  exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Chord extraction error: ${error.message}`);
      return res
        .status(500)
        .json({ error: "Extraction failed", details: error.message });
    }

    if (stderr && stderr.includes("error")) {
      console.error(`Chord extraction stderr: ${stderr}`);
      try {
        const errParsed = JSON.parse(stderr);
        return res
          .status(500)
          .json({ error: "Extraction failed", details: errParsed.error });
      } catch (e) {
        // ignore parsing error
      }
    }

    try {
      // stdout contains JSON from the python script
      const chordsData = JSON.parse(stdout);

      // Save it to file
      fs.writeFileSync(outputFile, JSON.stringify(chordsData, null, 2));

      console.log(`Chord extraction complete: ${outputFile}`);
      res.json({
        message: "Extraction complete",
        file: outputFile,
        data: chordsData,
      });
    } catch (e) {
      console.error(`Failed to parse chord extraction output:`, e);
      res
        .status(500)
        .json({ error: "Failed to parse output", details: e.message });
    }
  });
});

router.get("/chords/:filename", (req, res) => {
  const downloadPath = ConfigService.getDownloadPath();
  const parsed = path.parse(req.params.filename);
  const filePath = path.join(downloadPath, `${parsed.name}_chords.json`);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Return 200 OK with null to prevent scary 404 browser console errors
    res.json(null);
  }
});

module.exports = router;
