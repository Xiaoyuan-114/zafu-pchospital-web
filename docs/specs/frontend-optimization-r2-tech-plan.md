# 全站易用性 / 美观性优化 R2 — 技术方案

> 仓库：`ZAFU-PCHospital/zafu-pchospital-web`  
> 调研基线：本地 `feat/repair-activity` @ `74310c5`；远程 `origin/main` @ `aef2b20`（**已合入 PR #58**）  
> 约束：本文只描述方案与验收；**不改业务代码、不 push、不开 PR**  
> 起草：2026-09-25（Asia/Shanghai）  
> 产品硬性：公开活动列表横滑带 + **排序方案 B**；全站以已落地设计收敛；另开 PR

---

## 0. 调研快照（git / #58）

| 项 | 事实 |
| --- | --- |
| 本地当前分支 | `feat/repair-activity` → `74310c5`（跟踪 `fork/feat/repair-activity`） |
| `origin/main` HEAD | `aef2b20` — `Merge pull request #58 from Xiaoyuan-114/feat/repair-activity` |
| PR #58 | **已 merged**（`merged_at` ≈ 2026-09-25 22:05 CST）；head SHA = `74310c5` |
| `origin/feat/repair-activity` | **不存在**（功能分支在 fork：`fork/feat/repair-activity`） |
| 祖先关系 | `74310c5` 是 `origin/main` 的祖先；内容上 main = merge(#58) |

**含义**：背景里「#58 尚未合入」已过时。R2 应直接以 **已含维修活动的 `origin/main`** 为基线开新分支，不必再等 #58。

---

## 1. 目标 / 非目标

### 1.1 目标

1. **公开维修活动列表**（`/repair-activities`）达到产品验收：
   - 宽屏：横滑卡片带（可拖 / 滑；左右箭头**可选**，非必须）；
   - 窄屏：竖列；
   - 卡片字段：标题、活动时间、状态、剩余名额 **或** 已报/上限；
   - 已结束仍出现但**不可点**（无假链接）；
   - 直链友好 404/结束态**沿用**现有口径（`ACTIVITY_ENDED` / 404 → 详情 `missing` + 返回列表）。
2. **排序方案 B（验收写死）**：
   - ① 未结束（`UPCOMING` / `OPEN` / `FULL` / `CLOSED`）按 `activityAt` **升序**；
   - ② 已结束（`ENDED`）整段接在后面，组内按 `activityAt` **降序**。
3. **全站收敛**：以现有已落地设计（导航壳、Card/Button、表单、状态色/`repair-tag`/`admin-tag`、空态/加载态、主题令牌）为基准做点状易用性/美观性修补；深浅色（`swiss-cobalt` / `black-yellow`）都必须对齐。

### 1.2 非目标

- 不换品牌色、不重做插画、不大改信息架构、不动效炫技（不做新一轮轮播炫技 / 装饰动画）。
- 不改 GreatSQL / Prisma 契约；不新增业务域；不放开「已结束可进详情报名」。
- 不重做成员壳 / 管理壳（上一轮 T-P0-* 已合入；本轮只收敛、不推倒）。
- 不把 `GalleryCarousel` 生搬为活动列表（语义是图集走马灯，不是卡片横滑带）。
- 管理端 / 成员端活动列表**本轮不强制**同样横滑（可复用排序纯函数；布局以公开列表验收为准）。

---

## 2. 分支衔接建议

### 2.1 推荐（更新后）

**从 `origin/main`（`aef2b20`，已含 #58 / `74310c5` 树）拉 `feat/ui-polish-r2`，PR base → `main`。**

| 方案 | 做法 | 利 | 弊 |
| --- | --- | --- | --- |
| **A（推荐）** | `git fetch && git checkout -b feat/ui-polish-r2 origin/main`；PR → `main` | #58 已合入，无等待；diff 干净；CI/审阅基线即生产主干 | 无（当前事实下最优） |
| B | 从 `feat/repair-activity`@`74310c5` 拉出，PR 先指该分支，等 #58 后再改 base | 在 #58 **未合入**时能并行开发 | **已不适用**：#58 已合入；再叠一层只增加改 base / rebase 噪音 |
| C | 从过时本地 `main`（`a59c727`，behind 36）拉出 | — | 缺大量已合入提交，禁止 |

### 2.2 操作备忘（实施时）

```bash
git fetch origin
git checkout -b feat/ui-polish-r2 origin/main
# …实现…
# PR: feat/ui-polish-r2 → main（另开，勿复用 #58）
```

本地若仍停在 `feat/repair-activity`，先别在其上直接堆 R2 commit；切到 A 方案新分支。工作区未跟踪的 `tools/capture-repair-activity-shots.mjs` / `tools/seed-repair-activity-preview.ts` **不要**默认带进 R2（与本轮无关）。

---

## 3. 现状摘要（公开活动列表）

### 3.1 路径与组件

| 层 | 落点 |
| --- | --- |
| 页面 | `src/app/repair-activities/page.tsx`（`PageHead` index=`05` + `Section`） |
| 列表 UI | `src/components/repair-activities/RepairActivityList.tsx`（client，`fetch /api/v1/repair-activities`） |
| 详情 | `…/RepairActivityDetail.tsx`；路由 `src/app/repair-activities/[id]/page.tsx` |
| 文案 | `src/config/repair-activities.ts` |
| 状态/标签 | `src/features/repair-activities/repair-activity-validation.ts` → `repairActivityStatusLabels` |
| 服务 | `repairActivityService.listPublic()`：`orderBy: [{ activityAt: "asc" }, { createdAt: "asc" }]` |
| 样式 | `src/app/globals.css` ≈ L6647+：`.activity-list` **竖向 grid**，尚无横滑带 |

### 3.2 五态文案（已落地，保留）

| status | 文案 |
| --- | --- |
| `UPCOMING` | 未开始 |
| `OPEN` | 报名中 |
| `FULL` | 已报满 |
| `CLOSED` | 报名截止 |
| `ENDED` | 已结束 |

### 3.3 卡片字段 vs 产品

| 字段 | 现状 | 产品硬性 |
| --- | --- | --- |
| 标题 | ✅ | ✅ |
| 活动时间 | ✅ | ✅ |
| 状态 badge | ✅（class 混用 `repair-tag` / `admin-tag`） | ✅ |
| 名额 | ✅ `已报/上限`；未结束另附「剩余名额」 | ✅「剩余名额 **或** 已报/上限」 |
| 报名时间窗 | ✅ 现有 `window` 一行 | ❌ **未列入**产品卡片字段 |

### 3.4 交互 / 直链

- 未结束：`Link` → `/repair-activities/[id]`。
- 已结束：无链接，`aria-disabled` 包裹 + `.activity-card--ended`（opacity 0.72）+ `endedHint`。
- 详情直链：`getPublic` 对 `ENDED` 抛 `ACTIVITY_ENDED`；UI 走 `missing` +「返回活动列表」。**R2 不改此口径。**

### 3.5 排序缺口（相对方案 B）

现状 = **全表 `activityAt` 升序**（含已结束夹在时间轴中间）。  
方案 B = 未结束升序段 + 已结束降序段。**必须在服务层（或共享纯函数后再排序）改掉**，并补单测；仅改 CSS 无法验收。

### 3.6 上一轮前端优化已落地资产（本轮基准）

- 壳层：`MemberShell` / `MemberNav` / `AccountMenu` / 管理侧栏设置折叠（#57 等）。
- 主题：`src/config/theme.ts` + `html[data-theme]`；`normal→swiss-cobalt`，`dark→black-yellow`；组件**只吃语义令牌**。
- 状态色：`:root` / 主题层均有 `--status-{success,warning,danger,neutral}-*`。
- UI 原语：`components/ui/{Button,Card,Section,…}`；禁止页面私造第二套按钮/卡片色。
- 徽章：`.repair-tag--{approved,pending,rejected,draft}`（deep + wash + line）；`.admin-tag` / `--accent` / `--muted`。
- 断点习惯：`--breakpoint-md: 760px`，`--breakpoint-lg: 1100px`（公开活动横滑建议对齐 **760 或 1100**，见 T-FE-1）。

参考文档：`/workspace/zafu-pchospital-web-frontend-optimization.md`（P0 任务卡；R2 不重复做壳层）。

---

## 4. 任务卡 T-FE-1～5

### T-FE-1 — 公开列表布局：宽屏横滑带 / 窄屏竖列

| 项 | 内容 |
| --- | --- |
| **做什么** | 将 `.activity-list` 从单一竖向 grid 改为响应式：宽屏横向可滚动卡片带（pointer 拖拽 + 触控滑 + 键盘可选）；窄屏保持竖列。箭头按钮**可选**（产品非必须；若做，须 `prefers-reduced-motion` 友好、不挡卡片焦点）。 |
| **验收要点** | ① ≥断点：单行横滑，卡片定宽（建议 `minmax(16rem, 20rem)` 级），`overflow-x: auto`，支持拖/滑；② &lt;断点：竖列，无横向裁切正文；③ 焦点可见、读屏列表语义保留（`ul/li`）；④ 不引入阴影/新强调色；⑤ 已结束仍不可点。 |
| **依赖** | #58 已在 main（活动数据/组件存在）；与 T-FE-3 字段收敛可同 PR 交错，但布局 CSS 可先落地。 |
| **预估落点** | `RepairActivityList.tsx`；`globals.css`（`.activity-list` / 新 `.activity-rail` 等）；必要时极薄 hook `useHorizontalDragScroll.ts`（放 `components/repair-activities/` 或 `lib/ui/`）；**不要**复用 `GalleryCarousel`。 |
| **断点建议** | 优先 `min-width: 760px`（md）起横滑，与全站 md 一致；若走查觉得平板仍偏挤，可改为 `1100px`。写入 PR 说明即可。 |

### T-FE-2 — 排序方案 B（纯函数 + `listPublic` + 单测）

| 项 | 内容 |
| --- | --- |
| **做什么** | 抽出纯函数 `sortRepairActivitiesForPublicList`（见 §5）；`listPublic` 在派生 status 后调用；补单测覆盖边界。Admin `listAdmin` **默认不改**（除非产品另要求；本卡仅公开列表验收）。 |
| **验收要点** | 给定混合样例，顺序严格符合 B；`activityAt` 相同未结束段用稳定次键（建议 `createdAt asc` 或 `id`）；已结束段降序同样要稳定次键。 |
| **依赖** | 无阻塞；可与 T-FE-1 并行。 |
| **预估落点** | `repair-activity-validation.ts`（或同目录新文件 `repair-activity-sort.ts`）；`repair-activity-service.ts` `listPublic`；`tests/unit/repair-activity-sort.test.ts`（新）或扩 `repair-activity-status.test.ts`。 |
| **注意** | DB `orderBy activityAt asc` 可保留为粗排，**最终顺序以内存纯函数为准**（因已结束要整段后置且组内降序）。 |

### T-FE-3 — 列表卡片字段与状态徽章收敛

| 项 | 内容 |
| --- | --- |
| **做什么** | 列表卡片对齐产品四要素；去掉或降级「报名时间」行（详情页可保留完整窗）。名额展示统一为「剩余名额 **或** 已报/上限」二选一策略（建议：未结束优先「剩余 N」+ 次要「已报/上限」可一行压缩；已结束只保留「已报/上限」）。状态 badge 映射收敛到设计系统语义，避免公开页继续裸用 admin 语境 class（见下表）。 |
| **验收要点** | 卡片无产品未要求的主字段抢视线；五态文案不变；深浅色下 badge 对比度仍可读。 |
| **依赖** | T-FE-1 的 DOM 结构（head/meta）；文案键可微调 `repairActivitiesPage`。 |
| **预估落点** | `RepairActivityList.tsx`；`src/config/repair-activities.ts`；可选抽 `activityStatusBadgeClass()` 与详情共用；`globals.css` 若需 `.activity-card` 密度微调。 |

**建议 badge 映射（收敛，不改文案）：**

| status | 建议 class | 语义 |
| --- | --- | --- |
| `OPEN` | `repair-tag repair-tag--approved` | 可行动（与现一致） |
| `FULL` | `repair-tag repair-tag--pending`（或保留 accent 若走查更清晰） | 警告满额 |
| `UPCOMING` | `repair-tag repair-tag--draft` | 中性未开始 |
| `CLOSED` | `repair-tag repair-tag--draft` | 中性截止 |
| `ENDED` | `repair-tag repair-tag--result` / draft | 中性结束 |

原则：公开列表尽量走 `.repair-tag` 语义色，少直接依赖 `.admin-tag*`（管理表语境）。

### T-FE-4 — 全站点状易用性 / 美观性收敛

| 项 | 内容 |
| --- | --- |
| **做什么** | 在**不推倒**已落地壳层的前提下，扫公开站 + 活动详情/报名表 + 与活动相关的空态/加载态/错误态，统一：间距节奏（`--s-*`）、`muted` 加载文案、错误用既有 `admin-status--error` 或 notice Card、主按钮只用 `Button`。顺手修活动详情/列表上明显的「新模块尚未吃令牌」毛边（例如加载态是否与成员骨架同级——公开页保持轻量 `muted` 即可，不必上骨架）。 |
| **验收要点** | 无新十六进制色；无第二套圆角/阴影；深浅色切换无「一块亮一区块」；活动模块视觉权重与 `/docs`、`/join` 同级展示站风格一致。 |
| **依赖** | T-FE-1/3 主体完成后做走查修补；可含小范围 `globals.css`。 |
| **预估落点** | `RepairActivityDetail.tsx`、相关 `globals.css` 活动段；**禁止**大改 `MemberShell` / `Header` / 主题注册表。范围若膨胀，砍回「仅活动公开面 + 明显回归」并在 PR 列出来。 |

### T-FE-5 — 深浅色走查 + 单测/静态验收收口

| 项 | 内容 |
| --- | --- |
| **做什么** | 按 §6 清单在 `swiss-cobalt` / `black-yellow` 双主题走查公开列表与详情；跑相关 unit + lint/tsc；把测试验收摘要交给 QA（§7）。 |
| **验收要点** | §6 全勾；排序单测绿；`pnpm` 既有门禁不挂（与活动无关的既有 flake 注明即可）。 |
| **依赖** | T-FE-1～4。 |
| **预估落点** | 测试文件；PR 描述中的走查记录（可附 shots，可选 `tools/` 截图脚本但不强制合入）。 |

---

## 5. 排序方案 B — 纯函数约定

```ts
/** 可放在 repair-activity-validation.ts 或 repair-activity-sort.ts */

export type PublicListSortable = {
  id: string;
  status: RepairActivityStatus; // 已派生
  activityAt: string | Date;    // ISO 或 Date
  createdAt?: string | Date;    // 可选稳定次键
};

function toTime(value: string | Date): number {
  return typeof value === "string" ? new Date(value).getTime() : value.getTime();
}

function tieBreak(a: PublicListSortable, b: PublicListSortable): number {
  const ac = a.createdAt ? toTime(a.createdAt) : 0;
  const bc = b.createdAt ? toTime(b.createdAt) : 0;
  if (ac !== bc) return ac - bc;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * 方案 B（验收写死）：
 * 1) 非 ENDED：activityAt 升序，次键稳定
 * 2) ENDED 整段在后：activityAt 降序，次键稳定
 */
export function sortRepairActivitiesForPublicList<T extends PublicListSortable>(
  items: readonly T[],
): T[] {
  const active: T[] = [];
  const ended: T[] = [];
  for (const item of items) {
    (item.status === "ENDED" ? ended : active).push(item);
  }
  active.sort((a, b) => {
    const d = toTime(a.activityAt) - toTime(b.activityAt);
    return d !== 0 ? d : tieBreak(a, b);
  });
  ended.sort((a, b) => {
    const d = toTime(b.activityAt) - toTime(a.activityAt); // 降序
    return d !== 0 ? d : tieBreak(a, b);
  });
  return [...active, ...ended];
}
```

**单测最小矩阵（建议）：**

1. 仅未结束：升序。  
2. 仅已结束：降序。  
3. 混合：所有非 `ENDED` 在任意 `ENDED` 之前。  
4. 同秒 `activityAt`：次键稳定、不抖动。  
5. 空数组 / 单元素。

**接线：**

```ts
// listPublic 伪代码
const views = rows.map((row) => toPublicView(...));
return sortRepairActivitiesForPublicList(views);
```

---

## 6. 深浅色走查清单要点

在 `ThemeSwitcher` 下分别切 **正常 / 深色**，至少覆盖：

| # | 检查项 |
| --- | --- |
| 1 | 列表卡片 `--surface-1` / `--line` 边框清晰，无「融进背景」 |
| 2 | 标题 `--ink`、meta `--ink-muted`/`--ink-3` 对比度可读 |
| 3 | 五态 badge 在深色下 wash/line/deep 仍可辨（尤其 `OPEN` 绿与 `FULL` 警告） |
| 4 | `.activity-card--ended` opacity 在深色不过度发灰到不可读 |
| 5 | 横滑轨道：滚动条/遮罩若有，只用令牌；无写死灰白 |
| 6 | 焦点环 `outline` 用 `--accent`，深浅皆可见 |
| 7 | 详情报名主按钮 `btn--solid`、禁用按钮、错误 `admin-status--error` |
| 8 | 空态 / 加载 `muted`、错误 alert |
| 9 | 已结束直链 `missing` Card +「返回活动列表」 |
| 10 | 窄屏竖列无横向误裁切；宽屏横滑不撑破 `.rail` 布局 |

禁止：组件内 `if (theme === "dark")` 分支上色；只允许语义令牌。

---

## 7. 给测试的验收清单摘要

### 7.1 公开列表 `/repair-activities`

- [ ] 宽屏：卡片横向排列且可拖/滑浏览（箭头有无均可）。
- [ ] 窄屏：竖列，信息不丢。
- [ ] 卡片可见：标题、活动时间、状态、名额（剩余或已报/上限）。
- [ ] 排序 B：造数含「未开始 / 报名中 / 已报满 / 报名截止 / 已结束」；未结束按活动时间从早到晚；已结束全部在后且从晚到早。
- [ ] 已结束卡片不可进入详情；未结束可进。
- [ ] 空列表 / 加载失败文案正常。

### 7.2 详情直链

- [ ] 未结束活动直链可开。
- [ ] 已结束或无效 id：友好结束/不存在态 + 可回列表（**不要求**改文案口径）。

### 7.3 主题

- [ ] 正常模式与深色模式均走查列表 + 详情关键态（见 §6）。

### 7.4 回归（冒烟）

- [ ] 公开导航「维修活动」仍在；报名 / 查号改类型主路径未回归。
- [ ] 成员/管理活动入口未因本 PR 被误删（本轮可不深测成员横滑）。

### 7.5 工程

- [ ] 排序纯函数单测通过；lint / tsc 门禁通过。

---

## 8. 风险与口径备注

1. **#58 已合入**：分支策略以 §2 方案 A 为准；勿再「等 #58」。  
2. **报名时间字段**：产品卡片未列「报名时间」；本方案建议列表移除、详情保留。若产品其实想保留为次要行，实施前口头确认一句即可（**非阻塞**，默认按硬性字段表执行）。  
3. **名额文案「或」**：产品允许两种展示择一或组合；建议未结束「剩余 N」，已结束「已报/上限」，避免双行过载。  
4. **Admin/成员列表排序**：本轮公开验收写死 B；管理端是否跟 B **未指定** → 默认不动，避免干扰运营按时间轴扫表。  
5. **横滑无障碍**：保留 `ul/li`；拖拽勿 `preventDefault` 掉链接激活；已结束保持非链接。  

---

## 9. 建议实施顺序

```text
T-FE-2（排序纯函数+单测） ──┐
T-FE-1（横滑/竖列布局）   ──┼──→ T-FE-3（字段/徽章） → T-FE-4（点状收敛） → T-FE-5（双主题走查收口）
```

同一 PR `feat/ui-polish-r2` → `main` 即可；若 diff 过大，可拆「排序+列表 UI」与「全站点状」两个 PR，但产品硬性（横滑 + 排序 B）必须落在第一个可验收 PR。
