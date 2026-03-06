const express = require("express");
const router = express.Router();
const wishlistService = require("../services/wishlistService");

router.get("/", async (req, res) => {
  try {
    const items = await wishlistService.getItems();
    res.json(items);
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to fetch wishlist", details: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, artist, youtubeUrl, status } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const newItem = await wishlistService.createItem({
      title,
      artist,
      youtubeUrl,
      status,
    });
    res.json(newItem);
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to create wishlist item", details: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedItem = await wishlistService.updateItem(id, updates);
    res.json(updatedItem);
  } catch (e) {
    res
      .status(404)
      .json({ error: "Failed to update wishlist item", details: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await wishlistService.deleteItem(id);
    res.json({ message: "Wishlist item deleted" });
  } catch (e) {
    res
      .status(404)
      .json({ error: "Failed to delete wishlist item", details: e.message });
  }
});

module.exports = router;
