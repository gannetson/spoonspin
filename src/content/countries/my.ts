import type { AuthoredCountry } from "@/types/content";
import { drink, recipe as r } from "./content-helpers";

export const myCountry: AuthoredCountry = {
  code: "my",
  slug: "malaysia",
  name: "Malaysia",
  flag: "🇲🇾",
  region: "Asia",
  introduction:
    "Malaysian cooking weaves Malay, Chinese, and Indian traditions into coconut-rich curries, fragrant rice, noodles, and fiery sambal. Nasi lemak, satay, and teh tarik are everyday icons.",
  cuisineAliases: [
    "Malaysian restaurant",
    "Maleisisch restaurant",
    "Malay restaurant",
  ],
  nationalDishId: "nasi-lemak",
  nationalDrink: drink(
    "Teh Tarik",
    "Teh Tarik",
    "tea",
    false,
    "Pulled milk tea poured between cups until frothy — Malaysia’s iconic non-alcoholic café drink.",
  ),
  menu: {
    starter: r(
      "satay",
      "Chicken Satay",
      "Sate Ayam",
      "starter",
      [
        { name: "chicken thigh", quantity: 600, unit: "g" },
        { name: "lemongrass", quantity: 2, unit: "stalks" },
        { name: "turmeric", quantity: 5, unit: "g" },
        { name: "ground coriander", quantity: 5, unit: "g" },
        { name: "coconut milk", quantity: 80, unit: "ml" },
        { name: "palm sugar", quantity: 20, unit: "g" },
        { name: "peanut butter or ground peanuts", quantity: 120, unit: "g" },
        { name: "tamarind paste", quantity: 15, unit: "g" },
      ],
      [
        "1. Blend lemongrass, turmeric, coriander, salt, and a little coconut milk; marinate cubed chicken at least 1 hour.",
        "2. Thread onto skewers and grill until charred at the edges and cooked through.",
        "3. Simmer peanut butter with remaining coconut milk, palm sugar, tamarind, and chili to a thick satay sauce.",
        "4. Serve skewers with sauce, cucumber, and onion.",
      ],
      {
        description:
          "Char-grilled spiced chicken skewers with peanut sauce — Malaysia’s favourite starter snack.",
        dietaryLabels: ["contains-meat", "gluten-free", "dairy-free"],
        prepMinutes: 25,
        cookMinutes: 20,
        difficulty: "medium",
        substitutions: [
          "Lemongrass and tamarind are in toko aisles; brown sugar stands in for palm sugar.",
        ],
      },
    ),
    main: r(
      "nasi-lemak",
      "Nasi Lemak",
      "Nasi Lemak",
      "main",
      [
        { name: "jasmine rice", quantity: 350, unit: "g" },
        { name: "coconut milk", quantity: 300, unit: "ml" },
        { name: "pandan leaf", quantity: 2, unit: "pieces", note: "optional" },
        { name: "dried anchovies (ikan bilis)", quantity: 80, unit: "g" },
        { name: "roasted peanuts", quantity: 80, unit: "g" },
        { name: "eggs", quantity: 4, unit: "pieces" },
        { name: "cucumber", quantity: 1, unit: "piece" },
        { name: "sambal chili paste", quantity: 80, unit: "g" },
        { name: "onion", quantity: 1, unit: "piece" },
      ],
      [
        "1. Rinse rice and cook with coconut milk, a pinch of salt, and knotted pandan until fluffy.",
        "2. Fry dried anchovies until crisp; soften onion and cook sambal until oily and fragrant.",
        "3. Fry or boil eggs; slice cucumber.",
        "4. Plate coconut rice with sambal, ikan bilis, peanuts, egg, and cucumber.",
      ],
      {
        description:
          "Coconut rice with sambal, crispy anchovies, peanuts, and egg — widely considered Malaysia’s national breakfast plate.",
        dietaryLabels: ["contains-seafood", "gluten-free", "dairy-free"],
        prepMinutes: 20,
        cookMinutes: 35,
        difficulty: "medium",
        substitutions: [
          "Skip ikan bilis for a milder plate; ready sambal from Asian shops works when making paste from scratch is too much.",
          "Frozen pandan leaves are sold in toko freezers.",
        ],
      },
    ),
    side: r(
      "sambal-kangkung",
      "Sambal Water Spinach",
      "Sambal Kangkung",
      "side",
      [
        { name: "water spinach (kangkung)", quantity: 400, unit: "g" },
        { name: "sambal or chili paste", quantity: 40, unit: "g" },
        { name: "garlic", quantity: 3, unit: "cloves" },
        { name: "shrimp paste (belacan)", quantity: 10, unit: "g", note: "optional" },
        { name: "oil", quantity: 30, unit: "ml" },
      ],
      [
        "1. Wash kangkung and cut into lengths; keep stems and leaves separate if stems are thick.",
        "2. Fry garlic and belacan briefly, then stir in sambal until fragrant.",
        "3. Add stems first, then leaves; stir-fry on high heat just until wilted and coated.",
      ],
      {
        description:
          "Quick wok-tossed water spinach in chili sambal — the sharp green side to rich coconut rice.",
        dietaryLabels: ["contains-seafood", "gluten-free", "dairy-free"],
        prepMinutes: 10,
        cookMinutes: 10,
        difficulty: "easy",
        substitutions: [
          "Kangkung is in Asian greengrocers; spinach or morning glory alternatives wilt similarly — skip belacan for vegetarian.",
        ],
      },
    ),
    dessert: r(
      "cendol",
      "Cendol",
      "Cendol",
      "dessert",
      [
        { name: "coconut milk", quantity: 400, unit: "ml" },
        { name: "palm sugar", quantity: 120, unit: "g" },
        { name: "pandan extract or juice", quantity: 30, unit: "ml" },
        { name: "rice flour", quantity: 80, unit: "g" },
        { name: "tapioca starch", quantity: 40, unit: "g" },
        { name: "ice cubes", quantity: 200, unit: "g" },
        { name: "cooked red beans", quantity: 100, unit: "g", note: "optional" },
      ],
      [
        "1. Dissolve palm sugar with a splash of water into a dark syrup; cool.",
        "2. Cook rice flour, tapioca, pandan, and water into a thick paste; press through a colander into ice water to form green droplets.",
        "3. Assemble bowls with cendol strands, crushed ice, coconut milk, palm sugar syrup, and red beans if using.",
      ],
      {
        description:
          "Iced coconut dessert with green pandan jelly strands and palm sugar syrup — Malaysia’s favourite sweet cooler.",
        dietaryLabels: ["vegetarian", "vegan", "gluten-free"],
        prepMinutes: 25,
        cookMinutes: 20,
        difficulty: "medium",
        substitutions: [
          "Ready frozen cendol strands from Asian shops save time; gula jawa replaces palm sugar.",
        ],
      },
    ),
    drink: drink(
      "Sirap Bandung",
      "Sirap Bandung",
      "soft-drink",
      false,
      "Rose syrup mixed with evaporated milk over ice — a sweet non-alcoholic Malaysian cooler.",
    ),
    moreDrinks: [
      drink(
        "Kopi",
        "Kopi",
        "coffee",
        false,
        "Strong local coffee often sweetened with condensed milk — non-alcoholic kopitiam classic.",
      ),
    ],
    moreRecipes: [
      r(
        "nasi-goreng-kampung",
        "Village Fried Rice",
        "Nasi Goreng Kampung",
        "main",
        [
          { name: "cooked rice", quantity: 600, unit: "g" },
          { name: "anchovies", quantity: 40, unit: "g" },
          { name: "kangkung or greens", quantity: 150, unit: "g" },
          { name: "egg", quantity: 2, unit: "pieces" },
          { name: "sambal", quantity: 40, unit: "g" },
          { name: "garlic", quantity: 3, unit: "cloves" },
          { name: "oil", quantity: 40, unit: "ml" },
        ],
        [
          "1. Fry anchovies until crisp; set aside. Scramble eggs in the wok and push aside.",
          "2. Fry garlic and sambal, add greens briefly, then the cold rice; toss on high heat.",
          "3. Season with salt or a splash of soy; top with crispy anchovies.",
        ],
        {
          description:
            "Spicy kampung-style fried rice with sambal, greens, and crunchy ikan bilis.",
          dietaryLabels: ["contains-seafood", "dairy-free"],
          prepMinutes: 15,
          cookMinutes: 15,
          difficulty: "easy",
        },
      ),
    ],
  },
  status: "published",
};
