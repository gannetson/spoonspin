import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const mxCountry: AuthoredCountry = {
  code: "mx",
  slug: "mexico",
  name: "Mexico",
  flag: "🇲🇽",
  region: "Americas",
  introduction:
    "Mexican cooking is built on corn, beans, chiles, tomatoes, and brilliant regional sauces. A meal can be simple street food or a layered celebration of Indigenous and colonial traditions.",
  cuisineAliases: ["Mexican restaurant", "Mexicaans restaurant", "taquería"],
  nationalDishId: "mole-poblano",
  nationalDrink: drink(
    "Tequila",
    "Tequila",
    "spirit",
    true,
    "Blue-agave spirit, often sipped or mixed in a margarita.",
  ),
  menu: {
    starter: r(
      "guacamole",
      "Guacamole",
      "Guacamole",
      "starter",
      [
        { name: "ripe avocados", quantity: 4, unit: "pieces" },
        { name: "lime", quantity: 2, unit: "pieces" },
        { name: "tomato", quantity: 1, unit: "piece" },
        { name: "red onion", quantity: 0.5, unit: "piece" },
        { name: "fresh coriander", quantity: 15, unit: "g" },
        { name: "jalapeño or mild green chile", quantity: 1, unit: "piece" },
      ],
      [
        "1. Halve the avocados, scoop the flesh into a bowl, and mash roughly with a fork.",
        "2. Fold in finely diced tomato, onion, chile, and chopped coriander.",
        "3. Season with salt and plenty of lime juice; taste and adjust until bright and creamy.",
        "4. Serve at once with warm tortillas or tortilla chips.",
      ],
      {
        description:
          "Chunky mashed avocado with lime, tomato, onion, chile, and coriander.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 15,
        cookMinutes: 0,
        difficulty: "easy",
      },
    ),
    main: r(
      "mole-poblano",
      "Mole Poblano",
      "Mole poblano",
      "main",
      [
        { name: "chicken pieces", quantity: 800, unit: "g" },
        { name: "mole paste", quantity: 250, unit: "g" },
        { name: "chicken stock", quantity: 600, unit: "ml" },
        { name: "sesame seeds", quantity: 20, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
      ],
      [
        "1. Simmer the chicken with onion and stock until tender, about 30–40 minutes; reserve the broth.",
        "2. In a separate pan, loosen the mole paste with ladles of hot broth, stirring until smooth and pourable.",
        "3. Simmer the sauce gently 10–15 minutes, tasting for salt and depth; thin with more broth if needed.",
        "4. Nestle the chicken into the mole, warm through, and finish with toasted sesame seeds.",
      ],
      {
        description:
          "A dark, complex chile-and-spice sauce spooned over tender poached chicken.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 20,
        cookMinutes: 55,
        difficulty: "medium",
        substitutions: [
          "Jarred mole paste from Latin or well-stocked Dutch shops is the practical home route; turkey also works.",
        ],
      },
    ),
    side: r(
      "frijoles-refritos",
      "Refried Beans",
      "Frijoles refritos",
      "side",
      [
        { name: "cooked pinto or black beans", quantity: 700, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "oil or lard", quantity: 45, unit: "ml" },
        { name: "garlic", quantity: 2, unit: "cloves" },
      ],
      [
        "1. Soften finely chopped onion and garlic in the oil until golden.",
        "2. Add the beans with a splash of their cooking liquid and mash to a thick paste.",
        "3. Cook, stirring, until the beans look creamy and slightly fried at the edges; season with salt.",
      ],
      {
        description:
          "Creamy mashed beans fried with onion until thick and savoury.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 10,
        cookMinutes: 20,
        difficulty: "easy",
        substitutions: [
          "Tinned kidney or black beans work well; rinse if they taste very salty.",
        ],
      },
    ),
    dessert: r(
      "arroz-con-leche",
      "Cinnamon Rice Pudding",
      "Arroz con leche",
      "dessert",
      [
        { name: "short-grain rice", quantity: 180, unit: "g" },
        { name: "milk", quantity: 1000, unit: "ml" },
        { name: "sugar", quantity: 100, unit: "g" },
        { name: "cinnamon stick", quantity: 1, unit: "piece" },
        { name: "vanilla extract", quantity: 5, unit: "ml" },
      ],
      [
        "1. Rinse the rice, then simmer it with half the milk and the cinnamon stick until the grains soften.",
        "2. Stir in the remaining milk and sugar; cook gently, stirring often, until thick and creamy.",
        "3. Remove the cinnamon, add vanilla, and serve warm or chilled with a dusting of ground cinnamon.",
      ],
      {
        description:
          "Creamy rice pudding slow-cooked with milk and fragrant cinnamon.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 10,
        cookMinutes: 40,
        difficulty: "easy",
      },
    ),
    drink: drink(
      "Agua de Jamaica",
      "Agua de jamaica",
      "soft-drink",
      false,
      "Tart hibiscus agua fresca, sweetened and served cold.",
    ),
    moreRecipes: [
      r(
        "tacos-al-pastor",
        "Tacos al Pastor",
        "Tacos al pastor",
        "main",
        [
          { name: "pork shoulder", quantity: 800, unit: "g" },
          { name: "achiote paste", quantity: 40, unit: "g" },
          { name: "orange juice", quantity: 120, unit: "ml" },
          { name: "corn tortillas", quantity: 12, unit: "pieces" },
          { name: "pineapple", quantity: 200, unit: "g" },
          { name: "white onion", quantity: 1, unit: "piece" },
        ],
        [
          "1. Blend achiote with orange juice, a little vinegar, garlic, and salt; marinate thin pork slices 2 hours or overnight.",
          "2. Grill or pan-sear the pork until charred at the edges; warm pineapple slices alongside.",
          "3. Chop the meat, warm the tortillas, and fill with pork, pineapple, and diced onion.",
          "4. Finish with coriander and a squeeze of lime.",
        ],
        {
          description:
            "Marinated spit-style pork tucked into warm tortillas with pineapple.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 30,
          cookMinutes: 25,
          difficulty: "medium",
          substitutions: [
            "Achiote paste is in Latin shops; paprika plus a little vinegar and orange zest is a rough stand-in.",
          ],
        },
      ),
      r(
        "elote",
        "Street Corn",
        "Elote",
        "snack",
        [
          { name: "corn on the cob", quantity: 4, unit: "pieces" },
          { name: "mayonnaise", quantity: 80, unit: "g" },
          { name: "cotija or feta cheese", quantity: 60, unit: "g" },
          { name: "chili powder or tajín", quantity: 5, unit: "g" },
          { name: "lime", quantity: 2, unit: "pieces" },
        ],
        [
          "1. Grill or boil the corn until tender and lightly charred.",
          "2. Brush each cob with mayonnaise while hot.",
          "3. Roll in crumbled cheese, dust with chili powder, and serve with lime wedges.",
        ],
        {
          description:
            "Grilled corn slathered with creamy chile-lime topping and crumbled cheese.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 10,
          cookMinutes: 15,
          difficulty: "easy",
          substitutions: [
            "Feta or aged cheese from Dutch shops stands in for cotija.",
          ],
        },
      ),
      r(
        "churros",
        "Churros",
        "Churros",
        "dessert",
        [
          { name: "plain flour", quantity: 250, unit: "g" },
          { name: "water", quantity: 250, unit: "ml" },
          { name: "butter", quantity: 40, unit: "g" },
          { name: "sugar", quantity: 80, unit: "g" },
          { name: "cinnamon", quantity: 5, unit: "g" },
          { name: "neutral oil", quantity: 1, unit: "litre", note: "for frying" },
        ],
        [
          "1. Bring water, butter, and a pinch of salt to a boil; beat in the flour until a smooth dough forms.",
          "2. Pipe thick ridges into hot oil (about 180°C) and fry until deep golden.",
          "3. Drain briefly, then roll in cinnamon sugar while still warm.",
        ],
        {
          description:
            "Crisp fried dough ridges rolled in cinnamon sugar, ideal with hot chocolate.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 15,
          cookMinutes: 20,
          difficulty: "medium",
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Corona / Mexican Lager",
        "Cerveza",
        "beer",
        true,
        "Light lager often served with lime alongside spicy street food.",
      ),
      drink(
        "Mezcal",
        "Mezcal",
        "spirit",
        true,
        "Smoky agave spirit sipped neat or in simple cocktails.",
      ),
      drink(
        "Horchata",
        "Horchata",
        "soft-drink",
        false,
        "Cool rice-and-cinnamon drink that softens chile heat.",
      ),
    ],
  },
  status: "published",
};
