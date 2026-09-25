"use client";

import { useCallback, useRef } from "react";

const DRAG_THRESHOLD_PX = 6;

type DragState = {
  pointerId: number;
  startX: number;
  startScroll: number;
  moved: boolean;
  capturing: boolean;
};

/**
 * 宽屏横滑轨道：指针拖拽滚动；位移超过阈值时抑制随后的 click，避免误开链接。
 * 触控原生横向滑动不拦截。使用 callback ref，以便列表从 loading 切到 ready 后仍能绑定。
 */
export function useHorizontalDragScroll<T extends HTMLElement>() {
  const drag = useRef<DragState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const setRef = useCallback((el: T | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!el) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      // 触控交给原生 overflow 滑动，避免与浏览器手势抢事件。
      if (event.pointerType === "touch") return;
      drag.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startScroll: el.scrollLeft,
        moved: false,
        capturing: false,
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      const state = drag.current;
      if (!state || state.pointerId !== event.pointerId) return;
      const dx = event.clientX - state.startX;
      if (!state.moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      if (!state.moved) {
        state.moved = true;
        el.classList.add("is-dragging");
        try {
          el.setPointerCapture(event.pointerId);
          state.capturing = true;
        } catch {
          /* ignore */
        }
      }
      el.scrollLeft = state.startScroll - dx;
      event.preventDefault();
    };

    const endDrag = (event: PointerEvent) => {
      const state = drag.current;
      if (!state || state.pointerId !== event.pointerId) return;
      if (state.capturing) {
        try {
          el.releasePointerCapture(event.pointerId);
        } catch {
          /* ignore */
        }
      }
      el.classList.remove("is-dragging");
      // 拖过阈值：吞掉紧随其后的 click，以免激活卡片 Link。
      if (state.moved) {
        const suppress = (clickEvent: MouseEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          el.removeEventListener("click", suppress, true);
        };
        el.addEventListener("click", suppress, true);
        window.setTimeout(() => el.removeEventListener("click", suppress, true), 0);
      }
      drag.current = null;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);

    cleanupRef.current = () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.classList.remove("is-dragging");
      drag.current = null;
    };
  }, []);

  return setRef;
}
