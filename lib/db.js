// 自建 PostgreSQL 云同步客户端（v2.0 骨架 / v2.1 完整接入）
//
// 运行时行为：
//   - 浏览器端：调用本项目的 /api/sync/* Next.js API（无需暴露数据库密码）
//   - 服务端：由 /api/sync/* 路由通过 pg 直连 Postgres
//
// 未配置 DATABASE_URL 时：isCloudSyncEnabled() 返回 false，应用继续用 localStorage。

export const isCloudSyncEnabled = () => {
  // 浏览器侧由 NEXT_PUBLIC_CLOUD_SYNC=1 开启（开关），
  // 服务端在 API 路由里会再校验 DATABASE_URL 是否存在。
  if (typeof window === 'undefined') {
    return !!process.env.DATABASE_URL
  }
  return process.env.NEXT_PUBLIC_CLOUD_SYNC === '1'
}

const TABLES = ['diet', 'weight', 'health']

// 上行：把某表的本地数据整体 upsert 到远端（JWT 自动携带用户身份）
export const syncUp = async (table, rows, token) => {
  if (!TABLES.includes(table)) return { ok: false, reason: 'bad-table' }
  if (!token) return { ok: false, reason: 'no-token' }
  try {
    const res = await fetch(`/api/sync/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rows }),
    })
    return await res.json()
  } catch (e) {
    return { ok: false, reason: String(e) }
  }
}

// 下行：拉取远端全部数据
export const syncDown = async (table, token) => {
  if (!TABLES.includes(table)) return { ok: false, rows: [] }
  if (!token) return { ok: false, reason: 'no-token', rows: [] }
  try {
    const res = await fetch(`/api/sync/${table}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return await res.json()
  } catch (e) {
    return { ok: false, rows: [], reason: String(e) }
  }
}
