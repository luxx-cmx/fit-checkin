'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/AppDialog'
import { clearAuth, getUser } from '@/lib/auth-client'
import { getDietRecords, getHealthRecords, getProfile, getWeightRecords } from '@/lib/store'

function StatCard({ label, value, unit, accent = 'text-emerald-600' }) {
    return (
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <p className={`text-xl font-bold ${accent}`}>
                {value}
                <span className="text-xs text-gray-400 ml-1">{unit}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
        </div>
    )
}

function EntryCard({ href, icon, title, desc }) {
    return (
        <Link href={href} className="block bg-white border-b border-gray-100 last:border-0 active:bg-gray-50 transition-colors">
            <div className="h-11 px-4 flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center text-xl text-emerald-600 shrink-0">{icon}</span>
                <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-800">{title}</span>
                    {desc && <span className="block text-[11px] text-gray-400 truncate">{desc}</span>}
                </span>
                <span className="text-gray-300">›</span>
            </div>
        </Link>
    )
}

export default function ProfilePage() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState({})
    const [stats, setStats] = useState({ recordDays: 0, avgCalorie: 0, weightChange: '0.0' })
    const [logoutOpen, setLogoutOpen] = useState(false)

    useEffect(() => {
        const profileData = getProfile()
        const diet = getDietRecords()
        const weight = getWeightRecords()
        const health = getHealthRecords()
        const days = new Set([...diet, ...weight, ...health].map((row) => row.date).filter(Boolean))
        const totalCalories = diet.reduce((sum, row) => sum + (Number(row.calories) || 0), 0)
        const firstWeight = weight[weight.length - 1]?.weight
        const latestWeight = weight[0]?.weight
        const weightChange = firstWeight && latestWeight ? (Number(latestWeight) - Number(firstWeight)).toFixed(1) : '0.0'

        setProfile(profileData)
        setUser(getUser())
        setStats({
            recordDays: days.size,
            avgCalorie: days.size ? Math.round(totalCalories / days.size) : 0,
            weightChange,
        })
    }, [])

    const displayName = profile.nickname || profile.name || user?.username || '食愈记用户'
    const weightAccent = Number(stats.weightChange) <= 0 ? 'text-emerald-600' : 'text-amber-500'
    const weightValue = Number(stats.weightChange) > 0 ? `+${stats.weightChange}` : stats.weightChange
    const goalType = profile.goalType === 'muscle_gain' ? '增肌' : profile.goalType === 'maintain' ? '维持' : '减脂'
    const handleLogout = () => {
        clearAuth()
        toast.success('已退出登录')
        router.replace('/login')
    }

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="h-11 flex items-center justify-center md:justify-start">
                <h1 className="text-lg font-bold text-gray-800">我的</h1>
            </div>

            <div className="bg-emerald-50 rounded-xl p-4 min-h-[100px] shadow-sm border border-emerald-100">
                <div className="flex items-center gap-4">
                    <div className="w-[60px] h-[60px] rounded-full bg-white flex items-center justify-center text-4xl overflow-hidden shadow-sm shrink-0">
                        {profile.avatar ? <img src={profile.avatar} alt="头像" className="w-full h-full object-cover" /> : profile.gender === '女' ? '👩' : '👨'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-gray-800 truncate">{displayName}</p>
                        <p className="text-sm text-gray-500 mt-1 truncate">目标：{goalType} · {profile.targetWeight || '--'}kg</p>
                    </div>
                    <Link href="/profile/info" className="h-9 px-3 rounded-lg bg-white text-sm font-semibold text-emerald-600 flex items-center shadow-sm">
                        编辑
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <StatCard label="记录天数" value={stats.recordDays} unit="天" />
                <StatCard label="平均热量" value={stats.avgCalorie} unit="kcal" />
                <StatCard label="体重变化" value={weightValue} unit="kg" accent={weightAccent} />
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
                <EntryCard href="/profile/info" icon="👤" title="个人信息编辑" desc="昵称、头像、基础资料" />
                <EntryCard href="/goals" icon="🎯" title="目标设置" desc="减脂、维持、增肌目标" />
                <EntryCard href="/profile/settings" icon="🔒" title="隐私与设置" desc="提醒、皮肤、授权、帮助" />
            </div>

            <button onClick={() => setLogoutOpen(true)} className="w-full h-11 text-sm font-semibold text-red-500 active:scale-95 transition-transform">退出登录</button>
            <ConfirmDialog open={logoutOpen} title="确认退出登录？" message="退出后会清除当前登录状态。" confirmText="退出" danger onConfirm={handleLogout} onClose={() => setLogoutOpen(false)} />
        </div>
    )
}
