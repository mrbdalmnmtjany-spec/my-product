const mongoose = require("mongoose");
const User = require("../models/User");
const { uploadMedia, deleteMedia } = require("../utils/mediaStorage");
const { escapeRegex } = require("../utils/chatAccess");

// @desc    بحث عن مستخدمين بالاسم أو الإيميل
// @route   GET /api/users/search?q=...
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    // بنهرب الحروف الخاصة عشان مدخل المستخدم ميتحولش لـ regex خطير
    const safeQuery = escapeRegex(q.trim());
    if (!safeQuery) return res.json([]);

    const me = await User.findById(req.user._id).select("following");
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: safeQuery, $options: "i" } },
        { email: { $regex: safeQuery, $options: "i" } },
      ],
    })
      .select("name avatar bio")
      .limit(20);

    res.json(users.map((person) => ({
      ...person.toObject(),
      isFollowing: (me?.following || []).some((id) => id.toString() === person._id.toString()),
    })));
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر", error: error.message });
  }
};

// @desc    إضافة مستخدم لجهات الاتصال
// @route   PUT /api/users/contacts/:userId
const addContact = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "مستخدم غير صالح" });
    }
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "مينفعش تضيف نفسك" });
    }

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: "المستخدم غير موجود" });

    const me = await User.findById(req.user._id);
    if (!me.contacts.includes(userId)) {
      me.contacts.push(userId);
      await me.save();
    }
    res.json({ message: "تمت الإضافة لجهات الاتصال" });
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر", error: error.message });
  }
};

// @desc    تحديث بيانات البروفايل (الاسم/البايو/الصورة)
// @route   PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const { name, bio } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;

    if (req.file) {
      if (!req.file.mimetype.startsWith("image/")) return res.status(400).json({ message: "صورة الملف الشخصي يجب أن تكون صورة" });
      // نحتفظ بمفتاح الملف القديم قبل ما نستبدله، عشان نمسحه من التخزين
      // بعد ما الرفع الجديد ينجح — كده مفيش صور يتيمة (orphaned) تتراكم في
      // التخزين وتكلّف فلوس من غير أي استخدام فعلي
      const oldPublicId = user.avatarPublicId;

      const result = await uploadMedia(req.file.buffer, {
        folder: "avatars", mimetype: req.file.mimetype, originalname: req.file.originalname,
      });
      user.avatar = result.secure_url;
      user.avatarPublicId = result.public_id;

      if (oldPublicId) {
        try {
          await deleteMedia(oldPublicId);
        } catch (cleanupError) {
          // مينفعش نفشّل تحديث البروفايل بسبب فشل مسح الصورة القديمة —
          // الأفاتار الجديد اتسجل صح، بس نسجّل الخطأ عشان نراجعه لو تكرر
          console.error("فشل مسح الأفاتار القديم من التخزين:", cleanupError.message);
        }
      }
    }

    await user.save();
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
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
    const profile = await User.findById(req.params.userId).select("name avatar bio followers following createdAt");
    if (!profile) return res.status(404).json({ message: "المستخدم غير موجود" });
    res.json({ _id: profile._id, name: profile.name, avatar: profile.avatar, bio: profile.bio, followersCount: profile.followers.length, followingCount: profile.following.length, isFollowing: profile.followers.some((id) => id.toString() === req.user._id.toString()) });
  } catch (error) { res.status(500).json({ message: "تعذر جلب الملف الشخصي" }); }
};

module.exports = { searchUsers, addContact, updateProfile, followUser, unfollowUser, getProfile };
