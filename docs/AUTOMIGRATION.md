# 自动数据库迁移

工作流：`.github/workflows/supabase-migrations.yml`（GitHub Actions 中显示为 **Supabase migrations**）。

## 日常使用

1. 数据库变更新增为 `supabase/migrations/YYYYMMDDHHMMSS_description.sql`。不要修改或删除已经执行的文件；修复也应新增迁移。
2. PR 会在 GitHub 的临时 PostgreSQL 容器中检查迁移，不读取生产密钥。
3. 相关变更推送到 `main` 后，验证成功才进入生产任务，先核对历史记录、预览待执行文件，再执行 Supabase CLI `db push`。
4. 成功执行的版本会写入 Supabase 迁移记录，下次不会重复运行。工作流也可以从 Actions 手动运行，但生产任务只接受 `main`。

生产迁移串行执行，不取消正在运行的任务。历史三份迁移有 SHA-256 校验；新文件须使用唯一、递增的版本号。工作流不执行 `db reset`、生产 seed 或自动修复历史。

Vercel 的 Git 自动部署保持原设置，与此工作流独立运行，并不会等待数据库任务。涉及新字段时，先单独提交兼容旧网站的数据库迁移，确认 Actions 成功后，再提交依赖新字段的网站代码。删除旧字段或其他不兼容升级仍需安排发布顺序，不能假设一次推送的两个平台有固定先后关系。

## 首次接入：已手动执行的迁移

OpenOI 此前已在 SQL Editor 执行以下文件：

- `20260929000000_initial.sql`
- `20260929010000_content_limits.sql`
- `20260929020000_simplify_content.sql`

一次性执行 `scripts/baseline-migration-history.sql` 登记这些版本。它先检查当前表、列、RLS、视图与约束，再登记版本；不重跑迁移，不修改 public 业务数据。历史结构与官方 Supabase CLI 相同，已执行 SQL 的 `statements` 保持 NULL。这个脚本放在 `scripts/`，不会由生产工作流自动执行。

如核对失败，应查明原因，不能把尚未执行的 SQL 标记为完成。后续发生历史冲突同样要人工核对，不能用 reset 或随意 repair 绕过。

## 配置唯一密钥

在 GitHub 仓库 Settings → Environments → **production** → Environment secrets 添加：

- Name：`SUPABASE_DB_URL`
- Value：OpenOI PostgreSQL **Session pooler** 完整连接 URI，端口 **5432**，末尾带 `?sslmode=require`。

从 Supabase 项目顶部 **Connect** → Connection string → **Session pooler** 获取地址。将连接模板中的密码占位符替换为建项目时设置的**数据库密码**，它不是 Supabase 网站登录密码，也不是 publishable key。密码含 `@`、`#`、`%` 等字符时必须进行 URL 编码；不要使用在线编码网站处理密码。

格式如下，`POOLER_HOST` 必须使用控制台实际显示的地址：

```text
postgresql://postgres.rnwojkpmsmypeaetxknr:URL_ENCODED_PASSWORD@POOLER_HOST:5432/postgres?sslmode=require
```

必须选择 Session pooler，不能用端口 6543 的 Transaction pooler。工作流校验目标项目、连接域名和 TLS，拒绝额外连接参数。无需 Supabase access token、service-role key 或 Vercel 数据库密钥。不要将此 URI 放入 Git、聊天、日志或 `NEXT_PUBLIC_*`。

该密钥让 GitHub Actions 有权对这个项目执行数据库结构更新；保管仓库写权限，并检查合并到 main 的 SQL。密钥缺失或格式错误时，任务会在连接生产数据库前失败。

## 首次验证

密钥保存且历史登记完成后，在 Actions → Supabase migrations → Run workflow，选择 main。无新增迁移时应显示数据库已经是最新版本；这一次运行验证连接和历史记录，不应重跑三份建库 SQL。

错误发生后先检查失败步骤。连接超时通常需要核对 Session pooler 地址与网络；认证失败需核对数据库密码；历史缺失需核对一次性登记。不要在日志或 Issue 中贴完整连接串。

本地无需启动 Docker 就能先验证历史迁移与一次性登记逻辑：

```bash
node scripts/validate-migration-files.mjs
node --test tests/validate-supabase-db-url.test.mjs
bash scripts/test-db-pglite.sh
```

完整 PostgreSQL 验证由 GitHub Actions 的隔离 Docker 完成。本地 Docker 仍保持用户选择的停止状态。
