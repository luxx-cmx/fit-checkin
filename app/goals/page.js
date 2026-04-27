'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { toast } from 'sonner'
import { addGoalHistory, getGoalHistory, getTodayCalories, getTodayHealth, getProfile, saveProfile } from '@/lib/store'

const DEFAULT = { goal_type: 'fat_loss', calorie_target: 1800, water_target: 2000, steps_target: 8000, sleep_target: 8, exercise_target: 30 }
const RANGE = {
    calorie_target: [800, 3000],
    water_target: [500, 5000],
    steps_target: [0, 50000],
    sleep_target: [4, 12],
    exercise_target: [0, 300],
}

function recommend(profile, goalType = 'fat_loss') {
    const gender = profile.gender || '女'
    const height = Number(profile.height || 165)
    const age = Number(profile.age || 28)
    const latestWeight = Number(profile.currentWeight || profile.targetWeight || Math.max(45, height - 105))
    const bmr = Math.round(10 * latestWeight + 6.25 * height - 5 * age + (gender === '男' ? 5 : -161))
    const factor = profile.activityLevel === '高' ? 1.7 : profile.activityLevel === '低' ? 1.2 : 1.45
    const maintain = Math.round(bmr * factor)
    const delta = goalType === 'muscle_gain' ? 200 : goalType === 'maintain' ? 0 : -300
    return {
        goal_type: goalType,
        calorie_target: Math.max(800, Math.min(3000, maintain + delta)),
        water_target: Math.max(1500, Math.min(3000, Math.round(latestWeight * 35))),
        steps_target: profile.activityLevel === '低' ? 7000 : profile.activityLevel === '高' ? 10000 : 8000,
        sleep_target: 8,
        exercise_target: profile.activityLevel === '高' ? 45 : 30,
        reason: `根据身高、年龄、活动量估算维持热量约 ${maintain}kcal，已按${goalType === 'muscle_gain' ? '增肌' : goalType === 'maintain' ? '维持' : '减脂'}目标生成推荐。`,
    }
}

