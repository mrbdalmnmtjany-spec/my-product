import { useState, useRef } from "react";
import { Mic, Square, Trash2, Send, MicOff } from "lucide-react";
import { useToast } from "../context/ToastContext.jsx";

// بنختار أول صيغة المتصفح بيدعمها فعليًا للتسجيل — مفيش صيغة واحدة شغالة
// على كل المتصفحات (Safari مبيدعمش webm، Chrome/Firefox مبيدعموش mp4 للتسجيل)
const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

const getSupportedMimeType = () => {
  if (typeof MediaRecorder === "undefined") return null;
  return PREFERRED_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
};

const isVoiceSupported = () =>
  typeof window !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== "undefined";

export default function VoiceRecorder({ onSend }) {
  const { showToast } = useToast();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const mimeTypeRef = useRef("");

  const startRecording = async () => {
    if (!isVoiceSupported()) {
      showToast("تسجيل الصوت مش مدعوم على المتصفح ده، جرّب متصفح تاني أو حدّثه");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType || "";

      // لو مفيش صيغة مدعومة صراحةً، نسيب المتصفح يختار افتراضيًا بدل ما نفرض حاجة ممكن ترفضها
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        // بنستخدم نوع الملف الحقيقي اللي المسجّل استخدمه فعلاً، مش نوع ثابت غلط
        const actualType = recorder.mimeType || mimeTypeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.onerror = () => {
        showToast("حصل خطأ أثناء التسجيل");
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        clearInterval(timerRef.current);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      // المتصفح بيرمي أخطاء مختلفة: NotAllowedError (رفض الإذن)، NotFoundError (مفيش مايك)،
      // أو حتى في سياق http مش https (المتصفح بيمنع الوصول للمايك تمامًا في الحالة دي)
      if (err.name === "NotAllowedError") {
        showToast("لازم تسمح بالوصول للمايك عشان تسجل رسالة صوتية");
      } else if (err.name === "NotFoundError") {
        showToast("مفيش مايك متاح على الجهاز ده");
      } else {
        showToast("تعذّر تشغيل المايك — تأكد إن الموقع شغال عبر HTTPS");
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const cancelRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setSeconds(0);
  };

  const sendRecording = () => {
    if (audioBlob) {
      onSend(audioBlob, seconds);
      cancelRecording();
    }
  };

  const formatDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (audioUrl) {
    return (
      <div className="flex items-center gap-2 bg-room-panel2 border border-room-border rounded-full px-3 py-2 flex-1">
        <button type="button" onClick={cancelRecording} className="text-red-400">
          <Trash2 size={18} />
        </button>
        <audio src={audioUrl} controls className="h-8 flex-1" />
        <button type="button" onClick={sendRecording} className="text-room-gold">
          <Send size={18} />
        </button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2 bg-room-panel2 border border-red-800 rounded-full px-4 py-2 flex-1">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-room-cream text-sm flex-1">{formatDuration(seconds)}</span>
        <button type="button" onClick={stopRecording} className="text-red-400">
          <Square size={18} fill="currentColor" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      className="w-10 h-10 flex items-center justify-center rounded-full bg-room-panel2 border border-room-border text-room-gold hover:bg-room-border transition"
      title="تسجيل رسالة صوتية"
    >
      {isVoiceSupported() ? <Mic size={18} /> : <MicOff size={18} className="opacity-50" />}
    </button>
  );
}
