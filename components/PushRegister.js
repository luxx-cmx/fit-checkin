'use client'
import { useEffect, useRef } from 'react'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export default function PushRegister() {
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    ;(async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

        // 注册 SW
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

        // 申请通知权限
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') return

        // 获取或创建订阅
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
          })
        }

        // 上报到后端
        const token = localStorage.getItem('syj_token') || ''
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(sub.toJSON()),
        })
      } catch (err) {
        console.warn('[PushRegister]', err?.message)
      }
    })()
  }, [])

  return null
}
