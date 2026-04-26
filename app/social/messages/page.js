'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageHeader from '@/components/PageHeader'

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('syj_token') || ''}` })

export default function MessagesPage() {
    const [friends, setFriends] = useState([])
    const [notifications, setNotifications] = useState([])
    const [active, setActive] = useState('')
    const [messages, setMessages] = useState([])
    const [text, setText] = useState('')
    const loadBase = () => {
        fetch('/api/social/friends', { headers: authHeader() }).then(r => r.json()).then(d => setFriends((d.data?.friends || []).filter(f => f.status === 'accepted' && !f.blocked))).catch(() => { })
        fetch('/api/social/messages', { headers: authHeader() }).then(r => r.json()).then(d => setNotifications(d.data?.notifications || [])).catch(() => { })
    }
    const loadChat = (id) => {
        setActive(id)
        fetch(`/api/social/messages?friend_id=${id}`, { headers: authHeader() }).then(r => r.json()).then(d => setMessages(d.data?.messages || [])).catch(() => { })
    }
    useEffect(() => { void loadBase() }, [])
    const send = async () => {
        if (!active) return toast.error('请选择好友')
        if (!text.trim()) return toast.error('请输入消息')
        await fetch('/api/social/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify({ receiver_id: active, content: text }) })
        setText('')
        toast.success('已发送')
        loadChat(active)
    }
    const markRead = async () => {
        await fetch('/api/social/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify({ action: 'read_notifications' }) })
        toast.success('已全部标记为已读')
        loadBase()
    }
    return <div className="p-4 space-y-4"><PageHeader title="消息中心" subtitle="私信、点赞评论、好友互动提醒" fallbackHref="/social" action={<button onClick={markRead} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-semibold">已读</button>} /><div className="bg-white rounded-3xl p-4 shadow-sm"><h3 className="font-semibold text-gray-700 mb-3">互动提醒</h3>{notifications.length ? notifications.slice(0, 5).map(n => <div key={n.id} className="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0"><span className={n.is_read ? 'text-gray-400' : 'text-gray-700'}>{n.content}</span><span className="text-xs text-gray-400">{n.type}</span></div>) : <p className="text-sm text-gray-400 text-center py-4">暂无提醒</p>}</div><div className="bg-white rounded-3xl p-4 shadow-sm"><h3 className="font-semibold text-gray-700 mb-3">好友私信</h3><div className="flex gap-2 overflow-x-auto pb-2">{friends.map(f => <button key={f.id} onClick={() => loadChat(f.id)} className={`px-3 py-2 rounded-xl text-sm whitespace-nowrap ${active === f.id ? 'bg-emerald-400 text-white' : 'bg-gray-50 text-gray-500'}`}>{f.nickname || f.username || f.id}</button>)}</div><div className="min-h-32 bg-gray-50 rounded-2xl p-3 mt-3 space-y-2">{messages.length ? messages.map(m => <p key={m.id} className={`text-sm ${m.sender_id === active ? 'text-left' : 'text-right'}`}><span className="inline-block px-3 py-2 rounded-2xl bg-white text-gray-600">{m.content}</span></p>) : <p className="text-sm text-gray-400 text-center py-8">选择好友开始聊天</p>}</div><div className="flex gap-2 mt-3"><input value={text} onChange={e => setText(e.target.value)} placeholder="输入私信内容" className="flex-1 px-4 py-3 bg-gray-50 rounded-2xl text-sm outline-none" /><button onClick={send} className="px-4 rounded-2xl bg-emerald-400 text-white text-sm font-semibold">发送</button></div></div></div>
}
