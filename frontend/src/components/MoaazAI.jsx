import { useEffect, useRef, useState } from 'react';
import { Bot, X, Send, Sparkles, Loader2, Minus, Paperclip, Image as ImageIcon, Grip } from 'lucide-react';
import api from '../utils/api';

const QUICK_ACTIONS = [
  { label: 'اكتب منشوراً', prompt: 'ساعدني في كتابة منشور جذاب. اسألني سؤالاً واحداً في كل مرة حتى تفهم الفكرة والجمهور والنبرة.' },
  { label: 'حسّن صياغتي', prompt: 'سأرسل لك نصاً؛ حسّن صياغته مع الحفاظ على المعنى ونبرة الكاتب.' },
  { label: 'اقترح رداً', prompt: 'ساعدني في صياغة رد مناسب ومحترم على الرسالة أو النص الذي سأرسله.' },
  { label: 'لخّص النص', prompt: 'لخّص النص الذي سأرسله في نقاط واضحة.' },
];

async function imageToDataUrl(file) {
  if (!file.type.startsWith('image/')) throw new Error('يمكن إرفاق الصور فقط للمساعد حالياً.');
  if (file.size > 12 * 1024 * 1024) throw new Error('حجم الصورة كبير؛ اختر صورة أقل من 12 ميجابايت.');
  const source = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  const img = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = source; });
  const scale = Math.min(1, 1500 / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.78);
}

