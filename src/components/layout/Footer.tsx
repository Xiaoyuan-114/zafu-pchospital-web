import { Container } from "@/components/layout/Container";
import { siteConfig } from "@/config/site";

/**
 * Footer —— 全站统一页脚
 *
 * 对应设计基准的 `.footer`。首页与其他页面共用，不重复实现。
 */

/**
 * 页脚底部公示的备案号列表。
 *
 * 《非经营性互联网信息服务备案管理办法》第十三条要求主页底部标明备案编号，
 * 并提供链接供公众查询核对。这里按列表渲染（而不是写死一个 <a>），
 * 是为了将来公安联网备案号下发时只需追加一行：
 *
 *   { id: "mps", text: siteConfig.record.mps, href: siteConfig.record.mpsUrl }
 *
 * 样式已按多项并排处理，不需要改 CSS。
 */
const filingRecords = [
  { id: "icp", text: siteConfig.record.icp, href: siteConfig.record.icpUrl },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <Container>
        <div className="footer__row">
          <span>{siteConfig.name} · 志愿技术服务</span>
          <span>{siteConfig.nameEn}</span>
          <span>{year}</span>
        </div>
        <p className="footer__note">
          本站为浙江农林大学电脑医院社团官方站点，页面中涉及的文档目录与正文均来自公开文档仓库{" "}
          <a href={siteConfig.docRepo.url} target="_blank" rel="noopener noreferrer">
            {siteConfig.docRepo.name}
          </a>
          （作者 {siteConfig.docRepo.author}，由 mdBook 构建）。
        </p>
        <p className="footer__record">
          {filingRecords.map((item) => (
            <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer">
              {item.text}
            </a>
          ))}
        </p>
      </Container>
    </footer>
  );
}
