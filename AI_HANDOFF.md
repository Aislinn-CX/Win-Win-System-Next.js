# Win-Win System — AI 开发交接文档

> 本文档写给「另一台电脑上的 Claude」。无需任何历史聊天记录，读本文档即可无缝继续开发。
> 生成日期：2026-08-13（会话结束时）

---

## 1. 今日开发总结

今日按 SDD（v1.2）第 12 节实施顺序，完成了 **step ① 数据库层 → step ③ 业务流程** 三大块。

### 完成的功能

1. **数据库层（SDD 第 6 章）**：13 张表全部建好，Drizzle ORM + Railway PostgreSQL。
2. **Workflow Engine 核心框架（SDD 第 3 章）**：7 个组件 + 6.4 规则表。
3. **9 个业务流程（SDD 第 2 章）**：全部实现，配单元测试（21 个用例）。
4. **报价单自查规则更新**：周长检查、装柜量检查按用户最新规则重写。

### 新增文件

**数据库 schema**（`src/db/schema/`）：
- `audit-log.ts`、`customer.ts`、`factory-date-change-log.ts`、`inspection-record.ts`、`quote.ts`、`relations.ts`、`shipment-payment-record.ts`、`task.ts`

**数据库种子**（`src/db/seed/`）：
- `seed-helpers.ts`、`contracts.seed.ts`、`tasks.seed.ts`、`quotes.seed.ts`、`index.ts`

**开发工具脚本**（`src/tools/`）：
- `db-migrate.ts`、`db-seed.ts`、`db-reset.ts`

**Workflow Engine**（`src/workflow/`）：
- `date-calculator.ts`、`rules.ts`、`types.ts`、`change-logger.ts`、`task-manager.ts`、`state-reader.ts`、`state-updater.ts`、`engine.ts`、`index.ts`
- `quotation-checker.ts`、`contract-creation.ts`、`task-actions.ts`、`inspection.ts`、`payment.ts`、`completion.ts`
- `__tests__/date-calculator.test.ts`、`__tests__/quotation-checker.test.ts`

**配置 / 迁移**：
- `drizzle/0000_wealthy_kate_bishop.sql`（+ `drizzle/meta/`）
- `vitest.config.mts`
- `.env.local`（Railway 连接串，已被 .gitignore 排除）

### 修改文件

- `package.json`：新增 db 脚本 + test 脚本，新增依赖 `drizzle-orm`、`postgres`、`drizzle-kit`、`tsx`、`dotenv`、`vitest`
- `drizzle.config.ts`：显式加载 `.env.local`（`config({ path: ".env.local" })`）
- `src/db/index.ts`：导出 `Db` 类型
- `src/app/page.tsx`、`src/app/layout.tsx`、`src/app/components/StatCard.tsx`（更早，会话初期）
- `src/app/components/Sidebar.tsx`（更早，会话初期）

### 删除文件

- 临时验证脚本（`src/tools/*.tmp.ts`），用后即删，无保留价值

---

## 2. 当前项目状态

按 SDD 第 12 节 6 步实施顺序：

| 步骤 | 内容 | 状态 |
|------|------|------|
| ① 数据库表结构 | 13 张表 + 触发器 + 种子 | ✅ 完成 |
| ② Workflow Engine 框架 | 7 组件 + 规则表 | ✅ 完成 |
| ③ 9 个业务流程 | 全部实现 + 单元测试 | ✅ 完成 |
| ④ API 层 | 8.2 节全部接口 | ⬜ 未开始（下一步） |
| ⑤ 页面 | 第 7 章页面清单 | ⬜ 未开始（仅 Dashboard 骨架） |
| ⑥ AI 模块 | 第 9 章 | ⬜ 未开始 |

**已完成**：数据库、Workflow Engine、9 个业务流程（报价自查/订单录入/交期提醒/ETD/验货/DP收款/OA收款/完结/归档 + 任务状态机）。

**未完成**：API 路由层、前端业务页面、AI 模块（OCR/翻译/检索）。

---

## 3. 架构说明

### 核心架构决策（不可随意更改）

