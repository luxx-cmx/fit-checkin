import { getPool, ensureSchema } from '@/lib/server-db'
import { apiJson, requireUser } from '../../_auth'

export async function GET(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    await ensureSchema()
    const pool = getPool()
    const { searchParams } = new URL(req.url)
    const friendId = searchParams.get('friend_id')

    if (friendId) {
        const { rows } = await pool.query(
            `select id, sender_id, receiver_id, content, is_read, created_at
             from private_messages
             where (sender_id=$1 and receiver_id=$2) or (sender_id=$2 and receiver_id=$1)
             order by created_at asc limit 100`,
            [auth.userId, friendId]
        )
        await pool.query('update private_messages set is_read=true where receiver_id=$1 and sender_id=$2', [auth.userId, friendId])
        return apiJson({ messages: rows })
    }

    const [notifications, unread] = await Promise.all([
        pool.query('select id, type, content, is_read, created_at from social_notifications where user_id=$1 order by created_at desc limit 50', [auth.userId]),
        pool.query('select count(*)::int as n from private_messages where receiver_id=$1 and is_read=false', [auth.userId]),
    ])
    return apiJson({ notifications: notifications.rows, unreadMessages: unread.rows[0]?.n || 0 })
}

export async function POST(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    const body = await req.json().catch(() => ({}))
    await ensureSchema()
    const pool = getPool()
    if (body.action === 'read_notifications') {
        await pool.query('update social_notifications set is_read=true where user_id=$1', [auth.userId])
        return apiJson(null)
    }
    const receiverId = String(body.receiver_id || '')
    const content = String(body.content || '').trim().slice(0, 500)
    if (!receiverId || !content) return apiJson(null, 400, '缺少接收人或消息内容')
    const allow = await pool.query("select 1 from friends where user_id=$1 and friend_user_id=$2 and status='accepted' and blocked=false", [auth.userId, receiverId])
    if (!allow.rows[0]) return apiJson(null, 403, '只能给好友发送私信')
    await pool.query('insert into private_messages(sender_id, receiver_id, content) values($1,$2,$3)', [auth.userId, receiverId, content])
    await pool.query('insert into social_notifications(user_id,type,content) values($1,$2,$3)', [receiverId, 'message', '你收到一条新私信'])
    return apiJson(null)
}
