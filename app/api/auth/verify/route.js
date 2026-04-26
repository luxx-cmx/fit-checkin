import { verifyToken, extractToken } from '@/lib/jwt'

export async function GET(req) {
  const token = extractToken(req)
  if (!token) return Response.json({ ok: false }, { status: 401 })
  try {
    const payload = await verifyToken(token)
    return Response.json({ ok: true, user: { id: payload.userId, username: payload.username } })
  } catch {
    return Response.json({ ok: false }, { status: 401 })
  }
}
