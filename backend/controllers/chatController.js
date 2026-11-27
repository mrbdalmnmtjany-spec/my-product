const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const User = require("../models/User");

// @desc    فتح أو استرجاع شات شخصي بين مستخدمين
// @route   POST /api/chats/private
const accessPrivateChat = async (req, res) => {
  try {
    const { userId } = req.body; // الطرف التاني
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "لازم تحدد مستخدم صالح" });
    }
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "مينفعش تفتح محادثة مع نفسك" });
    }

    const otherUser = await User.findById(userId);
    if (!otherUser) return res.status(404).json({ message: "المستخدم غير موجود" });

    let chat = await Chat.findOne({
      isGroup: false,
      members: { $all: [req.user._id, userId], $size: 2 },
    })
      .populate("members", "-password")
      .populate("lastMessage");

    if (!chat) {
      chat = await Chat.create({
        isGroup: false,
        members: [req.user._id, userId],
      });
      chat = await chat.populate("members", "-password");
    }

    // بنضيف كل واحد لجهات اتصال التاني تلقائيًا — ده اللي بيخلي الستوريز تظهر
    await User.updateOne({ _id: req.user._id }, { $addToSet: { contacts: userId } });
    await User.updateOne({ _id: userId }, { $addToSet: { contacts: req.user._id } });

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر", error: error.message });
  }
};

// @desc    كل محادثات المستخدم (شخصي + جروبات)
// @route   GET /api/chats
const getMyChats = async (req, res) => {
  try {
    const chats = await Chat.find({ members: req.user._id })
      .populate("members", "-password")
      .populate("groupAdmins", "-password")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر", error: error.message });
  }
};

// @desc    إنشاء جروب جديد
// @route   POST /api/chats/group
const createGroup = async (req, res) => {
  try {
    const { groupName, members } = req.body; // members: array of userIds

    if (!groupName?.trim() || !Array.isArray(members) || members.length < 2) {
      return res.status(400).json({ message: "اسم الجروب وعلى الأقل عضوين مطلوبين" });
    }

    if (!members.every((id) => mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: "في عضو بمعرّف غير صالح" });
    }

    const existingCount = await User.countDocuments({ _id: { $in: members } });
    if (existingCount !== new Set(members).size) {
      return res.status(400).json({ message: "في أعضاء مش موجودين" });
    }

    const allMembers = [...new Set([...members, req.user._id.toString()])];

    const group = await Chat.create({
      isGroup: true,
      groupName: groupName.trim(),
      members: allMembers,
      groupAdmins: [req.user._id],
      createdBy: req.user._id,
    });

    const populatedGroup = await group.populate([
      { path: "members", select: "-password" },
      { path: "groupAdmins", select: "-password" },
    ]);

    // نبلّغ الأعضاء بس (مش كل المتصلين بالسيرفر) إن فيه جروب جديد عشان يدخلوا
    // الغرفة فورًا. كل مستخدم عنده غرفة شخصية 'user:<id>' بينضم لها وقت الاتصال
    const io = req.app.get("io");
    const memberRooms = populatedGroup.members.map((m) => `user:${m._id.toString()}`);
    io?.to(memberRooms).emit("chat-created", populatedGroup);

    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر", error: error.message });
  }
};

// @desc    إضافة عضو للجروب
// @route   PUT /api/chats/group/:chatId/add
const addToGroup = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!mongoose.isValidObjectId(req.params.chatId) || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "بيانات غير صالحة" });
    }

    const chat = await Chat.findById(req.params.chatId);
    if (!chat || !chat.isGroup) return res.status(404).json({ message: "الجروب غير موجود" });

    if (!chat.groupAdmins.some((a) => a.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "الأدمن بس اللي يقدر يضيف أعضاء" });
    }

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: "المستخدم غير موجود" });

    if (!chat.members.some((m) => m.toString() === userId)) {
      chat.members.push(userId);
      await chat.save();
    }

    const updated = await chat.populate([
      { path: "members", select: "-password" },
      { path: "groupAdmins", select: "-password" },
    ]);

    // نبلّغ الأعضاء الحاليين بس (بما فيهم العضو المُضاف الجديد)
    const io = req.app.get("io");
    const memberRooms = updated.members.map((m) => `user:${m._id.toString()}`);
    io?.to(memberRooms).emit("chat-updated", updated);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر", error: error.message });
  }
};

// @desc    إزالة عضو من الجروب
// @route   PUT /api/chats/group/:chatId/remove
const removeFromGroup = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!mongoose.isValidObjectId(req.params.chatId) || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "بيانات غير صالحة" });
    }

    const chat = await Chat.findById(req.params.chatId);
    if (!chat || !chat.isGroup) return res.status(404).json({ message: "الجروب غير موجود" });

    const isAdmin = chat.groupAdmins.some((a) => a.toString() === req.user._id.toString());
    const isSelf = userId === req.user._id.toString();

    // الأدمن بيشيل أي حد، وأي عضو بيقدر يسيب الجروب بنفسه
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: "الأدمن بس اللي يقدر يشيل أعضاء" });
    }

    // بنسجل الأعضاء الأصليين قبل الحذف — العضو المشال لازم برضه يستقبل
    // "chat-updated" عشان الفرونت بتاعه يشيل الجروب ده من قايمته فورًا
    const originalMemberIds = chat.members.map((m) => m.toString());

    chat.members = chat.members.filter((m) => m.toString() !== userId);
    chat.groupAdmins = chat.groupAdmins.filter((a) => a.toString() !== userId);

    // لو آخر أدمن مشي، أول عضو فاضل يبقى أدمن عشان الجروب ميفضلش من غير إدارة
    if (chat.groupAdmins.length === 0 && chat.members.length > 0) {
      chat.groupAdmins.push(chat.members[0]);
    }

    await chat.save();

    const updated = await chat.populate([
      { path: "members", select: "-password" },
      { path: "groupAdmins", select: "-password" },
    ]);

    const io = req.app.get("io");
    const memberRooms = originalMemberIds.map((id) => `user:${id}`);
    io?.to(memberRooms).emit("chat-updated", updated);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر", error: error.message });
  }
};

module.exports = {
  accessPrivateChat,
  getMyChats,
  createGroup,
  addToGroup,
  removeFromGroup,
};
