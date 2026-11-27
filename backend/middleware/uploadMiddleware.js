const multer = require("multer");

// نخزن الملف في الذاكرة عشان نرفعه إلى مزود تخزين خارجي من غير حفظ دائم على خادم التطبيق
const storage = multer.memoryStorage();

// من غير فلترة، أي حد يقدر يرفع أي نوع ملف (حتى لو باسم صورة) عن طريق تلاعب
// بسيط في الـ multipart request. بنسمح بس بالصور/الفيديو/الصوت اللي التطبيق فعلاً بيستخدمها
const allowedMimePrefixes = ["image/", "video/", "audio/"];

const fileFilter = (req, file, cb) => {
  const isAllowed = allowedMimePrefixes.some((prefix) => file.mimetype.startsWith(prefix));
  if (!isAllowed) {
    return cb(new Error("نوع الملف غير مسموح به"));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB حد أقصى (كفاية للصوت/الصور/فيديو قصير)
});

module.exports = upload;
