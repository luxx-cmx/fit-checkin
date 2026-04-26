import { getPool, ensureSchema } from '@/lib/server-db'
import { verifyToken, extractToken } from '@/lib/jwt'

export function json(data, code = 200, msg = '操作成功', status = 200) {
    return Response.json({ code, msg, data }, { status })
}

export async function getUserId(req) {
    const token = extractToken(req)
    if (!token) return null
    try { return String((await verifyToken(token)).userId) } catch { return null }
}

export async function readProfile(userId) {
    await ensureSchema()
    const { rows } = await getPool().query('select data from profile_data where user_id = $1', [userId])
    return rows[0]?.data || {}
}

export async function readUserProfile(userId) {
    await ensureSchema()
    const { rows } = await getPool().query(
        `select id, username, nickname, avatar, target_weight, daily_target_calorie,
                gender, height, age, activity_level, skin_type
         from users where id = $1`,
        [userId]
    )
    return rows[0] || {}
}

export async function writeProfile(userId, data) {
    await ensureSchema()
    await getPool().query(
        `insert into profile_data (user_id, data, updated_at)
     values ($1, $2, now())
     on conflict (user_id) do update set data = excluded.data, updated_at = now()`,
        [userId, JSON.stringify(data)]
    )
}

export async function requireProfile(req) {
    const userId = await getUserId(req)
    if (!userId) return { error: json(null, 401, '未登录', 401) }
    const profile = await readProfile(userId)
    const userProfile = await readUserProfile(userId)
    return { userId, profile, userProfile }
}

export { getPool, ensureSchema }
