// API /api/profile — 读写当前用户的个人资料（profile_data 表，每人一行 JSON）
import { getPool, ensureSchema } from '@/lib/server-db'
import { verifyToken, extractToken } from '@/lib/jwt'

function bad(msg, status = 400) {
  return new Response(JSON.stringify({ ok: false, reason: msg }), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}

async function getUserId(req) {
  const token = extractToken(req)
  if (!token) return null
  try { return String((await verifyToken(token)).userId) } catch { return null }
}

// GET → 拉取 profile
export async function GET(req) {
  const userId = await getUserId(req)
  if (!userId) return bad('unauthorized', 401)
  await ensureSchema()
  const { rows } = await getPool().query(
    'select data from profile_data where user_id = $1', [userId]
  )
  return Response.json({ ok: true, data: rows[0]?.data ?? {} })
}

// POST body: { data: {...} } → 整体覆盖保存
export async function POST(req) {
  const userId = await getUserId(req)
  if (!userId) return bad('unauthorized', 401)
  let body
  try { body = await req.json() } catch { return bad('bad-json') }
  const data = body?.data ?? {}
  await ensureSchema()
  await getPool().query(
    `insert into profile_data (user_id, data, updated_at)
     values ($1, $2, now())
     on conflict (user_id) do update set data = excluded.data, updated_at = now()`,
    [userId, JSON.stringify(data)]
  )
  return Response.json({ ok: true })
}
