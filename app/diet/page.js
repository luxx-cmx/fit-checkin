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
  const [activeMeal, setActiveMeal] = useState('all')
  const [deleteId, setDeleteId] = useState(null)
  const [showFull, setShowFull] = useState(null)

  const load = () => {
    setRecords(getDietRecords())
  }
  useEffect(() => { void load() }, [])

  const dayRecords = records.filter((r) => r.date === selectedDate)
  const totalCals = dayRecords.reduce((s, r) => s + (Number(r.calories) || 0), 0)
  const visibleMeals = activeMeal === 'all' ? MEALS : MEALS.filter((meal) => meal.id === activeMeal)

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
    <div className="syj-page md:p-6 space-y-4">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-lg font-bold text-gray-800">饮食记录</h1>
          <p className="mt-1 text-xs text-gray-400">按餐次回顾今日摄入，保持轻松记录</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-10 text-sm border border-white/80 rounded-2xl px-3 text-gray-600 outline-none focus:border-emerald-400 bg-white/85 shadow-sm"
        />
      </div>

      <div className="syj-card bg-gradient-to-br from-emerald-300 to-teal-400 p-5 text-white flex flex-col min-[380px]:flex-row min-[380px]:justify-between min-[380px]:items-center gap-4">
        <div>
          <p className="text-white/80 text-xs mb-0.5 font-medium">今日摄入</p>
          <p className="text-4xl font-black tracking-tight">
            {totalCals} <span className="text-base font-normal opacity-80">kcal</span>
          </p>
        </div>
        <div className="w-full min-[380px]:w-auto text-left min-[380px]:text-right rounded-3xl bg-white/20 px-4 py-3">
          <p className="text-white/80 text-xs">共 {dayRecords.length} 条</p>
          <p className="text-lg font-semibold mt-0.5">{dayRecords.filter((r) => r.calories).length} 项有效</p>
        </div>
      </div>

      <div className="syj-card p-1.5 bg-white/80 flex gap-1 overflow-x-auto">
        {[{ id: 'all', label: '全部', emoji: '🍽️' }, ...MEALS].map((meal) => (
          <button
            key={meal.id}
            onClick={() => setActiveMeal(meal.id)}
            className={`shrink-0 h-11 px-4 rounded-2xl text-sm font-semibold transition-all ${activeMeal === meal.id ? 'bg-emerald-400 text-white shadow-sm' : 'text-gray-500 hover:bg-white/70'}`}
          >
            {meal.emoji} {meal.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
        <Link
          href={`/diet/add?date=${encodeURIComponent(selectedDate)}`}
          className="h-12 flex items-center justify-center gap-1.5 bg-white/85 border border-dashed border-emerald-300 rounded-3xl text-emerald-600 font-semibold text-sm active:scale-95 transition-transform shadow-sm"
        >
          + 添加饮食
        </Link>
        <Link
          href={`/foods?returnTo=/diet/add&date=${encodeURIComponent(selectedDate)}`}
          className="h-12 flex items-center justify-center gap-1.5 bg-white/85 border border-dashed border-blue-200 rounded-3xl text-blue-500 font-semibold text-sm active:scale-95 transition-transform shadow-sm"
        >
          🥗 食物库
        </Link>
        <button
          onClick={handleCopyYesterday}
          className="h-12 flex items-center justify-center gap-1.5 bg-white/85 border border-dashed border-amber-200 rounded-3xl text-amber-500 font-semibold text-sm active:scale-95 transition-transform shadow-sm"
        >
          📋 复用昨日
        </button>
      </div>

      {visibleMeals.map((meal) => {
        const items = dayRecords.filter((r) => r.meal === meal.id)
        if (items.length === 0) return null
        const mealCals = items.reduce((s, r) => s + (Number(r.calories) || 0), 0)
        return (
          <div key={meal.id} className="syj-card-solid overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 bg-white/60">
              <span className="font-semibold text-gray-700 text-sm">
                {meal.emoji} {meal.label}
              </span>
              <span className="syj-pill h-7 px-3 bg-emerald-50 text-xs text-emerald-600">{mealCals} kcal</span>
            </div>
            {items.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-t border-gray-50">
                <button
                  onClick={() => setShowFull({ name: r.name, calories: r.calories })}
                  className="flex-1 min-w-0 text-left active:opacity-60"
                  title={r.name}
                >
                  <span className="block text-sm font-semibold text-gray-700 truncate">{r.name}</span>
                  <span className="mt-1 block text-[11px] text-gray-400">点击查看完整名称</span>
                </button>
                <span className="text-sm text-emerald-500 font-bold tabular-nums whitespace-nowrap">{r.calories} kcal</span>
                <Link
                  href={`/diet/add?edit=${encodeURIComponent(r.id)}&date=${encodeURIComponent(selectedDate)}`}
                  className="syj-icon-button w-8 h-8 text-gray-300 hover:text-emerald-500 text-sm"
                  aria-label="编辑"
                >✎</Link>
                <button onClick={() => setDeleteId(r.id)} className="syj-icon-button w-8 h-8 text-gray-300 hover:text-red-400 text-base" aria-label="删除">
                  🗑
                </button>
              </div>
            ))}
          </div>
        )
      })}

      {dayRecords.length === 0 && (
        <div className="syj-card bg-gradient-to-br from-emerald-50/95 to-sky-50/90 text-center py-14 text-gray-400">
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

      {dayRecords.length > 0 && activeMeal !== 'all' && visibleMeals.every((meal) => dayRecords.filter((r) => r.meal === meal.id).length === 0) && (
        <div className="syj-card-solid py-10 text-center text-gray-400">
          <div className="text-4xl mb-2">{MEALS.find((meal) => meal.id === activeMeal)?.emoji}</div>
          <p className="text-sm">这个餐次还没有记录</p>
          <Link href={`/diet/add?date=${encodeURIComponent(selectedDate)}&meal=${encodeURIComponent(activeMeal)}`} className="mt-3 inline-block text-emerald-500 text-sm font-semibold">去添加</Link>
        </div>
      )}

      <Link
        href={`/diet/add?date=${encodeURIComponent(selectedDate)}${activeMeal !== 'all' ? `&meal=${encodeURIComponent(activeMeal)}` : ''}`}
        className="md:hidden fixed left-4 right-4 bottom-[calc(5.8rem+env(safe-area-inset-bottom))] z-30 h-12 rounded-full bg-emerald-400 text-white font-semibold shadow-[0_14px_30px_rgba(45,154,117,0.24)] flex items-center justify-center active:scale-95 transition-transform"
      >
        + 添加食物
      </Link>

      <ConfirmDialog open={Boolean(deleteId)} title="确认删除这条饮食记录？" message="删除后将无法恢复。" confirmText="删除" danger onConfirm={() => handleDelete(deleteId)} onClose={() => setDeleteId(null)} />

      {/* 完整名称查看弹窗 */}
      {showFull && (
        <div onClick={() => setShowFull(null)} className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-5 max-w-sm w-full max-h-[82vh] overflow-y-auto shadow-xl">
            <p className="text-xs text-gray-400 mb-2">完整食物名称</p>
            <p className="text-sm text-gray-800 leading-6 break-words">{showFull.name}</p>
            <p className="text-emerald-500 font-bold mt-3">{showFull.calories} kcal</p>
            <button onClick={() => setShowFull(null)} className="mt-4 w-full h-10 rounded-full bg-emerald-400 text-white text-sm font-semibold">关闭</button>
          </div>
        </div>
      )}
    </div>
  )
}
