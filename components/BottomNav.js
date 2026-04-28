'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clearAuth } from '@/lib/auth-client'

const NAV = [
  {
    href: '/',
    label: '首页',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 md:w-5 md:h-5">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    href: '/diet',
    label: '饮食',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 md:w-5 md:h-5">
        <path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-8-15.03-8-15.03 0h15.03zM1.02 17h15v2H1z" />
      </svg>
    ),
  },
  {
    href: '/weight',
    label: '体重',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 md:w-5 md:h-5">
        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V6z" />
      </svg>
    ),
  },
  {
    href: '/social',
    label: '社交',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 md:w-5 md:h-5">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: '我的',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 md:w-5 md:h-5">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  if (pathname === '/login') return null

  const isActive = (href) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const logout = () => {
    clearAuth()
    router.replace('/login')
  }

  return (
    <>
      <header className="hidden md:block fixed top-0 left-0 right-0 z-50 h-14 bg-white/80 border-b border-white/70 backdrop-blur-xl shadow-[0_12px_30px_rgba(46,84,67,0.06)]">
        <div className="h-full max-w-[1200px] mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <span className="w-8 h-8 rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-400 text-white flex items-center justify-center shadow-sm">🥗</span>
            食愈记
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map(({ href, icon, label }) => {
              const active = isActive(href)
              return (
                <Link key={href} href={href} className={`h-10 px-4 rounded-2xl flex items-center gap-2 text-sm font-semibold transition-all ${active ? 'text-emerald-700 bg-emerald-50 shadow-sm' : 'text-gray-400 hover:text-gray-700 hover:bg-white/70'}`}>
                  {icon}
                  {label}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/profile/settings" aria-label="设置" className="syj-icon-button w-10 h-10 bg-white/70 text-gray-500 hover:text-emerald-600">⚙️</Link>
            <button onClick={logout} aria-label="退出登录" className="syj-icon-button w-10 h-10 bg-white/70 text-gray-500 hover:text-red-500">↩</button>
          </div>
        </div>
      </header>

      <nav className="md:hidden fixed left-3 right-3 bottom-3 z-50 mx-auto max-w-md rounded-[1.7rem] border border-white/80 bg-white/88 backdrop-blur-xl shadow-[0_18px_45px_rgba(46,84,67,0.14)] flex px-1.5 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
        {NAV.map(({ href, icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex-1 min-h-[56px] rounded-3xl flex flex-col items-center justify-center gap-0.5 text-[12px] font-medium transition-all duration-200 ${active ? 'text-emerald-700 bg-emerald-50' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <span className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                {icon}
              </span>
              <span className={active ? 'font-semibold' : ''}>{label}</span>
              {active && <span className="absolute top-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
