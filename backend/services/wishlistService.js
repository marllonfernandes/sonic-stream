const { db } = require("./firebase");

const COLLECTION_NAME = "wishlist";

class WishlistService {
  async getItems() {
    const snapshot = await db
      .collection(COLLECTION_NAME)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createItem(itemData) {
    const docRef = db.collection(COLLECTION_NAME).doc();
    const newItem = {
      ...itemData,
      status: itemData.status || "pending", // pending, extracted, practicing
      createdAt: new Date().toISOString(),
    };
    await docRef.set(newItem);
    return { id: docRef.id, ...newItem };
  }

  async updateItem(id, updates) {
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error("Wishlist item not found");
    }

    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  }

  async deleteItem(id) {
    await db.collection(COLLECTION_NAME).doc(id).delete();
  }
}

module.exports = new WishlistService();
