const mongoose = require("mongoose");
const Story = require("../models/Story");
const User = require("../models/User");
const Chat = require("../models/Chat");
const { uploadMedia, deleteMedia } = require("../utils/mediaStorage");
const { presentStory, isSupabaseKey } = require("../utils/mediaPresentation");

const createStory = async (req, res) => {
  try {
    const { type, caption, backgroundColor } = req.body;
    let mediaUrl = "";
    let mediaKey = "";
    if (req.file) {
      if (!["image", "video"].includes(type) || !req.file.mimetype.startsWith(`${type}/`)) {
        return res.status(400).json({ message: "نوع ملف الستوري غير متوافق" });
      }
      const uploaded = await uploadMedia(req.file.buffer, {
        folder: "stories", mimetype: req.file.mimetype, originalname: req.file.originalname,
      });
      mediaKey = uploaded.key;
    } else if (type !== "text") {
      return res.status(400).json({ message: "لازم ترفع صورة أو فيديو للستوري" });
    } else if (!caption?.trim()) {
      return res.status(400).json({ message: "اكتب نص الستوري" });
    }

    const story = await Story.create({
      user: req.user._id, type: type || "image", mediaUrl, mediaKey,
      caption: caption || "", backgroundColor: backgroundColor || "#12181a",
    });
    const populated = await story.populate("user", "name email avatar avatarPublicId bio");
    const safeStory = await presentStory(populated);

    try {
      const contactViewers = await User.find({ contacts: req.user._id }).select("_id");
      const sharedChats = await Chat.find({ members: req.user._id }).select("members");
      const chatMemberIds = sharedChats.flatMap((c) => c.members.map((m) => m.toString()));
      const audience = new Set([...contactViewers.map((u) => u._id.toString()), ...chatMemberIds]);
      audience.delete(req.user._id.toString());
      const io = req.app.get("io");
      if (io && audience.size > 0) io.to([...audience].map((id) => `user:${id}`)).emit("story-posted", safeStory);
    } catch (emitError) {
      console.error("فشل بث إشعار الستوري:", emitError.message);
    }
    res.status(201).json(safeStory);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status === 503 ? error.message : "تعذر إنشاء الستوري" });
  }
};

const getStories = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const chats = await Chat.find({ members: req.user._id }).select("members");
    const chatMemberIds = chats.flatMap((c) => c.members.map((m) => m.toString()));
    const userIds = [...new Set([...(user.contacts || []).map((c) => c.toString()), ...chatMemberIds, req.user._id.toString()])];
    const stories = await Story.find({ user: { $in: userIds }, expiresAt: { $gt: new Date() } })
      .populate("user", "name email avatar avatarPublicId bio")
      .populate("viewers", "name avatar avatarPublicId")
      .sort({ createdAt: 1 });
    const grouped = {};
    for (const story of stories) {
      const safeStory = await presentStory(story);
      const uid = safeStory.user._id.toString();
      if (!grouped[uid]) grouped[uid] = { user: safeStory.user, stories: [] };
      grouped[uid].stories.push(safeStory);
    }
    res.json(Object.values(grouped));
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر" });
  }
};

const viewStory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "ستوري غير صالحة" });
    const story = await Story.findById(req.params.id);
    if (!story || story.expiresAt <= new Date()) return res.status(404).json({ message: "الستوري غير موجودة" });
    if (story.user.toString() !== req.user._id.toString()) {
      const user = await User.findById(req.user._id).select("contacts");
      const sharedChat = await Chat.exists({ members: { $all: [req.user._id, story.user] } });
      const isContact = await User.exists({ _id: story.user, contacts: req.user._id });
      if (!isContact && !sharedChat) return res.status(403).json({ message: "غير مصرح بمشاهدة هذه الستوري" });
      await Story.updateOne({ _id: story._id }, { $addToSet: { viewers: req.user._id } });
    }
    res.json({ message: "تم التسجيل" });
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر" });
  }
};

const deleteStory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "ستوري غير صالحة" });
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "الستوري غير موجودة" });
    if (story.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "مينفعش تمسح ستوري مش بتاعتك" });
    await story.deleteOne();
    if (story.mediaKey && isSupabaseKey(story.mediaKey)) deleteMedia(story.mediaKey).catch((e) => console.error("Media cleanup failed:", e.message));
    res.json({ message: "تم حذف الستوري" });
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر" });
  }
};

module.exports = { createStory, getStories, viewStory, deleteStory };
