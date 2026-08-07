import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const trCountry: AuthoredCountry = {
  code: "tr",
  slug: "turkey",
  name: "Turkey",
  flag: "🇹🇷",
  region: "Asia/Europe",
  introduction:
    "Turkish cooking spans rich Ottoman-influenced dishes and bright Aegean vegetables. Shared meze, grilled meats, bread, and tea make a generous table.",
  cuisineAliases: ["Turkish restaurant", "Turks restaurant", "Anatolian restaurant"],
  nationalDishId: "iskender-kebab",
  nationalDrink: drink(
    "Rakı",
    "Rakı",
    "spirit",
    true,
    "An anise spirit traditionally diluted with water.",
  ),
  menu: {
    starter: r("mercimek-corbasi", "Red Lentil Soup", "Mercimek çorbası", "starter", [
      { name: "red lentils", quantity: 300, unit: "g" },
      { name: "carrot", quantity: 1, unit: "piece" },
      { name: "tomato paste", quantity: 30, unit: "g" },
    ]),
    main: r(
      "iskender-kebab",
      "Iskender Kebab",
      "İskender kebap",
      "main",
      [
        { name: "lamb strips", quantity: 700, unit: "g" },
        { name: "flatbread", quantity: 4, unit: "pieces" },
        { name: "tomato sauce", quantity: 350, unit: "ml" },
        { name: "yogurt", quantity: 300, unit: "g" },
      ],
      "Sliced grilled lamb over bread with tomato sauce, yogurt, and browned butter.",
    ),
    side: r("piyaz", "White Bean Salad", "Piyaz", "side", [
      { name: "cooked white beans", quantity: 600, unit: "g" },
      { name: "red onion", quantity: 1, unit: "piece" },
      { name: "parsley", quantity: 20, unit: "g" },
    ]),
    dessert: r("sutlac", "Rice Pudding", "Sütlaç", "dessert", [
      { name: "milk", quantity: 800, unit: "ml" },
      { name: "rice", quantity: 100, unit: "g" },
      { name: "sugar", quantity: 120, unit: "g" },
    ]),
    drink: drink(
      "Turkish Tea",
      "Çay",
      "tea",
      false,
      "Strong black tea poured into tulip-shaped glasses.",
    ),
  },
  status: "published",
};
