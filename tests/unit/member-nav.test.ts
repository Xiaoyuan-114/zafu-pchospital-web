import assert from "node:assert/strict";
import test from "node:test";

import { communityCopy } from "../../src/config/community";
import { formatNavUnreadBadge, memberNav } from "../../src/config/member";

/**
 * MemberNav 未读角标（T-P2-2）的纯逻辑契约。
 *
 * 组件本身依赖 `next/navigation`，这里只锁：
 * - 侧栏配置含「消息通知」入口；
 * - 角标展示规则（隐藏 / 数字 / 99+）；
 * - 读屏文案模板仍走 communityCopy，不另造一套。
 */

test("memberNav 含消息通知入口且指向 /member/notifications", () => {
  const items = memberNav.flatMap((group) => group.items);
  const notice = items.find((item) => item.href === "/member/notifications");
  assert.ok(notice, "侧栏应有消息通知入口");
  assert.equal(notice.label, "消息通知");
});

test("formatNavUnreadBadge：零与未知不展示", () => {
  assert.equal(formatNavUnreadBadge(null), null);
  assert.equal(formatNavUnreadBadge(undefined), null);
  assert.equal(formatNavUnreadBadge(0), null);
  assert.equal(formatNavUnreadBadge(-1), null);
  assert.equal(formatNavUnreadBadge(Number.NaN), null);
  assert.equal(formatNavUnreadBadge(Number.POSITIVE_INFINITY), null);
});

test("formatNavUnreadBadge：正数展示，≥100 封顶 99+", () => {
  assert.equal(formatNavUnreadBadge(1), "1");
  assert.equal(formatNavUnreadBadge(99), "99");
  assert.equal(formatNavUnreadBadge(100), "99+");
  assert.equal(formatNavUnreadBadge(150), "99+");
  assert.equal(formatNavUnreadBadge(1.9), "1");
});

test("未读角标读屏文案复用 communityCopy.notifications.unreadCount", () => {
  assert.match(communityCopy.notifications.unreadCount, /\{count\}/);
  assert.equal(
    communityCopy.notifications.unreadCount.replace("{count}", "3"),
    "未读 3 条",
  );
});
