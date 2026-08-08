import type { AuthoredCountry } from "@/types/content";

/**
 * Authored cook menus used to live here as TypeScript modules.
 * Content is now stored in Postgres — use admin tools or db:import-content.
 */
export const authoredCountries: AuthoredCountry[] = [];

/** @deprecated Use authoredCountries — kept for older imports. */
export const publishedCountries = authoredCountries;
