// API 路由：/api/sync/[table]
// GET  Authorization: Bearer <token>  → 拉取该用户的所有行
// POST Authorization: Bearer <token>  body: { rows: [...] } → 批量 upsert
import { getPool, ensureSchema } from '@/lib/server-db'
import { verifyToken, extractToken } from '@/lib/jwt'

const TABLE_MAP = {
  diet: {
    name: 'diet_records',
    cols: ['meal', 'name', 'calories', 'date'],
    // date 列在 SELECT 时转为 YYYY-MM-DD 字符串
    selectCols: `meal, name, calories, to_char(date, 'YYYY-MM-DD') as date`,
  },
  weight: {
    name: 'weight_records',
    cols: ['weight', 'date', 'note'],
    selectCols: `weight, to_char(date, 'YYYY-MM-DD') as date, note`,
  },
  health: {
    name: 'health_records',
    cols: ['type', 'value', 'date', 'note'],
    selectCols: `type, value, to_char(date, 'YYYY-MM-DD') as date, note`,
  },
}

function bad(msg, status = 400) {
  return new Response(JSON.stringify({ ok: false, reason: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function GET(req, { params }) {
  const conf = TABLE_MAP[params.table]
  if (!conf) return bad('bad-table')
  const token = extractToken(req)
  if (!token) return bad('unauthorized', 401)
  let userId
  try { userId = (await verifyToken(token)).userId } catch { return bad('invalid-token', 401) }

  try {
    await ensureSchema()
    const { rows } = await getPool().query(
      `select local_id as id, ${conf.selectCols} from ${conf.name} where user_id = $1 order by date desc, id desc`,
      [String(userId)]
    )
    return Response.json({ ok: true, rows })
  } catch (e) {
    return bad(String(e.message || e), 500)
  }
}

export async function POST(req, { params }) {
  const conf = TABLE_MAP[params.table]
  if (!conf) return bad('bad-table')
  const token = extractToken(req)
  if (!token) return bad('unauthorized', 401)
  let userId
  try { userId = String((await verifyToken(token)).userId) } catch { return bad('invalid-token', 401) }

  let body
  try {
    body = await req.json()
  } catch {
    return bad('bad-json')
  }
  const rows = Array.isArray(body?.rows) ? body.rows : []
  if (rows.length === 0) return Response.json({ ok: true, count: 0 })

  const colList = ['user_id', 'local_id', ...conf.cols]
  const placeholders = []
  const values = []
  rows.forEach((r, i) => {
    const base = i * colList.length
    placeholders.push(`(${colList.map((_, k) => `$${base + k + 1}`).join(', ')})`)
    values.push(userId, String(r.id ?? ''), ...conf.cols.map((c) => r[c] ?? null))
  })

  const sql = `
    insert into ${conf.name} (${colList.join(', ')})
    values ${placeholders.join(', ')}
    on conflict (user_id, local_id) do update set
      ${conf.cols.map((c) => `${c} = excluded.${c}`).join(', ')}
  `

  try {
    await ensureSchema()
    await getPool().query(sql, values)
    return Response.json({ ok: true, count: rows.length })
  } catch (e) {
    return bad(String(e.message || e), 500)
  }
}

// DELETE ?id=xxx → 删除单条记录
export async function DELETE(req, { params }) {
  const conf = TABLE_MAP[params.table]
  if (!conf) return bad('bad-table')
  const token = extractToken(req)
  if (!token) return bad('unauthorized', 401)
  let userId
  try { userId = String((await verifyToken(token)).userId) } catch { return bad('invalid-token', 401) }

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return bad('no-id')

  try {
    await ensureSchema()
    await getPool().query(
      `delete from ${conf.name} where user_id = $1 and local_id = $2`,
      [userId, String(id)]
    )
    return Response.json({ ok: true })
  } catch (e) {
    return bad(String(e.message || e), 500)
  }
}
