// 旧版 AI 视觉识别接口（保留向后兼容）
// 已委托至 /api/v1/ai/vision 使用的共享服务，新功能请调用 v1。
// 该接口将在 3 个迭代周期后下线，调用方请尽快迁移。
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { recognizeFood } from '@/lib/ai/visionService'

const DEPRECATION_HEADERS = {
  'X-Api-Version': 'v0',
  'X-Api-Deprecation': 'true',
  'X-Api-Successor': '/api/v1/ai/vision',
  Warning: '299 - "Deprecated API: use /api/v1/ai/vision"',
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}))
    const result = await recognizeFood({
      imageUrl: body.imageUrl || body.imageDataUrl,
      prompt: body.prompt,
      useCache: body.useCache !== false,
    })

    if (result.ok) {
      // 旧字段结构：{ ok, result }
      return Response.json(
        { ok: true, result: result.result },
        { headers: { ...DEPRECATION_HEADERS, 'X-Request-Id': result.requestId } },
      )
    }

    return Response.json(
      { ok: false, msg: result.msg, fallback: result.fallback || null },
      {
        status: result.status || 500,
        headers: { ...DEPRECATION_HEADERS, 'X-Request-Id': result.requestId },
      },
    )
  } catch (e) {
    return Response.json({ ok: false, msg: e.message || 'AI 识别异常' }, { status: 500 })
  }
}
