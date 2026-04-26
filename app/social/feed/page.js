'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { InputDialog } from '@/components/AppDialog'
import PageHeader from '@/components/PageHeader'

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('syj_token') || ''}` })

export default function FeedPage() {
    const [posts, setPosts] = useState([])
    const [content, setContent] = useState('')
    const [target, setTarget] = useState('friends')
    const [hidden, setHidden] = useState(false)
    const [commentPostId, setCommentPostId] = useState(null)
    const [commentValue, setCommentValue] = useState('')
    const load = () => fetch('/api/social/feed', { headers: authHeader() }).then(r => r.json()).then(d => setPosts(d.data?.posts || [])).catch(() => { })
    useEffect(() => { void load() }, [])
    const publish = async () => { if (!content.trim()) return toast.error('请输入动态内容'); await fetch('/api/social/feed', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify({ content, target_type: target, detail_hidden: hidden }) }); setContent(''); toast.success('动态已发布'); load() }
    const act = async (body) => { await fetch('/api/social/feed', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(body) }); load() }
    const submitComment = async () => {
        if (!commentPostId) return
        if (!commentValue.trim()) return toast.error('请输入评论内容')
        await act({ action: 'comment', post_id: commentPostId, content: commentValue.trim() })
        setCommentPostId(null)
        setCommentValue('')
    }
    return <div className="p-4 space-y-4"><PageHeader title="好友动态" subtitle="公开记录、仅展示数据、点赞评论互动" fallbackHref="/social" /><div className="bg-white rounded-3xl p-4 shadow-sm space-y-3"><textarea value={content} onChange={e => setContent(e.target.value)} placeholder="分享今天的健康记录..." className="w-full min-h-24 px-4 py-3 bg-gray-50 rounded-2xl text-sm outline-none" /><div className="flex items-center justify-between"><div className="flex gap-2 text-xs"><select value={target} onChange={e => setTarget(e.target.value)} className="bg-gray-50 rounded-xl px-2 py-2"><option value="friends">好友可见</option><option value="public">全部可见</option><option value="private">仅自己</option></select><label className="flex items-center gap-1 text-gray-500"><input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)} />隐藏详情</label></div><button onClick={publish} className="px-4 py-2 rounded-xl bg-emerald-400 text-white text-sm font-semibold">发布</button></div></div>{posts.map(p => <div key={p.id} className="bg-white rounded-3xl p-4 shadow-sm space-y-3"><div><p className="font-semibold text-gray-700">{p.nickname}</p><p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString()} · {p.target_type === 'public' ? '公开' : p.target_type === 'private' ? '仅自己' : '好友可见'}{p.detail_hidden ? ' · 已隐藏详情' : ''}</p></div><p className="text-sm text-gray-600 leading-6">{p.content || '分享了一条健康动态'}</p><div className="flex gap-4 text-sm text-gray-500"><button onClick={() => act({ action: p.liked ? 'unlike' : 'like', post_id: p.id })}>👍 {p.like_count}</button><button onClick={() => { setCommentPostId(p.id); setCommentValue('') }}>💬 评论</button></div>{p.comments?.length ? <div className="bg-gray-50 rounded-2xl p-3 space-y-1">{p.comments.slice(0, 3).map(c => <p key={c.id} className="text-xs text-gray-500"><span className="font-semibold text-gray-700">{c.nickname}：</span>{c.content}</p>)}</div> : null}</div>)}<InputDialog open={Boolean(commentPostId)} title="发表评论" message="支持直接输入评论内容，后续可扩展 @好友。" value={commentValue} placeholder="写下评论内容" confirmText="发送" onChange={setCommentValue} onConfirm={submitComment} onClose={() => { setCommentPostId(null); setCommentValue('') }} /></div>
}
