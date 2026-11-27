const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "غير مصرح لك، سجل دخولك أولاً" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "المستخدم غير موجود" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "التوكن غير صالح أو منتهي" });
  }
};

module.exports = { protect };
