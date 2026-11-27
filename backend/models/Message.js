const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    type: {
      type: String,
      enum: ["text", "audio", "image", "video", "file"],
      default: "text",
    },
    content: { type: String, default: "" }, // نص الرسالة
    mediaUrl: { type: String, default: "" }, // رابط الوسائط في تخزين الملفات
    mediaKey: { type: String, default: "" }, // object key for cleanup
    duration: { type: Number, default: 0 }, // مدة الرسالة الصوتية بالثواني

    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
