const mongoose = require("mongoose");
const User = require("../models/User");
const { uploadMedia, deleteMedia } = require("../utils/mediaStorage");
const { presentUser, isSupabaseKey } = require("../utils/mediaPresentation");
const { escapeRegex } = require("../utils/chatAccess");

const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const safeQuery = escapeRegex(q.trim());
    if (!safeQuery) return res.json([]);
    const me = await User.findById(req.user._id).select("following");
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: safeQuery, $options: "i" } },
        { email: { $regex: safeQuery, $options: "i" } },
      ],
    }).select("name avatar avatarPublicId bio").limit(20);

    const result = await Promise.all(users.map(async (person) => ({
      ...await presentUser(person),
      isFollowing: (me?.following || []).some((id) => id.toString() === person._id.toString()),
    })));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر" });
  }
};

const addContact = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "مستخدم غير صالح" });
    if (userId === req.user._id.toString()) return res.status(400).json({ message: "مينفعش تضيف نفسك" });
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: "المستخدم غير موجود" });
    const me = await User.findById(req.user._id);
    if (!me.contacts.includes(userId)) {
      me.contacts.push(userId);
      await me.save();
    }
    res.json({ message: "تمت الإضافة لجهات الاتصال" });
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, bio } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;

    if (req.file) {
      if (!req.file.mimetype.startsWith("image/")) return res.status(400).json({ message: "صورة الملف الشخصي يجب أن تكون صورة" });
      const oldKey = user.avatarPublicId;
      const uploaded = await uploadMedia(req.file.buffer, {
        folder: "avatars", mimetype: req.file.mimetype, originalname: req.file.originalname,
      });
      // Store the object key only. Signed URLs expire and must never be persisted.
      user.avatar = "";
      user.avatarPublicId = uploaded.key;
      await user.save();
      if (oldKey && isSupabaseKey(oldKey)) {
        deleteMedia(oldKey).catch((e) => console.error("Avatar cleanup failed:", e.message));
      }
      return res.json({
        id: user._id, name: user.name, email: user.email,
        avatar: await require("../utils/mediaStorage").getMediaUrl(uploaded.key),
        bio: user.bio,
      });
    }

    await user.save();
    res.json({
      id: user._id, name: user.name, email: user.email,
      avatar: (await presentUser(user)).avatar, bio: user.bio,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status === 503 ? error.message : "تعذر تحديث الملف الشخصي" });
  }
};

const followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId) || userId === req.user._id.toString()) return res.status(400).json({ message: "مستخدم غير صالح" });
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: "المستخدم غير موجود" });
    await Promise.all([
      User.updateOne({ _id: req.user._id }, { $addToSet: { following: target._id } }),
      User.updateOne({ _id: target._id }, { $addToSet: { followers: req.user._id } }),
    ]);
    res.json({ following: true });
  } catch (error) { res.status(500).json({ message: "تعذر متابعة المستخدم" }); }
};

const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "مستخدم غير صالح" });
    await Promise.all([
      User.updateOne({ _id: req.user._id }, { $pull: { following: userId } }),
      User.updateOne({ _id: userId }, { $pull: { followers: req.user._id } }),
    ]);
    res.json({ following: false });
  } catch (error) { res.status(500).json({ message: "تعذر إلغاء المتابعة" }); }
};

const getProfile = async (req, res) => {
  try {
    const profile = await User.findById(req.params.userId).select("name avatar avatarPublicId bio followers following createdAt");
    if (!profile) return res.status(404).json({ message: "المستخدم غير موجود" });
    const person = await presentUser(profile);
    res.json({
      _id: profile._id, name: person.name, avatar: person.avatar, bio: person.bio,
      followersCount: profile.followers.length, followingCount: profile.following.length,
      isFollowing: profile.followers.some((id) => id.toString() === req.user._id.toString()),
    });
  } catch (error) { res.status(500).json({ message: "تعذر جلب الملف الشخصي" }); }
};

module.exports = { searchUsers, addContact, updateProfile, followUser, unfollowUser, getProfile };
