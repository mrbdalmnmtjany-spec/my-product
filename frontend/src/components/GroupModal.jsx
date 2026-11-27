import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import ModalBackdrop from "./ModalBackdrop.jsx";
import api from "../utils/api";
import { useToast } from "../context/ToastContext.jsx";

export default function GroupModal({ onClose, onCreated }) {
  const { showToast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      api
        .get(`/users/search?q=${encodeURIComponent(query)}`)
        .then(({ data }) => {
          // لو المستخدم قفل المودال أو غيّر النص قبل ما الطلب يرجع، ماتحدّثش الحالة
          if (!cancelled) setResults(data);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  const toggleUser = (user) => {
    setSelected((prev) =>
      prev.find((u) => u._id === user._id) ? prev.filter((u) => u._id !== user._id) : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.length < 2) return;
    setLoading(true);
    try {
      const { data } = await api.post("/chats/group", {
        groupName,
        members: selected.map((u) => u._id),
      });
      onCreated(data);
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || "فشل إنشاء الجروب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="bg-room-panel border border-room-border rounded-2xl w-full max-w-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-lg text-room-cream">إنشاء جروب</h3>
          <button type="button" onClick={onClose} className="text-room-muted p-2 -m-2 hover:text-room-cream transition">
            <X size={18} />
          </button>
        </div>

        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="اسم الجروب"
          className="w-full bg-room-cream text-room-bg rounded-lg px-4 py-2.5 mb-3 outline-none"
        />

        <div className="relative mb-3">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-room-bg/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن أصدقاء"
            className="w-full bg-room-cream text-room-bg rounded-lg pr-9 pl-4 py-2.5 outline-none"
          />
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selected.map((u) => (
              <span
                key={u._id}
                onClick={() => toggleUser(u)}
                className="bg-room-gold/20 text-room-gold text-xs px-2 py-1 rounded-full cursor-pointer"
              >
                {u.name} ✕
              </span>
            ))}
          </div>
        )}

        <div className="max-h-40 overflow-y-auto space-y-1 mb-4">
          {results.map((u) => (
            <button
              type="button"
              key={u._id}
              onClick={() => toggleUser(u)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg text-right ${
                selected.find((s) => s._id === u._id) ? "bg-room-gold/20" : "hover:bg-room-panel2"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-room-panel2 flex items-center justify-center text-room-cream text-xs font-bold">
                {u.name[0]}
              </div>
              <span className="text-room-cream text-sm">{u.name}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={loading || !groupName.trim() || selected.length < 2}
          className="w-full bg-room-gold text-room-bg font-bold py-2.5 rounded-lg disabled:opacity-50"
        >
          {loading ? "جارِ الإنشاء..." : "إنشاء الجروب"}
        </button>
      </div>
    </ModalBackdrop>
  );
}
