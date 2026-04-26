import { json, requireProfile } from '../_helpers'

export async function GET(req) {
    const ctx = await requireProfile(req)
    if (ctx.error) return ctx.error
    const p = ctx.profile
    const u = ctx.userProfile || {}
    return json({
        id: Number(ctx.userId),
        nickname: u.nickname || p.nickname || p.name || '',
        avatar: u.avatar || p.avatar || '',
        target_weight: Number(u.target_weight || p.targetWeight || p.target_weight || 0),
        daily_target_calorie: Number(u.daily_target_calorie || p.dailyCalories || p.daily_target_calorie || 1800),
        gender: u.gender || p.gender || '',
        height: Number(u.height || p.height || 0),
        age: Number(u.age || p.age || 0),
        activity_level: u.activity_level || p.activityLevel || p.activity_level || '中',
        skin_type: Number(u.skin_type ?? p.skinType ?? p.skin_type ?? 0),
    })
}
