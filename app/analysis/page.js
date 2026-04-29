'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import { SkeletonCard } from '@/components/Skeleton'
import { toast } from 'sonner'
import { getDietRecords, getHealthRecords, getProfile, getWeightRecords, todayStr, trackEvent } from '@/lib/store'

function getBmiLabel(bmi) {
    if (!bmi) return ''
    if (bmi < 18.5) return '偏小'
    if (bmi < 24) return '正常'
    if (bmi < 28) return '超重'
    return '肖肥'
}

function lastDays(n = 7) {
    return Array.from({ length: n }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (n - 1 - i))
        return d.toISOString().slice(0, 10)
    })
}

function calcBmi(weight, height) {
    const h = Number(height) / 100
    return weight && h ? Number((Number(weight) / (h * h)).toFixed(1)) : null
}

function buildLocalSummary(period = 7) {
    const profile = getProfile()
    const diet = getDietRecords()
    const weight = getWeightRecords()
    const health = getHealthRecords()
    const today = todayStr()
    const target = Number(profile.dailyCalories || 1800)
    const calories = diet.filter((r) => r.date === today).reduce((s, r) => s + (Number(r.calories) || 0), 0)
    const water = health.filter((r) => r.date === today && r.type === 'water').reduce((s, r) => s + (Number(r.value) || 0), 0)
    const steps = health.filter((r) => r.date === today && r.type === 'steps').reduce((s, r) => s + (Number(r.value) || 0), 0)
    const latestWeight = Number(weight[0]?.weight || 0)
    const dates = lastDays(period)
    let carryWeight = null
    const weightAsc = [...weight].reverse()
    const trend = dates.map((date) => {
        const dayCalories = diet.filter((r) => r.date === date).reduce((s, r) => s + (Number(r.calories) || 0), 0)
        const dayWeight = [...weightAsc].filter((r) => r.date <= date).at(-1)?.weight
        if (dayWeight) carryWeight = Number(dayWeight)
        return {
            date,
            calories: dayCalories,
            attainment: target ? Math.min(100, Math.round((dayCalories / target) * 100)) : 0,
            weight: carryWeight,
            carriedWeight: !weight.some((r) => r.date === date) && Boolean(carryWeight),
        }
    })
    const validAttainment = trend.filter((d) => d.calories > 0)
    const avgAttainment = validAttainment.length ? Math.round(validAttainment.reduce((s, d) => s + d.attainment, 0) / validAttainment.length) : 0
    const weights = trend.map((d) => d.weight).filter(Boolean)
    const weightDelta = weights.length >= 2 ? Number((weights.at(-1) - weights[0]).toFixed(1)) : null
    const missedDays = trend.filter((d) => d.calories > target || d.calories === 0).length
    const relationText = weights.length < 2
        ? `近${period}天体重数据不足，建议连续记录体重以观察热量与体重的关联。`
        : `近${period}天热量达标率约${avgAttainment}%，体重${weightDelta <= 0 ? '下降' : '上升'}${Math.abs(weightDelta)}kg；${missedDays ? `其中${missedDays}天存在未记录或超标，建议重点关注晚餐和加餐。` : '摄入节奏较稳定，建议继续保持。'}`
    const advice = []
    if (calories > target) advice.push('今日热量已超过目标，晚餐建议选择低脂高蛋白。')
    else if (calories < target * 0.6) advice.push('今日摄入偏低，注意补足优质碳水和蛋白质。')
    else advice.push('今日热量仍在目标范围内，继续保持。')
    if (water < Number(profile.dailyWater || 2000) * 0.6) advice.push('饮水进度偏慢，可以分多次少量补水。')
    if (steps < Number(profile.dailySteps || 8000) * 0.5) advice.push('今日步数偏低，饭后散步10-20分钟会更利于坚持。')

    return {
        today: { calories, target, remaining: Math.max(target - calories, 0), water, steps },
        body: { weight: latestWeight, bmi: calcBmi(latestWeight, profile.height), bmr: null, recommendCalorie: target },
        advice,
        weekCalories: trend,
        correlation: { trend, avgAttainment, weightDelta, relationText },
    }
}

