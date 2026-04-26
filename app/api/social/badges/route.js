import { getPool, ensureSchema } from '@/lib/server-db'
import { apiJson, requireUser } from '../../_auth'

export async function GET(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    await ensureSchema()
    const pool = getPool()
    const { rows: dayRows } = await pool.query(
        `select count(distinct date)::int as days from (
      select date from diet_records where user_id=$1
      union select date from weight_records where user_id=$1
      union select date from health_records where user_id=$1
    ) t`,
        [auth.userId]
    )
    const days = dayRows[0]?.days || 0
    const badgeDefs = [
        { key: 'record_1', name: '初次打卡', pass: days >= 1 },
        { key: 'record_7', name: '坚持一周', pass: days >= 7 },
        { key: 'record_30', name: '月度达人', pass: days >= 30 },
    ]
    for (const b of badgeDefs.filter((b) => b.pass)) {
        await pool.query('insert into badges(user_id,badge_key,badge_name) values($1,$2,$3) on conflict(user_id,badge_key) do nothing', [auth.userId, b.key, b.name])
    }
    const { rows } = await pool.query('select badge_key, badge_name, earned_at from badges where user_id=$1 order by earned_at desc', [auth.userId])
    return apiJson({ recordDays: days, badges: rows })
}
