/** Curated Unsplash photos for recipes, kitchens, and restaurants. */

const u = (id: string, params = "w=1400&q=80&auto=format&fit=crop") =>
  `https://images.unsplash.com/${id}?${params}`;

export const images = {
  /** Full-bleed home hero — worldly grilled meze / market feast */
  hero: u("photo-1555939594-58d7cb561ad1", "w=2000&q=80&auto=format&fit=crop"),
  /** Cook mode — hands preparing food */
  cook: u("photo-1556910103-1c02745aae4d"),
  /** Dine mode — restaurant dining room */
  dine: u("photo-1517248135467-4c7edcad34c4"),
  /** Order mode — delivery / takeaway */
  order: u("photo-1526367796308-acf70ce50b94"),
  /** Country / cuisine atmosphere */
  cuisine: u("photo-1504674900247-0877df9cc836"),
  recipes: {
    starter: u("photo-1540189549336-e6e99c3679fe", "w=900&q=80&auto=format&fit=crop"),
    main: u("photo-1621996346565-e3dbc646d9a9", "w=900&q=80&auto=format&fit=crop"),
    side: u("photo-1546069901-ba9599a7e63c", "w=900&q=80&auto=format&fit=crop"),
    dessert: u("photo-1551024506-0bccd828d307", "w=900&q=80&auto=format&fit=crop"),
    snack: u("photo-1565299624946-b28f40a0ae38", "w=900&q=80&auto=format&fit=crop"),
  },
  /** Restaurant interiors for dine results */
  restaurants: [
    u("photo-1559339352-11d035aa65de", "w=600&q=75&auto=format&fit=crop"),
    u("photo-1466978913421-dad2ebd01d17", "w=600&q=75&auto=format&fit=crop"),
    u("photo-1424847651672-bf20a4b0982b", "w=600&q=75&auto=format&fit=crop"),
    u("photo-1552566626-52f8b828add9", "w=600&q=75&auto=format&fit=crop"),
  ],
} as const;

export type RecipeImageCategory = keyof typeof images.recipes;

export function recipeImageFor(category: RecipeImageCategory): string {
  return images.recipes[category];
}

export function restaurantImageFor(index: number): string {
  return images.restaurants[index % images.restaurants.length]!;
}
