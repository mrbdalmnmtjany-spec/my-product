const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { sendVerificationEmail } = require("../utils/sendEmail");
const { generateAuthToken, setTokenCookie, generateVerificationToken } = require("../utils/generateToken");
const { presentUser } = require("../utils/mediaPresentation");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const authUserPayload = async (user) => {
  const safe = await presentUser(user);
  return { id: safe._id, name: safe.name, email: safe.email, avatar: safe.avatar, bio: safe.bio };
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ message: "من فضلك املأ كل الحقول" });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return res.status(400).json({ message: "صيغة الإيميل غير صحيحة" });
    if (password.length < 6) return res.status(400).json({ message: "كلمة المرور لازم تكون 6 أحرف على الأقل" });
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) return res.status(400).json({ message: "الإيميل مستخدم بالفعل" });
    const { rawToken, hashedToken } = generateVerificationToken();
    const user = await User.create({
      name: name.trim(), email: email.toLowerCase().trim(), password, authProvider: "local",
      isVerified: false, verificationToken: hashedToken,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
    });
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    try {
      await sendVerificationEmail(user.email, user.name, verifyUrl);
    } catch (emailError) {
      console.error("فشل إرسال إيميل التفعيل:", emailError.message);
      return res.status(201).json({ message: "تم إنشاء الحساب لكن فشل إرسال إيميل التفعيل. جرّب تطلب رابط تفعيل تاني بعد شوية", emailFailed: true });
    }
    res.status(201).json({ message: "تم إنشاء الحساب، افتح بريدك الإلكتروني عشان تفعّل الحساب" });
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).json({ message: "رابط تفعيل غير صالح" });
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      email: email.toLowerCase(), verificationToken: hashedToken,
      verificationTokenExpires: { $gt: Date.now() },
    }).select("+verificationToken +verificationTokenExpires");
    if (!user) return res.status(400).json({ message: "رابط التفعيل غير صالح أو منتهي الصلاحية" });
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    const authToken = generateAuthToken(user._id);
    setTokenCookie(res, authToken);
    res.json({ message: "تم تفعيل الحساب بنجاح", token: authToken, user: await authUserPayload(user) });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status === 503 ? error.message : "حصل خطأ في السيرفر" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select("+password");
    if (!user || user.authProvider !== "local") return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    if (!user.isVerified) return res.status(403).json({ message: "من فضلك فعّل حسابك من الإيميل الأول" });
    const token = generateAuthToken(user._id);
    setTokenCookie(res, token);
    res.json({ token, user: await authUserPayload(user) });
  } catch (error) {
    console.error("[AUTH_LOGIN_ERROR]", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    res.status(error.status || 500).json({ message: error.status === 503 ? error.message : "حصل خطأ في السيرفر" });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: "بيانات جوجل غير موجودة" });
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    let user = await User.findOne({ email: payload.email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: payload.name, email: payload.email.toLowerCase(), avatar: payload.picture,
        authProvider: "google", googleId: payload.sub, isVerified: true,
      });
    }
    const token = generateAuthToken(user._id);
    setTokenCookie(res, token);
    res.json({ token, user: await authUserPayload(user) });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status === 503 ? error.message : "فشل تسجيل الدخول بجوجل" });
  }
};

const logout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "تم تسجيل الخروج" });
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ message: "اكتب الإيميل الأول" });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    const genericResponse = { message: "لو الإيميل ده مسجّل عندنا ومش مفعّل، هيوصله رابط تفعيل جديد" };
    if (!user || user.isVerified) return res.json(genericResponse);
    const { rawToken, hashedToken } = generateVerificationToken();
    user.verificationToken = hashedToken;
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    try { await sendVerificationEmail(user.email, user.name, verifyUrl); }
    catch (emailError) { console.error("فشل إرسال إيميل إعادة التفعيل:", emailError.message); }
    res.json(genericResponse);
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر" });
  }
};

module.exports = { register, verifyEmail, login, googleAuth, logout, resendVerification };