1. **ORM 用 Drizzle ORM + postgres 驱动**（不是 Prisma，不是 better-sqlite3）。数据库是 Railway PostgreSQL，V1 起即用，不走 SQLite。

2. **业务规则集中在 `src/workflow/` 的 Workflow Engine**。前端/API 绝不写业务规则（SDD 第 10 章铁律）。

3. **代码在根目录 `src/`**，不拆 workspace package（`apps/`、`packages/` 目前是空的）。

4. **规则表是唯一真相来源**：`src/workflow/rules.ts` 里的 `TASK_RULES`（声明式）。新增 task_type 只加一条规则，不改引擎核心循环。

### 关键设计约束（为什么这样设计）

- **Task 永不物理 DELETE**：撤销一律 `status="无需处理"`。所有引擎代码都遵循。
- **`planned_remind_date` vs `next_remind_date` 职责分离**：前者引擎创建时写入、终身不变；后者用户 postpone 时写入、可覆盖。
- **日期类型严格区分**：业务日期用 PG `date`（返回 "YYYY-MM-DD" 字符串），系统时间用 `timestamp`。
- **`updated_at` 用数据库触发器维护**：Drizzle 的 PG 驱动不支持 `$onUpdateFn`，用 `update_updated_at_column()` 函数 + 每表 `BEFORE UPDATE` 触发器。
- **所有状态修改写 `audit_log`**：由 `change-logger.ts` 统一处理。
- **DP/OA 是两套独立函数**（`recordDpPayment` / `recordOaPayment`），不共用 if 分支。
- **事件→规则映射**：`EVENT_RULES` 精确控制每个事件重算哪些 task_type（如 ETD 变更不重算 DP 的 TELEX_DP）。

### 替代方案（已否决，不要回头）

- ~~SQLite + better-sqlite3~~ → 用户明确要求 V1 直接上 Railway PostgreSQL。
- ~~Prisma~~ → 选了 Drizzle（零构建、SQL-like、轻量）。
- ~~工作流引擎拆独立 package~~ → V1 只有一个消费者，留在 `src/`。

---

## 4. 数据库

### Schema（13 张表，已建好）

| 表 | 文件 | 说明 |
|----|------|------|
| contract | schema/contract.ts | 合同主表，payment_type + status |
| contract_item | schema/contract.ts | 产品明细，事实记录中枢（28 字段） |
| factory_date_change_log | schema/factory-date-change-log.ts | 交期变更，append-only |
| inspection_record | schema/inspection-record.ts | 验货记录，支持多轮重验 |
| task | schema/task.ts | 全系统唯一任务容器 |
| shipment_payment_record | schema/shipment-payment-record.ts | V1 预留（建表不写） |
| audit_log | schema/audit-log.ts | 审计日志，entity_id 无 FK |
| quote | schema/quote.ts | 报价单主表 |
| quote_item | schema/quote.ts | 报价单产品明细 |
| quote_en_desc_suggestion | schema/quote.ts | AI 建议暂存 |
| quote_image_candidate | schema/quote.ts | AI 检索候选暂存 |
| quote_feedback_log | schema/quote.ts | 报价反馈 |
| customer | schema/customer.ts | V1 预留 |

### Migration

- 唯一迁移文件：`drizzle/0000_wealthy_kate_bishop.sql`
- 已手动补充 `update_updated_at_column()` 函数 + 4 个触发器（contract/customer/quote/task）
- **已在 Railway PostgreSQL 上执行过**（`pnpm db:migrate` 成功）

### 关键命令

```bash
pnpm db:generate   # schema 变更后生成迁移文件
pnpm db:migrate    # 执行迁移（正式结构变更手段）
pnpm db:seed       # 写种子数据（会 TRUNCATE 所有表）
pnpm db:reset      # DROP schema → migrate → seed
pnpm db:studio     # 可视化 Drizzle Studio
# db:push 保留但本次未用（跳过迁移文件，不可追溯）
```

### 注意事项 ⚠️

