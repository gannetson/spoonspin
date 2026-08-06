import type { Country } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const vnCountry: Country = {
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
  },
  status: "published",
};
