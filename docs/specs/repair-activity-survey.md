# 维修活动模块 · 现有代码与契约调研

> **基线**：`4472b49`（`origin/main`，Merge PR #57 `feat/nav-settings-fold`）  
> **调查方式**：detached HEAD 只读；本地原分支未跟踪文件已 stash（`survey-temp-stash`）。  
> **结论摘要**：仓库**没有** Activity / Event / Signup / Attendance 领域模型；「维修活动」需新建。可复用维修单创建链路、故障分类（含「散热 / 清灰」）、成员/管理/公开导航壳、`requirePermission`、内存限流与手机号规范化、Asia/Shanghai 日期惯例。管理端 CRUD 模板优先对齐 **技能标签 / 故障分类**（表单 + 表格 + 启停），破坏性操作对齐邀请码撤销 / 评论软删确认面板。

---

## 1. 数据层（Prisma）

**文件**：`prisma/schema.prisma`

### 相关 model（节选）

| 域 | Model | 表名 / 要点 |
|---|---|---|
| 维修单 | `RepairRecord` | `repair_records`：`memberProfileId`、`repairDate`(@db.Date)、`categoryId?`、`content`、`result`、`status`、`createRequestKey`(幂等)、`version`、软删 `deletedAt` |
| 故障分类 | `RepairCategory` | `repair_categories`：`id`(UUID)、**`code`**(唯一，非 slug)、`name`、`description?`、`sortOrder`、`isActive`、软删 |
| 成员 | `MemberProfile` | `member_profiles`：挂在 `User` 上；维修记录外键指向此表 |
| Session / Auth | `AuthSession`、`LoginThrottle`、`User`、`UserIdentity`、`PasswordCredential`、`Role`、`UserRole` | Cookie session（`tokenDigest`）；**无** NextAuth Session 表 |
| 出勤 | — | **无** Attendance / CheckIn 类 model |
| 活动/报名 | — | **无** Activity / Event / Signup 类 model |

### 易混淆但非「活动」

- `RepairTimelineEvent`：维修单状态时间线（CREATED / SUBMITTED / …），不是站外活动。
- `MemberRecentActivity`（`src/types/contracts.ts`）：成员工作台 DTO，表示最近维修，**不是** Prisma model。
- `JoinApplication`：招募报名，与维修活动报名无关。

### Seed 分类（含清灰）

`prisma/seed.ts` 已 upsert：

| id（固定） | code | name |
|---|---|---|
| `10000000-…0001` | `COOLING_CLEANING` | **散热 / 清灰** |
| `…0002`–`…0009` | `HARDWARE` / `SYSTEM` / `SOFTWARE` / `DRIVER` / `NETWORK` / `STORAGE` / `PERIPHERAL` / `OTHER` | 对应中文名 |

---

## 2. 维修单创建链路（成员端「提交维修记录」）

实际是 **两步**：先建草稿，再提交审核。

### API

| 步骤 | 路由 | Handler | Service |
|---|---|---|---|
| 建草稿 | `POST /api/v1/repairs` | `src/app/api/v1/repairs/route.ts` → `repairService.createDraft` | `src/features/repairs/repair-service.ts` |
| 改草稿 | `PATCH /api/v1/repairs/[id]` | `[id]/route.ts` | `repairService.update` |
| 提交 | `POST /api/v1/repairs/[id]/submit` | `[id]/submit/route.ts` | `repairService.submit` |
| 分类下拉 | `GET /api/v1/repair-categories` | `repair-categories/route.ts` | `repairCategoryService.list`（仅 `isActive`） |

### 入参字段

- HTTP 解析：`draftInput()`（`src/features/repairs/repair-http.ts`）
- 契约：`RepairDraftFields` / `CreateRepairDraftInput`（`src/types/contracts.ts`）

| 字段 | 说明 |
|---|---|
| `repairDate` | `YYYY-MM-DD` 或 null |
| `durationMinutes` | 1–10080 |
| `categoryId` | **分类 UUID**（不是 code/slug） |
| `content` | ≤10000 |
| `result` | `COMPLETED` \| `NOT_COMPLETED` |
| `remark` | ≤2000 |
| Header `Idempotency-Key` | 建草稿 → `createRequestKey`；提交写入 timeline summary |

校验：`normalizeDraftFields` / `validateDraftFields` / `validateSubmission`（`repair-validation.ts`）。提交时强制：日期、分类、结果、≥1 张照片；分类须仍存在且 `isActive`。

