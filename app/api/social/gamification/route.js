import { getPool, ensureSchema } from '@/lib/server-db'
import { apiJson, requireUser } from '../../_auth'

function levelFromExp(exp) {
    return Math.max(1, Math.floor(exp / 100) + 1)
}

export async function GET(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    await ensureSchema()
    const pool = getPool()
    const [{ rows: dayRows }, { rows: socialRows }, { rows: pointRows }] = await Promise.all([
        pool.query(`select count(distinct date)::int as days from (
            select date from diet_records where user_id=$1
            union select date from weight_records where user_id=$1
            union select date from health_records where user_id=$1
        ) t`, [auth.userId]),
        pool.query(`select
            (select count(*)::int from social_posts where user_id=$1) as posts,
            (select count(*)::int from post_comments where user_id=$1) as comments,
            (select count(*)::int from friends where user_id=$1 and status='accepted') as friends`, [auth.userId]),
        pool.query('select coalesce(sum(points_change),0)::int as points from point_logs where user_id=$1', [auth.userId]),
    ])
    const days = dayRows[0]?.days || 0
    const socialScore = (socialRows[0]?.posts || 0) + (socialRows[0]?.comments || 0) + (socialRows[0]?.friends || 0)
    const exp = days * 20 + socialScore * 10
    const level = levelFromExp(exp)
    const computedPoints = days * 10 + socialScore * 5 + (pointRows[0]?.points || 0)

    await pool.query('insert into user_levels(user_id,level,exp,updated_at) values($1,$2,$3,now()) on conflict(user_id) do update set level=$2, exp=$3, updated_at=now()', [auth.userId, level, exp])
    await pool.query('insert into point_accounts(user_id,points,updated_at) values($1,$2,now()) on conflict(user_id) do update set points=greatest(point_accounts.points,$2), updated_at=now()', [auth.userId, computedPoints])

    const achs = [
        { key: 'diet_beginner', name: '记录新星', progress: days, target: 1 },
        { key: 'week_keeper', name: '一周坚持者', progress: days, target: 7 },
        { key: 'social_starter', name: '社交达人', progress: socialScore, target: 3 },
    ]
    for (const a of achs) {
        const unlocked = a.progress >= a.target
        await pool.query(
            `insert into achievements(user_id,achievement_key,achievement_name,progress,target,is_unlocked,unlocked_at)
             values($1,$2,$3,$4,$5,$6,case when $6 then now() else null end)
             on conflict(user_id,achievement_key) do update set progress=$4, target=$5, is_unlocked=$6, unlocked_at=case when achievements.unlocked_at is null and $6 then now() else achievements.unlocked_at end`,
            [auth.userId, a.key, a.name, a.progress, a.target, unlocked]
        )
        if (unlocked) await pool.query('insert into badges(user_id,badge_key,badge_name) values($1,$2,$3) on conflict(user_id,badge_key) do nothing', [auth.userId, a.key, a.name])
    }

    const [levelRes, pointsRes, achievementRes, badgeRes] = await Promise.all([
        pool.query('select level, exp from user_levels where user_id=$1', [auth.userId]),
        pool.query('select points from point_accounts where user_id=$1', [auth.userId]),
        pool.query('select achievement_key, achievement_name, progress, target, is_unlocked, unlocked_at from achievements where user_id=$1 order by is_unlocked desc, target asc', [auth.userId]),
        pool.query('select badge_key, badge_name, earned_at from badges where user_id=$1 order by earned_at desc', [auth.userId]),
    ])

    return apiJson({
        level: levelRes.rows[0] || { level: 1, exp: 0 },
        points: pointsRes.rows[0]?.points || 0,
        achievements: achievementRes.rows,
        badges: badgeRes.rows,
        nextLevelExp: level * 100,
    })
}
