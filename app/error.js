'use client'

import Link from 'next/link'

export default function Error({ reset }) {
    return (
        <div className="min-h-screen p-4 md:p-6 flex items-center justify-center">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-sm border border-gray-100">
                <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl">⚠️</div>
                <p className="text-base font-bold text-gray-800">模块加载失败</p>
                <p className="text-sm text-gray-400 mt-2 leading-6">请重试加载；核心饮食、体重记录可继续使用。</p>
                <div className="grid grid-cols-2 gap-3 mt-5">
                    <button onClick={reset} className="py-3 rounded-2xl bg-emerald-400 text-white text-sm font-semibold">重试加载</button>
                    <Link href="/" className="py-3 rounded-2xl bg-gray-100 text-gray-600 text-sm font-semibold">回首页</Link>
                </div>
            </div>
        </div>
    )
}