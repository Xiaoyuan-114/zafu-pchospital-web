import { memberCopy } from "@/config/member";

/**
 * 工作台「尚未接入」的接入位条目（当前只有 M5 维修排行）。
 *
 * 从 `MemberUpcoming` 组件里抽出来，有两条理由：
 *
 * 1. **可测**：本仓库的测试用 `tsx --test` 跑（编译器按经典 JSX 运行时输出），
 *    一旦 import `MemberUpcoming.tsx`，就会顺着 `Button` → `Icon` 把**模块顶层**的
 *    JSX 求值，直接报 `React is not defined`。纯逻辑放在与 JSX 无关的模块里才能被断言。
 * 2. **锁住不变量**：真实故障（浏览器 Console）——
 *    `Encountered two children with the same key, M4`。
 *    原因：key 取了 `item.module.module`，而通知与收藏的 `module` **都是 `"M4"`**。
 *    规则：**key 取能力标识，不能取 `module`**。
 *
 * ## 为什么不接收 `ranking` 参数
 *
 * 早先这里收 `ranking: DeferredModule` 并把它存进条目的 `module` 字段，组件再拿它渲染，
 * 形成「传了就必须用掉」的假依赖。但：
 *
 * - **`module`（M4/M5）是内部里程碑编号，不属于用户可见文案**；
 *   用 `sr-only` 藏起来同样会被读屏软件念出来，不算「没渲染」。
 * - 该字段**没有任何真实消费方** —— 传参只是为了「用掉 prop」。
 *
 * 所以这里不再收 `ranking`；条目的名字来自 `src/config/member.ts`，
 * 是否展示某模块由「有没有这条接入位」决定。工作台接口里的 `ranking` 字段
 * 属于**接口契约**（M3 冻结，由集成测试断言），保留不动，只是不再穿进渲染层。
 */

export type UpcomingEntry = {
  /**
   * React key。**必须取「能力」标识，不能取 `module`** ——
   * 通知与收藏的 `module` 都曾是 `"M4"`，用它当 key 会产生重复 key，
   * React 报错并可能重复/漏渲染子节点。
   */
  key: "ranking";
  name: string;
};

/**
 * 构造尚未接入的接入位条目。
 *
 * 组件本身的渲染在本仓库无法用 `node:test` 覆盖（测试不渲染 JSX），
 * 因此把这条不变量落在纯函数上，让它「可以被直接断言」。
 */
export function buildUpcomingEntries(): UpcomingEntry[] {
  return [{ key: "ranking", name: memberCopy.dashboard.upcomingRanking }];
}
