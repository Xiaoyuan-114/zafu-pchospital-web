import { AppError } from "@/lib/api/errors";

/** 对外五态。优先级：ENDED > CLOSED > FULL/OPEN > UPCOMING。 */
export const RepairActivityStatus = [
  "UPCOMING",
  "OPEN",
  "FULL",
  "CLOSED",
  "ENDED",
] as const;
export type RepairActivityStatus = (typeof RepairActivityStatus)[number];

export const RepairActivityIssueType = ["CLEAN_PASTE", "CLEAN_ONLY", "OTHER"] as const;
export type RepairActivityIssueType = (typeof RepairActivityIssueType)[number];

export const RepairActivityRegistrationStatus = ["REGISTERED", "CHECKED_IN", "SERVED"] as const;
export type RepairActivityRegistrationStatus =
  (typeof RepairActivityRegistrationStatus)[number];

/** 占用名额的有效报名状态（撤回排队不减名额；仅软删释放）。 */
export const EFFECTIVE_REGISTRATION_STATUSES: readonly RepairActivityRegistrationStatus[] = [
  "REGISTERED",
  "CHECKED_IN",
  "SERVED",
];

export const repairActivityStatusLabels: Record<RepairActivityStatus, string> = {
  UPCOMING: "未开始",
  OPEN: "报名中",
  FULL: "已报满",
  CLOSED: "报名截止",
  ENDED: "已结束",
};

export const repairActivityIssueTypeLabels: Record<RepairActivityIssueType, string> = {
  CLEAN_PASTE: "清灰换硅脂",
  CLEAN_ONLY: "清灰",
  OTHER: "其他故障",
};

export type ActivityTimeFields = {
  activityAt: Date;
  signupOpensAt: Date;
  signupClosesAt: Date;
};

/**
 * 写入时强制的时间规则：
 * 1. signupOpensAt < signupClosesAt
 * 2. signupClosesAt <= activityAt
 */
export function assertActivityTimeRules(fields: ActivityTimeFields): void {
  const { activityAt, signupOpensAt, signupClosesAt } = fields;
  if (
    Number.isNaN(activityAt.getTime()) ||
    Number.isNaN(signupOpensAt.getTime()) ||
    Number.isNaN(signupClosesAt.getTime())
  ) {
    throw new AppError("VALIDATION_FAILED", "活动时间无效");
  }
  if (!(signupOpensAt.getTime() < signupClosesAt.getTime())) {
    throw new AppError("VALIDATION_FAILED", "报名开始时间必须早于报名截止时间", {
      fieldErrors: {
        signupOpensAt: ["报名开始必须早于截止"],
        signupClosesAt: ["报名截止必须晚于开始"],
      },
    });
  }
  if (!(signupClosesAt.getTime() <= activityAt.getTime())) {
    throw new AppError("VALIDATION_FAILED", "报名截止时间不得晚于活动开始时间", {
      fieldErrors: {
        signupClosesAt: ["报名截止不得晚于活动开始"],
        activityAt: ["活动开始不得早于报名截止"],
      },
    });
  }
}

export type DeriveStatusInput = {
  now: Date;
  activityAt: Date;
  signupOpensAt: Date;
  signupClosesAt: Date;
  /** 有效报名数（deletedAt IS NULL 且 status ∈ REGISTERED|CHECKED_IN|SERVED）。 */
  effectiveRegistrationCount: number;
  capacity: number;
};

/**
 * 派生状态（不落库）。优先级从上到下：
 * ENDED → CLOSED → FULL → OPEN → UPCOMING
 */
export function deriveRepairActivityStatus(input: DeriveStatusInput): RepairActivityStatus {
  const now = input.now.getTime();
  if (now >= input.activityAt.getTime()) return "ENDED";
  if (now >= input.signupClosesAt.getTime()) return "CLOSED";
  if (now < input.signupOpensAt.getTime()) return "UPCOMING";
  // 报名窗口内
  if (input.effectiveRegistrationCount >= input.capacity) return "FULL";
  return "OPEN";
}

/** 仅 OPEN 可新报；UPCOMING / CLOSED / FULL / ENDED 均不可。 */
export function canAcceptNewRegistration(status: RepairActivityStatus): boolean {
  return status === "OPEN";
}

/**
 * 公开改类型：仅 REGISTERED 且活动未 ENDED。
 * 报名截止后、活动开始前仍可改。
 */
export function canEditIssueType(params: {
  registrationStatus: string;
  activityStatus: RepairActivityStatus;
}): boolean {
  return params.registrationStatus === "REGISTERED" && params.activityStatus !== "ENDED";
}

export function assertValidCapacity(capacity: number): void {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10_000) {
    throw new AppError("VALIDATION_FAILED", "人数上限须为 1–10000 的整数", {
      fieldErrors: { capacity: ["请输入 1–10000 的整数"] },
    });
  }
}

export function assertValidTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length < 2 || trimmed.length > 120) {
    throw new AppError("VALIDATION_FAILED", "活动标题须为 2–120 个字符", {
      fieldErrors: { title: ["请输入 2–120 个字符"] },
    });
  }
  return trimmed;
}

export function assertValidRegistrantName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 40) {
    throw new AppError("VALIDATION_FAILED", "姓名须为 2–40 个字符", {
      fieldErrors: { name: ["请输入 2–40 个字符"] },
    });
  }
  return trimmed;
}

export function assertValidIssueType(value: unknown): RepairActivityIssueType {
  if (typeof value !== "string" || !(RepairActivityIssueType as readonly string[]).includes(value)) {
    throw new AppError("VALIDATION_FAILED", "故障类型无效", {
      fieldErrors: { issueType: ["请选择有效的故障类型"] },
    });
  }
  return value as RepairActivityIssueType;
}

export function remainingCapacity(capacity: number, effectiveCount: number): number {
  return Math.max(0, capacity - effectiveCount);
}
