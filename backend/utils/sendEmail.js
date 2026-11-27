const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * يرسل إيميل تأكيد الحساب
 */
const sendVerificationEmail = async (toEmail, name, verifyUrl) => {
  const logoUrl = `${process.env.CLIENT_URL}/logo.png`;
  const html = `
  <div style="font-family: 'Georgia', serif; background:#12181a; color:#f0e6d2; padding:32px; border-radius:12px; max-width:480px; margin:auto; text-align:center;">
    <img src="${logoUrl}" alt="Moaaz Social" width="120" style="margin:0 auto 8px; display:block;" />
    <hr style="border-color:#2a3538;" />
    <p style="text-align:right;">أهلاً ${name} 👋</p>
    <p style="text-align:right;">اضغط الزرار ده عشان تفعّل حسابك وتدخل الغرفة:</p>
    <a href="${verifyUrl}" style="display:inline-block; background:#d4af37; color:#12181a; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold; margin:16px 0;">
      تفعيل الحساب
    </a>
    <p style="font-size:12px; color:#a89a7c; text-align:right;">لو الزرار مش شغال، انسخ الرابط ده في المتصفح:<br/>${verifyUrl}</p>
  </div>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: "تفعيل حسابك على Moaaz Social",
    html,
  });
};

module.exports = { sendVerificationEmail };
