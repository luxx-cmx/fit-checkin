import webpush from 'web-push'
import { getPool, ensureSchema } from '@/lib/server-db'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@shiyuji.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

/**
 * 给指定用户发送推送
 * @param {string} userId
 * @param {{ title: string, body: string, tag?: string }} payload
 */
export async function sendPushToUser(userId, payload) {
  await ensureSchema()
  const pool = getPool()
  const { rows } = await pool.query(
    'select id, endpoint, p256dh, auth from push_subscriptions where user_id=$1',
    [userId]
  )
  const results = await Promise.allSettled(
    rows.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 3600 }
      ).catch(async (err) => {
        // 410 Gone / 404 — 订阅已失效，删除
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query('delete from push_subscriptions where id=$1', [sub.id])
        }
        throw err
      })
    )
  )
  return results
}

// POST /api/push/send  (内部调用，需要 CRON_SECRET 头保护)
export async function POST(req) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return Response.json({ ok: false }, { status: 403 })
  }
  const { userId, title, body, tag } = await req.json()
  await sendPushToUser(userId, { title, body, tag: tag || 'syj-remind' })
  return Response.json({ ok: true })
}
