'use client'

import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { toast } from 'sonner'
import { getDietRecords, getHealthRecords, getProfile, getWeightRecords, trackEvent } from '@/lib/store'

function lastDays(n = 7) {
    return Array.from({ length: n }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (n - 1 - i))
        return d.toISOString().slice(0, 10)
    })
}

export default function ReportsPage() {
    const [share, setShare] = useState(null)
    const [privacy, setPrivacy] = useState('hideWeight')
    const [period, setPeriod] = useState(7)
    const profile = getProfile()
    const diet = getDietRecords()
    const weight = getWeightRecords()
    const health = getHealthRecords()
    const target = Number(profile.dailyCalories || 1800)

    const report = useMemo(() => {
        const dates = lastDays(period)
        const dailyCalories = dates.map((date) => diet.filter((r) => r.date === date).reduce((s, r) => s + Number(r.calories || 0), 0))
        const recordedDays = dailyCalories.filter(Boolean).length
        const avgCalories = recordedDays ? Math.round(dailyCalories.reduce((s, v) => s + v, 0) / recordedDays) : 0
        const hitDays = dailyCalories.filter((v) => v > 0 && v <= target).length
        const hitRate = recordedDays ? Math.round((hitDays / recordedDays) * 100) : 0
        const rangeWeights = weight.filter((r) => dates.includes(r.date)).reverse()
        const startWeight = Number(rangeWeights[0]?.weight || 0)
        const endWeight = Number(rangeWeights.at(-1)?.weight || 0)
        const weightDelta = startWeight && endWeight ? Number((endWeight - startWeight).toFixed(1)) : null
        const waterTotal = health.filter((r) => dates.includes(r.date) && r.type === 'water').reduce((s, r) => s + Number(r.value || 0), 0)
        const stepsTotal = health.filter((r) => dates.includes(r.date) && r.type === 'steps').reduce((s, r) => s + Number(r.value || 0), 0)
        const summary = hitRate >= 80
            ? `近 ${period} 天热量达标率 ${hitRate}%，记录节奏很稳定，继续保持。`
            : `近 ${period} 天热量达标率 ${hitRate}%，建议优先减少晚餐主食或加餐热量。`
        return { dates, dailyCalories, total: dailyCalories.reduce((s, v) => s + v, 0), recordedDays, avgCalories, hitRate, startWeight, endWeight, weightDelta, waterAvg: Math.round(waterTotal / period), stepsAvg: Math.round(stepsTotal / period), summary }
    }, [diet, weight, health, target, period])

    const createShare = async () => {
        const payload = { report_type: period === 30 ? 'month' : 'week', privacy, summary: report }
        trackEvent('report_share_click', { period, privacy })
        const token = localStorage.getItem('syj_token')
        if (token) {
            const res = await fetch('/api/report/share', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }).then(r => r.json()).catch(() => null)
            if (res?.data) { setShare(res.data); toast.success('分享报告已生成'); return }
        }
        setShare({ shareCode: 'local', shareUrl: '/reports', summary: report })
        toast.success('已生成本地报告')
    }

    const saveImage = () => { trackEvent('report_save_image_click', { period }); toast.info('当前 Web 版已生成报告卡片，可截图保存；后续将接入原生保存图片能力') }
    const printReport = () => { trackEvent('report_print_click', { period }); window.print() }
    const weightText = report.weightDelta === null ? '暂无足够体重数据' : `${report.weightDelta > 0 ? '+' : ''}${report.weightDelta} kg`

    return <div className="p-4 md:p-6 space-y-4"><PageHeader title="报告分享" subtitle="7天/30天报告核心数据、趋势解读与隐私分享" /><div className="grid grid-cols-2 gap-2">{[[7, '近7天'], [30, '近30天']].map(([value, label]) => <button key={value} onClick={() => setPeriod(value)} className={`py-3 rounded-2xl text-sm font-semibold ${period === value ? 'bg-emerald-400 text-white' : 'bg-white text-gray-500'}`}>{label}</button>)}</div><div className="bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl p-5 text-white shadow-lg"><p className="text-emerald-100 text-sm">近 {period} 天健康报告</p><p className="text-3xl font-bold mt-2">{report.hitRate}%</p><p className="text-sm text-emerald-50 mt-1">热量达标率 · 记录 {report.recordedDays} 天</p><p className="text-sm text-emerald-50 mt-4 leading-6">{report.summary}</p></div><div className="grid grid-cols-2 gap-3"><div className="bg-white rounded-3xl p-4 shadow-sm"><p className="text-xs text-gray-400">日均摄入</p><p className="text-2xl font-bold text-emerald-600 mt-1">{report.avgCalories}<span className="text-xs text-gray-400 ml-1">kcal</span></p></div><div className="bg-white rounded-3xl p-4 shadow-sm"><p className="text-xs text-gray-400">体重变化</p><p className="text-2xl font-bold text-blue-500 mt-1">{privacy === 'hideWeight' ? '已隐藏' : weightText}</p></div><div className="bg-white rounded-3xl p-4 shadow-sm"><p className="text-xs text-gray-400">日均饮水</p><p className="text-2xl font-bold text-blue-500 mt-1">{report.waterAvg}<span className="text-xs text-gray-400 ml-1">ml</span></p></div><div className="bg-white rounded-3xl p-4 shadow-sm"><p className="text-xs text-gray-400">日均步数</p><p className="text-2xl font-bold text-amber-500 mt-1">{report.stepsAvg}<span className="text-xs text-gray-400 ml-1">步</span></p></div></div><div className="bg-white rounded-3xl p-4 shadow-sm space-y-3"><h3 className="font-semibold text-gray-700">近{period}天热量</h3><div className="flex items-end gap-1 h-24">{report.dailyCalories.map((v, i) => <div key={report.dates[i]} className="flex-1 flex flex-col items-center gap-1"><div className="w-full rounded-t bg-emerald-300" style={{ height: `${Math.max(6, Math.min(100, v / Math.max(target, 1) * 100))}%` }} />{period === 7 || i % 5 === 0 ? <span className="text-[10px] text-gray-400">{report.dates[i].slice(5)}</span> : <span className="text-[10px] text-transparent">·</span>}</div>)}</div></div><div className="bg-white rounded-3xl p-4 shadow-sm space-y-3"><h3 className="font-semibold text-gray-700">分享权限</h3><label className="flex items-center gap-2 text-sm text-gray-500"><input type="radio" checked={privacy === 'hideWeight'} onChange={() => setPrivacy('hideWeight')} />隐藏具体体重，仅展示变化趋势</label><label className="flex items-center gap-2 text-sm text-gray-500"><input type="radio" checked={privacy === 'all'} onChange={() => setPrivacy('all')} />分享全部报告数据</label></div><div className="grid grid-cols-3 gap-3"><button onClick={createShare} className="py-3 rounded-2xl bg-emerald-400 text-white font-semibold active:scale-95 transition-transform">分享</button><button onClick={saveImage} className="py-3 rounded-2xl bg-white text-emerald-600 border border-emerald-200 font-semibold active:scale-95 transition-transform">保存图片</button><button onClick={printReport} className="py-3 rounded-2xl bg-white text-blue-600 border border-blue-100 font-semibold active:scale-95 transition-transform">打印</button></div>{share && <div className="bg-white rounded-3xl p-4 shadow-sm"><p className="font-semibold text-gray-700">分享链接</p><p className="text-sm text-emerald-600 mt-2 break-all">{share.shareUrl}</p><p className="text-xs text-gray-400 mt-2">分享码：{share.shareCode}</p></div>}<div className="bg-emerald-50 rounded-3xl p-4 border border-emerald-100"><p className="text-sm text-emerald-700 leading-6">下周建议：继续保持记录频率，并根据本周达标率微调热量目标；分享报告可获得打卡激励。</p></div></div>
}
