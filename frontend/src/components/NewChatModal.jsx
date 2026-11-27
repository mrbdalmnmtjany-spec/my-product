import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import ModalBackdrop from "./ModalBackdrop.jsx";
import api from "../utils/api";

export default function NewChatModal({ onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

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

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="bg-room-panel border border-room-border rounded-2xl w-full max-w-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-lg text-room-cream">بدء محادثة</h3>
          <button type="button" onClick={onClose} className="text-room-muted p-2 -m-2 hover:text-room-cream transition">
            <X size={18} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-room-bg/50" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الإيميل"
            className="w-full bg-room-cream text-room-bg rounded-lg pr-9 pl-4 py-2.5 outline-none"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {results.map((u) => (
            <button
              type="button"
              key={u._id}
              onClick={() => onSelect(u)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-room-panel2 text-right"
            >
              <div className="w-9 h-9 rounded-full bg-room-panel2 flex items-center justify-center text-room-cream text-sm font-bold">
                {u.name[0]}
              </div>
              <div>
                <p className="text-room-cream text-sm font-medium">{u.name}</p>
                <p className="text-room-muted text-xs">{u.email}</p>
              </div>
            </button>
          ))}
          {query && results.length === 0 && (
            <p className="text-room-muted text-sm text-center py-4">مفيش نتائج</p>
          )}
        </div>
      </div>
    </ModalBackdrop>
  );
}
