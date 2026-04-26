'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import PageHeader from '@/components/PageHeader'
import { getProfile, saveProfile } from '@/lib/store'

const INPUT = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-emerald-400'
const FACTOR = { 低: 1.2, 中: 1.45, 高: 1.7 }

function calcBmr({ gender, height, age }) {
    const h = Number(height)
    const a = Number(age)
    if (!h || !a) return 0
    const baseWeight = Math.max(45, h - 105)
    return Math.round(10 * baseWeight + 6.25 * h - 5 * a + (gender === '男' ? 5 : -161))
}

export default function ProfileHealthPage() {
    const router = useRouter()
    const [form, setForm] = useState({ gender: '', height: '', age: '', activityLevel: '中' })

    useEffect(() => {
        const profile = getProfile()
        setForm({ gender: profile.gender || '', height: profile.height || '', age: profile.age || '', activityLevel: profile.activityLevel || '中' })
    }, [])

    const bmr = useMemo(() => calcBmr(form), [form])
    const recommend = bmr ? Math.round(bmr * (FACTOR[form.activityLevel] || 1.45)) : 0

    const handleSave = async () => {
        if (!form.gender) return toast.error('请选择性别')
        const height = Number(form.height)
        const age = Number(form.age)
        if (!height || height < 120 || height > 230) return toast.error('身高应在 120~230cm')
        if (!age || age < 18 || age > 80) return toast.error('年龄应在 18~80 岁')
        const nextProfile = { ...getProfile(), ...form, dailyCalories: recommend || getProfile().dailyCalories }
        saveProfile(nextProfile)
        await fetch('/api/user/updateProfile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('syj_token') || ''}` },
            body: JSON.stringify({ gender: form.gender, height, age, activity_level: form.activityLevel }),
        }).catch(() => { })
        toast.success('健康资料已保存')
        router.replace('/profile/settings')
    }

    return (
        <div className="p-4 space-y-4">
            <PageHeader title="健康资料设置" fallbackHref="/profile/settings" action={<button onClick={handleSave} className="px-4 py-2 rounded-xl bg-emerald-400 text-white text-sm font-semibold">保存</button>} />
            <div className="bg-white rounded-3xl p-4 shadow-md shadow-gray-100 space-y-4">
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">性别</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['男', '女'].map((item) => <button key={item} onClick={() => setForm((f) => ({ ...f, gender: item }))} className={`py-3 rounded-2xl text-sm font-medium ${form.gender === item ? 'bg-emerald-400 text-white' : 'bg-gray-100 text-gray-600'}`}>{item}</button>)}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium text-gray-700 mb-2 block">身高 (cm)</label><input type="number" value={form.height} onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))} className={INPUT} /></div>
                    <div><label className="text-sm font-medium text-gray-700 mb-2 block">年龄</label><input type="number" value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} className={INPUT} /></div>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">活动量</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['低', '中', '高'].map((item) => <button key={item} onClick={() => setForm((f) => ({ ...f, activityLevel: item }))} className={`py-3 rounded-2xl text-sm font-medium ${form.activityLevel === item ? 'bg-emerald-400 text-white' : 'bg-gray-100 text-gray-600'}`}>{item}</button>)}
                    </div>
                </div>
            </div>
            <div className="bg-emerald-50 rounded-3xl p-4 border border-emerald-100">
                <p className="text-sm text-gray-500">基础代谢率</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{bmr || '--'} kcal</p>
                <p className="text-sm text-gray-500 mt-3">推荐每日热量</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{recommend || '--'} kcal</p>
            </div>
        </div>
    )
}
