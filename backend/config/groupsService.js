const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const GROUPS_FILE = path.join(__dirname, "groups.json");

// Ensure default groups file exists
if (!fs.existsSync(GROUPS_FILE)) {
  fs.writeFileSync(GROUPS_FILE, JSON.stringify([], null, 2));
}

const GroupsService = {
  getGroups: () => {
    try {
      if (fs.existsSync(GROUPS_FILE)) {
        return JSON.parse(fs.readFileSync(GROUPS_FILE, "utf8"));
      }
    } catch (e) {
      console.error("Error reading groups file:", e);
    }
    return [];
  },

  saveGroups: (groups) => {
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
    return groups;
  },

  createGroup: (name) => {
    const groups = GroupsService.getGroups();
    const newGroup = {
      id: crypto.randomUUID(),
      name: name,
      files: [],
    };
    groups.push(newGroup);
    GroupsService.saveGroups(groups);
    return newGroup;
  },

  updateGroup: (id, updates) => {
    const groups = GroupsService.getGroups();
    const index = groups.findIndex((g) => g.id === id);
    if (index !== -1) {
      groups[index] = { ...groups[index], ...updates };
      GroupsService.saveGroups(groups);
      return groups[index];
    }
    throw new Error("Group not found");
  },

  deleteGroup: (id) => {
    const groups = GroupsService.getGroups();
    const filteredGroups = groups.filter((g) => g.id !== id);
    if (groups.length !== filteredGroups.length) {
      GroupsService.saveGroups(filteredGroups);
      return true;
    }
    throw new Error("Group not found");
  },
};

module.exports = GroupsService;
