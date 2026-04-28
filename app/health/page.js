'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/AppDialog'
import { SkeletonCard } from '@/components/Skeleton'
import { getHealthRecords, addHealthRecord, deleteHealthRecord, todayStr, getProfile, getTodayCalories, getLatestWeight, trackEvent } from '@/lib/store'

const TYPES = [
    { id: 'water', label: '饮水量', unit: 'ml', emoji: '💧', placeholder: '如：2000', color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'steps', label: '步数', unit: '步', emoji: '👟', placeholder: '如：8000', color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'sleep', label: '睡眠', unit: 'h', emoji: '😴', placeholder: '如：7.5', color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'bp', label: '血压', unit: 'mmHg', emoji: '❤️', placeholder: '如：120/80', color: 'text-red-500', bg: 'bg-red-50' },
    { id: 'hr', label: '心率', unit: '次/分', emoji: '💓', placeholder: '如：72', color: 'text-pink-500', bg: 'bg-pink-50' },
    { id: 'glucose', label: '血糖', unit: 'mmol/L', emoji: '🩸', placeholder: '如：5.0', color: 'text-rose-500', bg: 'bg-rose-50' },
]

export default function HealthPage() {
    const [records, setRecords] = useState([])
    const [activeType, setActiveType] = useState('water')
    const [form, setForm] = useState({ value: '', date: todayStr(), note: '' })
    const [showForm, setShowForm] = useState(false)
    const [deleteId, setDeleteId] = useState(null)
    const [aiAnalysis, setAiAnalysis] = useState({ loading: false, text: '', costMs: null })

    const handleAiAnalysis = async (mode = 'normal') => {
        if (aiAnalysis.loading) return
        setAiAnalysis((s) => ({ ...s, loading: true, text: '' }))
        try {
            const profile = getProfile()
            const health = getHealthRecords().filter((r) => r.date === todayStr())
            const water = health.filter((h) => h.type === 'water').reduce((s, h) => s + (Number(h.value) || 0), 0)
            const steps = health.filter((h) => h.type === 'steps').reduce((s, h) => s + (Number(h.value) || 0), 0)
            const res = await fetch('/api/v1/ai/analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    calories: getTodayCalories(),
                    target: Number(profile.dailyCalories) || 1800,
                    water: water || null,
                    waterTarget: Number(profile.dailyWater) || 2000,
                    steps: steps || null,
                    stepsTarget: Number(profile.dailySteps) || 8000,
                    weight: getLatestWeight(),
                    mode,
                }),
            })
            const data = await res.json()
            if (data.ok) {
                setAiAnalysis({ loading: false, text: data.text, costMs: data.costMs })
                trackEvent('ai_health_analysis_health_page', { mode, costMs: data.costMs })
            } else {
                setAiAnalysis({ loading: false, text: '', costMs: null })
                toast.error(data.msg || 'AI 分析失败')
            }
        } catch (e) {
            setAiAnalysis({ loading: false, text: '', costMs: null })
            toast.error('AI 分析失败，请稍后重试')
        }
    }

    const load = () => setRecords(getHealthRecords())
    useEffect(() => { void load() }, [])

    const cur = TYPES.find((t) => t.id === activeType)
    const typeRecords = records.filter((r) => r.type === activeType)
    const today = todayStr()

    const handleAdd = () => {
        if (!form.value) return toast.error('请输入数值')
        addHealthRecord({ type: activeType, ...form })
        setForm({ value: '', date: todayStr(), note: '' })
        setShowForm(false)
        load()
        toast.success(`${cur.label} 已记录`)
    }

    const handleDelete = (id) => {
        deleteHealthRecord(id)
        load()
        setDeleteId(null)
        toast.success('已删除')
    }

    const todaySummary = TYPES.map((t) => {
        const recs = records.filter((r) => r.type === t.id && r.date === today)
        if (recs.length === 0) return null
        const total =
            t.id === 'water' || t.id === 'steps'
                ? recs.reduce((s, r) => s + (Number(r.value) || 0), 0)
                : recs[0].value
        return { ...t, display: total }
    }).filter(Boolean)

    return (
        <div className="syj-page md:p-6 space-y-4">
            <div className="pt-3">
                <h1 className="text-xl font-bold text-gray-800">基础健康</h1>
                <p className="text-sm text-gray-400 mt-0.5">记录日常健康数据，关注身体变化</p>
            </div>

            {todaySummary.length > 0 && (
                <div className="syj-card-solid p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">今日数据</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {todaySummary.map((t) => (
                            <div key={t.id} className={`${t.bg} rounded-3xl p-3 text-center`}>
                                <div className="text-2xl">{t.emoji}</div>
                                <div className={`font-bold text-sm mt-1 ${t.color}`}>{t.display}</div>
                                <div className="text-xs text-gray-400">{t.unit}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="syj-card bg-gradient-to-r from-emerald-50/95 to-teal-50/90 p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="w-10 h-10 rounded-3xl bg-white/85 flex items-center justify-center text-xl shadow-sm">🤖</span>
                        <p className="text-sm font-semibold text-gray-700">AI 健康分析</p>
                    </div>
                    <span className="text-[10px] text-gray-400">基于今日数据，需手动触发</span>
                </div>
                {aiAnalysis.loading && !aiAnalysis.text && (
                    <div className="mb-3"><SkeletonCard /></div>
                )}
                {aiAnalysis.text && (
                    <div className="mb-3 bg-white/80 rounded-3xl p-3 border border-emerald-100">
                        <p className="text-xs text-gray-600 leading-5">{aiAnalysis.text}</p>
                        {aiAnalysis.costMs && <p className="text-[10px] text-gray-300 mt-1">分析耗时 {(aiAnalysis.costMs / 1000).toFixed(1)}s</p>}
                    </div>
                )}
                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
                    <button
                        onClick={() => handleAiAnalysis('normal')}
                        disabled={aiAnalysis.loading}
                        className="flex-1 h-10 rounded-full bg-emerald-400 text-white text-xs font-semibold disabled:opacity-60 active:scale-95 transition-transform"
                    >{aiAnalysis.loading ? '分析中...' : '✨ 今日健康小结'}</button>
                    <button
                        onClick={() => handleAiAnalysis('deep')}
                        disabled={aiAnalysis.loading}
                        className="flex-1 h-10 rounded-full bg-teal-500 text-white text-xs font-semibold disabled:opacity-60 active:scale-95 transition-transform"
                    >{aiAnalysis.loading ? '...' : '🔍 深度建议'}</button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TYPES.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => {
                            setActiveType(t.id)
                            setShowForm(false)
                        }}
                        className={`flex flex-col items-center py-3 rounded-2xl text-xs font-medium transition-colors shadow-sm ${activeType === t.id ? 'bg-green-600 text-white' : 'bg-white text-gray-600'
                            }`}
                    >
                        <span className="text-2xl mb-1">{t.emoji}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            <button
                onClick={() => setShowForm(!showForm)}
                className="w-full flex items-center justify-center gap-2 bg-white/85 border-2 border-dashed border-emerald-300 rounded-3xl py-3 text-emerald-600 font-semibold active:scale-95 transition-transform"
            >
                + 记录{cur?.label}
            </button>

            {showForm && (
                <div className="syj-card-solid p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">
                                {cur?.label}（{cur?.unit}）
                            </label>
                            <input
                                value={form.value}
                                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                                placeholder={cur?.placeholder}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-emerald-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">日期</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-emerald-400"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">备注（可选）</label>
                        <input
                            value={form.note}
                            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                            placeholder="如：运动后测量"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-emerald-400"
                        />
                    </div>
                    <button onClick={handleAdd} className="w-full bg-emerald-400 text-white py-3 rounded-full font-semibold">
                        保存
                    </button>
                    <button onClick={() => setShowForm(false)} className="w-full text-gray-400 text-sm py-1">
                        取消
                    </button>
                </div>
            )}

            {typeRecords.length > 0 ? (
                <div className="syj-card-solid overflow-hidden">
                    <div className="px-4 py-3 bg-white/60">
                        <span className="font-semibold text-gray-700 text-sm">
                            {cur?.emoji} {cur?.label}记录（共 {typeRecords.length} 条）
                        </span>
                    </div>
                    {typeRecords.map((r) => (
                        <div key={r.id} className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
                            <div>
                                <span className={`text-sm font-semibold ${cur?.color}`}>
                                    {r.value} {cur?.unit}
                                </span>
                                {r.note && <span className="text-xs text-gray-400 ml-2">{r.note}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400">{r.date}</span>
                                <button onClick={() => setDeleteId(r.id)} className="syj-icon-button w-8 h-8 text-gray-300 hover:text-red-400">
                                    🗑
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="syj-card bg-gradient-to-br from-emerald-50/95 to-sky-50/90 text-center py-12 text-gray-400">
                    <div className="text-5xl mb-3">{cur?.emoji}</div>
                    <p className="text-sm">暂无{cur?.label}记录</p>
                </div>
            )}

            <ConfirmDialog open={Boolean(deleteId)} title="确认删除这条健康记录？" message="删除后将无法恢复。" confirmText="删除" danger onConfirm={() => handleDelete(deleteId)} onClose={() => setDeleteId(null)} />
        </div>
    )
}
