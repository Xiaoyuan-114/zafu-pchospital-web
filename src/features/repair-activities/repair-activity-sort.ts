import type { RepairActivityStatus } from "@/features/repair-activities/repair-activity-validation";

/** 公开列表排序所需最小字段（status 须已派生）。 */
export type PublicListSortable = {
  id: string;
  status: RepairActivityStatus;
  activityAt: string | Date;
  createdAt?: string | Date;
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
 * 1) 非 ENDED：activityAt 升序，次键稳定（createdAt asc → id）
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
    const d = toTime(b.activityAt) - toTime(a.activityAt);
    return d !== 0 ? d : tieBreak(a, b);
  });
  return [...active, ...ended];
}

/**
 * 首页近场活动（UX R3 / R7）：方案 B 排序后取前 `limit` 条未结束活动。
 * 已结束不进入预览；调用方可先拿 listPublic 结果再喂入本函数。
 */
export function pickNonEndedRepairActivitiesForHomePreview<T extends PublicListSortable>(
  items: readonly T[],
  limit = 3,
): T[] {
  const n = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 3;
  return sortRepairActivitiesForPublicList(items)
    .filter((item) => item.status !== "ENDED")
    .slice(0, n);
}

