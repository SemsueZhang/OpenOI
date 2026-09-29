# OpenOI

算法题解社区 MVP：发布题目与解法，以反例、逻辑漏洞、复杂度问题和边界情况发起 Hack，再由社区投票验证。公开浏览，登录后发布、评论和投票。默认中文，可切换英文界面；语言保存在 cookie，不改变路由、不翻译用户内容。

技术栈：Next.js 14.2.35 App Router、React 18、TypeScript、Tailwind CSS 3、源码内置（vendored）的 shadcn/ui 兼容组件、Supabase PostgreSQL/Auth、react-markdown、GFM、KaTeX 和 highlight.js。UI 组件位于 `components/ui`，附带 `components.json` 配置。推荐 Node.js 22（见 `.nvmrc`），依赖以 `package-lock.json` 为准。

不提供代码执行、评测、排名、测试数据管理、通知或版本历史。Hack 输入与输出仅是用户填写的文本证据。头像和 Markdown 图片只引用 HTTP(S) URL，没有文件上传入口，无需创建 Supabase Storage bucket；可引用已有公开 Storage URL。

## 界面与动效

界面采用黑色背景、蓝紫色强调色与深色内容面板。首页包含双语介绍、题目入口和轻量 Canvas 粒子连线；表单、状态标签、代码高亮、Markdown、登录页及移动菜单使用一致的深色样式。视觉升级保留现有题目筛选、分页、发布、评论与投票流程。

粒子仅用于装饰，不接收点击，也不进入无障碍阅读顺序。桌面最多 74 个粒子，窄屏最多 28 个，Canvas 像素比上限为 2；首页区域离开视口或页面进入后台时停止动画，卸载时清理帧请求、监听器和观察器。启用系统“减少动态效果”后显示静态粒子，并关闭平滑滚动和主要按钮的位移动效。该效果无需额外动画依赖。

## 目录与路由

```text
app/
  page.tsx                     首页搜索、筛选与分页
  problems/[id]/               题面与按有用票排序的解法
  solutions/[id]/              解法、Hack、评论与作者回应
  new/problem/                 发布/编辑题目（?edit=）
  new/solution/                发布/编辑解法（?problem_id=，可加 &edit=）
  hack/new/                    发起/编辑 Hack（?solution_id=，可加 &edit=）
  profile/[username]/          用户发布内容
  settings/profile/            用户名与头像 URL
  login/ register/ auth/confirm/
  actions.ts                   服务端验证与写入
components/                    表单、Markdown、代码、投票、评论、双语界面
  ui/                          可复用 UI 基础组件
lib/
  supabase.ts                  浏览器 Supabase 客户端
  supabase/server.ts           带 cookie 的服务端客户端
  data.ts security.ts types.ts
supabase/
  migrations/20260929000000_initial.sql
  templates/confirmation.html
  config.toml
tests/                         安全渲染、重定向与数据库验收
scripts/test-db.sh              双连接数据库并发验收
scripts/test-db-docker.sh       独立 PostgreSQL 15 一键验收
docs/ACCEPTANCE.md              验证记录与上线前检查
```

## 本地启动

```bash
nvm use
npm ci
cp .env.local.example .env.local
npm run dev
```

填写 `.env.local` 后打开 http://localhost:3000：

| 环境变量 | 值 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目的 API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 项目的 publishable key 或 legacy anon key；变量名保持不变 |
| `NEXT_PUBLIC_SITE_URL` | 本地为 `http://localhost:3000`，线上为实际 HTTPS 域名 |

应用不需要 service-role key，也不应把 service-role、secret key 或数据库密码放进 `NEXT_PUBLIC_*`。未配置 Supabase 时可查看空状态与配置提示，真实数据与认证需要下述数据库和 Auth 配置。

## 初始化 Supabase

### 托管项目

创建空 Supabase 项目，在 SQL Editor 执行 `supabase/migrations/20260929000000_initial.sql`。迁移会建立六张表、外键、索引、RLS、注册资料触发器、状态触发器、投票/Hack RPC 和查询视图。该迁移是初始建库脚本，不要在已初始化数据库中重复执行。

也可以使用 CLI 管理迁移，选择这一方式时无需再手动执行 SQL：

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

在 Authentication 中开启 Email provider、允许注册并启用邮箱确认。URL Configuration 的 Site URL 设为实际站点地址，Redirect URLs 加入：

```text
http://localhost:3000/auth/confirm**
https://YOUR_DOMAIN/auth/confirm**
```

按实际需要添加 `127.0.0.1` 或精确的预览域名，不必开放所有 Vercel 域名。生产邮件发送可在 Supabase 中配置自己的 SMTP。

