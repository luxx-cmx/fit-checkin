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

async function ranking(pool, groupId) {
    const { rows } = await pool.query(
        `select gm.user_id, coalesce(u.nickname, u.username, '用户') as nickname, u.avatar,
                count(distinct d)::int as checkin_days
         from group_members gm
         left join users u on u.id::text=gm.user_id
         left join lateral (
            select date from diet_records where user_id=gm.user_id and date >= current_date - 6
            union select date from weight_records where user_id=gm.user_id and date >= current_date - 6
            union select date from health_records where user_id=gm.user_id and date >= current_date - 6
         ) records(d) on true
         where gm.group_id=$1 and gm.status='active'
         group by gm.user_id, u.nickname, u.username, u.avatar
         order by checkin_days desc, gm.user_id asc`,
        [groupId]
    )
    return rows
}

export async function GET(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    await ensureSchema()
    const pool = getPool()
    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get('group_id')
    if (groupId) return apiJson({ ranking: await ranking(pool, Number(groupId)) })

    const { rows } = await pool.query(
        `select g.id, g.name, g.owner_id, g.invite_code, g.max_members, gm.role,
                (select count(*)::int from group_members m where m.group_id=g.id and m.status='active') as member_count,
                coalesce((select json_agg(json_build_object('goal_type', gg.goal_type, 'target_value', gg.target_value, 'end_date', gg.end_date, 'remind_enabled', gg.remind_enabled) order by gg.created_at desc)
                          from group_goals gg where gg.group_id=g.id), '[]'::json) as goals
         from supervision_groups g
         join group_members gm on gm.group_id=g.id and gm.user_id=$1 and gm.status='active'
         order by g.created_at desc`,
        [auth.userId]
    )
    const withRanking = await Promise.all(rows.map(async (g) => ({ ...g, ranking: await ranking(pool, g.id) })))
    return apiJson({ groups: withRanking })
}

export async function POST(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    const body = await req.json().catch(() => ({}))
    const action = body.action || 'create'
    await ensureSchema()
    const pool = getPool()

    if (action === 'create') {
        const name = String(body.name || '我的监督小组').trim().slice(0, 20)
        const maxMembers = Math.max(2, Math.min(5, Number(body.max_members || 5)))
        const code = inviteCode()
        const startDate = new Date().toISOString().slice(0, 10)
        const endDate = addDays(startDate, 7)
        const { rows } = await pool.query('insert into supervision_groups(name,owner_id,invite_code,max_members) values($1,$2,$3,$4) returning id, invite_code', [name, auth.userId, code, maxMembers])
        await pool.query("insert into group_members(group_id,user_id,role,status) values($1,$2,'owner','active')", [rows[0].id, auth.userId])
        await pool.query("insert into group_goals(group_id,goal_type,target_value,start_date,end_date,remind_enabled) values($1,$2,$3,$4,$5,$6)", [rows[0].id, body.goal_type || 'checkin', Number(body.target_value || 7), startDate, endDate, body.remind_enabled !== false])
        return apiJson(rows[0])
    }

    if (action === 'join') {
        const code = String(body.invite_code || '').trim().toUpperCase()
        const group = await pool.query('select id, max_members from supervision_groups where invite_code=$1', [code])
        if (!group.rows[0]) return apiJson(null, 404, '小组不存在')
        const count = await pool.query("select count(*)::int as n from group_members where group_id=$1 and status='active'", [group.rows[0].id])
        if (count.rows[0].n >= group.rows[0].max_members) return apiJson(null, 400, '小组人数已满')
        await pool.query("insert into group_members(group_id,user_id,role,status) values($1,$2,'member','active') on conflict(group_id,user_id) do update set status='active'", [group.rows[0].id, auth.userId])
        return apiJson({ group_id: group.rows[0].id })
    }

    if (action === 'leave') {
        await pool.query("update group_members set status='left' where group_id=$1 and user_id=$2", [Number(body.group_id), auth.userId])
        return apiJson(null)
    }

    if (action === 'goal') {
        const startDate = new Date().toISOString().slice(0, 10)
        const endDate = addDays(startDate, 7)
        await pool.query("insert into group_goals(group_id,goal_type,target_value,start_date,end_date,remind_enabled) values($1,$2,$3,$4,$5,$6)", [Number(body.group_id), body.goal_type || 'checkin', Number(body.target_value || 7), startDate, endDate, body.remind_enabled !== false])
        return apiJson(null)
    }

    return apiJson(null, 400, '未知操作')
}
