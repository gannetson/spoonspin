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
    starter: r(
      "mercimek-corbasi",
      "Red Lentil Soup",
      "Mercimek çorbası",
      "starter",
      [
        { name: "red lentils", quantity: 300, unit: "g" },
        { name: "carrot", quantity: 1, unit: "piece" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "tomato paste", quantity: 30, unit: "g" },
        { name: "butter", quantity: 30, unit: "g" },
        { name: "dried mint", quantity: 5, unit: "g" },
        { name: "paprika", quantity: 5, unit: "g" },
      ],
      [
        "1. Soften onion and grated carrot in a little oil, then stir in tomato paste.",
        "2. Add rinsed lentils and about 1.2 litres water or stock; simmer until the lentils collapse.",
        "3. Blend smooth (or mash vigorously), season with salt, and thin with water if needed.",
        "4. Sizzle butter with paprika and dried mint, pour over each bowl, and finish with lemon.",
      ],
      {
        description:
          "Silky red-lentil soup finished with butter, paprika, and dried mint.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 35,
        difficulty: "easy",
      },
    ),
    main: r(
      "iskender-kebab",
      "Iskender Kebab",
      "İskender kebap",
      "main",
      [
        { name: "lamb or beef strips", quantity: 700, unit: "g" },
        { name: "pide or flatbread", quantity: 4, unit: "pieces" },
        { name: "tomato passata", quantity: 350, unit: "ml" },
        { name: "thick yogurt", quantity: 300, unit: "g" },
        { name: "butter", quantity: 80, unit: "g" },
        { name: "garlic", quantity: 2, unit: "cloves" },
      ],
      [
        "1. Season the meat and grill or sear in batches until browned and just cooked.",
        "2. Warm passata with garlic and salt into a simple tomato sauce.",
        "3. Toast flatbread pieces, arrange on plates, and top with the sliced meat.",
        "4. Spoon over tomato sauce and yogurt, then drizzle with butter browned until nutty.",
      ],
      {
        description:
          "Sliced grilled lamb over bread with tomato sauce, yogurt, and browned butter.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 20,
        cookMinutes: 25,
        difficulty: "medium",
        substitutions: [
          "Thinly sliced lamb steak or rump works at home when a döner spit is not available.",
        ],
      },
    ),
    side: r(
      "piyaz",
      "White Bean Salad",
      "Piyaz",
      "side",
      [
        { name: "cooked white beans", quantity: 600, unit: "g" },
        { name: "red onion", quantity: 1, unit: "piece" },
        { name: "parsley", quantity: 20, unit: "g" },
        { name: "olive oil", quantity: 45, unit: "ml" },
        { name: "lemon", quantity: 1, unit: "piece" },
        { name: "sumac", quantity: 5, unit: "g" },
      ],
      [
        "1. Drain the beans and toss with thinly sliced onion rinsed under cold water.",
        "2. Dress with olive oil, lemon juice, salt, and sumac.",
        "3. Fold in chopped parsley and rest 10 minutes before serving.",
      ],
      {
        description:
          "Lemon-dressed white beans with red onion, parsley, and sumac.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 15,
        cookMinutes: 0,
        difficulty: "easy",
        substitutions: [
          "Tinned cannellini beans are fine; sumac is in Turkish and Middle Eastern shops.",
        ],
      },
    ),
    dessert: r(
      "sutlac",
      "Rice Pudding",
      "Sütlaç",
      "dessert",
      [
        { name: "milk", quantity: 800, unit: "ml" },
        { name: "short-grain rice", quantity: 100, unit: "g" },
        { name: "sugar", quantity: 120, unit: "g" },
        { name: "cornflour", quantity: 20, unit: "g" },
        { name: "vanilla", quantity: 5, unit: "ml" },
      ],
      [
        "1. Simmer rice in half the milk until the grains are soft.",
        "2. Stir in remaining milk and sugar; mix cornflour with a splash of cold milk and whisk in.",
        "3. Cook until thick, add vanilla, and pour into ovenproof bowls.",
        "4. Optionally brown the tops under a hot grill for a classic baked sütlaç look; chill before serving.",
      ],
      {
        description:
          "Creamy Turkish milk rice pudding, sometimes browned under the grill.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 10,
        cookMinutes: 40,
        difficulty: "easy",
      },
    ),
    drink: drink(
      "Turkish Tea",
      "Çay",
      "tea",
      false,
      "Strong black tea poured into tulip-shaped glasses.",
    ),
    moreRecipes: [
      r(
        "lahmacun",
        "Turkish Flatbread Pizza",
        "Lahmacun",
        "main",
        [
          { name: "pizza dough", quantity: 400, unit: "g" },
          { name: "minced lamb or beef", quantity: 300, unit: "g" },
          { name: "tomato", quantity: 2, unit: "pieces" },
          { name: "onion", quantity: 1, unit: "piece" },
          { name: "parsley", quantity: 30, unit: "g" },
          { name: "pul biber or chilli flakes", quantity: 5, unit: "g" },
        ],
        [
          "1. Pulse meat with tomato, onion, parsley, spices, and salt into a fine paste.",
          "2. Roll dough very thin, spread a thin layer of the topping to the edges.",
          "3. Bake on a very hot tray or pizza stone at 250°C until the edges crisp.",
          "4. Squeeze lemon over, add fresh herbs, roll up, and eat while hot.",
        ],
        {
          description:
            "Thin crisp flatbread topped with spiced minced meat, then rolled with herbs and lemon.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 25,
          cookMinutes: 15,
          difficulty: "medium",
        },
      ),
      r(
        "imam-bayildi",
        "Stuffed Eggplant",
        "İmam bayıldı",
        "side",
        [
          { name: "eggplants", quantity: 4, unit: "pieces" },
          { name: "onions", quantity: 2, unit: "pieces" },
          { name: "tomatoes", quantity: 400, unit: "g" },
          { name: "olive oil", quantity: 80, unit: "ml" },
          { name: "garlic", quantity: 4, unit: "cloves" },
          { name: "parsley", quantity: 20, unit: "g" },
        ],
        [
          "1. Halve the eggplants lengthways, score the flesh, salt lightly, and fry or roast until soft.",
          "2. Slowly cook sliced onion and garlic in plenty of olive oil until sweet; add chopped tomato and cook down.",
          "3. Pile the filling into the eggplants and bake at 180°C until collapsing and glossy.",
          "4. Cool to room temperature and finish with parsley.",
        ],
        {
          description:
            "Eggplants slowly cooked with olive oil, onion, and tomato until silky and sweet.",
          dietaryLabels: ["vegetarian", "vegan"],
          prepMinutes: 25,
          cookMinutes: 50,
          difficulty: "medium",
        },
      ),
      r(
        "baklava-tr",
        "Gaziantep Baklava",
        "Baklava",
        "dessert",
        [
          { name: "filo pastry", quantity: 250, unit: "g" },
          { name: "pistachios", quantity: 200, unit: "g" },
          { name: "butter", quantity: 150, unit: "g" },
          { name: "sugar", quantity: 250, unit: "g" },
          { name: "lemon juice", quantity: 15, unit: "ml" },
        ],
        [
          "1. Make a light syrup from sugar, 200 ml water, and lemon; cool completely.",
          "2. Layer half the buttered filo in a tin, scatter chopped pistachios, then cover with remaining filo.",
          "3. Cut into diamonds and bake at 170°C until deep golden.",
          "4. Pour cold syrup over hot baklava and rest until the pastry absorbs it.",
        ],
        {
          description:
            "Paper-thin pastry layered with pistachios and soaked in light sugar syrup.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 30,
          cookMinutes: 40,
          difficulty: "challenging",
          substitutions: [
            "Walnuts work if pistachios are costly; keep filo covered with a damp cloth while working.",
          ],
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Ayran",
        "Ayran",
        "soft-drink",
        false,
        "Salty yogurt drink that cools spicy and grilled dishes.",
      ),
      drink(
        "Turkish Coffee",
        "Türk kahvesi",
        "coffee",
        false,
        "Finely ground coffee brewed unfiltered in a cezve or small pot.",
      ),
      drink(
        "Efes / Turkish Lager",
        "Bira",
        "beer",
        true,
        "Crisp lager commonly enjoyed with kebabs and meze.",
      ),
    ],
  },
  status: "published",
};
