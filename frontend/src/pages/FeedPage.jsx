import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, MessageCircle, ImagePlus, Send, Trash2, Loader2, Sparkles, Search } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import MoaazAI from '../components/MoaazAI.jsx';

function PostCard({ post, myId, onLike, onDelete, onComment }) {
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const authorId = post.author?._id;
  const mine = authorId === myId;
  return <article className="bg-room-panel border border-room-border rounded-2xl overflow-hidden shadow-sm">
    <header className="p-4 flex items-center gap-3">
      <div className="h-11 w-11 rounded-full bg-room-cream2 overflow-hidden flex items-center justify-center text-room-gold font-bold">{post.author?.avatar ? <img src={post.author.avatar} alt="" className="w-full h-full object-cover"/> : post.author?.name?.slice(0,1)}</div>
      <div className="min-w-0 flex-1"><Link to={`/profile/${authorId}`} className="font-bold text-room-text truncate hover:text-room-gold">{post.author?.name || 'مستخدم'}</Link><p className="text-xs text-room-muted">{new Date(post.createdAt).toLocaleString('ar')}</p></div>
      {mine && <button onClick={() => onDelete(post._id)} aria-label="حذف المنشور" className="p-2 text-room-muted hover:text-red-500"><Trash2 size={17}/></button>}
    </header>
    {post.text && <p className="px-4 pb-4 text-room-text whitespace-pre-wrap break-words leading-7">{post.text}</p>}
    {post.mediaUrl && (post.mediaType === 'video' ? <video src={post.mediaUrl} controls className="w-full max-h-[560px] bg-black"/> : <img src={post.mediaUrl} alt="مرفق المنشور" className="w-full max-h-[560px] object-contain bg-room-cream2"/>)}
    <div className="px-4 py-3 flex items-center justify-between text-xs text-room-muted border-b border-room-border"><span>{post.likes?.length || 0} إعجاب</span><button onClick={() => setShowComments(v => !v)}>{post.comments?.length || 0} تعليق</button></div>
    <div className="px-3 py-2 flex gap-2"><button onClick={() => onLike(post._id)} className={`flex-1 rounded-xl py-2 flex justify-center items-center gap-2 text-sm ${post.liked ? 'text-rose-500' : 'text-room-muted hover:bg-room-cream2'}`}><Heart size={18} fill={post.liked ? 'currentColor' : 'none'}/> إعجاب</button><button onClick={() => setShowComments(v => !v)} className="flex-1 rounded-xl py-2 flex justify-center items-center gap-2 text-sm text-room-muted hover:bg-room-cream2"><MessageCircle size={18}/> تعليق</button></div>
    {showComments && <div className="p-3 border-t border-room-border space-y-3">{(post.comments || []).map(c => <div key={c._id} className="flex gap-2 text-sm"><span className="font-bold text-room-text shrink-0">{c.user?.name || 'مستخدم'}</span><span className="text-room-muted break-words">{c.text}</span></div>)}<form onSubmit={async e => { e.preventDefault(); if (!comment.trim()) return; await onComment(post._id, comment); setComment(''); }} className="flex gap-2"><input value={comment} onChange={e => setComment(e.target.value)} maxLength={1200} placeholder="اكتب تعليقاً..." className="flex-1 min-w-0 rounded-full bg-room-cream2 px-4 py-2 text-sm text-room-text outline-none"/><button className="p-2 rounded-full bg-room-gold text-room-panel" aria-label="إرسال التعليق"><Send size={17}/></button></form></div>}
  </article>;
}

