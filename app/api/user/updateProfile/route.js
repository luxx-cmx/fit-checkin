import { getPool, json, requireProfile, writeProfile } from '../_helpers'

const FACTOR = { 低: 1.2, 中: 1.45, 高: 1.7 }
function calcBmr(gender, height, age) {
    const baseWeight = Math.max(45, Number(height) - 105)
    return Math.round(10 * baseWeight + 6.25 * Number(height) - 5 * Number(age) + (gender === '男' ? 5 : -161))
}

export async function POST(req) {
    const ctx = await requireProfile(req)
    if (ctx.error) return ctx.error
    const body = await req.json().catch(() => ({}))
    const gender = body.gender
    const height = Number(body.height)
    const age = Number(body.age)
    const activityLevel = body.activity_level || body.activityLevel || '中'
    if (!gender || !height || !age) return json(null, 400, '参数不完整', 400)
    const bmr = calcBmr(gender, height, age)
    const recommend = Math.round(bmr * (FACTOR[activityLevel] || 1.45))
    await getPool().query(
        `update users
         set gender = $2, height = $3, age = $4, activity_level = $5, daily_target_calorie = $6
         where id = $1`,
        [ctx.userId, gender, height, age, activityLevel, recommend]
    )
    await writeProfile(ctx.userId, { ...ctx.profile, gender, height, age, activityLevel, activity_level: activityLevel, dailyCalories: recommend })
    return json({ bmr, recommend_calorie: recommend })
}
