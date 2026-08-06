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
    starter: r("guacamole", "Guacamole", "Guacamole", "starter", [
      { name: "avocados", quantity: 4, unit: "pieces" },
      { name: "lime", quantity: 2, unit: "pieces" },
      { name: "tomatoes", quantity: 2, unit: "pieces" },
    ]),
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
      "A famous chile-and-spice sauce, complex and dark, served over tender chicken.",
    ),
    side: r("frijoles-refritos", "Refried Beans", "Frijoles refritos", "side", [
      { name: "cooked pinto beans", quantity: 700, unit: "g" },
      { name: "onion", quantity: 1, unit: "piece" },
      { name: "oil", quantity: 45, unit: "ml" },
    ]),
    dessert: r("arroz-con-leche", "Cinnamon Rice Pudding", "Arroz con leche", "dessert", [
      { name: "rice", quantity: 180, unit: "g" },
      { name: "milk", quantity: 1000, unit: "ml" },
      { name: "cinnamon", quantity: 8, unit: "g" },
    ]),
    drink: drink(
      "Agua de Jamaica",
      "Agua de jamaica",
      "soft-drink",
      false,
      "Tart hibiscus agua fresca, sweetened and served cold.",
    ),
  },
  status: "published",
};
