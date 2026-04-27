// AI 视觉识别接口 v1
// 路径：/api/v1/ai/vision
// 设计原则（参考《AI接口后续更新指南》）：
// - 版本共存：旧接口 /api/ai/vision 保持可用，前端逐步切换
// - 稳定性：超时 + 重试 + 降级 + request_id 日志
// - 成本可控：相同图片 2h 内存缓存
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { recognizeFood } from '@/lib/ai/visionService'

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const result = await recognizeFood({
      imageUrl: body.imageUrl || body.imageDataUrl,
      prompt: body.prompt,
      useCache: body.useCache !== false,
    })

    if (result.ok) {
      return Response.json(
        { ok: true, requestId: result.requestId, cached: !!result.cached, costMs: result.costMs ?? null, result: result.result },
        { headers: { 'X-Request-Id': result.requestId, 'X-Api-Version': 'v1' } },
      )
    }

    return Response.json(
      {
        ok: false,
        requestId: result.requestId,
        code: result.code,
        msg: result.msg,
        fallback: result.fallback || null,
      },
      {
        status: result.status || 500,
        headers: { 'X-Request-Id': result.requestId, 'X-Api-Version': 'v1' },
      },
    )
  } catch (e) {
    return Response.json({ ok: false, code: 'SERVER', msg: e.message || 'AI 识别异常' }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    name: 'ai-vision',
    version: 'v1',
    model: process.env.ARK_MODEL || 'doubao-seed-1-6-vision-250815',
  })
}
