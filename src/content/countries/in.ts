import type { Country } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const inCountry: Country = {
  code: "in",
  slug: "india",
  name: "India",
  flag: "🇮🇳",
  region: "Asia",
  introduction:
    "India's cuisines are extraordinarily diverse, connected by spice craft and regional ingredients. Lentils, breads, rice, vegetables, and aromatic curries make its food both everyday and celebratory.",
  cuisineAliases: ["Indian restaurant", "Indiaas restaurant", "curry restaurant"],
  nationalDishId: "butter-chicken",
  nationalDrink: drink(
    "Masala Chai",
    "मसाला चाय",
    "tea",
    false,
    "Spiced black tea simmered with milk.",
  ),
  menu: {
    starter: r("samosa", "Samosas", "समोसा", "starter", [
      { name: "potatoes", quantity: 600, unit: "g" },
      { name: "peas", quantity: 200, unit: "g" },
      { name: "samosa pastry", quantity: 8, unit: "sheets" },
    ]),
    main: r(
      "butter-chicken",
      "Butter Chicken",
      "Murgh makhani",
      "main",
      [
        { name: "chicken thighs", quantity: 800, unit: "g" },
        { name: "tomato passata", quantity: 500, unit: "ml" },
        { name: "butter", quantity: 70, unit: "g" },
        { name: "cream", quantity: 150, unit: "ml" },
      ],
      "A widely loved creamy tomato chicken curry with warm spices.",
    ),
    side: r("jeera-rice", "Cumin Rice", "Jeera chawal", "side", [
      { name: "basmati rice", quantity: 350, unit: "g" },
      { name: "cumin seeds", quantity: 8, unit: "g" },
      { name: "ghee", quantity: 25, unit: "g" },
    ]),
    dessert: r("gulab-jamun", "Milk Dumplings", "Gulab jamun", "dessert", [
      { name: "milk powder", quantity: 200, unit: "g" },
      { name: "sugar", quantity: 300, unit: "g" },
      { name: "cardamom", quantity: 5, unit: "g" },
    ]),
    drink: drink(
      "Mango Lassi",
      "मैंगो लस्सी",
      "soft-drink",
      false,
      "Yogurt blended smooth with ripe mango.",
    ),
  },
  status: "published",
};
