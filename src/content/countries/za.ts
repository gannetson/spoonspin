import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const zaCountry: AuthoredCountry = {
  code: "za",
  slug: "south-africa",
  name: "South Africa",
  flag: "🇿🇦",
  region: "Africa",
  introduction:
    "South African cooking reflects Indigenous, Dutch, Malay, Indian, and British influences. Fire-grilled food, fragrant curries, dried meats, and sweet baked puddings all belong at the table.",
  cuisineAliases: [
    "South African restaurant",
    "Zuid-Afrikaans restaurant",
    "braai restaurant",
  ],
  nationalDishId: "boboti",
  nationalDrink: drink(
    "Cape Wine",
    "Kaapse wijn",
    "wine",
    true,
    "South African wine, especially from the Cape, ranges from crisp Chenin Blanc to bold reds.",
  ),
  menu: {
    starter: r(
      "biltong",
      "Biltong",
      "Biltong",
      "starter",
      [
        { name: "lean beef silverside or topside", quantity: 800, unit: "g" },
        { name: "coriander seeds", quantity: 15, unit: "g" },
        { name: "coarse salt", quantity: 40, unit: "g" },
        { name: "brown sugar", quantity: 20, unit: "g" },
        { name: "red wine vinegar", quantity: 80, unit: "ml" },
        { name: "black pepper", quantity: 10, unit: "g" },
      ],
      [
        "1. Toast and crush coriander seeds; mix with salt, sugar, and pepper.",
        "2. Slice beef into thick strips along the grain, dip in vinegar, and coat thoroughly in the spice mix.",
        "3. Hang in a cool, dry, well-ventilated place (or use a dehydrator at low heat) until dry but still slightly tender inside—several days traditionally.",
        "4. Slice thinly against the grain to serve as a snack.",
      ],
      {
        description:
          "Air-dried spiced beef strips—an iconic South African snack cured at home with patience.",
        dietaryLabels: ["contains-meat", "gluten-free"],
        prepMinutes: 30,
        cookMinutes: 0,
        difficulty: "challenging",
        substitutions: [
          "For a quicker Dutch-kitchen version, buy ready biltong or use a food dehydrator; never dry meat in humid warm rooms.",
        ],
        servingSuggestion: "Serve thinly sliced with a cold drink.",
      },
    ),
    main: r(
      "boboti",
      "Bobotie",
      "Bobotie",
      "main",
      [
        { name: "ground beef", quantity: 700, unit: "g" },
        { name: "bread", quantity: 2, unit: "slices" },
        { name: "milk", quantity: 300, unit: "ml" },
        { name: "curry powder", quantity: 15, unit: "g" },
        { name: "onion", quantity: 2, unit: "pieces" },
        { name: "raisins", quantity: 60, unit: "g" },
        { name: "eggs", quantity: 2, unit: "pieces" },
        { name: "apricot jam", quantity: 30, unit: "g" },
      ],
      [
        "1. Soak bread in half the milk; soften onion, then brown the mince with curry powder.",
        "2. Stir in squeezed bread, raisins, jam, a splash of vinegar, and seasoning; tip into a baking dish.",
        "3. Beat eggs with remaining milk, pour over as a custard, and add bay leaves on top.",
        "4. Bake at 180°C until the custard is set and golden; serve with yellow rice.",
      ],
      {
        description:
          "A gently curried meat bake with fruit, egg custard, and Cape Malay character.",
        dietaryLabels: ["contains-meat"],
        prepMinutes: 25,
        cookMinutes: 45,
        difficulty: "easy",
      },
    ),
    side: r(
      "chakalaka",
      "Chakalaka",
      "Chakalaka",
      "side",
      [
        { name: "tinned baked beans or kidney beans", quantity: 500, unit: "g" },
        { name: "red peppers", quantity: 2, unit: "pieces" },
        { name: "carrots", quantity: 300, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "curry powder", quantity: 10, unit: "g" },
        { name: "tomatoes", quantity: 300, unit: "g" },
      ],
      [
        "1. Soften onion, grated carrot, and pepper in oil.",
        "2. Add curry powder, then chopped tomato; cook until saucy.",
        "3. Stir in beans and simmer until thick and glossy.",
        "4. Season and serve warm or at room temperature.",
      ],
      {
        description:
          "Spicy vegetable-and-bean relish that brightens braai plates.",
        dietaryLabels: ["vegetarian", "vegan"],
        prepMinutes: 15,
        cookMinutes: 25,
        difficulty: "easy",
      },
    ),
    dessert: r(
      "malva-pudding",
      "Malva Pudding",
      "Malvapoeding",
      "dessert",
      [
        { name: "plain flour", quantity: 200, unit: "g" },
        { name: "apricot jam", quantity: 80, unit: "g" },
        { name: "sugar", quantity: 150, unit: "g" },
        { name: "eggs", quantity: 2, unit: "pieces" },
        { name: "milk", quantity: 125, unit: "ml" },
        { name: "bicarbonate of soda", quantity: 5, unit: "g" },
        { name: "cream", quantity: 250, unit: "ml" },
        { name: "butter", quantity: 100, unit: "g" },
      ],
      [
        "1. Beat eggs and sugar, then mix in jam, melted butter, flour, bicarb, and milk into a batter.",
        "2. Bake in a buttered dish at 180°C until risen and springy.",
        "3. Heat cream, butter, and sugar into a pouring sauce.",
        "4. Poke holes in the hot pudding and soak thoroughly with the sauce; rest before serving.",
      ],
      {
        description:
          "Squidgy apricot sponge soaked in a rich cream sauce while still hot.",
        dietaryLabels: ["vegetarian"],
        prepMinutes: 20,
        cookMinutes: 40,
        difficulty: "easy",
      },
    ),
    drink: drink(
      "Rooibos Tea",
      "Rooibos",
      "tea",
      false,
      "Naturally caffeine-free red bush tea, served plain or with milk.",
    ),
    moreRecipes: [
      r(
        "boerewors",
        "Boerewors Sausage",
        "Boerewors",
        "main",
        [
          { name: "boerewors sausage", quantity: 800, unit: "g" },
          { name: "braai spice or coriander seed", quantity: 10, unit: "g" },
          { name: "soft rolls", quantity: 4, unit: "pieces" },
        ],
        [
          "1. Keep the coiled sausage intact; oil lightly and season with coriander if needed.",
          "2. Grill over medium coals or a griddle, turning carefully so the casing does not split.",
          "3. Cook until browned and cooked through.",
          "4. Serve in soft rolls or with pap and chakalaka.",
        ],
        {
          description:
            "Coiled spiced beef-and-pork sausage grilled over coals for a classic braai.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 10,
          cookMinutes: 25,
          difficulty: "easy",
          substitutions: [
            "Boerewors is sold in some Dutch butchers and specialty shops; a coarse spiced sausage is the closest alternative.",
          ],
        },
      ),
      r(
        "potjiekos",
        "Potjie Stew",
        "Potjiekos",
        "main",
        [
          { name: "beef stewing meat", quantity: 800, unit: "g" },
          { name: "potatoes", quantity: 400, unit: "g" },
          { name: "carrots", quantity: 300, unit: "g" },
          { name: "onion", quantity: 2, unit: "pieces" },
          { name: "beef stock", quantity: 400, unit: "ml" },
          { name: "bay leaves", quantity: 2, unit: "pieces" },
        ],
        [
          "1. Brown the meat in a heavy pot or potjie; remove and soften onion in the fat.",
          "2. Layer meat back in, then vegetables on top without stirring.",
          "3. Add stock and bay leaves, cover, and simmer gently 2–3 hours until tender.",
          "4. Stir only at the end; serve with rice or bread.",
        ],
        {
          description:
            "Layered meat-and-vegetable stew cooked slowly in a cast-iron potjie over fire.",
          dietaryLabels: ["contains-meat"],
          prepMinutes: 25,
          cookMinutes: 150,
          difficulty: "medium",
        },
      ),
      r(
        "koeksisters",
        "Syrup Twists",
        "Koeksisters",
        "dessert",
        [
          { name: "plain flour", quantity: 400, unit: "g" },
          { name: "milk", quantity: 200, unit: "ml" },
          { name: "sugar", quantity: 400, unit: "g" },
          { name: "lemon", quantity: 1, unit: "piece" },
          { name: "butter", quantity: 50, unit: "g" },
          { name: "baking powder", quantity: 15, unit: "g" },
          { name: "oil", quantity: 1, unit: "litre", note: "for frying" },
        ],
        [
          "1. Make a cold syrup from sugar, water, lemon, and a little ginger; chill thoroughly.",
          "2. Mix a soft dough with flour, baking powder, butter, and milk; rest, then plait into small twists.",
          "3. Fry until deep golden.",
          "4. Plunge hot koeksisters straight into the ice-cold syrup until glassy; drain on a rack.",
        ],
        {
          description:
            "Plaited doughnuts plunged into ice-cold syrup until glassy and intensely sweet.",
          dietaryLabels: ["vegetarian"],
          prepMinutes: 40,
          cookMinutes: 30,
          difficulty: "challenging",
        },
      ),
    ],
    moreDrinks: [
      drink(
        "Amarula Cream",
        "Amarula",
        "spirit",
        true,
        "Creamy marula-fruit liqueur often served over ice after dinner.",
      ),
      drink(
        "Castle Lager",
        "Castle",
        "beer",
        true,
        "Classic South African lager for braai days.",
      ),
    ],
  },
  status: "published",
};
