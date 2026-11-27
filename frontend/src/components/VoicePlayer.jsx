import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

const formatTime = (secs) => {
  if (!Number.isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default function VoicePlayer({ src, mine }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const ratio = Number(e.target.value) / 100;
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const accent = mine ? "#0f1517" : "#d4af37";
  const track = mine ? "rgba(15,21,23,0.2)" : "rgba(212,175,55,0.2)";

  return (
    <div className="flex items-center gap-2 w-56 max-w-full" dir="ltr">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        onClick={togglePlay}
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          mine ? "bg-room-bg/15 text-room-bg" : "bg-room-gold/20 text-room-gold"
        }`}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="translate-x-[1px]" />}
      </button>

      <input
        type="range"
        min={0}
        max={100}
        value={progress || 0}
        onChange={handleSeek}
        className="voice-seek flex-1"
        style={{
          "--voice-fill": accent,
          "--voice-track": track,
          background: `linear-gradient(to right, ${accent} ${progress}%, ${track} ${progress}%)`,
        }}
      />

      <span className={`text-[10px] shrink-0 tabular-nums ${mine ? "text-room-bg/70" : "text-room-muted"}`}>
        {formatTime(playing || currentTime ? currentTime : duration)}
      </span>
    </div>
  );
}
