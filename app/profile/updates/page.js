'use client'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'

const FALLBACK = [
    {
        id: 1,
        version: 'v4.0.0',
        update_time: '2026-04-26',
        update_type: '新增功能',
        update_detail: '1. 新增好友、动态、私信与消息中心；2. 新增监督小组、挑战赛、积分徽章；3. 重构我的页面为主页+设置页结构',
        is_latest: true,
    },
    {
        id: 2,
        version: 'v3.0.0',
        update_time: '2026-04-25',
        update_type: '新增功能',
        update_detail: '1. 新增智能健康分析；2. 新增目标精细化；3. 新增报告分享与后台骨架',
        is_latest: false,
    },
    {
        id: 3,
        version: 'v2.0.0',
        update_time: '2026-04-10',
        update_type: '新增功能',
        update_detail: '1. 新增饮食记录、体重记录功能；2. 新增首页数据概览；3. 完成个人中心基础功能',
        is_latest: false,
    },
]

export default function UpdatesPage() {
    const [records, setRecords] = useState(FALLBACK)

    useEffect(() => {
        fetch('/api/app/updateRecord')
            .then((res) => res.json())
            .then((data) => {
                const list = data.data?.updateRecords || data.updateRecords
                if (Array.isArray(list) && list.length) setRecords(list)
            })
            .catch(() => { })
    }, [])

    return (
        <div className="p-4 space-y-4">
            <PageHeader title="更新记录" fallbackHref="/profile/settings" />
            {records.length ? (
                <div className="space-y-3">
                    {records.map((item) => (
                        <div key={item.id || item.version} className="bg-white rounded-3xl p-4 shadow-md shadow-gray-100 border border-gray-100">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-lg font-bold text-emerald-600">{item.version}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{item.update_time}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${item.is_latest ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{item.is_latest ? '最新版本' : item.update_type}</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mt-3">{item.update_type}</p>
                            <ul className="mt-2 space-y-1 text-sm text-gray-500 leading-6">
                                {String(item.update_detail || '').split(/；|;|\n/).filter(Boolean).map((line, idx) => <li key={idx}>{line.trim()}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl py-16 text-center text-gray-400 shadow-sm">
                    <div className="text-5xl mb-3">📣</div>
                    <p className="text-sm">暂无更新记录</p>
                </div>
            )}
        </div>
    )
}
