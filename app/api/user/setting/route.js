import { getPool, json, requireProfile } from '../_helpers'

const DEFAULT_SETTINGS = {
    breakfast_remind: true,
    breakfast_time: '07:30',
    lunch_remind: true,
    lunch_time: '12:00',
    dinner_remind: true,
    dinner_time: '18:30',
    water_remind: true,
    water_interval: 2,
    weight_remind: false,
    weight_time: '20:00',
}

export async function GET(req) {
    const ctx = await requireProfile(req)
    if (ctx.error) return ctx.error
    const { rows } = await getPool().query(
        `select breakfast_remind, breakfast_time, lunch_remind, lunch_time,
                dinner_remind, dinner_time, water_remind, water_interval,
                weight_remind, weight_time
         from user_settings where user_id = $1`,
        [ctx.userId]
    )
    return json({ ...DEFAULT_SETTINGS, ...(ctx.profile.reminders || {}), ...(rows[0] || {}) })
}
