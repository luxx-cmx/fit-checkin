/**
 * push-scheduler.js
 * 服务端单例：每分钟检查 user_settings，命中时间则发送 Web Push。
 * 在 Next.js Route Handler 首次被 import 时启动（通过 layout 的 server import 触发）。
 */
import cron from 'node-cron'
import { getPool, ensureSchema } from '@/lib/server-db'
import webpush from 'web-push'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@shiyuji.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

async function sendPush(sub, payload) {
  return webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload),
    { TTL: 3600 }
  )
}

let _started = false

function hhmm(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function startPushScheduler() {
  if (_started) return
  _started = true

  // 每分钟整点触发
  cron.schedule('* * * * *', async () => {
    const now = hhmm(new Date())
    try {
      await ensureSchema()
      const pool = getPool()
      if (!pool) return

      const sql = [
        'select s.user_id,',
        's.breakfast_remind, s.breakfast_time,',
        's.lunch_remind, s.lunch_time,',
        's.dinner_remind, s.dinner_time,',
        's.water_remind, s.water_interval,',
        's.weight_remind, s.weight_time',
        'from user_settings s',
        'inner join push_subscriptions ps on ps.user_id = s.user_id',
        'group by s.user_id, s.breakfast_remind, s.breakfast_time,',
        's.lunch_remind, s.lunch_time, s.dinner_remind, s.dinner_time,',
        's.water_remind, s.water_interval, s.weight_remind, s.weight_time',
      ].join(' ')

      const { rows } = await pool.query(sql)

      for (const u of rows) {
        // 获取该用户所有订阅
        const { rows: subs } = await pool.query('select * from push_subscriptions where user_id=$1', [u.user_id])
        if (!subs.length) continue
        const doSend = async (payload) => {
          for (const sub of subs) {
            try { await sendPush(sub, payload) } catch (e) {
              if (e.statusCode === 410 || e.statusCode === 404) {
                await pool.query('delete from push_subscriptions where id=$1', [sub.id])
              }
            }
          }
        }

        if (u.breakfast_remind && u.breakfast_time === now)
          await doSend({ title: '🌅 早餐提醒', body: '早餐时间到了，记得均衡饮食、记录热量哦~', tag: 'breakfast' })

        if (u.lunch_remind && u.lunch_time === now)
          await doSend({ title: '☀️ 午餐提醒', body: '午餐时间到！吃好这顿，下午元气满满～', tag: 'lunch' })

        if (u.dinner_remind && u.dinner_time === now)
          await doSend({ title: '🌙 晚餐提醒', body: '晚餐时间，注意少油少盐，别忘记录哦', tag: 'dinner' })

        if (u.weight_remind && u.weight_time === now)
          await doSend({ title: '⚖️ 体重提醒', body: '每日称重时间，保持记录才能看清趋势', tag: 'weight' })

        if (u.water_remind) {
          const h = new Date().getHours()
          const m = new Date().getMinutes()
          if (m === 0 && h >= 7 && h <= 22 && (h % (u.water_interval || 2) === 0))
            await doSend({ title: '💧 喝水提醒', body: `已过 ${u.water_interval} 小时，记得补充水分～`, tag: 'water' })
        }
      }
    } catch (err) {
      console.error('[push-scheduler] error:', err?.message)
    }
  })

  console.log('[push-scheduler] 已启动，每分钟检查推送任务')
}
