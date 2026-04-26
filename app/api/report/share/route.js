import { getPool, ensureSchema } from '@/lib/server-db'
import { apiJson, requireUser } from '../../_auth'

function code() {
    return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

export async function POST(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    const body = await req.json().catch(() => ({}))
    const type = body.report_type || 'week'
    await ensureSchema()
    const pool = getPool()
    const { rows } = await pool.query(
        "select coalesce(sum(calories),0)::int as calories, count(distinct date)::int as days from diet_records where user_id=$1 and date >= current_date - interval '6 day'",
        [auth.userId]
    )
    const summary = { type, calories: rows[0]?.calories || 0, recordDays: rows[0]?.days || 0 }
    const shareCode = code()
    await pool.query(
        `insert into share_reports(user_id, report_type, period_start, period_end, share_code, summary)
     values($1,$2,current_date - interval '6 day',current_date,$3,$4)`,
        [auth.userId, type, shareCode, JSON.stringify(summary)]
    )
    return apiJson({ shareCode, shareUrl: `/share/${shareCode}`, summary })
}
