const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { searchUsers, addContact, updateProfile, followUser, unfollowUser, getProfile } = require("../controllers/userController");

const router = express.Router();

router.use(protect);

router.get("/search", searchUsers);
router.get("/:userId/profile", getProfile);
router.put("/:userId/follow", followUser);
router.delete("/:userId/follow", unfollowUser);
router.put("/contacts/:userId", addContact);
router.put("/profile", upload.single("avatar"), updateProfile);

module.exports = router;
