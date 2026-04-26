'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { saveAuth } from '@/lib/auth-client'
import { syncUp, syncDown } from '@/lib/db'
import { getDietRecords, getWeightRecords, getHealthRecords, getProfile, getFavorites, STORAGE_KEYS } from '@/lib/store'

// 登录/注册成功后自动同步
async function autoSync(token, isNew) {
  try {
    if (isNew) {
      // 新注册：把本地数据上传到云端
      const local = {
        diet: getDietRecords(),
        weight: getWeightRecords(),
        health: getHealthRecords(),
      }
      const hasLocal = local.diet.length + local.weight.length + local.health.length > 0
      if (hasLocal) {
        await Promise.all([
          syncUp('diet', local.diet, token),
          syncUp('weight', local.weight, token),
          syncUp('health', local.health, token),
        ])
        toast.info(`已将本地 ${local.diet.length + local.weight.length + local.health.length} 条记录上传到云端`)
      }
      // 同步 profile 和 favorites
      const profile = getProfile()
      const favs = getFavorites()
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      if (Object.values(profile).some(Boolean)) {
        fetch('/api/profile', { method: 'POST', headers, body: JSON.stringify({ data: profile }) }).catch(() => {})
      }
      for (const f of favs) {
        fetch('/api/favorites', { method: 'POST', headers, body: JSON.stringify({ name: f.name, calories: f.calories ?? 0 }) }).catch(() => {})
      }
    } else {
      // 登录：从云端拉取数据覆盖本地
      const [d, w, h, pRes, fRes] = await Promise.all([
        syncDown('diet', token),
        syncDown('weight', token),
        syncDown('health', token),
        fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({})),
        fetch('/api/favorites', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({})),
      ])
      if (d.rows?.length) localStorage.setItem(STORAGE_KEYS.DIET, JSON.stringify(d.rows))
      if (w.rows?.length) localStorage.setItem(STORAGE_KEYS.WEIGHT, JSON.stringify(w.rows))
      if (h.rows?.length) localStorage.setItem(STORAGE_KEYS.HEALTH, JSON.stringify(h.rows))
      if (pRes.data && Object.keys(pRes.data).length) localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(pRes.data))
      if (fRes.rows?.length) localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(fRes.rows))
      const total = (d.rows?.length || 0) + (w.rows?.length || 0) + (h.rows?.length || 0)
      if (total > 0) toast.info(`已从云端同步 ${total} 条记录`)
    }
  } catch {
    // 同步失败不阻断登录流程
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState('login') // login | register
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const handleSubmit = async () => {
    if (!form.username.trim() || !form.password) return toast.error('请填写用户名和密码')
    setLoading(true)
    try {
      const res = await fetch(`/api/auth/${tab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username.trim(), password: form.password }),
      })
      const data = await res.json()
      if (!data.ok) {
        toast.error(data.msg || '操作失败')
      } else {
        saveAuth(data.token, data.user)
        toast.success(tab === 'login' ? `欢迎回来，${data.user.username}！` : '注册成功，欢迎使用食愈记！')
        // 自动同步：注册上传本地数据，登录拉取云端数据
        await autoSync(data.token, tab === 'register')
        router.replace('/')
      }
    } catch (e) {
      toast.error('网络错误，请检查服务器连接')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200 mb-4">
            <span className="text-4xl">🥗</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">食愈记</h1>
          <p className="text-sm text-gray-400 mt-1">健康饮食，从记录开始</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-md shadow-gray-100 p-6 space-y-4">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-2xl p-1">
            {[['login', '登录'], ['register', '注册']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  tab === key ? 'bg-white text-emerald-500 shadow-sm' : 'text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {/* Username input */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block font-medium">用户名</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </span>
                <input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="输入用户名"
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
            </div>
            {/* Password input */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block font-medium">密码</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                  </svg>
                </span>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={tab === 'register' ? '至少6位' : '输入密码'}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-9 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {showPwd ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-400 to-emerald-500 text-white py-3.5 rounded-xl font-semibold shadow-md shadow-emerald-100 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {tab === 'login' ? '登录中...' : '注册中...'}
              </>
            ) : (
              tab === 'login' ? '登录' : '注册'
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          数据仅存储在本服务器，不会共享给第三方
        </p>
      </div>
    </div>
  )
}
