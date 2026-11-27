import { useEffect } from "react";

/**
 * خلفية موحدة للمودالز: بتقفل بـ Esc وبالضغط برة الصندوق.
 * onClose بيتنده مرة واحدة بس، والضغط جوه الصندوق مبيسكرش لبره (stopPropagation).
 */
export default function ModalBackdrop({ onClose, children }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
