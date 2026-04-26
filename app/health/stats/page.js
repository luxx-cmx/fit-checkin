'use client'

import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { getHealthRecords, getProfile } from '@/lib/store'

function daysOf(period) {
    const n = period === 'month' ? 30 : period === 'week' ? 7 : 1
    return Array.from({ length: n }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (n - 1 - i))
        return d.toISOString().slice(0, 10)
    })
}

function BarChart({ rows, color, target }) {
    const max = Math.max(target || 0, ...rows.map((r) => r.value), 1)
    return <div className="flex items-end gap-1 h-32">{rows.map((r) => <div key={r.date} className="flex-1 flex flex-col items-center gap-1"><div className="w-full rounded-t" style={{ height: `${Math.max(4, Math.round((r.value / max) * 100))}%`, backgroundColor: color }} /><span className="text-[9px] text-gray-400">{r.date.slice(5)}</span></div>)}</div>
}

export default function HealthStatsPage() {
    const [period, setPeriod] = useState('week')
    const profile = getProfile()
    const records = getHealthRecords()
    const data = useMemo(() => {
        const dates = daysOf(period)
        const waterRows = dates.map((date) => ({ date, value: records.filter((r) => r.date === date && r.type === 'water').reduce((s, r) => s + Number(r.value || 0), 0) }))
        const stepRows = dates.map((date) => ({ date, value: records.filter((r) => r.date === date && r.type === 'steps').reduce((s, r) => s + Number(r.value || 0), 0) }))
        const waterAvg = Math.round(waterRows.reduce((s, r) => s + r.value, 0) / dates.length)
        const stepsAvg = Math.round(stepRows.reduce((s, r) => s + r.value, 0) / dates.length)
        return { waterRows, stepRows, waterAvg, stepsAvg }
    }, [period, records])
    const waterTarget = Number(profile.dailyWater || 2000)
    const stepsTarget = Number(profile.dailySteps || 8000)
    return <div className="p-4 space-y-4"><PageHeader title="饮水/步数统计" subtitle="查看当日、本周、本月完成情况" fallbackHref="/profile/settings" /><div className="grid grid-cols-3 gap-2">{[['today', '当日'], ['week', '本周'], ['month', '本月']].map(([k, l]) => <button key={k} onClick={() => setPeriod(k)} className={`py-3 rounded-2xl text-sm font-semibold ${period === k ? 'bg-emerald-400 text-white' : 'bg-white text-gray-500'}`}>{l}</button>)}</div><div className="grid grid-cols-2 gap-3"><div className="bg-white rounded-3xl p-4 shadow-sm"><p className="text-xs text-gray-400">平均饮水</p><p className="text-2xl font-bold text-blue-500 mt-1">{data.waterAvg}<span className="text-xs text-gray-400 ml-1">ml</span></p><p className="text-xs text-gray-400 mt-1">目标 {waterTarget}ml</p></div><div className="bg-white rounded-3xl p-4 shadow-sm"><p className="text-xs text-gray-400">平均步数</p><p className="text-2xl font-bold text-amber-500 mt-1">{data.stepsAvg}<span className="text-xs text-gray-400 ml-1">步</span></p><p className="text-xs text-gray-400 mt-1">目标 {stepsTarget}步</p></div></div><div className="bg-white rounded-3xl p-4 shadow-sm"><h3 className="font-semibold text-gray-700 mb-3">饮水趋势</h3><BarChart rows={data.waterRows} color="#60a5fa" target={waterTarget} /></div><div className="bg-white rounded-3xl p-4 shadow-sm"><h3 className="font-semibold text-gray-700 mb-3">步数趋势</h3><BarChart rows={data.stepRows} color="#f59e0b" target={stepsTarget} /></div></div>
}
