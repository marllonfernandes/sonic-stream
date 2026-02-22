const { bucket } = require("./firebase");
const path = require("path");
const fs = require("fs");
const os = require("os");

const StorageService = {
  // Upload a local file to GCS
  uploadFile: async (localFilePath, destination) => {
    try {
      await bucket.upload(localFilePath, {
        destination: destination,
      });
      console.log(`${localFilePath} uploaded to ${destination}`);
      return true;
    } catch (e) {
      console.error(`Error uploading ${localFilePath} to GCS:`, e);
      throw e;
    }
  },

  // Upload a buffer directly to GCS
  uploadBuffer: async (buffer, destination, contentType) => {
    try {
      const file = bucket.file(destination);
      await file.save(buffer, {
        metadata: { contentType },
      });
      console.log(`Buffer uploaded to ${destination}`);
      return true;
    } catch (e) {
      console.error(`Error uploading buffer to ${destination}:`, e);
      throw e;
    }
  },

  // Download a file from GCS to local tmp (useful for processing with Spleeter/ffmpeg)
  downloadFile: async (gcsPath, localDestination) => {
    try {
      await bucket.file(gcsPath).download({
        destination: localDestination,
      });
      console.log(`${gcsPath} downloaded to ${localDestination}`);
      return true;
    } catch (e) {
      console.error(`Error downloading ${gcsPath}:`, e);
      throw e;
    }
  },

  // Get a Signed URL to proxy files securely or stream audio directly
  getSignedUrl: async (gcsPath, expiresInMinutes = 60) => {
    try {
      const options = {
        version: "v4",
        action: "read",
        expires: Date.now() + expiresInMinutes * 60 * 1000,
      };
      const [url] = await bucket.file(gcsPath).getSignedUrl(options);
      return url;
    } catch (e) {
      console.error(`Error getting signed URL for ${gcsPath}:`, e);
      return null;
    }
  },

  // List files with a specific prefix (folder)
  listFiles: async (prefix = "") => {
    try {
      const [files] = await bucket.getFiles({ prefix });
      return files.map((file) => file.name);
    } catch (e) {
      console.error(`Error listing files with prefix ${prefix}:`, e);
      return [];
    }
  },

  // Delete a specific file
  deleteFile: async (gcsPath) => {
    try {
      await bucket.file(gcsPath).delete();
      console.log(`Deleted ${gcsPath}`);
      return true;
    } catch (e) {
      console.error(`Error deleting ${gcsPath}:`, e);
      return false; // don't throw, might already be deleted
    }
  },

  // Delete all files in a "folder"
  deleteFolder: async (prefix) => {
    try {
      await bucket.deleteFiles({ prefix });
      console.log(`Deleted folder ${prefix}`);
      return true;
    } catch (e) {
      console.error(`Error deleting folder ${prefix}:`, e);
      return false;
    }
  },
};

module.exports = StorageService;