### 分类如何指定

客户端传 `categoryId`（UUID）。列表来自 `GET /api/v1/repair-categories`。服务端不接受 name/code 作为写入键。

### 是否事务

是。`createDraft` / `update` / `submit` / `softDelete` 均走 `inSerializableTransaction`（`src/lib/db/transaction.ts`），并写 `RepairTimelineEvent`。权限：`requirePermission(actor, "repair:create" | "repair:submit" | …)`。

页面：`/member/repairs/new`、`/member/repairs/[id]/edit`（layout 用 `requireActiveMemberPage`）。

---

## 3. 故障分类

### 字段（无独立 slug）

- `id`：UUID  
- `code`：稳定标识，如 `COOLING_CLEANING`（`stableCodeFromName(name, "CAT")` 可自动生成）  
- `name`：展示名（如「散热 / 清灰」）  
- 另有 `description`、`sortOrder`、`isActive`、`deletedAt`

### 「清灰」是否已存在

**已存在**：seed `COOLING_CLEANING` / 「散热 / 清灰」。活动若绑「清灰」类维修，应引用该分类 `id`/`code`，勿新建同义分类。

### Admin API

| 方法 | 路径 | 权限 |
|---|---|---|
| GET/POST | `/api/v1/admin/repair-categories` | `repair:category:manage` |
| PATCH | `/api/v1/admin/repair-categories/[id]` | 同上 |
| POST | `…/[id]/activate` / `deactivate` / `reorder` / `move` | 同上 |

实现：`repair-category-service.ts`；UI：`/admin/categories` + `CategoryAdminPanel.tsx`。**无 DELETE**：引用过只能停用。

`CreateRepairCategoryInput`：`{ code?, name, description?, sortOrder? }`。

---

## 4. 成员端壳与导航 / 权限

### 导航

| 项 | 位置 |
|---|---|
| 配置 | `src/config/member.ts` → `memberNav` / `memberSettingsNav` |
| 组件 | `src/components/member/MemberNav.tsx` |
| Layout | `src/app/member/layout.tsx` → `requireMemberPage()` + `MemberShell` |

常驻：`/member`（工作台）、`/member/repairs`、`/member/profile`。设置菜单：通知 / 收藏 / 排行。**勿把「新建维修」塞进侧栏**（约定：主 CTA 在工作台/列表顶栏）。

### 页面守卫

- `requireMemberPage()`：登录 + 已改密（`src/lib/auth/member-page.ts`）
- `requireActiveMemberPage()`：另需有效 `memberProfileId` 且 `ACTIVE`（维修子页用）

### API 权限惯用写法

```ts
const { actor } = await authenticateRequest(request, requestId);
requirePermission(actor, "repair:create"); // src/lib/auth/permissions.ts
```

角色权限表：`rolePermissions`（MEMBER / ADMIN）。写操作另调 `assertSameOrigin(request)`。新活动权限需扩展 `Permission` 联合类型与 `rolePermissions`。

---

## 5. 管理端 CRUD 模板（最近似）

推荐模板（同构度从高到低）：

1. **技能标签**（首选「字典类」模板）  
   - 页：`src/app/admin/skills/page.tsx`  
   - 面板：`SkillAdminPanel.tsx` + `skill-table-spec.tsx`  
   - API：`/api/v1/admin/skills` + `[id]` activate/deactivate/reorder/move  
   - 模式：顶栏新增表单 + `AdminTable` + 行内编辑 + **启停（无物理删除）** + 拖拽排序 + `AdminToast`

2. **故障分类**（与技能几乎同构）  
   - `/admin/categories` + `CategoryAdminPanel.tsx`

3. **邀请码**（有「创建一次明文 + 撤销」）  
   - `/admin/invite-codes` + `InviteCodeAdminPanel.tsx`  
   - 撤销：`POST …/revoke`（偏直接动作；破坏性确认可参考评论/维修软删面板）

4. **评论软删确认**（需二次确认时）  
   - `CommentAdminPanel` 的 `removePanel` + `AdminModal`

Admin 壳：`src/app/admin/layout.tsx`（`requireAdminPage` + `AdminNav`）；导航配置 `src/config/admin.ts`（`adminNavGroups` / `adminSettingsNav`）。新模块：加 `ADMIN_SECTION_INDEX`、文案进 `adminCopy`、侧栏条目、page + Panel。

---

## 6. 公开站导航与路由惯例

