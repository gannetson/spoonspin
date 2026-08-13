import { useId } from "react";
import { MapPin, Navigation } from "lucide-react";
import { useT } from "@/i18n/LocaleContext";

type DineLocationControlProps = {
  cityOrPostcode: string;
  onCityChange: (value: string) => void;
  rememberCity: boolean;
  onRememberChange: (value: boolean) => void;
  showForm: boolean;
  onEdit: () => void;
  onSubmit: () => void;
  onUseMyLocation: () => void;
  locationError?: string | null;
  /** Collapsed summary key; receives { location }. */
  summaryKey?: string;
  /** Primary form button label key. */
  submitKey?: string;
};

export function DineLocationControl({
  cityOrPostcode,
  onCityChange,
  rememberCity,
  onRememberChange,
  showForm,
  onEdit,
  onSubmit,
  onUseMyLocation,
  locationError = null,
  summaryKey = "dine.searchingNear",
  submitKey = "dine.searchRestaurants",
}: DineLocationControlProps) {
  const t = useT();
  const inputId = useId();
  const rememberId = useId();

  return (
    <div className="space-y-3">
      {!showForm ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 ring-1 ring-ink/10">
          <p className="inline-flex items-center gap-2 text-sm text-ink">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            <span>{t(summaryKey, { location: cityOrPostcode })}</span>
          </p>
          <button
            type="button"
            onClick={onEdit}
            className="min-h-10 rounded-full border border-ink/20 px-4 text-sm font-semibold text-ink hover:border-tomato hover:text-tomato"
          >
            {t("dine.changeLocation")}
          </button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3 rounded-2xl bg-cream p-4 ring-1 ring-ink/10"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor={inputId}
                className="text-sm font-semibold text-ink"
              >
                {t("dine.cityOrPostcode")}
              </label>
              <input
                id={inputId}
                name="location"
                value={cityOrPostcode}
                onChange={(event) => onCityChange(event.target.value)}
                placeholder={t("dine.cityOrPostcode.placeholder")}
                className="mt-1 min-h-12 w-full rounded-xl border border-ink/20 bg-white px-3 text-ink"
                autoComplete="address-level2"
              />
            </div>
            <button
              type="submit"
              className="min-h-12 rounded-full bg-tomato px-6 font-semibold text-cream hover:bg-tomato-deep"
            >
              {t(submitKey)}
            </button>
            <button
              type="button"
              onClick={onUseMyLocation}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-ink/20 px-5 font-semibold text-ink hover:border-tomato hover:text-tomato"
            >
              <Navigation aria-hidden="true" className="size-4" />
              {t("dine.useMyLocation")}
            </button>
          </div>
          <label
            htmlFor={rememberId}
            className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink"
          >
            <input
              id={rememberId}
              type="checkbox"
              checked={rememberCity}
              onChange={(event) => onRememberChange(event.target.checked)}
              className="size-4 rounded border-ink/30"
            />
            {t("dine.rememberCity")}
          </label>
        </form>
      )}

      {locationError ? (
        <p role="alert" className="text-sm text-tomato">
          {locationError}
        </p>
      ) : null}
    </div>
  );
}
