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
};

export function specialtyShopsFor(countryCode: string): SpecialtyShop[] {
  return specialtyShopsByCountry[countryCode.toLowerCase()] ?? [];
}
