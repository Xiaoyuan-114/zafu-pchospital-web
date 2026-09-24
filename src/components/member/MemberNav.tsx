"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AccountMenu } from "@/components/layout/AccountMenu";
import { communityCopy } from "@/config/community";
import { formatNavUnreadBadge, memberCopy, memberNav } from "@/config/member";

/**
 * 成员端二级导航（T-P0-3 / T-P2-2）
 *
 * 行为对齐 `AdminNav`：
 * - `usePathname()` + `aria-current="page"`；
 * - 渲染在 `src/app/member/layout.tsx`，客户端切页侧栏不重建；
 * - prefetch 仅 hover / focus，挂载不预取（避免并发拉子页 + `.reveal` hydration 警告）。
 *
 * `/member` 精确匹配；其余项用 `href` 前缀匹配（如 `/member/repairs/new` 高亮「维修记录」）。
 * 账号区挂同一 `AccountMenu`（variant=`nav`），子页也能 ≤2 次点击退出。
 *
 * 未读角标（T-P2-2）：从已有 `GET /api/v1/member/notifications` 的 `unreadCount`
 * 取值（与工作台 dashboard 摘要同源字段，不新增接口）。≤0 / 失败不展示；
 * 读屏用完整「未读 N 条」，可视数字封顶 `99+`。
 */
export type MemberNavProps = {
  /** 服务端已认证的展示名，交给账号菜单做首屏乐观渲染 */
  displayName?: string | null;
};

const NOTIFICATIONS_HREF = "/member/notifications";

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/member") return pathname === "/member";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MemberNav({ displayName = null }: MemberNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const shell = memberCopy.shell;
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const loadUnread = useCallback(async (signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "1" });
      const response = await fetch(`/api/v1/member/notifications?${params}`, {
        cache: "no-store",
        signal,
      });
      const json = (await response.json()) as {
        success?: boolean;
        data?: { unreadCount?: number };
      };
      if (!json.success || typeof json.data?.unreadCount !== "number") {
        setUnreadCount(null);
        return;
      }
      setUnreadCount(json.data.unreadCount);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      // 与 AccountMenu 一致：失败静默，不把「查不出来」画成 0。
      setUnreadCount(null);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadUnread(controller.signal);
    return () => controller.abort();
  }, [loadUnread, pathname]);

  useEffect(() => {
    const onFocus = () => {
      void loadUnread();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadUnread]);

  const badgeText = formatNavUnreadBadge(unreadCount);
  const badgeAria =
    unreadCount != null && unreadCount > 0
      ? communityCopy.notifications.unreadCount.replace("{count}", String(unreadCount))
      : null;

  return (
    <nav className="member-nav" aria-label={shell.navLabel}>
      <p className="member-nav__brand">
        <span className="member-nav__brand-en">{shell.titleEn}</span>
        <span className="member-nav__brand-cn">{shell.title}</span>
      </p>

      <div className="member-nav__groups">
        {memberNav.map((group) => (
          <div key={group.id} className="member-nav__group">
            <p className="member-nav__group-title">{group.title}</p>
            <ul className="member-nav__list">
              {group.items.map((item) => {
                const current = isCurrent(pathname, item.href);
                const showBadge = item.href === NOTIFICATIONS_HREF && badgeText && badgeAria;
                return (
                  <li key={item.href}>
                    <Link
                      className="member-nav__link"
                      href={item.href}
                      prefetch={false}
                      onMouseEnter={() => router.prefetch(item.href)}
                      onFocus={() => router.prefetch(item.href)}
                      aria-current={current ? "page" : undefined}
                    >
                      <span className="eyebrow">{item.index}</span>
                      <span className="member-nav__label">{item.label}</span>
                      {showBadge ? (
                        <span className="member-nav__badge" aria-label={badgeAria}>
                          {badgeText}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="member-nav__foot">
        <AccountMenu variant="nav" initialDisplayName={displayName ?? null} />
      </div>
    </nav>
  );
}
