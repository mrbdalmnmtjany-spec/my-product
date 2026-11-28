import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, ChevronRight, Users, Sparkles, ArrowUpLeft, RefreshCw } from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";
import ChatWindow from "../components/ChatWindow.jsx";
import StoriesBar from "../components/StoriesBar.jsx";
import StoryViewer from "../components/StoryViewer.jsx";
import GroupModal from "../components/GroupModal.jsx";
import NewChatModal from "../components/NewChatModal.jsx";
import ProfileSettingsModal from "../components/ProfileSettingsModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../utils/api";
import { useToast } from "../context/ToastContext.jsx";
import { connectSocket, getSocket } from "../utils/socket";
import MoaazAI from "../components/MoaazAI.jsx";

export default function ChatPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [storyGroups, setStoryGroups] = useState([]);
  const [viewingStory, setViewingStory] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(true);
  const [recentConversation, setRecentConversation] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [chatLoadError, setChatLoadError] = useState(false);

  const loadChats = useCallback(async () => {
    try {
      const { data } = await api.get("/chats");
      setChats(data);
      setChatLoadError(false);
      getSocket()?.emit("join-chats", data.map((c) => c._id));
    } catch (err) {
      console.error("فشل تحميل المحادثات:", err.message);
      setChatLoadError(true);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  const loadStories = useCallback(async () => {
    try {
      const { data } = await api.get("/stories");
      setStoryGroups(data);
    } catch (err) {
      console.error("فشل تحميل القصص:", err.message);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("moaaz_token");
    if (token) connectSocket(token);
    loadChats();
    loadStories();

    const socket = getSocket();
    const handleNewMessage = () => loadChats();
    const handleChatChanged = () => loadChats();
    const handlePresence = () => loadChats();

    socket?.on("new-message", handleNewMessage);
    socket?.on("chat-created", handleChatChanged);
    socket?.on("chat-updated", handleChatChanged);
    socket?.on("story-posted", loadStories);
    socket?.on("user-online", handlePresence);
    socket?.on("user-offline", handlePresence);

    return () => {
      socket?.off("new-message", handleNewMessage);
      socket?.off("chat-created", handleChatChanged);
      socket?.off("chat-updated", handleChatChanged);
      socket?.off("story-posted", loadStories);
      socket?.off("user-online", handlePresence);
      socket?.off("user-offline", handlePresence);
    };
  }, [loadChats, loadStories]);

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    setRecentConversation([]);
    setShowSidebarMobile(false);
  };

  const handleStartChat = async (otherUser) => {
    try {
      const { data } = await api.post("/chats/private", { userId: otherUser._id });
      getSocket()?.emit("join-chat", data._id);
      setChats((prev) => (prev.find((c) => c._id === data._id) ? prev : [data, ...prev]));
      setActiveChat(data);
      setRecentConversation([]);
      setShowNewChatModal(false);
      setShowSidebarMobile(false);
      loadStories();
    } catch (err) {
      showToast(err.response?.data?.message || "فشل فتح المحادثة");
    }
  };

  const handleGroupCreated = (group) => {
    getSocket()?.emit("join-chat", group._id);
    setChats((prev) => [group, ...prev.filter((c) => c._id !== group._id)]);
    setActiveChat(group);
    setShowSidebarMobile(false);
  };

  const handleAddStory = async ({ type, file, caption, backgroundColor }) => {
    const formData = new FormData();
    formData.append("type", type);
    if (file) formData.append("file", file);
    if (caption) formData.append("caption", caption);
    if (type === "text") formData.append("backgroundColor", backgroundColor);
    try {
      await api.post("/stories", formData);
      loadStories();
    } catch (err) {
      showToast(err.response?.data?.message || "فشل نشر القصة");
      throw err;
    }
  };

  const activeTitle = activeChat?.isGroup
    ? activeChat.groupName
    : activeChat?.members?.find((member) => member._id !== user.id)?.name;

  return (
    <main className="h-screen-safe w-full flex flex-col overflow-hidden bg-room-bg">
      <header className="shrink-0 h-14 px-3 sm:px-5 flex items-center justify-between gap-3 bg-room-panel border-b border-room-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-room-gold/15 text-room-gold flex items-center justify-center shrink-0"><MessageSquare size={18}/></div>
          <div className="min-w-0">
            <p className="text-room-cream text-sm font-bold leading-tight">Moaaz Social</p>
            <p className="text-[10px] text-room-muted leading-tight mt-0.5">مساحتك للتواصل والمشاركة</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Link to="/feed" className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm text-room-muted hover:text-room-gold hover:bg-room-panel2 transition">
            <ArrowUpLeft size={15}/><span>المنشورات</span>
          </Link>
          <span className="hidden sm:block w-px h-6 bg-room-border"/>
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-400 px-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/> مساحة المحادثات</span>
        </nav>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <section className={`${showSidebarMobile ? "flex" : "hidden"} md:flex flex-col w-full md:w-[360px] lg:w-[390px] shrink-0 h-full min-h-0`}>
          <StoriesBar myUser={user} storyGroups={storyGroups} onAddStory={handleAddStory} onOpenStory={setViewingStory}/>
          {loadingChats && chats.length === 0 ? (
            <div className="flex-1 bg-room-panel p-4 space-y-3">
              {[1,2,3,4].map((item) => <div key={item} className="flex items-center gap-3 animate-pulse"><div className="w-12 h-12 rounded-full bg-room-panel2"/><div className="flex-1 space-y-2"><div className="h-3 rounded bg-room-panel2 w-2/5"/><div className="h-2 rounded bg-room-panel2 w-3/4"/></div></div>)}
            </div>
          ) : chatLoadError && chats.length === 0 ? (
            <div className="flex-1 bg-room-panel flex flex-col items-center justify-center p-6 text-center">
              <RefreshCw size={28} className="text-room-muted"/>
              <p className="text-room-cream text-sm font-semibold mt-3">تعذر تحميل المحادثات</p>
              <p className="text-room-muted text-xs mt-1">تحقق من الاتصال ثم حاول مرة أخرى</p>
              <button type="button" onClick={() => { setLoadingChats(true); loadChats(); }} className="mt-4 px-4 py-2 rounded-xl bg-room-gold text-room-bg text-xs font-bold">إعادة المحاولة</button>
            </div>
          ) : (
            <Sidebar chats={chats} activeChat={activeChat} onSelectChat={handleSelectChat}
              onNewChat={() => setShowNewChatModal(true)} onNewGroup={() => setShowGroupModal(true)}
              onOpenSettings={() => setShowSettingsModal(true)} myId={user.id}/>
          )}
        </section>

        <section className={`${showSidebarMobile ? "hidden" : "flex"} md:flex flex-1 min-w-0 min-h-0 bg-room-cream2`}>
          {activeChat ? (
            <div className="flex flex-col w-full min-h-0">
              <button type="button" onClick={() => setShowSidebarMobile(true)}
                className="md:hidden shrink-0 flex items-center gap-2 text-room-gold text-sm px-3 py-3 bg-room-panel border-b border-room-border safe-top">
                <ChevronRight size={17}/> العودة إلى المحادثات
              </button>
              <ChatWindow chat={activeChat} myId={user.id} myName={user.name} onMessagesChange={setRecentConversation}/>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center relative overflow-hidden">
              <div className="absolute w-72 h-72 rounded-full bg-room-gold/5 blur-3xl"/>
              <div className="relative w-24 h-24 rounded-[2rem] bg-room-panel border border-room-border shadow-xl flex items-center justify-center text-room-gold"><MessageSquare size={38}/></div>
              <h1 className="relative mt-6 text-room-bg text-2xl font-bold">مرحباً بك في محادثات معاذ</h1>
              <p className="relative mt-2 max-w-sm text-room-bg/60 text-sm leading-7">اختر محادثة من القائمة لبدء التواصل، أو أنشئ محادثة جديدة مع أصدقائك.</p>
              <div className="relative flex flex-wrap items-center justify-center gap-3 mt-7">
                <button type="button" onClick={() => setShowNewChatModal(true)} className="flex items-center gap-2 rounded-xl bg-room-gold px-5 py-3 text-sm font-bold text-room-bg shadow-md hover:brightness-105 transition"><MessageSquare size={16}/> محادثة جديدة</button>
                <button type="button" onClick={() => setShowGroupModal(true)} className="flex items-center gap-2 rounded-xl border border-room-bg/15 bg-white/50 px-5 py-3 text-sm font-semibold text-room-bg hover:bg-white/80 transition"><Users size={16}/> إنشاء مجموعة</button>
              </div>
              <div className="relative mt-12 flex items-center gap-2 text-[11px] text-room-bg/40"><Sparkles size={13}/> تواصل، شارك، وابقَ قريباً</div>
            </div>
          )}
        </section>
      </div>

      <MoaazAI context={activeChat ? `المستخدم داخل محادثة بعنوان: ${activeTitle || "محادثة خاصة"}. يمكن مشاركة آخر الرسائل مع المساعد فقط بعد تفعيل خيار المشاركة.` : "المستخدم في صفحة المحادثات."} conversation={recentConversation}/>
      {viewingStory && <StoryViewer group={viewingStory} onClose={() => setViewingStory(null)}/>}
      {showGroupModal && <GroupModal onClose={() => setShowGroupModal(false)} onCreated={handleGroupCreated}/>}
      {showNewChatModal && <NewChatModal onClose={() => setShowNewChatModal(false)} onSelect={handleStartChat}/>}
      {showSettingsModal && <ProfileSettingsModal onClose={() => setShowSettingsModal(false)}/>}
    </main>
  );
}
