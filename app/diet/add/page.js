'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { addDietRecord, deleteDietRecord, getDietRecords, getFrequentFoods, getPreferredMeal, setPreferredMeal, todayStr, trackEvent } from '@/lib/store'
import { compressImageFile } from '@/lib/image/compress'
import { markStart, markEnd, trackFunnel } from '@/lib/metrics'

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

// AI 视觉调用，支持 v1 主接口 + 旧接口降级
async function callVisionApi(imageDataUrl) {
    const endpoints = ['/api/v1/ai/vision', '/api/ai/vision']
    let lastError = null
    for (const url of endpoints) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageDataUrl }),
            })
            const data = await res.json().catch(() => ({}))
            if (res.ok && data?.ok) {
                return { ok: true, result: data.result, requestId: data.requestId, cached: data.cached }
            }
            // 服务端返回 fallback：按文档"降级策略"处理
            if (data?.fallback) {
                return { ok: false, soft: true, result: data.fallback, msg: data.msg, code: data.code }
            }
            lastError = new Error(data?.msg || `AI 识别失败 (${res.status})`)
        } catch (e) {
            lastError = e
        }
    }
    throw lastError || new Error('AI 识别失败')
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
    const [ai, setAi] = useState({ file: null, preview: '', loading: false, costMs: null })
    const [aiItems, setAiItems] = useState([]) // 多食材识别结果，可逐项编辑
    const [mealOpen, setMealOpen] = useState(false)
    const [frequentFoods, setFrequentFoods] = useState([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const editId = searchParams.get('edit')
        if (editId) {
            const target = getDietRecords().find((r) => String(r.id) === String(editId))
            if (target) {
                setForm({
                    meal: target.meal || 'breakfast',
                    name: target.name || '',
                    calories: String(target.calories || ''),
                    date: target.date || todayStr(),
                    note: target.note || '',
                })
                setFrequentFoods(getFrequentFoods(3, 7))
                return
            }
        }
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

    useEffect(() => {
        markStart('diet_add')
        trackFunnel('diet_add_view')
    }, [])

    const handleSave = () => {
        if (saving) return
        if (!form.name.trim()) return toast.error('请先选择或填写食物名称')
        const calories = Number(form.calories)
        if (!calories || calories <= 0) return toast.error('请填写正确的热量')
        if (calories > 5000) return toast.error('单次热量不能超过 5000 kcal')

        setSaving(true)
        const editId = searchParams.get('edit')
        if (editId) deleteDietRecord(Number(editId))
        const recordId = Date.now()
        addDietRecord({
            id: recordId,
            meal: form.meal,
            name: form.name.trim(),
            calories,
            date: form.date,
            note: form.note.trim(),
        })
        trackEvent(editId ? 'diet_edit_save' : 'diet_add_save', { mode: form.note.includes('AI识别') ? 'ai' : 'manual', meal: form.meal, calories })
        trackFunnel('diet_add_save')
        markEnd('diet_add', { meal: form.meal, mode: form.note.includes('AI识别') ? 'ai' : 'manual' })
        toast.success('饮食添加成功 √', {
            duration: 3000,
            action: {
                label: '撤销',
                onClick: () => {
                    deleteDietRecord(recordId)
                    trackEvent('diet_add_undo', { meal: form.meal })
                    toast.info('已撤销本次添加，可在“回收站” 7 天内恢复')
                },
            },
        })
        window.setTimeout(() => router.replace('/diet'), 250)
    }

    const handleInstantAdd = (food) => {
        if (saving) return
        setSaving(true)
        const recordId = Date.now()
        addDietRecord({
            id: recordId,
            meal: form.meal,
            name: food.name,
            calories: Number(food.calories) || 0,
            date: form.date,
            note: '常用食物一键添加',
        })
        trackEvent('diet_quick_food_add', { name: food.name, meal: form.meal })
        toast.success(`已添加 ${food.name} √`, {
            duration: 3000,
            action: {
                label: '撤销',
                onClick: () => {
                    deleteDietRecord(recordId)
                    trackEvent('diet_quick_food_undo', { name: food.name })
                    toast.info('已撤销')
                },
            },
        })
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
            // 客户端压缩，降低请求体积与豆包 API 流量
            const compressed = await compressImageFile(ai.file, { maxSide: 1024, quality: 0.8 })
            const data = await callVisionApi(compressed.dataUrl)
            const result = data.result || {}
            const tip = result.tip ? `｜${result.tip}` : ''
            const items = Array.isArray(result.items) ? result.items : []
            setAiItems(items)
            setForm((current) => ({
                ...current,
                name: result.name || '餐食识别结果',
                calories: String(result.calories || 450),
                note: result.note
                    ? `AI识别：${result.note}${tip}`
                    : `AI识别初稿，可按实际分量和烹饪方式调整${tip}`,
            }))
            setAi((state) => ({ ...state, loading: false, costMs: data.costMs ?? null }))
            trackEvent('ai_meal_recognize', {
                name: result.name,
                calories: result.calories,
                confidence: result.confidence,
                bytes: compressed.bytes,
                cached: !!data.cached,
                soft: !!data.soft,
                costMs: data.costMs,
            })
            const timeLabel = data.costMs ? `（${(data.costMs / 1000).toFixed(1)}s）` : ''
            if (data.soft) {
                toast.warning(data.msg ? `${data.msg}，已为你填入占位值` : 'AI 暂不可用，已填入占位值')
            } else {
                toast.success(data.cached ? `命中缓存，已生成建议${timeLabel}` : `已生成识别建议${timeLabel}，请确认后保存`)
            }
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
                            <p className="text-xs text-purple-500 leading-5">已接入豆包视觉模型：会根据餐食图片给出可编辑的名称与热量建议，保存前仍可修改。{ai.costMs ? <span className="ml-1 text-gray-400">上次识别耗时 {(ai.costMs/1000).toFixed(1)}s</span> : null}</p>
                            {aiItems.length > 0 && (
                                <div className="rounded-xl bg-white p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-purple-700">识别出 {aiItems.length} 项·可逐项调整</p>
                                        <span className="text-[10px] text-gray-400">总热量 {aiItems.reduce((s, it) => s + (Number(it.calories) || 0), 0)} kcal</span>
                                    </div>
                                    {aiItems.map((it, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                                            <input
                                                value={it.name}
                                                onChange={(e) => setAiItems((arr) => arr.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                                                className="col-span-5 h-9 px-2 rounded-lg bg-gray-50 border border-gray-200 text-xs outline-none focus:border-purple-300"
                                            />
                                            <input
                                                type="number"
                                                value={it.grams}
                                                onChange={(e) => {
                                                    const grams = Math.max(1, Number(e.target.value) || 0)
                                                    setAiItems((arr) => arr.map((x, i) => {
                                                        if (i !== idx) return x
                                                        // 同比缩放热量
                                                        const ratio = grams / Math.max(1, Number(x.grams) || 1)
                                                        return { ...x, grams, calories: Math.round((Number(x.calories) || 0) * ratio) }
                                                    }))
                                                }}
                                                className="col-span-3 h-9 px-2 rounded-lg bg-gray-50 border border-gray-200 text-xs outline-none focus:border-purple-300"
                                            />
                                            <input
                                                type="number"
                                                value={it.calories}
                                                onChange={(e) => setAiItems((arr) => arr.map((x, i) => i === idx ? { ...x, calories: Number(e.target.value) || 0 } : x))}
                                                className="col-span-3 h-9 px-2 rounded-lg bg-gray-50 border border-gray-200 text-xs outline-none focus:border-purple-300"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setAiItems((arr) => arr.filter((_, i) => i !== idx))}
                                                className="col-span-1 h-9 rounded-lg text-gray-300 hover:text-red-400 text-sm"
                                                aria-label="删除"
                                            >✕</button>
                                        </div>
                                    ))}
                                    <div className="grid grid-cols-12 gap-1.5 text-[10px] text-gray-400 px-1">
                                        <span className="col-span-5">名称</span>
                                        <span className="col-span-3">克重 g</span>
                                        <span className="col-span-3">热量 kcal</span>
                                        <span className="col-span-1"></span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const total = aiItems.reduce((s, it) => s + (Number(it.calories) || 0), 0)
                                            const name = aiItems.map((it) => it.name).filter(Boolean).join(' + ') || form.name
                                            setForm((c) => ({ ...c, name, calories: String(total) }))
                                            trackEvent('ai_meal_items_apply', { count: aiItems.length, total })
                                            toast.success(`已应用调整：${total} kcal`)
                                        }}
                                        className="w-full h-9 rounded-lg bg-purple-100 text-purple-700 text-xs font-semibold active:scale-95 transition-transform"
                                    >应用调整后的总热量到上方表单</button>
                                </div>
                            )}
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