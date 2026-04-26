'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  getDietRecords,
  getWeightRecords,
  getHealthRecords,
  todayStr,
} from '@/lib/store'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function buildMatrix(year, month) {
  // month: 0-11
  const first = new Date(year, month, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7) cells.push(null)
  return cells
}

function pad(n) {
  return String(n).padStart(2, '0')
}

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(todayStr())
  const [diet, setDiet] = useState([])
  const [weight, setWeight] = useState([])
  const [health, setHealth] = useState([])

  useEffect(() => {
    setDiet(getDietRecords())
    setWeight(getWeightRecords())
    setHealth(getHealthRecords())
  }, [])

  const cells = useMemo(() => buildMatrix(year, month), [year, month])

  const markSet = useMemo(() => {
    const s = new Set()
    diet.forEach((r) => s.add(r.date))
    weight.forEach((r) => s.add(r.date))
    health.forEach((r) => s.add(r.date))
    return s
  }, [diet, weight, health])

  const prevMonth = () => {
    if (month === 0) {
      setYear(year - 1)
      setMonth(11)
    } else setMonth(month - 1)
  }
  const nextMonth = () => {
    if (month === 11) {
      setYear(year + 1)
      setMonth(0)
    } else setMonth(month + 1)
  }

  const dietDay = diet.filter((r) => r.date === selected)
  const weightDay = weight.filter((r) => r.date === selected)
  const healthDay = health.filter((r) => r.date === selected)
  const totalCals = dietDay.reduce((s, r) => s + Number(r.calories || 0), 0)

  return (
    <div className="p-4 space-y-4">
      <div className="pt-3">
        <h1 className="text-xl font-bold text-gray-800">日历视图</h1>
        <p className="text-xs text-gray-400 mt-0.5">绿点表示当天有记录</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500">
            ‹
          </button>
          <span className="font-semibold text-gray-700">
            {year} 年 {month + 1} 月
          </span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500">
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`
            const hasRecord = markSet.has(dateStr)
            const isSelected = selected === dateStr
            const isToday = todayStr() === dateStr
            return (
              <button
                key={i}
                onClick={() => setSelected(dateStr)}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                  isSelected
                    ? 'bg-green-600 text-white'
                    : isToday
                    ? 'bg-green-50 text-green-700 font-semibold'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span>{d}</span>
                {hasRecord && (
                  <span
                    className={`w-1 h-1 rounded-full mt-0.5 ${
                      isSelected ? 'bg-white' : 'bg-green-500'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700">{selected}</span>
          <span className="text-xs text-gray-400">
            {dietDay.length + weightDay.length + healthDay.length} 条记录
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Link href="/diet" className="bg-green-50 rounded-xl py-3">
            <div className="text-lg font-bold text-green-700">{totalCals}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">kcal · 饮食</div>
          </Link>
          <Link href="/weight" className="bg-blue-50 rounded-xl py-3">
            <div className="text-lg font-bold text-blue-700">
              {weightDay[0]?.weight ?? '—'}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">kg · 体重</div>
          </Link>
          <Link href="/health" className="bg-orange-50 rounded-xl py-3">
            <div className="text-lg font-bold text-orange-700">{healthDay.length}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">条 · 健康</div>
          </Link>
        </div>

        {dietDay.length === 0 && weightDay.length === 0 && healthDay.length === 0 && (
          <div className="text-center text-gray-400 text-xs py-4">当日无记录</div>
        )}

        {dietDay.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-1">饮食</div>
            {dietDay.map((r) => (
              <div key={r.id} className="flex justify-between text-sm py-1">
                <span className="text-gray-700">{r.name}</span>
                <span className="text-green-600">{r.calories} kcal</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
