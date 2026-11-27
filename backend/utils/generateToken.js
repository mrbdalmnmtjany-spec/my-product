const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const generateAuthToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

// بيحول صيغة زي "30d" / "12h" / "45m" لعدد مللي ثانية.
// كان الكوكي بيثبت على 30 يوم دايمًا بغض النظر عن JWT_EXPIRES_IN،
// يعني لو حد قصّر صلاحية التوكن، الكوكي كان فاضل موجود بعد ما التوكن يبقى منتهي.
const parseDurationToMs = (value, fallbackMs) => {
  const match = /^(\d+)\s*(d|h|m|s)$/i.exec(String(value || "").trim());
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return amount * unitMs[unit];
};

const setTokenCookie = (res, token) => {
  const maxAge = parseDurationToMs(process.env.JWT_EXPIRES_IN, 30 * 24 * 60 * 60 * 1000);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
  });
};

const generateVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, hashedToken };
};

module.exports = { generateAuthToken, setTokenCookie, generateVerificationToken };
