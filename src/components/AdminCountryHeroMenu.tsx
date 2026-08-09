import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  FilePenLine,
  ImagePlus,
  Images,
  LoaderCircle,
  X,
} from "lucide-react";
import type { Country } from "@/types/content";
import { replaceCountryImage, updateCountryText } from "@/admin/countryTools";
import { useSelectImage } from "@/admin/SelectImageContext";
import { useT } from "@/i18n/LocaleContext";

type AdminCountryHeroMenuProps = {
  country: Country;
  onCountryUpdated: (country: Country) => void;
};

type MenuPosition = {
  top: number;
  left: number;
};

function countryDisplayText(country: Country): string {
  return (country.wikipedia?.summary ?? country.introduction).trim();
}

/** Country-hero admin tools: replace/select banner image and edit country text. */
export function AdminCountryHeroMenu({
  country,
  onCountryUpdated,
}: AdminCountryHeroMenuProps) {
  const t = useT();
  const { openSelectImage } = useSelectImage();
  const menuId = useId();
  const textTitleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [statusPosition, setStatusPosition] = useState<MenuPosition | null>(
    null,
  );
  const [textOpen, setTextOpen] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const [textBusy, setTextBusy] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updatePosition() {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const panelWidth = 288;
    const gap = 8;
    const left = Math.min(
      Math.max(8, rect.right - panelWidth),
      window.innerWidth - panelWidth - 8,
    );
    let top = rect.bottom + gap;
    const panelHeight = panelRef.current?.offsetHeight ?? 220;
    if (top + panelHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - gap - panelHeight);
    }
    setPosition({ top, left });
  }

  function updateStatusPosition() {
    const button = buttonRef.current;
    if (!button || (!imageBusy && !status && !error)) {
      setStatusPosition(null);
      return;
    }
    const rect = button.getBoundingClientRect();
    const toastWidth = 256;
    const left = Math.min(
      Math.max(8, rect.right - toastWidth),
      window.innerWidth - toastWidth - 8,
    );
    setStatusPosition({ top: rect.bottom + 4, left });
  }

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open]);

  useLayoutEffect(() => {
    updateStatusPosition();
  }, [imageBusy, status, error]);

  useEffect(() => {
    if (!open && !imageBusy && !status && !error) return;
    function onPointer(event: MouseEvent) {
      if (!open) return;
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onReposition() {
      if (open) updatePosition();
      updateStatusPosition();
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, imageBusy, status, error]);

  useEffect(() => {
    if (!textOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !textBusy) setTextOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [textOpen, textBusy]);

  async function onReplaceImage() {
    setOpen(false);
    setImageBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await replaceCountryImage(country.code);
      onCountryUpdated(result.country);
      setStatus(
        t("admin.country.imageUpdated", { dishName: result.dishName }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("admin.country.imageError"),
      );
    } finally {
      setImageBusy(false);
    }
  }

  function onSelectImage() {
    setOpen(false);
    setError(null);
    setStatus(null);
    openSelectImage({
      target: { kind: "country", countryCode: country.code },
      label: country.name,
      defaultQuery: `${country.name} traditional food dish`,
      onApplied: (result) => {
        if (result.country) {
          onCountryUpdated(result.country);
          setStatus(t("admin.country.selectImageUpdated"));
        }
      },
    });
  }

  function openEditText() {
    setOpen(false);
    setTextDraft(countryDisplayText(country));
    setTextError(null);
    setTextOpen(true);
  }

  async function onSaveText(event: FormEvent) {
    event.preventDefault();
    setTextBusy(true);
    setTextError(null);
    try {
      const result = await updateCountryText(country.code, textDraft);
      onCountryUpdated(result.country);
      setTextOpen(false);
      setStatus(t("admin.country.textUpdated"));
      setError(null);
    } catch (err) {
      setTextError(
        err instanceof Error ? err.message : t("admin.country.textError"),
      );
    } finally {
      setTextBusy(false);
    }
  }

  const menu =
    open && position
      ? createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            style={{ top: position.top, left: position.left }}
            className="fixed z-[80] w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-ink/10 bg-cream text-ink shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              disabled={imageBusy}
              onClick={() => void onReplaceImage()}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment disabled:opacity-60"
            >
              <ImagePlus className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.country.replaceImage")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("admin.country.replaceImage.hint")}
                </span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => onSelectImage()}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment"
            >
              <Images className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.country.selectImage")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("admin.country.selectImage.hint")}
                </span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={openEditText}
              className="flex w-full items-start gap-3 border-t border-ink/10 px-4 py-3 text-left hover:bg-parchment"
            >
              <FilePenLine className="mt-0.5 size-4 shrink-0 text-tomato" />
              <span>
                <span className="block font-semibold text-ink">
                  {t("admin.country.editText")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("admin.country.editText.hint")}
                </span>
              </span>
            </button>
          </div>,
          document.body,
        )
      : null;

  const statusToast =
    (imageBusy || status || error) && statusPosition
      ? createPortal(
          <div
            style={{ top: statusPosition.top, left: statusPosition.left }}
            className="fixed z-[80] w-max max-w-[16rem] rounded-lg border border-ink/10 bg-cream px-3 py-2 text-sm text-ink shadow-md"
          >
            {imageBusy ? (
              <span className="inline-flex items-center gap-2 text-ink-soft">
                <LoaderCircle className="size-4 animate-spin" />
                {t("admin.country.findingImage")}
              </span>
            ) : null}
            {status ? (
              <span role="status" className="text-ink-soft">
                {status}
              </span>
            ) : null}
            {error ? (
              <span role="alert" className="text-tomato">
                {error}
              </span>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative z-30">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-full bg-cream/15 px-3 py-1.5 text-sm font-semibold text-cream ring-1 ring-cream/30 hover:bg-cream/25"
      >
        {t("admin.country.menu")}
        <ChevronDown
          className={`size-3.5 transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {menu}
      {statusToast}

      {textOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/55 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !textBusy) {
              setTextOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={textTitleId}
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-cream shadow-2xl sm:rounded-[1.75rem]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4 sm:px-6">
              <div>
                <h2
                  id={textTitleId}
                  className="font-display text-3xl leading-tight text-ink"
                >
                  {t("admin.country.editText")}
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {t("admin.country.editText.dialogHint", {
                    name: country.name,
                  })}
                </p>
              </div>
              <button
                type="button"
                disabled={textBusy}
                onClick={() => setTextOpen(false)}
                className="rounded-full p-2 text-ink-soft hover:bg-parchment hover:text-ink disabled:opacity-60"
                aria-label={t("login.closeAria")}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <form
              onSubmit={onSaveText}
              className="flex flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6"
            >
              <label className="block">
                <span className="text-sm font-medium text-ink-soft">
                  {t("admin.country.editText.field")}
                </span>
                <textarea
                  value={textDraft}
                  onChange={(event) => setTextDraft(event.target.value)}
                  required
                  minLength={20}
                  rows={8}
                  className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 text-ink outline-none ring-tomato/30 focus:ring-2"
                />
              </label>
              {textError ? (
                <p role="alert" className="text-sm font-semibold text-tomato">
                  {textError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={textBusy || textDraft.trim().length < 20}
                  className="min-h-12 rounded-full bg-tomato px-6 font-semibold text-cream hover:bg-tomato/90 disabled:opacity-60"
                >
                  {textBusy
                    ? t("admin.country.editText.saving")
                    : t("admin.country.editText.save")}
                </button>
                <button
                  type="button"
                  disabled={textBusy}
                  onClick={() => setTextOpen(false)}
                  className="min-h-12 rounded-full bg-ink/10 px-6 font-semibold text-ink disabled:opacity-60"
                >
                  {t("admin.country.editText.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
