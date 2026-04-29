import './globals.css'
import BottomNav from '@/components/BottomNav'
import ThemeProvider from '@/components/ThemeProvider'
import AuthGuard from '@/components/AuthGuard'
import SkinProvider from '@/components/SkinProvider'
import BrowserNotice from '@/components/BrowserNotice'
import OfflineBanner from '@/components/OfflineBanner'
import PushRegister from '@/components/PushRegister'
import '@/components/PushSchedulerInit'
import { Toaster } from 'sonner'

export const metadata = {
  title: '食愈记 v4.1.0',
  description: '饮食热量记录、体重跟踪健康管理工具',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <SkinProvider>
            <AuthGuard>
              <BrowserNotice />
              <OfflineBanner />
              <PushRegister />
              <main className="min-h-screen w-full max-w-[1180px] mx-auto pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pt-16 md:pb-10 page-enter">{children}</main>
              <BottomNav />
            </AuthGuard>
          </SkinProvider>
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
