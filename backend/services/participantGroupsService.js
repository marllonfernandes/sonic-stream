const { db } = require("./firebase");

const PARTICIPANT_GROUPS_COLLECTION = "participantGroups";

class ParticipantGroupsService {
  static async getGroups() {
    const snapshot = await db
      .collection(PARTICIPANT_GROUPS_COLLECTION)
      .orderBy("name", "asc")
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  static async getGroup(id) {
    const doc = await db
      .collection(PARTICIPANT_GROUPS_COLLECTION)
      .doc(id)
      .get();
    if (!doc.exists) throw new Error("Participant group not found");
    return { id: doc.id, ...doc.data() };
  }

  static async createGroup(data) {
    const newGroup = {
      name: data.name || "New Group",
      createdAt: new Date().toISOString(),
    };

    const docRef = await db
      .collection(PARTICIPANT_GROUPS_COLLECTION)
      .add(newGroup);
    return { id: docRef.id, ...newGroup };
  }

  static async updateGroup(id, updates) {
    const docRef = db.collection(PARTICIPANT_GROUPS_COLLECTION).doc(id);
    await docRef.update(updates);
    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  }

  static async deleteGroup(id) {
    await db.collection(PARTICIPANT_GROUPS_COLLECTION).doc(id).delete();
    // Logic to nullify groupId on participants could go here or in a background trigger
    return { success: true };
  }
}

module.exports = ParticipantGroupsService;
