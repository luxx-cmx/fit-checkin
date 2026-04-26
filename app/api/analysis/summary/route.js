import { getPool, ensureSchema } from '@/lib/server-db'
import { apiJson, requireUser } from '../../_auth'

function calcBmi(weight, height) {
    if (!weight || !height) return null
    const m = Number(height) / 100
    return Number((Number(weight) / (m * m)).toFixed(1))
}
function calcBmr(gender, height, age, weight) {
    if (!height || !age || !weight) return null
    return Math.round(10 * Number(weight) + 6.25 * Number(height) - 5 * Number(age) + (gender === '男' ? 5 : -161))
}
function advice({ calories, target, veggieCount, bmi }) {
    const out = []
    if (target && calories > target) out.push('今日热量已超过目标，晚餐建议选择低脂高蛋白。')
    if (target && calories < target * 0.6) out.push('今日摄入偏低，注意补足优质碳水和蛋白质。')
    if (veggieCount < 2) out.push('蔬菜摄入偏少，建议增加一份绿叶菜。')
    if (bmi && bmi >= 24) out.push('BMI略高，建议保持热量缺口并增加步行。')
    if (!out.length) out.push('今日记录整体稳定，继续保持。')
    return out
}

export async function GET(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    await ensureSchema()
    const pool = getPool()
    const today = new Date().toISOString().slice(0, 10)
    const [userRes, dietRes, weightRes, healthRes, weekDietRes] = await Promise.all([
        pool.query('select gender, height, age, daily_target_calorie from users where id=$1', [auth.userId]),
        pool.query('select coalesce(sum(calories),0)::int as calories, count(*)::int as n from diet_records where user_id=$1 and date=$2', [auth.userId, today]),
        pool.query('select weight from weight_records where user_id=$1 order by date desc, created_at desc limit 1', [auth.userId]),
        pool.query('select type, value from health_records where user_id=$1 and date=$2', [auth.userId, today]),
        pool.query("select date, coalesce(sum(calories),0)::int as calories from diet_records where user_id=$1 and date >= current_date - interval '6 day' group by date order by date", [auth.userId]),
    ])
    const user = userRes.rows[0] || {}
    const weight = Number(weightRes.rows[0]?.weight || 0)
    const target = Number(user.daily_target_calorie || 1800)
    const calories = Number(dietRes.rows[0]?.calories || 0)
    const water = healthRes.rows.filter((r) => r.type === 'water').reduce((s, r) => s + (Number(r.value) || 0), 0)
    const steps = healthRes.rows.filter((r) => r.type === 'steps').reduce((s, r) => s + (Number(r.value) || 0), 0)
    const bmi = calcBmi(weight, user.height)
    const bmr = calcBmr(user.gender, user.height, user.age, weight)
    const veggieCount = 0
    return apiJson({
        today: { calories, target, remaining: Math.max(target - calories, 0), water, steps },
        body: { weight, bmi, bmr, recommendCalorie: bmr ? Math.round(bmr * 1.45) : target },
        weekCalories: weekDietRes.rows,
        advice: advice({ calories, target, veggieCount, bmi }),
    })
}