1. **`drizzle/0000_wealthy_kate_bishop.sql` 严禁再次 `db:generate` 覆盖**（已手动编辑过触发器）。后续 schema 变更必须先 migrate 掉它，再 generate 出 `0001_xxx.sql`。
2. **`.env.local` 里的 `DATABASE_URL` 用的是 Railway 公网 proxy 地址**（`sakura.proxy.rlwy.net`），不是内网 `postgres.railway.internal`（后者本地无法解析）。
3. **`tsx` 工具脚本不会自动加载 `.env.local`**，三个 `src/tools/*.ts` 顶部都有 `config({ path: ".env.local" })`，别删。
4. **`original_factory_date` 终身不可变**（NOT NULL，创建时写入）。
5. **quote_item 表目前没有「装柜量」字段**（装柜量自查的入参 `containerQty` 是临时函数参数，未落库——待用户确认是否加 3 个字段）。

---

## 5. API

**当前没有任何 API 路由（`src/app/api/` 不存在）。**

API 层是下一步（SDD step ④）。计划中的接口（对应 SDD 8.2，尚未实现）：

| 接口 | Method | 对应流程 | 引擎函数（已实现，待包装） |
|------|--------|---------|---------------------------|
| /api/contracts | POST | 2.2 订单录入 | `createContract` |
| /api/contract-items/{id}/factory-date | PATCH | 2.3/4.1 | `handleFactoryDateChanged` |
| /api/contract-items/{id}/actual-etd | PATCH | 2.4/4.2 | `handleEtdChanged` |
| /api/tasks/{id} | PATCH | 5.2 | `completeTask` / `postponeTask` |
| /api/contract-items/{id}/inspections | POST | 2.7 | `handleInspectionResult` |
| /api/contracts/{id}/complete-confirm | POST | 2.8 | `confirmContractCompletion` |
| /api/quotes/{id}/check | POST | 2.1 | `runQuotationCheck` |

**实现 API 时铁律**：接口只做参数校验/鉴权/转发，调用 `src/workflow/` 的函数，不写业务规则（SDD 第 10 章）。

---

## 6. 待办事项

### P0（必须，下一步）
- [ ] **API 层**（SDD 第 8 章）：把上面 7 个接口用 Next.js Route Handlers 实现，每个接口做参数校验 + 调用引擎函数 + 统一异常返回结构 `{ error_code, message, field? }`。

### P1（重要）
- [ ] **前端业务页面**（SDD 第 7 章）：合同列表、合同详情、任务中心、报价自查页、历史列表。
- [ ] **确认「装柜量」是否落库**：若需持久化，给 `quote_item` 加 3 个字段 + migration。
- [ ] **报价自查的体积/重量规则**：仍是我假设的公式，需对照 PRD 3.5 校准（`quotation-checker.ts` 的 `DEFAULT_CONFIG`）。
- [ ] **每日扫描定时任务**：`refreshTaskStatuses` 已实现，但还没有 cron 调度入口。
- [ ] **集成测试**：Workflow 的 DB 流程目前只靠临时脚本验证，缺正式集成测试（vitest 已配好，可加 DB 事务回滚的集成测试）。

### P2（优化）
- [ ] 引擎操作加事务（`db.transaction`），保证原子性。
- [ ] 清理 `src/app/db/schema/index.ts` 这个空文件（内容只有 `export {}`，疑似误建）。
- [ ] 删除 `contract-creation.ts` 里未用的 `updateItemField`（如确认无用）。

---

## 7. 下一位 Claude 应立即开始做什么

**第一步**：读 `AI_HANDOFF.md`（本文件），再读 `src/workflow/index.ts`（引擎全部出口）和 `src/workflow/rules.ts`（规则表）。

**第二步**：读 SDD 第 8 章「API Design」和第 10 章「开发规范」，确认接口契约和铁律。

**第三步**：在 `src/app/api/` 下建 Route Handlers，先实现 `POST /api/contracts`（对应 `createContract`），作为第一个接口样板，确立「参数校验 → 调引擎 → 统一返回」的模式。

**第四步**：其余 6 个接口照同一模式实现（参考上面第 5 节的映射表）。

