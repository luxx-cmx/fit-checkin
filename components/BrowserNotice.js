'use client'

import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/store'

export default function BrowserNotice() {
    const [show, setShow] = useState(false)

    useEffect(() => {
        const ua = navigator.userAgent || ''
        const isIE = /MSIE|Trident/.test(ua)
        const lacksModernCss = typeof CSS === 'undefined' || !CSS.supports?.('display', 'grid')
        setShow(isIE || lacksModernCss)

        const onLoad = () => {
            const nav = performance.getEntriesByType?.('navigation')?.[0]
            if (nav) trackEvent('page_load_perf', { path: location.pathname, loadMs: Math.round(nav.loadEventEnd || nav.duration || 0) })
        }
        if (document.readyState === 'complete') onLoad()
        else window.addEventListener('load', onLoad, { once: true })
        return () => window.removeEventListener('load', onLoad)
    }, [])

    if (!show) return null
    return (
        <div className="fixed inset-x-3 top-3 z-[100] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-lg md:top-14 md:left-1/2 md:right-auto md:w-[520px] md:-translate-x-1/2">
            当前浏览器版本较旧，建议使用最新版 Chrome、Edge、Firefox 或 Safari，以获得完整功能和更快加载速度。
        </div>
    )
}