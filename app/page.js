'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  addHealthRecord,
  getDietRecords,
  getHealthRecords,
  getTodayCalories,
  getTodayDiet,
  getLatestWeight,
  getProfile,
  getWeightRecords,
  todayStr,
  yesterdayStr,
  getTodayHealth,
  trackEvent,
  recordAdvice,
} from '@/lib/store'
import { generateAdvice } from '@/lib/advice'
import { SkeletonCard } from '@/components/Skeleton'

function MiniLineChart({ data, color = '#16a34a', height = 70 }) {
  if (!data || data.length < 2)
    return (
      <div className="flex items-center justify-center text-gray-300 text-xs" style={{ height }}>
        暂无足够数据
      </div>
    )
  const min = Math.min(...data) - 0.2
  const max = Math.max(...data) + 0.2
  const range = max - min || 1
  const W = 300,
    H = height
  const px = (i) => (i / (data.length - 1)) * (W - 16) + 8
  const py = (v) => H - ((v - min) / range) * (H - 16) - 8
  const pts = data.map((v, i) => `${px(i)},${py(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" height={height}>
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill="url(#grad)" points={`8,${H} ${pts} ${W - 8},${H}`} />
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      {data.map((v, i) => (
        <circle key={i} cx={px(i)} cy={py(v)} r="3.5" fill="white" stroke={color} strokeWidth="2" />
      ))}
    </svg>
  )
}

function CalorieRing({ consumed, target }) {
  const pct = Math.min(consumed / (target || 1800), 1)
  const r = 38,
    cx = 50,
    cy = 50
  const circ = 2 * Math.PI * r
  const color = pct > 1 ? '#ef4444' : pct > 0.85 ? '#f59e0b' : '#16a34a'
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${pct * circ} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="50" y="46" textAnchor="middle" fontSize="13" fontWeight="bold" fill={color}>
        {consumed}
      </text>
      <text x="50" y="60" textAnchor="middle" fontSize="9" fill="#9ca3af">
        /{target}
      </text>
    </svg>
  )
}

const MEAL_LABEL = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' }

function changeText(current, previous, unit = '') {
  if (current === null || current === undefined || current === '' || previous === null || previous === undefined || previous === '') return '暂无昨日对比'
  const delta = Number(current) - Number(previous)
  if (!Number.isFinite(delta)) return '暂无昨日对比'
  if (Math.abs(delta) < 0.05) return '与昨日持平 →'
  const arrow = delta > 0 ? '↑' : '↓'
  const sign = delta > 0 ? '+' : ''
  return `较昨日 ${arrow} ${sign}${delta.toFixed(unit === 'kg' ? 1 : 0)}${unit}`
}

function changeTone(current, previous, preferDown = false) {
  if (current === null || current === undefined || previous === null || previous === undefined) return 'text-gray-300'
  const delta = Number(current) - Number(previous)
  if (Math.abs(delta) < 0.05) return 'text-gray-400'
  const good = preferDown ? delta < 0 : delta > 0
  return good ? 'text-emerald-500' : 'text-amber-500'
}

export default function Home() {
  const [d, setD] = useState({
    calories: 0,
    target: 1800,
    waterTarget: 2000,
    stepsTarget: 8000,
    weight: null,
    water: 0,
    steps: 0,
    weightTrend: [],
    weightTrend3: [],
    recentDiet: [],
    advice: '',
    yesterdayCalories: 0,
    yesterdayWeight: null,
    yesterdayWater: 0,
    yesterdaySteps: 0,
  })
  const [quick, setQuick] = useState(null)
  const [syncFailed, setSyncFailed] = useState(false)
  const [adviceOpen, setAdviceOpen] = useState(false)
  const [aiAdvice, setAiAdvice] = useState({ loading: false, text: '', costMs: null })
  // 首页核心入口：长按拖拽排序（PM 文档「个性化适配」）
  const ENTRY_DEFS = {
    diet: { href: '/diet/add', icon: '🍱', label: '饮食记录', sub: '选餐次 → 录食物 → 保存', bg: 'bg-emerald-50' },
    weight: { href: '/weight/add', icon: '⚖️', label: '体重录入', sub: '默认带入上一次体重', bg: 'bg-blue-50' },
  }
  const ENTRY_KEYS = ['diet', 'weight']
  const [entryOrder, setEntryOrder] = useState(ENTRY_KEYS)
  const [editEntries, setEditEntries] = useState(false)
  const [pickedEntry, setPickedEntry] = useState(null)
  const longPressTimer = useRef(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('home_entry_order')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length === ENTRY_KEYS.length && arr.every((k) => ENTRY_KEYS.includes(k))) {
          setEntryOrder(arr)
        }
      }
    } catch { }
  }, [])
  const persistOrder = (next) => {
    setEntryOrder(next)
    try { localStorage.setItem('home_entry_order', JSON.stringify(next)) } catch { }
  }
  const startLongPress = () => {
    if (editEntries) return
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      setEditEntries(true)
      trackEvent('home_entry_edit_enter')
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20)
    }, 500)
  }
  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }
  const handleEntryTap = (key, e) => {
    if (!editEntries) return
    e.preventDefault()
    if (pickedEntry == null) { setPickedEntry(key); return }
    if (pickedEntry === key) { setPickedEntry(null); return }
    const next = [...entryOrder]
    const i = next.indexOf(pickedEntry)
    const j = next.indexOf(key)
    if (i >= 0 && j >= 0) { [next[i], next[j]] = [next[j], next[i]]; persistOrder(next) }
    setPickedEntry(null)
    trackEvent('home_entry_swap', { a: pickedEntry, b: key })
  }
  const finishEditEntries = () => { setEditEntries(false); setPickedEntry(null) }

  const loadDashboard = () => {
    const profile = getProfile()
    const yesterday = yesterdayStr()
    const calories = getTodayCalories()
    const weight = getLatestWeight()
    const dietRecords = getDietRecords()
    const weightRecords = getWeightRecords()
    const healthRecords = getHealthRecords()
    const health = getTodayHealth()
    const water = health.filter((h) => h.type === 'water').reduce((s, h) => s + (Number(h.value) || 0), 0)
    const steps = health.filter((h) => h.type === 'steps').reduce((s, h) => s + (Number(h.value) || 0), 0)
    const yesterdayCalories = dietRecords.filter((r) => r.date === yesterday).reduce((s, r) => s + (Number(r.calories) || 0), 0)
    const yesterdayHealth = healthRecords.filter((h) => h.date === yesterday)
    const yesterdayWater = yesterdayHealth.filter((h) => h.type === 'water').reduce((s, h) => s + (Number(h.value) || 0), 0)
    const yesterdaySteps = yesterdayHealth.filter((h) => h.type === 'steps').reduce((s, h) => s + (Number(h.value) || 0), 0)
    const weightAtOrBefore = (date) => [...weightRecords].reverse().filter((r) => r.date <= date).at(-1)?.weight || null
    const yesterdayWeight = weightAtOrBefore(yesterday)
    const wr = weightRecords.slice(0, 20).reverse()
    const targetCalories = Number(profile.dailyCalories) || 1800
    const waterTarget = Number(profile.dailyWater) || 2000
    const stepsTarget = Number(profile.dailySteps) || 8000
    const weightDelta = (weight != null && yesterdayWeight != null) ? Number((Number(weight) - Number(yesterdayWeight)).toFixed(2)) : null
    const advice = generateAdvice({
      calories,
      target: targetCalories,
      weightDelta,
      water,
      waterTarget,
      steps,
      stepsTarget,
    })
    if (advice) recordAdvice(advice, { calories, weight, water, steps })
    setD({
      calories,
      target: targetCalories,
      waterTarget,
      stepsTarget,
      weight,
      water,
      steps,
      weightTrend: wr.map((r) => parseFloat(r.weight)),
      weightTrend3: wr.slice(-3).map((r) => parseFloat(r.weight)),
      recentDiet: getTodayDiet().slice(0, 5),
      advice,
      yesterdayCalories,
      yesterdayWeight,
      yesterdayWater,
      yesterdaySteps,
    })
  }

  useEffect(() => {
    loadDashboard()
    const onFocus = () => loadDashboard()
    const onChanged = () => loadDashboard()
    const onSyncState = (event) => {
      if (event.detail?.status === 'failed') {
        setSyncFailed(true)
        toast.error('云同步失败，已保留本地数据，可稍后重试')
      }
      if (event.detail?.status === 'success') setSyncFailed(false)
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('syj:data-changed', onChanged)
    window.addEventListener('syj:sync-state', onSyncState)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('syj:data-changed', onChanged)
      window.removeEventListener('syj:sync-state', onSyncState)
    }
  }, [])

  const openQuick = (type) => {
    setQuick({ type, value: type === 'water' ? 300 : d.steps || '', time: new Date().toTimeString().slice(0, 5) })
  }

  const confirmQuick = () => {
    if (!quick) return
    const value = Number(quick.value)
    if (quick.type === 'water' && (!value || value < 10 || value > 5000)) return toast.error('请输入合理饮水量')
    if (quick.type === 'steps' && (value < 0 || value > 50000)) return toast.error('请输入合理步数')
    addHealthRecord({ type: quick.type, value: String(value), date: todayStr(), note: quick.type === 'water' ? `饮用时间 ${quick.time}` : '手动录入步数' })
    const nextWater = quick.type === 'water' ? d.water + value : d.water
    const nextSteps = quick.type === 'steps' ? value : d.steps
    trackEvent('health_quick_add', { type: quick.type, value })
    setD((prev) => ({ ...prev, water: nextWater, steps: nextSteps }))
    setQuick(null)
    toast.success(quick.type === 'water' ? `饮水已更新，今日已饮 ${nextWater}ml` : `步数已更新，今日 ${nextSteps} 步`)
  }

  const handleAiAnalysis = async (mode = 'normal') => {
    if (aiAdvice.loading) return
    setAiAdvice((s) => ({ ...s, loading: true, text: '' }))
    setAdviceOpen(true)
    try {
      const res = await fetch('/api/v1/ai/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calories: d.calories,
          target: d.target,
          water: d.water || null,
          waterTarget: d.waterTarget,
          steps: d.steps || null,
          stepsTarget: d.stepsTarget,
          weight: d.weight,
          weightDelta: d.weight != null && d.yesterdayWeight != null
            ? Number((Number(d.weight) - Number(d.yesterdayWeight)).toFixed(2))
            : null,
          recentFoods: d.recentDiet.map((r) => r.name),
          mode,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setAiAdvice({ loading: false, text: data.text, costMs: data.costMs })
        trackEvent('ai_health_analysis', { mode, costMs: data.costMs })
      } else {
        setAiAdvice({ loading: false, text: '', costMs: null })
        toast.error(data.msg || 'AI 分析失败，请稍后重试')
      }
    } catch (e) {
      setAiAdvice({ loading: false, text: '', costMs: null })
      toast.error('AI 分析失败，请稍后重试')
    }
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 6) return '夜深了，注意休息 🌙'
    if (h < 11) return '早上好，记得吃早饭 ☀️'
    if (h < 14) return '午餐时间到了 🍱'
    if (h < 18) return '下午好，坚持加油 💪'
    return '晚上好，记得记录今天的数据 🌟'
  }

  const dateStr = () => {
    const dt = new Date()
    const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${dt.getMonth() + 1}月${dt.getDate()}日 ${weeks[dt.getDay()]}`
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      {/* 小程序式标题栏 */}
      <div className="md:hidden -mx-4 -mt-4 h-11 bg-emerald-400 text-white relative flex items-center justify-center shadow-sm">
        <span className="absolute left-4 text-[11px] text-white/85">{dateStr()}</span>
        <h1 className="text-lg font-bold">食愈记</h1>
        <Link href="/profile/settings" className="absolute right-3 w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center active:scale-95 transition-transform">⚙️</Link>
      </div>

      <div className="hidden md:flex h-11 items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">首页</h1>
          <p className="text-xs text-gray-400 mt-0.5">{greeting()} · 核心功能一键直达</p>
        </div>
        <Link href="/profile/settings" className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-emerald-600">⚙️</Link>
      </div>

      {/* 核心入口区 — 长按可拖拽排序 */}
      <div className="flex items-center justify-between -mb-1">
        <span className="text-[11px] text-gray-400">{editEntries ? '点击两个图标交换位置' : '长按图标可调整顺序'}</span>
        {editEntries && (
          <button onClick={finishEditEntries} className="text-xs font-semibold text-emerald-600 active:scale-95 transition-transform">完成</button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {entryOrder.map((key) => {
          const def = ENTRY_DEFS[key]
          if (!def) return null
          const picked = pickedEntry === key
          const baseCls = `min-h-[104px] rounded-xl ${def.bg} px-4 py-4 flex flex-col items-center justify-center text-center shadow-sm active:scale-95 md:hover:-translate-y-0.5 transition-transform select-none`
          const editCls = editEntries ? ' animate-[wiggle_0.4s_ease-in-out_infinite]' : ''
          const pickedCls = picked ? ' ring-2 ring-emerald-400' : ''
          const inner = (
            <>
              <span className="w-16 h-16 rounded-xl bg-white flex items-center justify-center text-4xl shadow-sm">{def.icon}</span>
              <span className="mt-2 text-sm font-bold text-gray-800">{def.label}</span>
              <span className="mt-0.5 text-xs text-gray-400">{def.sub}</span>
            </>
          )
          if (editEntries) {
            return (
              <button key={key} type="button" onClick={(e) => handleEntryTap(key, e)} className={baseCls + editCls + pickedCls}>
                {inner}
              </button>
            )
          }
          return (
            <Link
              key={key}
              href={def.href}
              className={baseCls}
              onTouchStart={startLongPress}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              onMouseDown={startLongPress}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onContextMenu={(e) => { e.preventDefault(); setEditEntries(true) }}
            >
              {inner}
            </Link>
          )
        })}
      </div>

      {syncFailed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 flex items-center justify-between gap-3">
          <span>云同步暂未成功，本地数据已保留。</span>
          <button onClick={() => { loadDashboard(); toast.success('已刷新本地数据') }} className="font-semibold text-amber-800 whitespace-nowrap">手动刷新</button>
        </div>
      )}

      {/* Calorie Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
        <CalorieRing consumed={d.calories} target={d.target} />
        <div className="flex-1">
          <p className="text-xs text-gray-400 font-medium">今日热量摄入</p>
          <p className="text-3xl font-bold text-gray-800 mt-0.5">
            {d.calories} <span className="text-sm font-normal text-gray-400">kcal</span>
          </p>
          <div className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${d.calories > d.target
            ? 'bg-orange-50 text-orange-500'
            : 'bg-emerald-50 text-emerald-600'
            }`}>
            {d.calories > d.target ? `今日略超目标 ${d.calories - d.target} kcal，明天轻一点就好啦~` : `还可搾配 ${d.target - d.calories} kcal`}
          </div>
          <p className={`mt-1 text-xs ${changeTone(d.calories, d.yesterdayCalories, false)}`}>{changeText(d.calories, d.yesterdayCalories, 'kcal')}</p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${d.calories > d.target ? 'bg-orange-300' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, Math.round((d.calories / (d.target || 1)) * 100))}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 border border-emerald-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm">🧠</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">AI 轻建议</p>
              <button onClick={() => setAdviceOpen((v) => !v)} className="text-[11px] font-semibold text-emerald-600 active:scale-95 transition-transform">
                {adviceOpen ? '收起' : '展开'}
              </button>
            </div>
            <p className={`text-xs text-gray-500 leading-5 mt-1 ${adviceOpen ? '' : 'line-clamp-1'}`}>{d.advice}</p>
            {/* AI 深度分析结果 */}
            {adviceOpen && aiAdvice.loading && !aiAdvice.text && (
              <div className="mt-2"><SkeletonCard /></div>
            )}
            {adviceOpen && aiAdvice.text && (
              <div className="mt-2 bg-white/80 rounded-lg p-3 border border-emerald-100">
                <p className="text-[11px] font-semibold text-emerald-700 mb-1">✨ AI 深度分析{aiAdvice.costMs ? <span className="ml-1 font-normal text-gray-400">({(aiAdvice.costMs/1000).toFixed(1)}s)</span> : null}</p>
                <p className="text-xs text-gray-600 leading-5">{aiAdvice.text}</p>
              </div>
            )}
            {adviceOpen && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleAiAnalysis('normal')}
                  disabled={aiAdvice.loading}
                  className="h-7 px-3 rounded-lg bg-emerald-400 text-white text-[11px] font-semibold disabled:opacity-60 active:scale-95 transition-transform"
                >{aiAdvice.loading ? 'AI 分析中...' : '✨ AI 今日分析'}</button>
                <button
                  onClick={() => handleAiAnalysis('deep')}
                  disabled={aiAdvice.loading}
                  className="h-7 px-3 rounded-lg bg-blue-400 text-white text-[11px] font-semibold disabled:opacity-60 active:scale-95 transition-transform"
                >{aiAdvice.loading ? '...' : '🔍 AI 深度建议'}</button>
                <Link href="/profile/advice" className="h-7 px-3 rounded-lg bg-gray-100 text-gray-500 text-[11px] font-semibold flex items-center">历史记录</Link>
                <Link href="/analysis" className="h-7 px-3 rounded-lg bg-gray-100 text-gray-500 text-[11px] font-semibold flex items-center">数据分析</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row — cards with left accent border */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '体重', value: d.weight ?? '--', unit: 'kg', target: changeText(d.weight, d.yesterdayWeight, 'kg'), compareClass: changeTone(d.weight, d.yesterdayWeight, true), border: 'border-l-emerald-400', text: 'text-emerald-600', href: '/weight/add', trend: d.weightTrend3 },
          { label: '饮水', value: d.water || '还没记录', unit: d.water ? 'ml' : '', target: d.water ? `${changeText(d.water, d.yesterdayWater, 'ml')} · 目标 ${d.waterTarget}ml` : `点击快速记录 · 目标 ${d.waterTarget}ml`, compareClass: changeTone(d.water, d.yesterdayWater), action: d.water ? '+添加' : '💧 马上记一口', onClick: () => openQuick('water'), border: 'border-l-blue-300', text: 'text-blue-500' },
          { label: '步数', value: d.steps || '还没记录', unit: d.steps ? '步' : '', target: d.steps ? `${changeText(d.steps, d.yesterdaySteps, '步')} · 目标 ${d.stepsTarget}步` : `点击快速录入 · 目标 ${d.stepsTarget}步`, compareClass: changeTone(d.steps, d.yesterdaySteps), action: d.steps ? '+录入' : '👟 现在录入', onClick: () => openQuick('steps'), border: 'border-l-amber-400', text: 'text-amber-500' },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-xl p-3 shadow-sm border-l-4 ${s.border} hover:-translate-y-0.5 transition-transform`}>
            <div className="flex items-start justify-between gap-2">
              <div className={`font-bold text-lg ${s.text}`}>{s.value}</div>
              {s.trend?.length > 1 && <div className="w-16"><MiniLineChart data={s.trend} color="#34d399" height={32} /></div>}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">{s.label} {s.unit}</div>
            {s.target && <div className={`text-[10px] mt-0.5 ${s.compareClass || 'text-gray-300'}`}>{s.target}</div>}
            {s.href && !d.weight && <Link href={s.href} className="mt-2 inline-block text-[11px] font-semibold text-emerald-600">立即录入</Link>}
            {s.action && <button onClick={s.onClick} className={`mt-2 text-[11px] font-semibold ${s.text}`}>{s.action}</button>}
          </div>
        ))}
      </div>

      <div className="bg-white/70 rounded-xl px-4 py-3 text-[11px] text-gray-400 leading-5">
        每日饮水建议 1500-2000ml，步数建议 8000 步；手动录入会优先作为今日统计数据。
      </div>

      {/* 轻量辅助入口 */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-400">
        <Link href="/foods" className="rounded-xl bg-white py-3 shadow-sm active:scale-95 transition-transform">食物库</Link>
        <Link href="/health/stats" className="rounded-xl bg-white py-3 shadow-sm active:scale-95 transition-transform">统计</Link>
        <Link href="/profile/feedback" className="rounded-xl bg-white py-3 shadow-sm active:scale-95 transition-transform">反馈</Link>
      </div>

      <div className="hidden md:grid grid-cols-3 gap-3">
        {[
          { href: '/analysis', title: '高级分析', desc: '点击后按需加载体重-热量关联' },
          { href: '/reports', title: '报告分享', desc: '生成7天/30天报告卡片' },
          { href: '/social', title: '社区互动', desc: '好友、动态、小组与激励' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm hover:bg-emerald-50 transition-colors">
            <p className="text-sm font-semibold text-gray-700">{item.title}</p>
            <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Weight Trend */}
      {d.weightTrend.length > 1 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-700 text-sm">近期体重趋势</h3>
            <Link href="/weight" className="text-xs text-emerald-500 font-medium">
              查看详情 →
            </Link>
          </div>
          <MiniLineChart data={d.weightTrend} color="#34d399" />
        </div>
      )}

      {/* Today Diet */}
      {d.recentDiet.length > 0 ? (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-700 text-sm">今日饮食</h3>
            <Link href="/diet" className="text-xs text-emerald-500 font-medium">
              查看全部 →
            </Link>
          </div>
          <div className="space-y-1.5">
            {d.recentDiet.map((r) => (
              <div key={r.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <span className="shrink-0 text-[10px] font-medium text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded">
                  {MEAL_LABEL[r.meal] || r.meal}
                </span>
                <span className="flex-1 min-w-0 text-sm text-gray-600 truncate">{r.name}</span>
                <span className="shrink-0 text-xs font-semibold text-emerald-500">{r.calories} kcal</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl p-6 text-center border border-emerald-100">
          <div className="w-14 h-14 mx-auto rounded-xl bg-white flex items-center justify-center shadow-sm mb-3">
            <span className="text-3xl">🍽️</span>
          </div>
          <p className="text-gray-600 text-sm font-medium">今日还未记录饮食</p>
          <p className="text-gray-400 text-xs mt-1">记录每餐，掌握热量摄入</p>
          <Link
            href="/diet/add"
            className="inline-block mt-4 bg-emerald-400 text-white text-sm px-6 py-2.5 rounded-lg font-semibold shadow-sm active:scale-95 transition-transform"
          >
            去记录
          </Link>
        </div>
      )}

      {quick && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 px-4 pb-4">
          <div className="w-full max-w-[420px] rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">{quick.type === 'water' ? '添加饮水' : '录入步数'}</h3>
                <p className="text-xs text-gray-400 mt-1">{quick.type === 'water' ? '支持 200 / 300 / 500ml 快捷选择' : '请输入今天累计步数'}</p>
              </div>
              <button onClick={() => setQuick(null)} className="text-gray-400">✕</button>
            </div>
            {quick.type === 'water' && <div className="grid grid-cols-3 gap-2">{[200, 300, 500].map((v) => <button key={v} onClick={() => setQuick((q) => ({ ...q, value: v }))} className={`py-3 rounded-2xl text-sm font-semibold ${Number(quick.value) === v ? 'bg-blue-400 text-white' : 'bg-blue-50 text-blue-500'}`}>{v}ml</button>)}</div>}
            {quick.type === 'steps' && (
              <div className="grid grid-cols-3 gap-2">
                {[5000, 8000, 10000].map((v) => (
                  <button key={v} onClick={() => setQuick((q) => ({ ...q, value: v }))} className={`py-3 rounded-2xl text-sm font-semibold ${Number(quick.value) === v ? 'bg-amber-400 text-white' : 'bg-amber-50 text-amber-600'}`}>{v}步</button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">{quick.type === 'water' ? '饮水量 ml' : '步数'}</label>
                <div className="flex items-center gap-1">
                  {quick.type === 'steps' && (
                    <button type="button" onClick={() => setQuick((q) => ({ ...q, value: Math.max(0, (Number(q.value) || 0) - 100) }))} className="w-9 h-11 rounded-xl bg-gray-100 text-gray-500 active:scale-95 transition-transform">−</button>
                  )}
                  <input type="number" value={quick.value} onChange={(e) => setQuick((q) => ({ ...q, value: e.target.value }))} className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-emerald-400" />
                  {quick.type === 'steps' && (
                    <button type="button" onClick={() => setQuick((q) => ({ ...q, value: Math.min(50000, (Number(q.value) || 0) + 100) }))} className="w-9 h-11 rounded-xl bg-gray-100 text-gray-500 active:scale-95 transition-transform">+</button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">时间</label>
                <input type="time" value={quick.time} onChange={(e) => setQuick((q) => ({ ...q, time: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-emerald-400" />
              </div>
            </div>
            <button onClick={confirmQuick} className="w-full py-3 rounded-2xl bg-emerald-400 text-white font-semibold">确认</button>
          </div>
        </div>
      )}
    </div>
  )
}
