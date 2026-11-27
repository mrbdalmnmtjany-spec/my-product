require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const { initSocket } = require("./socket/socketHandler");

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const storyRoutes = require("./routes/storyRoutes");
const userRoutes = require("./routes/userRoutes");
const aiRoutes = require("./routes/aiRoutes");
const postRoutes = require("./routes/postRoutes");

// ── التأكد من المتغيرات المطلوبة قبل ما نشغّل أي حاجة ─────────────────
const CLIENT_ORIGIN = process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || "";
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (!CLIENT_ORIGIN) missing.push("CLIENT_URL (or Render RENDER_EXTERNAL_URL)");

if (missing.length) {
  console.error("❌ ناقص متغيرات في ملف .env:", missing.join(", "));
  console.error("   محلياً: انسخ backend/.env.example إلى backend/.env. على Render: أضف المتغيرات في Environment.");
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

// خلف أي reverse proxy (Render/Railway/Nginx) لازم نثق في هيدر X-Forwarded-For
// وإلا req.ip هيرجع IP البروكسي نفسه لكل المستخدمين، فالـ rate limiter هيتعامل
// مع كل زوار الموقع كأنهم شخص واحد ويقفل عليهم بسرعة
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// أوريجن صريح — مينفعش "*" مع credentials، المتصفح بيرفض
const allowedOrigins = CLIENT_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // بنسمح بالطلبات اللي من غير origin (Postman / السيرفر نفسه)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const corsError = new Error("Origin غير مسموح به بواسطة CORS");
    corsError.status = 403;
    callback(corsError);
  },
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// السوكت متاح للكنترولرز عشان نبعت أحداث لحظية من السيرفر مباشرة
app.set("io", io);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/posts", postRoutes);

app.get("/api/health", (req, res) => {
  const mongoose = require("mongoose");
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "degraded",
    service: "Moaaz Social API",
    database: databaseReady ? "connected" : "disconnected",
  });
});

// في الإنتاج: السيرفر يقدّم الفرونت المبني (frontend/dist) من نفس الخدمة
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../frontend/dist");
  app.use(express.static(distPath));

  // أي مسار غير API/Socket يرجع index.html (لـ /chat و /verify-email)
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({ message: "المسار غير موجود" });
});

// Error handler عام
app.use((err, req, res, next) => {
  // أخطاء رفع الملفات من multer (الحجم مثلاً) لازم ترجع رسالة مفهومة مش 500
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "حجم الملف كبير جداً، الحد الأقصى 25 ميجابايت"
        : "فشل رفع الملف";
    return res.status(400).json({ message });
  }

  // خطأ نوع الملف الجاي من fileFilter في uploadMiddleware.js مش MulterError رسمي
  if (err.message === "نوع الملف غير مسموح به") {
    return res.status(400).json({ message: err.message });
  }

  if ([400, 403, 503, 502].includes(err.status)) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err.stack);
  res.status(500).json({ message: "حصل خطأ غير متوقع في السيرفر" });
});

initSocket(io);

const PORT = process.env.PORT || 5000;

// لا نعلن أن الخدمة بدأت قبل نجاح اتصال قاعدة البيانات؛ هذا يمنع نشر نسخة
// تبدو سليمة لـ Render بينما كل المسارات المعتمدة على MongoDB تفشل.
(async () => {
  try {
    await connectDB();
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Moaaz Social listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Startup aborted: database connection failed.", error.message);
    process.exit(1);
  }
})();
