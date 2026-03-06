const { db } = require("./firebase");

const EVENTS_COLLECTION = "events";

class EventsService {
  static async getEvents() {
    const snapshot = await db
      .collection(EVENTS_COLLECTION)
      .orderBy("date", "asc")
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  static async getEvent(id) {
    const doc = await db.collection(EVENTS_COLLECTION).doc(id).get();
    if (!doc.exists) throw new Error("Event not found");
    return { id: doc.id, ...doc.data() };
  }

  static async createEvent(data) {
    const newEvent = {
      title: data.title || "New Event",
      description: data.description || "",
      date: data.date || new Date().toISOString(),
      time: data.time || "10:00",
      participants: data.participants || [], // Array of { name, confirmed }
      songs: data.songs || [], // Array of { fileId, path, title, cipher, lyrics }
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection(EVENTS_COLLECTION).add(newEvent);
    return { id: docRef.id, ...newEvent };
  }

  static async updateEvent(id, updates) {
    const docRef = db.collection(EVENTS_COLLECTION).doc(id);
    await docRef.update(updates);
    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() };
  }

  static async deleteEvent(id) {
    await db.collection(EVENTS_COLLECTION).doc(id).delete();
    return { success: true };
  }
}

module.exports = EventsService;
