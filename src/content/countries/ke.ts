import type { Country } from "@/types/content";

export const keCountry: Country = {
  code: "ke",
  slug: "kenya",
  name: "Kenya",
  flag: "🇰🇪",
  region: "Africa",
  introduction:
    "Kenyan food is shaped by regional communities, Indian Ocean trade, and everyday staples such as maize, beans, greens, tea, and grilled meat. Ugali, sukuma wiki, nyama choma, mandazi, and spiced chai are widely recognised comfort foods, while the coast adds coconut, cardamom, and pilau spices.",
  cuisineAliases: ["Kenyan restaurant", "Keniaans restaurant", "East African restaurant"],
  nationalDishId: "nyama-choma",
  nationalDrink: {
    name: "Kenyan Chai",
    localName: "Chai",
    type: "tea",
    alcoholic: false,
    description:
      "Strong black tea simmered with milk, sugar, and warming spices such as cardamom or ginger.",
  },
  specialtyShops: [
    {
      name: "Kenyan Diaspora Market",
      url: "https://www.kenyandiasporamarket.com/product-category/kenyan-food/",
      description:
        "Online Kenyan pantry source with sukuma wiki, Royco mchuzi mix, tea masala, Kenyan tea, omena, and ready Kenyan dry goods.",
      ingredients: ["sukuma wiki", "Royco mchuzi mix", "tea masala", "Kenyan tea"],
    },
    {
      name: "African Taste",
      url: "https://africantaste.eu/",
      description:
        "Netherlands-based African grocery carrying East African staples including maize flour and stew seasoning mixes.",
      ingredients: ["Maganjo maize flour", "Royco mchuzi mix", "cassava flour"],
    },
    {
      name: "Africa Products Shop",
      url: "https://africaproducts.nl/products/jogoo-maize-flour-unga-wa-mahindi-2-kg",
      description:
        "Specialty African webshop with Kenyan Jogoo maize flour for ugali and alternatives such as white maize flour.",
      ingredients: ["Jogoo maize flour", "white maize flour", "ugali flour"],
    },
    {
      name: "Kenyan Delicacies",
      url: "https://www.kenyandelicacies.com/",
      description:
        "Kenyan restaurant and caterer in The Hague that also sources Kenyan dry foods such as flour, spices, oils, and tea.",
      ingredients: ["Kenyan flour", "Kenyan spices", "Kenyan tea"],
    },
  ],
  menu: {
    starter: {
      id: "kachumbari",
      name: "Kachumbari",
      localName: "Kachumbari",
      description:
        "A bright tomato, onion, coriander, and chile salad that cuts through grilled meat and wakes up a plate of ugali.",
      category: "starter",
      servings: 4,
      prepMinutes: 20,
      cookMinutes: 0,
      difficulty: "easy",
      dietaryLabels: ["vegan", "gluten-free"],
      ingredients: [
        { name: "ripe tomatoes", quantity: 4, unit: "pieces" },
        { name: "red onion", quantity: 1, unit: "piece" },
        { name: "fresh coriander", quantity: 20, unit: "g", note: "dhania" },
        { name: "green chile", quantity: 1, unit: "piece", note: "optional" },
        { name: "lime", quantity: 1, unit: "piece" },
      ],
      steps: [
        "1. Dice the tomatoes, thinly slice the onion, chop the coriander, and mince the chile if using.",
        "2. Rinse the sliced onion under cold water or soak it for 10 minutes to soften its sharpness, then drain well.",
        "3. Toss tomatoes, onion, coriander, chile, lime juice, and salt together just before serving so the salad stays crisp.",
      ],
      substitutions: [
        "Use lemon juice when limes are not available; Dutch red onions work well if soaked briefly.",
      ],
      servingSuggestion:
        "Serve chilled or at room temperature beside nyama choma, ugali, or any grilled food.",
      drinkPairing:
        "Kenyan chai is classic later in the meal; fresh passion fruit juice also works.",
      sources: [
        {
          title: "Kenyan Food Journal kachumbari method within nyama choma",
          url: "https://kenyanfoodjournal.com/nyama-choma-recipe-kenyan-grilled-meat/",
          type: "full-recipe",
        },
        {
          title: "AfroKitchen nyama choma plate photos with kachumbari",
          url: "https://afrotools.com/tools/afrokitchen/recipes/nyama-choma/",
          type: "photo-guide",
        },
        {
          title: "How to make ugali and sukuma wiki Kenyan cooking class",
          url: "https://www.youtube.com/watch?v=tdZ0YhB8exE",
          type: "video",
        },
      ],
    },
    main: {
      id: "nyama-choma",
      name: "Nyama Choma",
      localName: "Nyama Choma",
      description:
        "Kenya's beloved charcoal-grilled meat, usually goat or beef, cooked slowly, rested, chopped, and shared with kachumbari and ugali.",
      category: "main",
      servings: 4,
      prepMinutes: 20,
      cookMinutes: 75,
      difficulty: "medium",
      dietaryLabels: ["gluten-free", "dairy-free"],
      ingredients: [
        { name: "bone-in goat or beef ribs", quantity: 1200, unit: "g" },
        { name: "coarse salt", quantity: 12, unit: "g" },
        { name: "black pepper", quantity: 4, unit: "g" },
        { name: "garlic", quantity: 3, unit: "cloves", note: "crushed, optional" },
        { name: "ginger", quantity: 15, unit: "g", note: "grated, optional" },
        { name: "lemon", quantity: 1, unit: "piece" },
      ],
      steps: [
        "1. Pat the meat dry, rub with salt, pepper, garlic, ginger, and lemon juice, then rest while a charcoal grill settles to medium heat.",
        "2. Grill the meat away from harsh flames, turning often and basting lightly with salted water if it begins to dry.",
        "3. Cook until browned and tender near the bone, rest for 10 minutes, then chop into bite-size pieces and serve hot.",
      ],
      substitutions: [
        "Goat is traditional but not always stocked in Dutch supermarkets; use beef short ribs or lamb shoulder from a halal or African butcher.",
        "A kettle barbecue or oven grill can stand in for charcoal, though charcoal gives the most typical flavour.",
      ],
      servingSuggestion:
        "Put the chopped meat on a board with kachumbari, ugali, sukuma wiki, and extra salt for dipping.",
      drinkPairing:
        "Serve with cold Tusker-style lager if desired, or keep it non-alcoholic with Kenyan chai or passion fruit juice.",
      sources: [
        {
          title: "Kenyan Food Journal authentic nyama choma recipe",
          url: "https://kenyanfoodjournal.com/nyama-choma-recipe-kenyan-grilled-meat/",
          type: "full-recipe",
        },
        {
          title: "We Eat At Last nyama choma recipe and video guide",
          url: "https://weeatatlast.com/the-ultimate-nyama-choma-recipe/",
          type: "photo-guide",
        },
        {
          title: "AfroKitchen nyama choma finished dish photos",
          url: "https://afrotools.com/tools/afrokitchen/recipes/nyama-choma/",
          type: "photo-guide",
        },
      ],
    },
    side: {
      id: "ugali-sukuma-wiki",
      name: "Ugali with Sukuma Wiki",
      localName: "Ugali na Sukuma Wiki",
      description:
        "A daily Kenyan pairing of firm white maize porridge and tomato-onion greens whose Swahili name means to stretch the week.",
      category: "side",
      servings: 4,
      prepMinutes: 15,
      cookMinutes: 25,
      difficulty: "medium",
      dietaryLabels: ["vegan", "gluten-free"],
      ingredients: [
        { name: "white maize flour", quantity: 250, unit: "g", note: "unga wa mahindi" },
        { name: "water", quantity: 650, unit: "ml" },
        { name: "collard greens or kale", quantity: 400, unit: "g", note: "sukuma wiki" },
        { name: "onion", quantity: 1, unit: "piece" },
        { name: "tomatoes", quantity: 2, unit: "pieces" },
        { name: "sunflower oil", quantity: 30, unit: "ml" },
      ],
      steps: [
        "1. Bring 500 ml water to a boil with a pinch of salt, then gradually stir in maize flour with a sturdy wooden spoon.",
        "2. Keep stirring and pressing until the ugali thickens, pulls from the pot, and can be shaped into a dome; add splashes of hot water only if too stiff.",
        "3. In a separate pan, soften onion in oil, add tomatoes until saucy, then toss in shredded greens and cook until just tender.",
        "4. Turn the ugali onto a plate and serve immediately with the sukuma wiki spooned alongside.",
      ],
      substitutions: [
        "Use fine white cornmeal or white maize meal if Kenyan unga is unavailable; avoid polenta because the texture cooks up too coarse.",
        "Kale, cavolo nero, or Swiss chard can replace Kenyan sukuma wiki in Dutch supermarkets.",
      ],
      servingSuggestion:
        "Pinch off pieces of ugali by hand or slice it into wedges for scooping the greens and juices.",
      drinkPairing:
        "Milky Kenyan chai balances the greens and maize with gentle sweetness.",
      sources: [
        {
          title: "Serious Eats ugali recipe with serving photo",
          url: "https://www.seriouseats.com/ugali-cornmeal-porridge-recipe-8690802",
          type: "full-recipe",
        },
        {
          title: "Kenyan Food Journal ugali na sukuma wiki method",
          url: "https://kenyanfoodjournal.com/ugali-na-sukuma-wiki-kenyan-comfort-food/",
          type: "full-recipe",
        },
        {
          title: "Infoods Specials sukuma wiki and ugali video",
          url: "https://www.youtube.com/watch?v=7seIPgxQOY0",
          type: "video",
        },
      ],
    },
    dessert: {
      id: "mandazi",
      name: "Mandazi",
      localName: "Mandazi",
      description:
        "Soft East African fried dough scented with cardamom and coconut milk, eaten for breakfast, tea time, or a sweet snack.",
      category: "dessert",
      servings: 6,
      prepMinutes: 40,
      cookMinutes: 20,
      difficulty: "medium",
      dietaryLabels: ["vegetarian"],
      ingredients: [
        { name: "plain flour", quantity: 400, unit: "g" },
        { name: "sugar", quantity: 70, unit: "g" },
        { name: "baking powder", quantity: 12, unit: "g" },
        { name: "ground cardamom", quantity: 3, unit: "g" },
        { name: "egg", quantity: 1, unit: "piece" },
        { name: "coconut milk", quantity: 180, unit: "ml" },
        { name: "sunflower oil", quantity: 750, unit: "ml", note: "for frying" },
      ],
      steps: [
        "1. Whisk flour, sugar, baking powder, cardamom, and a pinch of salt, then mix in egg and coconut milk to form a soft dough.",
        "2. Knead briefly until smooth, cover, and rest for 30 minutes so the dough rolls easily.",
        "3. Roll to about 1 cm thick, cut into triangles or squares, and fry in medium-hot oil until puffed and golden on both sides.",
        "4. Drain on paper towels and serve warm with chai.",
      ],
      substitutions: [
        "Use whole milk for a less coastal version if coconut milk is not available.",
        "Ground cinnamon can join or replace cardamom, but cardamom gives the more typical Kenyan tea-time aroma.",
      ],
      servingSuggestion:
        "Serve warm in a basket with Kenyan chai, coffee, or fruit; leftovers reheat briefly in a low oven.",
      drinkPairing: "Kenyan chai is the classic partner for mandazi.",
      sources: [
        {
          title: "Kenyan Food Journal authentic mandazi recipe",
          url: "https://kenyanfoodjournal.com/mandazi-recipe-kenyan-fried-bread/",
          type: "full-recipe",
        },
        {
          title: "Bellies Kitchen Kenyan mandazi step-by-step photos",
          url: "https://bellieskitchen.com/kenyan-mandazi-recipe/",
          type: "photo-guide",
        },
        {
          title: "Recipes and Hospitality with Clara mandazi video",
          url: "https://www.youtube.com/watch?v=eoWWXUvidWs",
          type: "video",
        },
      ],
    },
    drink: {
      name: "Kenyan Chai",
      localName: "Chai",
      type: "tea",
      alcoholic: false,
      description:
        "Black tea simmered with milk, sugar, and optional tea masala, cardamom, or ginger.",
    },
  },
  status: "published",
};
