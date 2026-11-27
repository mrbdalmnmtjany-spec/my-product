const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },

    // للشات الشخصي: عضوين بالظبط. للجروب: أكتر من 2
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],

    // بيانات الجروب فقط
    groupName: { type: String, default: "" },
    groupAvatar: { type: String, default: "" },
    groupAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
