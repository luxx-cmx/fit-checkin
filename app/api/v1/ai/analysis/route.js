// AI 健康分析接口 /api/v1/ai/analysis
// 用户主动触发，传入今日数据 → 豆包文本模型生成自然语言分析
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import https from 'node:https'
import { URL } from 'node:url'

function buildRequestId() {
  return 'ana_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

async function callArkText(prompt) {
  const apiKey = process.env.ARK_API_KEY
  if (!apiKey) throw new Error('ARK_API_KEY 未配置')

  const model = process.env.ARK_MODEL || 'ep-20260427155330-4c8kh'
  const isEpModel = model.startsWith('ep-')
  const arkBase = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3')
    .replace(/\/(responses|chat\/completions)$/, '').replace(/\/$/, '')

  // 文本分析用 chat/completions，responses 端点仅视觉接入点使用
  // ep- 模型的 chat/completions 端点也是可用的
  const url = `${arkBase}/chat/completions`

  const payload = JSON.stringify({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
  })

  const timeoutMs = Number(process.env.ARK_TIMEOUT_MS) || 60000
  const u = new URL(url)

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'POST',
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        family: 4,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          try {
            const data = JSON.parse(text)
            // chat/completions 格式
            const content = data?.choices?.[0]?.message?.content || ''
            if (content) return resolve(content)
            // responses 格式兜底
            const alt = Array.isArray(data?.output)
              ? data.output.flatMap(i => i?.content || []).map(p => p?.text || '').filter(Boolean).join('\n')
              : ''
            if (alt) return resolve(alt)
            reject(new Error(data?.error?.message || `AI返回为空 status=${res.statusCode}`))
          } catch (e) {
            reject(new Error(`解析失败: ${text.slice(0, 100)}`))
          }
        })
      },
    )
    req.on('timeout', () => { req.destroy(new Error('request timeout')) })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

export async function POST(req) {
  const requestId = buildRequestId()
  try {
    const body = await req.json().catch(() => ({}))
    const { calories, target, water, waterTarget, steps, stepsTarget, weight, weightDelta,
      bmi, avgAttainment, missedDays, period, recentFoods, mode, extraContext } = body

    // 构建分析 prompt
    const lines = [
      `你是一位友善专业的营养健康顾问，请根据以下${period ? `近${period}天` : '今日'}健康数据给出简短、温和、有针对性的分析（3-5句话，自然语段，语气轻松不焦虑）：`,
      ``,
      `数据摘要：`,
      calories != null ? `- 今日热量摄入：${calories} kcal（目标 ${target || 1800} kcal）` : null,
      water != null ? `- 今日饮水量：${water} ml（目标 ${waterTarget || 2000} ml）` : null,
      steps != null ? `- 今日步数：${steps} 步（目标 ${stepsTarget || 8000} 步）` : null,
      weight != null ? `- 当前体重：${weight} kg` : null,
      bmi != null ? `- BMI：${bmi}` : null,
      weightDelta != null ? `- 近期体重变化：${weightDelta > 0 ? '+' : ''}${weightDelta} kg` : null,
      avgAttainment != null ? `- 近${period || 7}天热量平均达标率：${avgAttainment}%` : null,
      missedDays != null ? `- 近${period || 7}天未记录或超标天数：${missedDays} 天` : null,
      Array.isArray(recentFoods) && recentFoods.length > 0 ? `- 今日已记录餐食：${recentFoods.slice(0, 5).join('、')}` : null,
      extraContext ? `- 系统分析摘要：${extraContext}` : null,
    ].filter(Boolean).join('\n')

    const fullPrompt = mode === 'deep'
      ? lines + '\n\n请重点分析饮食结构、营养均衡和生活习惯，给出1条最有价值的改进建议。'
      : lines + '\n\n请给出今日整体健康小结和一句鼓励。'

    const t0 = Date.now()
    const text = await callArkText(fullPrompt)
    const costMs = Date.now() - t0

    console.log('[ai/analysis]', requestId, `ok cost=${costMs}ms mode=${mode || 'normal'}`)
    return Response.json({ ok: true, requestId, costMs, text }, {
      headers: { 'X-Request-Id': requestId }
    })
  } catch (e) {
    console.error('[ai/analysis]', requestId, 'fail', e.message)
    return Response.json({ ok: false, requestId, msg: e.message || 'AI 分析失败' }, { status: 500 })
  }
}
