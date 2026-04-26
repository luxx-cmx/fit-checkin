const K = {
  DIET: 'syj_diet',
  WEIGHT: 'syj_weight',
  HEALTH: 'syj_health',
  PROFILE: 'syj_profile',
  FAVORITES: 'syj_favorites',
  SKIN: 'syj_skin',
  REMINDERS: 'syj_reminders',
  GOAL_HISTORY: 'syj_goal_history',
  EVENTS: 'syj_events',
  FEEDBACK: 'syj_feedback',
  PREFERRED_MEAL: 'syj_preferred_meal',
  FONT_SIZE: 'syj_font_size',
}

function get(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const v = localStorage.getItem(key)
    return v !== null ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

function set(key, value) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

function notifyDataChanged(type) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('syj:data-changed', { detail: { type } }))
}

function notifyFontSizeChanged(size) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('syj:font-size-changed', { detail: { size } }))
}

function notifySyncState(detail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('syj:sync-state', { detail }))
}

export const trackEvent = (name, payload = {}) => {
  const list = get(K.EVENTS, [])
  list.unshift({ id: Date.now() + Math.random(), name, payload, createdAt: new Date().toISOString() })
  set(K.EVENTS, list.slice(0, 300))
}

export const getEvents = () => get(K.EVENTS, [])

export const cleanupExpiredCache = (days = 30) => {
  if (typeof window === 'undefined') return
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
    ;[K.DIET, K.WEIGHT, K.HEALTH].forEach((key) => {
      const rows = get(key, [])
      if (!Array.isArray(rows)) return
      const next = rows.filter((row) => !row.date || normalizeDate(row.date) >= cutoffStr)
      if (next.length !== rows.length) set(key, next)
    })
  trackEvent('cache_cleanup', { days })
}

export const clearLightweightCache = () => {
  if (typeof window === 'undefined') return 0
  const keys = [K.EVENTS]
  let count = 0
  keys.forEach((key) => {
    if (localStorage.getItem(key) !== null) count += 1
    localStorage.removeItem(key)
  })
  const list = get(K.EVENTS, [])
  list.unshift({ id: Date.now() + Math.random(), name: 'manual_cache_cleanup', payload: { keys: count }, createdAt: new Date().toISOString() })
  set(K.EVENTS, list.slice(0, 300))
  return count
}

// ── 自动云同步（fire-and-forget）──
// 登录态下，每次增删都异步推到数据库。失败不影响本地。
function token() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('syj_token')
}

async function syncFetchWithRetry(table, operation, url, options, retries = 3) {
  let lastError = null
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, options)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      notifySyncState({ table, operation, status: 'success', attempt })
      trackEvent('sync_success', { table, operation, attempt })
      return true
    } catch (error) {
      lastError = error
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }
  notifySyncState({ table, operation, status: 'failed', retries, message: lastError?.message || '同步失败' })
  trackEvent('sync_failed', { table, operation, retries, message: lastError?.message || '同步失败' })
  return false
}

