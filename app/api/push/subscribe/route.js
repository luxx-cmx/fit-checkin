import { pool } from '@/lib/server-db'
import { verifyToken, extractToken } from '@/lib/jwt'

async function auth(req) {
  const token = extractToken(req)
  if (!token) return null
  try { return await verifyToken(token) } catch { return null }
}

// POST /api/push/subscribe  — 保存订阅
export async function POST(req) {
  const user = await auth(req)
  if (!user) return Response.json({ ok: false }, { status: 401 })

  const { endpoint, keys } = await req.json()
  if (!endpoint || !keys?.p256dh || !keys?.auth)
    return Response.json({ ok: false, error: 'invalid subscription' }, { status: 400 })

  await pool.query(
    `insert into push_subscriptions(user_id, endpoint, p256dh, auth)
     values($1,$2,$3,$4)
     on conflict(endpoint) do update set user_id=$1, p256dh=$3, auth=$4`,
    [user.userId, endpoint, keys.p256dh, keys.auth]
  )
  return Response.json({ ok: true })
}

// DELETE /api/push/subscribe  — 取消订阅
export async function DELETE(req) {
  const user = await auth(req)
  if (!user) return Response.json({ ok: false }, { status: 401 })

  const { endpoint } = await req.json()
  await pool.query('delete from push_subscriptions where user_id=$1 and endpoint=$2', [user.userId, endpoint])
  return Response.json({ ok: true })
}
