import { getPool, ensureSchema } from '@/lib/server-db'
import { apiJson, requireUser } from '../../_auth'

const DEFAULT_GROUPS = ['家人', '朋友', '同事']

export async function GET(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    await ensureSchema()
    const pool = getPool()
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()

    if (q) {
        const { rows } = await pool.query(
            `select u.id::text as id, u.username, coalesce(u.nickname, u.username) as nickname, u.avatar,
                    f.status, f.group_name, f.blocked
             from users u
             left join friends f on f.user_id=$1 and f.friend_user_id=u.id::text
             where u.id::text<>$1 and (u.username ilike $2 or coalesce(u.nickname,'') ilike $2)
             order by u.created_at desc limit 20`,
            [auth.userId, `%${q}%`]
        )
        return apiJson({ users: rows, groups: DEFAULT_GROUPS })
    }

    const { rows } = await pool.query(
        `select f.friend_user_id as id, f.status, f.visibility, f.group_name, f.remark, f.blocked, f.created_at,
                u.username, coalesce(u.nickname, u.username) as nickname, u.avatar
         from friends f
         left join users u on u.id::text=f.friend_user_id
         where f.user_id=$1
         order by f.blocked asc, f.group_name asc, f.created_at desc`,
        [auth.userId]
    )
    return apiJson({ friends: rows, groups: DEFAULT_GROUPS })
}

export async function POST(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    const body = await req.json().catch(() => ({}))
    const action = body.action || 'add'
    await ensureSchema()
    const pool = getPool()

    if (action === 'add') {
        let targetId = body.friend_user_id ? String(body.friend_user_id) : ''
        if (!targetId && body.username) {
            const found = await pool.query('select id::text as id from users where username=$1 or nickname=$1 limit 1', [String(body.username).trim()])
            targetId = found.rows[0]?.id || ''
        }
        if (!targetId || targetId === auth.userId) return apiJson(null, 400, '好友不存在')
        const groupName = DEFAULT_GROUPS.includes(body.group_name) ? body.group_name : '朋友'
        await pool.query(
            `insert into friends(user_id, friend_user_id, status, visibility, group_name, blocked, updated_at)
             values($1,$2,'accepted','friends',$3,false,now())
             on conflict(user_id, friend_user_id) do update set status='accepted', group_name=$3, blocked=false, updated_at=now()`,
            [auth.userId, targetId, groupName]
        )
        await pool.query(
            `insert into friends(user_id, friend_user_id, status, visibility, group_name, blocked, updated_at)
             values($1,$2,'accepted','friends','朋友',false,now())
             on conflict(user_id, friend_user_id) do update set status='accepted', blocked=false, updated_at=now()`,
            [targetId, auth.userId]
        )
        await pool.query('insert into social_notifications(user_id,type,content) values($1,$2,$3)', [targetId, 'friend', '你有一位新好友'])
        return apiJson(null)
    }

    const friendId = String(body.friend_user_id || '')
    if (!friendId) return apiJson(null, 400, '缺少好友ID')

    if (action === 'delete') {
        await pool.query('delete from friends where (user_id=$1 and friend_user_id=$2) or (user_id=$2 and friend_user_id=$1)', [auth.userId, friendId])
        return apiJson(null)
    }
    if (action === 'block') {
        await pool.query("update friends set status='blocked', blocked=true, updated_at=now() where user_id=$1 and friend_user_id=$2", [auth.userId, friendId])
        return apiJson(null)
    }
    if (action === 'group') {
        const groupName = DEFAULT_GROUPS.includes(body.group_name) ? body.group_name : '朋友'
        await pool.query('update friends set group_name=$3, updated_at=now() where user_id=$1 and friend_user_id=$2', [auth.userId, friendId, groupName])
        return apiJson(null)
    }
    return apiJson(null, 400, '未知操作')
}
