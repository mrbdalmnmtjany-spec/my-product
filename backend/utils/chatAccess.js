const mongoose = require("mongoose");
const Chat = require("../models/Chat");

/**
 * بيرجع المحادثة لو المستخدم عضو فيها فعلاً، وإلا بيرجع null.
 * بيستخدم في كل راوت أو حدث سوكت بيلمس رسائل محادثة.
 */
const getChatIfMember = async (chatId, userId) => {
  if (!mongoose.isValidObjectId(chatId)) return null;
  return Chat.findOne({ _id: chatId, members: userId });
};

/**
 * بيهرب الحروف الخاصة عشان مدخلات المستخدم متتحولش لـ regex خطير
 */
const escapeRegex = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { getChatIfMember, escapeRegex };
