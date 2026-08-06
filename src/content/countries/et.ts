import type { Country } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const etCountry: Country = {
  code: "et",
  slug: "ethiopia",
  name: "Ethiopia",
  flag: "🇪🇹",
  region: "Africa",
  introduction:
    "Ethiopian food centres on shared platters of sour injera and deeply spiced stews. Berbere, legumes, and slow cooking give its dishes warmth and depth.",
  cuisineAliases: [
    "Ethiopian restaurant",
    "Ethiopisch restaurant",
    "East African restaurant",
  ],
  nationalDishId: "doro-wat",
  nationalDrink: drink(
    "Tej",
    "ጠጅ",
    "wine",
    true,
    "A lightly sparkling honey wine served in a rounded glass.",
  ),
  menu: {
    starter: r("injera", "Injera", "እንጀራ", "starter", [
      { name: "teff flour", quantity: 400, unit: "g" },
      { name: "water", quantity: 600, unit: "ml" },
      { name: "sourdough starter", quantity: 30, unit: "g" },
    ]),
    main: r(
      "doro-wat",
      "Chicken Doro Wat",
      "ዶሮ ወጥ",
      "main",
      [
        { name: "chicken legs", quantity: 8, unit: "pieces" },
        { name: "onions", quantity: 700, unit: "g" },
        { name: "berbere", quantity: 35, unit: "g" },
        { name: "eggs", quantity: 4, unit: "pieces" },
      ],
      "A celebrated slow-cooked chicken and egg stew, richly seasoned with berbere.",
    ),
    side: r("misir-wat", "Red Lentil Wat", "ምስር ወጥ", "side", [
      { name: "red lentils", quantity: 350, unit: "g" },
      { name: "onion", quantity: 2, unit: "pieces" },
      { name: "berbere", quantity: 20, unit: "g" },
    ]),
    dessert: r("dabo-kolo", "Spiced Crunchy Bites", "ዳቦ ቆሎ", "dessert", [
      { name: "flour", quantity: 250, unit: "g" },
      { name: "butter", quantity: 50, unit: "g" },
      { name: "berbere", quantity: 3, unit: "g" },
    ]),
    drink: drink(
      "Ethiopian Coffee",
      "ቡና",
      "coffee",
      false,
      "Freshly roasted, brewed coffee served in small cups.",
    ),
  },
  status: "published",
};
