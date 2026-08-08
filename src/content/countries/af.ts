import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const afCountry: AuthoredCountry = {
  code: "af",
  slug: "afghanistan",
  name: "Afghanistan",
  flag: "🇦🇫",
  region: "Asia",
  introduction:
    "Afghan cooking centres on fragrant rice, yogurt, flatbread, and gently spiced stews. Shared tables often feature Kabuli pulao, bolani, and green tea alongside generous plates of meat and herbs.",
  cuisineAliases: [
    "Afghan restaurant",
    "Afghaans restaurant",
    "Kabuli restaurant",
  ],
  nationalDishId: "kabuli-pulao",
  nationalDrink: drink(
    "Green Tea",
    "Chai sabz",
    "tea",
    false,
    "Lightly sweetened green tea served throughout the day with meals and guests.",
  ),
  menu: {
    starter: r(
      "bolani",
      "Bolani",
      "بولانی",
      "starter",
      [
        { name: "plain flour", quantity: 350, unit: "g" },
        { name: "potato", quantity: 400, unit: "g" },
        { name: "spring onions", quantity: 4, unit: "pieces" },
        { name: "fresh coriander", quantity: 20, unit: "g" },
        { name: "oil", quantity: 60, unit: "ml", note: "for frying" },
      ],
      [
        "1. Knead flour, salt, and warm water into a soft dough; rest 20 minutes under a cloth.",
        "2. Boil and mash the potatoes with chopped spring onion, coriander, salt, and a pinch of pepper.",
        "3. Roll dough into thin rounds, spread filling on half, fold and seal the edge firmly.",
        "4. Pan-fry in a thin film of oil until blistered and golden on both sides; serve with yogurt.",
      ],
      {
        description:
          "Crisp stuffed flatbreads filled with herbed mashed potato, widely loved as an Afghan starter or snack.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 30,
        cookMinutes: 25,
        difficulty: "medium",
        substitutions: [
          "Spinach or leek fillings are common; Dutch spring onions and coriander work well.",
        ],
      },
    ),
    main: r(
      "kabuli-pulao",
      "Kabuli Pulao",
      "قابلی پلو",
      "main",
      [
        { name: "basmati rice", quantity: 400, unit: "g" },
        { name: "lamb shoulder", quantity: 700, unit: "g" },
        { name: "carrot", quantity: 3, unit: "pieces" },
        { name: "raisins", quantity: 80, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "oil or ghee", quantity: 60, unit: "ml" },
        { name: "ground cumin", quantity: 5, unit: "g" },
        { name: "cardamom pods", quantity: 4, unit: "pieces" },
      ],
      [
        "1. Brown the onion in oil, add lamb, salt, cumin, and cardamom; cover with water and simmer until tender.",
        "2. Remove the meat, strain and reserve the broth; rinse and soak the rice for 20 minutes.",
        "3. Parboil the rice until almost cooked, drain, then layer with meat in a heavy pot and steam on low with a splash of broth.",
        "4. Separately fry julienned carrot with raisins until glossy; pile over the rice to serve.",
      ],
      {
        description:
          "Afghanistan's best-known celebratory rice: lamb, sweet carrot, and raisins over fragrant basmati.",
        dietaryLabels: ["contains-meat", "gluten-free", "dairy-free"],
        prepMinutes: 30,
        cookMinutes: 90,
        difficulty: "medium",
        substitutions: [
          "Beef chuck works when lamb is scarce; Dutch supermarket basmati is fine.",
          "A pinch of sugar on the carrots helps if the raisins are very tart.",
        ],
      },
    ),
    side: r(
      "sabzi",
      "Spinach with Garlic",
      "سبزی",
      "side",
      [
        { name: "spinach", quantity: 500, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "garlic", quantity: 3, unit: "cloves" },
        { name: "oil", quantity: 30, unit: "ml" },
        { name: "ground coriander", quantity: 3, unit: "g" },
      ],
      [
        "1. Soften chopped onion in oil until golden, then add minced garlic briefly.",
        "2. Add washed spinach in batches, wilting each handful before adding more.",
        "3. Season with salt and ground coriander; cook until the liquid mostly evaporates.",
      ],
      {
        description:
          "Soft garlicky greens that balance rich rice and grilled meats on an Afghan table.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 10,
        cookMinutes: 20,
        difficulty: "easy",
        substitutions: [
          "Frozen spinach works if well drained; kale can stand in with a longer cook.",
        ],
      },
    ),
    dessert: r(
      "firni",
      "Firni",
      "فرنی",
      "dessert",
      [
        { name: "milk", quantity: 800, unit: "ml" },
        { name: "rice flour", quantity: 60, unit: "g" },
        { name: "sugar", quantity: 100, unit: "g" },
        { name: "cardamom", quantity: 3, unit: "pods" },
        { name: "rose water", quantity: 10, unit: "ml", note: "optional" },
        { name: "pistachios", quantity: 30, unit: "g" },
      ],
      [
        "1. Whisk rice flour into a little cold milk until smooth, then stir into the remaining milk in a pan.",
        "2. Cook over medium heat with cracked cardamom and sugar, stirring constantly until thick and creamy.",
        "3. Remove from heat, stir in rose water if using, pour into bowls, and chill.",
        "4. Top with chopped pistachios before serving.",
      ],
      {
        description:
          "Silky cardamom milk pudding thickened with rice flour and finished with pistachios.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 10,
        cookMinutes: 25,
        difficulty: "easy",
        substitutions: [
          "Cornflour can replace rice flour; rose water is sold in Middle Eastern shops.",
        ],
      },
    ),
    drink: drink(
      "Doogh",
      "دوغ",
      "soft-drink",
      false,
      "Salty yogurt drink diluted with water and often finished with dried mint.",
    ),
    moreDrinks: [
      drink(
        "Black Tea",
        "Chai siyah",
        "tea",
        false,
        "Strong black tea poured sweet, often offered alongside green tea after meals.",
      ),
    ],
  },
  status: "published",
};
