import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const meId = user?.id || user?._id;
  const { showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([api.get(`/users/${userId}/profile`), api.get(`/posts/user/${userId}`)]).then(([p, ps]) => { if (active) { setProfile(p.data); setPosts(ps.data); } }).catch(() => showToast('تعذر تحميل الملف الشخصي'));
    return () => { active = false; };
  }, [userId]);
  const toggleFollow = async () => { setBusy(true); try { if (profile.isFollowing) await api.delete(`/users/${userId}/follow`); else await api.put(`/users/${userId}/follow`); setProfile(p => ({ ...p, isFollowing: !p.isFollowing, followersCount: Math.max(0, (p.followersCount || 0) + (p.isFollowing ? -1 : 1)) })); } catch { showToast('تعذر تحديث المتابعة'); } finally { setBusy(false); } };
  if (!profile) return <div className="min-h-screen-safe bg-room-bg flex items-center justify-center text-room-muted"><Loader2 className="animate-spin"/></div>;
  const mine = meId === userId;
  return <main dir="rtl" className="min-h-screen-safe bg-room-bg text-room-text"><header className="sticky top-0 bg-room-panel border-b border-room-border p-3 flex items-center gap-3"><Link to="/feed" className="p-2"><ArrowRight/></Link><b>الملف الشخصي</b></header><div className="max-w-2xl mx-auto p-4 space-y-4"><section className="bg-room-panel border border-room-border rounded-2xl p-6 text-center"><div className="w-24 h-24 mx-auto rounded-full bg-room-cream2 overflow-hidden flex items-center justify-center text-3xl text-room-gold">{profile.avatar ? <img src={profile.avatar} alt="" className="w-full h-full object-cover"/> : profile.name?.slice(0,1)}</div><h1 className="font-bold text-xl mt-3">{profile.name}</h1><p className="text-sm text-room-muted mt-1">{profile.bio || 'لم تتم إضافة نبذة بعد.'}</p><div className="flex justify-center gap-8 text-sm my-4"><span><b>{profile.followersCount || 0}</b> متابع</span><span><b>{profile.followingCount || 0}</b> يتابع</span><span><b>{posts.length}</b> منشور</span></div>{!mine && <button disabled={busy} onClick={toggleFollow} className="rounded-full bg-room-gold text-room-panel px-5 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50">{profile.isFollowing ? <UserCheck size={16}/> : <UserPlus size={16}/>} {profile.isFollowing ? 'إلغاء المتابعة' : 'متابعة'}</button>}</section><h2 className="font-bold">المنشورات</h2>{posts.map(post => <article key={post._id} className="bg-room-panel border border-room-border rounded-2xl p-4 space-y-3">{post.text && <p className="whitespace-pre-wrap">{post.text}</p>}{post.mediaUrl && (post.mediaType === 'video' ? <video src={post.mediaUrl} controls className="w-full rounded-xl"/> : <img src={post.mediaUrl} alt="" className="w-full rounded-xl object-contain max-h-[520px]"/>)}<p className="text-xs text-room-muted">{post.likes?.length || 0} إعجاب · {post.comments?.length || 0} تعليق</p></article>)}</div></main>;
}
