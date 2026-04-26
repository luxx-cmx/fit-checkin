'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageHeader from '@/components/PageHeader'

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('syj_token') || ''}` })

export default function GamesPage() {
    const [game, setGame] = useState({ level: { level: 1, exp: 0 }, points: 0, achievements: [], badges: [] })
    const [challenges, setChallenges] = useState([])
    const [guesses, setGuesses] = useState([])
    const [food, setFood] = useState('苹果')
    const [cal, setCal] = useState(52)
    const [activeGuessId, setActiveGuessId] = useState(null)
    const [guessValue, setGuessValue] = useState('')
    const load = () => {
        fetch('/api/social/gamification', { headers: authHeader() }).then(r => r.json()).then(d => d.data && setGame(d.data)).catch(() => { })
        fetch('/api/social/challenges', { headers: authHeader() }).then(r => r.json()).then(d => { setChallenges(d.data?.challenges || []); setGuesses(d.data?.guesses || []) }).catch(() => { })
    }
    useEffect(() => { void load() }, [])
    const post = async (body, ok) => { await fetch('/api/social/challenges', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(body) }); toast.success(ok); load() }
    const submitGuess = async () => {
        const guessedCalories = Number(guessValue)
        if (!activeGuessId) return
        if (!guessedCalories) return toast.error('请输入要猜的热量')
        await post({ action: 'answer_guess', game_id: activeGuessId, guessed_calories: guessedCalories }, '已提交答案')
        setActiveGuessId(null)
        setGuessValue('')
    }
    const pct = Math.min(100, Math.round((game.level.exp % 100)))
    return <div className="p-4 space-y-4"><PageHeader title="游戏化激励" subtitle="等级、积分、徽章、挑战赛、饮食猜一猜" fallbackHref="/social" /><div className="bg-gradient-to-br from-amber-300 to-orange-400 rounded-3xl p-5 text-white shadow-lg"><p className="text-sm opacity-90">当前等级</p><p className="text-4xl font-bold mt-1">Lv.{game.level.level}</p><div className="h-2 bg-white/30 rounded-full overflow-hidden mt-4"><div className="h-full bg-white" style={{ width: `${pct}%` }} /></div><p className="text-sm mt-2 opacity-90">积分 {game.points} · 经验 {game.level.exp}/{game.nextLevelExp || 100}</p></div><div className="bg-white rounded-3xl p-4 shadow-sm"><h3 className="font-semibold text-gray-700 mb-3">成就</h3><div className="space-y-2">{game.achievements.map(a => <div key={a.achievement_key}><div className="flex justify-between text-sm"><span>{a.is_unlocked ? '🏆' : '🔒'} {a.achievement_name}</span><span className="text-gray-400">{a.progress}/{a.target}</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1"><div className="h-full bg-amber-300" style={{ width: `${Math.min(100, Math.round(a.progress / a.target * 100))}%` }} /></div></div>)}</div></div><div className="bg-white rounded-3xl p-4 shadow-sm space-y-3"><h3 className="font-semibold text-gray-700">打卡挑战赛</h3><button onClick={() => post({ action: 'create_challenge', title: '7天健康打卡挑战', duration_days: 7 }, '挑战已发起')} className="w-full py-3 rounded-2xl bg-emerald-400 text-white font-semibold">发起7天挑战</button>{challenges.slice(0, 3).map(c => <div key={c.id} className="bg-gray-50 rounded-2xl p-3"><p className="font-medium text-gray-700">{c.title}</p><p className="text-xs text-gray-400">邀请码 {c.invite_code} · {c.member_count}人参与 · 奖励{c.reward_points}积分</p></div>)}</div><div className="bg-white rounded-3xl p-4 shadow-sm space-y-3"><h3 className="font-semibold text-gray-700">饮食猜一猜</h3><div className="grid grid-cols-2 gap-2"><input value={food} onChange={e => setFood(e.target.value)} className="px-4 py-3 bg-gray-50 rounded-2xl text-sm outline-none" /><input type="number" value={cal} onChange={e => setCal(Number(e.target.value))} className="px-4 py-3 bg-gray-50 rounded-2xl text-sm outline-none" /></div><button onClick={() => post({ action: 'create_guess', food_name: food, answer_calories: cal }, '猜热量游戏已创建')} className="w-full py-3 rounded-2xl bg-amber-300 text-white font-semibold">创建猜热量</button>{guesses.slice(0, 3).map(g => <div key={g.id} className="bg-gray-50 rounded-2xl p-3 space-y-3"><div className="flex justify-between text-sm"><span>{g.food_name}</span><button disabled={g.answered} onClick={() => { setActiveGuessId(g.id); setGuessValue('') }} className="text-emerald-600 disabled:text-gray-400">{g.answered ? '已参与' : '去猜'}</button></div>{activeGuessId === g.id && !g.answered ? <div className="flex gap-2"><input type="number" value={guessValue} onChange={e => setGuessValue(e.target.value)} placeholder="输入你猜的 kcal" className="flex-1 px-4 py-2.5 bg-white rounded-xl text-sm outline-none border border-gray-200" /><button onClick={submitGuess} className="px-4 rounded-xl bg-emerald-400 text-white text-sm font-semibold">提交</button></div> : null}</div>)}</div></div>
}
