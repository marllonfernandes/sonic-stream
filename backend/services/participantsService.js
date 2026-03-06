const { db } = require("./firebase");

const PARTICIPANTS_COLLECTION = "participants";

class ParticipantsService {
  static async getParticipants() {
    const snapshot = await db
      .collection(PARTICIPANTS_COLLECTION)
      .orderBy("name", "asc")
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  static async getParticipant(id) {
    const doc = await db.collection(PARTICIPANTS_COLLECTION).doc(id).get();
    if (!doc.exists) throw new Error("Participant not found");
    return { id: doc.id, ...doc.data() };
  }

  static async createParticipant(data) {
    const newParticipant = {
      name: data.name || "Unknown",
      photoUrl: data.photoUrl || "",
      email: data.email || "",
      groupId: data.groupId || null, // Links to a participantGroup
      createdAt: new Date().toISOString(),
    };

    const docRef = await db
      .collection(PARTICIPANTS_COLLECTION)
      .add(newParticipant);
    return { id: docRef.id, ...newParticipant };
  }

  static async updateParticipant(id, updates) {
    const docRef = db.collection(PARTICIPANTS_COLLECTION).doc(id);
    await docRef.update(updates);
    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  }

  static async deleteParticipant(id) {
    await db.collection(PARTICIPANTS_COLLECTION).doc(id).delete();
    return { success: true };
  }
}

module.exports = ParticipantsService;
