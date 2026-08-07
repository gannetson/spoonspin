import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const lbCountry: AuthoredCountry = {
  code: "lb",
  slug: "lebanon",
  name: "Lebanon",
  flag: "🇱🇧",
  region: "Middle East",
  introduction:
    "Lebanese food is vivid with lemon, garlic, herbs, olive oil, and grilled flavours. Meze culture turns a meal into a varied communal spread.",
  cuisineAliases: [
    "Lebanese restaurant",
    "Libanees restaurant",
    "Middle Eastern restaurant",
  ],
  nationalDishId: "kibbeh",
  nationalDrink: drink(
    "Arak",
    "عرق",
    "spirit",
    true,
    "A clear anise spirit, usually mixed with cool water.",
  ),
  menu: {
    starter: r("hummus", "Hummus", "حمص", "starter", [
      { name: "cooked chickpeas", quantity: 600, unit: "g" },
      { name: "tahini", quantity: 100, unit: "g" },
      { name: "lemon", quantity: 2, unit: "pieces" },
    ]),
    main: r(
      "kibbeh",
      "Kibbeh",
      "كبة",
      "main",
      [
        { name: "ground lamb", quantity: 600, unit: "g" },
        { name: "fine bulgur", quantity: 250, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "pine nuts", quantity: 60, unit: "g" },
      ],
      "Bulgur and lamb shells wrapped around a warmly spiced meat filling.",
    ),
    side: r("fattoush", "Fattoush", "فتوش", "side", [
      { name: "romaine lettuce", quantity: 250, unit: "g" },
      { name: "tomatoes", quantity: 300, unit: "g" },
      { name: "pita bread", quantity: 2, unit: "pieces" },
      { name: "sumac", quantity: 8, unit: "g" },
    ]),
    dessert: r("muhallabieh", "Milk Pudding", "مهلبية", "dessert", [
      { name: "milk", quantity: 750, unit: "ml" },
      { name: "cornstarch", quantity: 45, unit: "g" },
      { name: "orange blossom water", quantity: 15, unit: "ml" },
    ]),
    drink: drink(
      "Jallab",
      "جلاب",
      "soft-drink",
      false,
      "A sweet date-and-grape drink often topped with pine nuts.",
    ),
  },
  status: "published",
};
