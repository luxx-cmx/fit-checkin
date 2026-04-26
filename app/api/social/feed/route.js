import { getPool, ensureSchema } from '@/lib/server-db'
import { apiJson, requireUser } from '../../_auth'

function extractMentions(content = '') {
    return Array.from(new Set(String(content).match(/@([\w\u4e00-\u9fa5-]+)/g)?.map((m) => m.slice(1)) || []))
}

export async function GET(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    await ensureSchema()
    const pool = getPool()
    const { rows } = await pool.query(
        `select p.id, p.user_id, p.target_type, p.group_id, p.record_type, p.content, p.detail_hidden, p.payload, p.created_at,
                coalesce(u.nickname, u.username, '用户') as nickname, u.avatar,
                (select count(*)::int from post_likes l where l.post_id=p.id) as like_count,
                exists(select 1 from post_likes l where l.post_id=p.id and l.user_id=$1) as liked,
                coalesce((select json_agg(json_build_object('id', c.id, 'content', c.content, 'created_at', c.created_at, 'nickname', coalesce(cu.nickname, cu.username, '用户')) order by c.created_at desc)
                          from post_comments c left join users cu on cu.id::text=c.user_id where c.post_id=p.id), '[]'::json) as comments
         from social_posts p
         left join users u on u.id::text=p.user_id
         where p.user_id=$1
            or p.target_type='public'
            or exists(select 1 from friends f where f.user_id=$1 and f.friend_user_id=p.user_id and f.status='accepted' and f.blocked=false and p.target_type in ('friends','public'))
            or exists(select 1 from group_members gm1 join group_members gm2 on gm1.group_id=gm2.group_id where gm1.user_id=$1 and gm2.user_id=p.user_id and gm1.status='active' and gm2.status='active' and p.target_type='group')
         order by p.created_at desc limit 50`,
        [auth.userId]
    )
    return apiJson({ posts: rows })
}

export async function POST(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    const body = await req.json().catch(() => ({}))
    const targetType = ['private', 'friends', 'group', 'public'].includes(body.target_type) ? body.target_type : 'friends'
    await ensureSchema()
    const pool = getPool()
    const { rows } = await pool.query(
        `insert into social_posts(user_id, target_type, group_id, record_type, record_id, content, detail_hidden, payload)
         values($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
        [auth.userId, targetType, body.group_id || null, body.record_type || 'daily', body.record_id || null, String(body.content || '').slice(0, 300), Boolean(body.detail_hidden), JSON.stringify(body.payload || {})]
    )
    await pool.query("insert into point_logs(user_id, points_change, source, detail) values($1,5,'post','发布动态')", [auth.userId])
    await pool.query("insert into point_accounts(user_id, points, updated_at) values($1,5,now()) on conflict(user_id) do update set points=point_accounts.points+5, updated_at=now()", [auth.userId])
    return apiJson({ id: rows[0].id })
}

export async function PUT(req) {
    const auth = await requireUser(req)
    if (auth.error) return auth.error
    const body = await req.json().catch(() => ({}))
    const action = body.action
    const postId = Number(body.post_id)
    if (!postId) return apiJson(null, 400, '缺少动态ID')
    await ensureSchema()
    const pool = getPool()
    const post = await pool.query('select user_id from social_posts where id=$1', [postId])
    if (!post.rows[0]) return apiJson(null, 404, '动态不存在')

    if (action === 'like') {
        await pool.query('insert into post_likes(post_id,user_id) values($1,$2) on conflict(post_id,user_id) do nothing', [postId, auth.userId])
        if (post.rows[0].user_id !== auth.userId) await pool.query('insert into social_notifications(user_id,type,content) values($1,$2,$3)', [post.rows[0].user_id, 'like', '你的动态收到一个点赞'])
        return apiJson(null)
    }
    if (action === 'unlike') {
        await pool.query('delete from post_likes where post_id=$1 and user_id=$2', [postId, auth.userId])
        return apiJson(null)
    }
    if (action === 'comment') {
        const content = String(body.content || '').trim().slice(0, 200)
        if (!content) return apiJson(null, 400, '评论不能为空')
        await pool.query('insert into post_comments(post_id,user_id,content,mentions) values($1,$2,$3,$4)', [postId, auth.userId, content, extractMentions(content)])
        if (post.rows[0].user_id !== auth.userId) await pool.query('insert into social_notifications(user_id,type,content) values($1,$2,$3)', [post.rows[0].user_id, 'comment', '你的动态收到一条评论'])
        return apiJson(null)
    }
    return apiJson(null, 400, '未知操作')
}
