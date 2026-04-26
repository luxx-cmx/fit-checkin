'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import PageHeader from '@/components/PageHeader'
import { addFeedback, getFeedbackList } from '@/lib/store'

export default function FeedbackPage() {
    const [form, setForm] = useState({ type: '功能建议', content: '', contact: '' })
    const [list, setList] = useState(getFeedbackList())
    const submit = () => {
        if (form.content.trim().length < 5) return toast.error('请至少输入5个字')
        addFeedback(form)
        setList(getFeedbackList())
        setForm({ type: '功能建议', content: '', contact: '' })
        toast.success('反馈已提交，感谢建议')
    }
    return <div className="p-4 space-y-4"><PageHeader title="意见反馈" subtitle="收集问题和建议，便于每月迭代优化" fallbackHref="/profile/settings" /><div className="bg-white rounded-3xl p-4 shadow-sm space-y-3"><select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none"><option>功能建议</option><option>问题反馈</option><option>数据异常</option><option>体验优化</option></select><textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="请描述你的问题或建议" className="w-full min-h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-emerald-400" /><input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} placeholder="联系方式（可选）" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-emerald-400" /><button onClick={submit} className="w-full py-3 rounded-2xl bg-emerald-400 text-white font-semibold">提交反馈</button></div><div className="bg-white rounded-3xl p-4 shadow-sm"><h3 className="font-semibold text-gray-700 mb-3">历史反馈</h3>{list.length ? <div className="space-y-2">{list.slice(0, 5).map((item) => <div key={item.id} className="bg-gray-50 rounded-2xl p-3"><p className="text-sm font-semibold text-gray-700">{item.type} · {item.status}</p><p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.content}</p><p className="text-xs text-gray-400 mt-1">{new Date(item.createdAt).toLocaleString()}</p></div>)}</div> : <p className="text-sm text-gray-400 text-center py-6">暂无反馈记录</p>}</div></div>
}
