// 个性化建议（无焦虑）：多场景 × 多组文案随机
// 场景：calorie_ok | calorie_low | calorie_high | weight_down | weight_up | weight_flat |
//       water_low | water_ok | steps_low | steps_ok | no_data
const POOL = {
    calorie_ok: [
        '今日热量摄入刚好达到目标，饮食节奏很稳定，继续保持～',
        '热量摄入很均衡，今天表现棒棒的，明天继续按节奏来 🥗',
        '摄入控制得不错，把这种状态延续下去就很好啦',
    ],
    calorie_low: [
        '摄入略偏少，可以加点优质蛋白和蔬菜，无需焦虑哦',
        '今天能量摄入不太够，晚餐补点鸡蛋/鱼/豆制品更稳当',
        '吃得少也别勉强，明早可以丰富一些早餐 🌅',
    ],
    calorie_high: [
        '今天稍微超了一点点，明日选清淡些就好，偶尔超额没关系',
        '热量略超目标，明天可适当减少主食或油脂，继续加油！',
        '小波动很正常，明日补一段散步就能平衡掉啦 💪',
    ],
    weight_down: [
        '体重又往下走了一点，每一步都在靠近目标，加油！',
        '继续保持当前节奏，目标在向你招手 ✨',
        '稳稳的下降，比起快瘦，这样的节奏更扎实',
    ],
    weight_up: [
        '今日小幅上升，可能是水分/盐分波动，多喝温水就好',
        '体重波动很正常，避免高盐高糖，明日再看趋势更准',
        '别担心，单日数据只是参考，看一周整体走势更有意义',
    ],
    weight_flat: [
        '体重持平，减脂是循序渐进的过程，耐心等待变化～',
        '平台期再正常不过，保持节奏，过几天就会有新进展',
        '稳住就是赢，继续按计划记录就好',
    ],
    water_low: [
        '今日饮水还不太够，记得多喝点温水，身体会感谢你 💧',
        '补水量偏少，下午可以小口慢饮 200ml，效果更好',
    ],
    water_ok: [
        '饮水达标啦，状态在线 👏',
    ],
    steps_low: [
        '步数还差一点，晚饭后散散步，凑够目标也轻松',
        '今天活动量偏少，10 分钟楼梯就能补回不少哦',
    ],
    steps_ok: [
        '步数达标，今天身体状态会更轻盈 🚶',
    ],
    no_data: [
        '先记录今天第一笔数据，就能生成更贴合你的建议哦',
    ],
}

function pick(arr) {
    if (!arr || !arr.length) return ''
    return arr[Math.floor(Math.random() * arr.length)]
}

// data: { calories, target, weightDelta, water, waterTarget, steps, stepsTarget }
// weightDelta: 今日-昨日，未知传 null
export function generateAdvice(data) {
    if (!data || (!data.calories && data.weightDelta == null && !data.water && !data.steps)) {
        return pick(POOL.no_data)
    }
    const parts = []
    const target = Number(data.target) || 1800
    const cal = Number(data.calories) || 0
    if (cal > 0) {
        if (cal > target * 1.05) parts.push(pick(POOL.calorie_high))
        else if (cal < target * 0.7) parts.push(pick(POOL.calorie_low))
        else parts.push(pick(POOL.calorie_ok))
    }
    if (data.weightDelta != null && !Number.isNaN(data.weightDelta)) {
        const d = Number(data.weightDelta)
        if (d <= -0.1) parts.push(pick(POOL.weight_down))
        else if (d >= 0.1) parts.push(pick(POOL.weight_up))
        else parts.push(pick(POOL.weight_flat))
    }
    if (data.water != null) {
        const wt = Number(data.waterTarget) || 1500
        if (Number(data.water) < wt * 0.6) parts.push(pick(POOL.water_low))
        else if (Number(data.water) >= wt) parts.push(pick(POOL.water_ok))
    }
    if (data.steps != null) {
        const st = Number(data.stepsTarget) || 8000
        if (Number(data.steps) > 0 && Number(data.steps) < st * 0.6) parts.push(pick(POOL.steps_low))
        else if (Number(data.steps) >= st) parts.push(pick(POOL.steps_ok))
    }
    if (!parts.length) return pick(POOL.no_data)
    return parts.slice(0, 2).join(' · ')
}
