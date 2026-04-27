export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function extractText(data) {
  if (typeof data?.output_text === 'string') return data.output_text
  if (Array.isArray(data?.output)) {
    return data.output
      .flatMap((item) => item?.content || [])
      .map((part) => part?.text || '')
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

function parseJsonFromText(text) {
  const raw = String(text || '').trim()
  if (!raw) return null
  try { return JSON.parse(raw) } catch {}
  const match = raw.match(/```json\s*([\s\S]*?)```|\{[\s\S]*\}/i)
  if (!match) return null
  const jsonText = match[1] || match[0]
  try { return JSON.parse(jsonText) } catch { return null }
}

function normalizeResult(parsed, fallbackText) {
  const name = String(parsed?.name || parsed?.food || parsed?.食物名称 || '').trim()
  const calories = Number(parsed?.calories ?? parsed?.kcal ?? parsed?.热量)
  const confidence = Number(parsed?.confidence ?? parsed?.置信度 ?? 0)
  const note = String(parsed?.note || parsed?.reason || parsed?.说明 || fallbackText || '').trim()

  return {
    name: name || '餐食识别结果',
    calories: Number.isFinite(calories) && calories > 0 ? Math.round(calories) : 450,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
    note: note.slice(0, 240),
    rawText: fallbackText,
  }
}

export async function POST(req) {
  try {
    const apiKey = process.env.ARK_API_KEY
    const model = process.env.ARK_MODEL || 'doubao-seed-1-6-vision-250815'
    const baseUrl = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3/responses'
    if (!apiKey) {
      return Response.json({ ok: false, msg: 'ARK_API_KEY 未配置' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const imageUrl = body.imageUrl || body.imageDataUrl
    if (!imageUrl) {
      return Response.json({ ok: false, msg: '请上传餐食图片' }, { status: 400 })
    }

    const prompt = body.prompt || [
      '你是健康饮食记录助手。请识别图片中的主要餐食，并估算整份热量。',
      '只返回 JSON，不要输出 Markdown。格式：',
      '{"name":"食物名称","calories":整数热量kcal,"confidence":0到1,"note":"简短说明，可提醒用户按分量调整"}',
      '如果无法准确识别，请给出最可能的通用餐食名称和保守热量估计。',
    ].join('\n')

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_image', image_url: imageUrl },
              { type: 'input_text', text: prompt },
            ],
          },
        ],
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return Response.json({ ok: false, msg: data?.error?.message || data?.message || 'AI 识别失败', detail: data }, { status: res.status })
    }

    const text = extractText(data)
    const parsed = parseJsonFromText(text)
    const result = normalizeResult(parsed, text)
    return Response.json({ ok: true, result })
  } catch (e) {
    return Response.json({ ok: false, msg: e.message || 'AI 识别异常' }, { status: 500 })
  }
}
