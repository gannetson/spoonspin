import type { Country } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";
export const mxCountry: Country = {
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
        { name: "avocados", quantity: 4, unit: "pieces" },
        { name: "lime", quantity: 2, unit: "pieces" },
        { name: "tomatoes", quantity: 2, unit: "pieces" },
      ],
      { dietaryLabels: ["vegetarian", "vegan"] },
    ),
    main: r(
      "mole-poblano",
      "Mole Poblano",
      "Mole poblano",
      "main",
      [
        { name: "chicken", quantity: 800, unit: "g" },
        { name: "mole paste", quantity: 250, unit: "g" },
        { name: "chicken stock", quantity: 600, unit: "ml" },
        { name: "sesame seeds", quantity: 20, unit: "g" },
      ],
      {
        description:
          "A famous chile-and-spice sauce, complex and dark, served over tender chicken.",
        dietaryLabels: ["contains-meat"],
      },
    ),
    side: r(
      "frijoles-refritos",
      "Refried Beans",
      "Frijoles refritos",
      "side",
      [
        { name: "cooked pinto beans", quantity: 700, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "oil", quantity: 45, unit: "ml" },
      ],
      { dietaryLabels: ["vegetarian", "vegan"] },
    ),
    dessert: r(
      "arroz-con-leche",
      "Cinnamon Rice Pudding",
      "Arroz con leche",
      "dessert",
      [
        { name: "rice", quantity: 180, unit: "g" },
        { name: "milk", quantity: 1000, unit: "ml" },
        { name: "cinnamon", quantity: 8, unit: "g" },
      ],
      { dietaryLabels: ["vegetarian"] },
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
          { name: "corn tortillas", quantity: 12, unit: "pieces" },
          { name: "pineapple", quantity: 200, unit: "g" },
        ],
        {
          description:
            "Marinated spit-style pork tucked into warm tortillas with pineapple.",
          dietaryLabels: ["contains-meat"],
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
          { name: "cotija cheese", quantity: 60, unit: "g" },
          { name: "chili powder", quantity: 5, unit: "g" },
        ],
        {
          description:
            "Grilled corn slathered with creamy chile-lime topping and crumbled cheese.",
          dietaryLabels: ["vegetarian"],
        },
      ),
      r(
        "churros",
        "Churros",
        "Churros",
        "dessert",
        [
          { name: "flour", quantity: 250, unit: "g" },
          { name: "water", quantity: 250, unit: "ml" },
          { name: "sugar", quantity: 80, unit: "g" },
          { name: "cinnamon", quantity: 5, unit: "g" },
        ],
        {
          description:
            "Crisp fried dough ridges rolled in cinnamon sugar, ideal with hot chocolate.",
          dietaryLabels: ["vegetarian", "vegan"],
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
