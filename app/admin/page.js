'use client'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'

export default function AdminPage() {
    const [data, setData] = useState({ users: 0, dietRecords: 0, weightRecords: 0, foods: 0 })
    useEffect(() => { fetch('/api/admin/overview').then(r => r.json()).then(d => { if (d.data) setData(d.data) }).catch(() => { }) }, [])
    return <div className="min-h-screen p-6 bg-slate-50"><div className="max-w-5xl mx-auto space-y-6"><PageHeader title="食愈记 Admin 后台" subtitle="5.0+ 管理系统基础骨架：数据监控、内容管理、系统设置扩展入口" fallbackHref="/profile" dark /><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[['用户数', data.users], ['饮食记录', data.dietRecords], ['体重记录', data.weightRecords], ['食物库', data.foods]].map(([l, v]) => <div key={l} className="bg-white rounded-2xl p-5 shadow-sm"><p className="text-sm text-slate-500">{l}</p><p className="text-3xl font-bold text-emerald-600 mt-2">{v}</p></div>)}</div><div className="grid md:grid-cols-3 gap-4">{['用户管理', '内容管理', '系统设置'].map(t => <div key={t} className="bg-white rounded-2xl p-5 shadow-sm"><h3 className="font-semibold text-slate-800">{t}</h3><p className="text-sm text-slate-500 mt-2">已预留模块入口，后续可接入筛选、分页、导出和操作日志。</p></div>)}</div></div></div>
}