export default function FeedPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [searching, setSearching] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef(null);
  const load = async () => { try { const { data } = await api.get('/posts/feed'); setPosts(data); } catch { showToast('تعذر تحميل المنشورات'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const publish = async e => { e.preventDefault(); if (!text.trim() && !file) return; const form = new FormData(); form.append('text', text); if (file) form.append('file', file); setPosting(true); try { const { data } = await api.post('/posts', form); setPosts(prev => [data, ...prev]); setText(''); setFile(null); if (fileRef.current) fileRef.current.value = ''; showToast('تم نشر المنشور'); } catch (err) { showToast(err.response?.data?.message || 'فشل النشر'); } finally { setPosting(false); } };
  const like = async id => { try { const { data } = await api.post(`/posts/${id}/like`); setPosts(prev => prev.map(p => p._id === id ? { ...p, liked: data.liked, likes: Array(data.likesCount).fill(null) } : p)); } catch { showToast('تعذر تسجيل الإعجاب'); } };
  const comment = async (id, value) => { try { const { data } = await api.post(`/posts/${id}/comments`, { text: value }); setPosts(prev => prev.map(p => p._id === id ? { ...p, comments: [...p.comments, data] } : p)); } catch { showToast('تعذر إضافة التعليق'); } };
  const remove = async id => { if (!window.confirm('هل تريد حذف هذا المنشور؟')) return; try { await api.delete(`/posts/${id}`); setPosts(prev => prev.filter(p => p._id !== id)); } catch { showToast('تعذر حذف المنشور'); } };
  const follow = async (id, next) => { try { if (next) await api.put(`/users/${id}/follow`); else await api.delete(`/users/${id}/follow`); return true; } catch { showToast('تعذر تحديث المتابعة'); return false; } };
  const searchPeople = async (e) => { e.preventDefault(); if (!query.trim()) return setPeople([]); setSearching(true); try { const { data } = await api.get('/users/search', { params: { q: query.trim() } }); setPeople(data); } catch { showToast('تعذر البحث عن المستخدمين'); } finally { setSearching(false); } };
  return <main dir="rtl" className="min-h-screen-safe bg-room-bg text-room-text">
    <header className="sticky top-0 z-30 bg-room-panel/95 backdrop-blur border-b border-room-border px-4 py-3 flex items-center gap-3"><Link to="/chat" className="p-2 rounded-full hover:bg-room-cream2"><ArrowRight size={20}/></Link><div className="flex-1"><h1 className="font-display text-xl font-bold">Moaaz Social</h1><p className="text-xs text-room-muted">آخر المنشورات من مجتمعك</p></div><Link to="/chat" className="text-sm text-room-gold">المحادثات</Link></header>
    <div className="max-w-2xl mx-auto px-3 py-5 space-y-4">
      <form onSubmit={searchPeople} className="flex gap-2"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن أشخاص بالاسم أو البريد..." className="flex-1 min-w-0 rounded-full bg-room-panel border border-room-border px-4 py-3 text-sm text-room-text outline-none"/><button disabled={searching || !query.trim()} className="rounded-full bg-room-gold text-room-panel px-4"><Search size={18}/></button></form>
      {people.length > 0 && <div className="bg-room-panel border border-room-border rounded-2xl p-3 space-y-2">{people.map(person => <div key={person._id} className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-room-cream2 overflow-hidden flex items-center justify-center">{person.avatar ? <img src={person.avatar} alt="" className="w-full h-full object-cover"/> : person.name?.slice(0,1)}</div><Link to={`/profile/${person._id}`} className="flex-1 text-sm font-semibold text-room-text">{person.name}</Link><button onClick={async () => { const next = !person.isFollowing; const ok = await follow(person._id, next); if (ok) setPeople(prev => prev.map(p => p._id === person._id ? { ...p, isFollowing: next } : p)); }} className="text-xs rounded-full border border-room-border px-3 py-2 text-room-gold">{person.isFollowing ? 'إلغاء المتابعة' : 'متابعة'}</button></div>)}</div>}
      <form onSubmit={publish} className="bg-room-panel border border-room-border rounded-2xl p-4 space-y-3"><div className="flex gap-3 items-start"><div className="h-10 w-10 rounded-full bg-room-cream2 overflow-hidden flex items-center justify-center">{user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover"/> : user?.name?.slice(0,1)}</div><textarea value={text} onChange={e => setText(e.target.value)} maxLength={5000} rows={3} placeholder="ما الذي تود مشاركته اليوم؟" className="flex-1 resize-y bg-room-cream2 rounded-xl p-3 text-sm outline-none text-room-text"/></div>
        {file && <div className="text-xs text-room-muted flex items-center justify-between">{file.name}<button type="button" onClick={() => { setFile(null); fileRef.current.value = ''; }} className="text-red-500">إزالة</button></div>}
        <div className="flex items-center justify-between border-t border-room-border pt-3"><button type="button" onClick={() => fileRef.current?.click()} className="text-sm text-room-muted flex items-center gap-2"><ImagePlus size={18}/> صورة أو فيديو</button><input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)}/><button disabled={posting || (!text.trim() && !file)} className="rounded-full bg-room-gold text-room-panel px-5 py-2 text-sm font-bold disabled:opacity-50 flex items-center gap-2">{posting && <Loader2 size={15} className="animate-spin"/>} نشر</button></div>
      </form>
      {loading ? <div className="text-center py-12 text-room-muted"><Loader2 className="animate-spin mx-auto"/></div> : posts.length ? posts.map(post => <PostCard key={post._id} post={post} myId={user?.id || user?._id} onLike={like} onDelete={remove} onComment={comment}/>) : <div className="text-center bg-room-panel rounded-2xl p-10 border border-room-border"><Sparkles className="mx-auto text-room-gold" size={30}/><p className="font-bold mt-3">مرحباً بك في مجتمع Moaaz Social</p><p className="text-sm text-room-muted mt-1">ابدأ بنشر أول منشور أو تابع أشخاصاً لتظهر منشوراتهم هنا.</p></div>}
    </div>
    <MoaazAI context="المستخدم في صفحة التغذية الاجتماعية Moaaz Social. ساعده في كتابة منشور أو تحسينه أو فهم نص يشاركه."/>
  </main>;
}
