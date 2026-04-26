import { getPool, ensureSchema } from '@/lib/server-db'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/jwt'

export async function POST(req) {
  let body
  try { body = await req.json() } catch { return Response.json({ ok: false, msg: '请求格式错误' }, { status: 400 }) }

  const { username, password } = body
  if (!username || !password) return Response.json({ ok: false, msg: '用户名和密码不能为空' }, { status: 400 })
  if (username.length < 2) return Response.json({ ok: false, msg: '用户名至少2个字符' }, { status: 400 })
  if (password.length < 6) return Response.json({ ok: false, msg: '密码至少6位' }, { status: 400 })

  try {
    await ensureSchema()
    const pool = getPool()
    const { rows } = await pool.query('SELECT id FROM users WHERE username = $1', [username])
    if (rows.length > 0) return Response.json({ ok: false, msg: '用户名已被占用' }, { status: 400 })

    const hash = await bcrypt.hash(password, 10)
    const { rows: [user] } = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, hash]
    )
    const token = await signToken({ userId: String(user.id), username: user.username })
    return Response.json({ ok: true, token, user: { id: user.id, username: user.username } })
  } catch (e) {
    return Response.json({ ok: false, msg: String(e.message || e) }, { status: 500 })
  }
}
