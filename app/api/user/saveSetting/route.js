import { getPool, json, requireProfile, writeProfile } from '../_helpers'

export async function POST(req) {
    const ctx = await requireProfile(req)
    if (ctx.error) return ctx.error
    const body = await req.json().catch(() => ({}))
    await getPool().query(
        `insert into user_settings (
            user_id, breakfast_remind, breakfast_time, lunch_remind, lunch_time,
            dinner_remind, dinner_time, water_remind, water_interval,
            weight_remind, weight_time, updated_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
         on conflict(user_id) do update set
            breakfast_remind = excluded.breakfast_remind,
            breakfast_time = excluded.breakfast_time,
            lunch_remind = excluded.lunch_remind,
            lunch_time = excluded.lunch_time,
            dinner_remind = excluded.dinner_remind,
            dinner_time = excluded.dinner_time,
            water_remind = excluded.water_remind,
            water_interval = excluded.water_interval,
            weight_remind = excluded.weight_remind,
            weight_time = excluded.weight_time,
            updated_at = now()`,
        [
            ctx.userId,
            Boolean(body.breakfast_remind), body.breakfast_time || '07:30',
            Boolean(body.lunch_remind), body.lunch_time || '12:00',
            Boolean(body.dinner_remind), body.dinner_time || '18:30',
            Boolean(body.water_remind), Number(body.water_interval) || 2,
            Boolean(body.weight_remind), body.weight_time || '20:00',
        ]
    )
    await writeProfile(ctx.userId, { ...ctx.profile, reminders: body })
    return json(null)
}
