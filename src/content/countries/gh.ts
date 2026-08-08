import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const ghCountry: AuthoredCountry = {
  code: "gh",
  slug: "ghana",
  name: "Ghana",
  flag: "🇬🇭",
  region: "Africa",
  introduction:
    "Ghanaian cooking is bold and comforting: tomato-based stews, grilled meat, plantain, and staples like fufu or banku. Street snacks such as kelewele sit beside slow weekend soups.",
  cuisineAliases: [
    "Ghanaian restaurant",
    "Ghanees restaurant",
    "West African restaurant",
  ],
  nationalDishId: "fufu-light-soup",
  nationalDrink: drink(
    "Sobolo",
    "Sobolo",
    "soft-drink",
    false,
    "Deep-red hibiscus cooler steeped with ginger, cloves, and pineapple — non-alcoholic and widely sold street-side.",
  ),
  menu: {
    starter: r(
      "kelewele",
      "Spiced Fried Plantain",
      "Kelewele",
      "starter",
      [
        { name: "ripe plantains", quantity: 4, unit: "pieces" },
        { name: "fresh ginger", quantity: 30, unit: "g" },
        { name: "garlic", quantity: 2, unit: "cloves" },
        { name: "cayenne or chili powder", quantity: 5, unit: "g" },
        { name: "ground cloves", quantity: 1, unit: "g" },
        { name: "oil", quantity: 400, unit: "ml", note: "for frying" },
      ],
      [
        "1. Peel plantains and cut into bite-size chunks; grate ginger and garlic into a paste with salt, cayenne, and cloves.",
        "2. Toss the plantain in the spice paste and rest 10–15 minutes.",
        "3. Deep-fry in hot oil until caramelised at the edges and cooked through; drain on paper.",
      ],
      {
        description:
          "Cubes of ripe plantain fried with ginger, garlic, and chili — Ghana's iconic street snack starter.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 20,
        cookMinutes: 15,
        difficulty: "easy",
        substitutions: [
          "Very ripe plantains from Surinamese or African shops are best; underripe ones stay starchy.",
        ],
      },
    ),
    main: r(
      "fufu-light-soup",
      "Fufu with Light Soup",
      "Fufu ne Nkra Nkwan",
      "main",
      [
        { name: "chicken pieces", quantity: 900, unit: "g" },
        { name: "tomato", quantity: 4, unit: "pieces" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "fresh ginger", quantity: 40, unit: "g" },
        { name: "garlic", quantity: 4, unit: "cloves" },
        { name: "Scotch bonnet or hot chile", quantity: 1, unit: "piece" },
        { name: "tomato paste", quantity: 30, unit: "g" },
        { name: "fufu flour or pounded plantain/cassava mix", quantity: 400, unit: "g" },
      ],
      [
        "1. Blend tomato, onion, ginger, garlic, and chile; simmer with chicken, tomato paste, and salt until the chicken is tender and the broth tastes bright.",
        "2. Skim excess fat; adjust heat with more chile if desired — the soup should stay relatively clear and peppery.",
        "3. Whisk fufu flour into boiling water (or follow pack directions) until a smooth, stretchy dough forms; shape into balls.",
        "4. Serve fufu in bowls with ladlefuls of light soup and chicken.",
      ],
      {
        description:
          "Stretchy fufu balls dunked in a peppery tomato-ginger chicken soup — one of Ghana's most widely recognised home meals.",
        dietaryLabels: ["contains-meat", "gluten-free", "dairy-free"],
        prepMinutes: 25,
        cookMinutes: 55,
        difficulty: "medium",
        substitutions: [
          "Fufu flour (plantain/cassava) is sold in West African shops; goat or fish also suit light soup.",
        ],
      },
    ),
    side: r(
      "red-red",
      "Red Red Beans",
      "Red Red",
      "side",
      [
        { name: "black-eyed peas or cowpeas", quantity: 300, unit: "g", note: "dried, soaked" },
        { name: "palm oil or red palm oil", quantity: 60, unit: "ml" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "tomato", quantity: 3, unit: "pieces" },
        { name: "tomato paste", quantity: 30, unit: "g" },
        { name: "fresh ginger", quantity: 15, unit: "g" },
        { name: "smoked fish or stock cube", quantity: 50, unit: "g", note: "optional" },
      ],
      [
        "1. Simmer soaked beans until soft; drain, reserving some cooking liquid.",
        "2. Soften onion in palm oil, add grated ginger, chopped tomato, and paste; cook until thick and red.",
        "3. Fold in beans with a little liquid and smoked fish if using; simmer until creamy and well seasoned.",
      ],
      {
        description:
          "Bean stew cooked in palm oil until richly red, often paired with fried plantain.",
        dietaryLabels: ["gluten-free"],
        prepMinutes: 15,
        cookMinutes: 60,
        difficulty: "easy",
        substitutions: [
          "Tinned black-eyed peas save time; palm oil is in African shops — use a mix of oil and paprika if needed.",
        ],
      },
    ),
    dessert: r(
      "bofrot",
      "Bofrot Doughnuts",
      "Bofrot / Puff-Puff",
      "dessert",
      [
        { name: "plain flour", quantity: 300, unit: "g" },
        { name: "sugar", quantity: 60, unit: "g" },
        { name: "instant yeast", quantity: 7, unit: "g" },
        { name: "warm water", quantity: 200, unit: "ml" },
        { name: "nutmeg", quantity: 2, unit: "g" },
        { name: "oil", quantity: 1, unit: "litre", note: "for frying" },
      ],
      [
        "1. Mix flour, sugar, yeast, nutmeg, and salt; stir in warm water to a thick sticky batter and rise 45 minutes.",
        "2. Scoop spoonfuls of batter into hot oil (about 170°C), turning until deep golden.",
        "3. Drain well; dust lightly with sugar if you like and serve warm.",
      ],
      {
        description:
          "Airy deep-fried dough balls scented with nutmeg — a sweet Ghanaian street favourite.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 20,
        cookMinutes: 20,
        difficulty: "easy",
      },
    ),
    drink: drink(
      "Asana",
      "Asana",
      "soft-drink",
      false,
      "Fermented corn drink that is traditionally non-alcoholic when lightly fermented and served chilled.",
    ),
    moreDrinks: [
      drink(
        "Palm Wine",
        "Nsafufuo",
        "wine",
        true,
        "Fresh sap from palm trees that ferments quickly and contains alcohol; flavour ranges from sweet to sharp.",
      ),
      drink(
        "Club Beer-style Lager",
        "Club",
        "beer",
        true,
        "Ghanaian lager that contains alcohol; serve ice-cold with grilled meat and spicy stews.",
      ),
    ],
    moreRecipes: [
      r(
        "jollof-rice",
        "Ghanaian Jollof Rice",
        "Jollof",
        "main",
        [
          { name: "long-grain rice", quantity: 400, unit: "g" },
          { name: "tomato", quantity: 5, unit: "pieces" },
          { name: "onion", quantity: 2, unit: "pieces" },
          { name: "tomato paste", quantity: 60, unit: "g" },
          { name: "vegetable oil", quantity: 60, unit: "ml" },
          { name: "curry powder", quantity: 10, unit: "g" },
          { name: "thyme", quantity: 3, unit: "g" },
          { name: "stock", quantity: 600, unit: "ml" },
        ],
        [
          "1. Blend tomato and onion; fry the puree with tomato paste in oil until the oil separates and the sauce darkens.",
          "2. Season with curry powder, thyme, and salt; stir in rinsed rice to coat.",
          "3. Add hot stock, cover tightly, and steam on low until the rice is tender and smoky-red.",
          "4. Fluff and rest 5 minutes before serving with chicken or fried plantain.",
        ],
        {
          description:
            "Party-style one-pot rice cooked in a reduced tomato-pepper base — Ghana's proud take on West African jollof.",
          dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
          prepMinutes: 20,
          cookMinutes: 45,
          difficulty: "medium",
        },
      ),
    ],
  },
  status: "published",
};
