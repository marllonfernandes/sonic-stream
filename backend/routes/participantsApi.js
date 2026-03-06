const express = require("express");
const router = express.Router();
const ParticipantsService = require("../services/participantsService");
const ParticipantGroupsService = require("../services/participantGroupsService");

// --- PARTICIPANT ENDPOINTS ---

router.get("/participants", async (req, res) => {
  try {
    const items = await ParticipantsService.getParticipants();
    res.json(items);
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to fetch participants", details: e.message });
  }
});

router.post("/participants", async (req, res) => {
  try {
    const item = await ParticipantsService.createParticipant(req.body);
    res.json(item);
  } catch (e) {
    res
      .status(500)
      .json({ error: "Failed to create participant", details: e.message });
  }
});

router.put("/participants/:id", async (req, res) => {
  try {
    const item = await ParticipantsService.updateParticipant(
      req.params.id,
      req.body,
    );
    res.json(item);
  } catch (e) {
    res
      .status(404)
      .json({ error: "Failed to update participant", details: e.message });
  }
});

router.delete("/participants/:id", async (req, res) => {
  try {
    await ParticipantsService.deleteParticipant(req.params.id);
    res.json({ message: "Participant deleted" });
  } catch (e) {
    res
      .status(404)
      .json({ error: "Failed to delete participant", details: e.message });
  }
});

// --- PARTICIPANT GROUPS ENDPOINTS ---

router.get("/participant-groups", async (req, res) => {
  try {
    const items = await ParticipantGroupsService.getGroups();
    res.json(items);
  } catch (e) {
    res
      .status(500)
      .json({
        error: "Failed to fetch participant groups",
        details: e.message,
      });
  }
});

router.post("/participant-groups", async (req, res) => {
  try {
    const item = await ParticipantGroupsService.createGroup(req.body);
    res.json(item);
  } catch (e) {
    res
      .status(500)
      .json({
        error: "Failed to create participant group",
        details: e.message,
      });
  }
});

router.put("/participant-groups/:id", async (req, res) => {
  try {
    const item = await ParticipantGroupsService.updateGroup(
      req.params.id,
      req.body,
    );
    res.json(item);
  } catch (e) {
    res
      .status(404)
      .json({
        error: "Failed to update participant group",
        details: e.message,
      });
  }
});

router.delete("/participant-groups/:id", async (req, res) => {
  try {
    await ParticipantGroupsService.deleteGroup(req.params.id);
    res.json({ message: "Participant group deleted" });
  } catch (e) {
    res
      .status(404)
      .json({
        error: "Failed to delete participant group",
        details: e.message,
      });
  }
});

module.exports = router;
