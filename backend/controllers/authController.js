const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { sendVerificationEmail } = require("../utils/sendEmail");
const {
  generateAuthToken,
  setTokenCookie,
  generateVerificationToken,
} = require("../utils/generateToken");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    تسجيل مستخدم جديد بإيميل وباسورد + إرسال رابط تفعيل
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "من فضلك املأ كل الحقول" });
    }

    // تحقق بسيط من صيغة الإيميل — الفرونت بيتحقق برضه لكن أي حد يقدر يبعت
    // الطلب مباشرة (Postman/curl) من غير ما يعدي على الفرونت خالص
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: "صيغة الإيميل غير صحيحة" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "كلمة المرور لازم تكون 6 أحرف على الأقل" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: "الإيميل مستخدم بالفعل" });
    }

    const { rawToken, hashedToken } = generateVerificationToken();

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      authProvider: "local",
      isVerified: false,
      verificationToken: hashedToken,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 ساعة
    });

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}&email=${encodeURIComponent(
      user.email
    )}`;

    try {
      await sendVerificationEmail(user.email, user.name, verifyUrl);
    } catch (emailError) {
      // الحساب اتعمل فعلاً في الداتابيز — مينفعش نرجّع 500 وكأن التسجيل فشل.
      // بنرجّع نجاح مع تحذير، والمستخدم يقدر يطلب رابط تاني من "resend-verification"
      console.error("فشل إرسال إيميل التفعيل:", emailError.message);
      return res.status(201).json({
        message:
          "تم إنشاء الحساب لكن فشل إرسال إيميل التفعيل. جرّب تطلب رابط تفعيل تاني بعد شوية",
        emailFailed: true,
      });
    }

    res.status(201).json({
      message: "تم إنشاء الحساب، افتح بريدك الإلكتروني عشان تفعّل الحساب",
    });
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر", error: error.message });
  }
};

// @desc    تفعيل الحساب من رابط الإيميل
// @route   GET /api/auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) {
      return res.status(400).json({ message: "رابط تفعيل غير صالح" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email: email.toLowerCase(),
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: Date.now() },
    }).select("+verificationToken +verificationTokenExpires");

    if (!user) {
      return res.status(400).json({ message: "رابط التفعيل غير صالح أو منتهي الصلاحية" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    const authToken = generateAuthToken(user._id);
    setTokenCookie(res, authToken);

    res.json({
      message: "تم تفعيل الحساب بنجاح",
      token: authToken,
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
    });
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر", error: error.message });
  }
};

// @desc    تسجيل الدخول بإيميل وباسورد
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select("+password");

    if (!user || user.authProvider !== "local") {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "من فضلك فعّل حسابك من الإيميل الأول" });
    }

    const token = generateAuthToken(user._id);
    setTokenCookie(res, token);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, bio: user.bio },
    });
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر", error: error.message });
  }
};

// @desc    تسجيل الدخول / التسجيل بجوجل
// @route   POST /api/auth/google
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body; // الـ ID token الجاي من Google Sign-In (frontend)

    if (!credential) {
      return res.status(400).json({ message: "بيانات جوجل غير موجودة" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await User.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      user = await User.create({
        name: payload.name,
        email: payload.email.toLowerCase(),
        avatar: payload.picture,
        authProvider: "google",
        googleId: payload.sub,
        isVerified: true, // جوجل بيأكد الإيميل تلقائيًا
      });
    }

    const token = generateAuthToken(user._id);
    setTokenCookie(res, token);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
    });
  } catch (error) {
    res.status(500).json({ message: "فشل تسجيل الدخول بجوجل", error: error.message });
  }
};

// @desc    تسجيل الخروج
// @route   POST /api/auth/logout
const logout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "تم تسجيل الخروج" });
};

// @desc    إعادة إرسال رابط التفعيل
// @route   POST /api/auth/resend-verification
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ message: "اكتب الإيميل الأول" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // رد موحّد سواء الإيميل موجود أو لأ — عشان محدش يقدر يستخدم الراوت ده
    // كأداة لمعرفة إيميلات مسجّلة فعلاً في النظام (user enumeration)
    const genericResponse = {
      message: "لو الإيميل ده مسجّل عندنا ومش مفعّل، هيوصله رابط تفعيل جديد",
    };

    if (!user || user.isVerified) {
      return res.json(genericResponse);
    }

    const { rawToken, hashedToken } = generateVerificationToken();
    user.verificationToken = hashedToken;
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawToken}&email=${encodeURIComponent(
      user.email
    )}`;

    try {
      await sendVerificationEmail(user.email, user.name, verifyUrl);
    } catch (emailError) {
      console.error("فشل إرسال إيميل إعادة التفعيل:", emailError.message);
      // مبنسربش للمستخدم إن الإرسال فشل تقنيًا — برضه بنرد بنفس الرسالة العامة
    }

    res.json(genericResponse);
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ في السيرفر", error: error.message });
  }
};

module.exports = { register, verifyEmail, login, googleAuth, logout, resendVerification };
