const { db } = require("./firebase");
const crypto = require("crypto");

const GROUPS_COLLECTION = "groups";

const GroupsService = {
  getGroups: async () => {
    try {
      const snapshot = await db.collection(GROUPS_COLLECTION).get();
      return snapshot.docs.map((doc) => doc.data());
    } catch (e) {
      console.error("Error reading groups from Firestore:", e);
      return [];
    }
  },

  createGroup: async (name) => {
    try {
      const id = crypto.randomUUID();
      const newGroup = {
        id,
        name,
        files: [],
      };
      await db.collection(GROUPS_COLLECTION).doc(id).set(newGroup);
      return newGroup;
    } catch (e) {
      console.error("Error creating group in Firestore:", e);
      throw e;
    }
  },

  updateGroup: async (id, updates) => {
    try {
      const docRef = db.collection(GROUPS_COLLECTION).doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error("Group not found");
      }

      const updatedData = { ...doc.data(), ...updates };
      await docRef.set(updatedData);
      return updatedData;
    } catch (e) {
      console.error(`Error updating group ${id}:`, e);
      throw e;
    }
  },

  deleteGroup: async (id) => {
    try {
      const docRef = db.collection(GROUPS_COLLECTION).doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        throw new Error("Group not found");
      }
      await docRef.delete();
      return true;
    } catch (e) {
      console.error(`Error deleting group ${id}:`, e);
      throw e;
    }
  },
};

module.exports = GroupsService;
