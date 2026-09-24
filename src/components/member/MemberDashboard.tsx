"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MemberAvatar } from "@/components/member/MemberAvatar";
import { MemberMetrics } from "@/components/member/MemberMetrics";
import { MemberRankingPreviewView } from "@/components/member/MemberRankingPreview";
import { MemberRecentRepairs } from "@/components/member/MemberRecentRepairs";
import { MemberSection } from "@/components/member/MemberSection";
import { MemberSkillList } from "@/components/member/MemberSkillList";
import { MemberUpcoming } from "@/components/member/MemberUpcoming";
import { MemberWorkQueueView } from "@/components/member/MemberWorkQueue";
import { MemberSkeleton } from "@/components/member/MemberSkeleton";
import { memberCopy, formatShanghaiDate } from "@/config/member";
import { roleLabels } from "@/components/member/MemberIdentityFields";
import type { MemberDashboard as MemberDashboardData } from "@/types/contracts";

/**
 * MemberDashboard —— 成员工作台主视图（客户端）
 *
 * 数据来自 `GET /api/v1/member/dashboard`（单一聚合请求，避免多接口串联导致的白屏）。
 *
 * 布局（T-P0-5）：hero 唯一 solid「新增维修记录」；宽屏主栏队列→最近已通过，
 * 辅栏指标 / 可折叠技能 / 排行 / Upcoming。账号菜单只挂侧栏足部，不在 hero 重复。
 *
 * 降级策略（任务书 §12.1）：**指标加载用稳定骨架，失败时局部错误**。
 * 因此这里把「加载中 / 失败」限制在内容区，欢迎区（来自服务端已知的会话信息）
 * 始终可用，不会因为一次请求失败就整页白屏。
 *
 * 加载骨架（T-P2-5）复用 `member-workspace__content` / `__main` / `__aside`，
 * 与 ready 双列几何对齐，降低 ≥1100px 下的 CLS。
 */

export type MemberDashboardProps = {
  /** 服务端已认证的展示名，用于首屏立即渲染欢迎区（避免首屏空壳） */
  initialDisplayName: string;
  roles: readonly string[];
};

export function MemberDashboard({ initialDisplayName, roles }: MemberDashboardProps) {
  const copy = memberCopy.dashboard;
  const [data, setData] = useState<MemberDashboardData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/v1/member/dashboard", { cache: "no-store" });
      const json = await response.json();
      if (!json.success) throw new Error(json?.error?.code ?? "DASHBOARD_FAILED");
      setData(json.data as MemberDashboardData);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const profile = data?.profile ?? null;
  const displayName = profile?.displayName ?? initialDisplayName;
  const joinedAt = profile ? formatShanghaiDate(profile.joinedAt) : null;
  const roleText = roleLabels(profile?.roles ?? roles);

  return (
    <>
      <header className="member-hero">
        <div className="member-hero__identity">
          <MemberAvatar displayName={displayName} avatarUrl={profile?.avatarUrl} />
          <div className="member-hero__text">
            <h1 className="member-hero__name" id="member-title">
              {displayName}
            </h1>
            <p className="member-hero__meta">
              <span>
                {copy.welcome}
                {roleText ? ` · ${roleText}` : ""}
              </span>
              {joinedAt ? (
                <span>
                  {copy.joinedAtLabel} <span className="member-hero__meta-num">{joinedAt}</span>
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="member-hero__actions">
          <Button href="/member/repairs/new" variant="solid">
            {copy.quickNew}
          </Button>
          <Button href="/member/profile">{copy.settingsAction}</Button>
        </div>
      </header>

      {state === "error" ? (
        <Card variant="notice">
          <p>{memberCopy.common.loadError}</p>
          <Button onClick={() => void load()}>{memberCopy.common.reload}</Button>
        </Card>
      ) : null}

      {state === "loading" ? <MemberSkeleton /> : null}

      {state === "ready" && data ? (
        <div className="member-workspace__content">
          <div className="member-workspace__main">
            <section aria-labelledby="member-queue-title">
              <MemberSection id="member-queue-title" title={copy.queueTitle} tag={copy.queueTag}>
                {data.degraded.includes("workQueue") ? (
                  <SectionError onRetry={() => void load()} />
                ) : (
                  <MemberWorkQueueView queue={data.workQueue} />
                )}
              </MemberSection>
            </section>

            <section aria-labelledby="member-recent-title">
              <MemberSection id="member-recent-title" title={copy.recentTitle} tag={copy.recentTag}>
                {data.degraded.includes("recentRepairs") ? (
                  <SectionError onRetry={() => void load()} />
                ) : (
                  <MemberRecentRepairs
                    items={data.recentRepairs}
                    moreHref="/member/repairs"
                    moreLabel={copy.recentMore}
                  />
                )}
              </MemberSection>
            </section>
          </div>

          <aside className="member-workspace__aside">
            <section aria-labelledby="member-metrics-title">
              <MemberSection
                id="member-metrics-title"
                title={copy.metricsTitle}
                tag={copy.metricsTag}
                foot={copy.metricsFootnote}
              >
                {/* 局部降级：只让失败区块显示错误态，其余区块照常展示真实数据。 */}
                {data.degraded.includes("repairSummary") ? (
                  <SectionError onRetry={() => void load()} />
                ) : (
                  <MemberMetrics summary={data.repairSummary} />
                )}
              </MemberSection>
            </section>

            <section aria-labelledby="member-skills-title">
              <details className="member-skills-fold">
                <summary className="member-skills-fold__summary">
                  <span className="member-skills-fold__title" id="member-skills-title">
                    {copy.skillsLabel}
                  </span>
                  <span className="member-section__tag">{copy.skillsTag}</span>
                </summary>
                <div className="member-skills-fold__body">
                  <MemberSkillList skills={data.profile.skills} />
                  <Button href="/member/profile" variant="ghost">
                    {copy.skillsEditLink}
                  </Button>
                </div>
              </details>
            </section>

            <section aria-labelledby="member-ranking-title">
              <MemberSection id="member-ranking-title" title={copy.rankingTitle} tag={copy.rankingTag}>
                {/* 排行区块失败只影响本区块：其余区块照常展示真实数据 */}
                {data.degraded.includes("ranking") ? (
                  <SectionError onRetry={() => void load()} />
                ) : (
                  <MemberRankingPreviewView preview={data.ranking} />
                )}
              </MemberSection>
            </section>

            <section aria-labelledby="member-upcoming-title">
              <MemberSection
                id="member-upcoming-title"
                title={copy.upcomingTitle}
                tag={copy.upcomingTag}
              >
                <MemberUpcoming
                  notifications={data.notifications}
                  favorites={data.favorites}
                  onRetry={() => void load()}
                />
              </MemberSection>
            </section>
          </aside>
        </div>
      ) : null}
    </>
  );
}

/**
 * 局部错误占位：仅在**单个区块**加载失败时替换该区块内容。
 * 不整页跳错误页，也不把失败渲染成「暂时没有数据」（两者语义不同）。
 */
function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="member-section__error" role="status">
      <p>{memberCopy.common.sectionLoadError}</p>
      <Button onClick={onRetry}>{memberCopy.common.reload}</Button>
    </div>
  );
}
