'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getProfile, saveProfile } from '@/lib/store'

const INPUT = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-emerald-400'

export default function ProfileInfoPage() {
    const router = useRouter()
    const [form, setForm] = useState({ avatar: '', nickname: '', targetWeight: '', dailyCalories: 1800 })

    useEffect(() => {
        const profile = getProfile()
        setForm({
            avatar: profile.avatar || '',
            nickname: profile.nickname || profile.name || '',
            targetWeight: profile.targetWeight || '',
            dailyCalories: profile.dailyCalories || 1800,
        })
    }, [])

    const handleSave = async () => {
        if (form.nickname.trim().length > 10) return toast.error('昵称不能超过10个字符')
        const targetWeight = Number(form.targetWeight)
        if (form.targetWeight && (targetWeight < 20 || targetWeight > 300)) return toast.error('目标体重应在 20~300kg')
        const dailyCalories = Number(form.dailyCalories)
        if (!dailyCalories || dailyCalories < 800 || dailyCalories > 5000) return toast.error('每日目标热量应在 800~5000kcal')

        const nextProfile = { ...getProfile(), ...form, name: form.nickname.trim(), dailyCalories: Math.round(dailyCalories) }
        saveProfile(nextProfile)
        await fetch('/api/user/updateInfo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('syj_token') || ''}` },
            body: JSON.stringify({
                nickname: form.nickname.trim(),
                avatar: form.avatar,
                target_weight: form.targetWeight ? Number(form.targetWeight).toFixed(1) : '',
                daily_target_calorie: Math.round(dailyCalories),
            }),
        }).catch(() => { })
        toast.success('个人信息已保存')
        router.replace('/profile')
    }

    return (
        <div className="p-4 space-y-4">
            <div className="pt-3 flex items-center justify-between">
                <Link href="/profile" className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-500">←</Link>
                <h1 className="text-xl font-bold text-gray-800">个人信息编辑</h1>
                <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-emerald-400 text-white text-sm font-semibold">保存</button>
            </div>

            <div className="bg-white rounded-3xl p-4 shadow-md shadow-gray-100 space-y-4">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-4xl overflow-hidden border border-emerald-100">
                        {form.avatar ? <img src={form.avatar} alt="头像预览" className="w-full h-full object-cover" /> : '👤'}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">支持填写头像图片 URL 进行预览</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">头像 URL</label>
                    <input value={form.avatar} onChange={(e) => setForm((f) => ({ ...f, avatar: e.target.value }))} placeholder="https://..." className={INPUT} />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">昵称</label>
                    <input value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} placeholder="不超过10个字符" className={INPUT} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">目标体重 (kg)</label>
                        <input type="number" step="0.1" value={form.targetWeight} onChange={(e) => setForm((f) => ({ ...f, targetWeight: e.target.value }))} placeholder="55.0" className={INPUT} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">每日热量 (kcal)</label>
                        <input type="number" value={form.dailyCalories} onChange={(e) => setForm((f) => ({ ...f, dailyCalories: e.target.value }))} placeholder="1800" className={INPUT} />
                    </div>
                </div>
            </div>
        </div>
    )
}
