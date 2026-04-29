'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/AppDialog'
import { EmptyState } from '@/components/EmptyState'
import { getChartTags, getWeightRecords, deleteWeightRecord, getProfile, toggleChartTag } from '@/lib/store'

function WeightChart({ data, targetWeight, selectedIndex, onSelect, height = 180 }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.5rem] bg-white/60 text-gray-400 text-sm" style={{ height }}>
        <span className="text-3xl mb-2">⚖️</span>
        至少需要 2 条记录生成趋势
      </div>
    )
  }

  const target = Number(targetWeight) || null
  const vals = target ? [...data.map((d) => d.v), target] : data.map((d) => d.v)
  const min = Math.min(...vals) - 1
  const max = Math.max(...vals) + 1
  const range = max - min || 1
  const W = 320
  const H = height
  const px = (i) => (i / (data.length - 1)) * (W - 24) + 12
  const py = (v) => H - ((v - min) / range) * (H - 24) - 12
  const pts = data.map((d, i) => `${px(i)},${py(d.v)}`).join(' ')
  const targetY = target ? py(target) : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" height={height} role="img" aria-label="体重趋势图">
      <defs>
        <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--syj-primary)" stopOpacity="0.24" />
          <stop offset="100%" stopColor="var(--syj-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p} x1="0" y1={py(min + range * p)} x2={W} y2={py(min + range * p)} stroke="#f3f4f6" strokeWidth="1" />
      ))}
      {targetY !== null && (
        <g>
          <line x1="8" y1={targetY} x2={W - 8} y2={targetY} stroke="#94a3b8" strokeWidth="1.3" strokeDasharray="5 5" />
          <text x={W - 10} y={Math.max(10, targetY - 5)} textAnchor="end" fontSize="9" fill="#94a3b8">目标 {target}</text>
        </g>
      )}
      <polygon fill="url(#wgrad)" points={`12,${H} ${pts} ${W - 12},${H}`} />
      <polyline fill="none" stroke="var(--syj-primary)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      {data.map((d, i) => (
        <g key={i} onClick={() => onSelect?.(i)} className="cursor-pointer">
          <circle cx={px(i)} cy={py(d.v)} r={selectedIndex === i ? '6' : '4'} fill="white" stroke={selectedIndex === i ? '#f59e0b' : 'var(--syj-primary)'} strokeWidth="2.2" />
          <text x={px(i)} y={py(d.v) - 9} textAnchor="middle" fontSize="8.5" fill="#6b7280">
            {d.v}
          </text>
        </g>
      ))}
    </svg>
  )
}

function SummaryCard({ label, value, unit, hint, accent = 'text-emerald-600' }) {
  return (
    <div className="syj-card-solid p-4">
      <p className="text-xs font-semibold text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-black tracking-tight ${accent}`}>
        <span className="syj-num">{value}</span><span className="ml-1 text-xs font-semibold text-gray-400">{unit}</span>
      </p>
      <p className="mt-2 text-[11px] text-gray-400 leading-5">{hint}</p>
    </div>
  )
}