export default function MoaazAI({ context = '', conversation = [] }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [image, setImage] = useState(null);
  const [includeConversation, setIncludeConversation] = useState(false);
  const [position, setPosition] = useState(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy, open, minimized]);
  useEffect(() => {
    const move = (event) => { if (!dragRef.current) return; const d = dragRef.current; setPosition({ left: Math.max(8, Math.min(window.innerWidth - d.width - 8, d.left + event.clientX - d.x)), top: Math.max(8, Math.min(window.innerHeight - d.height - 8, d.top + event.clientY - d.y)) }); };
    const stop = () => { dragRef.current = null; };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
  }, []);
  const startDrag = (event) => { if (event.target.closest('button')) return; const rect = event.currentTarget.closest('section').getBoundingClientRect(); dragRef.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height }; };

  const send = async (text = input) => {
    const value = text.trim();
    if ((!value && !image) || busy) return;
    const content = [];
    if (value) content.push({ type: 'text', text: value });
    if (image) content.push({ type: 'image_url', image_url: { url: image.dataUrl } });
    const next = [...messages, { role: 'user', content, displayText: value || 'يرجى تحليل الصورة المرفقة' }];
    setMessages(next); setInput(''); setImage(null); setError(''); setBusy(true);
    try {
      const history = next.slice(-12);
      const latestImageIndex = history.map((item) => Array.isArray(item.content) && item.content.some((part) => part.type === 'image_url')).lastIndexOf(true);
      const payloadMessages = history.map(({ role, content: body }, index) => ({
        role,
        content: Array.isArray(body) && index !== latestImageIndex
          ? body.filter((part) => part.type !== 'image_url').concat(body.some((part) => part.type === 'image_url') ? [{ type: 'text', text: '[تم إرفاق صورة سابقة في المحادثة]' }] : [])
          : body,
      }));
      const conversationText = includeConversation && conversation.length ? `\n\nآخر الرسائل التي اختار المستخدم مشاركتها من محادثته:\n${conversation.map(m => `${m.sender}: ${m.text}`).join('\n')}` : '';
      const { data } = await api.post('/ai/chat', { messages: payloadMessages, context: `${context}${conversationText}` });
      setMessages(current => [...current, { role: 'assistant', content: data.reply, displayText: data.reply }]);
    } catch (err) { setError(err.response?.data?.message || 'تعذر الاتصال بالمساعد. حاول مجدداً.'); }
    finally { setBusy(false); }
  };

  return <>
    <button type="button" onClick={() => { setOpen(true); setMinimized(false); }} aria-label="افتح Moaaz AI" className="fixed bottom-24 left-4 sm:left-5 z-[70] h-12 w-12 rounded-2xl bg-room-gold text-room-panel shadow-lg flex items-center justify-center hover:scale-105 transition-transform border border-white/70" title="افتح المساعد الذكي"><Bot size={23}/></button>
    {open && !minimized && <section dir="rtl" aria-label="محادثة Moaaz AI" style={position ? { left: position.left, top: position.top, right: 'auto', bottom: 'auto' } : undefined} className="fixed z-[80] bottom-24 left-3 right-3 sm:left-5 sm:right-auto w-auto sm:w-[380px] h-[min(590px,calc(100dvh-150px))] bg-room-panel border border-room-border shadow-2xl rounded-2xl flex flex-col overflow-hidden">
      <header onPointerDown={startDrag} className="cursor-grab active:cursor-grabbing flex items-center gap-3 p-3 bg-room-cream2 border-b border-room-border touch-none"><div className="h-10 w-10 rounded-full bg-room-gold text-room-panel flex items-center justify-center"><Bot size={23}/></div><div className="flex-1"><h2 className="font-bold text-room-text">Moaaz AI</h2><p className="text-xs text-room-muted">مساعدك الذكي — اسحب العنوان لتحريك النافذة</p></div><Grip size={16} className="text-room-muted"/><button onClick={() => setMinimized(true)} aria-label="تصغير" className="p-2 text-room-muted"><Minus size={18}/></button><button onClick={() => setOpen(false)} aria-label="إغلاق" className="p-2 text-room-muted"><X size={18}/></button></header>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && <div className="text-center py-5"><Sparkles className="mx-auto text-room-gold mb-2" size={28}/><p className="font-semibold text-room-text">مرحباً! أنا Moaaz AI</p><p className="text-sm text-room-muted mt-1">يمكنك إرسال نص أو صورة لفهمها ومساعدتك.</p><div className="grid grid-cols-2 gap-2 mt-5">{QUICK_ACTIONS.map(item => <button key={item.label} onClick={() => send(item.prompt)} className="text-xs p-2 rounded-xl border border-room-border text-room-text hover:bg-room-cream2">{item.label}</button>)}</div></div>}
        {messages.map((message, index) => <div key={index} className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${message.role === 'user' ? 'mr-auto bg-room-gold text-room-panel' : 'ml-auto bg-room-cream2 text-room-text'}`}>{message.displayText || 'رسالة'}</div>)}
        {busy && <div className="ml-auto flex items-center gap-2 text-xs text-room-muted"><Loader2 size={15} className="animate-spin"/> Moaaz AI يفكر...</div>}
        {error && <div role="alert" className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{error}</div>}<div ref={endRef}/>
      </div>
      {conversation.length > 0 && <label className="px-3 py-2 border-t border-room-border text-xs text-room-muted flex items-center gap-2"><input type="checkbox" checked={includeConversation} onChange={e => setIncludeConversation(e.target.checked)}/> مشاركة آخر 10 رسائل نصية من المحادثة مع المساعد</label>}
      {image && <div className="px-3 py-2 flex items-center gap-2 text-xs text-room-muted"><ImageIcon size={16}/> صورة جاهزة للإرسال <button onClick={() => setImage(null)} className="text-red-500">إزالة</button></div>}
      <form onSubmit={e => { e.preventDefault(); send(); }} className="p-3 border-t border-room-border flex gap-2 items-center"><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { setImage({ dataUrl: await imageToDataUrl(file) }); setError(''); } catch (err) { setError(err.message || 'تعذر قراءة الصورة'); } e.target.value = ''; }}/><button type="button" onClick={() => fileRef.current?.click()} aria-label="إرفاق صورة" className="h-10 w-10 shrink-0 rounded-full border border-room-border text-room-muted flex items-center justify-center"><Paperclip size={17}/></button><input value={input} onChange={e => setInput(e.target.value)} maxLength={4000} placeholder="اكتب رسالتك للمساعد..." className="min-w-0 flex-1 rounded-full bg-room-cream2 border border-room-border px-4 py-2 text-sm text-room-text outline-none focus:ring-2 focus:ring-room-gold"/><button type="submit" disabled={busy || (!input.trim() && !image)} aria-label="إرسال" className="h-10 w-10 shrink-0 rounded-full bg-room-gold text-room-panel flex items-center justify-center disabled:opacity-50"><Send size={17}/></button></form>
    </section>}
    {open && minimized && <button onClick={() => setMinimized(false)} className="fixed bottom-24 left-5 z-[80] rounded-full bg-room-panel border border-room-border shadow-lg px-4 py-3 text-sm text-room-text flex items-center gap-2"><Bot size={18}/> متابعة Moaaz AI</button>}
  </>;
}
