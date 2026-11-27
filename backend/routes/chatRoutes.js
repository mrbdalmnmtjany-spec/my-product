const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  accessPrivateChat,
  getMyChats,
  createGroup,
  addToGroup,
  removeFromGroup,
} = require("../controllers/chatController");

const router = express.Router();

router.use(protect);

router.get("/", getMyChats);
router.post("/private", accessPrivateChat);
router.post("/group", createGroup);
router.put("/group/:chatId/add", addToGroup);
router.put("/group/:chatId/remove", removeFromGroup);

module.exports = router;
