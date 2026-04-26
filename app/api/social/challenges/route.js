import { getPool, ensureSchema } from '@/lib/server-db'
import { apiJson, requireUser } from '../../_auth'

function inviteCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function addDays(date, days) {
    const next = new Date(date)
    next.setDate(next.getDate() + days)
    return next.toISOString().slice(0, 10)
}

export async function GET(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    await ensureSchema()
    const pool = getPool()
    const [challenges, guesses] = await Promise.all([
        pool.query(
            `select c.id, c.title, c.challenge_type, c.duration_days, c.reward_points, c.invite_code, c.status, c.start_date, c.end_date,
                    coalesce(cm.progress,0) as progress, cm.status as member_status,
                    (select count(*)::int from challenge_members m where m.challenge_id=c.id) as member_count
             from challenge_records c
             left join challenge_members cm on cm.challenge_id=c.id and cm.user_id=$1
             where c.creator_id=$1 or cm.user_id=$1 or c.status='active'
             order by c.created_at desc limit 20`,
            [auth.userId]
        ),
        pool.query(
            `select g.id, g.food_name, g.reward_points, g.status, g.created_at,
                    exists(select 1 from food_guess_answers a where a.game_id=g.id and a.user_id=$1) as answered
             from food_guess_games g order by g.created_at desc limit 20`,
            [auth.userId]
        )
    ])
    return apiJson({ challenges: challenges.rows, guesses: guesses.rows })
}

export async function POST(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    const body = await req.json().catch(() => ({}))
    const action = body.action || 'create_challenge'
    await ensureSchema()
    const pool = getPool()

    if (action === 'create_challenge') {
        const title = String(body.title || '7天健康打卡挑战').trim().slice(0, 24)
        const duration = [7, 14].includes(Number(body.duration_days)) ? Number(body.duration_days) : 7
        const reward = duration === 14 ? 80 : 30
        const code = inviteCode()
        const startDate = new Date().toISOString().slice(0, 10)
        const endDate = addDays(startDate, duration)
        const { rows } = await pool.query(
            'insert into challenge_records(creator_id,title,challenge_type,duration_days,reward_points,invite_code,start_date,end_date) values($1,$2,$3,$4,$5,$6,$7,$8) returning id, invite_code',
            [auth.userId, title, body.challenge_type || 'checkin', duration, reward, code, startDate, endDate]
        )
        await pool.query("insert into challenge_members(challenge_id,user_id,status) values($1,$2,'active')", [rows[0].id, auth.userId])
        return apiJson(rows[0])
    }

    if (action === 'join_challenge') {
        const code = String(body.invite_code || '').trim().toUpperCase()
        const found = await pool.query("select id from challenge_records where invite_code=$1 and status='active'", [code])
        if (!found.rows[0]) return apiJson(null, 404, '挑战不存在')
        await pool.query("insert into challenge_members(challenge_id,user_id,status) values($1,$2,'active') on conflict(challenge_id,user_id) do update set status='active'", [found.rows[0].id, auth.userId])
        return apiJson({ challenge_id: found.rows[0].id })
    }

    if (action === 'create_guess') {
        const foodName = String(body.food_name || '').trim().slice(0, 30)
        const calories = Number(body.answer_calories || 0)
        if (!foodName || !calories) return apiJson(null, 400, '请填写食物和热量答案')
        const { rows } = await pool.query('insert into food_guess_games(creator_id,food_name,answer_calories,reward_points) values($1,$2,$3,$4) returning id', [auth.userId, foodName, calories, Number(body.reward_points || 5)])
        return apiJson({ id: rows[0].id })
    }

    if (action === 'answer_guess') {
        const gameId = Number(body.game_id)
        const guessed = Number(body.guessed_calories)
        const game = await pool.query("select answer_calories, reward_points from food_guess_games where id=$1 and status='open'", [gameId])
        if (!game.rows[0]) return apiJson(null, 404, '游戏不存在')
        const isCorrect = Math.abs(guessed - Number(game.rows[0].answer_calories)) <= 30
        await pool.query('insert into food_guess_answers(game_id,user_id,guessed_calories,is_correct) values($1,$2,$3,$4) on conflict(game_id,user_id) do update set guessed_calories=$3, is_correct=$4', [gameId, auth.userId, guessed, isCorrect])
        if (isCorrect) {
            await pool.query("insert into point_logs(user_id,points_change,source,detail) values($1,$2,'guess','饮食猜一猜答对')", [auth.userId, Number(game.rows[0].reward_points)])
            await pool.query('insert into point_accounts(user_id,points,updated_at) values($1,$2,now()) on conflict(user_id) do update set points=point_accounts.points+$2, updated_at=now()', [auth.userId, Number(game.rows[0].reward_points)])
        }
        return apiJson({ isCorrect, answer_calories: isCorrect ? game.rows[0].answer_calories : null })
    }

    return apiJson(null, 400, '未知操作')
}
