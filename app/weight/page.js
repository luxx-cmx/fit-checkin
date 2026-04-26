'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/AppDialog'
import { getWeightRecords, deleteWeightRecord, getProfile } from '@/lib/store'

function WeightChart({ data, height = 140 }) {
  if (!data || data.length < 2)
    return (
      <div className="flex items-center justify-center text-gray-300 text-sm" style={{ height }}>
        至少需要2条记录
      </div>
    )
  const vals = data.map((d) => d.v)
  const min = Math.min(...vals) - 1
  const max = Math.max(...vals) + 1
  const range = max - min || 1
  const W = 320,
    H = height
  const px = (i) => (i / (data.length - 1)) * (W - 24) + 12
  const py = (v) => H - ((v - min) / range) * (H - 24) - 12
  const pts = data.map((d, i) => `${px(i)},${py(d.v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" height={height}>
      <defs>
        <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1="0"
          y1={py(min + range * p)}
          x2={W}
          y2={py(min + range * p)}
          stroke="#f3f4f6"
          strokeWidth="1"
        />
      ))}
      <polygon fill="url(#wgrad)" points={`12,${H} ${pts} ${W - 12},${H}`} />
      <polyline fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(d.v)} r="4" fill="white" stroke="#16a34a" strokeWidth="2" />
          <text x={px(i)} y={py(d.v) - 9} textAnchor="middle" fontSize="8.5" fill="#6b7280">
            {d.v}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function WeightPage() {
  const [records, setRecords] = useState([])
  const [profile, setProfile] = useState({})
  const [deleteId, setDeleteId] = useState(null)

  const load = () => {
    setRecords(getWeightRecords())
    setProfile(getProfile())
  }
  useEffect(() => { void load() }, [])

  const handleDelete = (id) => {
    deleteWeightRecord(id)
    load()
    setDeleteId(null)
    toast.success('已删除')
  }

  const chartData = [...records]
    .slice(0, 30)
    .reverse()
    .map((r) => ({ v: parseFloat(r.weight), date: r.date }))

  const latest = records[0]
  const prev = records[1]
  const diff = latest && prev ? (parseFloat(latest.weight) - parseFloat(prev.weight)).toFixed(1) : null

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="h-11 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">体重记录</h1>
        <Link href="/weight/add" className="h-9 px-3 rounded-lg bg-emerald-400 text-white text-sm font-semibold flex items-center active:scale-95 transition-transform">录入</Link>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-400">当前体重</p>
          <p className="text-4xl font-bold text-green-600 mt-1">
            {latest?.weight ?? '--'} <span className="text-lg font-normal text-gray-400">kg</span>
          </p>
          {diff !== null && (
            <p className={`text-sm mt-1.5 font-medium ${parseFloat(diff) > 0 ? 'text-red-500' : parseFloat(diff) < 0 ? 'text-green-600' : 'text-gray-400'}`}>
              {parseFloat(diff) > 0 ? '↑ +' : parseFloat(diff) < 0 ? '↓ ' : '— '}
              {diff} kg（较上次）
            </p>
          )}
        </div>
        {profile.targetWeight && (
          <div className="text-right bg-green-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400">目标</p>
            <p className="text-xl font-bold text-green-600">{profile.targetWeight} kg</p>
            {latest && (
              <p className="text-xs text-gray-400 mt-0.5">
                差 {Math.abs(parseFloat(latest.weight) - parseFloat(profile.targetWeight)).toFixed(1)} kg
              </p>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">体重趋势（近30天）</h3>
          <WeightChart data={chartData} />
        </div>
      )}

      {/* Add button */}
      <Link
        href="/weight/add"
        className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-dashed border-green-300 rounded-lg text-green-600 font-medium active:scale-95 transition-transform"
      >
        + 记录体重
      </Link>

      {/* Records list */}
      {records.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50">
            <span className="font-semibold text-gray-700 text-sm">历史记录（共 {records.length} 条）</span>
          </div>
          {records.map((r, i) => {
            const prevW = records[i + 1]?.weight
            const d = prevW ? (parseFloat(r.weight) - parseFloat(prevW)).toFixed(1) : null
            return (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
                <div>
                  <span className="text-sm font-semibold text-gray-800">{r.weight} kg</span>
                  {r.note && <span className="text-xs text-gray-400 ml-2">{r.note}</span>}
                  {d !== null && (
                    <span
                      className={`text-xs ml-2 font-medium ${parseFloat(d) > 0 ? 'text-red-400' : parseFloat(d) < 0 ? 'text-green-500' : 'text-gray-300'}`}
                    >
                      {parseFloat(d) > 0 ? '+' : ''}
                      {d}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{r.date}</span>
                  <button onClick={() => setDeleteId(r.id)} className="text-gray-300 hover:text-red-400">
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-14 text-gray-400">
          <div className="text-5xl mb-3">⚖️</div>
          <p className="text-sm">暂无体重记录</p>
          <Link href="/weight/add" className="inline-block mt-4 text-emerald-500 font-medium text-sm">
            去记录
          </Link>
        </div>
      )}

      <ConfirmDialog open={Boolean(deleteId)} title="确认删除这条体重记录？" message="删除后趋势图会同步更新。" confirmText="删除" danger onConfirm={() => handleDelete(deleteId)} onClose={() => setDeleteId(null)} />
    </div>
  )
}
