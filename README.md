# OpenOI

算法竞赛中的开放问题社区。公开浏览，登录后发布题目、分享做法链接和参与讨论。默认中文，可切换英文；用户内容保持原文。界面采用黑蓝紫配色，首页保留粒子动效并支持系统减少动态效果偏好。

线上地址：[open-oi.vercel.app](https://open-oi.vercel.app)。现有 Vercel Hobby 项目为 `acmm14/open-oi`，连接 `SemsueZhang/OpenOI` 的 `main` 分支。首次生产部署为 `8a40754`；本轮改版是否已上线以 [验收记录](docs/ACCEPTANCE.md) 为准。用户已选择暂缓邮箱测试，自定义 SMTP 尚未配置。

## 功能与规则

- 题目正文最多 1000 字符；右侧展示标签、来源链接、相似题目链接和做法链接，不设题目讨论区。
- 固定标签：图论、数据结构、组合优化、数学、搜索、计算几何、字符串、特殊题型。首页支持标题搜索、标签筛选、每页 20 条分页。
- 做法单独成页，包含标题、最多 1000 字符的摘要、必填原文链接、作者和发布时间；按发布时间倒序排列。
- 做法讨论每条最多 100 字符，支持作者修改、删除。字数按 Unicode 码点计算，包含空格和换行；普通 emoji 算一个码点，组合 emoji 可能包含多个。
- 不提供 Hack、投票、代码提交、代码运行、评测或排名。Markdown 保留安全的基础格式和数学公式；不会运行其中的文本。
- 头像和 Markdown 图片只填写 URL，不提供上传入口，无需 Storage bucket。
- 来源和相似题目链接各最多 20 个，原文与链接字段仅接受 HTTP(S)。发布表单的链接每行一个。

## 目录与技术栈

Next.js 16.3.6 App Router、React 19、TypeScript、Tailwind CSS 3、源码内置的 shadcn/ui 兼容组件、Supabase PostgreSQL/Auth、react-markdown、GFM 和 KaTeX。使用 Node.js 22，精确依赖见 `package-lock.json`。

```text
app/
  page.tsx                     搜索、标签筛选、分页
  problems/[id]/               题目正文与链接侧栏
  solutions/[id]/              做法摘要、原文链接与讨论
  new/problem/                 发布/编辑题目（?edit=）
  new/solution/                发布/编辑做法（?problem_id=，可加 &edit=）
  profile/[username]/          用户的题目与做法
  settings/profile/            用户名和头像 URL
  login/ register/ auth/confirm/
  actions.ts                   身份检查、校验、写入
components/                    表单、Markdown、讨论、双语界面
lib/                           类型、查询、安全校验、Supabase 客户端
supabase/migrations/            按文件名顺序执行的数据库迁移
supabase/templates/             可选确认邮件模板
tests/                         自动测试与数据库验收
scripts/                       隔离数据库和本地服务检查
docs/ACCEPTANCE.md              本轮及历史验证记录
```

## 本地启动

```bash
nvm use
npm ci
cp .env.local.example .env.local
npm run dev
```

填写以下环境变量，打开 http://localhost:3000：

| 变量 | 内容 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目的 API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key 或 legacy anon key |
| `NEXT_PUBLIC_SITE_URL` | 本地为 `http://localhost:3000`；线上为实际 HTTPS 域名 |

不要在公开环境变量中放 service-role key、secret key 或数据库密码。应用写入使用当前用户会话，服务端客户端按请求创建。未配置 Supabase 时可以浏览空状态，真实内容及认证需要数据库配置。

## Supabase 初始化与升级

新项目在 SQL Editor 中按文件名顺序执行 `supabase/migrations/` 的全部文件。历史迁移保留旧模型以支持顺序升级，最后一份迁移将其转换为当前四张业务表：`profiles`、`problems`、`solutions`、`comments`。

已有项目只执行尚未应用的迁移。当前托管项目已通过 SQL Editor 手动执行了三份迁移（含本轮 simplify_content），不能直接重跑 initial。仓库现提供 GitHub Actions 自动迁移流程，首次启用需要对齐迁移记录并设置一个 GitHub 环境密钥，详见 [自动迁移配置](docs/AUTOMIGRATION.md)。

**本轮迁移会删除旧 Hack、投票、Hack 下的评论及做法的代码等已移除字段。执行前备份现有数据库并检查迁移文件。** 对保留的题目、做法及讨论，迁移不会静默截断内容，也不会伪造原文链接。存在超长正文/摘要/讨论、旧自定义标签或缺少原文链接的做法时，预检查会阻止升级；先整理数据并补齐链接，再重试。事务中执行，避免部分升级。详细预检查规则见最新 SQL 文件注释。

四张业务表启用 RLS：匿名可读，登录用户可发布，只有作者可修改/删除自己的内容。列级权限保护作者、所属目标和创建时间。讨论仅关联做法，真实外键确保目标存在；删除题目级联删除做法和讨论，界面明确确认。

字段长度、固定标签、URL 和目标限制同时由数据库执行，不能通过绕过网页表单跳过。Markdown 禁用原始 HTML、过滤 URL 协议，KaTeX 禁用可信命令。

## 自动数据库迁移

相关 SQL 推送到 main 后，GitHub Actions 先在隔离 PostgreSQL 验证，再执行生产迁移。PR 仅验证，生产任务串行运行。Vercel 仍独立自动部署，涉及新字段时请先完成数据库迁移，再提交依赖它的网站代码。首次密钥配置、历史登记、错误处理见 [docs/AUTOMIGRATION.md](docs/AUTOMIGRATION.md)。

## 邮箱认证

Authentication 中开启 Email provider、注册和邮箱确认。URL Configuration 的 Site URL 设置为实际站点域名，Redirect URLs 加入：

```text
http://localhost:3000/auth/confirm**
https://YOUR_DOMAIN/auth/confirm**
```

Vercel 提供的免费域名可以直接使用，无需购买自有域名。公众注册邮件需要合适的自定义 SMTP；目前此项及真实邮箱测试暂缓，不能把网站可访问等同于公众注册发信已验收。

应用兼容 Supabase 默认邮件模板的 PKCE `code` 回调。在发起注册的同一浏览器打开邮件链接，以读取 verifier cookie。配置自定义 SMTP 后，也可使用 `supabase/templates/confirmation.html`，将以下链接放入确认邮件模板：

```html
<a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">确认邮箱</a>
```

应用同时支持 `verifyOtp` 的 token 回调，成功后只允许跳转到站内路径。未确认邮箱登录、确认失败和注册完成页提供重发入口。用户名使用 3–32 位小写字母、数字或下划线。

## 部署 Vercel

1. 先在隔离数据库验证新迁移，对已有生产数据备份并完成迁移预检查。
2. 在维护窗口协调数据库升级与新代码发布；此次是破坏旧字段兼容性的升级，旧版应用不能继续对新 schema 写入。
3. Vercel 导入仓库，选 Next.js、Node.js 22，默认 `npm run build`。设置上述三个环境变量，站点 URL 使用正式 HTTPS 地址。
4. 推送到已关联的 `main` 会自动部署；新环境变量需要重新部署。Supabase 同步设置正式 Auth 回调允许列表。
5. 检查正式域名页面和功能；邮件测试按实际启用范围单独完成。

## 验证

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

数据库脚本仅用于可丢弃测试环境，不能指向正式项目。无需 Docker 的 SQL 验证会在临时目录安装固定版本的 PGlite 并自动清理：

```bash
bash scripts/test-db-pglite.sh
```

此检查模拟 Auth，并以 PostgreSQL 核心 UUID 函数替代历史迁移的 pgcrypto 扩展，不替代真实 Supabase 认证、邮件和 PostgREST 验收。

Docker 服务由用户自行启用，检查脚本不会替用户启动 Docker Desktop：

```bash
npm run test:db:docker
```

也可对已执行全部迁移的专用测试数据库执行：

```bash
export OPENOI_TEST_DB_URL='postgresql://...'
export OPENOI_TEST_DB_CONFIRM=disposable
npm run test:db
```

`tests/database/plain_postgres_bootstrap.sql` 模拟最小 Auth，仅用于隔离 PostgreSQL，不能用于真实 Supabase。完整本地 Supabase 可通过 `supabase/config.toml` 启动，`db reset --local --no-seed` 会清空本地数据库。真实服务验收脚本只接受本机地址；本轮具体执行与未执行项目见验收记录。
