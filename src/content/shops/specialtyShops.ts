import type { SpecialtyShop } from "@/types/content";

function maps(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Netherlands specialty shops useful when cooking a given cuisine at home.
 * Keyed by ISO country code of the cuisine.
 */
export const specialtyShopsByCountry: Record<string, SpecialtyShop[]> = {
  id: [
    {
      id: "toko-berkeley-leiden",
      name: "Toko Berkeley",
      city: "Leiden",
      address: "Leiden",
      specialty: "Indonesian spices, sambal, ketjap, and rice-table staples",
      mapsUrl: maps("Toko Berkeley Leiden"),
      notes: "Handy for rijsttafel ingredients near Leiden.",
    },
    {
      id: "amazing-oriental-amsterdam",
      name: "Amazing Oriental",
      city: "Amsterdam",
      address: "Nieuwmarkt area, Amsterdam",
      specialty: "Broad Asian pantry including Indonesian products",
      website: "https://www.amazingoriental.com/",
      mapsUrl: maps("Amazing Oriental Amsterdam"),
    },
  ],
  th: [
    {
      id: "thai-supermarket-ams",
      name: "Thai Supermarket",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Thai curry pastes, fish sauce, rice noodles, and herbs",
      mapsUrl: maps("Thai Supermarket Amsterdam"),
    },
    {
      id: "amazing-oriental-ams-th",
      name: "Amazing Oriental",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Southeast Asian produce and pantry goods",
      website: "https://www.amazingoriental.com/",
      mapsUrl: maps("Amazing Oriental Amsterdam"),
    },
  ],
  vn: [
    {
      id: "amazing-oriental-ams-vn",
      name: "Amazing Oriental",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Vietnamese herbs, rice paper, fish sauce, and noodles",
      website: "https://www.amazingoriental.com/",
      mapsUrl: maps("Amazing Oriental Amsterdam"),
    },
  ],
  jp: [
    {
      id: "japanese-grocery-ams",
      name: "Japanse Winkel / Oriental groceries",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Miso, nori, mirin, Japanese rice, and noodles",
      mapsUrl: maps("Japanese supermarket Amsterdam"),
    },
  ],
  kr: [
    {
      id: "korean-market-ams",
      name: "Korean supermarket",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Gochujang, kimchi, Korean noodles, and sesame oil",
      mapsUrl: maps("Korean supermarket Amsterdam"),
    },
  ],
  cn: [
    {
      id: "amazing-oriental-ams-cn",
      name: "Amazing Oriental",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Chinese sauces, tofu, noodles, and vegetables",
      website: "https://www.amazingoriental.com/",
      mapsUrl: maps("Amazing Oriental Amsterdam"),
    },
  ],
  in: [
    {
      id: "indian-toko-leiden",
      name: "Indian / Surinamese toko",
      city: "Leiden",
      address: "Leiden",
      specialty: "Spices, dals, ghee, and flatbread flours",
      mapsUrl: maps("Indian toko Leiden"),
    },
  ],
  tr: [
    {
      id: "turkish-market-leiden",
      name: "Turkish supermarket",
      city: "Leiden",
      address: "Leiden",
      specialty: "Yogurt, bulgur, peppers, and grill spices",
      mapsUrl: maps("Turkse supermarkt Leiden"),
    },
  ],
  ma: [
    {
      id: "marokkaanse-winkel",
      name: "Marokkaanse winkel",
      city: "Den Haag",
      address: "Den Haag",
      specialty: "Couscous, preserved lemon, ras el hanout, and olives",
      mapsUrl: maps("Marokkaanse winkel Den Haag"),
    },
  ],
  lb: [
    {
      id: "middle-eastern-grocer",
      name: "Middle Eastern grocer",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Tahini, labneh, flatbreads, and mezze staples",
      mapsUrl: maps("Middle Eastern supermarket Amsterdam"),
    },
  ],
  mx: [
    {
      id: "latin-store-ams",
      name: "Latin American store",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Tortillas, chiles, masa, and Mexican pantry goods",
      mapsUrl: maps("Mexican supermarket Amsterdam"),
    },
  ],
  ge: [
    {
      id: "caucasus-products",
      name: "Caucasus / Eastern European shop",
      city: "Den Haag",
      address: "Den Haag",
      specialty: "Walnuts, spices, cheeses, and herbs for Georgian cooking",
      mapsUrl: maps("Georgian products Den Haag"),
    },
  ],
  it: [
    {
      id: "italian-deli",
      name: "Italian deli / specialty shop",
      city: "Leiden",
      address: "Leiden",
      specialty: "Pasta, olive oil, cheese, and cured meats",
      mapsUrl: maps("Italiaanse delicatessen Leiden"),
    },
  ],
  bg: [
    {
      id: "balkan-shop-ams",
      name: "Balkan / Eastern European grocer",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Sirene, yogurt, peppers, and Balkan spices",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Balkan%20supermarkt%20Amsterdam",
    },
  ],
  es: [
    {
      id: "spanish-deli-ams",
      name: "Spanish deli / tapas shop",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Jamón, olive oil, smoked paprika, and sherry vinegar",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Spaanse%20delicatessen%20Amsterdam",
    },
  ],
  gr: [
    {
      id: "greek-deli-ams",
      name: "Greek deli",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Feta, filo, olives, and oregano",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Griekse%20delicatessen%20Amsterdam",
    },
  ],
  et: [
    {
      id: "ethiopian-shop-denhaag",
      name: "Ethiopian / Eritrean grocer",
      city: "Den Haag",
      address: "Den Haag",
      specialty: "Teff flour, berbere, niter kibbeh, and coffee",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Ethiopische%20winkel%20Den%20Haag",
    },
  ],
  sn: [
    {
      id: "west-african-shop-ams",
      name: "West African grocer",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Broken rice, palm oil, dried fish, and peanut paste",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=West%20Afrikaanse%20supermarkt%20Amsterdam",
    },
  ],
  za: [
    {
      id: "south-african-shop-ams",
      name: "South African shop",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Boerewors spices, Mrs Ball's chutney, and braai staples",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Zuid-Afrikaanse%20winkel%20Amsterdam",
    },
  ],
  ke: [
    {
      id: "african-taste-ke",
      name: "African Taste",
      city: "Netherlands",
      address: "Online / Netherlands",
      specialty: "Maize flour, Royco mchuzi mix, and East African pantry goods",
      website: "https://africantaste.eu/",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=African%20Taste%20Nederland",
      notes: "Useful for ugali flour and Kenyan stew seasonings.",
    },
    {
      id: "africa-products-ke",
      name: "Africa Products Shop",
      city: "Netherlands",
      address: "Online / Netherlands",
      specialty: "Jogoo maize flour and other Kenyan dry goods",
      website: "https://africaproducts.nl/",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Africa%20Products%20Nederland",
    },
    {
      id: "kenyan-delicacies-denhaag",
      name: "Kenyan Delicacies",
      city: "Den Haag",
      address: "Den Haag",
      specialty: "Kenyan restaurant pantry staples, spices, and tea",
      website: "https://www.kenyandelicacies.com/",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Kenyan%20Delicacies%20Den%20Haag",
    },
  ],
  pe: [
    {
      id: "latin-peruvian-ams",
      name: "Latin / Peruvian grocer",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Aji amarillo, quinoa, corn, and Andean pantry goods",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Peruaanse%20winkel%20Amsterdam",
    },
  ],
  br: [
    {
      id: "brazilian-shop-ams",
      name: "Brazilian shop",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Cassava flour, dendê oil, guaraná, and beans",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Braziliaanse%20winkel%20Amsterdam",
    },
  ],
  jm: [
    {
      id: "caribbean-shop-ams",
      name: "Caribbean grocer",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Jerk seasoning, scotch bonnet, callaloo, and spices",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Caribische%20supermarkt%20Amsterdam",
    },
  ],
  fr: [
    {
      id: "french-deli-leiden",
      name: "French deli / fromagerie",
      city: "Leiden",
      address: "Leiden",
      specialty: "Cheese, charcuterie, Dijon mustard, and pastry butter",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Franse%20delicatessen%20Leiden",
    },
  ],
  de: [
    {
      id: "german-deli-ams",
      name: "German deli",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Mustards, sausages, sauerkraut, and baking goods",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Duitse%20delicatessen%20Amsterdam",
    },
  ],
  pt: [
    {
      id: "portuguese-shop-ams",
      name: "Portuguese grocer",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Bacalhau, peri-peri, olive oil, and pastries",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Portugese%20winkel%20Amsterdam",
    },
  ],
  ar: [
    {
      id: "argentinian-shop-ams",
      name: "Argentinian / Latin grill shop",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Chimichurri ingredients, dulce de leche, and mate",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Argentijnse%20winkel%20Amsterdam",
    },
  ],
  ng: [
    {
      id: "nigerian-shop-ams",
      name: "Nigerian / West African grocer",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Egusi, palm oil, stockfish, and pounded yam flour",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Nigeriaanse%20supermarkt%20Amsterdam",
    },
  ],
  eg: [
    {
      id: "egyptian-shop-ams",
      name: "Egyptian / Middle Eastern grocer",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Fava beans, molokhia, spices, and flatbreads",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Egyptische%20winkel%20Amsterdam",
    },
  ],
  ph: [
    {
      id: "filipino-shop-ams",
      name: "Filipino store",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Sinigang mix, banana ketchup, rice noodles, and vinegar",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Filipijnse%20winkel%20Amsterdam",
    },
  ],
  gb: [
    {
      id: "british-shop-ams",
      name: "British specialty shop",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Cheddar, marmite, custard, and baking staples",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=British%20shop%20Amsterdam",
    },
  ],
  pl: [
    {
      id: "polish-shop-leiden",
      name: "Polish supermarket",
      city: "Leiden",
      address: "Leiden",
      specialty: "Pierogi fillings, kielbasa, sauerkraut, and twaróg",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Poolse%20supermarkt%20Leiden",
    },
  ],
  nl: [
    {
      id: "dutch-market-leiden",
      name: "Leiden market / butchers",
      city: "Leiden",
      address: "Leiden",
      specialty: "Fresh kale, rookworst, and baking goods for stamppot nights",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=markt%20Leiden",
    },
  ],
};

export function specialtyShopsFor(countryCode: string): SpecialtyShop[] {
  return specialtyShopsByCountry[countryCode.toLowerCase()] ?? [];
}
