import { Check, CheckCheck, Ban, Reply, CheckCircle2, Circle } from "lucide-react";
import VoicePlayer from "./VoicePlayer.jsx";

const formatTime = (date) =>
  new Date(date).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

export default function MessageBubble({
  message,
  isMine,
  otherSeen,
  onReply,
  selectionMode,
  selected,
  onToggleSelect,
}) {
  const canSelect = selectionMode && isMine && !message.isDeleted;

  const handleBubbleClick = () => {
    if (canSelect) onToggleSelect?.(message._id);
  };

  return (
    <div
      className={`group flex items-center gap-1.5 ${isMine ? "justify-end" : "justify-start"} bubble-in`}
    >
      {/* في وضع التحديد بيظهر مكان زرار الرد دايرة اختيار — بس للرسايل بتاعتي
          (المسح مسموح بيه للرسايل بتاعتي بس، زي ما السيرفر بيفرضه) */}
      {selectionMode ? (
        isMine &&
        !message.isDeleted && (
          <button
            type="button"
            onClick={() => onToggleSelect?.(message._id)}
            className={`shrink-0 p-1 text-room-gold order-first`}
          >
            {selected ? <CheckCircle2 size={19} /> : <Circle size={19} />}
          </button>
        )
      ) : (
        !message.isDeleted && (
          <button
            type="button"
            onClick={() => onReply?.(message)}
            title="رد"
            className={`shrink-0 p-1.5 rounded-full text-room-muted hover:text-room-gold hover:bg-room-panel2 transition opacity-0 group-hover:opacity-100 focus:opacity-100 ${
              isMine ? "order-first" : "order-last"
            }`}
          >
            <Reply size={15} />
          </button>
        )
      )}
      <div
        onClick={handleBubbleClick}
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm border ${canSelect ? "cursor-pointer" : ""} ${
          selected ? "ring-2 ring-room-gold" : ""
        } ${
          isMine
            ? // فقاعتي: خلفية ذهبية فاتحة واضحة — الكريم العادي كان بيدوب في خلفية الشات
              "bg-room-gold/25 border-room-gold/40 text-room-bg rounded-tr-2xl rounded-tl-sm"
            : // فقاعة الطرف التاني: الذيل على اليمين لأن الفقاعة نفسها على يمين الشاشة في RTL
              "bg-room-panel2 border-room-border text-room-cream rounded-tl-2xl rounded-tr-sm"
        }`}
      >
        {message.isDeleted ? (
          <p className="flex items-center gap-1.5 italic opacity-60 text-sm">
            <Ban size={13} />
            تم حذف هذه الرسالة
          </p>
        ) : (
          <>
            {message.replyTo && (
              <div className="text-xs opacity-70 border-r-2 border-room-gold pr-2 mb-1 truncate">
                {message.replyTo.content || "وسائط"}
              </div>
            )}

            {message.type === "text" && (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}

            {message.type === "image" && (
              <img
                src={message.mediaUrl}
                alt="صورة"
                className="rounded-lg max-w-full max-h-72 object-cover"
              />
            )}

            {message.type === "video" && (
              <video src={message.mediaUrl} controls className="rounded-lg max-w-full max-h-72" />
            )}

            {message.type === "audio" && <VoicePlayer src={message.mediaUrl} mine={isMine} />}
          </>
        )}

        {/* التوقيت دايمًا في نهاية الفقاعة (يمين) بغض النظر مين باعتها */}
        <div className="flex items-center gap-1 mt-1 justify-end">
          <span className={`text-[10px] ${isMine ? "text-room-bg/60" : "opacity-60"}`}>
            {formatTime(message.createdAt)}
          </span>
          {isMine &&
            !message.isDeleted &&
            (otherSeen ? (
              <CheckCheck size={13} className="text-room-goldDark" />
            ) : (
              <Check size={13} className="text-room-bg/50" />
            ))}
        </div>
      </div>
    </div>
  );
}
