"use client";

import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * GalleryCarousel —— 现场图集走马灯
 *
 * 与 Ticker 的区别：Ticker 是 aria-hidden 的纯装饰文字跑马灯，
 * 这里的每一屏都是给人看的内容（图片 + 图注），因此必须可读、可操作、可暂停。
 *
 * 行为约定：
 * - 自动播放间隔由 autoPlayMs 控制；> 5000ms 时按 WCAG 2.2.2 必须能暂停。
 * - 悬停暂停、聚焦暂停、切到后台暂停；点击暂停按钮可手动锁定。
 * - 只有一个按钮的作用是「暂停/继续」，不额外做「上一张/下一张」以外的控制。
 * - slides 为空时整块不渲染（调用方通常也不会渲染），避免出现空框。
 * - prefers-reduced-motion 或 autoPlayMs <= 0 时不自动播放。
 */

export type GallerySlide = {
  src: string;
  alt: string;
  title: string;
  description: string;
};

export type GalleryCarouselProps = {
  slides: readonly GallerySlide[];
  /** 自动播放间隔（ms）。<= 0 表示不自动播放。 */
  autoPlayMs?: number;
  className?: string;
};

export function GalleryCarousel({ slides, autoPlayMs = 0, className }: GalleryCarouselProps) {
  const [index, setIndex] = useState(0);
  /** 用户显式锁定的暂停态（点了暂停按钮） */
  const [locked, setLocked] = useState(false);
  /** 临时暂停态（悬停 / 聚焦 / 页面不可见） */
  const [held, setHeld] = useState(false);
  /** 是否允许自动播放：客户端挂载后再判断减少动效偏好，避免 SSR 结果不一致 */
  const [autoAllowed, setAutoAllowed] = useState(false);

  const count = slides.length;

  /** 减少动效偏好 + 间隔有效性，都在挂载后判定 */
  useEffect(() => {
    if (autoPlayMs <= 0) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAutoAllowed(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [autoPlayMs]);

  const playing = autoAllowed && !locked && !held && count > 1;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, autoPlayMs);
    return () => window.clearInterval(timer);
  }, [playing, autoPlayMs, count]);

  /** 页面切到后台时暂停，避免用户回来时连翻好几张 */
  useEffect(() => {
    const onVisibility = () => setHeld(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  /** 左右方向键切换，仅在轮播获得焦点时生效 */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    }
  };

  if (count === 0) return null;

  const multiple = count > 1;

  return (
    <div
      className={cn("gallery", className)}
      role="group"
      aria-roledescription="轮播"
      aria-label="社团现场图集"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false);
      }}
      onKeyDown={onKeyDown}
    >
      <div className="gallery__stage">
        {slides.map((slide, i) => (
          <figure
            key={slide.src}
            className={cn("gallery__slide", i === index && "is-current")}
            aria-hidden={i !== index}
            // 非当前帧不参与 tab 与朗读顺序
            inert={i !== index}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 纯静态资源，无需 next/image 的运行时开销 */}
            <img className="gallery__img" src={slide.src} alt={slide.alt} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
            <figcaption className="gallery__cap">
              <strong className="gallery__cap-title">{slide.title}</strong>
              <span className="gallery__cap-desc">{slide.description}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {multiple && (
        <div className="gallery__bar">
          <div className="gallery__nav">
            <button
              type="button"
              className="gallery__btn"
              onClick={() => go(index - 1)}
              aria-label="上一张图片"
            >
              <Icon name="chevronLeft" />
            </button>
            <button
              type="button"
              className="gallery__btn"
              onClick={() => go(index + 1)}
              aria-label="下一张图片"
            >
              <Icon name="chevronRight" />
            </button>
          </div>

          <ol className="gallery__dots">
            {slides.map((slide, i) => (
              <li key={slide.src}>
                <button
                  type="button"
                  className={cn("gallery__dot", i === index && "is-current")}
                  onClick={() => go(i)}
                  aria-label={`第 ${i + 1} 张：${slide.title}`}
                  aria-current={i === index ? "true" : undefined}
                />
              </li>
            ))}
          </ol>

          <div className="gallery__meta">
            <span className="gallery__idx" aria-hidden="true">
              {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </span>
            {autoAllowed && (
              <button
                type="button"
                className="gallery__toggle"
                onClick={() => setLocked((v) => !v)}
                aria-label={locked ? "继续自动切换" : "暂停自动切换"}
              >
                {locked ? "播放" : "暂停"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
