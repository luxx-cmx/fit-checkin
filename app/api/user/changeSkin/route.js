import { getPool, json, requireProfile, writeProfile } from '../_helpers'

export async function POST(req) {
    const ctx = await requireProfile(req)
    if (ctx.error) return ctx.error
    const body = await req.json().catch(() => ({}))
    const skinType = Number(body.skin_type ?? body.skinType ?? 0)
    if (![0, 1, 2, 3].includes(skinType)) return json(null, 400, '皮肤类型不正确', 400)
    await getPool().query('update users set skin_type = $2 where id = $1', [ctx.userId, skinType])
    await writeProfile(ctx.userId, { ...ctx.profile, skin_type: skinType, skinType })
    return json(null)
}
