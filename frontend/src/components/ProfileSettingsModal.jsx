import { useRef, useState } from "react";
import { X, Camera } from "lucide-react";
import ModalBackdrop from "./ModalBackdrop.jsx";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function ProfileSettingsModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarFile, setAvatarFile] = useState(null);
  // معاينة محلية للصورة الجديدة قبل الرفع — بنستخدم object URL بدل ما ننتظر السيرفر
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("اكتب اسمك الأول");
      return;
    }

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("bio", bio);
    if (avatarFile) formData.append("avatar", avatarFile);

    setLoading(true);
    try {
      const { data } = await api.put("/users/profile", formData);
      updateUser({ name: data.name, bio: data.bio, avatar: data.avatar });
      showToast("تم تحديث البروفايل", "success");
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || "فشل تحديث البروفايل");
    } finally {
      setLoading(false);
    }
  };

  const avatarSrc = previewUrl || user?.avatar;

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="bg-room-panel border border-room-border rounded-2xl w-full max-w-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-lg text-room-cream">إعدادات البروفايل</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-room-muted p-2 -m-2 hover:text-room-cream transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex justify-center mb-5">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              hidden
              onChange={handlePickAvatar}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full"
              title="غيّر الصورة"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  className="w-full h-full rounded-full object-cover border-2 border-room-gold"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-room-goldDark/30 flex items-center justify-center text-room-gold text-2xl font-bold border-2 border-room-gold">
                  {name?.[0]}
                </div>
              )}
              <span className="absolute bottom-0 left-0 bg-room-gold text-room-bg rounded-full p-1.5 border-2 border-room-panel">
                <Camera size={13} />
              </span>
            </button>
          </div>

          <label className="block text-xs text-room-muted mb-1.5">الاسم</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسمك"
            className="w-full bg-room-cream text-room-bg rounded-lg px-4 py-2.5 mb-3 outline-none"
          />

          <label className="block text-xs text-room-muted mb-1.5">نبذة عنك</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="اكتب نبذة قصيرة..."
            rows={3}
            maxLength={160}
            className="w-full bg-room-cream text-room-bg rounded-lg px-4 py-2.5 mb-4 outline-none resize-none"
          />

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-room-gold text-room-bg font-bold py-2.5 rounded-lg disabled:opacity-50"
          >
            {loading ? "جارِ الحفظ..." : "حفظ التغييرات"}
          </button>
        </form>
      </div>
    </ModalBackdrop>
  );
}
