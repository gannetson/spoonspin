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
      address: "Anna van Buerenplein 712 (MingleMush), Den Haag",
      specialty: "Kenyan pantry staples, spices, tea, and street-food takeaway",
      website: "https://www.kenyandelicacies.com/",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Kenyan%20Delicacies%20MingleMush%20Den%20Haag",
      notes: "Food-hall stand plus Kenyan dry goods and catering.",
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
      id: "house-of-pinoy-ams",
      name: "House of Pinoy Foods",
      city: "Amsterdam",
      address: "Van der Madeweg 29, Amsterdam",
      specialty: "Filipino pantry goods plus cooked dishes by the kilo",
      website: "https://houseofpinoyfoods.nl/",
      mapsUrl: maps("House of Pinoy Foods Van der Madeweg Amsterdam"),
      notes: "Specialty Filipino toko; order larger trays ahead when possible.",
    },
    {
      id: "pinoy-food-dollys-ams",
      name: "Pinoy Food Dolly's Groceries",
      city: "Amsterdam",
      address: "Quellijnstraat 57, Amsterdam",
      specialty: "Sinigang mix, banana ketchup, longganisa, and Filipino pantry staples",
      website: "https://www.amsterdamfilipinostore.nl/",
      mapsUrl: maps("Pinoy Food Dolly's Groceries Quellijnstraat Amsterdam"),
      notes: "Small De Pijp Filipino grocery with takeaway cooking.",
    },
    {
      id: "mr-pinoy-toko-ams",
      name: "Mr. Pinoy (toko)",
      city: "Amsterdam",
      address: "Cabralstraat 49H, Amsterdam",
      specialty: "Filipino grocery staples alongside the restaurant kitchen",
      mapsUrl: maps("Mr Pinoy Cabralstraat Amsterdam"),
    },
  ],
  gb: [
    {
      id: "kellys-expat-ams-pijp",
      name: "Kellys Expat Shopping",
      city: "Amsterdam",
      address: "Ferdinand Bolstraat 139, Amsterdam",
      specialty: "Marmite, cheddar, custard, crumpets, and British grocery staples",
      website: "https://www.kellys-expat-shopping.nl/",
      mapsUrl: maps("Kellys Expat Shopping Ferdinand Bolstraat Amsterdam"),
      notes: "Also has shops in Den Haag, Rotterdam, Utrecht, and Wassenaar.",
    },
    {
      id: "kellys-expat-ams-oudwest",
      name: "Kellys Expat Shopping Oud-West",
      city: "Amsterdam",
      address: "Kinkerstraat 189-191, Amsterdam",
      specialty: "British and American expat groceries",
      website: "https://www.kellys-expat-shopping.nl/",
      mapsUrl: maps("Kellys Expat Shopping Kinkerstraat Amsterdam"),
    },
    {
      id: "british-general-stores-ams",
      name: "The British General Stores",
      city: "Amsterdam",
      address: "1e Constantijn Huygensstraat 94, Amsterdam",
      specialty: "Yorkshire tea, pickles, biscuits, and British corner-shop staples",
      mapsUrl: maps("British General Stores Constantijn Huygensstraat Amsterdam"),
    },
  ],
  pl: [
    {
      id: "sklep-polski-amsterdam",
      name: "Sklep Polski",
      city: "Amsterdam",
      address: "Van Woustraat 157, Amsterdam",
      specialty: "Pierogi fillings, kielbasa, sauerkraut, twaróg, and Polish pantry goods",
      mapsUrl: maps("Sklep Polski Van Woustraat Amsterdam"),
    },
    {
      id: "polskie-delikatesy-denhaag",
      name: "Polskie Delikatesy",
      city: "Den Haag",
      address: "Groenteweg 2a, Den Haag",
      specialty: "Polish deli and supermarket staples",
      mapsUrl: maps("Polskie Delikatesy Groenteweg Den Haag"),
    },
    {
      id: "polish-shop-leiden",
      name: "Polish supermarket",
      city: "Leiden",
      address: "Leiden",
      specialty: "Pierogi fillings, kielbasa, sauerkraut, and twaróg",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Poolse%20supermarkt%20Leiden",
      notes: "Search locally; coverage varies by neighbourhood.",
    },
  ],
  np: [
    {
      id: "nepali-indian-toko-ams",
      name: "Nepali / Indian toko",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Momo wrappers, Himalayan spices, ghee, and lentils",
      mapsUrl: maps("Nepalese Indian toko Amsterdam"),
    },
  ],
  sy: [
    {
      id: "syrian-middle-eastern-ams",
      name: "Syrian / Middle Eastern grocer",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Tahini, freekeh, pomegranate molasses, and flatbreads",
      mapsUrl: maps("Syrische winkel Amsterdam"),
    },
  ],
  ua: [
    {
      id: "smak-food-store-denhaag",
      name: "SMAK food store",
      city: "Den Haag",
      address: "Spui 300, Den Haag",
      specialty: "Ukrainian borscht ingredients, varenyky, sour cream, and Eastern European pantry goods",
      mapsUrl: maps("SMAK food store Spui Den Haag"),
      notes: "Ukrainian grocery with café service.",
    },
  ],
  ro: [
    {
      id: "transilvania-food-ams",
      name: "Transilvania Food",
      city: "Amsterdam",
      address: "Bellamystraat 6H, Amsterdam",
      specialty: "Romanian pantry goods including zacuscă and Transylvanian staples",
      mapsUrl: maps("Transilvania Food Bellamystraat Amsterdam"),
    },
  ],
  pk: [
    {
      id: "pakistani-indian-toko-rotterdam",
      name: "Pakistani / Indian toko",
      city: "Rotterdam",
      address: "Rotterdam",
      specialty: "Spice mixes, basmati, ghee, and tandoori pantry staples",
      mapsUrl: maps("Pakistaanse toko Rotterdam"),
    },
  ],
  lk: [
    {
      id: "sri-lankan-toko-utrecht",
      name: "Sri Lankan / South Asian toko",
      city: "Utrecht",
      address: "Utrecht",
      specialty: "Roasted curry powder, Maldive fish, coconut, and rice flour",
      mapsUrl: maps("Sri Lankan toko Utrecht"),
    },
  ],
  tw: [
    {
      id: "veggie-garden-rotterdam-tw",
      name: "Veggie Garden Supermarket",
      city: "Rotterdam",
      address: "Goudsesingel 75, Rotterdam",
      specialty: "Taiwanese vegetarian pantry, sauces, noodles, and night-market snacks",
      website: "https://www.veggiegarden.nl/",
      mapsUrl: maps("Veggie Garden Goudsesingel Rotterdam"),
    },
  ],
  se: [
    {
      id: "scandinavian-embassy-bakery-ams",
      name: "Scandinavian Embassy Bakery",
      city: "Amsterdam",
      address: "Europaplein 87, Amsterdam",
      specialty: "Nordic pastries, cardamom buns, and Scandinavian specialty coffee",
      website: "https://scandinavianembassy.nl/",
      mapsUrl: maps("Scandinavian Embassy Bakery Europaplein Amsterdam"),
    },
    {
      id: "selmas-bakery-ams",
      name: "Selma's Nordic Bakery",
      city: "Amsterdam",
      address: "Jan van Galenstraat 70, Amsterdam",
      specialty: "Kanelbullar, chokladbollar, and Swedish fika staples",
      website: "https://www.selmasbakery.com/",
      mapsUrl: maps("Selmas bakery Jan van Galenstraat Amsterdam"),
    },
  ],
  dk: [
    {
      id: "scandinavian-embassy-cafe-dk",
      name: "Scandinavian Embassy Café",
      city: "Amsterdam",
      address: "Sarphatipark 34, Amsterdam",
      specialty: "Danish and Nordic specialty coffee plus Nordic pastries",
      website: "https://scandinavianembassy.nl/",
      mapsUrl: maps("Scandinavian Embassy Sarphatipark Amsterdam"),
    },
  ],
  ch: [
    {
      id: "kaaskamer-fondue-ams",
      name: "De Kaaskamer van Amsterdam",
      city: "Amsterdam",
      address: "Runstraat 7, Amsterdam",
      specialty: "Swiss and alpine cheeses for fondue and raclette",
      mapsUrl: maps("De Kaaskamer Runstraat Amsterdam"),
      notes: "Neighbour cheese shop used by fondue kitchens in the 9 Straatjes.",
    },
  ],
  at: [
    {
      id: "austrian-german-deli-ams",
      name: "Austrian / German deli",
      city: "Amsterdam",
      address: "Amsterdam",
      specialty: "Mustards, spaetzle, sauerkraut, and alpine pantry goods",
      mapsUrl: maps("Oostenrijkse Duitse delicatessen Amsterdam"),
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
