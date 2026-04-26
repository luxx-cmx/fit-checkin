'use client'

export function ConfirmDialog({ open, title, message, confirmText = '确认', cancelText = '取消', danger = false, onConfirm, onClose }) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-6">
            <div className="w-full max-w-[320px] rounded-3xl bg-white p-5 shadow-2xl">
                <h3 className="text-base font-semibold text-gray-800">{title}</h3>
                {message ? <p className="text-sm text-gray-500 mt-2 leading-6">{message}</p> : null}
                <div className="mt-5 grid grid-cols-2 gap-3">
                    <button onClick={onClose} className="py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">
                        {cancelText}
                    </button>
                    <button onClick={onConfirm} className={`py-3 rounded-xl text-sm font-semibold text-white ${danger ? 'bg-red-500' : 'bg-emerald-400'}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}

export function InputDialog({ open, title, message, value, placeholder, confirmText = '提交', cancelText = '取消', onChange, onConfirm, onClose }) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-6">
            <div className="w-full max-w-[360px] rounded-3xl bg-white p-5 shadow-2xl space-y-4">
                <div>
                    <h3 className="text-base font-semibold text-gray-800">{title}</h3>
                    {message ? <p className="text-sm text-gray-500 mt-2 leading-6">{message}</p> : null}
                </div>
                <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-emerald-400" />
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={onClose} className="py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">
                        {cancelText}
                    </button>
                    <button onClick={onConfirm} className="py-3 rounded-xl bg-emerald-400 text-sm font-semibold text-white">
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}