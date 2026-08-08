import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const syCountry: AuthoredCountry = {
  code: "sy",
  slug: "syria",
  name: "Syria",
  flag: "🇸🇾",
  region: "Asia",
  introduction:
    "Syrian cooking is mezze-rich, fragrant with spices, and built around olive oil, yoghurt, wheat, and grilled or stuffed meats. Aleppo pepper and pomegranate molasses add signature depth.",
  cuisineAliases: [
    "Syrian restaurant",
    "Syrisch restaurant",
    "Levantine restaurant",
  ],
  nationalDishId: "kibbeh",
  nationalDrink: drink(
    "Arak",
    "عرق",
    "spirit",
    true,
    "Anise spirit diluted with water and ice until milky, the classic Levantine table drink.",
  ),
  menu: {
    starter: r(
      "muhammara",
      "Muhammara",
      "محمرة",
      "starter",
      [
        { name: "roasted red peppers", quantity: 400, unit: "g" },
        { name: "walnuts", quantity: 100, unit: "g" },
        { name: "breadcrumbs", quantity: 40, unit: "g" },
        { name: "pomegranate molasses", quantity: 30, unit: "ml" },
        { name: "garlic", quantity: 2, unit: "cloves" },
        { name: "Aleppo pepper or paprika", quantity: 10, unit: "g" },
        { name: "olive oil", quantity: 40, unit: "ml" },
        { name: "cumin", quantity: 3, unit: "g" },
      ],
      [
        "1. Blend roasted peppers with walnuts, garlic, breadcrumbs, cumin, and Aleppo pepper.",
        "2. Add pomegranate molasses and olive oil; pulse to a coarse, thick paste.",
        "3. Season with salt and adjust sweetness or acidity.",
        "4. Serve with warm flatbread as mezze.",
      ],
      {
        description:
          "Aleppo-style red pepper and walnut dip brightened with pomegranate molasses.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 20,
        cookMinutes: 0,
        difficulty: "easy",
        substitutions: [
          "Pomegranate molasses and Aleppo pepper are in Middle Eastern shops; lemon plus a pinch of sugar helps in a pinch.",
        ],
      },
    ),
    main: r(
      "kibbeh",
      "Kibbeh",
      "كبة",
      "main",
      [
        { name: "fine bulgur wheat", quantity: 250, unit: "g" },
        { name: "lean minced lamb or beef", quantity: 500, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "pine nuts", quantity: 40, unit: "g" },
        { name: "butter or oil", quantity: 40, unit: "g" },
        { name: "allspice", quantity: 4, unit: "g" },
        { name: "cinnamon", quantity: 2, unit: "g" },
        { name: "mint", quantity: 5, unit: "g" },
      ],
      [
        "1. Soak bulgur until soft; knead with half the minced meat, grated onion, salt, and spices into a smooth shell dough.",
        "2. Fry remaining onion and meat with pine nuts and spices for the filling; cool.",
        "3. Form torpedo shapes, hollow, fill, and seal; fry or bake until browned.",
        "4. Serve hot with yoghurt or salad.",
      ],
      {
        description:
          "Bulgur-and-meat shells stuffed with spiced minced lamb, often named Syria's national dish.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 45,
        cookMinutes: 30,
        difficulty: "challenging",
        substitutions: [
          "Fine (#1) bulgur is essential; coarse bulgur will not bind into a smooth shell.",
        ],
      },
    ),
    side: r(
      "tabbouleh",
      "Tabbouleh",
      "تبولة",
      "side",
      [
        { name: "fresh parsley", quantity: 150, unit: "g" },
        { name: "fresh mint", quantity: 30, unit: "g" },
        { name: "fine bulgur", quantity: 60, unit: "g" },
        { name: "tomato", quantity: 300, unit: "g" },
        { name: "spring onion", quantity: 4, unit: "pieces" },
        { name: "lemon", quantity: 2, unit: "pieces" },
        { name: "olive oil", quantity: 60, unit: "ml" },
      ],
      [
        "1. Soak bulgur briefly until just tender; drain well.",
        "2. Chop parsley and mint very finely; dice tomato and spring onion small.",
        "3. Toss with bulgur, lemon juice, olive oil, and salt.",
        "4. Serve cold as a herb-forward side.",
      ],
      {
        description:
          "Herb-heavy parsley salad with tomato, mint, lemon, and a little bulgur.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 25,
        cookMinutes: 0,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "halawet-el-jibn",
      "Cheese Rolls",
      "حلاوة الجبن",
      "dessert",
      [
        { name: "mozzarella or akkawi cheese", quantity: 300, unit: "g" },
        { name: "semolina", quantity: 100, unit: "g" },
        { name: "sugar", quantity: 50, unit: "g" },
        { name: "water", quantity: 200, unit: "ml" },
        { name: "rose water", quantity: 10, unit: "ml" },
        { name: "ashta or whipped cream", quantity: 200, unit: "g" },
        { name: "sugar syrup", quantity: 150, unit: "ml" },
        { name: "pistachios", quantity: 40, unit: "g" },
      ],
      [
        "1. Melt shredded cheese with a little water, then work in semolina and sugar until a stretchy dough forms.",
        "2. Roll the warm dough thin on a damp surface and cut into rectangles.",
        "3. Fill with ashta or cream, roll into cigars, and chill.",
        "4. Drizzle with rose-scented syrup and sprinkle with pistachios.",
      ],
      {
        description:
          "Soft semolina-cheese rolls filled with cream and finished with rose syrup.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 35,
        cookMinutes: 15,
        difficulty: "challenging",
        substitutions: [
          "Desalted akkawi is traditional; low-moisture mozzarella is a practical substitute.",
        ],
      },
    ),
    drink: drink(
      "Jallab",
      "جلاب",
      "soft-drink",
      false,
      "Date-and-grape molasses drink served over ice with pine nuts and raisins.",
    ),
    moreDrinks: [
      drink(
        "Ayran",
        "عيران",
        "soft-drink",
        false,
        "Salted yoghurt drink whisked until frothy and served ice-cold with mezze.",
      ),
      drink(
        "Syrian Tea",
        "شاي",
        "tea",
        false,
        "Strong black tea often sweetened and sometimes scented with sage or mint.",
      ),
    ],
  },
  status: "published",
};
