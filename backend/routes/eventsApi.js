const express = require("express");
const router = express.Router();
const EventsService = require("../services/eventsService");
const GroupsService = require("../services/groupsService");

// --- EVENT ENDPOINTS ---

router.get("/events", async (req, res) => {
  try {
    const events = await EventsService.getEvents();
    res.json(events);
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to fetch events", details: e.message });
  }
});

router.post("/events", async (req, res) => {
  try {
    const newEvent = await EventsService.createEvent(req.body);

    // Automatically create a matching group in the Audio Library
    if (newEvent.title) {
      try {
        await GroupsService.createGroup(newEvent.title);
      } catch (groupErr) {
        console.error(
          "Failed to automatically create group for event:",
          groupErr,
        );
        // We do not fail the event creation if group creation fails.
      }
    }

    res.json(newEvent);
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to create event", details: e.message });
  }
});

router.get("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const event = await EventsService.getEvent(id);
    res.json(event);
  } catch (e) {
    res.status(404).json({ error: "Event not found", details: e.message });
  }
});

router.put("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedEvent = await EventsService.updateEvent(id, updates);
    res.json(updatedEvent);
  } catch (e) {
    res
      .status(404)
      .json({ error: "Failed to update event", details: e.message });
  }
});

router.delete("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await EventsService.deleteEvent(id);
    res.json({ message: "Event deleted" });
  } catch (e) {
    res
      .status(404)
      .json({ error: "Failed to delete event", details: e.message });
  }
});

module.exports = router;
