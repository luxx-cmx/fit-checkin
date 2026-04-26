import { getPool, ensureSchema } from '@/lib/server-db'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/jwt'

export async function POST(req) {
  let body
  try { body = await req.json() } catch { return Response.json({ ok: false, msg: '请求格式错误' }, { status: 400 }) }

  const { username, password } = body
  if (!username || !password) return Response.json({ ok: false, msg: '请输入用户名和密码' }, { status: 400 })

  try {
    await ensureSchema()
    const pool = getPool()
    const { rows } = await pool.query(
      'SELECT id, username, password_hash FROM users WHERE username = $1',
      [username]
    )
    if (rows.length === 0) return Response.json({ ok: false, msg: '用户名或密码错误' }, { status: 401 })

    const valid = await bcrypt.compare(password, rows[0].password_hash)
    if (!valid) return Response.json({ ok: false, msg: '用户名或密码错误' }, { status: 401 })

    const user = rows[0]
    const token = await signToken({ userId: String(user.id), username: user.username })
    return Response.json({ ok: true, token, user: { id: user.id, username: user.username } })
  } catch (e) {
    return Response.json({ ok: false, msg: String(e.message || e) }, { status: 500 })
  }
}
