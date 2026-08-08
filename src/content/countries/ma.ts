import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const maCountry: AuthoredCountry = {
  code: "ma",
  slug: "morocco",
  name: "Morocco",
  flag: "🇲🇦",
  region: "Africa",
  introduction:
    "Moroccan cooking layers sweet, sour, warm spices, and slow-cooked textures. Bread, fragrant mint tea, and communal tagines are central to hospitality.",
  cuisineAliases: ["Moroccan restaurant", "Marokkaans restaurant", "Maghreb restaurant"],
  nationalDishId: "chicken-tagine",
  nationalDrink: drink(
    "Mint Tea",
    "Atay",
    "tea",
    false,
    "Sweet green tea poured high with fresh spearmint.",
  ),
  menu: {
    starter: r(
      "zaalouk",
      "Smoky Aubergine Salad",
      "Zaalouk",
      "starter",
      [
        { name: "aubergines", quantity: 600, unit: "g" },
        { name: "tomatoes", quantity: 400, unit: "g" },
        { name: "garlic", quantity: 3, unit: "cloves" },
        { name: "cumin", quantity: 5, unit: "g" },
        { name: "paprika", quantity: 5, unit: "g" },
        { name: "olive oil", quantity: 45, unit: "ml" },
        { name: "fresh coriander", quantity: 15, unit: "g" },
      ],
      [
        "1. Roast or grill aubergines until collapsed and smoky; scoop out the flesh.",
        "2. Soften garlic in olive oil, add chopped tomato, cumin, and paprika; cook down.",
        "3. Mash in the aubergine and simmer until thick and jammy.",
        "4. Finish with lemon, coriander, and more olive oil; serve warm or room temperature with bread.",
      ],
      {
        description:
          "Smoky aubergine and tomato salad cooked down with cumin and garlic.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 15,
        cookMinutes: 35,
        difficulty: "easy",
      },
    ),
    main: r(
      "chicken-tagine",
      "Chicken Tagine",
      "طاجين الدجاج",
      "main",
      [
        { name: "chicken thighs", quantity: 800, unit: "g" },
        { name: "preserved lemon", quantity: 1, unit: "piece" },
        { name: "green olives", quantity: 150, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "garlic", quantity: 3, unit: "cloves" },
        { name: "ground ginger", quantity: 5, unit: "g" },
        { name: "turmeric", quantity: 3, unit: "g" },
        { name: "couscous", quantity: 300, unit: "g" },
      ],
      [
        "1. Brown the chicken lightly; soften onion and garlic with ginger and turmeric.",
        "2. Return chicken with a splash of water, cover, and simmer gently until tender.",
        "3. Add rinsed preserved lemon strips and olives for the last 15 minutes.",
        "4. Steam or soak couscous and serve the tagine over or beside it.",
      ],
      {
        description:
          "A slow-braised chicken tagine with olives, preserved lemon, and aromatic spices.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 20,
        cookMinutes: 55,
        difficulty: "medium",
        substitutions: [
          "Preserved lemons are in Moroccan and Turkish shops; lemon zest plus a pinch of salt is a rough emergency substitute.",
        ],
      },
    ),
    side: r(
      "carrot-chermoula",
      "Chermoula Carrots",
      "سلطة الجزر",
      "side",
      [
        { name: "carrots", quantity: 700, unit: "g" },
        { name: "fresh coriander", quantity: 20, unit: "g" },
        { name: "cumin", quantity: 6, unit: "g" },
        { name: "garlic", quantity: 2, unit: "cloves" },
        { name: "lemon", quantity: 1, unit: "piece" },
        { name: "olive oil", quantity: 40, unit: "ml" },
      ],
      [
        "1. Boil or steam carrot sticks until just tender; drain.",
        "2. Pound or mix garlic, cumin, coriander, lemon juice, and olive oil into a chermoula.",
        "3. Toss the warm carrots in the dressing and adjust salt.",
        "4. Serve warm or at room temperature.",
      ],
      {
        description:
          "Tender carrots dressed in a garlic-cumin-coriander chermoula.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 15,
        cookMinutes: 15,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "orange-cinnamon",
      "Cinnamon Oranges",
      "برتقال بالقرفة",
      "dessert",
      [
        { name: "oranges", quantity: 6, unit: "pieces" },
        { name: "ground cinnamon", quantity: 5, unit: "g" },
        { name: "orange blossom water", quantity: 10, unit: "ml" },
        { name: "sugar", quantity: 30, unit: "g" },
      ],
      [
        "1. Peel the oranges carefully and slice into rounds.",
        "2. Arrange on a platter and sprinkle with sugar and cinnamon.",
        "3. Drizzle with orange blossom water and chill briefly before serving.",
      ],
      {
        description:
          "Sliced oranges scented with cinnamon and orange blossom water.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 0,
        difficulty: "easy",
        substitutions: [
          "Orange blossom water is in Middle Eastern shops; a little vanilla is a mild alternative.",
        ],
      },
    ),
    drink: drink(
      "Orange Juice",
      "عصير البرتقال",
      "soft-drink",
      false,
      "Freshly squeezed sweet orange juice.",
    ),
    moreRecipes: [
      r(
        "harira",
        "Harira Soup",
        "حريرة",
        "starter",
        [
          { name: "lamb or beef", quantity: 300, unit: "g" },
          { name: "red lentils", quantity: 100, unit: "g" },
          { name: "chickpeas", quantity: 200, unit: "g" },
          { name: "tomatoes", quantity: 400, unit: "g" },
          { name: "celery", quantity: 2, unit: "stalks" },
          { name: "flour", quantity: 30, unit: "g" },
          { name: "fresh coriander and parsley", quantity: 30, unit: "g" },
        ],
        [
          "1. Brown the meat, then add onion, celery, tomato, and spices; cover with water.",
          "2. Add lentils and chickpeas; simmer until everything is soft.",
          "3. Whisk flour with water and stir in to thicken; simmer a few minutes more.",
          "4. Finish with herbs and lemon juice.",
        ],
        {
          description:
            "Tomato, lentil, and chickpea soup thickened with flour and brightened with herbs and lemon.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 25,
          cookMinutes: 60,
          difficulty: "medium",
        },
      ),
      r(
        "couscous-tfaya",
        "Couscous with Tfaya",
        "كسكس",
        "main",
        [
          { name: "couscous", quantity: 400, unit: "g" },
          { name: "onions", quantity: 3, unit: "pieces" },
          { name: "raisins", quantity: 80, unit: "g" },
          { name: "chickpeas", quantity: 250, unit: "g" },
          { name: "butter or oil", quantity: 40, unit: "g" },
          { name: "cinnamon", quantity: 5, unit: "g" },
          { name: "honey", quantity: 30, unit: "g" },
        ],
        [
          "1. Slowly caramelise sliced onions in butter with cinnamon and honey; add raisins near the end for tfaya.",
          "2. Warm chickpeas in a lightly spiced broth.",
          "3. Steam or soak couscous until fluffy and separate with a fork.",
          "4. Pile couscous on a platter, spoon over chickpeas and broth, and top with the onion-raisin tfaya.",
        ],
        {
          description:
            "Steamed couscous topped with caramelised onion-raisin tfaya and a fragrant broth.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 20,
          cookMinutes: 45,
          difficulty: "medium",
        },
      ),
      r(
        "chebakia",
        "Sesame Honey Pastries",
        "شباكية",
        "dessert",
        [
          { name: "plain flour", quantity: 400, unit: "g" },
          { name: "sesame seeds", quantity: 80, unit: "g" },
          { name: "honey", quantity: 300, unit: "g" },
          { name: "orange blossom water", quantity: 30, unit: "ml" },
          { name: "butter", quantity: 80, unit: "g" },
          { name: "oil", quantity: 1, unit: "litre", note: "for frying" },
        ],
        [
          "1. Mix flour with toasted ground sesame, melted butter, orange blossom, and enough water for a firm dough; rest 30 minutes.",
          "2. Roll thin, cut strips, and fold into flower or lattice shapes.",
          "3. Fry until golden, then plunge into warm honey scented with orange blossom.",
          "4. Drain and sprinkle with more sesame seeds.",
        ],
        {
          description:
            "Flower-shaped fried pastries soaked in honey and coated with sesame.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 45,
          cookMinutes: 30,
          difficulty: "challenging",
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Avocado Juice",
        "عصير الأفوكادو",
        "soft-drink",
        false,
        "Creamy sweetened avocado shake popular in Moroccan juice bars.",
      ),
      drink(
        "Moroccan Coffee",
        "قهوة",
        "coffee",
        false,
        "Strong coffee sometimes scented with a pinch of spice.",
      ),
    ],
  },
  status: "published",
};
