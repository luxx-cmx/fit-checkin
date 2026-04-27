'use client'
import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/store'

// 离线提示横幅
// 设计参考《资深 PM 调优文档》第一/五章：
// - 网络中断时显式提示"已切换至离线模式"
// - 联网恢复后自动消失，并提示"已恢复在线"
// - 所有写入仍会进 localStorage，联网后由 store 内的 syncFetchWithRetry 推送
export default function OfflineBanner() {
    const [online, setOnline] = useState(true)
    const [recovered, setRecovered] = useState(false)

    useEffect(() => {
        if (typeof navigator === 'undefined') return
        setOnline(navigator.onLine)
        const handleOnline = () => {
            setOnline(true)
            setRecovered(true)
            trackEvent('network_online', {})
            window.setTimeout(() => setRecovered(false), 3000)
        }
        const handleOffline = () => {
            setOnline(false)
            setRecovered(false)
            trackEvent('network_offline', {})
        }
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    if (online && !recovered) return null

    return (
        <div
            className={`fixed top-2 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 rounded-full text-xs font-semibold shadow-lg max-w-[90vw] whitespace-nowrap transition-all ${
                online
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-500 text-white'
            }`}
            role="status"
            aria-live="polite"
        >
            {online
                ? '✅ 网络已恢复，离线期间的数据将自动同步'
                : '📴 当前离线，已为你启用本地模式，记录的数据稍后自动上传'}
        </div>
    )
}
