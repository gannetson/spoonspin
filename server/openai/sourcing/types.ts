/** Language used for recipe text stored in Postgres (UI + cook mode). */
export const RECIPE_STORAGE_LANGUAGE = "English";

/** Context passed when resolving recipe sourcing for OpenAI prompts. */
export type RecipeSourcingContext = {
  countryCode: string;
  /** Optional DB region id (e.g. cn:CN-SC) for future region-specific sourcing. */
  regionId?: string;
  /** Optional display region name. */
  regionName?: string;
};

export type RecipeSourcingPhase = "discover" | "expand" | "communityPreview";

/**
 * Country- or region-specific recipe sourcing for OpenAI discover/expand flows.
 * Add implementations under `sourcing/<country-or-region>/` and register them.
 */
export interface RecipeSourcingStrategy {
  /** Stable id (e.g. "default", "china", "china-sichuan"). */
  id: string;
  /** Higher priority wins when multiple strategies match. */
  priority: number;
  matches(context: RecipeSourcingContext): boolean;
  /** Hostnames this strategy may cite in sourceUrl. */
  sourceDomains?: string[];
  discoverSystemExtra?(context: RecipeSourcingContext): string | undefined;
  expandSystemExtra?(context: RecipeSourcingContext): string | undefined;
  communityPreviewSystemExtra?(context: RecipeSourcingContext): string | undefined;
  /** Extra lines appended to the user prompt during discover. */
  discoverUserExtra?(context: RecipeSourcingContext): string | undefined;
}

export function normalizeSourcingContext(
  context: RecipeSourcingContext,
): RecipeSourcingContext {
  return {
    ...context,
    countryCode: context.countryCode.trim().toLowerCase(),
    regionId: context.regionId?.trim() || undefined,
    regionName: context.regionName?.trim() || undefined,
  };
}

export function urlMatchesDomain(url: string, domain: string): boolean {
  const normalizedDomain = domain.toLowerCase().replace(/^\./, "");
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === normalizedDomain || host.endsWith(`.${normalizedDomain}`);
  } catch {
    return url.toLowerCase().includes(normalizedDomain);
  }
}
