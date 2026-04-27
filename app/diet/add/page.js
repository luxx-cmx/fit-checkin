'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { addDietRecord, getFrequentFoods, getPreferredMeal, setPreferredMeal, todayStr, trackEvent } from '@/lib/store'

const MEALS = [
    { id: 'breakfast', label: '早餐', emoji: '🌅' },
    { id: 'lunch', label: '午餐', emoji: '☀️' },
    { id: 'dinner', label: '晚餐', emoji: '🌙' },
    { id: 'snack', label: '加餐', emoji: '🍎' },
]

const COMMON_FOODS = [
    { name: '米饭', calories: 116 },
    { name: '鸡胸肉', calories: 133 },
    { name: '水煮蛋', calories: 78 },
    { name: '苹果', calories: 52 },
    { name: '西兰花', calories: 34 },
]

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('图片读取失败'))
        reader.readAsDataURL(file)
    })
}

export default function AddDietPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [form, setForm] = useState({
        meal: 'breakfast',
        name: '',
        calories: '',
        date: todayStr(),
        note: '',
    })
    const [mode, setMode] = useState('manual')
    const [ai, setAi] = useState({ file: null, preview: '', loading: false })
    const [mealOpen, setMealOpen] = useState(false)
    const [frequentFoods, setFrequentFoods] = useState([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setForm((current) => ({
            ...current,
            meal: searchParams.get('meal') || getPreferredMeal() || current.meal,
            name: searchParams.get('name') || current.name,
            calories: searchParams.get('calories') || current.calories,
            date: searchParams.get('date') || current.date,
            note: searchParams.get('note') || current.note,
        }))
        setFrequentFoods(getFrequentFoods(3, 7))
    }, [searchParams])

    const handleSave = () => {
        if (saving) return
        if (!form.name.trim()) return toast.error('请先选择或填写食物名称')
        const calories = Number(form.calories)
        if (!calories || calories <= 0) return toast.error('请填写正确的热量')
        if (calories > 5000) return toast.error('单次热量不能超过 5000 kcal')

        setSaving(true)
        addDietRecord({
            meal: form.meal,
            name: form.name.trim(),
            calories,
            date: form.date,
            note: form.note.trim(),
        })
        trackEvent('diet_add_save', { mode: form.note.includes('AI识别') ? 'ai' : 'manual', meal: form.meal, calories })
        toast.success('饮食添加成功 √')
        window.setTimeout(() => router.replace('/diet'), 250)
    }

    const handleInstantAdd = (food) => {
        if (saving) return
        setSaving(true)
        addDietRecord({
            meal: form.meal,
            name: food.name,
            calories: Number(food.calories) || 0,
            date: form.date,
            note: '常用食物一键添加',
        })
        trackEvent('diet_quick_food_add', { name: food.name, meal: form.meal })
        toast.success(`已添加 ${food.name} √`)
        window.setTimeout(() => router.replace('/diet'), 650)
    }

    const handleAiFile = (file) => {
        if (!file) return
        if (!file.type.startsWith('image/')) return toast.error('请上传餐食图片')
        if (file.size > 5 * 1024 * 1024) return toast.error('图片请控制在5MB以内')
        if (ai.preview) URL.revokeObjectURL(ai.preview)
        setAi({ file, preview: URL.createObjectURL(file), loading: false })
        trackEvent('ai_meal_upload', { size: file.size })
    }

    const handleAiRecognize = async () => {
        if (!ai.file) return toast.error('请先上传餐食图片')
        setAi((state) => ({ ...state, loading: true }))
        try {
            const imageDataUrl = await fileToDataUrl(ai.file)
            const res = await fetch('/api/ai/vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageDataUrl }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok || !data.ok) throw new Error(data.msg || 'AI 识别失败')
            const result = data.result || {}
            setForm((current) => ({
                ...current,
                name: result.name || '餐食识别结果',
                calories: String(result.calories || 450),
                note: result.note ? `AI识别：${result.note}` : 'AI识别初稿，可按实际分量和烹饪方式调整',
            }))
            setAi((state) => ({ ...state, loading: false }))
            trackEvent('ai_meal_recognize', { name: result.name, calories: result.calories, confidence: result.confidence })
            toast.success('已生成识别建议，请确认后保存')
        } catch (e) {
            setAi((state) => ({ ...state, loading: false }))
            trackEvent('ai_meal_recognize_failed', { message: e.message })
            toast.error(e.message || 'AI 识别失败，请稍后重试')
        }
    }

    const foodsHref = `/foods?returnTo=/diet/add&meal=${encodeURIComponent(form.meal)}&date=${encodeURIComponent(form.date)}`
    const selectedMeal = MEALS.find((meal) => meal.id === form.meal) || MEALS[0]

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="h-11 flex items-center justify-between">
                <Link href="/diet" className="w-11 h-11 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-500 active:scale-95 transition-transform">
                    ←
                </Link>
                <h1 className="text-lg font-bold text-gray-800">饮食记录</h1>
                <button
                    onClick={handleSave}
                    className="min-w-11 h-11 px-3 rounded-lg bg-emerald-400 text-white text-sm font-semibold shadow-sm active:scale-95 transition-transform"
                >
                    保存
                </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
                {['选餐次', '录食物', '确认保存'].map((item, index) => (
                    <div key={item} className="rounded-lg bg-white px-3 py-2 shadow-sm border border-gray-100">
                        <span className="font-bold text-emerald-500 mr-1">{index + 1}</span>{item}
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">餐次</label>
                    <button onClick={() => setMealOpen(true)} className="w-full h-11 border-0 border-b border-gray-200 flex items-center justify-between text-sm text-gray-700 focus:border-emerald-400">
                        <span>{selectedMeal.emoji} {selectedMeal.label}</span>
                        <span className="text-gray-300">选择 ›</span>
                    </button>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">食物</label>
                    </div>
                    <div className="flex items-center justify-end gap-2 mb-3">
                        <button onClick={() => setMode('manual')} className={`w-11 h-11 rounded-lg text-xs font-semibold ${mode === 'manual' ? 'bg-emerald-400 text-white' : 'bg-gray-100 text-gray-500'}`}>手动</button>
                        <Link href={foodsHref} className="w-11 h-11 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center text-xl">🥗</Link>
                        <button onClick={() => setMode('ai')} className={`w-11 h-11 rounded-lg text-xl ${mode === 'ai' ? 'bg-purple-400 text-white' : 'bg-purple-50 text-purple-500'}`}>📷</button>
                    </div>
                    {mode === 'ai' && (
                        <div className="mb-3 rounded-xl border border-dashed border-purple-200 bg-purple-50/60 p-4 space-y-3">
                            {ai.preview ? <img src={ai.preview} alt="餐食预览" className="h-36 w-full rounded-lg object-cover" /> : <div className="h-32 rounded-lg bg-white flex items-center justify-center text-sm text-purple-400">上传餐食图片，生成识别初稿</div>}
                            <div className="grid grid-cols-2 gap-2">
                                <label className="h-11 rounded-lg bg-white text-purple-500 text-center text-sm font-semibold active:scale-95 transition-transform cursor-pointer flex items-center justify-center">
                                    上传图片
                                    <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAiFile(event.target.files?.[0])} />
                                </label>
                                <button onClick={handleAiRecognize} disabled={ai.loading} className="h-11 rounded-lg bg-purple-400 text-white text-sm font-semibold disabled:opacity-60">{ai.loading ? '识别中...' : '生成建议'}</button>
                            </div>
                            <p className="text-xs text-purple-500 leading-5">已接入豆包视觉模型：会根据餐食图片给出可编辑的名称与热量建议，保存前仍可修改。</p>
                        </div>
                    )}
                    <input
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        onKeyDown={(event) => { if (event.key === 'Enter') handleSave() }}
                        placeholder="请输入食物名称或点击选择"
                        className="w-full h-11 px-1 bg-white border-0 border-b border-gray-200 text-sm outline-none focus:border-emerald-400"
                    />
                    {frequentFoods.length > 0 && (
                        <div className="mt-3 rounded-xl bg-emerald-50/70 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-emerald-700">近7天常用 · 点击即添加</p>
                                <span className="text-[10px] text-emerald-500">无需二次确认</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {frequentFoods.map((food) => (
                                    <button
                                        key={food.name}
                                        onClick={() => handleInstantAdd(food)}
                                        disabled={saving}
                                        className="min-h-11 rounded-lg bg-white px-2 py-2 text-left active:scale-95 transition-transform disabled:opacity-60"
                                    >
                                        <span className="block text-xs font-semibold text-gray-700 truncate">{food.name}</span>
                                        <span className="text-[10px] text-gray-400">{food.calories}kcal · {food.count}次</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {COMMON_FOODS.map((food) => <button key={food.name} onClick={() => setForm((current) => ({ ...current, name: food.name, calories: String(food.calories) }))} className="whitespace-nowrap px-3 h-8 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold">{food.name}</button>)}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">热量 (kcal)</label>
                        <input
                            type="number"
                            value={form.calories}
                            onChange={(event) => setForm((current) => ({ ...current, calories: event.target.value }))}
                            placeholder="如：320"
                            className="w-full h-11 px-1 bg-white border-0 border-b border-gray-200 text-sm outline-none focus:border-emerald-400"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">记录日期</label>
                        <input
                            type="date"
                            value={form.date}
                            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                            className="w-full h-11 px-1 bg-white border-0 border-b border-gray-200 text-sm outline-none focus:border-emerald-400"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">备注</label>
                    <input
                        value={form.note}
                        onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                        placeholder="如：午饭外卖、加双份鸡蛋"
                        className="w-full h-11 px-1 bg-white border-0 border-b border-gray-200 text-sm outline-none focus:border-emerald-400"
                    />
                </div>
            </div>

            <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.calories} className="w-full h-11 rounded-lg bg-emerald-400 text-white text-sm font-bold shadow-sm active:scale-95 transition-transform disabled:bg-gray-200 disabled:text-gray-400 disabled:scale-100">{saving ? '保存中...' : '确认添加'}</button>

            {mealOpen && (
                <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 px-4 pb-4" onClick={() => setMealOpen(false)}>
                    <div className="w-full max-w-[420px] rounded-t-2xl rounded-b-xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <h3 className="text-base font-bold text-gray-800 mb-3">选择餐次</h3>
                        <div className="grid grid-cols-4 gap-2">
                            {MEALS.map((meal) => <button key={meal.id} onClick={() => { setForm((current) => ({ ...current, meal: meal.id })); setMealOpen(false) }} className={`h-20 rounded-lg text-sm font-semibold active:scale-95 transition-transform ${form.meal === meal.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-600'}`}><span className="block text-2xl mb-1">{meal.emoji}</span>{meal.label}</button>)}
                        </div>
                        <button onClick={() => { setPreferredMeal(form.meal); toast.success('已记住本次餐次'); setMealOpen(false) }} className="mt-4 w-full h-11 rounded-lg bg-emerald-400 text-white text-sm font-semibold active:scale-95 transition-transform">
                            默认选中本次餐次
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}