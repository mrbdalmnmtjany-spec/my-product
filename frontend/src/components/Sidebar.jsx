import { useState } from "react";
import { MessageSquare, Users, LogOut, Plus, Search, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const getChatDisplay = (chat, myId) => {
  if (chat.isGroup) {
    return { name: chat.groupName, avatar: chat.groupAvatar, isOnline: false };
  }
  const other = chat.members.find((m) => m._id !== myId);
  return { name: other?.name || "مستخدم", avatar: other?.avatar, isOnline: other?.isOnline };
};

export default function Sidebar({
  chats,
  activeChat,
  onSelectChat,
  onNewChat,
  onNewGroup,
  onOpenSettings,
  myId,
}) {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");

  const filtered = chats.filter((c) => {
    const { name } = getChatDisplay(c, myId);
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    // flex-1 مش h-full: الصف ده جوه عمود فيه StoriesBar فوقه، فـ h-full كان بيخليه
    // ياخد ارتفاع العمود كله فوق شريط الستوريز ويطفح بره الشاشة
    <div className="w-full flex-1 min-h-0 bg-room-panel border-l border-room-border flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-room-border">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Moaaz Social" className="h-10 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewGroup}
            title="جروب جديد"
            className="p-2 text-room-muted hover:text-room-gold transition"
          >
            <Users size={18} />
          </button>
          <button
            onClick={onNewChat}
            title="محادثة جديدة"
            className="p-2 text-room-muted hover:text-room-gold transition"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <h2 className="font-display text-room-cream text-xl mb-3">الرسائل</h2>
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-room-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث..."
            className="w-full bg-room-panel2 border border-room-border text-room-cream text-sm rounded-lg pr-9 pl-3 py-2 outline-none focus:border-room-gold"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {filtered.length === 0 && chats.length === 0 && (
          <p className="text-room-muted text-sm text-center mt-6">
            لسه مفيش محادثات، ابدأ واحدة من زرار "+"
          </p>
        )}
        {filtered.length === 0 && chats.length > 0 && (
          <p className="text-room-muted text-sm text-center mt-6">مفيش نتايج مطابقة للبحث</p>
        )}
        {filtered.map((chat) => {
          const { name, avatar, isOnline } = getChatDisplay(chat, myId);
          const isActive = activeChat?._id === chat._id;
          return (
            <button
              key={chat._id}
              onClick={() => onSelectChat(chat)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl mb-1 transition text-right ${
                isActive ? "bg-room-panel2 border border-room-gold/40" : "hover:bg-room-panel2"
              }`}
            >
              <div className="relative shrink-0">
                {avatar ? (
                  <img src={avatar} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-room-goldDark/30 flex items-center justify-center text-room-gold font-bold">
                    {chat.isGroup ? <Users size={18} /> : name?.[0]}
                  </div>
                )}
                {!chat.isGroup && (
                  <span
                    className={`absolute bottom-0 left-0 w-3 h-3 rounded-full border-2 border-room-panel ${
                      isOnline ? "bg-green-500" : "bg-gray-500"
                    }`}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-room-cream font-medium truncate">{name}</p>
                <p className="text-room-muted text-xs truncate">
                  {chat.lastMessage
                    ? chat.lastMessage.type === "text"
                      ? chat.lastMessage.content
                      : "📎 وسائط"
                    : chat.isGroup
                    ? "جروب جديد"
                    : "ابدأ المحادثة"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between p-4 border-t border-room-border safe-bottom">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-2 min-w-0 text-right"
          title="إعدادات البروفايل"
        >
          {user?.avatar ? (
            <img src={user.avatar} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-room-gold flex items-center justify-center text-room-bg font-bold text-sm">
              {user?.name?.[0]}
            </div>
          )}
          <span className="text-room-cream text-sm truncate">{user?.name}</span>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenSettings}
            title="الإعدادات"
            className="text-room-muted hover:text-room-gold transition p-1"
          >
            <Settings size={17} />
          </button>
          <button onClick={logout} title="تسجيل الخروج" className="text-room-muted hover:text-red-400 transition p-1">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
