import type { Metadata } from "next";

import { PageHead } from "@/components/layout/PageHead";
import { ChannelList } from "@/components/ui/ChannelList";
import { GalleryCarousel } from "@/components/ui/GalleryCarousel";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ServiceList } from "@/components/ui/ServiceList";
import { aboutPage, aboutSections, galleryOptions, gallerySlides } from "@/config/about";
import { principles, services } from "@/config/home";
import { contactChannels, contactQr } from "@/config/site";

export const metadata: Metadata = {
  title: "关于电脑医院",
  description: "浙江农林大学电脑医院社团介绍、现场图集、服务范围与联系方式。志愿性计算机技术服务，不收费。",
};

/**
 * /about 关于电脑医院
 *
 * 内容结构：社团介绍（含现场图集）→ 服务范围 → 联系方式。
 * 页面视觉全部由设计系统的既有组件拼装（PageHead / GalleryCarousel / ServiceList / ChannelList），
 * 没有新增任何视觉语言。
 */

export default function AboutPage() {
  return (
    <>
      <PageHead
        id="about-page-title"
        index="02"
        label="About"
        title={aboutPage.title}
        lead={aboutPage.lead}
      />

      {/* ---------------------------------------------------- 社团介绍 */}
      <Section id="intro" labelledBy="about-intro-title">
        <SectionHead index={aboutSections.intro.index} label={aboutSections.intro.label} />
        <div className="sec-titlebar">
          <SectionTitle id="about-intro-title">{aboutSections.intro.title}</SectionTitle>
        </div>

        <div className="about__grid">
          <div>
            {aboutPage.intro.map((paragraph, index) => (
              <Reveal
                as="p"
                className={index === 0 ? "lead" : "muted"}
                index={index + 2}
                key={paragraph}
              >
                {paragraph}
              </Reveal>
            ))}
          </div>

          <Reveal as="ol" className="principles" index={2}>
            {principles.map((item) => (
              <li key={item.title}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              </li>
            ))}
          </Reveal>
        </div>

        {/* 现场图集：社团实拍走马灯 */}
        <Reveal className="mt-s-8" index={3}>
          <GalleryCarousel slides={gallerySlides} autoPlayMs={galleryOptions.autoPlayMs} />
        </Reveal>

        {/* 社团档案 */}
        <Reveal as="ol" className="principles mt-s-8" index={4}>
          {aboutPage.archive.map((item) => (
            <li key={item.title}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            </li>
          ))}
        </Reveal>
      </Section>

      {/* ---------------------------------------------------- 服务范围 */}
      <Section id="scope" labelledBy="about-scope-title">
        <SectionHead index={aboutSections.scope.index} label={aboutSections.scope.label} />
        <div className="sec-titlebar">
          <SectionTitle id="about-scope-title">{aboutSections.scope.title}</SectionTitle>
        </div>

        <ServiceList items={services} />
      </Section>

      {/* ---------------------------------------------------- 联系方式 */}
      <Section id="contact" labelledBy="about-contact-title">
        <SectionHead index={aboutSections.contact.index} label={aboutSections.contact.label} />
        <div className="sec-titlebar">
          <SectionTitle id="about-contact-title">{aboutSections.contact.title}</SectionTitle>
        </div>

        <div className="about__grid">
          <Reveal index={2}>
            <h3 className="eyebrow" style={{ margin: "0 0 var(--s-4)" }}>
              求助渠道
            </h3>
            <ChannelList items={contactChannels} />
          </Reveal>

          <Reveal index={3}>
            <figure className="qr">
              {/* eslint-disable-next-line @next/next/no-img-element -- 静态资源，尺寸固定，无需 next/image */}
              <img className="qr__img" src={contactQr.src} alt={contactQr.alt} loading="lazy" decoding="async" />
              <figcaption className="qr__cap">
                <strong>{contactQr.caption}</strong>
                <span>{contactQr.hint}</span>
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
