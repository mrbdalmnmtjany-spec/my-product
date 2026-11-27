const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 1200 },
}, { timestamps: true });
const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, trim: true, maxlength: 5000, default: '' },
  mediaUrl: { type: String, default: '' },
  mediaKey: { type: String, default: '' },
  mediaType: { type: String, enum: ['image', 'video', ''], default: '' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
}, { timestamps: true });
postSchema.index({ createdAt: -1 });
module.exports = mongoose.model('Post', postSchema);
