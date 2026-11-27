const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  sendMessage,
  sendMediaMessage,
  getMessages,
  markAsSeen,
  deleteMessage,
} = require("../controllers/messageController");

const router = express.Router();

router.use(protect);

router.post("/", sendMessage);
router.post("/media", upload.single("file"), sendMediaMessage);
router.get("/:chatId", getMessages);
router.put("/:chatId/seen", markAsSeen);
router.delete("/:id", deleteMessage);

module.exports = router;
