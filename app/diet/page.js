'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/AppDialog'
import {
  getDietRecords,
  deleteDietRecord,
  todayStr,
  yesterdayStr,
  duplicateDietFromDate,
} from '@/lib/store'

const MEALS = [
  { id: 'breakfast', label: '早餐', emoji: '🌅' },
  { id: 'lunch', label: '午餐', emoji: '☀️' },
  { id: 'dinner', label: '晚餐', emoji: '🌙' },
  { id: 'snack', label: '加餐', emoji: '🍎' },
]

export default function DietPage() {
  const [records, setRecords] = useState([])
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [deleteId, setDeleteId] = useState(null)
  const [showFull, setShowFull] = useState(null)

  const load = () => {
    setRecords(getDietRecords())
  }
  useEffect(() => { void load() }, [])

  const dayRecords = records.filter((r) => r.date === selectedDate)
  const totalCals = dayRecords.reduce((s, r) => s + (Number(r.calories) || 0), 0)

  const handleDelete = (id) => {
    deleteDietRecord(id)
    load()
    setDeleteId(null)
    toast.success('已删除，7 天内可在“回收站”恢复', {
      action: { label: '去看看', onClick: () => { window.location.href = '/profile/trash' } },
    })
  }

  const handleCopyYesterday = () => {
    const y = yesterdayStr()
    const n = duplicateDietFromDate(y)
    if (n === 0) {
      toast.info('昨日无饮食记录可复制')
    } else {
      load()
      toast.success(`已复制昨日 ${n} 条记录到今日`)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="h-11 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">饮食记录</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-9 text-sm border border-gray-200 rounded-lg px-2 text-gray-600 outline-none focus:border-emerald-400 bg-white"
        />
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-xl p-4 text-white flex justify-between items-center shadow-sm">
        <div>
          <p className="text-emerald-100 text-xs mb-0.5 font-medium">今日摄入</p>
          <p className="text-3xl font-bold">
            {totalCals} <span className="text-base font-normal opacity-80">kcal</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-emerald-100 text-xs">共 {dayRecords.length} 条</p>
          <p className="text-lg font-semibold mt-0.5">{MEALS.length} 餐次</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        <Link
          href={`/diet/add?date=${encodeURIComponent(selectedDate)}`}
          className="h-11 flex items-center justify-center gap-1.5 bg-white border border-dashed border-emerald-300 rounded-lg text-emerald-600 font-semibold text-sm active:scale-95 transition-transform"
        >
          + 添加饮食
        </Link>
        <Link
          href={`/foods?returnTo=/diet/add&date=${encodeURIComponent(selectedDate)}`}
          className="h-11 flex items-center justify-center gap-1.5 bg-white border border-dashed border-blue-200 rounded-lg text-blue-500 font-semibold text-sm active:scale-95 transition-transform"
        >
          🥗 食物库
        </Link>
        <button
          onClick={handleCopyYesterday}
          className="h-11 flex items-center justify-center gap-1.5 bg-white border border-dashed border-amber-200 rounded-lg text-amber-500 font-semibold text-sm active:scale-95 transition-transform"
        >
          📋 复用昨日
        </button>
      </div>

      {/* Records grouped by meal */}
      {MEALS.map((meal) => {
        const items = dayRecords.filter((r) => r.meal === meal.id)
        if (items.length === 0) return null
        const mealCals = items.reduce((s, r) => s + (Number(r.calories) || 0), 0)
        return (
          <div key={meal.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50">
              <span className="font-semibold text-gray-700 text-sm">
                {meal.emoji} {meal.label}
              </span>
              <span className="text-sm text-emerald-500 font-semibold">{mealCals} kcal</span>
            </div>
            {items.map((r) => (
              <div key={r.id} className="flex items-center gap-2 px-4 py-3 border-t border-gray-50">
                <button
                  onClick={() => setShowFull({ name: r.name, calories: r.calories })}
                  className="flex-1 min-w-0 text-left active:opacity-60"
                  title={r.name}
                >
                  <span className="block text-sm text-gray-700 truncate">{r.name}</span>
                </button>
                <span className="text-sm text-emerald-500 font-bold tabular-nums whitespace-nowrap">{r.calories} kcal</span>
                <Link
                  href={`/diet/add?edit=${encodeURIComponent(r.id)}&date=${encodeURIComponent(selectedDate)}`}
                  className="text-gray-300 hover:text-emerald-500 text-sm px-1"
                  aria-label="编辑"
                >✎</Link>
                <button onClick={() => setDeleteId(r.id)} className="text-gray-300 hover:text-red-400 text-base" aria-label="删除">
                  🗑
                </button>
              </div>
            ))}
          </div>
        )
      })}

      {dayRecords.length === 0 && (
        <div className="text-center py-14 text-gray-400">
          <div className="text-5xl mb-3">🍽️</div>
          <p className="text-sm">暂无饮食记录</p>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <Link href={`/diet/add?date=${encodeURIComponent(selectedDate)}`} className="text-emerald-500 font-medium">
              去添加
            </Link>
            <Link href={`/foods?returnTo=/diet/add&date=${encodeURIComponent(selectedDate)}`} className="text-blue-500 font-medium">
              逛食物库
            </Link>
          </div>
        </div>
      )}

      <ConfirmDialog open={Boolean(deleteId)} title="确认删除这条饮食记录？" message="删除后将无法恢复。" confirmText="删除" danger onConfirm={() => handleDelete(deleteId)} onClose={() => setDeleteId(null)} />

      {/* 完整名称查看弹窗 */}
      {showFull && (
        <div onClick={() => setShowFull(null)} className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <p className="text-xs text-gray-400 mb-2">完整食物名称</p>
            <p className="text-sm text-gray-800 leading-6 break-words">{showFull.name}</p>
            <p className="text-emerald-500 font-bold mt-3">{showFull.calories} kcal</p>
            <button onClick={() => setShowFull(null)} className="mt-4 w-full h-10 rounded-xl bg-emerald-400 text-white text-sm font-semibold">关闭</button>
          </div>
        </div>
      )}
    </div>
  )
}
