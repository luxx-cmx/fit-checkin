// API /api/favorites — 读写收藏食物列表
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

// GET → 拉取全部收藏
export async function GET(req) {
  const userId = await getUserId(req)
  if (!userId) return bad('unauthorized', 401)
  await ensureSchema()
  const { rows } = await getPool().query(
    'select name, calories from favorites where user_id = $1 order by created_at desc', [userId]
  )
  return Response.json({ ok: true, rows })
}

// POST body: { name, calories } → 添加/更新收藏
export async function POST(req) {
  const userId = await getUserId(req)
  if (!userId) return bad('unauthorized', 401)
  let body
  try { body = await req.json() } catch { return bad('bad-json') }
  const { name, calories } = body
  if (!name) return bad('no-name')
  await ensureSchema()
  await getPool().query(
    `insert into favorites (user_id, name, calories)
     values ($1, $2, $3)
     on conflict (user_id, name) do update set calories = excluded.calories`,
    [userId, name, calories ?? 0]
  )
  return Response.json({ ok: true })
}

// DELETE ?name=xxx → 删除收藏
export async function DELETE(req) {
  const userId = await getUserId(req)
  if (!userId) return bad('unauthorized', 401)
  const name = new URL(req.url).searchParams.get('name')
  if (!name) return bad('no-name')
  await ensureSchema()
  await getPool().query(
    'delete from favorites where user_id = $1 and name = $2', [userId, name]
  )
  return Response.json({ ok: true })
}
