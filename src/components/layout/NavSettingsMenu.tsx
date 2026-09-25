"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import type { NavItem } from "@/config/navigation";

/**
 * NavSettingsMenu —— 侧栏足部的「设置」菜单（成员 / 管理两侧共用）
 *
 * 低频入口（成员端：消息通知 / 我的收藏 / 排行榜；后台：故障分类 / 数据导出 / 技能标签 /
 * 评论管理 / 审计记录 / 公开统计）不占侧栏导航位，收在足部这一个按钮里。页面、接口与权限
 * 都不变，只是入口位置变了 —— 条目仍显示各自编号与名称，读者能对上页面标题里的编号。
 *
 * 交互与外观与 `AccountMenu` 是同一套（复用 `.account-menu` 那组类）：点击外部或
 * `Escape` 关闭，选中条目后立刻收起，触发按钮带 `aria-haspopup` / `aria-expanded` /
 * `aria-controls`。**面板就地展开、不做绝对定位** —— 侧栏有 `overflow`，浮层会被裁切。
 *
 * 空列表直接不渲染：调用方传错或后续把条目搬回分组里时，不会留下一个点开是空的按钮。
 */
export function NavSettingsMenu({
  items,
  label,
  menuLabel,
}: {
  items: readonly NavItem[];
  label: string;
  menuLabel: string;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!items.length) return null;

  return (
    <div
      ref={rootRef}
      className="account-menu account-menu--nav"
      data-open={open ? "true" : "false"}
    >
      <button
        className="account-menu__trigger btn"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={menuLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-menu__name">{label}</span>
        <Icon name="chevronDown" />
      </button>

      {open ? (
        <div className="account-menu__panel" id={menuId} role="menu" aria-label={menuLabel}>
          {items.map((item) => (
            <Link
              className="account-menu__item nav-settings__item"
              key={item.href}
              role="menuitem"
              href={item.href}
              onClick={() => setOpen(false)}
            >
              <span className="eyebrow">{item.index}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
