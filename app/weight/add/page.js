'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { addWeightRecord, getLatestWeight, todayStr } from '@/lib/store'

export default function AddWeightPage() {
    const router = useRouter()
    const [form, setForm] = useState({ weight: '', date: todayStr(), note: '' })
    const [lastWeight, setLastWeight] = useState('')

    useEffect(() => {
        const latest = getLatestWeight()
        if (latest) {
            setLastWeight(String(latest))
            setForm((state) => ({ ...state, weight: String(latest) }))
        }
    }, [])

    const handleSave = () => {
        const weight = parseFloat(form.weight)
        if (!weight) return toast.error('请输入体重')
        if (weight < 20 || weight > 300) return toast.error('体重应在 20~300 kg 之间')

        addWeightRecord({ ...form, weight: String(weight) })
        toast.success('体重已记录 ⚖️')
        router.replace('/weight')
    }

    const adjustWeight = (delta) => {
        const current = parseFloat(form.weight || '0')
        const next = Math.max(0, current + delta)
        setForm((state) => ({ ...state, weight: next ? next.toFixed(1) : '' }))
    }

    const handleVoice = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) return toast.info('当前浏览器暂不支持语音输入')
        const recognition = new SpeechRecognition()
        recognition.lang = 'zh-CN'
        recognition.onresult = (event) => {
            const text = event.results?.[0]?.[0]?.transcript || ''
            const value = text.match(/\d+(\.\d+)?/)?.[0]
            if (value) setForm((state) => ({ ...state, weight: value }))
            else toast.error('未识别到有效体重')
        }
        recognition.start()
        toast.info('请说出体重数值')
    }

    return (
        <div className="p-4 md:p-6 space-y-4 min-h-[calc(100vh-5rem)] flex flex-col">
            <div className="h-11 flex items-center justify-between">
                <Link href="/weight" className="w-11 h-11 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-500 active:scale-95 transition-transform">
                    ←
                </Link>
                <h1 className="text-lg font-bold text-gray-800">体重录入</h1>
                <div className="w-11" />
            </div>

            <div className="flex-1 bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-6 flex flex-col justify-center">
                <div className="text-center">
                    <label className="text-sm font-medium text-gray-500 mb-3 block">请输入今日体重</label>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => adjustWeight(-0.1)}
                            className="w-11 h-11 rounded-lg bg-blue-50 text-blue-500 text-xl font-semibold active:scale-95 transition-transform"
                        >
                            −
                        </button>
                        <input
                            type="number"
                            step="0.1"
                            value={form.weight}
                            onChange={(event) => setForm((state) => ({ ...state, weight: event.target.value }))}
                            onKeyDown={(event) => { if (event.key === 'Enter') handleSave() }}
                            placeholder="如：65.5"
                            className="w-[120px] h-[60px] text-center text-3xl font-bold bg-white border-0 border-b-2 border-gray-200 outline-none focus:border-emerald-400"
                        />
                        <button
                            onClick={() => adjustWeight(0.1)}
                            className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-500 text-xl font-semibold active:scale-95 transition-transform"
                        >
                            +
                        </button>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-3 text-sm text-gray-400">
                        <span>上一次：{lastWeight || '--'} kg</span>
                        <button onClick={handleVoice} className="w-9 h-9 rounded-lg bg-gray-50 text-lg active:scale-95 transition-transform" aria-label="语音输入">🎙️</button>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">记录日期</label>
                    <input
                        type="date"
                        value={form.date}
                        onChange={(event) => setForm((state) => ({ ...state, date: event.target.value }))}
                        className="w-full h-11 px-1 bg-white border-0 border-b border-gray-200 text-sm outline-none focus:border-emerald-400"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">备注</label>
                    <input
                        value={form.note}
                        onChange={(event) => setForm((state) => ({ ...state, note: event.target.value }))}
                        placeholder="如：晨起空腹"
                        className="w-full h-11 px-1 bg-white border-0 border-b border-gray-200 text-sm outline-none focus:border-emerald-400"
                    />
                </div>
            </div>
            <button onClick={handleSave} className="w-full h-11 rounded-lg bg-emerald-400 text-white text-sm font-bold shadow-sm active:scale-95 transition-transform">确认保存</button>
        </div>
    )
}