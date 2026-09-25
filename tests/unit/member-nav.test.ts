import assert from "node:assert/strict";
import test from "node:test";

import { communityCopy } from "../../src/config/community";
import {
  MEMBER_NOTIFICATIONS_CHANGED_EVENT,
  memberCopy,
  memberNav,
  memberSettingsNav,
} from "../../src/config/member";

/**
 * 成员端侧栏与足部「设置」菜单的配置契约。
 *
 * 组件本身依赖 `next/navigation`，这里只锁配置层：
 * - 侧栏常驻分组含工作台 / 维修记录 / 维修活动 / 个人资料，不含消息通知 / 我的收藏 / 排行榜；
 * - 这三个入口收在 `memberSettingsNav`，编号按实际导航顺序为 10–12（UX R3 M-B）
 *   （页面标题里的编号与菜单里的一致）；
 * - 入口位置变了，页面与接口不变，所以三个 href 必须仍然可达；
 * - 撤掉未读角标后，`communityCopy.notifications.unreadCount` 仍归页面与工作台摘要使用，
 *   模板不能被顺手删掉。
 */

const SETTINGS_HREFS = ["/member/notifications", "/member/favorites", "/member/rankings"];

test("侧栏常驻分组含工作台 / 维修记录 / 维修活动 / 个人资料", () => {
  const resident = memberNav.flatMap((group) => group.items);
  assert.deepEqual(
    resident.map((item) => item.href),
    ["/member", "/member/repair-activities", "/member/repairs", "/member/profile"],
  );
  for (const href of SETTINGS_HREFS) {
    assert.equal(
      resident.some((item) => item.href === href),
      false,
      `${href} 不该再占侧栏位`,
    );
  }
});

test("memberSettingsNav 收住三个入口且编号按顺序为 10–12（M-B）", () => {
  assert.deepEqual(
    memberSettingsNav.map((item) => item.href),
    SETTINGS_HREFS,
  );
  assert.deepEqual(
    memberSettingsNav.map((item) => item.label),
    ["消息通知", "我的收藏", "排行榜"],
  );
  assert.deepEqual(
    memberSettingsNav.map((item) => item.index),
    ["10", "11", "12"],
  );
});

test("成员常驻导航编号为 06–09（公开 01–05 后整段 +1）", () => {
  assert.deepEqual(
    memberNav.flatMap((group) => group.items).map((item) => item.index),
    ["06", "07", "08", "09"],
  );
});

test("设置菜单条目与侧栏条目编号不重复，且每条都能渲染出编号 + 名称", () => {
  const indexes = [...memberNav.flatMap((group) => group.items), ...memberSettingsNav].map(
    (item) => item.index,
  );
  assert.equal(new Set(indexes).size, indexes.length, "成员端入口编号重复");
  for (const item of memberSettingsNav) {
    assert.ok(item.index.length > 0 && item.label.length > 0, `${item.href} 缺编号或名称`);
  }
});

test("设置菜单按钮文案来自 memberCopy.shell，不写在组件里", () => {
  assert.equal(memberCopy.shell.settingsLabel, "设置");
  assert.ok(memberCopy.shell.settingsMenuLabel.length > 0);
});

test("未读条数仍由 communityCopy.notifications.unreadCount 提供（页面与工作台摘要共用）", () => {
  assert.match(communityCopy.notifications.unreadCount, /\{count\}/);
  assert.equal(communityCopy.notifications.unreadCount.replace("{count}", "3"), "未读 3 条");
  assert.equal(communityCopy.notifications.unreadCount.replace("{count}", "150"), "未读 150 条");
});

test("标记已读后刷新事件名为 member:notifications-changed", () => {
  assert.equal(MEMBER_NOTIFICATIONS_CHANGED_EVENT, "member:notifications-changed");
});
