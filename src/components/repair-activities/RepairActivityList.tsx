"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
    <ul className="activity-list">
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
                <dt>{repairActivitiesPage.window}</dt>
                <dd>
                  {formatDateTime(item.signupOpensAt)} — {formatDateTime(item.signupClosesAt)}
                </dd>
              </div>
              <div>
                <dt>名额</dt>
                <dd>
                  {repairActivitiesPage.capacity
                    .replace("{registered}", String(item.registeredCount))
                    .replace("{capacity}", String(item.capacity))}
                  {ended ? null : (
                    <>
                      {" · "}
                      {repairActivitiesPage.remaining.replace("{count}", String(item.remaining))}
                    </>
                  )}
                </dd>
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


function statusTagClass(status: string): string {
  switch (status) {
    case "OPEN":
      return "repair-tag repair-tag--approved";
    case "FULL":
      return "admin-tag admin-tag--accent";
    case "UPCOMING":
      return "admin-tag";
    case "CLOSED":
      return "admin-tag admin-tag--muted";
    case "ENDED":
      return "admin-tag admin-tag--muted";
    default:
      return "admin-tag";
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
