# 食愈记 ShiYuJi

个人饮食/体重/健康打卡 Web 应用，覆盖记录、分析、报告、社交互动与云端同步。Next.js 14 + PostgreSQL + Docker。

## 功能

- 首页仪表盘（热量环、近期体重趋势、今日饮食预览、饮水/步数快捷录入、智能建议、同步失败提示）
- 饮食记录（早餐/午餐/晚餐/加餐三步录入、常用食物快捷选择、食物库回填、AI 识图初稿、收藏与日历视图）
- 体重追踪（上次体重自动带入、加减微调、语音输入、趋势列表、目标/BMI 关联展示）
- 健康打卡（饮水、步数、睡眠、情绪等记录与统计，本周/本月趋势查看）
- 智能分析（7/14/30 天热量达标率、BMI、体重-热量关联分析、每日建议）
- 报告分享（7 天/30 天健康报告、热量达标率、体重变化、饮水步数均值、隐私开关、分享/打印）
- 社交与挑战（好友管理、好友动态、消息中心、监督小组、等级积分、徽章与挑战赛）
- 个人中心与设置（健康资料、提醒设置、皮肤切换、深浅色模式、更新记录、意见反馈、关于页）
- 用户注册/登录（JWT + bcrypt，登录校验、退出登录、个人资料与设置保存）
- 云端同步（登录后饮食/体重/健康/收藏/资料实时入库，本地为空时自动恢复，未登录可纯本地使用）

## 本次提交已落地

- 小程序 / App 风格界面：移动端底部导航、PC 顶部导航、统一返回入口与轻量卡片布局
- 首页新增快捷录入：饮水支持快捷毫升选择，步数支持直接录入，支持同步状态提示
- 饮食录入重做为三步流程：选餐次、录食物、确认保存，并支持餐次底部弹层与 AI 图片识别初稿
- 体重录入页优化：居中大输入、上次体重默认带入、回车保存、语音输入与 0.1kg 微调
- 新增智能分析与报告页面：支持周期切换、趋势关联、报告分享、打印和隐私控制
- 新增社交模块：好友、动态、消息、小组、积分等级、挑战赛与徽章能力入口
- 新增个人中心低频页面：提醒、反馈、更新记录、关于我们、皮肤设置与深浅色切换
- 完整补齐服务端接口：鉴权、个人资料、收藏、目标、报告分享、社交模块与同步接口
- 完整补齐部署安全基础：`.env` 配置示例、`.gitignore` 忽略敏感文件、Docker / Compose 部署说明

## 本地开发

```bash
npm install
npm run dev           # http://localhost:3000
```

## 生产部署（阿里云 ECS · Docker）

服务器上执行：

```bash
git clone git@github.com:luxx-cmx/fit-checkin.git /opt/shiyuji/fit-checkin
cd /opt/shiyuji/fit-checkin
docker compose up -d --build
```

访问 `http://<ECS 公网 IP>:3000`。

### 更新部署

```bash
cd /opt/shiyuji/fit-checkin
git pull
docker compose up -d --build app
```

### 配置

首次部署前，在项目根目录创建 `.env`（已在 `.gitignore`，不会提交）：

```bash
cp .env.example .env
# 然后编辑 .env 填入真实的用户名/密码/JWT 密钥
```

`.env` 支持的变量：

| 变量 | 说明 |
|---|---|
| `POSTGRES_USER` | 数据库用户名 |
| `POSTGRES_PASSWORD` | 数据库密码 |
| `POSTGRES_DB` | 数据库名 |
| `JWT_SECRET` | JWT 签名密钥（生产请用长随机字符串） |

Docker Compose 会自动读取 `.env`，无需其他配置。PostgreSQL 14 容器 5432 端口已映射到宿主机（可用 DBeaver 连接）。

## 技术栈

- Next.js 14 App Router · React 18 · Tailwind 3
- sonner · next-themes
- PostgreSQL 14（pg）· jose（JWT）· bcryptjs
- Docker Compose（app + db）
