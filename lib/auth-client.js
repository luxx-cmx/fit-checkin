// 浏览器端 Auth 工具函数
const TOKEN_KEY = 'syj_token'
const USER_KEY = 'syj_user'

function parseJwtPayload(token) {
  try {
    const base64 = token.split('.')[1]
    if (!base64) return null
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

export const getTokenExpiry = (token) => {
  const payload = parseJwtPayload(token)
  return typeof payload?.exp === 'number' ? payload.exp * 1000 : null
}

export const getToken = () => {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  const expiresAt = getTokenExpiry(token)
  if (expiresAt !== null && Date.now() >= expiresAt) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    return null
  }
  return token
}

export const getUser = () => {
  if (typeof window === 'undefined') return null
  if (!getToken()) return null
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export const saveAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const isLoggedIn = () => !!getToken()

export const authHeaders = () => {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
