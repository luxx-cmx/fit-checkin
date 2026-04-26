'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageHeader from '@/components/PageHeader'

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('syj_token') || ''}` })

export default function FriendsPage() {
    const [friends, setFriends] = useState([])
    const [users, setUsers] = useState([])
    const [q, setQ] = useState('')
    const load = () => fetch('/api/social/friends', { headers: authHeader() }).then(r => r.json()).then(d => setFriends(d.data?.friends || [])).catch(() => { })
    useEffect(() => { void load() }, [])
    const search = () => q.trim() && fetch(`/api/social/friends?q=${encodeURIComponent(q.trim())}`, { headers: authHeader() }).then(r => r.json()).then(d => setUsers(d.data?.users || [])).catch(() => { })
    const post = async (body, ok = '操作成功') => { await fetch('/api/social/friends', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(body) }); toast.success(ok); load() }
    return <div className="p-4 space-y-4"><PageHeader title="好友管理" subtitle="搜索账号添加，支持家人/朋友/同事分组" fallbackHref="/social" /><div className="bg-white rounded-3xl p-4 shadow-sm flex gap-2"><input value={q} onChange={e => setQ(e.target.value)} placeholder="输入账号或昵称" className="flex-1 px-4 py-3 bg-gray-50 rounded-2xl text-sm outline-none" /><button onClick={search} className="px-4 rounded-2xl bg-emerald-400 text-white text-sm font-semibold">搜索</button></div>{users.length > 0 && <div className="bg-white rounded-3xl p-4 shadow-sm space-y-3"><h3 className="font-semibold text-gray-700">搜索结果</h3>{users.map(u => <div key={u.id} className="flex items-center justify-between"><div><p className="font-medium text-gray-700">{u.nickname}</p><p className="text-xs text-gray-400">@{u.username}</p></div><button onClick={() => post({ action: 'add', friend_user_id: u.id }, '好友已添加')} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm">添加</button></div>)}</div>}<div className="bg-white rounded-3xl p-4 shadow-sm space-y-3"><h3 className="font-semibold text-gray-700">我的好友</h3>{friends.length ? friends.map(f => <div key={f.id} className="flex items-center justify-between border-b border-gray-50 last:border-0 pb-3 last:pb-0"><div><p className="font-medium text-gray-700">{f.nickname || f.username || f.id}</p><p className="text-xs text-gray-400">{f.group_name} · {f.blocked ? '已拉黑' : f.status}</p></div><div className="flex gap-2"><select value={f.group_name || '朋友'} onChange={e => post({ action: 'group', friend_user_id: f.id, group_name: e.target.value }, '分组已更新')} className="text-xs bg-gray-50 rounded-xl px-2"><option>家人</option><option>朋友</option><option>同事</option></select><button onClick={() => post({ action: 'block', friend_user_id: f.id }, '已拉黑')} className="text-xs text-orange-500">拉黑</button><button onClick={() => post({ action: 'delete', friend_user_id: f.id }, '已删除')} className="text-xs text-red-500">删除</button></div></div>) : <p className="text-sm text-gray-400 text-center py-6">暂无好友，先搜索账号添加吧</p>}</div></div>
}
