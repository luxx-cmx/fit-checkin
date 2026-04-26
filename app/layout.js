import './globals.css'
import BottomNav from '@/components/BottomNav'
import ThemeProvider from '@/components/ThemeProvider'
import AuthGuard from '@/components/AuthGuard'
import SkinProvider from '@/components/SkinProvider'
import BrowserNotice from '@/components/BrowserNotice'
import { Toaster } from 'sonner'

export const metadata = {
  title: '食愈记 v4.0.0',
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
      <body className="bg-gray-50 min-h-screen">
        <ThemeProvider>
          <SkinProvider>
            <AuthGuard>
              <BrowserNotice />
              <main className="min-h-screen w-full max-w-[1200px] mx-auto pb-20 md:pt-14 md:pb-8 page-enter">{children}</main>
              <BottomNav />
            </AuthGuard>
          </SkinProvider>
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
