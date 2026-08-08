import type { SpecialtyShop } from "@/types/content";

/**
 * Specialty shops live on country rows in Postgres (`specialty_shops` JSONB).
 * This module is kept only as an empty fallback for offline helpers.
 */
export const specialtyShopsByCountry: Record<string, SpecialtyShop[]> = {};

export function specialtyShopsFor(_countryCode: string): SpecialtyShop[] {
  return [];
}
