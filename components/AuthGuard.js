'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getToken, clearAuth } from '@/lib/auth-client'
import { cleanupExpiredCache } from '@/lib/store'

// 本地某表是否为空
function localEmpty(key) {
  try {
    const v = localStorage.getItem(key)
    if (!v) return true
    const arr = JSON.parse(v)
    return !Array.isArray(arr) || arr.length === 0
  } catch { return true }
}

// 登录态下，若本地数据为空则从 DB 拉取（静默恢复）
async function restoreIfEmpty(token) {
  const keys = { diet: 'syj_diet', weight: 'syj_weight', health: 'syj_health' }
  const allEmpty = Object.values(keys).every(localEmpty)
  if (!allEmpty) return  // 本地有数据，不覆盖

  const headers = { Authorization: `Bearer ${token}` }
  try {
    const [d, w, h, pRes, fRes] = await Promise.all([
      fetch('/api/sync/diet', { headers }).then(r => r.json()).catch(() => ({})),
      fetch('/api/sync/weight', { headers }).then(r => r.json()).catch(() => ({})),
      fetch('/api/sync/health', { headers }).then(r => r.json()).catch(() => ({})),
      fetch('/api/profile', { headers }).then(r => r.json()).catch(() => ({})),
      fetch('/api/favorites', { headers }).then(r => r.json()).catch(() => ({})),
    ])
    if (d.rows?.length) localStorage.setItem('syj_diet', JSON.stringify(d.rows))
    if (w.rows?.length) localStorage.setItem('syj_weight', JSON.stringify(w.rows))
    if (h.rows?.length) localStorage.setItem('syj_health', JSON.stringify(h.rows))
    if (pRes.data && Object.keys(pRes.data).length)
      localStorage.setItem('syj_profile', JSON.stringify(pRes.data))
    if (fRes.rows?.length) localStorage.setItem('syj_favorites', JSON.stringify(fRes.rows))
  } catch { /* 网络异常不阻断 */ }
}

export default function AuthGuard({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (pathname === '/login') { setReady(true); return }
    cleanupExpiredCache(30)
    const token = getToken()
    if (!token) {
      router.replace('/login')
      return
    }
    fetch('/api/auth/verify', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.ok) { clearAuth(); router.replace('/login') }
        else {
          await restoreIfEmpty(token)  // 本地为空时自动从 DB 恢复
          setReady(true)
        }
      })
      .catch(() => setReady(true)) // 网络异常时放行（离线模式）
  }, [pathname])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-4xl animate-pulse">🥗</div>
      </div>
    )
  }
  return children
}

