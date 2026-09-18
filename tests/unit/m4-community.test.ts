import assert from "node:assert/strict";
import test from "node:test";

import { ApiErrorCode, AppError } from "../../src/lib/api/errors";
import { createCommentInput, createFavoriteInput, notificationStatusFilter } from "../../src/features/community/community-http";
import { excerptText, memberRef } from "../../src/features/community/community-view";
import { normalizeCommentBody } from "../../src/features/community/comment-service";
import {
  collectMemberNames,
  extractAtTokens,
  resolveMentionedMemberIds,
} from "../../src/features/community/mention";
import {
  COMMENT_BODY_MAX_LENGTH,
  COMMENT_MENTION_LIMIT,
  MEMBER_DASHBOARD_FAVORITE_LIMIT,
  MEMBER_DASHBOARD_NOTIFICATION_LIMIT,
  NotificationStatus,
  NotificationType,
  Permission,
} from "../../src/types/contracts";
import { communityCopy } from "../../src/config/community";
import { memberCopy } from "../../src/config/member";

/**
 * M4 契约与纯逻辑测试（不依赖数据库 / HTTP）。
 *
 * 提及合并、正文校验、错误码、限额与文案边界在这里锁死；
 * 回复拍平、通知已读、收藏恢复与越权在 `tests/integration/m4-community.test.ts`。
 */

test("M4 稳定错误码已进入公共契约且状态码正确", () => {
  for (const code of [
    "COMMENT_NOT_FOUND",
    "COMMENT_FORBIDDEN",
    "COMMENT_PARENT_INVALID",
    "COMMENT_BODY_INVALID",
    "MENTION_LIMIT_EXCEEDED",
    "FAVORITE_NOT_FOUND",
    "NOTIFICATION_NOT_FOUND",
  ] as const) {
    assert.equal(ApiErrorCode.includes(code), true, `错误码 ${code} 未包含在 ApiErrorCode 中`);
  }
  const statusOf = (code: (typeof ApiErrorCode)[number]) => new AppError(code, "test").status;
  assert.equal(statusOf("COMMENT_NOT_FOUND"), 404);
  assert.equal(statusOf("COMMENT_FORBIDDEN"), 403);
  assert.equal(statusOf("COMMENT_PARENT_INVALID"), 400);
  assert.equal(statusOf("COMMENT_BODY_INVALID"), 400);
  assert.equal(statusOf("MENTION_LIMIT_EXCEEDED"), 400);
  assert.equal(statusOf("FAVORITE_NOT_FOUND"), 404);
  assert.equal(statusOf("NOTIFICATION_NOT_FOUND"), 404);
});

test("M4 权限与限额常量已冻结", () => {
  for (const permission of ["comment:create", "comment:read", "comment:delete", "favorite:manage", "notification:read"] as const) {
    assert.equal(Permission.includes(permission), true, `权限 ${permission} 未定义`);
  }
  assert.equal(COMMENT_BODY_MAX_LENGTH, 2000);
  assert.equal(COMMENT_MENTION_LIMIT, 10);
  assert.equal(MEMBER_DASHBOARD_NOTIFICATION_LIMIT, 5);
  assert.equal(MEMBER_DASHBOARD_FAVORITE_LIMIT, 5);
  assert.deepEqual(NotificationType, ["MENTIONED", "REPAIR_COMMENTED", "REPAIR_APPROVED", "REPAIR_REJECTED"]);
  assert.deepEqual(NotificationStatus, ["UNREAD", "READ"]);
});

test("评论正文拒绝空内容、超长与非法控制字符", () => {
  assert.throws(() => normalizeCommentBody("   "), (error) => error instanceof AppError && error.code === "COMMENT_BODY_INVALID");
  assert.throws(
    () => normalizeCommentBody("a".repeat(COMMENT_BODY_MAX_LENGTH + 1)),
    (error) => error instanceof AppError && error.code === "COMMENT_BODY_INVALID",
  );
  assert.throws(
    () => normalizeCommentBody(`含有${String.fromCharCode(0)}控制字符`),
    (error) => error instanceof AppError && error.code === "COMMENT_BODY_INVALID",
  );
  assert.throws(
    () => normalizeCommentBody(`含有${String.fromCharCode(7)}响铃`),
    (error) => error instanceof AppError && error.code === "COMMENT_BODY_INVALID",
  );
  assert.equal(normalizeCommentBody("  正常评论\r\n第二行  "), "正常评论\n第二行");
  assert.equal(normalizeCommentBody("允许\t制表与\n换行"), "允许\t制表与\n换行");
});

