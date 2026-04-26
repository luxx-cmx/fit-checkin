import { ensureSchema, getPool } from '@/lib/server-db'

const UPDATE_RECORDS = [
    { id: 1, version: 'v2.0.2', update_time: '2026-04-25', update_type: '新增功能', update_detail: '1. 新增优化版个人中心；2. 新增更新记录页面；3. 强化Q版皮肤切换', is_latest: true },
    { id: 2, version: 'v2.0.1', update_time: '2026-04-25', update_type: '功能优化', update_detail: '1. 新增独立食物库页面；2. 新增独立饮食和体重添加页面；3. 优化页面跳转结构', is_latest: false },
    { id: 3, version: 'v2.0.0', update_time: '2026-04-10', update_type: '新增功能', update_detail: '1. 新增饮食记录、体重记录功能；2. 新增首页数据概览；3. 完成个人中心基础功能', is_latest: false },
]

export async function GET() {
    try {
        await ensureSchema()
        const { rows } = await getPool().query(
            `select id, version, to_char(update_time, 'YYYY-MM-DD') as update_time,
                    update_type, update_detail, is_latest
             from app_update_record
             order by update_time desc, version desc`
        )
        return Response.json({ code: 200, msg: '操作成功', data: { updateRecords: rows.length ? rows : UPDATE_RECORDS } })
    } catch {
        return Response.json({ code: 200, msg: '操作成功', data: { updateRecords: UPDATE_RECORDS } })
    }
}
