import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, ChevronRight } from "lucide-react";
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

  const loadChats = useCallback(async () => {
    try {
      const { data } = await api.get("/chats");
      setChats(data);
      getSocket()?.emit(
        "join-chats",
        data.map((c) => c._id)
      );
    } catch (err) {
      console.error("فشل تحميل المحادثات:", err.message);
    }
  }, []);

  const loadStories = useCallback(async () => {
    try {
      const { data } = await api.get("/stories");
      setStoryGroups(data);
    } catch (err) {
      console.error("فشل تحميل الستوريز:", err.message);
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

      // لازم ندخل غرفة السوكت بتاعة المحادثة الجديدة فورًا
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
    setChats((prev) => [group, ...prev]);
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
      // السيرفر بقى هو اللي بيبث "story-posted" لجهات الاتصال المعنيين بس
      // بعد الحفظ في الداتابيز (شوف storyController.js) — مش الفرونت إند
      await api.post("/stories", formData);
      loadStories();
    } catch (err) {
      showToast(err.response?.data?.message || "فشل نشر الستوري");
      throw err;
    }
  };

  return (
    <div className="h-screen-safe w-full flex flex-col bg-room-bg overflow-hidden">
      <div className="shrink-0 h-10 px-3 flex items-center justify-between bg-room-panel border-b border-room-border text-xs"><span className="font-bold text-room-gold">Moaaz Social</span><Link to="/feed" className="text-room-text hover:text-room-gold">المنشورات والتغذية الاجتماعية ←</Link></div>
      <div className="flex-1 min-h-0 flex overflow-hidden">
      <div
        className={`${
          showSidebarMobile ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-[340px] shrink-0 h-full min-h-0`}
      >
        <StoriesBar
          myUser={user}
          storyGroups={storyGroups}
          onAddStory={handleAddStory}
          onOpenStory={setViewingStory}
        />
        <Sidebar
          chats={chats}
          activeChat={activeChat}
          onSelectChat={handleSelectChat}
          onNewChat={() => setShowNewChatModal(true)}
          onNewGroup={() => setShowGroupModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          myId={user.id}
        />
      </div>

      <div className={`${showSidebarMobile ? "hidden" : "flex"} md:flex flex-1 min-w-0`}>
        {activeChat ? (
          <div className="flex flex-col w-full min-h-0">
            {/* في RTL "رجوع" بيتحرك لليمين، فالسهم لازم يشاور يمين */}
            <button
              type="button"
              onClick={() => setShowSidebarMobile(true)}
              className="md:hidden flex items-center gap-1 text-room-gold text-sm p-2.5 bg-room-panel border-b border-room-border safe-top"
            >
              <ChevronRight size={16} />
              رجوع للمحادثات
            </button>
            <ChatWindow chat={activeChat} myId={user.id} myName={user.name} onMessagesChange={setRecentConversation} />
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-room-muted bg-room-cream2">
            <MessageSquare size={48} />
            <p className="mt-3 font-display text-lg">اختر قصة لتفتحها</p>
          </div>
        )}
      </div>
      </div>

      <MoaazAI context={activeChat ? `المستخدم داخل محادثة بعنوان: ${activeChat.isGroup ? activeChat.groupName : (activeChat.members?.find((m) => m._id !== user.id)?.name || "محادثة خاصة")}. يمكن مشاركة آخر الرسائل مع المساعد فقط بعد تفعيل خيار المشاركة.` : "المستخدم في صفحة المحادثات."} conversation={recentConversation} />

      {viewingStory && <StoryViewer group={viewingStory} onClose={() => setViewingStory(null)} />}
      {showGroupModal && (
        <GroupModal onClose={() => setShowGroupModal(false)} onCreated={handleGroupCreated} />
      )}
      {showNewChatModal && (
        <NewChatModal onClose={() => setShowNewChatModal(false)} onSelect={handleStartChat} />
      )}
      {showSettingsModal && (
        <ProfileSettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  );
}
