import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const etCountry: AuthoredCountry = {
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
    starter: r(
      "injera",
      "Injera",
      "እንጀራ",
      "starter",
      [
        { name: "teff flour", quantity: 400, unit: "g" },
        { name: "water", quantity: 700, unit: "ml" },
        { name: "active dry yeast", quantity: 5, unit: "g", note: "or 30 g sourdough starter" },
        { name: "salt", quantity: 5, unit: "g" },
      ],
      [
        "1. Whisk teff flour with water and yeast into a thin batter; ferment at room temperature 24–48 hours until bubbly and sour.",
        "2. Stir in salt; the batter should pour like thin pancake mix.",
        "3. Heat a non-stick pan, pour a thin spiral from the outside in, cover, and steam until the surface is full of eyes and set (do not flip).",
        "4. Cool on a clean cloth and use as a platter and edible utensil for stews.",
      ],
      {
        description:
          "Sour, spongy teff flatbread used as both plate and scoop for stews.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 30,
        cookMinutes: 40,
        difficulty: "challenging",
        substitutions: [
          "Teff flour is sold in health and African shops; a mix of teff and wheat flour is an easier starter ferment.",
        ],
      },
    ),
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
        { name: "niter kibbeh or butter", quantity: 60, unit: "g" },
        { name: "garlic", quantity: 4, unit: "cloves" },
        { name: "ginger", quantity: 20, unit: "g" },
      ],
      [
        "1. Soften finely chopped onions slowly in a dry pan until deeply reduced, then add niter kibbeh.",
        "2. Stir in berbere, garlic, and ginger; cook until the spice paste smells rich and dark.",
        "3. Add chicken and a splash of water; simmer covered until the meat is tender and the sauce thick.",
        "4. Nestle in hard-boiled eggs for the last 10 minutes and serve over injera.",
      ],
      {
        description:
          "A celebrated slow-cooked chicken and egg stew, richly seasoned with berbere.",
        dietaryLabels: ["contains-meat", "gluten-free"],
        prepMinutes: 30,
        cookMinutes: 75,
        difficulty: "medium",
        substitutions: [
          "Berbere spice blends are sold in African shops; niter kibbeh can be approximated with butter plus mild spices.",
        ],
      },
    ),
    side: r(
      "misir-wat",
      "Red Lentil Wat",
      "ምስር ወጥ",
      "side",
      [
        { name: "red lentils", quantity: 350, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "berbere", quantity: 20, unit: "g" },
        { name: "tomato paste", quantity: 30, unit: "g" },
        { name: "oil or niter kibbeh", quantity: 40, unit: "ml" },
      ],
      [
        "1. Cook down chopped onion in oil until soft and sweet.",
        "2. Add berbere and tomato paste; fry briefly until fragrant.",
        "3. Stir in rinsed lentils and water; simmer until thick and spoonable, stirring so they do not catch.",
        "4. Season with salt and serve warm with injera.",
      ],
      {
        description:
          "Everyday red-lentil stew thickened with onion and berbere spice.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 35,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "dabo-kolo",
      "Spiced Crunchy Bites",
      "ዳቦ ቆሎ",
      "dessert",
      [
        { name: "plain flour", quantity: 250, unit: "g" },
        { name: "butter", quantity: 50, unit: "g" },
        { name: "berbere", quantity: 3, unit: "g" },
        { name: "sugar", quantity: 20, unit: "g" },
        { name: "water", quantity: 80, unit: "ml" },
      ],
      [
        "1. Rub butter into flour with berbere, sugar, and salt; add water to a firm dough.",
        "2. Roll into thin ropes and cut into small bite-size pieces.",
        "3. Bake at 180°C, shaking the tray once, until dry and crunchy.",
        "4. Cool completely before storing in an airtight tin.",
      ],
      {
        description:
          "Small crunchy spiced dough bites for snacking with coffee.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 20,
        cookMinutes: 25,
        difficulty: "easy",
      },
    ),
    drink: drink(
      "Ethiopian Coffee",
      "ቡና",
      "coffee",
      false,
      "Freshly roasted, brewed coffee served in small cups.",
    ),
    moreRecipes: [
      r(
        "tibs",
        "Sautéed Beef Tibs",
        "ጥብስ",
        "main",
        [
          { name: "beef sirloin", quantity: 600, unit: "g" },
          { name: "onion", quantity: 2, unit: "pieces" },
          { name: "berbere", quantity: 15, unit: "g" },
          { name: "fresh rosemary", quantity: 5, unit: "g" },
          { name: "clarified butter or oil", quantity: 40, unit: "ml" },
        ],
        [
          "1. Cut beef into bite-size pieces and season with salt.",
          "2. Sear hard in hot fat in batches so the meat browns rather than steams.",
          "3. Soften onion in the pan, return the beef with berbere and rosemary, and toss until just cooked.",
          "4. Serve sizzling with injera.",
        ],
        {
          description:
            "Quick-seared beef with onion, rosemary, and berbere, served sizzling with injera.",
          dietaryLabels: ["contains-meat", "gluten-free"],
          prepMinutes: 15,
          cookMinutes: 15,
          difficulty: "easy",
        },
      ),
      r(
        "shiro",
        "Chickpea Shiro Stew",
        "ሽሮ",
        "side",
        [
          { name: "shiro flour or chickpea flour", quantity: 150, unit: "g" },
          { name: "onion", quantity: 1, unit: "piece" },
          { name: "tomato", quantity: 1, unit: "piece" },
          { name: "niter kibbeh or oil", quantity: 40, unit: "ml" },
          { name: "berbere", quantity: 10, unit: "g" },
        ],
        [
          "1. Soften onion in fat, then add tomato and berbere until saucy.",
          "2. Whisk chickpea flour into hot water to avoid lumps, then pour into the pan.",
          "3. Simmer, stirring often, until thick, silky, and the raw flour taste is gone.",
          "4. Season and serve with injera.",
        ],
        {
          description:
            "Silky spiced chickpea-flour stew that is everyday comfort across Ethiopia.",
          dietaryLabels: ["vegetarian", "vegan"],
          prepMinutes: 10,
          cookMinutes: 25,
          difficulty: "easy",
          substitutions: [
            "Chickpea (besan) flour from Indian shops works when shiro mix is unavailable.",
          ],
        },
      ),
      r(
        "genfo",
        "Barley Porridge",
        "ገንፎ",
        "dessert",
        [
          { name: "barley flour", quantity: 250, unit: "g" },
          { name: "water", quantity: 600, unit: "ml" },
          { name: "niter kibbeh or butter", quantity: 60, unit: "g" },
          { name: "berbere", quantity: 5, unit: "g" },
        ],
        [
          "1. Whisk barley flour into boiling water and cook, stirring hard, until very thick.",
          "2. Shape into a mound and press a well in the centre.",
          "3. Melt butter with berbere and pour into the well.",
          "4. Scoop from the edges into the spiced butter while eating.",
        ],
        {
          description:
            "Thick barley porridge shaped into a well and filled with spiced butter.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 5,
          cookMinutes: 20,
          difficulty: "easy",
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Tej Honey Wine",
        "ጠጅ",
        "wine",
        true,
        "Home-style or bottled honey wine with a soft floral sweetness.",
      ),
      drink(
        "Spiced Tea",
        "ሻይ",
        "tea",
        false,
        "Black tea simmered with ginger, cloves, and a little sugar.",
      ),
    ],
  },
  status: "published",
};
