const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Chat = require("../models/Chat");

// خريطة: userId -> Set من socketIds (عشان أكتر من تبويب مفتوح)
const onlineUsers = new Map();

const addSocket = (userId, socketId) => {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
  return onlineUsers.get(userId).size;
};

const removeSocket = (userId, socketId) => {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return 0;
  sockets.delete(socketId);
  if (sockets.size === 0) onlineUsers.delete(userId);
  return sockets.size;
};

const initSocket = (io) => {
  // التحقق من هوية المستخدم قبل ما نسمحله يتصل بالسوكت
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split("; ")
          .find((c) => c.startsWith("token="))
          ?.split("=")[1];

      if (!token) return next(new Error("غير مصرح"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("توكن غير صالح"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    const socketCount = addSocket(userId, socket.id);

    // غرفة شخصية خاصة بالمستخدم — بنستخدمها عشان نبعت له إشعارات (جروب جديد،
    // تحديث عضوية، ستوري جديدة) من غير ما نضطر نعمل broadcast لكل المتصلين.
    // ده اللي بيقفل تسريب البيانات: بدل io.emit للكل، بقى io.to('user:'+id)
    socket.join(`user:${userId}`);

    // أول تبويب بس هو اللي يعلن إن المستخدم أونلاين
    if (socketCount === 1) {
      await User.findByIdAndUpdate(userId, { isOnline: true, socketId: socket.id });
      io.emit("user-online", { userId });
    }

    // السيرفر هو اللي بيضم المستخدم لغرف محادثاته — مش الفرونت إند.
    // كده مفيش حد يقدر يدخل غرفة مش عضو فيها، ومفيش رسايل بتضيع.
    try {
      const chats = await Chat.find({ members: userId }).select("_id");
      chats.forEach((chat) => socket.join(chat._id.toString()));
    } catch (err) {
      console.error("فشل الانضمام لغرف المحادثات:", err.message);
    }

    // لو المستخدم دخل محادثة جديدة اتعملت بعد الاتصال
    const joinChatIfMember = async (chatId) => {
      if (!chatId) return false;
      const chat = await Chat.findOne({ _id: chatId, members: userId }).select("_id");
      if (!chat) return false;
      socket.join(chat._id.toString());
      return true;
    };

    socket.on("join-chat", async (chatId) => {
      try {
        await joinChatIfMember(chatId);
      } catch (err) {
        console.error("join-chat error:", err.message);
      }
    });

    socket.on("join-chats", async (chatIds = []) => {
      try {
        await Promise.all(chatIds.map((id) => joinChatIfMember(id)));
      } catch (err) {
        console.error("join-chats error:", err.message);
      }
    });

    // مؤشر "بيكتب..." — بيتبعت للغرفة اللي المستخدم عضو فيها بس
    socket.on("typing", ({ chatId, userName }) => {
      if (!socket.rooms.has(chatId)) return;
      socket.to(chatId).emit("typing", { chatId, userName });
    });

    socket.on("stop-typing", ({ chatId }) => {
      if (!socket.rooms.has(chatId)) return;
      socket.to(chatId).emit("stop-typing", { chatId });
    });

    // ملحوظة: إرسال الرسائل وعلامات القراءة، وكذلك إشعار الستوري الجديدة،
    // بقى السيرفر هو اللي بيبثهم من الكنترولر بعد الحفظ في الداتابيز
    // (شوف messageController.js و storyController.js). ماعدناش نسمح للفرونت
    // إند إنه يطلب من السوكت يعمل broadcast لبيانات هو حدد محتواها — ده كان
    // بيسرّب بيانات الستوري لكل حد متصل بالسيرفر مش بس لجهات الاتصال.

    socket.on("disconnect", async () => {
      const remaining = removeSocket(userId, socket.id);

      // مبنعلنش أوفلاين غير لما كل تبويبات المستخدم تقفل
      if (remaining === 0) {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen,
          socketId: null,
        });
        io.emit("user-offline", { userId, lastSeen });
      }
    });
  });
};

module.exports = { initSocket, onlineUsers };
