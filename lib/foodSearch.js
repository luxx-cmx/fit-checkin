// 食物搜索同义词 / 别名表，用于提升模糊搜索精准度
// 用法：normalizeQuery(q) 返回扩展后的关键词数组
const SYNONYMS = {
    '鸡胸脯': ['鸡胸', '鸡胸肉'],
    '鸡胸': ['鸡胸肉'],
    '鸡蛋': ['水煮蛋', '煎蛋', '蛋'],
    '蛋': ['鸡蛋', '水煮蛋'],
    '米': ['米饭', '小米', '糙米', '黑米'],
    '面': ['面条', '意大利面', '荞麦面', '拉面', '担担面'],
    '粉': ['米粉', '河粉', '粉丝'],
    '可乐': ['可乐', '零度可乐'],
    '奶茶': ['珍珠奶茶', '奶茶'],
    '咖啡': ['美式咖啡', '拿铁', '卡布奇诺', '摩卡'],
    '牛肉': ['牛排', '牛腱', '牛肉'],
    '猪': ['猪肉', '猪里脊', '红烧肉'],
    '鱼': ['三文鱼', '鲈鱼', '带鱼', '鲫鱼'],
    '虾': ['虾', '鲜虾仁'],
    '青菜': ['上海青', '油麦菜', '生菜', '菠菜'],
    '土豆': ['土豆', '薯条', '薯片'],
    '番茄': ['西红柿'],
    '西红柿': ['番茄'],
    '酸奶': ['酸奶', '希腊酸奶'],
    '麦片': ['燕麦片', '即食燕麦'],
    '燕麦': ['燕麦片', '即食燕麦'],
    '汉堡': ['汉堡', '巨无霸', '吉士汉堡', '鸡腿堡'],
    '披萨': ['披萨', 'pizza'],
    '寿司': ['寿司'],
}

export function expandQuery(q) {
    const raw = String(q || '').trim().toLowerCase()
    if (!raw) return []
    const set = new Set([raw])
    for (const [k, vs] of Object.entries(SYNONYMS)) {
        if (raw.includes(k.toLowerCase())) vs.forEach((v) => set.add(v.toLowerCase()))
        if (vs.some((v) => raw.includes(v.toLowerCase()))) set.add(k.toLowerCase())
    }
    return [...set]
}

export function matchFood(food, q) {
    const name = String(food?.name || '').toLowerCase()
    if (!name) return false
    const keys = expandQuery(q)
    return keys.some((k) => name.includes(k))
}
