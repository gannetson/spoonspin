import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const iqCountry: AuthoredCountry = {
  code: "iq",
  slug: "iraq",
  name: "Iraq",
  flag: "🇮🇶",
  region: "Asia",
  introduction:
    "Iraqi cooking draws on Mesopotamian staples — rice, lamb, stuffed vegetables, and fragrant spices — with grilled fish along the Tigris and shared trays of quzi for celebrations.",
  cuisineAliases: [
    "Iraqi restaurant",
    "Iraaks restaurant",
    "Mesopotamian restaurant",
  ],
  nationalDishId: "quzi",
  nationalDrink: drink(
    "Iraqi Cardamom Tea",
    "شاي",
    "tea",
    false,
    "Strong black tea simmered with crushed cardamom and poured sweet into small glasses.",
  ),
  menu: {
    starter: r(
      "kubba-soup",
      "Kubba Soup",
      "شوربة كبة",
      "starter",
      [
        { name: "fine bulgur", quantity: 200, unit: "g" },
        { name: "minced lamb or beef", quantity: 400, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "tomato paste", quantity: 40, unit: "g" },
        { name: "dried mint", quantity: 5, unit: "g" },
        { name: "lemon", quantity: 1, unit: "piece" },
        { name: "plain flour", quantity: 30, unit: "g", note: "as needed for shell" },
      ],
      [
        "1. Soften half the minced meat with chopped onion, salt, and pepper for the filling; cool.",
        "2. Knead soaked bulgur with remaining mince, flour, and salt into a dough; form shells, stuff, and seal into balls.",
        "3. Simmer onion and tomato paste in water or stock; gently add kubba and cook until they float and are cooked through.",
        "4. Finish with dried mint and lemon juice; serve hot.",
      ],
      {
        description:
          "Bulgur-and-meat dumplings simmered in a bright tomato broth — a comforting Iraqi starter.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 45,
        cookMinutes: 35,
        difficulty: "challenging",
        substitutions: [
          "Fine bulgur (köftelik) is in Turkish and Middle Eastern shops; ready frozen kubba can shorten the work.",
        ],
      },
    ),
    main: r(
      "quzi",
      "Quzi Lamb with Spiced Rice",
      "قوزي",
      "main",
      [
        { name: "lamb shoulder or leg", quantity: 1200, unit: "g" },
        { name: "basmati rice", quantity: 400, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "carrot", quantity: 2, unit: "pieces" },
        { name: "raisins", quantity: 60, unit: "g" },
        { name: "almonds", quantity: 60, unit: "g" },
        { name: "baharat or mixed spice", quantity: 10, unit: "g" },
        { name: "saffron or turmeric", quantity: 3, unit: "g" },
        { name: "oil", quantity: 50, unit: "ml" },
      ],
      [
        "1. Rub lamb with salt, baharat, and garlic; roast covered at 160°C with a splash of water until falling-apart tender (about 3 hours).",
        "2. Soften onion and carrot in oil; toast the drained rice briefly with spice and saffron.",
        "3. Add enough lamb roasting juices and water to cook the rice; steam until fluffy.",
        "4. Fold in fried almonds and raisins; mound rice on a platter and top with shredded lamb.",
      ],
      {
        description:
          "Festive slow-cooked lamb served over spice-scented rice with almonds and raisins — widely considered Iraq's celebration dish.",
        dietaryLabels: ["contains-meat", "gluten-free", "dairy-free"],
        prepMinutes: 25,
        cookMinutes: 200,
        difficulty: "medium",
        substitutions: [
          "Baharat blends are sold in Middle Eastern shops; mix cumin, coriander, cinnamon, and pepper if needed.",
        ],
      },
    ),
    side: r(
      "amba-salad",
      "Tomato Onion Salad with Amba",
      "سلطة بالطماطم",
      "side",
      [
        { name: "ripe tomatoes", quantity: 4, unit: "pieces" },
        { name: "red onion", quantity: 1, unit: "piece" },
        { name: "fresh parsley", quantity: 20, unit: "g" },
        { name: "amba or mango pickle", quantity: 40, unit: "g" },
        { name: "lemon", quantity: 1, unit: "piece" },
        { name: "olive oil", quantity: 30, unit: "ml" },
      ],
      [
        "1. Dice tomatoes and thinly slice the onion; chop the parsley.",
        "2. Toss with lemon juice, olive oil, salt, and a spoon of amba for tangy heat.",
        "3. Rest briefly and serve alongside rice and grilled or roasted meats.",
      ],
      {
        description:
          "Sharp tomato-onion salad lifted with pickled mango (amba), a favourite Iraqi table relish.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 15,
        cookMinutes: 0,
        difficulty: "easy",
        substitutions: [
          "Amba jars are in Middle Eastern shops; a little mango chutney plus cayenne is a rough Dutch stand-in.",
        ],
      },
    ),
    dessert: r(
      "kleicha",
      "Kleicha Date Cookies",
      "كليجة",
      "dessert",
      [
        { name: "plain flour", quantity: 350, unit: "g" },
        { name: "butter or ghee", quantity: 150, unit: "g" },
        { name: "yeast", quantity: 7, unit: "g" },
        { name: "milk", quantity: 100, unit: "ml" },
        { name: "date paste", quantity: 250, unit: "g" },
        { name: "ground cardamom", quantity: 5, unit: "g" },
        { name: "nigella seeds", quantity: 5, unit: "g", note: "optional" },
      ],
      [
        "1. Rub butter into flour with cardamom and yeast; add warm milk to make a soft dough and rest 30 minutes.",
        "2. Warm the date paste with a splash of water until spreadable; cool slightly.",
        "3. Roll dough, spread date filling, roll into a log, slice into rounds, and stamp or press lightly.",
        "4. Bake at 180°C until golden, about 18–22 minutes; cool on a rack.",
      ],
      {
        description:
          "Cardamom-scented date-filled cookies traditionally baked for Eid and family gatherings.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 35,
        cookMinutes: 25,
        difficulty: "medium",
        substitutions: [
          "Soft pitted dates blended with a little oil replace ready date paste.",
        ],
      },
    ),
    drink: drink(
      "Shinena",
      "شنينة",
      "soft-drink",
      false,
      "Salty yogurt drink diluted with cold water — non-alcoholic and cooling with spicy rice dishes.",
    ),
    moreDrinks: [
      drink(
        "Arak",
        "عرق",
        "spirit",
        true,
        "Anise-flavoured distilled spirit that contains alcohol; traditionally diluted with water until milky.",
      ),
    ],
  },
  status: "published",
};
