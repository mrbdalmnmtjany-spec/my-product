const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const { uploadMedia, deleteMedia } = require('../utils/mediaStorage');
const { presentPost, isSupabaseKey } = require('../utils/mediaPresentation');

const populatePost = (query) => query
  .populate('author', 'name avatar avatarPublicId bio')
  .populate('comments.user', 'name avatar avatarPublicId');

exports.createPost = async (req, res) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim().slice(0, 5000) : '';
    if (!text && !req.file) return res.status(400).json({ message: 'اكتب شيئاً أو أرفق صورة/فيديو.' });
    let mediaUrl = '', mediaKey = '', mediaType = '';
    if (req.file) {
      if (!req.file.mimetype.startsWith('image/') && !req.file.mimetype.startsWith('video/')) return res.status(400).json({ message: 'المنشورات تدعم الصور والفيديو فقط.' });
      mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      const uploaded = await uploadMedia(req.file.buffer, { folder: 'posts', mimetype: req.file.mimetype, originalname: req.file.originalname });
      mediaKey = uploaded.key;
    }
    const post = await Post.create({ author: req.user._id, text, mediaUrl, mediaKey, mediaType });
    const populated = await populatePost(Post.findById(post._id));
    res.status(201).json(await presentPost(populated));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status === 503 ? error.message : 'تعذر نشر المنشور.' });
  }
};

exports.getFeed = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select('following');
    const ids = [...new Set([req.user._id.toString(), ...(me?.following || []).map(String)])];
    const posts = await populatePost(Post.find({ author: { $in: ids } }).sort({ createdAt: -1 }).limit(50));
    const result = await Promise.all(posts.map(async (post) => ({
      ...await presentPost(post),
      liked: post.likes.some((id) => id.toString() === req.user._id.toString()),
    })));
    res.json(result);
  } catch (error) { res.status(500).json({ message: 'تعذر تحميل المنشورات.' }); }
};

exports.getUserPosts = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ message: 'معرّف غير صالح' });
    const posts = await populatePost(Post.find({ author: req.params.userId }).sort({ createdAt: -1 }).limit(50));
    res.json(await Promise.all(posts.map(presentPost)));
  } catch (error) { res.status(500).json({ message: 'تعذر تحميل منشورات المستخدم.' }); }
};

exports.toggleLike = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.postId)) return res.status(400).json({ message: 'منشور غير صالح' });
  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ message: 'المنشور غير موجود' });
  const liked = post.likes.some((id) => id.toString() === req.user._id.toString());
  await Post.updateOne({ _id: post._id }, liked ? { $pull: { likes: req.user._id } } : { $addToSet: { likes: req.user._id } });
  res.json({ liked: !liked, likesCount: post.likes.length + (liked ? -1 : 1) });
};

exports.addComment = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.postId)) return res.status(400).json({ message: 'منشور غير صالح' });
  const text = typeof req.body.text === 'string' ? req.body.text.trim().slice(0, 1200) : '';
  if (!text) return res.status(400).json({ message: 'اكتب تعليقاً أولاً.' });
  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ message: 'المنشور غير موجود' });
  post.comments.push({ user: req.user._id, text });
  await post.save();
  await post.populate('comments.user', 'name avatar avatarPublicId');
  const comment = post.comments[post.comments.length - 1].toObject();
  comment.user = await require('../utils/mediaPresentation').presentUser(comment.user);
  res.status(201).json(comment);
};

exports.deletePost = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.postId)) return res.status(400).json({ message: 'منشور غير صالح' });
  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ message: 'المنشور غير موجود' });
  if (post.author.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'يمكن لصاحب المنشور حذفه فقط.' });
  await post.deleteOne();
  if (post.mediaKey && isSupabaseKey(post.mediaKey)) deleteMedia(post.mediaKey).catch((e) => console.error('Media cleanup failed:', e.message));
  res.json({ deleted: true });
};
