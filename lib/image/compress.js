// 浏览器端图片压缩
// 目标：减少 /api/v1/ai/vision 的请求体积，降低豆包 API 流量与响应时间
// 默认：最长边 1024，JPEG 0.8 质量
export async function compressImageFile(file, options = {}) {
    const maxSide = options.maxSide || 1024
    const quality = options.quality ?? 0.8
    const mime = options.mime || 'image/jpeg'

    if (!file || !file.type?.startsWith('image/')) {
        throw new Error('仅支持图片文件')
    }

    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('图片读取失败'))
        reader.readAsDataURL(file)
    })

    const img = await new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('图片解码失败'))
        image.src = dataUrl
    })

    const { width, height } = img
    let targetW = width
    let targetH = height
    if (Math.max(width, height) > maxSide) {
        if (width >= height) {
            targetW = maxSide
            targetH = Math.round((height * maxSide) / width)
        } else {
            targetH = maxSide
            targetW = Math.round((width * maxSide) / height)
        }
    }

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) {
        // 不支持 canvas 时退回原图
        return { dataUrl, width, height, bytes: estimateBytes(dataUrl) }
    }
    ctx.drawImage(img, 0, 0, targetW, targetH)

    const compressed = canvas.toDataURL(mime, quality)
    return {
        dataUrl: compressed,
        width: targetW,
        height: targetH,
        bytes: estimateBytes(compressed),
    }
}

function estimateBytes(dataUrl) {
    const idx = dataUrl.indexOf(',')
    if (idx < 0) return dataUrl.length
    const base64 = dataUrl.slice(idx + 1)
    return Math.floor((base64.length * 3) / 4)
}