function DualTrend({ trend }) {
    if (!trend?.length) return <p className="text-sm text-gray-400 text-center py-8">暂无足够趋势数据</p>
    const maxWeight = Math.max(...trend.map((d) => d.weight || 0), 1)
    const minWeight = Math.min(...trend.map((d) => d.weight || maxWeight), maxWeight)
    return <div className="space-y-3">{trend.map((d) => {
        const weightPct = d.weight ? Math.max(8, Math.round(((d.weight - minWeight) / ((maxWeight - minWeight) || 1)) * 80) + 10) : 0
        return <div key={d.date} className="grid grid-cols-[46px_1fr_48px] items-center gap-2 text-xs"><span className="text-gray-400">{d.date.slice(5)}</span><div className="space-y-1"><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${d.attainment}%` }} /></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-300" style={{ width: `${weightPct}%` }} /></div></div><span className="text-gray-400 text-right">{d.attainment}%</span></div>
    })}<div className="flex gap-4 text-[11px] text-gray-400"><span><i className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />热量达标率</span><span><i className="inline-block w-2 h-2 rounded-full bg-blue-300 mr-1" />体重趋势</span></div></div>
}

function AnalysisMetricCard({ label, value, unit, tone = 'text-emerald-600' }) {
    return (
        <div className="syj-card-solid p-4">
            <p className="text-xs font-semibold text-gray-400">{label}</p>
            <p className={`mt-1 text-2xl font-black tracking-tight ${tone}`}>{value}<span className="text-xs text-gray-400 ml-1">{unit}</span></p>
        </div>
    )
}

export default function AnalysisPage() {
    const [period, setPeriod] = useState(7)
    const [data, setData] = useState(buildLocalSummary(7))
    const [aiAnalysis, setAiAnalysis] = useState({ loading: false, text: '', costMs: null })

    const handleAiAnalysis = async (mode = 'normal') => {
        if (aiAnalysis.loading) return
        setAiAnalysis((s) => ({ ...s, loading: true, text: '' }))
        try {
            const profile = getProfile()
            const recentFoods = getDietRecords().filter((r) => r.date === todayStr()).map((r) => r.name)
            const res = await fetch('/api/v1/ai/analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    calories: data.today.calories,
                    target: data.today.target,
                    water: data.today.water || null,
                    waterTarget: Number(profile.dailyWater) || 2000,
                    steps: data.today.steps || null,
                    stepsTarget: Number(profile.dailySteps) || 8000,
                    weight: data.body.weight || null,
                    bmi: data.body.bmi || null,
                    avgAttainment: data.correlation.avgAttainment,
                    weightDelta: data.correlation.weightDelta,
                    missedDays: data.correlation.trend?.filter((d) => d.calories > data.today.target || d.calories === 0).length,
                    period,
                    recentFoods,
                    mode,
                    extraContext: `近${period}天热量达标率${data.correlation.avgAttainment}%，${data.correlation.relationText}`,
                }),
            })
            const d = await res.json()
            if (d.ok) {
                setAiAnalysis({ loading: false, text: d.text, costMs: d.costMs })
                trackEvent('ai_analysis_page', { mode, costMs: d.costMs, period })
            } else {
                setAiAnalysis({ loading: false, text: '', costMs: null })
                toast.error(d.msg || 'AI 分析失败')
            }
        } catch (e) {
            setAiAnalysis({ loading: false, text: '', costMs: null })
            toast.error('AI 分析失败，请稍后重试')
        }
    }
    useEffect(() => {
        const refresh = () => setData(buildLocalSummary(period))
        refresh()
        window.addEventListener('focus', refresh)
        window.addEventListener('syj:data-changed', refresh)
        const token = localStorage.getItem('syj_token')
        if (token) fetch('/api/analysis/summary', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((d) => { if (d.data) setData((prev) => ({ ...prev, ...d.data, correlation: d.data.correlation || prev.correlation })) })
            .catch(() => { })
        return () => {
            window.removeEventListener('focus', refresh)
            window.removeEventListener('syj:data-changed', refresh)
        }
    }, [period])

    const profile = getProfile()
    const bmiValue = data.body.bmi
    const bmiMissing = !bmiValue
    const bmiDisplay = bmiMissing ? '请设置' : String(bmiValue)

    const cards = useMemo(() => [
        ['今日摄入', data.today.calories, 'kcal'],
        [data.today.calories > data.today.target ? '已超额' : '剩余热量', data.today.remaining, 'kcal'],
        ['BMI', bmiDisplay, bmiMissing ? '' : getBmiLabel(bmiValue)],
        ['推荐热量', data.body.recommendCalorie || data.today.target, 'kcal'],
    ], [data, bmiDisplay, bmiMissing])

    return (
        <div className="syj-page md:p-6 space-y-4">
            <PageHeader title="智能健康分析" subtitle="BMI / BMR / 热量建议 / 体重-热量关联" />

            <div className="syj-card p-1.5 grid grid-cols-3 gap-1 bg-white/80">
                {[7, 14, 30].map((value) => (
                    <button key={value} onClick={() => setPeriod(value)} className={`h-11 rounded-2xl text-sm font-semibold transition-all ${period === value ? 'bg-emerald-400 text-white shadow-sm' : 'text-gray-500 hover:bg-white/70'}`}>近{value}天</button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
                {cards.map(([label, value, unit], index) => (
                    <AnalysisMetricCard key={label} label={label} value={value} unit={unit} tone={index === 1 && data.today.calories > data.today.target ? 'text-rose-500' : 'text-emerald-600'} />
                ))}
                {bmiMissing && (
                    <div className="col-span-2">
                        <Link href="/profile/info" className="block text-xs text-center text-emerald-600 bg-emerald-50 rounded-2xl py-2 px-3">
                            📌 BMI 需要身高和体重数据——点这里补充个人信息
                        </Link>
                    </div>
                )}
            </div>

            <div className="syj-card-solid p-4">
                <h3 className="font-semibold text-gray-700 mb-3">智能建议</h3>
                <div className="space-y-2">{data.advice.map((a, i) => <p key={i} className="text-sm text-gray-500 bg-emerald-50/80 rounded-2xl px-3 py-2 leading-6">{a}</p>)}</div>
            </div>

            <div className="syj-card bg-gradient-to-r from-emerald-50/95 to-blue-50/90 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="w-10 h-10 rounded-3xl bg-white/85 flex items-center justify-center text-xl shadow-sm">🤖</span>
                        <h3 className="font-semibold text-gray-700">AI 深度分析</h3>
                    </div>
                    <span className="text-[10px] text-gray-400">基于近{period}天全量数据</span>
                </div>
                {aiAnalysis.loading && !aiAnalysis.text && (
                    <div className="mb-3"><SkeletonCard /></div>
                )}
                {aiAnalysis.text && (
                    <div className="mb-3 bg-white/80 rounded-3xl p-4 border border-emerald-100">
                        <p className="text-sm text-gray-600 leading-6">{aiAnalysis.text}</p>
                        {aiAnalysis.costMs && <p className="text-[10px] text-gray-300 mt-2">分析耗时 {(aiAnalysis.costMs / 1000).toFixed(1)}s</p>}
                    </div>
                )}
                <div className="flex gap-2">
                    <button
                        onClick={() => handleAiAnalysis('normal')}
                        disabled={aiAnalysis.loading}
                        className="flex-1 h-10 rounded-full bg-emerald-400 text-white text-sm font-semibold disabled:opacity-60 active:scale-95 transition-transform"
                    >{aiAnalysis.loading ? 'AI 分析中...' : `✨ AI 近${period}天小结`}</button>
                    <button
                        onClick={() => handleAiAnalysis('deep')}
                        disabled={aiAnalysis.loading}
                        className="flex-1 h-10 rounded-full bg-blue-500 text-white text-sm font-semibold disabled:opacity-60 active:scale-95 transition-transform"
                    >{aiAnalysis.loading ? '...' : '🔍 AI 深度建议'}</button>
                </div>
            </div>

            <div className="syj-card-solid p-4">
                <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-gray-700">体重-热量关联分析</h3><span className="text-xs text-gray-400">近{period}天</span></div>
                <DualTrend trend={data.correlation.trend} />
                <p className="text-sm text-gray-500 bg-blue-50/80 rounded-2xl px-3 py-2 mt-3 leading-6">{data.correlation.relationText}</p>
            </div>
        </div>
    )
}
