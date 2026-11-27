import { useState } from "react";
import { Plus } from "lucide-react";
import StoryComposer from "./StoryComposer";

export default function StoriesBar({ myUser, storyGroups, onAddStory, onOpenStory }) {
  const [showComposer, setShowComposer] = useState(false);

  const myStories = storyGroups.find((g) => g.user._id === myUser.id);
  const others = storyGroups.filter((g) => g.user._id !== myUser.id);

  return (
    // shrink-0 عشان الصف ده يفضل بارتفاعه الطبيعي ومياخدش من مساحة قايمة المحادثات
    <div className="flex gap-4 px-4 py-3 overflow-x-auto shrink-0 border-b border-room-border bg-room-panel safe-top">
      {showComposer && (
        <StoryComposer onClose={() => setShowComposer(false)} onSubmit={onAddStory} />
      )}

      {/* ملحوظة: الزرارين دول جنب بعض في div — مينفعش زرار جوه زرار (HTML غير صالح) */}
      <div className="relative flex flex-col items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => (myStories ? onOpenStory(myStories) : setShowComposer(true))}
          className="w-14 h-14 rounded-full border-2 border-room-gold p-0.5"
          title={myStories ? "شوف ستوريك" : "أضف ستوري"}
        >
          {myUser.avatar ? (
            <img src={myUser.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-room-panel2 flex items-center justify-center text-room-cream font-bold">
              {myUser.name?.[0]}
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowComposer(true)}
          className="absolute top-9 left-0 bg-room-gold text-room-bg rounded-full p-0.5 border-2 border-room-panel"
          title="أضف ستوري"
        >
          <Plus size={12} />
        </button>

        <span className="text-[11px] text-room-muted">مِرآتك</span>
      </div>

      {others.map((group) => (
        <button
          type="button"
          key={group.user._id}
          onClick={() => onOpenStory(group)}
          className="flex flex-col items-center gap-1 shrink-0"
        >
          <div className="w-14 h-14 rounded-full border-2 border-room-gold p-0.5">
            {group.user.avatar ? (
              <img
                src={group.user.avatar}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-room-panel2 flex items-center justify-center text-room-cream font-bold">
                {group.user.name?.[0]}
              </div>
            )}
          </div>
          <span className="text-[11px] text-room-muted truncate w-14 text-center">
            {group.user.name}
          </span>
        </button>
      ))}
    </div>
  );
}