export default function WeightPage() {
  const [records, setRecords] = useState([])
  const [profile, setProfile] = useState({})
  const [deleteId, setDeleteId] = useState(null)
  const [period, setPeriod] = useState(30)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [activeTags, setActiveTags] = useState([])

  const load = () => {
    setRecords(getWeightRecords())
    setProfile(getProfile())
  }
  useEffect(() => { void load() }, [])

  const handleDelete = (id) => {
    deleteWeightRecord(id)
    load()
    setDeleteId(null)
    toast.success('已删除，7 天内可在“回收站”恢复', {
      action: { label: '去看看', onClick: () => { window.location.href = '/profile/trash' } },
    })
  }

  const chartData = [...records]
    .slice(0, period)
    .reverse()
    .map((r) => ({ v: parseFloat(r.weight), date: r.date }))

  const latest = records[0]
  const prev = records[1]
  const diff = latest && prev ? (parseFloat(latest.weight) - parseFloat(prev.weight)).toFixed(1) : null
  const targetWeight = Number(profile.targetWeight || profile.target_weight || 0) || null
  const weights = records.map((r) => parseFloat(r.weight)).filter(Number.isFinite)
  const avgWeight = weights.length ? (weights.reduce((sum, value) => sum + value, 0) / weights.length).toFixed(1) : '--'
  const lowestWeight = weights.length ? Math.min(...weights).toFixed(1) : '--'
  const latestWeight = latest ? parseFloat(latest.weight) : null
  const gapToTarget = latestWeight != null && targetWeight ? Math.abs(latestWeight - targetWeight).toFixed(1) : '--'
  const selectedPoint = chartData[selectedIndex ?? chartData.length - 1]
  const selectedDate = selectedPoint?.date
  const handleTagToggle = (tag) => {
    if (!selectedDate) return
    setActiveTags(toggleChartTag(selectedDate, tag))
  }

  useEffect(() => {
    if (selectedDate) setActiveTags(getChartTags(selectedDate))
  }, [selectedDate])

  return (
    <div className="syj-page md:p-6 space-y-4">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-lg font-bold text-gray-800">体重记录</h1>
          <p className="mt-1 text-xs text-gray-400">关注趋势，不被单日波动打乱节奏</p>
        </div>
        <Link href="/weight/add" className="syj-pill h-10 px-4 bg-emerald-400 text-white text-sm shadow-sm active:scale-95 transition-transform">录入</Link>
      </div>

      <div className="syj-card bg-gradient-to-br from-emerald-50/95 to-white/85 p-5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-400">当前体重</p>
          <p className="text-4xl font-black text-emerald-600 mt-1 tracking-tight">
            <span className="syj-num">{latest?.weight ?? '--'}</span> <span className="text-lg font-normal text-gray-400">kg</span>
          </p>
          {diff !== null && (
            <p className={`text-sm mt-1.5 font-medium ${parseFloat(diff) > 0 ? 'text-orange-500' : parseFloat(diff) < 0 ? 'text-green-600' : 'text-gray-400'}`}>
              {parseFloat(diff) > 0 ? '→ +' : parseFloat(diff) < 0 ? '↓ ' : '— '}
              {diff} kg（较上次）
            </p>
          )}
        </div>
        {targetWeight && (
          <div className="w-full sm:w-auto text-left sm:text-right bg-white/75 rounded-3xl px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-400">目标</p>
            <p className="text-xl font-bold text-emerald-600"><span className="syj-num">{targetWeight}</span> kg</p>
            {latest && <p className="text-xs text-gray-400 mt-0.5">距目标 {gapToTarget} kg</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard label="平均体重" value={avgWeight} unit="kg" hint={`基于 ${records.length} 条历史记录`} />
        <SummaryCard label="历史最低" value={lowestWeight} unit="kg" hint="用于观察阶段性成果" accent="text-blue-500" />
        <SummaryCard label="目标距离" value={gapToTarget} unit="kg" hint={targetWeight ? `目标 ${targetWeight} kg` : '设置目标后显示差距'} accent="text-amber-500" />
      </div>

      <div className="syj-card-solid p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">体重趋势</h3>
            <p className="mt-1 text-[11px] text-gray-400">点击点位查看当日体重，虚线为目标体重</p>
          </div>
          <div className="flex w-full sm:w-auto gap-1 bg-gray-50/80 p-1 rounded-2xl">
            {[7, 30, 90].map((p) => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setSelectedIndex(null) }}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors ${period === p ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
              >近{p === 90 ? '3个月' : p + '天'}</button>
            ))}
          </div>
        </div>
        <WeightChart data={chartData} targetWeight={targetWeight} selectedIndex={selectedIndex ?? chartData.length - 1} onSelect={setSelectedIndex} />
        {selectedPoint && (
          <div className="mt-3 rounded-3xl bg-emerald-50/75 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
              <span>{selectedPoint.date}</span>
              <span className="font-bold text-emerald-600"><span className="syj-num">{selectedPoint.v}</span> kg</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {['经期', '熔夜', '聚餐', '水肿'].map((tag) => (
                <button key={tag} onClick={() => handleTagToggle(tag)} className={`h-8 px-3 rounded-full text-xs font-semibold active:scale-95 transition-transform ${activeTags.includes(tag) ? 'bg-emerald-400 text-white shadow-sm' : 'bg-white/80 text-gray-500 border border-gray-100'}`}>
                  {tag}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400">点入标签为当日体重波动补充说明，不影响趋势计算</p>
          </div>
        )}
      </div>

      <Link
        href="/weight/add"
        className="w-full h-12 flex items-center justify-center gap-2 bg-white/80 border border-dashed border-emerald-300 rounded-3xl text-emerald-600 font-semibold active:scale-95 transition-transform"
      >
        + 记录体重
      </Link>

      {records.length > 0 ? (
        <div className="syj-card-solid overflow-hidden">
          <div className="px-4 py-3 bg-white/60 flex items-center justify-between">
            <span className="font-semibold text-gray-700 text-sm">历史记录</span>
            <span className="text-[11px] text-gray-400">共 {records.length} 条</span>
          </div>
          {records.map((r, i) => {
            const prevW = records[i + 1]?.weight
            const d = prevW ? (parseFloat(r.weight) - parseFloat(prevW)).toFixed(1) : null
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-50">
                <div>
                  <span className="text-sm font-semibold text-gray-800"><span className="syj-num">{r.weight}</span> kg</span>
                  {r.note && <span className="text-xs text-gray-400 ml-2">{r.note}</span>}
                  {d !== null && (
                    <span className={`text-xs ml-2 font-medium ${parseFloat(d) > 0 ? 'text-orange-400' : parseFloat(d) < 0 ? 'text-green-500' : 'text-gray-300'}`}>
                      {parseFloat(d) > 0 ? '+' : ''}{d}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{r.date}</span>
                  <button onClick={() => setDeleteId(r.id)} className="syj-icon-button w-8 h-8 text-gray-300 hover:text-red-400">🗑</button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon="⚖️" title="暂无体重记录" desc="记录起点，稳步看见变化" actionLabel="去记录" action={() => { window.location.href = '/weight/add' }} />
      )}

      <ConfirmDialog open={Boolean(deleteId)} title="确认删除这条体重记录？" message="删除后趋势图会同步更新。" confirmText="删除" danger onConfirm={() => handleDelete(deleteId)} onClose={() => setDeleteId(null)} />
    </div>
  )
}
