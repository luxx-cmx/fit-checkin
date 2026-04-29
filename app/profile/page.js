'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/AppDialog'
import { clearAuth, getToken, getUser } from '@/lib/auth-client'
import { getDietRecords, getHealthRecords, getProfile, getSyncStatus, getWeightRecords, retryPendingSync } from '@/lib/store'

function StatCard({ label, value, unit, accent = 'text-emerald-600', href }) {
    const inner = (
        <div className="syj-card-solid p-3 active:scale-95 transition-transform">
            <p className={`text-xl font-black tracking-tight ${accent}`}>
                <span className="syj-num">{value}</span>
                <span className="text-xs text-gray-400 ml-1">{unit}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                {label}
                {href && <span className="text-gray-300">›</span>}
            </p>
        </div>
    )
    return href ? <Link href={href}>{inner}</Link> : inner
}

function EntryCard({ href, icon, title, desc }) {
    return (
        <Link href={href} className="block border-b border-gray-100 last:border-0 active:bg-gray-50 transition-colors">
            <div className="min-h-14 px-4 py-3 flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-xl text-emerald-600 shrink-0">{icon}</span>
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
    const [gamification, setGamification] = useState({ level: { level: 1, exp: 0 }, points: 0, achievements: [], badges: [] })
    const [syncStatus, setSyncStatus] = useState(() => getSyncStatus())
    const [manualSyncing, setManualSyncing] = useState(false)
    const [logoutOpen, setLogoutOpen] = useState(false)
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        try {
            const t = localStorage.getItem('syj_theme')
            const dark = t === 'dark' || (t == null && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
            setIsDark(!!dark)
        } catch { }
    }, [])
    const toggleTheme = () => {
        const next = !isDark
        setIsDark(next)
        try {
            localStorage.setItem('syj_theme', next ? 'dark' : 'light')
            document.documentElement.classList.toggle('dark', next)
        } catch { }
    }

    useEffect(() => {
        const refreshSyncStatus = () => setSyncStatus(getSyncStatus())
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
        refreshSyncStatus()
        const token = getToken()
        if (token) fetch('/api/social/gamification', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => { if (d.data) setGamification(d.data) }).catch(() => { })

        window.addEventListener('syj:sync-state', refreshSyncStatus)
        window.addEventListener('focus', refreshSyncStatus)
        return () => {
            window.removeEventListener('syj:sync-state', refreshSyncStatus)
            window.removeEventListener('focus', refreshSyncStatus)
        }
    }, [])

    const displayName = profile.nickname || profile.name || user?.username || '食愈记用户'
    const weightAccent = Number(stats.weightChange) <= 0 ? 'text-emerald-600' : 'text-amber-500'
    const weightValue = Number(stats.weightChange) > 0 ? `+${stats.weightChange}` : stats.weightChange
    const goalType = profile.goalType === 'muscle_gain' ? '增肌' : profile.goalType === 'maintain' ? '维持' : '减脂'
    const showSyncFailure = syncStatus.pendingCount > 0 || (syncStatus.lastFailureMessage && syncStatus.lastOperation !== 'delete')
    const syncBadgeClass = syncStatus.syncing
        ? 'bg-blue-50 text-blue-600'
        : syncStatus.pendingCount > 0
            ? 'bg-amber-50 text-amber-600'
            : 'bg-emerald-50 text-emerald-600'
    const syncBadgeText = syncStatus.syncing ? '同步中' : syncStatus.pendingCount > 0 ? '待补推' : '已同步'
    const syncDetailText = syncStatus.pendingCount > 0
        ? `饮食 ${syncStatus.pendingByTable.diet} 条 · 体重 ${syncStatus.pendingByTable.weight} 条 · 健康 ${syncStatus.pendingByTable.health} 条`
        : syncStatus.lastSuccessAt
            ? `最近成功时间：${new Date(syncStatus.lastSuccessAt).toLocaleString('zh-CN', { hour12: false })}`
            : '新增记录会自动推送到数据库'

    const handleManualSync = async () => {
        if (manualSyncing || syncStatus.pendingCount === 0) return
        setManualSyncing(true)
        try {
            const result = await retryPendingSync()
            setSyncStatus(getSyncStatus())
            if (result.ok) toast.success(result.count ? `已补推 ${result.count} 条新增记录` : '当前没有待补推记录')
            else toast.error(result.pendingCount ? `补推后仍有 ${result.pendingCount} 条记录待同步` : result.message || '补推失败，请稍后重试')
        } finally {
            setManualSyncing(false)
        }
    }

    const handleLogout = () => {
        clearAuth()
        toast.success('已退出登录')
        router.replace('/login')
    }

    return (
        <div className="syj-page md:p-6 space-y-4">
            <div className="h-11 flex items-center justify-center md:justify-start">
                <h1 className="text-lg font-bold text-gray-800">我的</h1>
            </div>

            <div className="syj-card bg-gradient-to-br from-emerald-50/95 to-sky-50/90 p-4 min-h-[118px]">
                <div className="flex items-center gap-4">
                    <div className="w-[64px] h-[64px] rounded-3xl bg-white/85 flex items-center justify-center text-4xl overflow-hidden shadow-sm shrink-0">
                        {profile.avatar ? <img src={profile.avatar} alt="头像" className="w-full h-full object-cover" /> : profile.gender === '女' ? '👩' : '👨'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-gray-800 truncate">{displayName}</p>
                        <p className="text-sm text-gray-500 mt-1 truncate">目标：{goalType} · {profile.targetWeight || '--'}kg</p>
                    </div>
                    <Link href="/profile/info" className="syj-pill h-9 px-3 bg-white/85 text-sm font-semibold text-emerald-600 shadow-sm">
                        编辑
                    </Link>
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label="切换主题"
                        className="w-9 h-9 ml-2 rounded-2xl bg-white/85 dark:bg-gray-700 flex items-center justify-center text-lg shadow-sm active:scale-90 transition-transform"
                    >
                        {isDark ? '☀️' : '🌙'}
                    </button>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/70 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-teal-400" style={{ width: profile.targetWeight ? '66%' : '28%' }} />
                </div>
                <p className="mt-2 text-[11px] text-gray-400">减重进度会随体重记录逐步更新</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard label="记录天数" value={stats.recordDays} unit="天" href="/analysis" />
                <StatCard label="平均热量" value={stats.avgCalorie} unit="kcal" href="/analysis" />
                <StatCard label="体重变化" value={weightValue} unit="kg" accent={weightAccent} href="/weight" />
            </div>

            <div className="syj-card-solid p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-800">数据库同步状态</p>
                        <p className="text-xs text-gray-400 mt-1">新增饮食、体重、健康记录后会自动写入数据库</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${syncBadgeClass}`}>{syncBadgeText}</span>
                </div>
                <div className="rounded-3xl bg-gray-50 px-3 py-3">
                    <p className="text-sm font-semibold text-gray-700">
                        {syncStatus.pendingCount > 0 ? `还有 ${syncStatus.pendingCount} 条新增记录未推送` : '当前新增记录已推送到数据库'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{syncDetailText}</p>
                    {showSyncFailure && syncStatus.lastFailureMessage && (
                        <p className="text-xs text-amber-600 mt-2">最近一次失败：{syncStatus.lastFailureMessage}</p>
                    )}
                </div>
                <button
                    onClick={handleManualSync}
                    disabled={manualSyncing || syncStatus.syncing || syncStatus.pendingCount === 0}
                    className="w-full h-10 rounded-full bg-emerald-400 text-white text-sm font-semibold active:scale-95 transition-transform disabled:bg-gray-200 disabled:text-gray-400 disabled:scale-100"
                >
                    {manualSyncing || syncStatus.syncing ? '补推中...' : syncStatus.pendingCount > 0 ? '手动推送所有待同步记录' : '当前没有待补推记录'}
                </button>
            </div>

            {/* 成就勋章 */}
            <Link href="/social/games" className="block syj-card bg-gradient-to-br from-amber-50/95 to-orange-50/90 p-4 active:scale-95 transition-transform">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🏆</span>
                        <h3 className="text-sm font-semibold text-gray-700">成就勋章</h3>
                    </div>
                    <span className="text-[11px] text-gray-400">Lv.<span className="syj-num">{gamification.level.level}</span> · <span className="syj-num">{gamification.points}</span> 积分 ›</span>
                </div>
                {gamification.achievements.length ? (
                    <>
                        <div className="grid grid-cols-3 gap-2">
                            {gamification.achievements.slice(0, 6).map((a) => (
                                <div
                                    key={a.achievement_key}
                                    className={`flex flex-col items-center text-center ${a.is_unlocked ? '' : 'opacity-40 grayscale'}`}
                                >
                                    <div className="w-12 h-12 rounded-3xl bg-white shadow-sm flex items-center justify-center text-2xl mb-1">
                                        {a.is_unlocked ? '🎖️' : '🔒'}
                                    </div>
                                    <p className="text-[10px] text-gray-500 leading-tight truncate w-full">{a.achievement_name}</p>
                                </div>
                            ))}
                        </div>
                        {gamification.achievements.length > 6 && (
                            <p className="mt-2 text-center text-xs text-emerald-600 font-semibold">
                                查看全部 <span className="syj-num">{gamification.achievements.length}</span> 枚勋章 →
                            </p>
                        )}
                    </>
                ) : (
                    <p className="text-xs text-gray-400 text-center py-2">完成记录可解锁勋章，点这里查看全部挑战 ›</p>
                )}
            </Link>

            <div className="overflow-hidden syj-card-solid">
                <EntryCard href="/profile/info" icon="👤" title="个人信息编辑" desc="昵称、头像、基础资料" />
                <EntryCard href="/goals" icon="🎯" title="目标设置" desc="减脂、维持、增肌目标" />
                <EntryCard href="/profile/settings" icon="🔒" title="隐私与设置" desc="提醒、皮肤、授权、帮助" />
            </div>

            <button onClick={() => setLogoutOpen(true)} className="w-full h-11 text-sm font-semibold text-red-500 active:scale-95 transition-transform">退出登录</button>
            <ConfirmDialog open={logoutOpen} title="确认退出登录？" message="退出后会清除当前登录状态。" confirmText="退出" danger onConfirm={handleLogout} onClose={() => setLogoutOpen(false)} />
        </div>
    )
}
