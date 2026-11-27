const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { createStory, getStories, viewStory, deleteStory } = require("../controllers/storyController");

const router = express.Router();

router.use(protect);

router.get("/", getStories);
router.post("/", upload.single("file"), createStory);
router.put("/:id/view", viewStory);
router.delete("/:id", deleteStory);

module.exports = router;
