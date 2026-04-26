import PageHeader from '@/components/PageHeader'

export default function AboutPage() {
    return (
        <div className="p-4 space-y-4">
            <PageHeader title="关于我们 / 使用帮助" fallbackHref="/profile/settings" />

            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl p-5 text-white shadow-lg shadow-emerald-100">
                <div className="text-5xl mb-3">🥗</div>
                <h2 className="text-xl font-bold">食愈记 v4.0</h2>
                <p className="text-sm text-emerald-50 mt-2 leading-6">专注饮食热量记录、体重跟踪与健康提醒的轻量健康管理应用。</p>
            </div>

            <div className="bg-white rounded-3xl p-4 shadow-md shadow-gray-100 space-y-3">
                <h3 className="font-semibold text-gray-800">使用教程</h3>
                <p className="text-sm text-gray-500 leading-6">1. 在首页查看今日热量、体重、饮水和步数概览。</p>
                <p className="text-sm text-gray-500 leading-6">2. 在饮食页添加每日餐次，支持从食物库快速选择。</p>
                <p className="text-sm text-gray-500 leading-6">3. 在体重页记录体重，持续观察趋势变化。</p>
                <p className="text-sm text-gray-500 leading-6">4. 在个人中心设置目标、提醒和Q版皮肤。</p>
            </div>

            <div className="bg-white rounded-3xl p-4 shadow-md shadow-gray-100 space-y-3">
                <h3 className="font-semibold text-gray-800">常见问题</h3>
                <div><p className="text-sm font-medium text-gray-700">数据会保存在哪里？</p><p className="text-sm text-gray-500 mt-1">未登录时保存在本机，登录后可同步到服务器。</p></div>
                <div><p className="text-sm font-medium text-gray-700">皮肤会影响内容阅读吗？</p><p className="text-sm text-gray-500 mt-1">不会。皮肤只替换背景和装饰，核心卡片和文字优先显示。</p></div>
            </div>
        </div>
    )
}
