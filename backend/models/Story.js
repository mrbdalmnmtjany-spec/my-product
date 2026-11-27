const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["image", "video", "text"], default: "image" },
    mediaUrl: { type: String, default: "" },
    mediaKey: { type: String, default: "" },
    caption: { type: String, default: "" },
    backgroundColor: { type: String, default: "#12181a" }, // لو الستوري نص بس

    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // تنتهي تلقائيًا بعد 24 ساعة - TTL index في MongoDB
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Story", storySchema);
