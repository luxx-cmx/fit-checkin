# 食愈记 ShiYuJi

个人饮食/体重/健康打卡 Web 应用。Next.js 14 + PostgreSQL + Docker。

## 功能

- 饮食记录（200+ 食物库、6 大分类、收藏、日历视图）
- 体重追踪（趋势、目标、BMI）
- 健康打卡（饮水、睡眠、步数、情绪）
- 用户注册/登录（JWT + bcrypt）
- 云端同步（登录后每次增删实时入库 + 手动上传/恢复）
- 未登录可纯本地使用（localStorage 降级）

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
