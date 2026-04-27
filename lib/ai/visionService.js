// 豆包视觉识别服务（共享层）
// 设计目标（参考《AI接口后续更新指南》）：
// - 兼容性：接口字段保持稳定，向后兼容
// - 稳定性：超时 5s + 重试 2 次 + 异常降级
// - 成本可控：相同图片 2 小时内存缓存，减少 API 调用量
// - 可追溯：每次调用生成 request_id，附在日志和响应中
// - 安全：API Key 从环境变量读取，日志不输出图片内容

import crypto from 'node:crypto'

const DEFAULT_TIMEOUT_MS = 30000
const DEFAULT_RETRY = 1
const CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2h
const CACHE_MAX = 200

// 简易 LRU 缓存（按图片 hash + prompt hash 命中）
const cacheStore = new Map()

function cacheGet(key) {
  const item = cacheStore.get(key)
  if (!item) return null
  if (Date.now() - item.t > CACHE_TTL_MS) {
    cacheStore.delete(key)
    return null
  }
  // LRU touch
  cacheStore.delete(key)
  cacheStore.set(key, item)
  return item.v
}

function cacheSet(key, value) {
  if (cacheStore.size >= CACHE_MAX) {
    const firstKey = cacheStore.keys().next().value
    if (firstKey !== undefined) cacheStore.delete(firstKey)
  }
  cacheStore.set(key, { t: Date.now(), v: value })
}

function hashKey(image, prompt) {
  return crypto
    .createHash('sha1')
    .update(typeof image === 'string' ? image : '')
    .update('|')
    .update(prompt || '')
    .digest('hex')
}

function buildRequestId() {
  return 'ai_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function extractText(data) {
  // chat/completions 响应格式
  if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content
  // responses API 格式
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
  const tip = String(parsed?.tip || parsed?.建议 || '').trim()

  // 多食材 items 数组（后端增强）
  const rawItems = Array.isArray(parsed?.items) ? parsed.items : []
  const items = rawItems
    .map((it) => {
      const iname = String(it?.name || it?.food || '').trim()
      const grams = Number(it?.grams ?? it?.weight ?? it?.克重)
      const ical = Number(it?.calories ?? it?.kcal)
      const iconf = Number(it?.confidence ?? 0)
      if (!iname) return null
      return {
        name: iname.slice(0, 24),
        grams: Number.isFinite(grams) && grams > 0 ? Math.round(grams) : 100,
        calories: Number.isFinite(ical) && ical > 0 ? Math.round(ical) : 0,
        confidence: Number.isFinite(iconf) ? Math.max(0, Math.min(1, iconf)) : 0,
      }
    })
    .filter(Boolean)
    .slice(0, 6)

  const totalFromItems = items.reduce((s, it) => s + (Number(it.calories) || 0), 0)
  const finalCalories = Number.isFinite(calories) && calories > 0
    ? Math.round(calories)
    : (totalFromItems > 0 ? totalFromItems : 450)

  return {
    name: name || (items[0]?.name ? items.map((i) => i.name).join(' + ') : '餐食识别结果'),
    calories: finalCalories,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
    note: note.slice(0, 240),
    tip: tip.slice(0, 120),
    items,
    rawText: fallbackText,
  }
}

// 默认 prompt：贴合减脂场景，要求 JSON（含多食材 items 数组）
export const DEFAULT_PROMPT = [
  '你是减脂打卡 H5 的饮食识别助手。请识别图中所有可见餐食。',
  '严格返回 JSON，不要 Markdown，不要多余解释。字段如下：',
  '{"name":"总餐名","calories":总热量整数kcal,"confidence":0到1,"note":"分量与烹饪说明","tip":"一句减脂建议","items":[{"name":"食材名","grams":估计克重整数,"calories":该项热量整数kcal,"confidence":0到1}]}',
  '识别要点：1) items 按分量占比从大到小排序，最多 6 项；2) 热量按图中可见分量估算；3) 总热量 calories 应等于 items 热量之和；4) tip 控制在 30 字内；5) 无法确定时给出保守估值。',
].join('\n')

// 友好错误码归一
function classifyError(status, body) {
  const msg = body?.error?.message || body?.message || ''
  const code = body?.error?.code || ''
  if (status === 401 || /api ?key|unauthorized/i.test(msg + code)) {
    return { code: 'AUTH', msg: 'AI 服务鉴权失败，请联系管理员检查 API Key' }
  }
  if (status === 429 || /too many|rate ?limit|quota/i.test(msg + code)) {
    return { code: 'RATE_LIMIT', msg: 'AI 调用过于频繁，请稍后再试' }
  }
  if (status >= 500) {
    return { code: 'UPSTREAM', msg: 'AI 服务暂时不可用，请稍后再试' }
  }
  return { code: 'BAD_REQUEST', msg: msg || 'AI 识别失败' }
}

