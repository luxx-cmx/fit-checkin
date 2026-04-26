import { getPool, json, requireProfile, writeProfile } from '../_helpers'

export async function POST(req) {
    const ctx = await requireProfile(req)
    if (ctx.error) return ctx.error
    const body = await req.json().catch(() => ({}))
    const next = {
        ...ctx.profile,
        nickname: body.nickname ?? ctx.profile.nickname,
        name: body.nickname ?? ctx.profile.name,
        avatar: body.avatar ?? ctx.profile.avatar,
        targetWeight: body.target_weight ?? body.targetWeight ?? ctx.profile.targetWeight,
        dailyCalories: body.daily_target_calorie ?? body.dailyCalories ?? ctx.profile.dailyCalories,
    }
    await getPool().query(
        `update users
         set nickname = $2, avatar = $3, target_weight = $4, daily_target_calorie = $5
         where id = $1`,
        [ctx.userId, next.nickname || null, next.avatar || null, next.targetWeight || null, next.dailyCalories || 1800]
    )
    await writeProfile(ctx.userId, next)
    return json(null)
}
