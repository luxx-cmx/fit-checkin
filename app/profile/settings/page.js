'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/AppDialog'
import PageHeader from '@/components/PageHeader'
import { useSkin } from '@/components/SkinProvider'
import { clearAuth, getToken } from '@/lib/auth-client'

function SettingRow({ icon, title, desc, href, onClick, danger, trailing }) {
    const content = (
        <div className={`w-full flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100 last:border-0 ${danger ? 'text-red-500' : 'text-gray-700'}`}>
            <span className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-xl text-emerald-600 shrink-0">{icon}</span>
            <span className="flex-1 min-w-0 text-left">
                <span className={`block text-sm font-semibold ${danger ? 'text-red-500' : 'text-gray-800'}`}>{title}</span>
                {desc ? <span className="block text-xs text-gray-400 mt-0.5 truncate">{desc}</span> : null}
            </span>
            {trailing || (!danger ? <span className="text-gray-300">›</span> : null)}
        </div>
    )
    if (href) return <Link href={href}>{content}</Link>
    return <button onClick={onClick} className="w-full text-left">{content}</button>
}

export default function ProfileSettingsPage() {
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const { skin, setSkin, skins } = useSkin()
    const [skinOpen, setSkinOpen] = useState(false)
    const [logoutOpen, setLogoutOpen] = useState(false)
    const currentSkinName = useMemo(() => skins.find((item) => item.id === skin)?.name || '默认', [skin, skins])

    const handleSkinChange = (skinId) => {
        setSkin(skinId)
        toast.success(skinId === 0 ? '已恢复默认皮肤' : '皮肤已切换并保存')
    }

    const handleThemeToggle = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark'
        setTheme(nextTheme)
        toast.success(nextTheme === 'dark' ? '已切换深色模式' : '已切换浅色模式')
    }

    const handleLogout = async () => {
        const token = getToken()
        if (token) fetch('/api/user/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => { })
        clearAuth()
        toast.success('已退出登录')
        router.replace('/login')
    }

    return (
        <div className="p-4 space-y-4">
            <PageHeader title="设置" subtitle="低频设置集中收纳，主页保持清爽" fallbackHref="/profile" />

            <div className="overflow-hidden rounded-3xl bg-white shadow-sm border border-gray-100">
                <SettingRow icon="📋" title="健康资料设置" desc="身高、年龄、性别、活动量" href="/profile/health" />
                <SettingRow icon="📊" title="饮水/步数统计" desc="查看当日、本周、本月趋势" href="/health/stats" />
                <SettingRow icon="⏰" title="消息提醒设置" desc="吃饭、喝水、称重提醒" href="/profile/reminders" />
                <SettingRow icon="🎨" title="皮肤设置" desc={currentSkinName} onClick={() => setSkinOpen(true)} />
                <SettingRow
                    icon="🌓"
                    title="深浅色模式"
                    desc={theme === 'dark' ? '当前深色模式' : '当前浅色模式'}
                    onClick={handleThemeToggle}
                    trailing={<span className={`px-3 py-1 rounded-full text-xs ${theme === 'dark' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-600'}`}>{theme === 'dark' ? '深色' : '浅色'}</span>}
                />
                <SettingRow icon="📣" title="更新记录" desc="查看版本迭代日志" href="/profile/updates" />
                <SettingRow icon="💬" title="意见反馈" desc="提交问题、建议和数据异常" href="/profile/feedback" />
                <SettingRow icon="❔" title="关于我们 / 使用帮助" desc="产品介绍与常见问题" href="/profile/about" />
                <SettingRow icon="🚪" title="退出登录" desc="清除登录状态并返回登录页" onClick={() => setLogoutOpen(true)} danger />
            </div>

            <ConfirmDialog open={logoutOpen} title="确认退出登录？" message="退出后会清除当前登录状态。" confirmText="退出登录" danger onConfirm={handleLogout} onClose={() => setLogoutOpen(false)} />

            {skinOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 px-6">
                    <div className="w-full max-w-[320px] rounded-3xl bg-white p-5 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold text-gray-800">皮肤设置</h3>
                                <p className="text-xs text-gray-400 mt-0.5">沿用现有皮肤逻辑，选择后自动保存</p>
                            </div>
                            <button onClick={() => setSkinOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {skins.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleSkinChange(item.id)}
                                    className={`rounded-2xl border-2 p-2 text-left transition-all ${skin === item.id ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-white hover:border-emerald-200'}`}
                                >
                                    <div className={`h-20 rounded-xl bg-gradient-to-br ${item.tone} flex items-center justify-center text-3xl shadow-inner`}>
                                        {item.emoji}
                                    </div>
                                    <p className="mt-2 text-sm font-semibold text-gray-700">{item.name}</p>
                                    <p className="text-[11px] text-gray-400 leading-4">{item.desc}</p>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => handleSkinChange(0)} className="mt-4 w-full py-3 rounded-xl border border-emerald-300 text-emerald-600 text-sm font-semibold active:scale-[0.98] transition-transform">
                            恢复默认
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
