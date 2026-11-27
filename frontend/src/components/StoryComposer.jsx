import { useRef, useState } from "react";
import { X, Image as ImageIcon, Video, Type, Loader2 } from "lucide-react";

const BG_COLORS = ["#12181a", "#3b2f1f", "#1f2a3b", "#2f1f3b", "#3b1f28", "#1f3b2a"];

const MAX_VIDEO_SECONDS = 30;

export default function StoryComposer({ onClose, onSubmit }) {
  const [mode, setMode] = useState(null); // "text" | "image" | "video"
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [backgroundColor, setBackgroundColor] = useState(BG_COLORS[0]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  const openFilePicker = (kind) => {
    setMode(kind);
    setError("");
    fileRef.current?.click();
  };

  const validateVideoDuration = (videoFile) =>
    new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > MAX_VIDEO_SECONDS + 0.5) {
          reject(new Error(`الفيديو لازم يكون 30 ثانية أو أقل (طوله ${Math.round(video.duration)} ثانية)`));
        } else {
          resolve();
        }
      };
      video.onerror = () => reject(new Error("تعذّر قراءة الفيديو"));
      video.src = URL.createObjectURL(videoFile);
    });

  const handleFile = async (e) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;

    setError("");

    if (mode === "video") {
      try {
        await validateVideoDuration(picked);
      } catch (err) {
        setError(err.message);
        return;
      }
    }

    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const handleSubmit = async () => {
    setError("");

    if (mode === "text") {
      if (!caption.trim()) {
        setError("اكتب نص الستوري الأول");
        return;
      }
    } else if (!file) {
      setError("اختار صورة أو فيديو الأول");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        type: mode,
        file: mode === "text" ? null : file,
        caption: caption.trim(),
        backgroundColor,
      });
      onClose();
    } catch (err) {
      setError(err?.message || "فشل نشر الستوري");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-room-panel rounded-2xl overflow-hidden shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-room-border">
          <h3 className="text-room-cream font-semibold">ستوري جديدة</h3>
          <button type="button" onClick={onClose} className="text-room-muted">
            <X size={20} />
          </button>
        </div>

        {!mode && (
          <div className="grid grid-cols-3 gap-3 p-5">
            <button
              type="button"
              onClick={() => setMode("text")}
              className="flex flex-col items-center gap-2 py-4 rounded-xl bg-room-panel2 text-room-cream hover:bg-room-border"
            >
              <Type size={22} />
              <span className="text-xs">نص</span>
            </button>
            <button
              type="button"
              onClick={() => openFilePicker("image")}
              className="flex flex-col items-center gap-2 py-4 rounded-xl bg-room-panel2 text-room-cream hover:bg-room-border"
            >
              <ImageIcon size={22} />
              <span className="text-xs">صورة</span>
            </button>
            <button
              type="button"
              onClick={() => openFilePicker("video")}
              className="flex flex-col items-center gap-2 py-4 rounded-xl bg-room-panel2 text-room-cream hover:bg-room-border"
            >
              <Video size={22} />
              <span className="text-xs">فيديو (30 ث)</span>
            </button>
          </div>
        )}

        {mode === "text" && (
          <div className="p-5 flex flex-col gap-4">
            <div
              className="w-full h-40 rounded-xl flex items-center justify-center p-4"
              style={{ backgroundColor }}
            >
              <textarea
                autoFocus
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="اكتب اللي في بالك..."
                maxLength={200}
                className="w-full bg-transparent text-white text-center text-lg font-display resize-none outline-none placeholder:text-white/50"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-center">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBackgroundColor(c)}
                  className={`w-7 h-7 rounded-full border-2 ${
                    backgroundColor === c ? "border-room-gold" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label="لون الخلفية"
                />
              ))}
            </div>
          </div>
        )}

        {(mode === "image" || mode === "video") && (
          <div className="p-5 flex flex-col gap-3">
            {preview ? (
              mode === "image" ? (
                <img src={preview} alt="" className="w-full max-h-72 object-contain rounded-xl bg-black" />
              ) : (
                <video src={preview} controls className="w-full max-h-72 rounded-xl bg-black" />
              )
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-40 rounded-xl border-2 border-dashed border-room-border text-room-muted flex items-center justify-center"
              >
                اضغط لاختيار {mode === "image" ? "صورة" : "فيديو (30 ثانية كحد أقصى)"}
              </button>
            )}
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="اكتب تعليق (اختياري)"
              maxLength={200}
              className="w-full bg-room-panel2 text-room-cream px-3 py-2 rounded-lg outline-none placeholder:text-room-muted"
            />
          </div>
        )}

        <input
          type="file"
          ref={fileRef}
          hidden
          accept={mode === "video" ? "video/*" : "image/*"}
          onChange={handleFile}
        />

        {error && <p className="px-5 text-red-400 text-sm">{error}</p>}

        {mode && (
          <div className="flex gap-2 p-4 border-t border-room-border">
            <button
              type="button"
              onClick={() => {
                setMode(null);
                setFile(null);
                setPreview(null);
                setCaption("");
                setError("");
              }}
              className="flex-1 py-2.5 rounded-lg bg-room-panel2 text-room-cream"
            >
              رجوع
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-room-gold text-room-bg font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              نشر
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
