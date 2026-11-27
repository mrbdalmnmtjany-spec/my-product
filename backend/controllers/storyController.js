const mongoose = require("mongoose");
const Story = require("../models/Story");
const User = require("../models/User");
const Chat = require("../models/Chat");
const { uploadMedia, deleteMedia } = require("../utils/mediaStorage");

// @desc    نشر ستوري جديدة (صورة/فيديو/نص)
// @route   POST /api/stories
const createStory = async (req, res) => {
  try {
    const { type, caption, backgroundColor } = req.body;
    let mediaUrl = "";
    let mediaKey = "";

    if (req.file) {
      if (!["image", "video"].includes(type) || !req.file.mimetype.startsWith(`${type}/`)) {
        return res.status(400).json({ message: "نوع ملف الستوري غير متوافق" });
      }
      const result = await uploadMedia(req.file.buffer, {
        folder: "stories", mimetype: req.file.mimetype, originalname: req.file.originalname,
      });
      mediaUrl = result.secure_url;
      mediaKey = result.key;
    } else if (type !== "text") {
      return res.status(400).json({ message: "لازم ترفع صورة أو فيديو للستوري" });
    } else if (!caption?.trim()) {
      return res.status(400).json({ message: "اكتب نص الستوري" });
    }

    const story = await Story.create({
      user: req.user._id,
      type: type || "image",
      mediaUrl,
      mediaKey,
      caption: caption || "",
      backgroundColor: backgroundColor || "#12181a",
    });

    const populated = await story.populate("user", "-password");

    // نبلّغ بس اللي فعلاً هيشوفوا الستوري ده: جهات الاتصال + أعضاء
    // المحادثات المشتركة (نفس شرط getStories تحت، بس معكوس من ناحية الناشر).
    // قبل كان بيتبعت للسيرفر يعمل broadcast عالمي وده كان بيسرّب محتوى
    // الستوري (صورة/فيديو/نص) لأي حد متصل بالسيرفر مش بس لجهات اتصال الناشر.
    try {
      const contactViewers = await User.find({ contacts: req.user._id }).select("_id");
      const sharedChats = await Chat.find({ members: req.user._id }).select("members");
      const chatMemberIds = sharedChats.flatMap((c) => c.members.map((m) => m.toString()));

      const audience = new Set([
        ...contactViewers.map((u) => u._id.toString()),
        ...chatMemberIds,
      ]);
      audience.delete(req.user._id.toString());

      const io = req.app.get("io");
      if (io && audience.size > 0) {
        const rooms = [...audience].map((id) => `user:${id}`);
        io.to(rooms).emit("story-posted", populated);
      }
    } catch (emitError) {
      console.error("فشل بث إشعار الستوري:", emitError.message);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status === 503 ? error.message : "تعذر إنشاء الستوري" });
  }
};

// @desc    جلب ستوريز جهات الاتصال (النشطة فقط بحكم TTL)
// @route   GET /api/stories
const getStories = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // بنجيب ستوريز جهات الاتصال + أي حد بينك وبينه محادثة + ستوريزك انت
    const chats = await Chat.find({ members: req.user._id }).select("members");
    const chatMemberIds = chats.flatMap((c) => c.members.map((m) => m.toString()));

    const userIds = [
      ...new Set([
        ...(user.contacts || []).map((c) => c.toString()),
        ...chatMemberIds,
        req.user._id.toString(),
      ]),
    ];

    const stories = await Story.find({ user: { $in: userIds } })
      .populate("user", "-password")
      .populate("viewers", "-password")
      .sort({ createdAt: 1 });

    // تجميع الستوريز حسب المستخدم
    const grouped = stories.reduce((acc, story) => {
      const uid = story.user._id.toString();
      if (!acc[uid]) acc[uid] = { user: story.user, stories: [] };
      acc[uid].stories.push(story);
      return acc;
    }, {});

    res.json(Object.values(grouped));
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر", error: error.message });
  }
};

// @desc    تسجيل مشاهدة ستوري
// @route   PUT /api/stories/:id/view
const viewStory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ستوري غير صالحة" });
    }
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "الستوري غير موجودة" });

    // مبنحسبش مشاهدة لصاحب الستوري نفسه
    if (story.user.toString() !== req.user._id.toString()) {
      await Story.updateOne({ _id: story._id }, { $addToSet: { viewers: req.user._id } });
    }

    res.json({ message: "تم التسجيل" });
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر", error: error.message });
  }
};

// @desc    حذف ستوري
// @route   DELETE /api/stories/:id
const deleteStory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ستوري غير صالحة" });
    }
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "الستوري غير موجودة" });
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "مينفعش تمسح ستوري مش بتاعتك" });
    }

    await story.deleteOne();
    if (story.mediaKey) deleteMedia(story.mediaKey).catch((e) => console.error("Media cleanup failed:", e.message));
    res.json({ message: "تم حذف الستوري" });
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر", error: error.message });
  }
};

module.exports = { createStory, getStories, viewStory, deleteStory };
