'use client'
// 统一加载按钮：点击即态、>1s 文案变"加载中..."、防重复点击
// 参考《资深 PM 调优文档》第二章「交互反馈精细化」
import { useEffect, useRef, useState } from 'react'

export default function LoadingButton({
    onClick,
    loading: controlledLoading,
    disabled,
    children,
    loadingText = '加载中...',
    className = '',
    type = 'button',
    ...rest
}) {
    const [internal, setInternal] = useState(false)
    const [showText, setShowText] = useState(false)
    const timerRef = useRef(null)
    const isControlled = controlledLoading !== undefined
    const loading = isControlled ? controlledLoading : internal

    useEffect(() => {
        if (loading) {
            timerRef.current = window.setTimeout(() => setShowText(true), 1000)
        } else {
            if (timerRef.current) window.clearTimeout(timerRef.current)
            setShowText(false)
        }
        return () => { if (timerRef.current) window.clearTimeout(timerRef.current) }
    }, [loading])

    const handleClick = async (e) => {
        if (loading || disabled) return
        if (!onClick) return
        try {
            if (!isControlled) setInternal(true)
            await onClick(e)
        } finally {
            if (!isControlled) setInternal(false)
        }
    }

    return (
        <button
            type={type}
            onClick={handleClick}
            disabled={loading || disabled}
            className={`relative inline-flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
            aria-busy={loading || undefined}
            {...rest}
        >
            {loading && (
                <span
                    className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
                    aria-hidden
                />
            )}
            <span>{loading && showText ? loadingText : children}</span>
        </button>
    )
}
