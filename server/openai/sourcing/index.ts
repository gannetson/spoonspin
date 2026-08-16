import { chinaRecipeSourcing } from "./china/index.ts";
import {
  defaultCommunityPreviewSystemPrompt,
  defaultDiscoverSystemPrompt,
  defaultExpandSystemPrompt,
  defaultRecipeSourcing,
} from "./default/index.ts";
import {
  normalizeSourcingContext,
  RECIPE_STORAGE_LANGUAGE,
  urlMatchesDomain,
  type RecipeSourcingContext,
  type RecipeSourcingStrategy,
} from "./types.ts";

export {
  RECIPE_STORAGE_LANGUAGE,
  normalizeSourcingContext,
  urlMatchesDomain,
  type RecipeSourcingContext,
  type RecipeSourcingPhase,
  type RecipeSourcingStrategy,
} from "./types.ts";

export { chinaRecipeSourcing } from "./china/index.ts";
export { defaultRecipeSourcing } from "./default/index.ts";

/** Registered strategies — highest priority match wins. Add new folders under `sourcing/`. */
const registeredStrategies: RecipeSourcingStrategy[] = [
  chinaRecipeSourcing,
  // Future: import { sichuanRecipeSourcing } from "./china/sichuan/index.ts";
  defaultRecipeSourcing,
];

function appendSection(base: string, extra: string | undefined): string {
  if (!extra?.trim()) return base;
  return `${base}\n${extra.trim()}`;
}

function forbiddenSourceHints(context: RecipeSourcingContext): string[] {
  const active = resolveRecipeSourcing(context);
  const hints: string[] = [];
  for (const strategy of registeredStrategies) {
    if (strategy.id === active.id) continue;
    for (const domain of strategy.sourceDomains ?? []) {
      hints.push(`Do not use ${domain} as a source for this country/region.`);
    }
  }
  return hints;
}

export function resolveRecipeSourcing(
  context: RecipeSourcingContext,
): RecipeSourcingStrategy {
  const normalized = normalizeSourcingContext(context);
  const matches = registeredStrategies
    .filter((strategy) => strategy.matches(normalized))
    .sort((a, b) => b.priority - a.priority);
  return matches[0] ?? defaultRecipeSourcing;
}

export function listRecipeSourcingStrategies(): readonly RecipeSourcingStrategy[] {
  return registeredStrategies;
}

export function sanitizeRecipeSourceUrl(
  url: string | undefined,
  context: RecipeSourcingContext,
): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;

  const active = resolveRecipeSourcing(context);
  const activeDomains = new Set(active.sourceDomains ?? []);

  for (const strategy of registeredStrategies) {
    if (strategy.id === active.id) continue;
    for (const domain of strategy.sourceDomains ?? []) {
      if (urlMatchesDomain(trimmed, domain)) return undefined;
    }
  }

  if (activeDomains.size > 0) {
    const allowed = [...activeDomains].some((domain) => urlMatchesDomain(trimmed, domain));
    // Allow non-domain URLs (generic cookbooks, Wikipedia, etc.) for specialized strategies too.
    const isRestrictedDomain = registeredStrategies.some((strategy) =>
      (strategy.sourceDomains ?? []).some((domain) => urlMatchesDomain(trimmed, domain)),
    );
    if (isRestrictedDomain && !allowed) return undefined;
  }

  return trimmed;
}

function composeSystemPrompt(
  context: RecipeSourcingContext,
  phase: "discover" | "expand" | "communityPreview",
): string {
  const normalized = normalizeSourcingContext(context);
  const strategy = resolveRecipeSourcing(normalized);

  let base: string;
  let extra: string | undefined;
  if (phase === "discover") {
    base = defaultDiscoverSystemPrompt(normalized);
    extra = strategy.discoverSystemExtra?.(normalized);
  } else if (phase === "expand") {
    base = defaultExpandSystemPrompt(normalized);
    extra = strategy.expandSystemExtra?.(normalized);
  } else {
    base = defaultCommunityPreviewSystemPrompt(normalized);
    extra = strategy.communityPreviewSystemExtra?.(normalized);
  }

  let prompt = appendSection(base, extra);
  const forbidden = forbiddenSourceHints(normalized);
  if (strategy.id === defaultRecipeSourcing.id && forbidden.length > 0) {
    prompt = appendSection(prompt, forbidden.join("\n"));
  }
  return prompt;
}

export function recipeDiscoverSystemPrompt(context: RecipeSourcingContext | string): string {
  const ctx =
    typeof context === "string" ? normalizeSourcingContext({ countryCode: context }) : context;
  return composeSystemPrompt(ctx, "discover");
}

export function recipeExpandSystemPrompt(context: RecipeSourcingContext | string): string {
  const ctx =
    typeof context === "string" ? normalizeSourcingContext({ countryCode: context }) : context;
  return composeSystemPrompt(ctx, "expand");
}

export function communityRecipePreviewSystemPrompt(
  context: RecipeSourcingContext | string,
): string {
  const ctx =
    typeof context === "string" ? normalizeSourcingContext({ countryCode: context }) : context;
  return composeSystemPrompt(ctx, "communityPreview");
}

/** @deprecated Use communityRecipePreviewSystemPrompt */
export function communityRecipePreviewSystemExtra(
  context: RecipeSourcingContext | string,
): string {
  const ctx =
    typeof context === "string" ? normalizeSourcingContext({ countryCode: context }) : context;
  const strategy = resolveRecipeSourcing(ctx);
  return strategy.communityPreviewSystemExtra?.(ctx) ?? forbiddenSourceHints(ctx).join("\n");
}

export function recipeDiscoverUserExtra(context: RecipeSourcingContext | string): string {
  const ctx =
    typeof context === "string" ? normalizeSourcingContext({ countryCode: context }) : context;
  return resolveRecipeSourcing(ctx).discoverUserExtra?.(ctx) ?? "";
}

export function sourcingContextFromCountry(
  countryCode: string,
  options?: { regionId?: string; regionName?: string },
): RecipeSourcingContext {
  return normalizeSourcingContext({
    countryCode,
    regionId: options?.regionId,
    regionName: options?.regionName,
  });
}
