import { getPool, ensureSchema } from '@/lib/server-db'
import { apiJson, requireUser } from '../_auth'

const DEFAULT = { calorie_target: 1800, water_target: 2000, steps_target: 8000, sleep_target: 8, exercise_target: 300 }

export async function GET(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    await ensureSchema()
    const { rows } = await getPool().query('select calorie_target, water_target, steps_target, sleep_target, exercise_target from user_goals where user_id=$1', [auth.userId])
    return apiJson({ ...DEFAULT, ...(rows[0] || {}) })
}

export async function POST(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    const body = await req.json().catch(() => ({}))
    const goals = { ...DEFAULT, ...body }
    await ensureSchema()
    await getPool().query(
        `insert into user_goals(user_id, calorie_target, water_target, steps_target, sleep_target, exercise_target, updated_at)
     values($1,$2,$3,$4,$5,$6,now())
     on conflict(user_id) do update set calorie_target=$2, water_target=$3, steps_target=$4, sleep_target=$5, exercise_target=$6, updated_at=now()`,
        [auth.userId, Number(goals.calorie_target), Number(goals.water_target), Number(goals.steps_target), Number(goals.sleep_target), Number(goals.exercise_target)]
    )
    await getPool().query('update users set daily_target_calorie=$2 where id=$1', [auth.userId, Number(goals.calorie_target)])
    return apiJson(null)
}
