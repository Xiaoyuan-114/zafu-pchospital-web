"use client";

import Link from "next/link";

import { FavoriteRow } from "@/components/community/FavoriteList";
import { NotificationRow } from "@/components/community/NotificationInbox";
import { Button } from "@/components/ui/Button";
import { communityCopy } from "@/config/community";
import { memberCopy } from "@/config/member";
import { buildUpcomingEntries } from "@/features/member-dashboard/upcoming-entries";
import type { DeferredModule, MemberFavoriteSummary, MemberNotificationSummary } from "@/types/contracts";

/**
 * MemberUpcoming —— 工作台底部：M4 通知/收藏真实摘要 + M5 排行接入位
 *
 * 通知与收藏来自 dashboard 聚合字段，失败时由外层按 `degraded` 渲染局部错误。
 * 排行仍为 `{ available: false }`，只渲染中性说明，不显示数字或红点。
 *
 * 尚未接入的模块只渲染中性说明：
 * - 不显示任何数字（哪怕是 0）、不显示红点、不显示「查看」按钮；
 * - 明确写出「尚未接入」，避免用户误以为功能已存在只是没数据；
 * - **不把 `module`（M4/M5）渲染给终端用户** —— 那是内部里程碑编号，对用户无意义
 *   （`sr-only` 同样会把文本交给读屏软件，不算例外）。
 *
 * 若某模块的 `available` 未来变为 true，本组件会忽略它 —— 接口形状不同，
 * 那时的渲染需求（真实列表/角标）应由对应模块自行实现，不应在这里猜。
 *
 * 接入位条目的构造与「key 取能力标识」这一不变量见
 * `src/features/member-dashboard/upcoming-entries.ts`。
 */

export type MemberUpcomingProps = {
  notifications: MemberNotificationSummary;
  favorites: MemberFavoriteSummary;
  ranking: DeferredModule;
  degraded: readonly string[];
  onRetry: () => void;
};

export function MemberUpcoming({
  notifications,
  favorites,
  ranking,
  degraded,
  onRetry,
}: MemberUpcomingProps) {
  const copy = memberCopy.dashboard;
  const notice = communityCopy.notifications;
  const fav = communityCopy.favorites;
  const entries = buildUpcomingEntries(ranking);

  return (
    <div className="member-upcoming">
      <div className="community-summary">
        <section className="community-summary__panel" aria-labelledby="member-upcoming-notifications">
          <header className="community-summary__head">
            <h3 className="community-summary__title" id="member-upcoming-notifications">
              {copy.upcomingNotifications}
            </h3>
            {degraded.includes("notifications") ? null : (
              <span className="community-summary__count">
                {notice.unreadCount.replace("{count}", String(notifications.unreadCount))}
              </span>
            )}
          </header>
          {degraded.includes("notifications") ? (
            <SectionError onRetry={onRetry} />
          ) : notifications.latest.length === 0 ? (
            <p className="member-section__note">{notice.empty}</p>
          ) : (
            <ul className="community-list community-list--compact">
              {notifications.latest.map((item) => (
                <li className={`community-list__item${item.status === "UNREAD" ? " is-unread" : ""}`} key={item.id}>
                  <NotificationRow item={item} />
                </li>
              ))}
            </ul>
          )}
          {degraded.includes("notifications") ? null : (
            <p className="member-section__foot">
              <Link href="/member/notifications">{notice.more}</Link>
            </p>
          )}
        </section>

        <section className="community-summary__panel" aria-labelledby="member-upcoming-favorites">
          <header className="community-summary__head">
            <h3 className="community-summary__title" id="member-upcoming-favorites">
              {copy.upcomingFavorites}
            </h3>
            {degraded.includes("favorites") ? null : (
              <span className="community-summary__count">{fav.count.replace("{count}", String(favorites.count))}</span>
            )}
          </header>
          {degraded.includes("favorites") ? (
            <SectionError onRetry={onRetry} />
          ) : favorites.latest.length === 0 ? (
            <p className="member-section__note">{fav.empty}</p>
          ) : (
            <ul className="community-list community-list--compact">
              {favorites.latest.map((item) => (
                <li className="community-list__item" key={item.id}>
                  <FavoriteRow item={item} />
                </li>
              ))}
            </ul>
          )}
          {degraded.includes("favorites") ? null : (
            <p className="member-section__foot">
              <Link href="/member/favorites">{fav.more}</Link>
            </p>
          )}
        </section>
      </div>

      <ul className="member-upcoming__list">
        {entries.map((item) => (
          <li className="member-upcoming__item" key={item.key}>
            <span className="member-upcoming__name">{item.name}</span>
            <span className="member-upcoming__state">{memberCopy.common.unsupported}</span>
          </li>
        ))}
      </ul>
      <p className="member-section__foot">{copy.upcomingNote}</p>
    </div>
  );
}

function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="member-section__error" role="status">
      <p>{memberCopy.common.sectionLoadError}</p>
      <Button onClick={onRetry}>{memberCopy.common.reload}</Button>
    </div>
  );
}
