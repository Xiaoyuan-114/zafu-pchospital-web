/**
 * M5 个人正式统计 Service（任务书 §9.1）。
 *
 * 只接受由 Session 推导出的本人身份，**不接受客户端传入 `memberProfileId`** ——
 * 否则就能通过改参数遍历他人统计（任务书 §11）。
 */

import { requirePermission } from "@/lib/auth/permissions";
import { memberProfileRepository } from "@/features/member-profile/member-profile-repository";
import { recentShanghaiMonths, shanghaiDateToUtc } from "@/lib/academic-term";
import { resolveMemberRanges } from "@/features/member-dashboard/member-overview-provider";
import {
  ANALYTICS_TREND_MONTHS,
  type MemberAnalytics,
  type MemberAnalyticsServiceContract,
} from "@/types/contracts";
import {
  aggregateCategoryDistribution,
  aggregateMonthlyTrend,
  getMemberSummary,
} from "./analytics-repository";
import { buildMonthlyTrend, toCategoryDistribution } from "./analytics-view";

export const analyticsService: MemberAnalyticsServiceContract = {
  async getMemberAnalytics(actor): Promise<MemberAnalytics> {
    requirePermission(actor, "analytics:read_internal");
    const self = await memberProfileRepository.activeForUser(actor.userId);

    const now = new Date();
    // 与工作台/个人主页共用同一套日期口径；学期配置非法时由它按 M3 规则抛出。
    const { monthRange, termRange } = resolveMemberRanges(now);

    const months = recentShanghaiMonths(now, ANALYTICS_TREND_MONTHS);
    const trendStart = shanghaiDateToUtc(`${months[0]}-01`);
    if (!trendStart) throw new Error("趋势窗口起点异常");

    const [summary, categoryRows, trendRows] = await Promise.all([
      getMemberSummary(self.id, { monthRange, termRange }),
      // 分类分布不附加日期条件：它描述的是「该成员的累计构成」。
      aggregateCategoryDistribution(self.id, null),
      aggregateMonthlyTrend(self.id, {
        startInclusive: trendStart,
        endExclusive: monthRange.endExclusive,
      }),
    ]);

    return {
      summary,
      categoryDistribution: toCategoryDistribution(categoryRows),
      monthlyTrend: buildMonthlyTrend(months, trendRows),
      generatedAt: summary.generatedAt,
    };
  },
};
