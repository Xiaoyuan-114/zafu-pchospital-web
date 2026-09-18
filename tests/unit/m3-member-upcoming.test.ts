import assert from "node:assert/strict";
import test from "node:test";

import { buildUpcomingEntries } from "../../src/features/member-dashboard/upcoming-entries";
import { memberCopy } from "../../src/config/member";
import type { DeferredModule } from "../../src/types/contracts";

/**
 * 回归：工作台接入位列表的 key 必须取「能力」标识，不能取 `module` 值。
 *
 * 真实故障（浏览器 Console 报错）：
 *   Encountered two children with the same key, `M4`.
 * 原因：key 取了 `item.module.module`，而当时通知与收藏的 module **都是 `"M4"`**。
 *
 * M4 已把通知与收藏换成真实摘要（两处列表各自用数据行 id 当 key），
 * 接入位因此只剩排行一项；本用例收窄为「key 不得退回 module 值」+「不泄漏里程碑编号」。
 *
 * 注意：断言的是 `buildUpcomingEntries` 这个纯函数，不是组件渲染 ——
 * 本仓库的测试不渲染 JSX（见 `upcoming-entries.ts` 顶部说明）。
 */

const deferredM5: DeferredModule = { available: false, module: "M5" };

test("接入位条目的 key 是能力标识，不是 module 值", () => {
  const entries = buildUpcomingEntries(deferredM5);

  assert.equal(entries.length, 1);

  const keys = entries.map((entry) => entry.key);
  assert.equal(new Set(keys).size, keys.length, `key 出现重复：${JSON.stringify(keys)}`);
  assert.deepEqual(keys, ["ranking"]);

  // 当初产生重复 key 的写法就是把 module 值当 key —— 这里显式禁止退回
  assert.notEqual(keys[0], deferredM5.module);
});

test("M3 接入位条目文案固定，且不泄漏里程碑编号", () => {
  const entries = buildUpcomingEntries(deferredM5);

  assert.deepEqual(entries.map((entry) => entry.name), [memberCopy.dashboard.upcomingRanking]);
  assert.deepEqual(entries.map((entry) => entry.module), [deferredM5]);

  // 面向用户的文案里不得出现 M4/M5 这类内部编号
  for (const entry of entries) {
    assert.doesNotMatch(entry.name, /M[0-9]/);
  }
  assert.doesNotMatch(memberCopy.dashboard.upcomingNote, /M[0-9]/);
});
