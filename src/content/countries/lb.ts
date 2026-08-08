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
    moreRecipes: [
      r(
        "tabbouleh",
        "Parsley Tabbouleh",
        "تبولة",
        "side",
        [
          { name: "flat-leaf parsley", quantity: 150, unit: "g" },
          { name: "tomatoes", quantity: 3, unit: "pieces" },
          { name: "fine bulgur", quantity: 40, unit: "g" },
          { name: "lemons", quantity: 2, unit: "pieces" },
        ],
        {
          description:
            "A herb-forward salad of parsley, mint, tomato, and fine bulgur dressed with lemon.",
          dietaryLabels: ["vegetarian", "vegan"],
          sourceUrl: "https://en.wikipedia.org/wiki/Tabbouleh",
        },
      ),
      r(
        "shawarma",
        "Chicken Shawarma",
        "شاورما دجاج",
        "main",
        [
          { name: "chicken thighs", quantity: 800, unit: "g" },
          { name: "shawarma spice mix", quantity: 30, unit: "g" },
          { name: "yogurt", quantity: 100, unit: "g" },
          { name: "flatbreads", quantity: 8, unit: "pieces" },
        ],
        {
          description:
            "Spice-rubbed chicken roasted until caramelised, carved into warm flatbread wraps.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Shawarma",
        },
      ),
      r(
        "maamoul",
        "Date-Filled Cookies",
        "معمول",
        "dessert",
        [
          { name: "semolina", quantity: 300, unit: "g" },
          { name: "butter", quantity: 150, unit: "g" },
          { name: "date paste", quantity: 250, unit: "g" },
          { name: "orange blossom water", quantity: 15, unit: "ml" },
        ],
        {
          description:
            "Shortbread-like cookies filled with dates or nuts, pressed in decorative moulds.",
          dietaryLabels: ["vegetarian"],
          sourceUrl: "https://en.wikipedia.org/wiki/Maamoul",
        },
      ),
    ],
  },
  status: "published",
};