function pushRemote(table, row) {
  const t = token()
  if (!t) return
  syncFetchWithRetry(table, 'push', `/api/sync/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: JSON.stringify({ rows: [row] }),
  })
}

function deleteRemote(table, id) {
  const t = token()
  if (!t) return
  syncFetchWithRetry(table, 'delete', `/api/sync/${table}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${t}` },
  })
}

export const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// date 字段规范化：把 ISO 时间戳截取为 YYYY-MM-DD
function normalizeDate(str) {
  if (!str) return str
  return String(str).slice(0, 10)
}

function normalizeRows(rows) {
  return rows.map((r) => r.date ? { ...r, date: normalizeDate(r.date) } : r)
}

// ── Diet ──
export const getDietRecords = () => normalizeRows(get(K.DIET, []))
export const addDietRecord = (r) => {
  const list = getDietRecords()
  const row = { ...r, id: Date.now() }
  list.unshift(row)
  set(K.DIET, list)
  if (row.meal) setPreferredMeal(row.meal)
  notifyDataChanged('diet')
  pushRemote('diet', row)
}
export const deleteDietRecord = (id) => {
  set(K.DIET, getDietRecords().filter((r) => r.id !== id))
  notifyDataChanged('diet')
  deleteRemote('diet', id)
}

// ── Weight ──
export const getWeightRecords = () => normalizeRows(get(K.WEIGHT, []))
export const addWeightRecord = (r) => {
  const list = getWeightRecords()
  const row = { ...r, id: Date.now() }
  list.unshift(row)
  set(K.WEIGHT, list)
  notifyDataChanged('weight')
  pushRemote('weight', row)
}
export const deleteWeightRecord = (id) => {
  set(K.WEIGHT, getWeightRecords().filter((r) => r.id !== id))
  notifyDataChanged('weight')
  deleteRemote('weight', id)
}

// ── Health ──
export const getHealthRecords = () => normalizeRows(get(K.HEALTH, []))
export const addHealthRecord = (r) => {
  const list = getHealthRecords()
  const row = { ...r, id: Date.now() }
  list.unshift(row)
  set(K.HEALTH, list)
  notifyDataChanged('health')
  pushRemote('health', row)
}
export const deleteHealthRecord = (id) => {
  set(K.HEALTH, getHealthRecords().filter((r) => r.id !== id))
  notifyDataChanged('health')
  deleteRemote('health', id)
}

// ── Profile ──
export const getProfile = () =>
  get(K.PROFILE, {
    name: '',
    nickname: '',
    avatar: '',
    gender: '',
    age: '',
    height: '',
    activityLevel: '中',
    dailyCalories: 1800,
    targetWeight: '',
    dailyWater: 2000,
    dailySteps: 8000,
    dailySleep: 8,
  })
export const saveProfile = (p) => {
  set(K.PROFILE, p)
  notifyDataChanged('profile')
  const t = token()
  if (!t) return
  fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: JSON.stringify({ data: p }),
  }).catch(() => { })
}

export const getGoalHistory = () => get(K.GOAL_HISTORY, [])
export const addGoalHistory = (goals) => {
  const list = getGoalHistory()
  list.unshift({ id: Date.now(), goals, createdAt: new Date().toISOString() })
  set(K.GOAL_HISTORY, list.slice(0, 50))
  notifyDataChanged('goals')
  trackEvent('goal_saved', goals)
}

export const getFeedbackList = () => get(K.FEEDBACK, [])
export const addFeedback = (feedback) => {
  const list = getFeedbackList()
  const row = { ...feedback, id: Date.now(), createdAt: new Date().toISOString(), status: '待处理' }
  list.unshift(row)
  set(K.FEEDBACK, list.slice(0, 100))
  trackEvent('feedback_submit', { type: feedback.type })
  return row
}

export const getReminderSettings = () =>
  get(K.REMINDERS, {
    breakfast_remind: true,
    breakfast_time: '07:30',
    lunch_remind: true,
    lunch_time: '12:00',
    dinner_remind: true,
    dinner_time: '18:30',
    water_remind: true,
    water_interval: 2,
    weight_remind: false,
    weight_time: '20:00',
  })
export const saveReminderSettings = (settings) => {
  set(K.REMINDERS, settings)
  const t = token()
  if (!t) return
  fetch('/api/user/saveSetting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: JSON.stringify(settings),
  }).catch(() => { })
}

// ── Personalization ──
export const getPreferredMeal = () => get(K.PREFERRED_MEAL, 'breakfast')
export const setPreferredMeal = (meal) => {
  if (!meal) return
  set(K.PREFERRED_MEAL, meal)
  trackEvent('meal_preference_saved', { meal })
}

export const getFontSize = () => get(K.FONT_SIZE, 'standard')
export const setFontSize = (size) => {
  const next = ['small', 'standard', 'large'].includes(size) ? size : 'standard'
  set(K.FONT_SIZE, next)
  trackEvent('font_size_changed', { size: next })
  notifyFontSizeChanged(next)
  return next
}

// ── Q版皮肤 ──
export const SKINS = [
  { id: 0, name: '默认', desc: '原始浅色背景', emoji: '⚪', tone: 'from-gray-50 to-white' },
  { id: 1, name: 'Q版清新款', desc: '浅绿底色 + 蔬果简笔画', emoji: '🥕', tone: 'from-emerald-100 to-lime-50' },
  { id: 2, name: 'Q版治愈款', desc: '浅黄底色 + 小动物食物元素', emoji: '🐰', tone: 'from-amber-100 to-yellow-50' },
  { id: 3, name: 'Q版简约款', desc: '浅蓝底色 + 餐具水滴线条', emoji: '💧', tone: 'from-sky-100 to-blue-50' },
]
export const getSkin = () => Number(get(K.SKIN, 0)) || 0
export const setSkin = (skinType) => {
  const next = Number(skinType) || 0
  set(K.SKIN, next)
  const profile = getProfile()
  set(K.PROFILE, { ...profile, skinType: next, skin_type: next })
  const t = token()
  if (!t) return
  fetch('/api/user/changeSkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: JSON.stringify({ skin_type: next }),
  }).catch(() => { })
}

// ── Favorites ──
export const getFavorites = () => get(K.FAVORITES, [])
export const isFavorite = (name) => getFavorites().some((f) => f.name === name)
export const toggleFavorite = (food) => {
  const list = getFavorites()
  const idx = list.findIndex((f) => f.name === food.name)
  const isAdd = idx < 0
  if (idx >= 0) list.splice(idx, 1)
  else list.unshift(food)
  set(K.FAVORITES, list)
  const t = token()
  if (t) {
    if (isAdd) {
      fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ name: food.name, calories: food.calories ?? 0 }),
      }).catch(() => { })
    } else {
      fetch(`/api/favorites?name=${encodeURIComponent(food.name)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` },
      }).catch(() => { })
    }
  }
  return isAdd
}

// ── Recent Foods ──
export const getRecentFoods = (limit = 10) => {
  const seen = new Set()
  const out = []
  for (const r of getDietRecords()) {
    if (!seen.has(r.name)) {
      seen.add(r.name)
      out.push({ name: r.name, calories: Number(r.calories) || 0 })
      if (out.length >= limit) break
    }
  }
  return out
}

export const getFrequentFoods = (limit = 3, days = 7) => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - (days - 1))
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const map = new Map()
  getDietRecords()
    .filter((r) => !r.date || r.date >= cutoffStr)
    .forEach((r) => {
      if (!r.name) return
      const item = map.get(r.name) || { name: r.name, calories: Number(r.calories) || 0, count: 0 }
      item.count += 1
      item.calories = Number(r.calories) || item.calories
      map.set(r.name, item)
    })
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'))
    .slice(0, limit)
}

// ── Helpers ──
export const getTodayDiet = () => getDietRecords().filter((r) => r.date === todayStr())
export const getTodayCalories = () => getTodayDiet().reduce((s, r) => s + (Number(r.calories) || 0), 0)
export const getLatestWeight = () => {
  const recs = getWeightRecords()
  return recs.length > 0 ? recs[0].weight : null
}
export const getTodayHealth = () => getHealthRecords().filter((r) => r.date === todayStr())

export const clearKey = (key) => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(key)
}

// 复制某一天的饮食到今日（批量同步）
export const duplicateDietFromDate = (fromDate) => {
  const today = todayStr()
  const list = getDietRecords()
  const srcs = list.filter((r) => r.date === fromDate)
  const newRows = srcs.map((r) => ({ ...r, id: Date.now() + Math.random(), date: today }))
  newRows.forEach((r) => list.unshift(r))
  set(K.DIET, list)
  notifyDataChanged('diet')
  // 批量同步
  const t = token()
  if (t && newRows.length) {
    syncFetchWithRetry('diet', 'batch_push', '/api/sync/diet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ rows: newRows }),
    })
  }
  return srcs.length
}

// 昨日日期
export const yesterdayStr = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const STORAGE_KEYS = K
