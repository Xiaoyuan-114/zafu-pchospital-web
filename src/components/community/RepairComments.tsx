"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { communityCopy } from "@/config/community";
import { COMMENT_BODY_MAX_LENGTH } from "@/types/contracts";
import type { PaginationMeta, RepairCommentView } from "@/types/contracts";

type Props = { recordId: string };

export function RepairComments({ recordId }: Props) {
  const copy = communityCopy.comments;
  const [items, setItems] = useState<RepairCommentView[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<RepairCommentView | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "full" | "silent" = "full") => {
      if (mode === "full") setState("loading");
      try {
        const response = await fetch(`/api/v1/repairs/${recordId}/comments?page=1&pageSize=50`, {
          cache: "no-store",
        });
        const json = await response.json();
        if (!json.success) throw new Error();
        setItems(json.data as RepairCommentView[]);
        setPagination(json.meta.pagination as PaginationMeta);
        setState("ready");
      } catch {
        setState("error");
      }
    },
    [recordId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/repairs/${recordId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: draft,
          parentCommentId: replyTo?.id ?? null,
        }),
      });
      const json = await response.json();
      if (!json.success) {
        setError(json.error?.message ?? copy.loadError);
        return;
      }
      setDraft("");
      setReplyTo(null);
      await load("silent");
    } catch {
      setError(copy.loadError);
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(comment: RepairCommentView) {
    setError(null);
    try {
      const response = await fetch(`/api/v1/repairs/${recordId}/comments/${comment.id}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!json.success) {
        setError(json.error?.message ?? copy.loadError);
        return;
      }
      await load("silent");
    } catch {
      setError(copy.loadError);
    }
  }

  if (state === "loading") return <p role="status">{copy.loading}</p>;
  if (state === "error") {
    return (
      <div className="community-block">
        <p>{copy.loadError}</p>
        <Button onClick={() => void load()}>{copy.reload}</Button>
      </div>
    );
  }

  return (
    <div className="community-block">
      <header className="community-block__head">
        <h2 className="text-display-3 font-bold">{copy.title}</h2>
        <span className="member-section__tag">{copy.tag}</span>
      </header>
      {pagination ? (
        <p className="community-block__meta">{copy.rootCount.replace("{count}", String(pagination.total))}</p>
      ) : null}
      {items.length === 0 ? <p className="member-section__note">{copy.empty}</p> : null}
      <ul className="community-thread">
        {items.map((comment) => (
          <li className="community-comment" key={comment.id}>
            <CommentItem
              comment={comment}
              onReply={() => {
                setReplyTo(comment);
                setDraft(`@${comment.author.name} `);
              }}
              onDelete={() => void remove(comment)}
            />
            {comment.replies.length > 0 ? (
              <ul className="community-thread community-thread--replies">
                {comment.replies.map((reply) => (
                  <li className="community-comment" key={reply.id}>
                    <CommentItem
                      comment={reply}
                      onReply={() => {
                        setReplyTo(comment);
                        setDraft(`@${reply.author.name} `);
                      }}
                      onDelete={() => void remove(reply)}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      <form
        className="community-composer"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {replyTo ? (
          <p className="community-composer__reply">
            {copy.replyTo.replace("{name}", replyTo.author.name)}
            <Button type="button" variant="ghost" onClick={() => setReplyTo(null)}>
              {copy.cancelReply}
            </Button>
          </p>
        ) : null}
        <label className="field">
          <span className="sr-only">{replyTo ? copy.replyPlaceholder : copy.placeholder}</span>
          <textarea
            className="field__input community-composer__input"
            value={draft}
            maxLength={COMMENT_BODY_MAX_LENGTH}
            rows={4}
            placeholder={replyTo ? copy.replyPlaceholder : copy.placeholder}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <p className="community-composer__hint">{copy.mentionHint}</p>
        {error ? <p className="community-composer__error">{error}</p> : null}
        <Button type="submit" variant="solid" disabled={submitting || !draft.trim()}>
          {submitting ? copy.submitting : copy.submit}
        </Button>
      </form>
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
  onDelete,
}: {
  comment: RepairCommentView;
  onReply: () => void;
  onDelete: () => void;
}) {
  const copy = communityCopy.comments;
  return (
    <article className="community-comment__body">
      <header className="community-comment__meta">
        <strong>{comment.author.name}</strong>
        <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString("zh-CN")}</time>
      </header>
      <p className="community-comment__text">{comment.body}</p>
      <div className="community-comment__actions">
        <Button type="button" variant="ghost" onClick={onReply}>
          {copy.reply}
        </Button>
        {comment.canDelete ? (
          <Button type="button" variant="ghost" onClick={onDelete}>
            {copy.delete}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
