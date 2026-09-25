"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { AccountMenu } from "@/components/layout/AccountMenu";
import { NavSettingsMenu } from "@/components/layout/NavSettingsMenu";
import { adminCopy, adminNavGroups, adminSettingsNav } from "@/config/admin";

/**
 * 后台内部导航（左侧栏）。
 *
 * 用 `usePathname()` 判断当前页是因为 Next 的 Server Component 读不到 pathname；
 * `aria-current="page"` 由导航自己标（与 Header 的公开索引栏一致），
 * 视觉高亮写在 `.admin-nav__link[aria-current="page"]`。
 *
 * **渲染在 `src/app/admin/layout.tsx` 里**（不属于任何页面）：App Router 的 layout 在
 * 客户端导航之间保持挂载，因此切换页面时侧栏不重建、不闪、不需要重新算高亮 ——
 * 这是「后台像邮箱一样随手切换」的前提。页面自己不再渲染它。
 *
 * **预取按意图触发，不是挂载即全量预取。**
 * 后台路由都是动态渲染（`ƒ`），Next 默认不会预取它们的 RSC 载荷，每次点击都要等一次
 * 服务端往返，所以需要预取。但 `prefetch` 直接写在全部链接上会让整站一进后台就并发
 * 拉多个页面，而且预取完成时路由器会重新渲染当前页面 —— 页面上的 `.reveal` 元素
 * 已被 `SiteEffects` 加上 `is-in`，于是 React 报 hydration 不匹配警告
 * （实测 `/admin` 首页必现，公开页不会）。改成鼠标悬停 / 键盘聚焦时才预取：
 * 既省掉无用请求，也把「点下去已经是成品」这件事保留下来。
 *
 * T-P1-3：侧栏按 `adminNavGroups` 渲染「成员与账号 / 维修业务」两个分组；低频入口
 * （故障分类 / 数据导出 / 技能标签 / 评论管理 / 审计记录 / 公开统计）收在足部
 * `NavSettingsMenu` 里，与账号菜单同一处。
 */
export type AdminNavProps = {
  /** 服务端已认证的展示名，交给账号菜单做首屏乐观渲染 */
  displayName?: string | null;
};

export function AdminNav({ displayName = null }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav className="admin-nav" aria-label={adminCopy.navLabel}>
      <p className="admin-nav__brand">
        <span className="admin-nav__brand-en">{adminCopy.titleEn}</span>
        <span className="admin-nav__brand-cn">{adminCopy.title}</span>
      </p>
      <div className="admin-nav__groups">
        {adminNavGroups.map((group) => (
          <div key={group.id} className="admin-nav__group">
            <p className="admin-nav__group-title">{group.title}</p>
            <ul className="admin-nav__list">
              {group.items.map((item) => {
                const current =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      className="admin-nav__link"
                      href={item.href}
                      prefetch={false}
                      onMouseEnter={() => router.prefetch(item.href)}
                      onFocus={() => router.prefetch(item.href)}
                      aria-current={current ? "page" : undefined}
                    >
                      <span className="eyebrow">{item.index}</span>
                      <span className="admin-nav__label">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="admin-nav__foot">
        <NavSettingsMenu
          items={adminSettingsNav}
          label={adminCopy.settingsLabel}
          menuLabel={adminCopy.settingsMenuLabel}
        />
        <AccountMenu variant="nav" initialDisplayName={displayName ?? null} />
      </div>
    </nav>
  );
}
