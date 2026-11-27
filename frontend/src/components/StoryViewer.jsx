import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import api from "../utils/api";

export default function StoryViewer({ group, onClose }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const story = group.stories[index];

  useEffect(() => {
    if (story) api.put(`/stories/${story._id}/view`).catch(() => {});
  }, [story]);

  useEffect(() => {
    if (paused || story?.type === "video") return; // الفيديو بيتحكم في وقته بنفسه عبر onEnded
    const timer = setTimeout(() => {
      if (index < group.stories.length - 1) setIndex((i) => i + 1);
      else onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [index, paused]); // eslint-disable-line

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const goNext = () => {
    if (index < group.stories.length - 1) setIndex((i) => i + 1);
    else onClose();
  };
  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  if (!story) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md h-[85vh] bg-room-panel rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className={`h-full bg-white ${
                  i < index
                    ? "w-full"
                    : i === index
                    ? paused
                      ? "w-full"
                      : "w-full animate-[grow_5s_linear]"
                    : "w-0"
                }`}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-6 right-3 flex items-center gap-2 z-10 bg-black/30 rounded-full px-3 py-1.5">
          <span className="text-white text-sm font-semibold">{group.user.name}</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 left-3 z-10 text-white bg-black/30 rounded-full p-1.5"
        >
          <X size={18} />
        </button>

        <div
          className="w-full h-full flex items-center justify-center"
          style={{ backgroundColor: story.type === "text" ? story.backgroundColor : "#000" }}
        >
          {story.type === "image" && (
            <img alt="" src={story.mediaUrl} className="max-w-full max-h-full object-contain" />
          )}
          {story.type === "video" && (
            <video
              key={story._id}
              src={story.mediaUrl}
              autoPlay
              muted
              playsInline
              // متصفحات كتير بتمنع autoplay بصوت، وبدون muted الفيديو كان بيقف من غير أي تشغيل
              onEnded={goNext}
              className="max-w-full max-h-full object-contain"
            />
          )}
          {story.type === "text" && (
            <p className="text-white text-2xl font-display text-center p-8">{story.caption}</p>
          )}
        </div>

        {story.caption && story.type !== "text" && (
          <p className="absolute bottom-14 right-4 left-4 text-white text-sm text-center">
            {story.caption}
          </p>
        )}

        <div className="absolute bottom-3 right-4 flex items-center gap-1 text-white/80 text-xs">
          <Eye size={14} />
          {story.viewers?.length || 0}
        </div>

        {/* في RTL: "السابق" (زمنيًا للخلف) على اليمين، و"التالي" على الشمال — عكس الترتيب اللاتيني */}
        {index > 0 && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end pr-2 text-white/50"
            aria-label="الستوري السابقة"
          >
            <ChevronRight size={22} />
          </button>
        )}
        {index < group.stories.length - 1 && (
          <button
            type="button"
            onClick={goNext}
            className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-start pl-2 text-white/50"
            aria-label="الستوري التالية"
          >
            <ChevronLeft size={22} />
          </button>
        )}
      </div>
    </div>
  );
}