// 单次请求带超时
// 用 Node 原生 https 模块绕过 Next.js/undici 对大请求体（base64 图片）的兼容性问题
// 强制 IPv4，避免 Windows 下 IPv6 优先解析导致连接卡住
async function fetchWithTimeout(url, options, timeoutMs) {
  const https = await import('node:https')
  const { URL } = await import('node:url')
  const u = new URL(url)
  const body = options?.body || ''
  const t0 = Date.now()
  const log = (stage, extra = '') => console.log(`[ai/vision/net] +${Date.now() - t0}ms ${stage}`, extra)
  return await new Promise((resolve, reject) => {
    log('start', `${u.hostname}:${u.port || 443} body=${Buffer.byteLength(body)}B`)
    const req = https.request(
      {
        method: options?.method || 'POST',
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        family: 4, // 强制 IPv4
        headers: {
          ...(options?.headers || {}),
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: timeoutMs,
      },
      (res) => {
        log('response', `status=${res.statusCode}`)
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          log('end', `bytes=${chunks.reduce((s, c) => s + c.length, 0)}`)
          const text = Buffer.concat(chunks).toString('utf8')
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: async () => { try { return JSON.parse(text) } catch { return {} } },
            text: async () => text,
          })
        })
      },
    )
    req.on('socket', (s) => {
      log('socket-assigned')
      s.on('lookup', (err, addr) => log('dns-lookup', err ? `err=${err.message}` : `addr=${addr}`))
      s.on('connect', () => log('tcp-connect'))
      s.on('secureConnect', () => log('tls-handshake-done'))
    })
    req.on('timeout', () => {
      log('timeout')
      const err = new Error('request timeout')
      err.name = 'AbortError'
      req.destroy(err)
    })
    req.on('error', (err) => { log('error', `${err.code || ''} ${err.message}`); reject(err) })
    req.write(body)
    req.end()
    log('request-sent')
  })
}

/**
 * 豆包视觉识别（共享逻辑）
 * @param {object} opts
 * @param {string} opts.imageUrl - http(s) 或 data URL
 * @param {string} [opts.prompt]
 * @param {boolean} [opts.useCache=true]
 * @returns {Promise<{ok:boolean, requestId:string, result?:object, cached?:boolean, code?:string, msg?:string, status?:number}>}
 */
export async function recognizeFood(opts = {}) {
  const requestId = buildRequestId()
  const apiKey = process.env.ARK_API_KEY
  const model = process.env.ARK_MODEL || 'doubao-seed-1-6-vision-250815'
  // ep- 开头是推理接入点，走 /responses 端点；其余走 /chat/completions
  const isEpModel = model.startsWith('ep-')
  const arkBase = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3')
    .replace(/\/(responses|chat\/completions)$/, '').replace(/\/$/, '')
  const baseUrl = isEpModel ? `${arkBase}/responses` : `${arkBase}/chat/completions`
  const timeoutMs = Number(process.env.ARK_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS
  const maxRetry = Number.isFinite(Number(process.env.ARK_MAX_RETRY))
    ? Number(process.env.ARK_MAX_RETRY)
    : DEFAULT_RETRY

  if (!apiKey) {
    console.warn('[ai/vision]', requestId, 'missing ARK_API_KEY')
    return { ok: false, requestId, code: 'CONFIG', msg: 'ARK_API_KEY 未配置', status: 500 }
  }

  const imageUrl = opts.imageUrl
  if (!imageUrl) {
    return { ok: false, requestId, code: 'BAD_REQUEST', msg: '请上传餐食图片', status: 400 }
  }

  const prompt = opts.prompt || DEFAULT_PROMPT
  const useCache = opts.useCache !== false
  const cacheKey = hashKey(imageUrl, prompt)

  if (useCache) {
    const cached = cacheGet(cacheKey)
    if (cached) {
      console.log('[ai/vision]', requestId, 'cache hit')
      return { ok: true, requestId, cached: true, result: cached }
    }
  }

  // /responses 端点用 input[] + input_image/input_text 格式
  // /chat/completions 端点用 messages[] + image_url/text 格式
  const payload = isEpModel
    ? {
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
      }
    : {
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: prompt },
            ],
          },
        ],
        max_tokens: 1024,
      }

  let lastError = null
  let lastStatus = 0
  let lastBody = null
  const attempts = Math.max(1, maxRetry + 1)
  const startedAt = Date.now()

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetchWithTimeout(
        baseUrl,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
        timeoutMs,
      )

      const data = await res.json().catch(() => ({}))
      lastStatus = res.status
      lastBody = data

      if (res.ok) {
        const text = extractText(data)
        const parsed = parseJsonFromText(text)
        const result = normalizeResult(parsed, text)
        if (useCache) cacheSet(cacheKey, result)
        const costMs = Date.now() - startedAt
        console.log(
          '[ai/vision]',
          requestId,
          'ok',
          `api=${isEpModel ? 'responses' : 'chat/completions'}`,
          `model=${model}`,
          `attempt=${i + 1}`,
          `cost=${costMs}ms`,
          `name=${result.name}`,
          `kcal=${result.calories}`,
        )
        return { ok: true, requestId, costMs, result }
      }

      // 4xx（除 429）不重试
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        const cls = classifyError(res.status, data)
        console.warn('[ai/vision]', requestId, 'failed', cls.code, res.status)
        return { ok: false, requestId, status: res.status, ...cls }
      }
      lastError = new Error(`upstream ${res.status}`)
    } catch (e) {
      lastError = e
      lastStatus = e.name === 'AbortError' ? 504 : 500
      console.warn('[ai/vision]', requestId, 'attempt', i + 1, 'error', e.name || '', e.message || '')
    }

    // 指数退避：300ms / 800ms
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 300 * (i + 1) + Math.floor(Math.random() * 200)))
    }
  }

  const cls = classifyError(lastStatus, lastBody || {})
  // 降级策略：返回保守 fallback，让用户能继续手动编辑
  const fallback = {
    name: '餐食识别结果',
    calories: 450,
    confidence: 0,
    note: 'AI 暂不可用，已给出占位估值，请按实际分量调整',
    tip: '减脂期建议蛋白质优先、控制精制碳水',
    items: [],
    rawText: '',
  }
  console.error(
    '[ai/vision]',
    requestId,
    'fail-all',
    `cost=${Date.now() - startedAt}ms`,
    cls.code,
    lastError?.message || '',
  )
  return {
    ok: false,
    requestId,
    code: cls.code,
    msg: cls.msg,
    status: lastStatus || 500,
    fallback,
  }
}

// 测试用：清空缓存
export function _clearVisionCache() {
  cacheStore.clear()
}
