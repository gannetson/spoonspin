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
    starter: r(
      "hummus",
      "Hummus",
      "حمص",
      "starter",
      [
        { name: "cooked chickpeas", quantity: 600, unit: "g" },
        { name: "tahini", quantity: 100, unit: "g" },
        { name: "lemon", quantity: 2, unit: "pieces" },
        { name: "garlic", quantity: 2, unit: "cloves" },
        { name: "olive oil", quantity: 40, unit: "ml" },
      ],
      [
        "1. Warm the chickpeas slightly and reserve a little cooking liquid.",
        "2. Blend chickpeas with tahini, lemon juice, garlic, and salt until very smooth, loosening with liquid.",
        "3. Spoon into a bowl, swirl the top, and drizzle with olive oil.",
        "4. Serve with warm pita.",
      ],
      {
        description:
          "Silky chickpea dip whipped with tahini, lemon, and garlic.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 0,
        difficulty: "easy",
        substitutions: [
          "Tinned chickpeas work; peel them for an extra-smooth result if you have time.",
        ],
      },
    ),
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
        { name: "allspice", quantity: 5, unit: "g" },
        { name: "cinnamon", quantity: 3, unit: "g" },
      ],
      [
        "1. Soak fine bulgur until soft; squeeze dry and knead with half the lamb, grated onion, and spices into a paste for the shell.",
        "2. Fry the remaining lamb with onion and toasted pine nuts for the filling; cool.",
        "3. Form oval shells, stuff with filling, and seal carefully.",
        "4. Fry until browned or bake at 200°C until cooked through; serve with yogurt or salad.",
      ],
      {
        description:
          "Bulgur and lamb shells wrapped around a warmly spiced meat filling.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 45,
        cookMinutes: 25,
        difficulty: "challenging",
        substitutions: [
          "Fine bulgur is essential; find it in Turkish and Middle Eastern shops. Beef mince can replace lamb.",
        ],
      },
    ),
    side: r(
      "fattoush",
      "Fattoush",
      "فتوش",
      "side",
      [
        { name: "romaine lettuce", quantity: 250, unit: "g" },
        { name: "tomatoes", quantity: 300, unit: "g" },
        { name: "cucumber", quantity: 1, unit: "piece" },
        { name: "pita bread", quantity: 2, unit: "pieces" },
        { name: "sumac", quantity: 8, unit: "g" },
        { name: "lemon", quantity: 1, unit: "piece" },
        { name: "olive oil", quantity: 45, unit: "ml" },
      ],
      [
        "1. Toast or fry pita until crisp, then break into shards.",
        "2. Chop lettuce, tomato, cucumber, and herbs into a bowl.",
        "3. Dress with olive oil, lemon, garlic, and plenty of sumac.",
        "4. Toss in the pita just before serving so it stays crunchy.",
      ],
      {
        description:
          "Crunchy salad of mixed vegetables and fried pita brightened with sumac.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 20,
        cookMinutes: 5,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "muhallabieh",
      "Milk Pudding",
      "مهلبية",
      "dessert",
      [
        { name: "milk", quantity: 750, unit: "ml" },
        { name: "cornflour", quantity: 45, unit: "g" },
        { name: "sugar", quantity: 80, unit: "g" },
        { name: "orange blossom water", quantity: 15, unit: "ml" },
        { name: "pistachios", quantity: 40, unit: "g" },
      ],
      [
        "1. Whisk cornflour into a little cold milk; heat the rest with sugar.",
        "2. Stir in the slurry and cook until thick and glossy.",
        "3. Add orange blossom water, pour into bowls, and cool.",
        "4. Chill and top with chopped pistachios.",
      ],
      {
        description:
          "Delicate set milk pudding scented with orange blossom and pistachios.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 10,
        cookMinutes: 15,
        difficulty: "easy",
      },
    ),
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
          { name: "fresh mint", quantity: 20, unit: "g" },
          { name: "olive oil", quantity: 50, unit: "ml" },
        ],
        [
          "1. Soak bulgur briefly until just tender; drain well.",
          "2. Chop parsley and mint very finely; dice tomato small.",
          "3. Toss with bulgur, lemon juice, olive oil, and salt.",
          "4. Taste for sharpness and serve cool.",
        ],
        {
          description:
            "A herb-forward salad of parsley, mint, tomato, and fine bulgur dressed with lemon.",
          dietaryLabels: ["vegetarian", "vegan"],
          prepMinutes: 25,
          cookMinutes: 0,
          difficulty: "easy",
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
          { name: "garlic sauce or mayo", quantity: 80, unit: "g" },
        ],
        [
          "1. Marinate chicken in yogurt and shawarma spices for at least 1 hour.",
          "2. Roast or grill until caramelised and cooked through; rest and slice.",
          "3. Warm flatbreads and spread with garlic sauce.",
          "4. Fill with chicken, pickles, and salad; roll tightly.",
        ],
        {
          description:
            "Spice-rubbed chicken roasted until caramelised, carved into warm flatbread wraps.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 20,
          cookMinutes: 35,
          difficulty: "easy",
          substitutions: [
            "Ready shawarma spice mixes are common; cumin, paprika, coriander, and turmeric approximate the blend.",
          ],
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
          { name: "icing sugar", quantity: 40, unit: "g" },
        ],
        [
          "1. Rub butter into semolina with a pinch of sugar; add orange blossom and a little water to a crumbly dough; rest 1 hour.",
          "2. Shape date paste into small logs.",
          "3. Wrap dough around the filling, press in a mould or with a fork, and bake at 180°C until pale gold.",
          "4. Cool and dust with icing sugar.",
        ],
        {
          description:
            "Shortbread-like cookies filled with dates or nuts, pressed in decorative moulds.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 40,
          cookMinutes: 20,
          difficulty: "medium",
          substitutions: [
            "Chopped soft dates mashed with a little oil replace date paste.",
          ],
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Lebanese Wine",
        "نبيذ",
        "wine",
        true,
        "Bekaa Valley wines ranging from crisp whites to structured reds.",
      ),
      drink(
        "Laban Ayran",
        "لبن",
        "soft-drink",
        false,
        "Salty yogurt drink that cools grilled meats and meze.",
      ),
    ],
  },
  status: "published",
};
