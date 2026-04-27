'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageHeader from '@/components/PageHeader'
import { listTrash, restoreFromTrash, purgeTrashItem, clearTrash, trackEvent } from '@/lib/store'

const TABLE_LABEL = { diet: '饮食', weight: '体重', health: '健康' }
const MEAL_LABEL = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' }

function describe(item) {
    const r = item?.row || {}
    if (item.table === 'diet') {
        const meal = MEAL_LABEL[r.meal] || r.meal || '饮食'
        return `${meal} · ${r.name || '未命名'} · ${r.calories || 0} kcal`
    }
    if (item.table === 'weight') return `体重 ${r.weight || '--'} kg`
    if (item.table === 'health') {
        if (r.type === 'water') return `饮水 ${r.value || 0} ml`
        if (r.type === 'steps') return `步数 ${r.value || 0} 步`
        return `健康记录 ${r.value || ''}`
    }
    return '记录'
}

function timeLeftDays(deletedAt) {
    if (!deletedAt) return 0
    const left = 7 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / (24 * 60 * 60 * 1000))
    return Math.max(0, left)
}

export default function TrashPage() {
    const [items, setItems] = useState([])
    const [confirmClear, setConfirmClear] = useState(false)

    const refresh = () => setItems(listTrash())

    useEffect(() => {
        refresh()
        trackEvent('trash_open', {})
    }, [])

    const handleRestore = (trashId) => {
        const ok = restoreFromTrash(trashId)
        if (ok) {
            toast.success('已恢复到原列表')
            refresh()
        } else {
            toast.error('恢复失败，记录可能已过期')
        }
    }

    const handlePurge = (trashId) => {
        purgeTrashItem(trashId)
        toast.info('已彻底删除')
        refresh()
    }

    return (
        <div className="p-4 space-y-4">
            <PageHeader
                title="回收站"
                subtitle="误删的饮食 / 体重 / 健康记录可在 7 天内恢复，到期自动清理"
                fallbackHref="/profile/settings"
                action={
                    items.length > 0 ? (
                        <button
                            onClick={() => setConfirmClear(true)}
                            className="text-xs font-semibold text-red-500"
                        >
                            清空
                        </button>
                    ) : null
                }
            />

            {items.length === 0 ? (
                <div className="rounded-3xl bg-white p-8 text-center shadow-sm border border-gray-100">
                    <div className="w-14 h-14 mx-auto rounded-xl bg-emerald-50 flex items-center justify-center text-3xl">🗑️</div>
                    <p className="mt-3 text-sm font-semibold text-gray-700">回收站是空的</p>
                    <p className="mt-1 text-xs text-gray-400">误删记录会保留 7 天，可一键恢复</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map((item) => {
                        const left = timeLeftDays(item.deletedAt)
                        return (
                            <div
                                key={item.trashId}
                                className="rounded-2xl bg-white p-3 shadow-sm border border-gray-100 flex items-center gap-3"
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-lg">
                                    {item.table === 'diet' ? '🍱' : item.table === 'weight' ? '⚖️' : '💧'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-700 truncate">{describe(item)}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        {TABLE_LABEL[item.table] || item.table} · {item.row?.date || '--'} · 剩余 {left} 天
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleRestore(item.trashId)}
                                    className="px-3 h-8 rounded-lg bg-emerald-400 text-white text-xs font-semibold active:scale-95 transition-transform"
                                >
                                    恢复
                                </button>
                                <button
                                    onClick={() => handlePurge(item.trashId)}
                                    className="px-2 h-8 rounded-lg bg-gray-100 text-gray-500 text-xs active:scale-95 transition-transform"
                                >
                                    彻底删
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            {confirmClear && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-6">
                    <div className="w-full max-w-[320px] rounded-3xl bg-white p-5 shadow-2xl">
                        <h3 className="text-base font-semibold text-gray-800">清空回收站？</h3>
                        <p className="text-xs text-gray-500 mt-1 leading-5">
                            清空后记录将无法恢复，确定继续吗？
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button onClick={() => setConfirmClear(false)} className="h-10 rounded-2xl bg-gray-100 text-sm font-semibold text-gray-600">取消</button>
                            <button
                                onClick={() => { clearTrash(); setConfirmClear(false); refresh(); toast.success('已清空回收站') }}
                                className="h-10 rounded-2xl bg-red-400 text-white text-sm font-semibold"
                            >
                                确认清空
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
