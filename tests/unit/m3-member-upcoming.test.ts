import assert from "node:assert/strict";
import test from "node:test";

import { buildUpcomingEntries } from "../../src/features/member-dashboard/upcoming-entries";
import { memberCopy } from "../../src/config/member";

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
 * 另有一条不变量：**条目里不允许再出现 `module` 字段**。
 * 它此前只是为了「用掉」组件收到的 `ranking` prop —— 既没有任何消费方，
 * 又是被 `sr-only` 藏起来照样会被读屏软件念出的内部编号。锁住形状，避免回潮。
 *
 * 注意：断言的是 `buildUpcomingEntries` 这个纯函数，不是组件渲染 ——
 * 本仓库的测试不渲染 JSX（见 `upcoming-entries.ts` 顶部说明）。
 */

test("接入位条目的 key 是能力标识，不是 module 值", () => {
  const entries = buildUpcomingEntries();

  assert.equal(entries.length, 1);

  const keys = entries.map((entry) => entry.key);
  assert.equal(new Set(keys).size, keys.length, `key 出现重复：${JSON.stringify(keys)}`);
  assert.deepEqual(keys, ["ranking"]);

  // 当初产生重复 key 的写法就是把 module 值当 key —— 这里显式禁止退回
  assert.notEqual(keys[0], "M5");
  assert.notEqual(keys[0], "M4");
});

test("M3 接入位条目文案固定，不泄漏里程碑编号，且不再携带 module 字段", () => {
  const entries = buildUpcomingEntries();

  assert.deepEqual(entries.map((entry) => entry.name), [memberCopy.dashboard.upcomingRanking]);

  // 面向用户的文案里不得出现 M4/M5 这类内部编号
  for (const entry of entries) {
    assert.doesNotMatch(entry.name, /M[0-9]/);
  }
  assert.doesNotMatch(memberCopy.dashboard.upcomingNote, /M[0-9]/);

  // 接口契约里的 `ranking` 仍存在（由集成测试断言），但它不再进入渲染层：
  // 条目形状只有 key + name，重新加回 module 会让本用例失败。
  for (const entry of entries) {
    assert.deepEqual(Object.keys(entry).sort(), ["key", "name"]);
    assert.equal("module" in entry, false);
  }
});
