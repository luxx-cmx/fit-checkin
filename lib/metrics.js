// 性能 / 操作时长埋点工具
// 设计参考《资深 PM 调优文档》第三章「核心数据埋点补充」：
// - 操作时长（页面进入 → 完成保存）
// - 步骤转化率（页面访问 / 保存成功 比值，由后台聚合）
import { trackEvent } from '@/lib/store'

const marks = new Map()

export function markStart(name) {
    if (typeof performance === 'undefined') return
    marks.set(name, performance.now())
}

export function markEnd(name, payload = {}) {
    if (typeof performance === 'undefined') return null
    const start = marks.get(name)
    if (start == null) return null
    const cost = Math.max(0, Math.round(performance.now() - start))
    marks.delete(name)
    trackEvent(`perf_${name}`, { cost, ...payload })
    return cost
}

export function trackFunnel(stage, payload = {}) {
    trackEvent(`funnel_${stage}`, payload)
}
