"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useHorizontalDragScroll } from "@/components/repair-activities/useHorizontalDragScroll";
import { Card } from "@/components/ui/Card";
import { repairActivitiesPage } from "@/config/repair-activities";
import {
  repairActivityStatusLabels,
  type RepairActivityStatus,
} from "@/features/repair-activities/repair-activity-validation";
import type { RepairActivityPublicView } from "@/features/repair-activities/repair-activity-service";

export function RepairActivityList() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [items, setItems] = useState<RepairActivityPublicView[]>([]);
  const [message, setMessage] = useState("");
  const railRef = useHorizontalDragScroll<HTMLUListElement>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/v1/repair-activities");
        const json = (await response.json()) as {
          success: boolean;
          data?: RepairActivityPublicView[];
          error?: { message?: string };
        };
        if (cancelled) return;
        if (!json.success || !json.data) {
          setState("error");
          setMessage(json.error?.message ?? repairActivitiesPage.loadFailed);
          return;
        }
        setItems(json.data);
        setState("ready");
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage(repairActivitiesPage.loadFailed);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return <p className="muted">正在加载活动…</p>;
  }
  if (state === "error") {
    return (
      <p className="admin-status admin-status--error" role="alert">
        {message}
      </p>
    );
  }
  if (items.length === 0) {
    return <p className="muted">{repairActivitiesPage.empty}</p>;
  }

  return (
    <ul ref={railRef} className="activity-list">
      {items.map((item) => {
        const ended = item.status === "ENDED";
        const body = (
          <Card className={`activity-card${ended ? " activity-card--ended" : ""}`}>
            <div className="activity-card__head">
              <h2 className="activity-card__title">{item.title}</h2>
              <span className={statusTagClass(item.status)}>
                {repairActivityStatusLabels[item.status as RepairActivityStatus]}
              </span>
            </div>
            <dl className="activity-card__meta">
              <div>
                <dt>{repairActivitiesPage.activityAt}</dt>
                <dd>{formatDateTime(item.activityAt)}</dd>
              </div>
              <div>
                <dt>名额</dt>
                <dd>{formatCapacityLine(item, ended)}</dd>
              </div>
            </dl>
            {ended ? <p className="muted">{repairActivitiesPage.endedHint}</p> : null}
          </Card>
        );

        if (ended) {
          return (
            <li key={item.id}>
              <div aria-disabled="true" className="activity-card__ended-wrap">
                {body}
              </div>
            </li>
          );
        }

        return (
          <li key={item.id}>
            <Link href={`/repair-activities/${item.id}`} className="activity-card__link">
              {body}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** 未结束优先「剩余 N」，可与已报/上限同行压缩；已结束仅已报/上限。 */
function formatCapacityLine(item: RepairActivityPublicView, ended: boolean): string {
  const capacity = repairActivitiesPage.capacity
    .replace("{registered}", String(item.registeredCount))
    .replace("{capacity}", String(item.capacity));
  if (ended) return capacity;
  const remaining = repairActivitiesPage.remainingShort.replace(
    "{count}",
    String(item.remaining),
  );
  return `${remaining} · ${capacity}`;
}

function statusTagClass(status: string): string {
  switch (status) {
    case "OPEN":
      return "repair-tag repair-tag--approved";
    case "FULL":
      return "repair-tag repair-tag--pending";
    case "UPCOMING":
      return "repair-tag repair-tag--draft";
    case "CLOSED":
      return "repair-tag repair-tag--draft";
    case "ENDED":
      return "repair-tag repair-tag--result";
    default:
      return "repair-tag repair-tag--draft";
  }
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
