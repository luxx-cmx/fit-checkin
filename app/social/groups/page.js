'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageHeader from '@/components/PageHeader'

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('syj_token') || ''}` })

export default function GroupsPage() {
    const [groups, setGroups] = useState([])
    const [name, setName] = useState('我的监督小组')
    const [code, setCode] = useState('')
    const load = () => fetch('/api/social/groups', { headers: authHeader() }).then(r => r.json()).then(d => setGroups(d.data?.groups || [])).catch(() => { })
    useEffect(() => { void load() }, [])
    const post = async (body, ok) => { await fetch('/api/social/groups', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(body) }); toast.success(ok); load() }
    return <div className="p-4 space-y-4"><PageHeader title="多人监督小组" subtitle="2-5人共同目标、进度共享和排行榜" fallbackHref="/social" /><div className="bg-white rounded-3xl p-4 shadow-sm space-y-3"><input value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-sm outline-none" /><button onClick={() => post({ action: 'create', name, goal_type: 'checkin', target_value: 7 }, '小组已创建')} className="w-full py-3 rounded-2xl bg-emerald-400 text-white font-semibold">创建小组</button><div className="flex gap-2"><input value={code} onChange={e => setCode(e.target.value)} placeholder="输入邀请码加入" className="flex-1 px-4 py-3 bg-gray-50 rounded-2xl text-sm outline-none" /><button onClick={() => post({ action: 'join', invite_code: code }, '已加入小组')} className="px-4 rounded-2xl bg-emerald-50 text-emerald-600 text-sm font-semibold">加入</button></div></div>{groups.map(g => <div key={g.id} className="bg-white rounded-3xl p-4 shadow-sm space-y-3"><div className="flex justify-between"><div><h3 className="font-semibold text-gray-700">{g.name}</h3><p className="text-xs text-gray-400">邀请码 {g.invite_code} · {g.member_count}/{g.max_members}人</p></div><button onClick={() => post({ action: 'leave', group_id: g.id }, '已退出')} className="text-xs text-red-500">退出</button></div><div className="bg-emerald-50 rounded-2xl p-3"><p className="text-sm text-emerald-700">共同目标：7天打卡 · 温和提醒已开启</p></div><div><p className="font-medium text-gray-700 mb-2">本周排行榜</p>{g.ranking?.map((r, i) => <div key={r.user_id} className="flex justify-between text-sm py-1"><span>{i + 1}. {r.nickname}</span><span className="text-emerald-600 font-semibold">{r.checkin_days}天</span></div>)}</div></div>)}</div>
}
