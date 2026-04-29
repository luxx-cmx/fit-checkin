/**
 * 在服务端 layout 中 import 此文件，触发推送定时器单例启动。
 * Next.js App Router 的 layout.js 是服务端组件，import 会在服务器启动后首次请求时执行。
 */
import { startPushScheduler } from '@/lib/push-scheduler'

startPushScheduler()

export default function PushSchedulerInit() {
  return null
}
