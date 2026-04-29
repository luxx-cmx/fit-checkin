// 空状态占位组件 · 用于列表/卡片无数据时的引导
export function EmptyState({ icon = '📭', title = '暂无数据', desc = '', action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="text-sm font-semibold text-gray-500">{title}</p>
      {desc && <p className="text-xs text-gray-400">{desc}</p>}
      {action && (
        <button
          onClick={action}
          className="mt-2 px-4 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold active:scale-95 transition-transform"
        >
          {actionLabel || '去记录'}
        </button>
      )}
    </div>
  )
}

export default EmptyState
