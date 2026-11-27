import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Paperclip, Users, MessageSquare, X, CheckSquare, Trash2 } from "lucide-react";
import MessageBubble from "./MessageBubble.jsx";
import VoiceRecorder from "./VoiceRecorder.jsx";
import api from "../utils/api";
import { useToast } from "../context/ToastContext.jsx";
import { getSocket } from "../utils/socket";

export default function ChatWindow({ chat, myId, myName, onMessagesChange }) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeout = useRef(null);

  const otherMember = !chat.isGroup ? chat.members.find((m) => m._id !== myId) : null;
  const title = chat.isGroup ? chat.groupName : otherMember?.name;
  const isOnline = chat.isGroup ? false : otherMember?.isOnline;

  // السيرفر بقى بيبعت الرسالة لكل الغرفة (بما فيهم الراسل)،
  // فلازم نمنع التكرار لو الرسالة وصلت من الـ API ومن السوكت
  const upsertMessage = useCallback((msg) => {
    setMessages((prev) => {
      const index = prev.findIndex((m) => m._id === msg._id);
      if (index === -1) return [...prev, msg];
      const next = [...prev];
      next[index] = msg;
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setReplyingTo(null); // بنلغي أي رد كان جاري كتابته في المحادثة السابقة
    setSelectionMode(false);
    setSelectedIds(new Set());

    api
      .get(`/messages/${chat._id}`)
      .then(({ data }) => {
        if (cancelled) return;
        setMessages(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMessages([]);
        setLoading(false);
      });

    api.put(`/messages/${chat._id}/seen`).catch(() => {});

    const socket = getSocket();
    socket?.emit("join-chat", chat._id);

    const handleNewMessage = (msg) => {
      const msgChatId = msg.chat?._id || msg.chat;
      if (msgChatId !== chat._id) return;
      upsertMessage(msg);

      // وصلتنا رسالة واحنا فاتحين الشات → نعلّمها مقروءة على طول
      if (msg.sender?._id !== myId) {
        api.put(`/messages/${chat._id}/seen`).catch(() => {});
      }
    };

    const handleMessagesSeen = ({ chatId, userId }) => {
      if (chatId !== chat._id || userId === myId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.seenBy?.includes(userId) ? m : { ...m, seenBy: [...(m.seenBy || []), userId] }
        )
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, isDeleted: true, content: "", mediaUrl: "" } : m
        )
      );
    };

    const handleTyping = ({ chatId, userName }) => {
      if (chatId === chat._id) setTypingUser(userName);
    };
    const handleStopTyping = ({ chatId }) => {
      if (chatId === chat._id) setTypingUser(null);
    };

    socket?.on("new-message", handleNewMessage);
    socket?.on("messages-seen", handleMessagesSeen);
    socket?.on("message-deleted", handleMessageDeleted);
    socket?.on("typing", handleTyping);
    socket?.on("stop-typing", handleStopTyping);

    return () => {
      cancelled = true;
      clearTimeout(typingTimeout.current);
      socket?.off("new-message", handleNewMessage);
      socket?.off("messages-seen", handleMessagesSeen);
      socket?.off("message-deleted", handleMessageDeleted);
      socket?.off("typing", handleTyping);
      socket?.off("stop-typing", handleStopTyping);
    };
  }, [chat._id, myId, upsertMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (onMessagesChange) {
      const recent = messages.slice(-10).map((m) => ({
        sender: m.sender?.name || (m.sender?._id === myId ? myName : 'مشارك'),
        type: m.type,
        text: m.type === 'text' ? m.content : `[مرفق ${m.type || 'وسائط'}]`,
      }));
      onMessagesChange(recent);
    }
  }, [messages, onMessagesChange, myId, myName]);

  const handleTyping = () => {
    const socket = getSocket();
    socket?.emit("typing", { chatId: chat._id, userName: myName });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket?.emit("stop-typing", { chatId: chat._id });
    }, 1500);
  };

  const handleSendText = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const content = text;
    const replyToId = replyingTo?._id || null;
    setText("");
    setReplyingTo(null);
    getSocket()?.emit("stop-typing", { chatId: chat._id });

    try {
      const { data } = await api.post("/messages", {
        chatId: chat._id,
        content,
        replyTo: replyToId,
      });
      upsertMessage(data);
    } catch (err) {
      showToast(err.response?.data?.message || "فشل إرسال الرسالة");
      setText(content);
      if (replyToId) setReplyingTo(replyingTo);
    }
  };

  const uploadMedia = async (fileOrBlob, type, duration = 0) => {
    const formData = new FormData();
    // اسم الملف لازم يطابق نوع التسجيل الحقيقي (Safari بيسجل mp4 مش webm)
    // لإرسال نوع الملف الصحيح إلى مزود التخزين
    const audioExt = fileOrBlob.type?.includes("mp4")
      ? "m4a"
      : fileOrBlob.type?.includes("ogg")
      ? "ogg"
      : "webm";
    formData.append("file", fileOrBlob, type === "audio" ? `voice.${audioExt}` : fileOrBlob.name);
    formData.append("chatId", chat._id);
    formData.append("type", type);
    formData.append("duration", duration);
    if (replyingTo) formData.append("replyTo", replyingTo._id);

    try {
      const { data } = await api.post("/messages/media", formData);
      upsertMessage(data);
      setReplyingTo(null);
    } catch (err) {
      showToast(err.response?.data?.message || "فشل رفع الملف");
    }
  };

  const toggleSelect = (messageId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // بيمسح كل الرسايل المحددة (soft delete بواسطة السيرفر) — واحدة واحدة،
  // والسيرفر برضه بيرفض أي رسالة مش بتاعة المستخدم فمفيش خطورة حتى لو الـ id اتلاعب فيه
  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const results = await Promise.allSettled(ids.map((id) => api.delete(`/messages/${id}`)));
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      showToast(`فشل حذف ${failed} من الرسايل`);
    }
    cancelSelection();
  };

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith("video") ? "video" : "image";
    uploadMedia(file, type);
    e.target.value = "";
  };

  return (
    <div className="flex-1 flex flex-col bg-room-cream2 min-h-0">
      {selectionMode ? (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-room-panel border-b border-room-border">
          <button
            type="button"
            onClick={cancelSelection}
            className="text-room-muted hover:text-room-cream shrink-0 p-1"
            title="إلغاء التحديد"
          >
            <X size={20} />
          </button>
          <p className="flex-1 text-room-cream font-semibold">
            {selectedIds.size > 0 ? `تم تحديد ${selectedIds.size}` : "اختار رسايل تمسحها"}
          </p>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 text-red-400 disabled:opacity-40 shrink-0 p-1"
            title="مسح المحدد"
          >
            <Trash2 size={19} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-room-panel border-b border-room-border">
          {chat.isGroup ? (
            <div className="w-10 h-10 rounded-full bg-room-goldDark/30 flex items-center justify-center text-room-gold shrink-0">
              <Users size={18} />
            </div>
          ) : otherMember?.avatar ? (
            <img src={otherMember.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-room-goldDark/30 flex items-center justify-center text-room-gold font-bold shrink-0">
              {title?.[0]}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-room-cream font-semibold truncate">{title}</p>
            <p className="text-xs text-room-muted truncate">
              {typingUser
                ? `${typingUser} بيكتب...`
                : chat.isGroup
                ? `${chat.members.length} أعضاء`
                : isOnline
                ? "متصل الآن"
                : "غير متصل"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectionMode(true)}
            className="text-room-muted hover:text-room-gold shrink-0 p-1.5"
            title="تحديد رسايل"
          >
            <CheckSquare size={19} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {loading ? (
          <p className="text-center text-room-bg/40 text-sm">جارِ تحميل الرسائل...</p>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-room-bg/40">
            <MessageSquare size={36} />
            <p className="mt-2 text-sm">ابدأ الحديث في هذه المحادثة</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              isMine={msg.sender?._id === myId}
              otherSeen={msg.seenBy?.some((id) => (id?._id || id)?.toString() !== myId)}
              onReply={setReplyingTo}
              selectionMode={selectionMode}
              selected={selectedIds.has(msg._id)}
              onToggleSelect={toggleSelect}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {replyingTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-room-panel border-t border-room-border">
          <div className="flex-1 min-w-0 border-r-2 border-room-gold pr-2">
            <p className="text-xs text-room-gold font-semibold">
              رد على {replyingTo.sender?._id === myId ? "نفسك" : replyingTo.sender?.name || ""}
            </p>
            <p className="text-xs text-room-muted truncate">
              {replyingTo.isDeleted
                ? "تم حذف هذه الرسالة"
                : replyingTo.type === "text"
                ? replyingTo.content
                : "وسائط"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="text-room-muted hover:text-room-cream shrink-0 p-1"
            title="إلغاء الرد"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSendText}
        className="flex items-center gap-2 p-3 bg-room-panel border-t border-room-border safe-bottom"
      >
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,video/*"
          hidden
          onChange={handleFilePick}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 flex items-center justify-center rounded-full text-room-muted hover:text-room-gold transition"
        >
          <Paperclip size={19} />
        </button>

        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          placeholder="اكتب سطراً..."
          className="flex-1 bg-room-panel2 border border-room-border text-room-cream rounded-full px-4 py-2.5 outline-none focus:border-room-gold"
        />

        {text.trim() ? (
          <button
            type="submit"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-room-gold text-room-bg"
          >
            <Send size={17} />
          </button>
        ) : (
          <VoiceRecorder onSend={(blob, duration) => uploadMedia(blob, "audio", duration)} />
        )}
      </form>
    </div>
  );
}
