'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { FOOD_CATEGORIES } from '@/lib/foods'
import { matchFood } from '@/lib/foodSearch'
import { clearSearchHistory, getCommonPortions, getFavorites, getRecentFoods, getSearchHistory, isFavorite, recordSearchHistory, saveCommonPortion, toggleFavorite, trackEvent } from '@/lib/store'

const FILTERS = ['收藏', '最近', ...FOOD_CATEGORIES]

function displayCategory(food) {
    const name = food.name || ''
    if (/鸡蛋|水煮蛋|煎蛋|蛋白|蛋挞/.test(name)) return '蛋类'
    if (food.category === '奶茶零食') return '零食'
    if (food.category === '快餐') return '外卖食品'
    if (/红烧|炒|煎|盖浇|麻辣烫|火锅|烧烤|家常/.test(name)) return '家常菜'
    return food.category || '常见食物'
}

export default function FoodsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [allFoods, setAllFoods] = useState([])
    const [favorites, setFavorites] = useState([])
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('收藏')
    const [selectedFood, setSelectedFood] = useState(null)
    const [portion, setPortion] = useState(100)
    const [customCalories, setCustomCalories] = useState('')
    const [searchHistory, setSearchHistory] = useState([])
    const [commonPortions, setCommonPortions] = useState([])

    const returnTo = searchParams.get('returnTo') || '/diet/add'

    useEffect(() => {
        setFavorites(getFavorites())
        setSearchHistory(getSearchHistory())
        setCommonPortions(getCommonPortions())
        fetch('/api/foods')
            .then((response) => response.json())
            .then((data) => {
                if (data.rows) setAllFoods(data.rows)
            })
            .catch(() => { })
    }, [])

    const foodList = useMemo(() => {
        if (search.trim()) {
            return allFoods.filter((food) => matchFood(food, search.trim())).slice(0, 60)
        }
        if (filter === '收藏') return favorites.slice(0, 60)
        if (filter === '最近') return getRecentFoods(20)
        return allFoods.filter((food) => displayCategory(food) === filter).slice(0, 60)
    }, [allFoods, favorites, filter, search])

    const buildSelectUrl = (food, calories, grams) => {
        const nextParams = new URLSearchParams()
        const date = searchParams.get('date')
        const meal = searchParams.get('meal')
        if (date) nextParams.set('date', date)
        if (meal) nextParams.set('meal', meal)
        nextParams.set('name', food.name)
        nextParams.set('calories', String(calories ?? food.calories ?? 0))
        nextParams.set('note', `${grams}g · ${displayCategory(food)} · 可按烹饪方式调整`)
        return `${returnTo}?${nextParams.toString()}`
    }

    const handleSelect = (food) => {
        if (search.trim()) setSearchHistory(recordSearchHistory(search.trim()))
        setSelectedFood(food)
        setPortion(100)
        setCustomCalories('')
        trackEvent('food_select_open', { name: food.name, category: displayCategory(food) })
    }

    const confirmSelect = () => {
        if (!selectedFood) return
        const grams = Math.max(10, Math.min(500, Number(portion) || 100))
        const computed = Math.round((Number(selectedFood.calories || 0) * grams) / 100)
        const calories = customCalories ? Number(customCalories) : computed
        if (!calories || calories <= 0 || calories > 5000) return toast.error('请输入合理热量')
        toast.success(`已选择 ${selectedFood.name} · ${calories}kcal`)
        setCommonPortions(saveCommonPortion(grams))
        trackEvent('food_select_confirm', { name: selectedFood.name, grams, calories })
        router.push(buildSelectUrl(selectedFood, calories, grams))
    }

    const handleToggleFavorite = (food, event) => {
        event.stopPropagation()
        const added = toggleFavorite(food)
        setFavorites(getFavorites())
        trackEvent(added ? 'food_favorite_add' : 'food_favorite_remove', { name: food.name })
        toast.success(added ? '已收藏' : '已取消收藏')
    }

    const adjustedCalories = selectedFood ? Math.round((Number(selectedFood.calories || 0) * Number(portion || 100)) / 100) : 0

    return (
        <div className="syj-page md:p-6 space-y-4">
            <div className="flex items-center justify-between pt-3">
                <button
                    onClick={() => router.push(returnTo)}
                    className="syj-icon-button w-10 h-10 bg-white/85 shadow-sm text-gray-500"
                >
                    ←
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-bold text-gray-800">食物库</h1>
                    <p className="text-xs text-gray-400 mt-0.5">选择食物后会自动带回记录页</p>
                </div>
                <div className="w-10" />
            </div>

            <div className="syj-card-solid p-4 space-y-3">
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={`搜索 ${allFoods.length || 200}+ 食物...`}
                        className="w-full pl-9 pr-10 py-3 border border-gray-200 rounded-2xl bg-gray-50 text-sm outline-none focus:border-emerald-400"
                    />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-gray-300">✕</button>}
                </div>

                {search.trim() && foodList.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                        {foodList.slice(0, 8).map((food) => (
                            <button key={food.name} onClick={() => setSearch(food.name)} className="whitespace-nowrap px-3 py-1.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                                {food.name}
                            </button>
                        ))}
                    </div>
                )}

                {!search.trim() && (
                    <>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                            {FILTERS.map((item) => (
                                <button
                                    key={item}
                                    onClick={() => setFilter(item)}
                                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === item ? 'bg-emerald-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {item === '收藏' ? '⭐ 收藏' : item === '最近' ? '🕐 最近' : item}
                                </button>
                            ))}
                        </div>
                        {searchHistory.length > 0 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                                <span className="shrink-0 text-[11px] text-gray-400">历史</span>
                                {searchHistory.map((item) => <button key={item} onClick={() => setSearch(item)} className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-gray-500 shadow-sm">{item}</button>)}
                                <button onClick={() => { clearSearchHistory(); setSearchHistory([]) }} className="shrink-0 text-[11px] text-gray-300">清除</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {foodList.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                    {foodList.map((food, index) => {
                        const favorite = isFavorite(food.name)
                        return (
                            <button
                                key={`${food.name}-${index}`}
                                onClick={() => handleSelect(food)}
                                className="syj-card-solid p-4 text-left hover:-translate-y-0.5 hover:shadow-lg transition-all"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800 leading-5">{food.name}</p>
                                        {food.category && (
                                            <span className="syj-pill mt-2 px-2 py-1 bg-blue-50 text-[10px] text-blue-500">
                                                {displayCategory(food)}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(event) => handleToggleFavorite(food, event)}
                                        className={`syj-icon-button w-8 h-8 text-lg leading-none ${favorite ? 'text-amber-400 bg-amber-50' : 'text-gray-300 bg-gray-50'}`}
                                    >
                                        {favorite ? '★' : '☆'}
                                    </button>
                                </div>
                                <div className="mt-4 flex items-end justify-between">
                                    <div>
                                        <p className="text-xl font-bold text-emerald-500">{food.calories}</p>
                                        <p className="text-xs text-gray-400">kcal</p>
                                    </div>
                                    <span className="text-xs font-medium text-emerald-600">添加到记录 →</span>
                                </div>
                            </button>
                        )
                    })}
                </div>
            ) : (
                <div className="syj-card bg-gradient-to-br from-emerald-50/95 to-sky-50/90 py-16 text-center text-gray-400">
                    <div className="text-5xl mb-3">🥗</div>
                    <p className="text-sm">没有找到匹配的食物</p>
                    <p className="text-xs mt-1 text-gray-300">试试搜索其他关键词或切换分类</p>
                    <button onClick={() => router.push(returnTo)} className="mt-4 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-semibold">手动录入</button>
                </div>
            )}

            {/* 食材反馈入口（PM 文档要求） */}
            <div className="text-center">
                <button
                    type="button"
                    onClick={() => {
                        const name = window.prompt('未找到的食材名称？我们将尽快补充：')
                        if (!name || !name.trim()) return
                        trackEvent('food_missing_feedback', { name: name.trim(), q: search.trim() })
                        toast.success('反馈已收到，我们将尽快补充 🙏')
                    }}
                    className="text-xs text-gray-400 underline-offset-2 hover:text-emerald-500 hover:underline"
                >
                    没找到想要的食物？点这里反馈
                </button>
            </div>

            {selectedFood && (
                <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <div className="w-full max-w-[420px] max-h-[86vh] overflow-y-auto rounded-[2rem] bg-white/95 p-5 shadow-2xl backdrop-blur-xl space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{selectedFood.name}</h3>
                                <p className="text-xs text-gray-400 mt-1">默认 {selectedFood.calories}kcal / 100g · {displayCategory(selectedFood)}</p>
                            </div>
                            <button onClick={() => setSelectedFood(null)} className="syj-icon-button w-9 h-9 bg-gray-100 text-gray-400">✕</button>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2"><span className="text-gray-500">分量</span><span className="font-semibold text-emerald-600">{portion}g</span></div>
                            <input type="range" min="10" max="500" step="10" value={portion} onChange={(e) => setPortion(Number(e.target.value))} className="w-full accent-emerald-400" />
                            <div className="flex justify-between text-[10px] text-gray-300 mt-1"><span>10g</span><span>500g</span></div>
                            <div className="mt-3 flex gap-2 overflow-x-auto">
                                {commonPortions.map((grams) => <button key={grams} onClick={() => setPortion(Number(grams))} className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">{grams}g</button>)}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
                            <div className="bg-emerald-50 rounded-2xl p-3"><p className="text-xs text-gray-400">自动换算热量</p><p className="text-2xl font-bold text-emerald-600 mt-1">{adjustedCalories}<span className="text-xs text-gray-400 ml-1">kcal</span></p></div>
                            <div><label className="text-xs text-gray-400 mb-1 block">手动修改热量</label><input type="number" value={customCalories} onChange={(e) => setCustomCalories(e.target.value)} placeholder="可选" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-emerald-400" /></div>
                        </div>
                        <p className="text-xs text-gray-400 leading-5">热量备注：数据按常见食物 100g 估算，不同烹饪方式可手动修正。</p>
                        <button onClick={confirmSelect} className="w-full py-3 rounded-full bg-emerald-400 text-white font-semibold">确认添加到记录</button>
                    </div>
                </div>
            )}
        </div>
    )
}