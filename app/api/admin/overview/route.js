import { getPool, ensureSchema } from '@/lib/server-db'

export async function GET() {
    await ensureSchema()
    const pool = getPool()
    const [users, diet, weight, foods] = await Promise.all([
        pool.query('select count(*)::int as n from users'),
        pool.query('select count(*)::int as n from diet_records'),
        pool.query('select count(*)::int as n from weight_records'),
        pool.query('select count(*)::int as n from foods'),
    ])
    return Response.json({
        code: 200,
        msg: '操作成功',
        data: {
            users: users.rows[0].n,
            dietRecords: diet.rows[0].n,
            weightRecords: weight.rows[0].n,
            foods: foods.rows[0].n,
        },
    })
}
