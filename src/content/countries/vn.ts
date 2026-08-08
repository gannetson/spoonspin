import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const vnCountry: AuthoredCountry = {
  code: "vn",
  slug: "vietnam",
  name: "Vietnam",
  flag: "🇻🇳",
  region: "Asia",
  introduction:
    "Vietnamese food balances fresh herbs, rice noodles, savoury broths, lime, and chile. Each region brings its own accent, from clear northern soups to southern sweetness.",
  cuisineAliases: ["Vietnamese restaurant", "Vietnamees restaurant", "phở restaurant"],
  nationalDishId: "pho-bo",
  nationalDrink: drink(
    "Vietnamese Coffee",
    "Cà phê sữa đá",
    "coffee",
    false,
    "Dark drip coffee over ice with condensed milk.",
  ),
  menu: {
    starter: r("goi-cuon", "Fresh Summer Rolls", "Gỏi cuốn", "starter", [
      { name: "rice paper", quantity: 12, unit: "sheets" },
      { name: "prawns", quantity: 300, unit: "g" },
      { name: "rice vermicelli", quantity: 150, unit: "g" },
    ]),
    main: r(
      "pho-bo",
      "Beef Noodle Soup",
      "Phở bò",
      "main",
      [
        { name: "beef bones", quantity: 1500, unit: "g" },
        { name: "rice noodles", quantity: 400, unit: "g" },
        { name: "beef sirloin", quantity: 400, unit: "g" },
        { name: "star anise", quantity: 4, unit: "pieces" },
      ],
      "An aromatic beef broth with rice noodles, herbs, and thinly sliced beef.",
    ),
    side: r("do-chua", "Pickled Carrot and Daikon", "Đồ chua", "side", [
      { name: "daikon", quantity: 300, unit: "g" },
      { name: "carrots", quantity: 300, unit: "g" },
      { name: "rice vinegar", quantity: 150, unit: "ml" },
    ]),
    dessert: r("che-chuoi", "Banana Coconut Pudding", "Chè chuối", "dessert", [
      { name: "bananas", quantity: 5, unit: "pieces" },
      { name: "coconut milk", quantity: 500, unit: "ml" },
      { name: "tapioca pearls", quantity: 100, unit: "g" },
    ]),
    drink: drink(
      "Lime Soda",
      "Soda chanh",
      "soft-drink",
      false,
      "Sparkling water sharply flavoured with fresh lime.",
    ),
    moreRecipes: [
      r(
        "banh-mi",
        "Vietnamese Banh Mi",
        "Bánh mì",
        "main",
        [
          { name: "baguettes", quantity: 4, unit: "pieces" },
          { name: "pork or tofu", quantity: 300, unit: "g" },
          { name: "pickled carrot and daikon", quantity: 150, unit: "g" },
          { name: "fresh coriander", quantity: 20, unit: "g" },
        ],
        {
          description:
            "Crisp baguette filled with pâté, mayo, pickled vegetables, herbs, and seasoned protein.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Bánh_mì",
        },
      ),
      r(
        "bun-cha",
        "Hanoi Bun Cha",
        "Bún chả",
        "main",
        [
          { name: "minced pork", quantity: 400, unit: "g" },
          { name: "pork belly slices", quantity: 300, unit: "g" },
          { name: "rice vermicelli", quantity: 300, unit: "g" },
          { name: "fish sauce", quantity: 60, unit: "ml" },
        ],
        {
          description:
            "Grilled pork patties and slices in a sweet-salty broth with rice noodles and herbs.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Bun_cha",
        },
      ),
      r(
        "banh-xeo",
        "Sizzling Crepes",
        "Bánh xèo",
        "starter",
        [
          { name: "rice flour", quantity: 200, unit: "g" },
          { name: "turmeric", quantity: 3, unit: "g" },
          { name: "prawns", quantity: 200, unit: "g" },
          { name: "beansprouts", quantity: 150, unit: "g" },
        ],
        {
          description:
            "Turmeric rice crepes filled with pork, prawns, and beansprouts, eaten in lettuce wraps.",
          dietaryLabels: ["contains-meat"],
          sourceUrl: "https://en.wikipedia.org/wiki/Bánh_xèo",
        },
      ),
    ],
  },
  status: "published",
};