**第五步**：跑 `pnpm build` + `pnpm test` 确认无误，用 `curl` 或脚本实测接口（先 `pnpm db:seed` 造数据）。

**第六步**：接口全通后，开始前端页面（第 7 章），从「合同列表页」开始。

---

## 8. 已知 Bug / 易踩坑

### 已知问题
1. **`src/app/db/schema/index.ts` 是空文件**（只有 `export {}`），疑似误建，未删（不是本人创建，删前需确认）。
2. **报价自查的体积/重量公式是假设**（非 SDD/PRD），等 PRD 3.5 校准。
3. **quote_item 缺「装柜量」字段**（见第 6 节 P1）。
4. **git 状态混乱**：`33229d2` 提交只含部分 DB 文件，大量工作（workflow、seed、tools、大部分 schema）未提交。

### 不能动的地方
- `drizzle/0000_wealthy_kate_bishop.sql`（已执行+手动编辑过触发器）
- `.env.local`（真实 Railway 连接串）
- `src/workflow/rules.ts` 的 `EVENT_RULES` 映射关系（尤其「ETD 变更不重算 TELEX_DP」）
- `src/db/schema/contract.ts` 的 `originalFactoryDate` 的 `.notNull()` 约束

### 容易踩的坑
1. **`date` 列返回 "YYYY-MM-DD" 字符串**（不是 Date 对象），日期运算用 `src/workflow/date-calculator.ts` 的工具函数，别用 `new Date()` 直接算（时区坑）。
2. **`tsx` 不加载 `.env.local`**，脚本顶部需 `config({ path: ".env.local" })`。
3. **Drizzle 的 PG 驱动无 `$onUpdateFn`**，updated_at 靠触发器。
4. **`numeric` 字段传字符串**（如 `orderQty: "2000"`），postgres-js 返回也是字符串，别当 number 用。
5. **新增 task_type 先改 `src/db/types.ts` 的 `TASK_TYPE` const**，再改 `rules.ts`，否则类型报错。

---

## 9. Git 信息

- 现有 2 个提交：`1b6a5ef 初始化`、`33229d2 chore: setup PostgreSQL and Drizzle database foundation`。
- **本次会话大量工作未提交**，包括：
  - 未跟踪：`src/workflow/`（全部引擎+测试）、`src/db/seed/`、`src/tools/`、`src/db/schema/`（8 个 schema 文件）、`drizzle/`、`vitest.config.mts`
  - 已修改：`package.json`、`drizzle.config.ts`、`src/db/index.ts`
- 需要用户（或下一位）提交，建议分两个 commit：①数据库层 ②Workflow Engine + 业务流程。

---

## 10. 给下一位 Claude 的说明

**你是下一位 Claude。** 继续开发前：

1. **先读本文件**，再读这些文件建立上下文（按顺序）：
   - `src/workflow/index.ts` — 引擎全部出口
   - `src/workflow/rules.ts` — 6.4 规则表 + 事件映射
   - `src/workflow/engine.ts` — 重算核心循环
   - `src/db/schema/index.ts` — 全部表
   - `AI_HANDOFF.md` 第 3 节的架构约束

2. **不要改的文件**：`drizzle/0000_*.sql`、`.env.local`、`src/workflow/rules.ts` 的 `EVENT_RULES`。

3. **保持一致的东西**：
   - 业务规则只在 `src/workflow/`，前端/API 不写规则
   - Task 永不 DELETE，用「无需处理」
   - 日期用 `date-calculator.ts` 工具函数
   - 状态修改写 audit_log
   - 中文枚举值（进行中/待处理/已完成 等）与 SDD 第 5.2 节对照表一致

4. **总体思路**：
   - 当前是「后端业务逻辑已就绪，缺 HTTP 接口和页面」的状态。
   - 下一步按 SDD step ④ → ⑤ → ⑥ 推进：先 API 层（薄封装引擎函数），再前端页面，最后 AI 模块。
   - 每完成一个流程，跑 `pnpm test` + `pnpm build` 验证，用脚本实测 DB 流程后 `pnpm db:seed` 恢复数据。
