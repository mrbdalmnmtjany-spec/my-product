const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const User = require("../models/User");
const { presentChat } = require("../utils/mediaPresentation");

const safeMemberFields = "name avatar avatarPublicId bio isOnline lastSeen";
const populateChat = (query) => query
  .populate("members", safeMemberFields)
  .populate("groupAdmins", safeMemberFields)
  .populate({ path: "lastMessage", populate: { path: "sender", select: safeMemberFields } });

const accessPrivateChat = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || !mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "لازم تحدد مستخدم صالح" });
    if (userId === req.user._id.toString()) return res.status(400).json({ message: "مينفعش تفتح محادثة مع نفسك" });
    const otherUser = await User.findById(userId);
    if (!otherUser) return res.status(404).json({ message: "المستخدم غير موجود" });

    let chat = await populateChat(Chat.findOne({
      isGroup: false, members: { $all: [req.user._id, userId], $size: 2 },
    }));
    if (!chat) {
      chat = await Chat.create({ isGroup: false, members: [req.user._id, userId] });
      chat = await populateChat(Chat.findById(chat._id));
    }
    await Promise.all([
      User.updateOne({ _id: req.user._id }, { $addToSet: { contacts: userId } }),
      User.updateOne({ _id: userId }, { $addToSet: { contacts: req.user._id } }),
    ]);
    res.json(await presentChat(chat));
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر" });
  }
};

const getMyChats = async (req, res) => {
  try {
    const chats = await populateChat(Chat.find({ members: req.user._id }).sort({ updatedAt: -1 }));
    res.json(await Promise.all(chats.map(presentChat)));
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر" });
  }
};

const createGroup = async (req, res) => {
  try {
    const { groupName, members } = req.body;
    if (!groupName?.trim() || !Array.isArray(members) || members.length < 2) return res.status(400).json({ message: "اسم الجروب وعلى الأقل عضوين مطلوبين" });
    if (!members.every((id) => mongoose.isValidObjectId(id))) return res.status(400).json({ message: "في عضو بمعرّف غير صالح" });
    const existingCount = await User.countDocuments({ _id: { $in: members } });
    if (existingCount !== new Set(members).size) return res.status(400).json({ message: "في أعضاء مش موجودين" });
    const allMembers = [...new Set([...members, req.user._id.toString()])];
    let group = await Chat.create({
      isGroup: true, groupName: groupName.trim(), members: allMembers,
      groupAdmins: [req.user._id], createdBy: req.user._id,
    });
    group = await populateChat(Chat.findById(group._id));
    const safeGroup = await presentChat(group);
    const io = req.app.get("io");
    const memberRooms = safeGroup.members.map((m) => `user:${m._id.toString()}`);
    io?.to(memberRooms).emit("chat-created", safeGroup);
    res.status(201).json(safeGroup);
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر" });
  }
};

const addToGroup = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!mongoose.isValidObjectId(req.params.chatId) || !mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "بيانات غير صالحة" });
    const chat = await Chat.findById(req.params.chatId);
    if (!chat || !chat.isGroup) return res.status(404).json({ message: "الجروب غير موجود" });
    if (!chat.groupAdmins.some((a) => a.toString() === req.user._id.toString())) return res.status(403).json({ message: "الأدمن بس اللي يقدر يضيف أعضاء" });
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: "المستخدم غير موجود" });
    if (!chat.members.some((m) => m.toString() === userId)) {
      chat.members.push(userId);
      await chat.save();
    }
    const updated = await populateChat(Chat.findById(chat._id));
    const safeUpdated = await presentChat(updated);
    const io = req.app.get("io");
    io?.to(safeUpdated.members.map((m) => `user:${m._id.toString()}`)).emit("chat-updated", safeUpdated);
    res.json(safeUpdated);
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر" });
  }
};

const removeFromGroup = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!mongoose.isValidObjectId(req.params.chatId) || !mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "بيانات غير صالحة" });
    const chat = await Chat.findById(req.params.chatId);
    if (!chat || !chat.isGroup) return res.status(404).json({ message: "الجروب غير موجود" });
    const isAdmin = chat.groupAdmins.some((a) => a.toString() === req.user._id.toString());
    const isSelf = userId === req.user._id.toString();
    if (!isAdmin && !isSelf) return res.status(403).json({ message: "الأدمن بس اللي يقدر يشيل أعضاء" });
    const originalMemberIds = chat.members.map((m) => m.toString());
    chat.members = chat.members.filter((m) => m.toString() !== userId);
    chat.groupAdmins = chat.groupAdmins.filter((a) => a.toString() !== userId);
    if (chat.groupAdmins.length === 0 && chat.members.length > 0) chat.groupAdmins.push(chat.members[0]);
    await chat.save();
    const updated = await populateChat(Chat.findById(chat._id));
    const safeUpdated = await presentChat(updated);
    const io = req.app.get("io");
    // Remove every active socket belonging to the removed user from this chat room.
    await io?.in(`user:${userId}`).socketsLeave(chat._id.toString());
    io?.to(originalMemberIds.map((id) => `user:${id}`)).emit("chat-updated", safeUpdated);
    res.json(safeUpdated);
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر" });
  }
};

module.exports = { accessPrivateChat, getMyChats, createGroup, addToGroup, removeFromGroup };
