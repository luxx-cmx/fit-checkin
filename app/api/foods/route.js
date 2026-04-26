import { NextResponse } from 'next/server'
import { getPool, ensureSchema, seedFoods } from '@/lib/server-db'
import { FOODS } from '@/lib/foods'

// 确保表存在并种入数据
async function init() {
  await ensureSchema()
  await seedFoods(FOODS)
}

// GET /api/foods?category=主食&search=米饭
export async function GET(req) {
  try {
    await init()
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || ''
    const search = searchParams.get('search') || ''

    let sql = 'select name, calories, category from foods'
    const params = []
    if (search) {
      params.push(`%${search}%`)
      sql += ` where name like $1`
    } else if (category) {
      params.push(category)
      sql += ` where category = $1`
    }
    sql += ' order by category, name limit 200'

    const pool = getPool()
    const { rows } = await pool.query(sql, params)
    return NextResponse.json({ rows })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