将 `supabase/templates/confirmation.html` 的内容复制到 Authentication → Email Templates → Confirm signup。应用注册时传入的 `emailRedirectTo` 已包含 `/auth/confirm?next=...`，模板在其后追加 token：

```html
<a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">确认邮箱</a>
```

必须保留这组模板与回调的配套关系，不能直接使用默认的 `ConfirmationURL` 模板替代。回调通过 `verifyOtp` 建立会话，成功后跳转到校验过的站内 `next`；无效或过期链接回到登录页提示。注册成功或确认链接失效时，可在注册/登录表单中填写邮箱并重发确认邮件，无需重新创建账号；重发使用相同的回调地址并返回中性提示。用户名为 3–32 位小写字母、数字或下划线，注册时由 Auth 触发器创建唯一 profiles 记录。

### 完全本地的 Supabase（可选）

需要运行中的 Docker 和 Supabase CLI。项目已提供 `supabase/config.toml`：

```bash
npx supabase start
npx supabase db reset --local --no-seed
npx supabase status
```

`db reset` 会清空本地数据库，仅用于开发环境。把 status 中的 API URL 与 anon key 填入 `.env.local`，在 status 显示的本地邮件查看器中打开确认邮件。无需导入示例题目或种子数据。`tests/database/plain_postgres_bootstrap.sql` 仅用于隔离 PostgreSQL 测试，不能在真实 Supabase 项目执行。

## 规则与权限

- 六张表允许匿名读取；仅登录用户可写。资料只能本人修改，题目、解法、Hack 和评论只能作者编辑/删除。作者和所属目标不可转移，状态不可由客户端指定。
- 解法只接受“有用”票；Hack 接受“有效/无效”。同一用户、同一目标最多一票，可转票、再次点击撤票；不能给自己的内容投票。
- Hack 有效票多于无效票为 `valid`，少于为 `invalid`，相等为 `pending`。解法存在任意 valid Hack 时为 `hacked`，否则存在 pending 时为 `disputed`，其余为 `normal`。创建、转票、撤票、删除都会重新汇总；修改正文不会清除状态。
- Hack 评论中解法作者的留言标记为作者回应。无需额外回复表。
- 删除题目会级联删除其下解法、Hack、评论和投票；删除解法或 Hack 同样级联删除其子内容，界面会明确确认。
- votes 写入与 Hack 创建/删除仅通过 RPC，统一先锁所属 solution。多态 comments/votes 用内部生成列和真实外键保证目标存在；这些内部列不改变表单接口。
- Markdown 禁用原始 HTML，过滤链接协议，KaTeX 禁用可信命令。代码和证据按文本展示，外部图片不会经过 Next.js 图片代理。

## 部署到 Vercel

1. 将项目推送至 Git 仓库并在 Vercel 导入，选择 Next.js、Node.js 22，使用默认 `npm run build` 和 `.next` 输出。
2. 在 Vercel 对需要的环境设置上述三个变量；`NEXT_PUBLIC_SITE_URL` 设置为该环境实际可访问域名，然后部署。
3. 按前文完成 Supabase 迁移、邮箱模板及 Site URL/Redirect URLs 配置。更换域名或公开环境变量后重新部署。
4. 用真实邮箱完成注册确认、登录、发布、投票和退出检查。未完成这一步，不应把单元测试或 PostgreSQL 验收视为 Auth 端到端验收。

本轮 `npm audit` 报告 5 项依赖漏洞（4 high、1 critical），其中 critical 涉及当前要求使用的 Next.js 14.2.35；审计建议的框架修复需要升级主版本。项目保留 Next.js 14 技术栈，正式上线前需处理依赖安全问题，详见验收记录。

## 验证

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

有运行中的 Docker 时，推荐一键验证最终迁移、权限、状态和双连接并发：

```bash
npm run test:db:docker
```

脚本创建无持久卷、无宿主机开放端口的临时 PostgreSQL 15 容器，模拟最小 Auth 结构，依次执行迁移和验收并清理容器；不需要宿主机安装 `psql`，也不连接你的 Supabase 项目。首次运行会拉取 PostgreSQL 镜像。这只验证数据库行为，不启动或验证真正的 Supabase Auth 服务。

也可以对已执行迁移的专用测试数据库验收。此方式需要 `psql`，连接账号必须可创建测试 Auth 用户并切换角色。仅在可丢弃的数据库中运行；脚本会插入、删除固定测试用户并运行两个独立连接：

```bash
export OPENOI_TEST_DB_URL='postgresql://...'
export OPENOI_TEST_DB_CONFIRM=disposable
npm run test:db
```

验收覆盖、已验证结果与尚未验证的托管 Auth/浏览器流程见 [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)。
