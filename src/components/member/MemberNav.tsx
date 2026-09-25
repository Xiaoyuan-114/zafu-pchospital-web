"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { AccountMenu } from "@/components/layout/AccountMenu";
import { NavSettingsMenu } from "@/components/layout/NavSettingsMenu";
import { memberCopy, memberNav, memberSettingsNav } from "@/config/member";

/**
 * 成员端二级导航（T-P0-3）
 *
 * 行为对齐 `AdminNav`：
 * - `usePathname()` + `aria-current="page"`；
 * - 渲染在 `src/app/member/layout.tsx`，客户端切页侧栏不重建；
 * - prefetch 仅 hover / focus，挂载不预取（避免并发拉子页 + `.reveal` hydration 警告）。
 *
 * `/member` 精确匹配；其余项用 `href` 前缀匹配（如 `/member/repairs/new` 高亮「维修记录」）。
 * 账号区挂同一 `AccountMenu`（variant=`nav`），子页也能 ≤2 次点击退出。
 *
 * 消息通知 / 我的收藏 / 排行榜不占导航位，收在足部 `NavSettingsMenu` 里；页面、接口与
 * 权限都没变，只是入口位置变了。原先挂在「消息通知」条目上的未读角标随之撤掉 ——
 * 它装饰的入口已经不在侧栏，留着会变成一处没有归属的请求。
 */

export type MemberNavProps = {
  /** 服务端已认证的展示名，交给账号菜单做首屏乐观渲染 */
  displayName?: string | null;
};

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/member") return pathname === "/member";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MemberNav({ displayName = null }: MemberNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const shell = memberCopy.shell;

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
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="member-nav__foot">
        <NavSettingsMenu
          items={memberSettingsNav}
          label={shell.settingsLabel}
          menuLabel={shell.settingsMenuLabel}
        />
        <AccountMenu variant="nav" initialDisplayName={displayName ?? null} />
      </div>
    </nav>
  );
}
