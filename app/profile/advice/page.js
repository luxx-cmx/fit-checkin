'use client'
// 个性化建议历史
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/AppDialog'
import { getAdviceHistory, clearAdviceHistory, trackEvent } from '@/lib/store'

export default function AdviceHistoryPage() {
    const [list, setList] = useState([])
    const [confirm, setConfirm] = useState(false)
    const load = () => setList(getAdviceHistory())
    useEffect(() => { load(); trackEvent('advice_history_view') }, [])

    const handleClear = () => {
        clearAdviceHistory()
        load()
        setConfirm(false)
        toast.success('已清空建议历史')
    }

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="h-11 flex items-center justify-between">
                <Link href="/profile" className="w-11 h-11 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-500 active:scale-95 transition-transform">←</Link>
                <h1 className="text-lg font-bold text-gray-800">建议历史</h1>
                <button
                    onClick={() => setConfirm(true)}
                    disabled={!list.length}
                    className="min-w-11 h-11 px-3 rounded-lg bg-white text-rose-500 text-sm font-semibold shadow-sm active:scale-95 transition-transform disabled:text-gray-300"
                >清空</button>
            </div>

            {list.length === 0 ? (
                <div className="bg-white rounded-2xl py-16 text-center text-gray-400 shadow-sm">
                    <div className="text-5xl mb-3">🧠</div>
                    <p className="text-sm">还没有建议历史</p>
                    <p className="text-xs mt-1 text-gray-300">完成今日饮食/体重记录即可生成</p>
                    <Link href="/" className="inline-block mt-4 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-semibold">回到首页</Link>
                </div>
            ) : (
                <div className="space-y-2">
                    {list.map((item, idx) => (
                        <div key={`${item.ts}-${idx}`} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-semibold text-emerald-600">{item.date}</span>
                                <span className="text-[10px] text-gray-300">{new Date(item.ts).toTimeString().slice(0, 5)}</span>
                            </div>
                            <p className="text-sm text-gray-700 leading-6">{item.text}</p>
                            {(item.calories || item.weight) && (
                                <p className="text-[11px] text-gray-400 mt-1">
                                    {item.calories ? `热量 ${item.calories}kcal` : ''}
                                    {item.weight ? ` · 体重 ${item.weight}kg` : ''}
                                    {item.water ? ` · 饮水 ${item.water}ml` : ''}
                                    {item.steps ? ` · 步数 ${item.steps}` : ''}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={confirm}
                title="清空全部建议历史？"
                message="清空后无法恢复。"
                confirmText="清空"
                danger
                onConfirm={handleClear}
                onClose={() => setConfirm(false)}
            />
        </div>
    )
}
