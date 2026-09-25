"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { formatShanghaiDateTime } from "@/components/repair-activities/activity-format";
import { repairActivityStatusBadgeClass } from "@/components/repair-activities/activity-status-badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { repairActivitiesPage } from "@/config/repair-activities";
import {
  canAcceptNewRegistration,
  repairActivityIssueTypeLabels,
  repairActivityStatusLabels,
  type RepairActivityIssueType,
  type RepairActivityStatus,
} from "@/features/repair-activities/repair-activity-validation";
import type {
  RegistrationLookupView,
  RepairActivityPublicView,
} from "@/features/repair-activities/repair-activity-service";

type Props = { activityId: string };

export function RepairActivityDetail({ activityId }: Props) {
  const copy = repairActivitiesPage.detail;
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [activity, setActivity] = useState<RepairActivityPublicView | null>(null);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState<RegistrationLookupView | null>(null);
  const [lookupPhone, setLookupPhone] = useState("");

  const load = useCallback(async () => {
    setProblem("");
    try {
      const response = await fetch(`/api/v1/repair-activities/${activityId}`);
      const json = (await response.json()) as {
        success: boolean;
        data?: RepairActivityPublicView;
        error?: { code?: string; message?: string };
      };
      if (!json.success || !json.data) {
        if (json.error?.code === "ACTIVITY_ENDED" || response.status === 404) {
          setState("missing");
          setProblem(json.error?.message ?? "活动已结束");
          return;
        }
        setState("error");
        setProblem(json.error?.message ?? "加载失败");
        return;
      }
      setActivity(json.data);
      setState("ready");
    } catch {
      setState("error");
      setProblem("加载失败，请稍后重试");
    }
  }, [activityId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function signup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setProblem("");
    setNotice("");
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    try {
      const response = await fetch(`/api/v1/repair-activities/${activityId}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name ?? "",
          phone: data.phone ?? "",
          issueType: data.issueType ?? "",
        }),
      });
      const json = (await response.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!json.success) {
        setProblem(json.error?.message ?? "报名失败");
      } else {
        setNotice(copy.signupSuccess);
        event.currentTarget.reset();
        await load();
      }
    } catch {
      setProblem("网络异常，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function doLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setProblem("");
    setNotice("");
    setLookup(null);
    setLookupPhone("");
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    try {
      const response = await fetch(`/api/v1/repair-activities/${activityId}/registrations/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: data.phone ?? "" }),
      });
      const json = (await response.json()) as {
        success: boolean;
        data?: RegistrationLookupView;
        error?: { message?: string };
      };
      if (!json.success || !json.data) {
        setProblem(json.error?.message ?? "查询失败");
      } else {
        setLookup(json.data);
        setLookupPhone(data.phone ?? "");
        setNotice(copy.lookupSuccess);
      }
    } catch {
      setProblem("网络异常，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function updateType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lookup) return;
    setBusy(true);
    setProblem("");
    setNotice("");
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    try {
      const response = await fetch(
        `/api/v1/repair-activities/${activityId}/registrations/${lookup.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            issueType: data.issueType ?? "",
            phone: lookupPhone,
            editToken: lookup.editToken,
          }),
        },
      );
      const json = (await response.json()) as {
        success: boolean;
        data?: RegistrationLookupView;
        error?: { message?: string; code?: string };
      };
      if (!json.success) {
        setProblem(json.error?.message ?? "修改失败");
      } else {
        setNotice(copy.updateSuccess);
        if (json.data) {
          setLookup({ ...lookup, issueType: json.data.issueType, status: json.data.status });
        }
      }
    } catch {
      setProblem("网络异常，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return <p className="muted">正在加载活动…</p>;
  if (state === "missing") {
    return (
      <Card className="admin-panel">
        <p className="muted" role="alert">
          {problem || "活动已结束"}
        </p>
        <div className="signup__actions">
          <Button variant="ghost" href="/repair-activities">
            返回活动列表
          </Button>
        </div>
      </Card>
    );
  }
  if (state === "error" || !activity) {
    return (
      <p className="admin-status admin-status--error" role="alert">
        {problem}
      </p>
    );
  }

  const open = canAcceptNewRegistration(activity.status);
  const signupDisabledReason =
    activity.status === "UPCOMING"
      ? copy.upcomingDisabled
      : activity.status === "CLOSED"
        ? copy.closedDisabled
        : activity.status === "FULL"
          ? copy.fullDisabled
          : copy.signupDisabled;

  return (
    <div className="activity-detail">
      <Card className="admin-panel">
        <div className="activity-card__head">
          <h1 className="activity-card__title" id="repair-activity-detail-title">
            {activity.title}
          </h1>
          <span className={repairActivityStatusBadgeClass(activity.status)}>
            {repairActivityStatusLabels[activity.status as RepairActivityStatus]}
          </span>
        </div>
        <dl className="activity-card__meta">
          <div>
            <dt>{repairActivitiesPage.activityAt}</dt>
            <dd>{formatShanghaiDateTime(activity.activityAt)}</dd>
          </div>
          <div>
            <dt>{repairActivitiesPage.window}</dt>
            <dd>
              {formatShanghaiDateTime(activity.signupOpensAt)} — {formatShanghaiDateTime(activity.signupClosesAt)}
            </dd>
          </div>
          <div>
            <dt>名额</dt>
            <dd>
              {repairActivitiesPage.capacity
                .replace("{registered}", String(activity.registeredCount))
                .replace("{capacity}", String(activity.capacity))}
              {" · "}
              {repairActivitiesPage.remaining.replace("{count}", String(activity.remaining))}
            </dd>
          </div>
        </dl>
      </Card>

      {notice ? (
        <p className="admin-status admin-status--success" role="status">
          {notice}
        </p>
      ) : null}
      {problem ? (
        <p className="admin-status admin-status--error" role="alert">
          {problem}
        </p>
      ) : null}

      <Card className="admin-panel">
        <h2 className="admin-panel__title">{copy.signupTitle}</h2>
        {!open ? <p className="muted">{signupDisabledReason}</p> : null}
        <form className="admin-form" onSubmit={signup} aria-label={copy.signupTitle}>
          <div className="admin-form__grid">
            <label className="field">
              <span className="field__label">{copy.name}</span>
              <input
                className="field__input"
                name="name"
                required
                minLength={2}
                maxLength={40}
                disabled={!open || busy}
              />
            </label>
            <label className="field">
              <span className="field__label">{copy.phone}</span>
              <input
                className="field__input"
                name="phone"
                required
                inputMode="numeric"
                maxLength={11}
                disabled={!open || busy}
              />
            </label>
            <label className="field">
              <span className="field__label">{copy.issueType}</span>
              <select
                className="field__input"
                name="issueType"
                required
                disabled={!open || busy}
                defaultValue="CLEAN_PASTE"
              >
                {repairActivitiesPage.issueTypes.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="signup__actions">
            <Button type="submit" variant="solid" disabled={!open || busy}>
              {busy ? "提交中…" : copy.submitSignup}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="admin-panel">
        <h2 className="admin-panel__title">{copy.lookupTitle}</h2>
        <form className="admin-form" onSubmit={doLookup} aria-label={copy.lookupTitle}>
          <label className="field">
            <span className="field__label">{copy.phone}</span>
            <input
              className="field__input"
              name="phone"
              required
              inputMode="numeric"
              maxLength={11}
              disabled={busy}
            />
          </label>
          <div className="signup__actions">
            <Button type="submit" variant="ghost" disabled={busy}>
              {copy.submitLookup}
            </Button>
          </div>
        </form>

        {lookup ? (
          <form className="admin-form mt-s-4" onSubmit={updateType}>
            <p className="muted">
              {lookup.name} · {lookup.phoneMasked} · 当前：
              {repairActivityIssueTypeLabels[lookup.issueType as RepairActivityIssueType] ??
                lookup.issueType}
              {" · "}
              {lookup.status}
            </p>
            {lookup.status !== "REGISTERED" ? (
              <p className="muted">{copy.notEditable}</p>
            ) : (
              <>
                <label className="field">
                  <span className="field__label">{copy.issueType}</span>
                  <select
                    className="field__input"
                    name="issueType"
                    required
                    disabled={busy}
                    defaultValue={lookup.issueType}
                  >
                    {repairActivitiesPage.issueTypes.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="signup__actions">
                  <Button type="submit" variant="solid" disabled={busy}>
                    {copy.submitUpdate}
                  </Button>
                </div>
              </>
            )}
          </form>
        ) : null}
      </Card>
    </div>
  );
}

