import { extractToken, verifyToken } from '@/lib/jwt'

export function apiJson(data, status = 200, msg = '操作成功') {
    return Response.json({ code: status === 200 ? 200 : status, msg, data }, { status })
}

export async function getUserId(req) {
    const token = extractToken(req)
    if (!token) return null
    try {
        return String((await verifyToken(token)).userId)
    } catch {
        return null
    }
}

export async function requireUser(req) {
    const userId = await getUserId(req)
    if (!userId) return { error: apiJson(null, 401, '未登录') }
    return { userId }
}
