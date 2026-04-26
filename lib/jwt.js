// 服务端 JWT 工具（仅 Node 运行时）
import { SignJWT, jwtVerify } from 'jose'

const getSecret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || 'shiyuji-default-secret-please-change'
  )

export const signToken = (payload) =>
  new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())

export const verifyToken = async (token) => {
  const { payload } = await jwtVerify(token, getSecret())
  return payload
}

export const extractToken = (req) => {
  const auth = req.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}
