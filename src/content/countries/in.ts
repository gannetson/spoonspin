import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const inCountry: AuthoredCountry = {
  code: "in",
  slug: "india",
  name: "India",
  flag: "🇮🇳",
  region: "Asia",
  introduction:
    "India's cuisines are extraordinarily diverse, connected by spice craft and regional ingredients. Lentils, breads, rice, vegetables, and aromatic curries make its food both everyday and celebratory.",
  cuisineAliases: ["Indian restaurant", "Indiaas restaurant", "curry restaurant"],
  nationalDishId: "butter-chicken",
  nationalDrink: drink(
    "Masala Chai",
    "मसाला चाय",
    "tea",
    false,
    "Spiced black tea simmered with milk.",
  ),
  menu: {
    starter: r(
      "samosa",
      "Samosas",
      "समोसा",
      "starter",
      [
        { name: "potatoes", quantity: 600, unit: "g" },
        { name: "frozen peas", quantity: 200, unit: "g" },
        { name: "samosa pastry or filo sheets", quantity: 8, unit: "sheets" },
        { name: "cumin seeds", quantity: 5, unit: "g" },
        { name: "garam masala", quantity: 5, unit: "g" },
        { name: "neutral oil", quantity: 500, unit: "ml", note: "for frying" },
      ],
      [
        "1. Boil and mash the potatoes; soften cumin seeds in a little oil, then stir in peas, garam masala, salt, and chilli.",
        "2. Mix the potato filling and cool completely.",
        "3. Cut pastry into strips, form cones or triangles, fill, and seal the edges with water.",
        "4. Deep-fry at about 170°C until deep golden, or brush with oil and bake at 200°C until crisp.",
      ],
      {
        description:
          "Crisp pastry pockets stuffed with spiced potato and pea filling.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 35,
        cookMinutes: 25,
        difficulty: "medium",
        substitutions: [
          "Ready samosa sheets or filo from Dutch shops work; spring-roll wrappers are a practical alternative.",
        ],
      },
    ),
    main: r(
      "butter-chicken",
      "Butter Chicken",
      "Murgh makhani",
      "main",
      [
        { name: "chicken thighs", quantity: 800, unit: "g" },
        { name: "plain yogurt", quantity: 150, unit: "g" },
        { name: "tomato passata", quantity: 500, unit: "ml" },
        { name: "butter", quantity: 70, unit: "g" },
        { name: "double cream", quantity: 150, unit: "ml" },
        { name: "garam masala", quantity: 10, unit: "g" },
        { name: "ginger-garlic paste", quantity: 30, unit: "g" },
      ],
      [
        "1. Marinate chicken in yogurt, half the garam masala, ginger-garlic, and salt for at least 30 minutes.",
        "2. Grill or pan-sear the chicken until lightly charred and almost cooked through.",
        "3. Melt butter, cook passata with remaining spices until thick and rich, then stir in cream.",
        "4. Add the chicken and simmer gently 10 minutes until the sauce coats the meat; finish with a knob of butter.",
      ],
      {
        description:
          "A widely loved creamy tomato chicken curry with warm spices.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 40,
        cookMinutes: 35,
        difficulty: "medium",
        substitutions: [
          "Kasuri methi (dried fenugreek) is optional but authentic; find it in Indian grocers.",
        ],
        drinkPairing: "Pair with mango lassi or a light lager.",
      },
    ),
    side: r(
      "jeera-rice",
      "Cumin Rice",
      "Jeera chawal",
      "side",
      [
        { name: "basmati rice", quantity: 350, unit: "g" },
        { name: "cumin seeds", quantity: 8, unit: "g" },
        { name: "ghee or butter", quantity: 25, unit: "g" },
        { name: "water", quantity: 700, unit: "ml" },
      ],
      [
        "1. Rinse the basmati until the water runs clearer, then soak 20 minutes and drain.",
        "2. Warm ghee, crackle the cumin seeds, and stir the rice to coat.",
        "3. Add water and salt, bring to a boil, cover, and cook on low until the liquid is absorbed.",
        "4. Rest 5 minutes off the heat, then fluff with a fork.",
      ],
      {
        description:
          "Fragrant basmati rice tempered with toasted cumin seeds in ghee.",
        dietaryLabels: ["vegetarian", "gluten-free"],
        prepMinutes: 25,
        cookMinutes: 20,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "gulab-jamun",
      "Milk Dumplings",
      "Gulab jamun",
      "dessert",
      [
        { name: "milk powder", quantity: 200, unit: "g" },
        { name: "plain flour", quantity: 40, unit: "g" },
        { name: "milk", quantity: 80, unit: "ml" },
        { name: "sugar", quantity: 300, unit: "g" },
        { name: "cardamom pods", quantity: 4, unit: "pieces" },
        { name: "ghee or oil", quantity: 500, unit: "ml", note: "for frying" },
      ],
      [
        "1. Dissolve sugar in 400 ml water with cracked cardamom; simmer into a light syrup and keep warm.",
        "2. Mix milk powder and flour, add milk gradually to a soft dough, and rest 10 minutes.",
        "3. Roll smooth balls without cracks and fry on low–medium heat until deep mahogany.",
        "4. Drain briefly, soak in warm syrup at least 30 minutes, and serve warm or at room temperature.",
      ],
      {
        description:
          "Soft milk-powder dumplings soaked in warm cardamom sugar syrup.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 25,
        cookMinutes: 30,
        difficulty: "medium",
        substitutions: [
          "Ready gulab jamun mix is sold in Indian shops if you want a quicker dough.",
        ],
      },
    ),
    drink: drink(
      "Mango Lassi",
      "मैंगो लस्सी",
      "soft-drink",
      false,
      "Yogurt blended smooth with ripe mango.",
    ),
    moreRecipes: [
      r(
        "palak-paneer",
        "Spinach Paneer Curry",
        "पालक पनीर",
        "main",
        [
          { name: "spinach", quantity: 500, unit: "g" },
          { name: "paneer", quantity: 300, unit: "g" },
          { name: "onion", quantity: 1, unit: "piece" },
          { name: "tomato", quantity: 2, unit: "pieces" },
          { name: "garam masala", quantity: 5, unit: "g" },
          { name: "cream or yogurt", quantity: 50, unit: "ml" },
        ],
        [
          "1. Blanch spinach briefly, drain well, and blend smooth with a splash of water.",
          "2. Soften onion, garlic, and ginger in oil; add tomato and spices until the oil separates.",
          "3. Stir in the spinach purée and simmer 5 minutes; add cream for silkiness.",
          "4. Pan-fry paneer cubes lightly, fold into the gravy, and warm through without boiling hard.",
        ],
        {
          description:
            "Soft paneer cubes in a velvety spinach gravy scented with cumin and garlic.",
          dietaryLabels: ["vegetarian", "gluten-free"],
          prepMinutes: 20,
          cookMinutes: 25,
          difficulty: "medium",
          substitutions: [
            "Halloumi or firm tofu can stand in for paneer in a pinch.",
          ],
        },
      ),
      r(
        "masala-dosa",
        "Masala Dosa",
        "மசாலா தோசை",
        "main",
        [
          { name: "ready dosa batter", quantity: 500, unit: "ml" },
          { name: "potatoes", quantity: 500, unit: "g" },
          { name: "mustard seeds", quantity: 5, unit: "g" },
          { name: "curry leaves", quantity: 10, unit: "pieces" },
          { name: "onion", quantity: 1, unit: "piece" },
          { name: "turmeric", quantity: 3, unit: "g" },
        ],
        [
          "1. Boil and roughly mash the potatoes; temper mustard seeds and curry leaves in oil, then soften onion and turmeric.",
          "2. Fold the potato into the tempering with salt and a splash of water; keep warm.",
          "3. Spread a thin circle of batter on a hot oiled pan and cook until crisp and golden.",
          "4. Spoon potato masala down the centre, fold the dosa, and serve with chutney if you like.",
        ],
        {
          description:
            "Crisp fermented rice-lentil crepe filled with spiced potato mash.",
          dietaryLabels: ["vegetarian", "vegan"],
          prepMinutes: 25,
          cookMinutes: 30,
          difficulty: "medium",
          substitutions: [
            "Ready dosa batter from Indian grocers saves the multi-day ferment at home.",
          ],
        },
      ),
      r(
        "jalebi",
        "Jalebi",
        "जलेबी",
        "dessert",
        [
          { name: "plain flour", quantity: 150, unit: "g" },
          { name: "yogurt", quantity: 80, unit: "g" },
          { name: "sugar", quantity: 250, unit: "g" },
          { name: "saffron or orange food colour", quantity: 1, unit: "pinch" },
          { name: "oil", quantity: 500, unit: "ml", note: "for frying" },
        ],
        [
          "1. Mix flour, yogurt, a pinch of colour, and enough water for a thick pouring batter; ferment 4–8 hours if time allows.",
          "2. Simmer sugar with 150 ml water into a sticky syrup; keep warm.",
          "3. Pipe spirals of batter into hot oil and fry until crisp on both sides.",
          "4. Drain briefly and soak in warm syrup for a minute before serving.",
        ],
        {
          description:
            "Crisp saffron-tinted pretzel swirls soaked in warm sugar syrup.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 20,
          cookMinutes: 25,
          difficulty: "challenging",
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Kingfisher / Indian Lager",
        "बीयर",
        "beer",
        true,
        "Light lager commonly paired with spicy curries and snacks.",
      ),
      drink(
        "Nimbu Pani",
        "निम्बू पानी",
        "soft-drink",
        false,
        "Fresh lime water sweetened and salted for hot weather.",
      ),
      drink(
        "Filter Coffee",
        "फ़िल्टर कॉफ़ी",
        "coffee",
        false,
        "Strong South Indian-style coffee mixed with hot milk.",
      ),
    ],
  },
  status: "published",
};
