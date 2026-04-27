'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import PageHeader from '@/components/PageHeader'
import { getDietRecords, getHealthRecords, getWeightRecords } from '@/lib/store'

const modules = [
    { href: '/social/friends', icon: '👥', title: '好友管理', desc: '搜索账号、添加好友、分组、拉黑' },
    { href: '/social/feed', icon: '📰', title: '好友动态', desc: '公开记录、点赞、评论、@好友' },
    { href: '/social/messages', icon: '💬', title: '消息中心', desc: '互动提醒、私信、一键已读' },
    { href: '/social/groups', icon: '🤝', title: '监督小组', desc: '2-5人小组、共同目标、排行榜' },
    { href: '/social/games', icon: '🎮', title: '游戏化激励', desc: '等级、积分、成就、挑战赛' },
]

export default function SocialPage() {
    const [data, setData] = useState({ level: { level: 1, exp: 0 }, points: 0, achievements: [], badges: [] })
    const [localDays, setLocalDays] = useState(0)
    useEffect(() => {
        const days = new Set([...getDietRecords(), ...getWeightRecords(), ...getHealthRecords()].map(r => r.date).filter(Boolean)).size
        setLocalDays(days)
        const token = localStorage.getItem('syj_token')
        if (token) fetch('/api/social/gamification', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { if (d.data) setData(d.data) }).catch(() => { })
        if (!localStorage.getItem('syj_social_visited')) {
            setTimeout(() => toast('🎉 添加好友一起打卡，更容易坚持哦~', { duration: 4000 }), 400)
            localStorage.setItem('syj_social_visited', '1')
        }
    }, [])
    return <div className="p-4 space-y-4"><PageHeader title="社交与挑战" subtitle="好友互动、监督小组、积分徽章与趣味挑战" /><div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl p-5 text-white shadow-lg"><p className="text-sm text-emerald-50">当前成长</p><div className="flex items-end justify-between mt-2"><p className="text-4xl font-bold">Lv.{data.level.level}</p><p className="text-lg font-semibold">{data.points} 积分</p></div><p className="text-sm text-emerald-50 mt-2">累计打卡 {localDays} 天 · 已解锁 {data.badges.length} 个徽章</p></div><div className="space-y-3">{modules.map(m => <Link key={m.href} href={m.href} className="block bg-white rounded-3xl p-4 shadow-sm active:scale-95 transition-transform"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl shrink-0">{m.icon}</div><div className="flex-1 min-w-0"><h3 className="font-semibold text-gray-800">{m.title}</h3><p className="text-xs text-gray-400 mt-1 leading-5">{m.desc}</p></div><span className="text-gray-300">›</span></div></Link>)}</div><div className="bg-white rounded-3xl p-4 shadow-sm"><h3 className="font-semibold text-gray-700 mb-3">已落地能力</h3><div className="grid grid-cols-2 gap-2 text-xs text-gray-500"><span>✅ 隐私可见范围</span><span>✅ 点赞评论</span><span>✅ 私信消息</span><span>✅ 等级积分服务端计算</span><span>✅ 小组排行榜</span><span>✅ 挑战赛/猜热量</span></div></div></div>
}
