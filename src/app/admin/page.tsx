import type { Metadata } from "next";
import Link from "next/link";

import { ChannelList } from "@/components/ui/ChannelList";
import { Section } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ADMIN_SECTION_INDEX, adminCopy, adminNav } from "@/config/admin";

export const metadata: Metadata = { title: adminCopy.title };

/**
 * 后台首页（T-P1-3）：常用入口 3–4 卡 + 全部模块次级链接。
 * 不做任何统计数字（避免与 M5 正式口径重复或漂移）。
 */
export default function AdminHomePage() {
  const copy = adminCopy.home;
  return (
    <Section variant="page-head" className="admin-workspace" labelledBy="admin-home-title">
      <div className="admin-workspace__content">
        <div className="admin-workspace__header">
          <div>
            <h1 className="admin-workspace__title" id="admin-home-title">
              {adminCopy.title}
            </h1>
            <p className="admin-workspace__lead">{copy.lead}</p>
          </div>
        </div>
        <SectionHead index={ADMIN_SECTION_INDEX.home} label={copy.label} />
        <SectionTitle as="h2" index={1}>
          {copy.commonTitle}
        </SectionTitle>
        <ChannelList
          items={copy.common.map((section) => ({
            kind: section.index,
            title: section.title,
            description: section.description,
            href: section.href,
          }))}
        />
        <SectionTitle as="h2" index={2}>
          {copy.allModulesTitle}
        </SectionTitle>
        <p className="admin-workspace__hint">{copy.allModulesHint}</p>
        <ul className="admin-home-modules">
          {adminNav.map((item) => (
            <li key={item.href}>
              <Link className="admin-home-modules__link" href={item.href} prefetch={false}>
                <span className="eyebrow">{item.index}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
