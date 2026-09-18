import { memberCopy } from "@/config/member";
import type { DeferredModule } from "@/types/contracts";

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
 *    M4 已把这两项换成真实摘要，接入位只剩排行一项，但规则不变：**key 取能力标识**。
 */

export type UpcomingEntry = {
  /**
   * React key。**必须取「能力」标识，不能取 `module`** ——
   * 通知与收藏的 `module` 都曾是 `"M4"`，用它当 key 会产生重复 key，
   * React 报错并可能重复/漏渲染子节点。
   */
  key: "ranking";
  /** 对应的契约字段值，保留以便未来按模块区分渲染。 */
  module: DeferredModule;
  name: string;
};

/**
 * 构造尚未接入的接入位条目。
 *
 * 组件本身的渲染在本仓库无法用 `node:test` 覆盖（测试不渲染 JSX），
 * 因此把这条不变量落在纯函数上，让它「可以被直接断言」。
 */
export function buildUpcomingEntries(ranking: DeferredModule): UpcomingEntry[] {
  return [{ key: "ranking", module: ranking, name: memberCopy.dashboard.upcomingRanking }];
}
