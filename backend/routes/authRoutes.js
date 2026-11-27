const express = require("express");
const {
  register,
  verifyEmail,
  login,
  googleAuth,
  logout,
  resendVerification,
} = require("../controllers/authController");
const { createRateLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// حماية بسيطة من محاولات تخمين الباسورد أو إغراق الإيميلات
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 10,
  message: "محاولات كتيرة، استنى 15 دقيقة وحاول تاني",
});
const emailLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 دقايق
  max: 3,
  message: "بعتنالك إيميلات كتير، استنى شوية قبل ما تطلب تاني",
});

router.post("/register", authLimiter, register);
router.get("/verify-email", verifyEmail);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleAuth);
router.post("/logout", logout);
router.post("/resend-verification", emailLimiter, resendVerification);

module.exports = router;
