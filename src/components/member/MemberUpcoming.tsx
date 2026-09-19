"use client";

import Link from "next/link";

import { FavoriteRow } from "@/components/community/FavoriteList";
import { NotificationRow } from "@/components/community/NotificationInbox";
import { Button } from "@/components/ui/Button";
import { communityCopy } from "@/config/community";
import { memberCopy } from "@/config/member";
import { buildUpcomingEntries } from "@/features/member-dashboard/upcoming-entries";
import type { MemberFavoriteSummary, MemberNotificationSummary } from "@/types/contracts";

/**
 * MemberUpcoming —— 工作台底部：M4 通知/收藏真实摘要 + M5 排行接入位
 *
 * 通知与收藏来自 dashboard 聚合字段。**是否失败由摘要自己的 `available` 决定**：
 * 聚合查询挂掉时服务端返回 `available: false` + 计数 `null`（不是 0），
 * 于是「查不出来」与「真的没有未读」在渲染层也不会被混为一谈 ——
 * 这里据 `available` 渲染局部错误态，而不是把失败画成「暂无通知」。
 *
 * 尚未接入的模块只渲染中性说明：
 * - 不显示任何数字（哪怕是 0）、不显示红点、不显示「查看」按钮；
 * - 明确写出「尚未接入」，避免用户误以为功能已存在只是没数据；
 * - **不把 `module`（M4/M5）渲染给终端用户** —— 那是内部里程碑编号，对用户无意义
 *   （`sr-only` 同样会把文本交给读屏软件，不算例外）。
 *
 * 因此本组件**不接收 `ranking`**：它此前只被塞进一个从不展示的字段，属于「为了用掉 prop」。
 * 工作台接口里的 `ranking` 字段是 M3 冻结的契约字段，保留在返回体里，只是不穿到渲染层。
 * 同理，`degraded` 也不再传进来 —— 通知/收藏的失败状态现在由摘要自身表达，
 * 留两处判断会变成双重事实来源。
 *
 * 若某模块的 `available` 未来变为 true，本组件会忽略它 —— 接口形状不同，
 * 那时的渲染需求（真实列表/角标）应由对应模块自行实现，不应在这里猜。
 *
 * 接入位条目的构造与「key 取能力标识」这一不变量见
 * `src/features/member-dashboard/upcoming-entries.ts`；
 * 失败语义的纯逻辑与单测见 `src/features/member-dashboard/community-summary.ts`。
 */

export type MemberUpcomingProps = {
  notifications: MemberNotificationSummary;
  favorites: MemberFavoriteSummary;
  onRetry: () => void;
};

export function MemberUpcoming({ notifications, favorites, onRetry }: MemberUpcomingProps) {
  const copy = memberCopy.dashboard;
  const notice = communityCopy.notifications;
  const fav = communityCopy.favorites;
  const entries = buildUpcomingEntries();

  return (
    <div className="member-upcoming">
      <div className="community-summary">
        <section className="community-summary__panel" aria-labelledby="member-upcoming-notifications">
          <header className="community-summary__head">
            <h3 className="community-summary__title" id="member-upcoming-notifications">
              {copy.upcomingNotifications}
            </h3>
            {notifications.available ? (
              <span className="community-summary__count">
                {notice.unreadCount.replace("{count}", String(notifications.unreadCount))}
              </span>
            ) : null}
          </header>
          {notifications.available ? (
            notifications.latest.length === 0 ? (
              <p className="member-section__note">{notice.empty}</p>
            ) : (
              <ul className="community-list community-list--compact">
                {notifications.latest.map((item) => (
                  <li className={`community-list__item${item.status === "UNREAD" ? " is-unread" : ""}`} key={item.id}>
                    <NotificationRow item={item} />
                  </li>
                ))}
              </ul>
            )
          ) : (
            <SectionError onRetry={onRetry} />
          )}
          {notifications.available ? (
            <p className="member-section__foot">
              <Link href="/member/notifications">{notice.more}</Link>
            </p>
          ) : null}
        </section>

        <section className="community-summary__panel" aria-labelledby="member-upcoming-favorites">
          <header className="community-summary__head">
            <h3 className="community-summary__title" id="member-upcoming-favorites">
              {copy.upcomingFavorites}
            </h3>
            {favorites.available ? (
              <span className="community-summary__count">{fav.count.replace("{count}", String(favorites.count))}</span>
            ) : null}
          </header>
          {favorites.available ? (
            favorites.latest.length === 0 ? (
              <p className="member-section__note">{fav.empty}</p>
            ) : (
              <ul className="community-list community-list--compact">
                {favorites.latest.map((item) => (
                  <li className="community-list__item" key={item.id}>
                    <FavoriteRow item={item} />
                  </li>
                ))}
              </ul>
            )
          ) : (
            <SectionError onRetry={onRetry} />
          )}
          {favorites.available ? (
            <p className="member-section__foot">
              <Link href="/member/favorites">{fav.more}</Link>
            </p>
          ) : null}
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
