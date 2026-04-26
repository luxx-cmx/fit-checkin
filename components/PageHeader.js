'use client'

import { useRouter } from 'next/navigation'

export default function PageHeader({ title, subtitle, action, fallbackHref = '/profile', dark = false }) {
    const router = useRouter()

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back()
            return
        }
        router.push(fallbackHref)
    }

    const buttonClass = dark
        ? 'w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-500'
        : 'w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-500'
    const titleClass = dark ? 'text-xl font-bold text-slate-800' : 'text-xl font-bold text-gray-800'
    const subtitleClass = dark ? 'text-sm text-slate-500 mt-1' : 'text-sm text-gray-400 mt-1'

    return (
        <div className="pt-3 flex items-start justify-between gap-3">
            <button onClick={handleBack} className={buttonClass} aria-label="返回上一页">
                ←
            </button>
            <div className="flex-1 min-w-0">
                <h1 className={titleClass}>{title}</h1>
                {subtitle ? <p className={subtitleClass}>{subtitle}</p> : null}
            </div>
            <div className="shrink-0">{action || <div className="w-10 h-10" />}</div>
        </div>
    )
}