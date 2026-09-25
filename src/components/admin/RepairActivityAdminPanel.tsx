"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { AdminModal } from "@/components/admin/AdminModal";
import { AdminToast } from "@/components/admin/AdminToast";
import type { AdminToastMessage } from "@/components/admin/AdminToast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { adminCopy, adminShared } from "@/config/admin";
import { adminFetch } from "@/features/admin/admin-client";
import {
  repairActivityStatusLabels,
  type RepairActivityStatus,
} from "@/features/repair-activities/repair-activity-validation";
import type { RepairActivityAdminView } from "@/features/repair-activities/repair-activity-service";

/**
 * 维修活动管理（M1）：列表 + 新建/编辑表单 + 软删确认。
 * 交互对齐 SkillAdminPanel / CategoryAdminPanel，时间字段对齐 InviteCodeAdminPanel。
 */
export function RepairActivityAdminPanel() {
  const copy = adminCopy.repairActivities;
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [problem, setProblem] = useState("");
  const [toast, setToast] = useState<AdminToastMessage | null>(null);
  const [items, setItems] = useState<RepairActivityAdminView[]>([]);
  const [editing, setEditing] = useState<RepairActivityAdminView | null>(null);
  const [removing, setRemoving] = useState<RepairActivityAdminView | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState((current) => (current === "ready" ? "ready" : "loading"));
    setProblem("");
    const result = await adminFetch<RepairActivityAdminView[]>("/api/v1/admin/repair-activities");
    if (!result.ok) {
      setState("error");
      setProblem(result.message);
      return;
    }
    setItems(result.data);
    setState("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setProblem("");
    setToast(null);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const result = await adminFetch<RepairActivityAdminView>("/api/v1/admin/repair-activities", {
      method: "POST",
      body: {
        title: data.title ?? "",
        capacity: Number(data.capacity),
        activityAt: toIso(data.activityAt ?? ""),
        signupOpensAt: toIso(data.signupOpensAt ?? ""),
        signupClosesAt: toIso(data.signupClosesAt ?? ""),
      },
    });
    setBusy(false);
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    form.reset();
    setToast({ text: copy.create.created, tone: "success" });
    await load();
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setProblem("");
    setToast(null);
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const result = await adminFetch<RepairActivityAdminView>(
      `/api/v1/admin/repair-activities/${editing.id}`,
      {
        method: "PATCH",
        body: {
          title: data.title ?? "",
          capacity: Number(data.capacity),
          activityAt: toIso(data.activityAt ?? ""),
          signupOpensAt: toIso(data.signupOpensAt ?? ""),
          signupClosesAt: toIso(data.signupClosesAt ?? ""),
        },
      },
    );
    setBusy(false);
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    setEditing(null);
    setToast({ text: copy.edit.saved, tone: "success" });
    await load();
  }

  async function confirmRemove() {
    if (!removing) return;
    setBusy(true);
    setProblem("");
    setToast(null);
    const result = await adminFetch<{ deleted: boolean }>(
      `/api/v1/admin/repair-activities/${removing.id}`,
      { method: "DELETE" },
    );
    setBusy(false);
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    setRemoving(null);
    setToast({ text: copy.removePanel.done, tone: "neutral" });
    await load();
  }

  return (
    <div className="admin-workspace__content">
      <div className="admin-workspace__header">
        <div>
          <h1 className="admin-workspace__title" id="admin-repair-activities-title">
            {copy.title}
          </h1>
          <p className="admin-workspace__lead">{copy.lead}</p>
        </div>
      </div>

      <AdminToast toast={toast} onDismiss={() => setToast(null)} />

      {problem ? (
        <p className="admin-status admin-status--error" role="alert">
          {problem}
        </p>
      ) : null}

      <Card className="admin-panel">
        <form method="post" className="admin-form" onSubmit={create} aria-label={copy.create.title}>
          <h2 className="admin-panel__title">{copy.create.title}</h2>
          <div className="admin-form__grid">
            <label className="field">
              <span className="field__label">{copy.create.titleField}</span>
              <input className="field__input" name="title" required maxLength={120} />
            </label>
            <label className="field">
              <span className="field__label">{copy.create.capacity}</span>
              <input
                className="field__input"
                name="capacity"
                type="number"
                required
                min={1}
                max={10000}
                defaultValue={30}
              />
            </label>
            <label className="field">
              <span className="field__label">{copy.create.signupOpensAt}</span>
              <input className="field__input" type="datetime-local" name="signupOpensAt" required />
            </label>
            <label className="field">
              <span className="field__label">{copy.create.signupClosesAt}</span>
              <input
                className="field__input"
                type="datetime-local"
                name="signupClosesAt"
                required
              />
            </label>
            <label className="field">
              <span className="field__label">{copy.create.activityAt}</span>
              <input className="field__input" type="datetime-local" name="activityAt" required />
            </label>
          </div>
          <p className="field__hint">{copy.create.timeHint}</p>
          <div className="signup__actions">
            <Button type="submit" variant="solid" icon="plus" disabled={busy}>
              {busy ? adminShared.submitting : copy.create.submit}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="admin-panel">
        <div className="admin-list-toolbar">
          <p className="muted">
            {state === "loading"
              ? adminShared.loading
              : copy.count.replace("{count}", String(items.length))}
          </p>
          {state === "error" ? (
            <Button variant="ghost" onClick={() => void load()}>
              {adminShared.reload}
            </Button>
          ) : null}
        </div>

        {state === "ready" && items.length === 0 ? (
          <p className="muted">{adminShared.empty}</p>
        ) : null}

        {items.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{copy.table.title}</th>
                  <th>{copy.table.activityAt}</th>
                  <th>{copy.table.window}</th>
                  <th>{copy.table.capacity}</th>
                  <th>{copy.table.status}</th>
                  <th>{copy.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td data-label={copy.table.title}>{item.title}</td>
                    <td data-label={copy.table.activityAt}>{formatDateTime(item.activityAt)}</td>
                    <td data-label={copy.table.window}>
                      {formatDateTime(item.signupOpensAt)}
                      <span className="muted"> → </span>
                      {formatDateTime(item.signupClosesAt)}
                    </td>
                    <td data-label={copy.table.capacity}>
                      {copy.registered.replace("{count}", String(item.registeredCount))}
                      <span className="muted"> / {item.capacity}</span>
                      <br />
                      <span className="muted">
                        {copy.remaining.replace("{count}", String(item.remaining))}
                      </span>
                    </td>
                    <td data-label={copy.table.status}>
                      <span className={statusTagClass(item.status)}>
                        {repairActivityStatusLabels[item.status as RepairActivityStatus] ??
                          item.status}
                      </span>
                    </td>
                    <td data-label={copy.table.actions}>
                      <div className="admin-row-actions">
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setEditing(item)}
                        >
                          {copy.action.edit}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setRemoving(item)}
                        >
                          {copy.action.remove}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      {editing ? (
        <AdminModal title={copy.edit.title} onClose={() => setEditing(null)}>
          <form className="admin-form" onSubmit={saveEdit}>
            <div className="admin-form__grid">
              <label className="field">
                <span className="field__label">{copy.create.titleField}</span>
                <input
                  className="field__input"
                  name="title"
                  required
                  maxLength={120}
                  defaultValue={editing.title}
                />
              </label>
              <label className="field">
                <span className="field__label">{copy.create.capacity}</span>
                <input
                  className="field__input"
                  name="capacity"
                  type="number"
                  required
                  min={1}
                  max={10000}
                  defaultValue={editing.capacity}
                />
              </label>
              <label className="field">
                <span className="field__label">{copy.create.signupOpensAt}</span>
                <input
                  className="field__input"
                  type="datetime-local"
                  name="signupOpensAt"
                  required
                  defaultValue={toLocalInput(editing.signupOpensAt)}
                />
              </label>
              <label className="field">
                <span className="field__label">{copy.create.signupClosesAt}</span>
                <input
                  className="field__input"
                  type="datetime-local"
                  name="signupClosesAt"
                  required
                  defaultValue={toLocalInput(editing.signupClosesAt)}
                />
              </label>
              <label className="field">
                <span className="field__label">{copy.create.activityAt}</span>
                <input
                  className="field__input"
                  type="datetime-local"
                  name="activityAt"
                  required
                  defaultValue={toLocalInput(editing.activityAt)}
                />
              </label>
            </div>
            <div className="signup__actions">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                {copy.edit.cancel}
              </Button>
              <Button type="submit" variant="solid" disabled={busy}>
                {busy ? adminShared.submitting : copy.edit.submit}
              </Button>
            </div>
          </form>
        </AdminModal>
      ) : null}

      {removing ? (
        <AdminModal title={copy.removePanel.title} onClose={() => setRemoving(null)}>
          <p>{copy.removePanel.hint}</p>
          <p>
            <strong>{removing.title}</strong>
          </p>
          <div className="signup__actions">
            <Button type="button" variant="ghost" onClick={() => setRemoving(null)}>
              {copy.removePanel.cancel}
            </Button>
            <Button variant="solid" disabled={busy} onClick={() => void confirmRemove()}>
              {busy ? adminShared.submitting : copy.removePanel.submit}
            </Button>
          </div>
        </AdminModal>
      ) : null}
    </div>
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

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
