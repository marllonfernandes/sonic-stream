const fs = require("fs");
const path = require("path");

const CONFIG_FILE = path.join(__dirname, "settings.json");
const DEFAULT_DOWNLOAD_DIR = path.join(__dirname, "../downloads");

// Ensure default dir exists
if (!fs.existsSync(DEFAULT_DOWNLOAD_DIR)) {
  fs.mkdirSync(DEFAULT_DOWNLOAD_DIR);
}

const ConfigService = {
  getDownloadPath: () => {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
        if (config.downloadPath && fs.existsSync(config.downloadPath)) {
          return config.downloadPath;
        }
      }
    } catch (e) {
      console.error("Error reading config:", e);
    }
    return DEFAULT_DOWNLOAD_DIR;
  },

  setDownloadPath: (newPath) => {
    if (!fs.existsSync(newPath)) {
      throw new Error("Directory does not exist");
    }
    const config = { downloadPath: newPath };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return newPath;
  },
};

module.exports = ConfigService;