| 项 | 位置 |
|---|---|
| `mainNav` | `src/config/navigation.ts`（01–04：`/` `/about` `/join` `/docs`） |
| Header | `src/components/layout/Header.tsx` 读 `mainNav`；成员登录用 `memberLoginLink`（**不进** mainNav） |
| 根 layout | `src/app/layout.tsx` 挂载 Header |

惯例：公开页为 `src/app/<segment>/page.tsx`；`/admin`、`/member` 独立壳，不进公开索引。新公开「活动」页：加目录 + **只改** `mainNav`（及文案配置）；账号入口勿塞进编号栏。

---

## 7. 限流 / 校验 / 手机号

| 能力 | 位置 | 说明 |
|---|---|---|
| Rate limit | `src/lib/api/rate-limit.ts` → `enforceRateLimit(key, limit=10, windowMs=60_000)` | 进程内 Map；注释写明多实例需替换。现用于 `join-applications`、`member-registrations/invite` |
| Zod | — | **未使用**；校验为手写 + `AppError("VALIDATION_FAILED", …, { fieldErrors })` |
| 手机号 | `normalizePhone()`（`src/lib/security/normalization.ts`） | `1[3-9]\d{9}`；另有 `normalizeQq` / `normalizeInviteCode` |
| Admin body 解析 | `src/features/admin/admin-http.ts` | `bodyString` / `bodyOptionalInt` 等 |

公开报名若收集手机号：复用 `normalizePhone` + 对 IP 调 `enforceRateLimit`。

---

## 8. 时区惯例

| 层 | 惯例 |
|---|---|
| DB 会话 | Prisma/MariaDB adapter `timezone: "Z"`；健康检查要求会话 `+00:00`（`REQUIRED_TIME_ZONE`，`src/lib/db/health-check.ts`） |
| 业务自然日 | **Asia/Shanghai**：维修日期不可晚于「今天」（`repair-validation.ts` 的 `currentShanghaiDate`）；列表筛选用 `parseUtcDateFilter`（`src/lib/api/date-filter.ts`） |
| 存库日期 | `repairDate` 用 `YYYY-MM-DD` → `Date(\`${value}T00:00:00.000Z\`)`（按日历日存，非上海本地时刻） |
| UI 展示 | 多处 `Intl` + `timeZone: "Asia/Shanghai"`；`formatShanghaiDate`（`config/member.ts`） |
| 学期统计 | `src/lib/academic-term.ts`（上海自然日/月边界 → UTC） |

活动时间字段建议：日期类对齐 `repairDate` + Shanghai 校验；时刻类存 UTC（`DateTime(3)`），展示/筛选用 Shanghai。

---

## 9. 对「维修活动」方案的直接启示

1. **绿字段**：需新 Prisma model（活动、场次、报名/出勤等）；勿硬塞进 `RepairRecord` / `RepairTimelineEvent`。  
2. **与维修耦合点**：可选用已有 `RepairCategory`（清灰 = `COOLING_CLEANING`）；成员落单仍走现有 `repair:create` → draft → submit。  
3. **壳与入口**：成员侧改 `memberNav`（或设置菜单）；管理侧仿 skills/categories；公开页改 `mainNav`。  
4. **横切**：`authenticateRequest` + `requirePermission` + `assertSameOrigin` + 可序列化事务 + 审计；限流用现有内存限流器（知悉单机限制）。  
5. **不要引入 Zod**（除非单独立项）；跟现有手写校验风格。

---

## 关键路径速查

```
prisma/schema.prisma
prisma/seed.ts
src/features/repairs/repair-service.ts
src/features/repairs/repair-validation.ts
src/features/repairs/repair-http.ts
src/features/repairs/repair-category-service.ts
src/app/api/v1/repairs/route.ts
src/app/api/v1/repairs/[id]/submit/route.ts
src/app/api/v1/repair-categories/route.ts
src/app/api/v1/admin/repair-categories/**
src/app/api/v1/admin/skills/**
src/lib/auth/permissions.ts
src/lib/auth/member-page.ts
src/lib/api/rate-limit.ts
src/lib/security/normalization.ts
src/lib/api/date-filter.ts
src/config/member.ts
src/config/navigation.ts
src/config/admin.ts
src/types/contracts.ts          # Repair* / RepairCategory* / Permission
src/components/admin/SkillAdminPanel.tsx
src/components/admin/CategoryAdminPanel.tsx
src/components/member/MemberNav.tsx
src/components/layout/Header.tsx
```
