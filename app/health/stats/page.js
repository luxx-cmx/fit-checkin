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

function formatChartValue(value, compact) {
    if (!compact) return String(value)
    if (value >= 10000) return `${(value / 1000).toFixed(0)}k`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
    return String(value)
}

function BarChart({ rows, color, target, compact = false }) {
    const max = Math.max(target || 0, ...rows.map((r) => r.value), 1)
    const hasData = rows.some((r) => r.value > 0)
    return (
        <div>
            <div className="flex items-end gap-1 h-44 rounded-[1.5rem] bg-white/55 px-2 pt-4 pb-2">
                {rows.map((r) => (
                    <div key={r.date} className="flex-1 h-full flex flex-col items-center gap-2">
                        <div className="w-full flex-1 flex flex-col justify-end items-center gap-1">
                            <span className={`text-[8px] leading-none whitespace-nowrap ${r.value > 0 ? 'text-gray-400' : 'invisible'}`}>
                                {r.value > 0 ? formatChartValue(r.value, compact) : '0'}
                            </span>
                            <div className="w-full flex-1 flex items-end">
                                <div
                                    className="w-full rounded-t-[10px] transition-all duration-300"
                                    style={{
                                        height: r.value > 0 ? `${Math.max(4, Math.round((r.value / max) * 100))}%` : '0%',
                                        backgroundColor: r.value > 0 ? color : 'transparent',
                                    }}
                                />
                            </div>
                        </div>
                        <span className="text-[9px] text-gray-400">{r.date.slice(5)}</span>
                    </div>
                ))}
            </div>
            {!hasData && <p className="mt-3 text-center text-xs text-gray-400">暂无记录，新增数据后会自动生成趋势</p>}
        </div>
    )
}

function MetricCard({ title, value, unit, target, color, bg, progress }) {
    return (
        <div className={`syj-card bg-gradient-to-br ${bg} p-4`}>
            <p className="text-xs font-semibold text-gray-400">{title}</p>
            <p className="mt-1 text-3xl font-black tracking-tight" style={{ color }}>
                {value}<span className="ml-1 text-xs font-semibold text-gray-400">{unit}</span>
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
                <span>目标 {target}{unit}</span>
                <span className="font-semibold" style={{ color }}>{progress}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/75 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: color }} />
            </div>
        </div>
    )
}

function ChartCard({ title, subtitle, rows, color, target, compact }) {
    return (
        <div className="syj-card-solid p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-gray-700">{title}</h3>
                    <p className="mt-1 text-[11px] text-gray-400">{subtitle}</p>
                </div>
                <span className="syj-pill h-7 px-2.5 bg-gray-50 text-[11px] text-gray-400">目标 {target}</span>
            </div>
            <BarChart rows={rows} color={color} target={target} compact={compact} />
        </div>
    )
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
    const waterProgress = Math.min(100, Math.round((data.waterAvg / (waterTarget || 1)) * 100))
    const stepsProgress = Math.min(100, Math.round((data.stepsAvg / (stepsTarget || 1)) * 100))

    return (
        <div className="syj-page md:p-6 space-y-4">
            <PageHeader title="饮水/步数统计" subtitle="查看当日、本周、本月完成情况" fallbackHref="/profile/settings" />

            <div className="syj-card p-1.5 grid grid-cols-3 gap-1 bg-white/80">
                {[
                    ['today', '当日'],
                    ['week', '本周'],
                    ['month', '本月'],
                ].map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setPeriod(key)}
                        className={`h-11 rounded-2xl text-sm font-semibold transition-all ${period === key ? 'bg-emerald-400 text-white shadow-sm' : 'text-gray-500 hover:bg-white/70'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetricCard title="平均饮水" value={data.waterAvg} unit="ml" target={waterTarget} color="#60a5fa" bg="from-sky-50/95 to-white/85" progress={waterProgress} />
                <MetricCard title="平均步数" value={data.stepsAvg} unit="步" target={stepsTarget} color="#f59e0b" bg="from-amber-50/95 to-white/85" progress={stepsProgress} />
            </div>

            <ChartCard title="饮水趋势" subtitle="按当前周期统计每日总饮水量" rows={data.waterRows} color="#60a5fa" target={`${waterTarget}ml`} compact={period === 'month'} />
            <ChartCard title="步数趋势" subtitle="按当前周期统计每日累计步数" rows={data.stepRows} color="#f59e0b" target={`${stepsTarget}步`} compact />
        </div>
    )
}
