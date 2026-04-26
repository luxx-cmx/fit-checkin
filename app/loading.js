export default function Loading() {
    return (
        <div className="min-h-screen p-4 md:p-6 flex items-center justify-center">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-sm border border-gray-100">
                <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl animate-pulse">🥗</div>
                <p className="text-sm font-semibold text-gray-700">模块加载中</p>
                <p className="text-xs text-gray-400 mt-1">低频功能按需加载，核心记录不受影响</p>
            </div>
        </div>
    )
}