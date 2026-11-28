import { useMemo, useState } from "react";
import {
  LogOut, Plus, Search, Settings, Users, MessageCircle,
  MessageSquare, SlidersHorizontal, Sparkles, X
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const getChatDisplay = (chat, myId) => {
  if (chat.isGroup) return { name: chat.groupName, avatar: chat.groupAvatar, isOnline: false };
  const other = chat.members?.find((m) => m._id !== myId);
  return { name: other?.name || "مستخدم", avatar: other?.avatar, isOnline: other?.isOnline };
};

const isUnread = (chat, myId) => {
  const last = chat.lastMessage;
  if (!last || last.sender?._id === myId || last.sender === myId) return false;
  return !(last.seenBy || []).some((id) => (id?._id || id)?.toString() === myId?.toString());
};

const getPreview = (chat) => {
  const last = chat.lastMessage;
  if (!last) return chat.isGroup ? "ابدأوا أول محادثة" : "ابدأ المحادثة الآن";
  if (last.isDeleted) return "تم حذف الرسالة";
  if (last.type === "image") return "📷 صورة";
  if (last.type === "video") return "🎬 فيديو";
  if (last.type === "audio") return "🎙️ رسالة صوتية";
  return last.content || "رسالة جديدة";
};

export default function Sidebar({
  chats, activeChat, onSelectChat, onNewChat, onNewGroup, onOpenSettings, myId,
}) {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const unreadCount = chats.filter((chat) => isUnread(chat, myId)).length;

  const filtered = useMemo(() => chats.filter((chat) => {
    const { name } = getChatDisplay(chat, myId);
    const matchesSearch = [name, getPreview(chat)].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" ||
      (filter === "unread" && isUnread(chat, myId)) ||
      (filter === "groups" && chat.isGroup);
    return matchesSearch && matchesFilter;
  }), [chats, myId, search, filter]);

  return (
    <aside className="w-full flex-1 min-h-0 bg-room-panel border-l border-room-border flex flex-col">
      <header className="px-4 pt-4 pb-3 border-b border-room-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.png" alt="Moaaz Social" className="h-10 w-auto object-contain" />
            <div className="min-w-0">
              <p className="text-room-cream font-bold text-sm">محادثاتك</p>
              <p className="text-[11px] text-room-muted">{chats.length} محادثة • {unreadCount} غير مقروءة</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={onNewGroup} title="إنشاء مجموعة" className="p-2 rounded-xl text-room-muted hover:text-room-gold hover:bg-room-panel2 transition"><Users size={18}/></button>
            <button type="button" onClick={onNewChat} title="محادثة جديدة" className="p-2 rounded-xl bg-room-gold text-room-bg hover:brightness-110 transition"><Plus size={19}/></button>
          </div>
        </div>
        <div className="relative mt-4">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-room-muted"/>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث في المحادثات..."
            className="w-full bg-room-panel2 border border-room-border text-room-cream text-sm rounded-xl pr-10 pl-9 py-3 outline-none focus:border-room-gold/70 transition"/>
          {search && <button type="button" onClick={() => setSearch("")} aria-label="مسح البحث" className="absolute left-3 top-1/2 -translate-y-1/2 text-room-muted"><X size={15}/></button>}
        </div>
        <div className="flex gap-2 mt-3" role="group" aria-label="تصفية المحادثات">
          {[
            { id: "all", label: "الكل", count: chats.length },
            { id: "unread", label: "غير مقروء", count: unreadCount },
            { id: "groups", label: "المجموعات", count: chats.filter((c) => c.isGroup).length },
          ].map((item) => (
            <button key={item.id} type="button" onClick={() => setFilter(item.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filter === item.id ? "bg-room-gold text-room-bg" : "bg-room-panel2 text-room-muted hover:text-room-cream"}`}>
              {item.label}{item.id === "unread" && item.count > 0 ? ` · ${item.count}` : ""}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-room-panel2 text-room-muted mx-auto flex items-center justify-center"><MessageSquare size={24}/></div>
            <p className="text-room-cream text-sm font-semibold mt-4">{search ? "لا توجد نتائج" : filter === "unread" ? "كل شيء مقروء" : filter === "groups" ? "لا توجد مجموعات بعد" : "لا توجد محادثات بعد"}</p>
            <p className="text-room-muted text-xs mt-1">{search ? "جرّب البحث باسم آخر" : "ابدأ محادثة جديدة لتظهر هنا"}</p>
            {!search && filter !== "unread" && <button type="button" onClick={filter === "groups" ? onNewGroup : onNewChat} className="mt-4 text-room-gold text-xs font-bold">ابدأ الآن</button>}
          </div>
        ) : filtered.map((chat) => {
          const { name, avatar, isOnline } = getChatDisplay(chat, myId);
          const active = activeChat?._id === chat._id;
          const unread = isUnread(chat, myId);
          return (
            <button key={chat._id} type="button" onClick={() => onSelectChat(chat)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl mb-1 text-right transition border ${active ? "bg-room-panel2 border-room-gold/40 shadow-sm" : "border-transparent hover:bg-room-panel2/80"}`}>
              <div className="relative shrink-0">
                {avatar ? <img src={avatar} alt="" className="w-12 h-12 rounded-full object-cover"/> :
                  <div className="w-12 h-12 rounded-full bg-room-goldDark/30 flex items-center justify-center text-room-gold font-bold">{chat.isGroup ? <Users size={19}/> : name?.[0]}</div>}
                {!chat.isGroup && <span className={`absolute bottom-0 left-0 w-3 h-3 rounded-full border-2 border-room-panel ${isOnline ? "bg-emerald-400" : "bg-room-muted"}`}/>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${unread ? "text-room-cream font-bold" : "text-room-cream/90 font-medium"}`}>{name}</p>
                  {unread && <span className="w-2 h-2 rounded-full bg-room-gold shrink-0"/>}
                </div>
                <p className={`text-xs truncate mt-1 ${unread ? "text-room-cream/80 font-medium" : "text-room-muted"}`}>{getPreview(chat)}</p>
              </div>
              {chat.isGroup && <Users size={14} className="text-room-muted shrink-0"/>}
            </button>
          );
        })}
      </div>

      <footer className="flex items-center justify-between gap-3 px-4 py-3 border-t border-room-border safe-bottom bg-room-panel">
        <button type="button" onClick={onOpenSettings} className="flex items-center gap-2 min-w-0 text-right">
          {user?.avatar ? <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover"/> :
            <div className="w-9 h-9 rounded-full bg-room-gold flex items-center justify-center text-room-bg font-bold text-sm">{user?.name?.[0] || "م"}</div>}
          <span className="min-w-0"><span className="block text-room-cream text-sm truncate max-w-[130px]">{user?.name}</span><span className="block text-[10px] text-room-muted">حسابك الشخصي</span></span>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onOpenSettings} title="الإعدادات" className="p-2 rounded-lg text-room-muted hover:text-room-gold hover:bg-room-panel2"><Settings size={17}/></button>
          <button type="button" onClick={logout} title="تسجيل الخروج" className="p-2 rounded-lg text-room-muted hover:text-red-400 hover:bg-room-panel2"><LogOut size={18}/></button>
        </div>
      </footer>
    </aside>
  );
}
