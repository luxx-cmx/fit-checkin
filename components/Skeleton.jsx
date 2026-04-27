'use client'

/**
 * 骨架屏组件 - 替代生硬的"加载中..."文字
 * 用法:
 *   <Skeleton className="h-4 w-32" />
 *   <SkeletonCard />
 *   <SkeletonList rows={3} />
 */

export function Skeleton({ className = '' }) {
    return (
        <div
            className={`animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] rounded-md ${className}`}
            style={{ animation: 'shimmer 1.4s ease-in-out infinite' }}
        />
    )
}

export function SkeletonCard({ className = '' }) {
    return (
        <div className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3 ${className}`}>
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
        </div>
    )
}

export function SkeletonList({ rows = 3 }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-3/4" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export function SkeletonStat() {
    return (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-2 w-20" />
        </div>
    )
}

export default Skeleton