export default function GoalsPage() {
    const [goals, setGoals] = useState(DEFAULT)
    const [reason, setReason] = useState('')
    const [history, setHistory] = useState([])
    const [phased, setPhased] = useState({ weeks: 8, weeklyChange: -0.5, startDate: '' })

    useEffect(() => {
        const profile = getProfile()
        setHistory(getGoalHistory())
        setGoals((g) => ({ ...g, goal_type: profile.goalType || profile.goal_type || 'fat_loss', calorie_target: Number(profile.dailyCalories) || 1800, water_target: Number(profile.dailyWater) || 2000, steps_target: Number(profile.dailySteps) || 8000, sleep_target: Number(profile.dailySleep) || 8, exercise_target: Number(profile.dailyExercise) || 30 }))
        if (profile.phasedGoal) setPhased({ weeks: 8, weeklyChange: -0.5, startDate: '', ...profile.phasedGoal })
        const token = localStorage.getItem('syj_token')
        if (token) fetch('/api/goals', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).then((d) => { if (d.data) setGoals((g) => ({ ...g, ...d.data, exercise_target: Number(d.data.exercise_target || g.exercise_target) })) }).catch(() => { })
    }, [])

    const health = getTodayHealth()
    const todayWater = health.filter(h => h.type === 'water').reduce((s, h) => s + Number(h.value || 0), 0)
    const todaySteps = health.filter(h => h.type === 'steps').reduce((s, h) => s + Number(h.value || 0), 0)
    const progress = {
        calorie: Math.min(100, Math.round((getTodayCalories() / goals.calorie_target) * 100)) || 0,
        water: Math.min(100, Math.round((todayWater / goals.water_target) * 100)) || 0,
        steps: Math.min(100, Math.round((todaySteps / goals.steps_target) * 100)) || 0,
    }

    const validate = () => Object.entries(RANGE).every(([key, [min, max]]) => {
        const value = Number(goals[key])
        if (Number.isNaN(value) || value < min || value > max) {
            toast.error(`${key === 'calorie_target' ? '热量' : key === 'water_target' ? '饮水' : key === 'steps_target' ? '步数' : key === 'exercise_target' ? '运动' : '睡眠'}目标范围应为 ${min}-${max}`)
            return false
        }
        return true
    })

    const applyRecommend = () => {
        const next = recommend(getProfile(), goals.goal_type)
        setGoals((g) => ({ ...g, ...next }))
        setReason(next.reason)
        toast.success('已生成推荐目标，可继续手动微调')
    }

    const save = async () => {
        if (!validate()) return
        const profile = getProfile()
        saveProfile({ ...profile, goalType: goals.goal_type, goal_type: goals.goal_type, dailyCalories: goals.calorie_target, dailyWater: goals.water_target, dailySteps: goals.steps_target, dailySleep: goals.sleep_target, dailyExercise: goals.exercise_target, phasedGoal: phased })
        addGoalHistory(goals)
        setHistory(getGoalHistory())
        const token = localStorage.getItem('syj_token')
        if (token) await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(goals) }).catch(() => { })
        const done = Object.values(progress).filter((p) => p >= 100).length
        toast.success(done ? `目标已保存，今日已有 ${done} 项达成，太棒啦！` : '目标已保存，首页数据会同步更新')
    }

    const input = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-emerald-400'
    const fields = [['calorie_target', '每日热量 kcal', '800-3000'], ['water_target', '每日饮水 ml', '500-5000'], ['steps_target', '每日步数', '0-50000'], ['sleep_target', '睡眠 h', '4-12'], ['exercise_target', '运动分钟', '0-300']]

    return <div className="p-4 md:p-6 space-y-4"><PageHeader title="目标精细化" subtitle="热量、饮水、步数、睡眠、运动目标" action={<button onClick={save} className="px-4 py-2 rounded-xl bg-emerald-400 text-white text-sm font-semibold">保存</button>} /><div className="bg-white rounded-3xl p-4 shadow-sm space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-gray-700">目标管理</h3><p className="text-xs text-gray-400 mt-1">可随时修改，首页会同步展示目标</p></div><button onClick={applyRecommend} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-semibold">推荐目标</button></div><div className="grid grid-cols-3 gap-2">{[['fat_loss', '减脂'], ['maintain', '维持'], ['muscle_gain', '增肌']].map(([value, label]) => <button key={value} onClick={() => setGoals(g => ({ ...g, goal_type: value }))} className={`py-3 rounded-2xl text-sm font-semibold ${goals.goal_type === value ? 'bg-emerald-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{label}</button>)}</div>{reason && <p className="text-xs text-emerald-600 bg-emerald-50 rounded-2xl px-3 py-2 leading-5">{reason}</p>}<div className="grid grid-cols-2 gap-3">{fields.map(([k, l, tip]) => <div key={k}><label className="text-xs text-gray-400 mb-1 block">{l}</label><input type="number" value={goals[k]} onChange={(e) => setGoals(g => ({ ...g, [k]: Number(e.target.value) }))} className={input} /><p className="text-[10px] text-gray-300 mt-1">范围 {tip}</p></div>)}</div></div><div className="bg-white rounded-3xl p-4 shadow-sm space-y-3"><h3 className="font-semibold text-gray-700">今日达成率</h3>{[['热量', progress.calorie], ['饮水', progress.water], ['步数', progress.steps]].map(([label, p]) => <div key={label}><div className="flex justify-between text-sm mb-1"><span className="text-gray-500">{label}</span><span className="text-emerald-600 font-semibold">{p}%</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${p}%` }} /></div></div>)}</div><div className="bg-white rounded-3xl p-4 shadow-sm space-y-3"><h3 className="font-semibold text-gray-700">阶段性目标 <span className="text-[10px] text-gray-400 font-normal ml-1">把大目标拆成几周一阶段，更容易坚持</span></h3><div className="grid grid-cols-3 gap-2"><div><label className="text-xs text-gray-400 mb-1 block">周期(周)</label><input type="number" min="1" max="52" value={phased.weeks} onChange={(e) => setPhased(p => ({ ...p, weeks: Number(e.target.value) }))} className={input} /></div><div><label className="text-xs text-gray-400 mb-1 block">每周变化(kg)</label><input type="number" step="0.1" value={phased.weeklyChange} onChange={(e) => setPhased(p => ({ ...p, weeklyChange: Number(e.target.value) }))} className={input} /></div><div><label className="text-xs text-gray-400 mb-1 block">开始日期</label><input type="date" value={phased.startDate} onChange={(e) => setPhased(p => ({ ...p, startDate: e.target.value }))} className={input} /></div></div><p className="text-xs text-emerald-600 bg-emerald-50 rounded-2xl px-3 py-2 leading-5">预期 {phased.weeks} 周内总{phased.weeklyChange < 0 ? '减' : '增'} {Math.abs(phased.weeklyChange * phased.weeks).toFixed(1)} kg{phased.startDate ? `，从 ${phased.startDate} 开始` : ''}。健康减脂建议每周 0.3-0.7 kg，循序渐进哦~</p></div><div className="bg-white rounded-3xl p-4 shadow-sm"><h3 className="font-semibold text-gray-700 mb-3">目标修改历史</h3>{history.length ? <div className="space-y-2">{history.slice(0, 5).map((item) => <div key={item.id} className="bg-gray-50 rounded-2xl px-3 py-2"><p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</p><p className="text-sm text-gray-600 mt-1">{item.goals.goal_type === 'muscle_gain' ? '增肌' : item.goals.goal_type === 'maintain' ? '维持' : '减脂'} · 热量 {item.goals.calorie_target}kcal · 饮水 {item.goals.water_target}ml · 步数 {item.goals.steps_target}</p></div>)}</div> : <p className="text-sm text-gray-400 text-center py-6">暂无修改历史，保存目标后会自动记录</p>}</div></div>
}
