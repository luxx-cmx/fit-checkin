'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import PageHeader from '@/components/PageHeader'
import { getReminderSettings, saveReminderSettings } from '@/lib/store'

function ToggleRow({ title, checked, onChange, children }) {
    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{title}</span>
                <button onClick={() => onChange(!checked)} className={`w-12 h-7 rounded-full p-1 transition-colors ${checked ? 'bg-emerald-400' : 'bg-gray-200'}`}>
                    <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
                </button>
            </div>
            {checked && children}
        </div>
    )
}

export default function RemindersPage() {
    const router = useRouter()
    const [settings, setSettings] = useState(getReminderSettings())
    useEffect(() => { setSettings(getReminderSettings()) }, [])
    const update = (patch) => setSettings((s) => ({ ...s, ...patch }))
    const inputClass = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-400'

    const handleSave = async () => {
        saveReminderSettings(settings)
        await fetch('/api/user/saveSetting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('syj_token') || ''}` },
            body: JSON.stringify(settings),
        }).catch(() => { })
        // 确保 Push 订阅已注册
        try {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                const perm = await Notification.requestPermission()
                if (perm === 'granted') {
                    const reg = await navigator.serviceWorker.ready
                    let sub = await reg.pushManager.getSubscription()
                    if (!sub) {
                        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
                        const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4)
                        const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/')
                        const rawData = atob(base64)
                        const key = Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
                        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
                        await fetch('/api/push/subscribe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('syj_token') || ''}` },
                            body: JSON.stringify(sub.toJSON()),
                        })
                    }
                }
            }
        } catch {}
        toast.success('提醒设置已保存，推送已开启 🔔')
        router.replace('/profile/settings')
    }

    return (
        <div className="p-4 space-y-4">
            <PageHeader title="消息提醒设置" fallbackHref="/profile/settings" action={<button onClick={handleSave} className="px-4 py-2 rounded-xl bg-emerald-400 text-white text-sm font-semibold">保存</button>} />
            <ToggleRow title="早餐提醒" checked={settings.breakfast_remind} onChange={(v) => update({ breakfast_remind: v })}><input type="time" value={settings.breakfast_time} onChange={(e) => update({ breakfast_time: e.target.value })} className={inputClass} /></ToggleRow>
            <ToggleRow title="午餐提醒" checked={settings.lunch_remind} onChange={(v) => update({ lunch_remind: v })}><input type="time" value={settings.lunch_time} onChange={(e) => update({ lunch_time: e.target.value })} className={inputClass} /></ToggleRow>
            <ToggleRow title="晚餐提醒" checked={settings.dinner_remind} onChange={(v) => update({ dinner_remind: v })}><input type="time" value={settings.dinner_time} onChange={(e) => update({ dinner_time: e.target.value })} className={inputClass} /></ToggleRow>
            <ToggleRow title="喝水提醒" checked={settings.water_remind} onChange={(v) => update({ water_remind: v })}><select value={settings.water_interval} onChange={(e) => update({ water_interval: Number(e.target.value) })} className={inputClass}><option value={1}>每1小时</option><option value={2}>每2小时</option><option value={3}>每3小时</option></select></ToggleRow>
            <ToggleRow title="称重提醒" checked={settings.weight_remind} onChange={(v) => update({ weight_remind: v })}><input type="time" value={settings.weight_time} onChange={(e) => update({ weight_time: e.target.value })} className={inputClass} /></ToggleRow>
        </div>
    )
}
