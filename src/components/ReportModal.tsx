import { useEffect, useId, useRef, useState } from "react";
import { Flag, LoaderCircle, X } from "lucide-react";
import { useT } from "@/i18n/LocaleContext";
import { zClass } from "@/lib/stacking";
import type { TagEntityType } from "@/tags/types";

type ReportModalProps = {
  open: boolean;
  entityType: TagEntityType;
  entityName: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
};

export function ReportModal({
  open,
  entityType,
  entityName,
  saving,
  onClose,
  onSubmit,
}: ReportModalProps) {
  const t = useT();
  const titleId = useId();
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setError(null);
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, saving]);

  if (!open) return null;

  async function handleSubmit() {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError(t("report.error.tooShort"));
      return;
    }
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("report.error.save"));
    }
  }

  return (
    <div
      className={`fixed inset-0 ${zClass.modal} flex items-end justify-center bg-ink/55 p-0 sm:items-center sm:p-4`}
      role="presentation"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-cream shadow-xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stamp">
              {t("report.kicker")}
            </p>
            <h2
              id={titleId}
              className="font-display text-2xl leading-tight text-burgundy"
            >
              {t("report.title", { name: entityName })}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">{t(`report.hint.${entityType}`)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-2 text-ink-soft hover:bg-ink/5"
            aria-label={t("report.closeAria")}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <label htmlFor={textareaId} className="block text-sm font-semibold text-ink">
            {t("report.reasonLabel")}
          </label>
          <textarea
            id={textareaId}
            ref={textareaRef}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={5}
            maxLength={2000}
            placeholder={t("report.placeholder")}
            className="min-h-28 w-full resize-y rounded-2xl border border-ink/15 bg-parchment px-4 py-3 text-ink outline-none ring-tomato/40 focus:ring-2"
          />
          {error ? (
            <p className="text-sm font-semibold text-tomato" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex min-h-11 items-center rounded-full border border-ink/15 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato disabled:opacity-60"
          >
            {t("report.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || reason.trim().length < 3}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tomato px-5 text-sm font-semibold text-cream hover:bg-tomato-deep disabled:opacity-60"
          >
            {saving ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                {t("report.submitting")}
              </>
            ) : (
              <>
                <Flag className="size-4" aria-hidden="true" />
                {t("report.submit")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