test("@ 解析按最长姓名匹配，未知 token 静默跳过", () => {
  const members = [
    { id: "a", names: ["小林", "林晓"] },
    { id: "b", names: ["小林同学"] },
    { id: "c", names: ["张三"] },
  ];
  assert.deepEqual(extractAtTokens("@小林同学，看一下 @张三。 @ghost"), ["小林同学", "张三", "ghost"]);
  assert.deepEqual(
    resolveMentionedMemberIds({
      body: "请 @小林同学 和 @张三 看一下，@ghost 不存在",
      members,
      selfMemberProfileId: "self",
    }).sort(),
    ["b", "c"],
  );
  assert.deepEqual(
    collectMemberNames({ nickname: "  小林  ", realName: "林晓", displayName: "小林" }),
    ["小林", "林晓"],
  );
});

test("提及合并请求 ID 与正文，未知显式 ID 失败，超限拒绝不截断", () => {
  const members = Array.from({ length: 12 }, (_, index) => ({
    id: `m${index}`,
    names: [`成员${index}`],
  }));

  assert.deepEqual(
    resolveMentionedMemberIds({
      body: "你好 @成员1",
      mentionedMemberProfileIds: ["m2", "m1"],
      members,
      selfMemberProfileId: "self",
    }).sort(),
    ["m1", "m2"],
  );

  assert.throws(
    () =>
      resolveMentionedMemberIds({
        body: "无",
        mentionedMemberProfileIds: ["missing"],
        members,
        selfMemberProfileId: "self",
      }),
    (error) => error instanceof AppError && error.code === "VALIDATION_FAILED",
  );

  assert.throws(
    () =>
      resolveMentionedMemberIds({
        body: members.map((member) => `@${member.names[0]}`).join(" "),
        members,
        selfMemberProfileId: "self",
        limit: COMMENT_MENTION_LIMIT,
      }),
    (error) => error instanceof AppError && error.code === "MENTION_LIMIT_EXCEEDED",
  );

  assert.deepEqual(
    resolveMentionedMemberIds({
      body: "自己 @成员0 不应被写入",
      members,
      selfMemberProfileId: "m0",
    }),
    [],
  );
});

test("评论与收藏请求拒绝未知字段", () => {
  assert.throws(
    () => createCommentInput({ body: "合法评论", authorId: "x" }),
    (error) => error instanceof AppError && error.code === "VALIDATION_FAILED",
  );
  assert.throws(
    () => createCommentInput({ body: 12 as unknown as string }),
    (error) => error instanceof AppError && error.code === "COMMENT_BODY_INVALID",
  );
  const created = createCommentInput({
    body: "合法评论",
    parentCommentId: null,
    mentionedMemberProfileIds: ["m1"],
  });
  assert.equal(created.body, "合法评论");
  assert.equal(created.parentCommentId, null);
  assert.deepEqual(created.mentionedMemberProfileIds, ["m1"]);

  assert.throws(
    () => createFavoriteInput({ repairRecordId: "r1", extra: true }),
    (error) => error instanceof AppError && error.code === "VALIDATION_FAILED",
  );
  assert.deepEqual(createFavoriteInput({ repairRecordId: " r1 " }), { repairRecordId: "r1" });
  assert.equal(notificationStatusFilter(new URLSearchParams("status=UNREAD")), "UNREAD");
  assert.throws(
    () => notificationStatusFilter(new URLSearchParams("status=DONE")),
    (error) => error instanceof AppError && error.code === "VALIDATION_FAILED",
  );
});

test("成员展示名与摘要截断按昵称/实名/账号名回退", () => {
  assert.deepEqual(
    memberRef({ id: "m1", nickname: "小林", realName: "林晓", user: { displayName: "账号" } }),
    { id: "m1", name: "小林" },
  );
  assert.equal(memberRef({ id: "m2", nickname: null, realName: "林晓" }).name, "林晓");
  assert.equal(excerptText("短内容"), "短内容");
  assert.equal(excerptText("字".repeat(61)).endsWith("…"), true);
  assert.equal([...excerptText("字".repeat(61))].length, 61);
});

test("M4 文案不伪造排行数据，工作台仍标明排行尚未接入", () => {
  const text = JSON.stringify({ communityCopy, memberCopy });
  assert.match(memberCopy.dashboard.upcomingNote, /后续模块开放/);
  assert.match(memberCopy.common.unsupported, /尚未接入/);
  assert.doesNotMatch(text, /红点|角标|模拟数据/);
});
