/**
 * Regional cuisine umbrellas, used when a country has no specialist of its own
 * in the Netherlands.
 *
 * There is no Barbadian restaurant here, and searching "Barbados restaurant"
 * returns restaurants *in* Barbados plus name-noise ("Barossa", "Barbarossa
 * Beach"). Searching "Caribbean restaurant" returns the venues a Bajan diner
 * would actually be pointed at. The same holds for Saint Kitts, Grenada,
 * Djibouti, Laos and every other country whose diaspora cooking reaches NL
 * under a regional flag rather than a national one.
 *
 * Every `queryTerms` entry here was probed against live Google Places and kept
 * only if it returned a coherent set of Dutch venues. Terms that read fine but
 * behave badly were dropped:
 *
 * - "West Indies" returns Indian restaurants.
 * - "Baltic" returns *Balkan* restaurants.
 * - "Central American" and "South American" return American steakhouses.
 * - "North African" returns Eritrean and East African venues.
 * - "Persian Gulf" returns Iranian venues.
 * - "Pacific Islander" returns Hawaiian poké bowls.
 *
 * Vague regions do better anchored to exemplar countries, which is why West
 * Africa is searched as "West African Ghanaian Nigerian" — bare "West African"
 * returns the same generic list as "East African" and "Southern African".
 */

export type CuisineUmbrella = {
  id: string;
  /** Shown to admins, e.g. "Caribbean — no Barbadian specialist found". */
  label: string;
  /** Validated Google Places query terms, best first. */
  queryTerms: string[];
  countries: string[];
};

/**
 * Ordered narrowest-first: `umbrellasForCountry` returns them in this order, so
 * Peru reaches for "Andean" before "Latin American" and Nepal for "Himalayan"
 * before "South Asian".
 */
export const CUISINE_UMBRELLAS: CuisineUmbrella[] = [
  {
    id: "himalayan",
    label: "Himalayan",
    queryTerms: ["Himalayan"],
    countries: ["np", "bt"],
  },
  {
    id: "andean",
    label: "Andean",
    queryTerms: ["Andean"],
    countries: ["bo", "cl", "co", "ec", "pe"],
  },
  {
    id: "caucasian",
    label: "Caucasian",
    queryTerms: ["Caucasian"],
    countries: ["am", "az", "ge"],
  },
  {
    id: "maghreb",
    label: "Maghreb",
    queryTerms: ["Maghreb"],
    countries: ["dz", "ly", "ma", "tn"],
  },
  {
    id: "west-african",
    label: "West African",
    queryTerms: ["West African Ghanaian Nigerian"],
    countries: [
      "bj",
      "bf",
      "cv",
      "ci",
      "gm",
      "gh",
      "gn",
      "gw",
      "lr",
      "ml",
      "mr",
      "ne",
      "ng",
      "sn",
      "sl",
      "tg",
    ],
  },
  {
    id: "caribbean",
    label: "Caribbean",
    queryTerms: ["Caribbean"],
    countries: [
      "ag",
      "bs",
      "bb",
      "bz",
      "cu",
      "dm",
      "do",
      "gd",
      "gy",
      "ht",
      "jm",
      "kn",
      "lc",
      "vc",
      "sr",
      "tt",
    ],
  },
  {
    id: "balkan",
    label: "Balkan",
    queryTerms: ["Balkan"],
    countries: ["al", "ba", "bg", "hr", "xk", "me", "mk", "ro", "rs", "si"],
  },
  {
    id: "nordic",
    label: "Nordic",
    queryTerms: ["Scandinavian", "Nordic"],
    countries: ["dk", "fi", "is", "no", "se"],
  },
  {
    id: "central-asian",
    label: "Central Asian",
    queryTerms: ["Central Asian Uzbek"],
    countries: ["kz", "kg", "tj", "tm", "uz"],
  },
  {
    id: "middle-eastern",
    label: "Middle Eastern",
    queryTerms: ["Middle Eastern", "Arabic"],
    countries: [
      "bh",
      "cy",
      "eg",
      "iq",
      "il",
      "jo",
      "kw",
      "lb",
      "om",
      "ps",
      "qa",
      "sa",
      "sy",
      "ae",
      "ye",
    ],
  },
  {
    id: "south-asian",
    label: "South Asian",
    queryTerms: ["South Asian"],
    countries: ["bd", "bt", "in", "mv", "np", "pk", "lk"],
  },
  {
    id: "southeast-asian",
    label: "Southeast Asian",
    queryTerms: ["Southeast Asian"],
    countries: ["bn", "kh", "id", "la", "my", "mm", "ph", "sg", "th", "tl", "vn"],
  },
  {
    id: "eastern-european",
    label: "Eastern European",
    queryTerms: ["Eastern European"],
    countries: ["by", "cz", "ee", "hu", "lv", "lt", "md", "pl", "ro", "ru", "sk", "ua"],
  },
  {
    id: "latin-american",
    label: "Latin American",
    queryTerms: ["Latin American"],
    countries: [
      "ar",
      "bo",
      "br",
      "cl",
      "co",
      "cr",
      "cu",
      "do",
      "ec",
      "sv",
      "gt",
      "hn",
      "mx",
      "ni",
      "pa",
      "py",
      "pe",
      "uy",
      "ve",
    ],
  },
  {
    id: "african",
    label: "African",
    queryTerms: ["African"],
    countries: [
      "ao",
      "bj",
      "bw",
      "bf",
      "bi",
      "cm",
      "cv",
      "cf",
      "td",
      "km",
      "cg",
      "cd",
      "ci",
      "dj",
      "gq",
      "er",
      "sz",
      "et",
      "ga",
      "gm",
      "gh",
      "gn",
      "gw",
      "ke",
      "ls",
      "lr",
      "mg",
      "mw",
      "ml",
      "mr",
      "mu",
      "mz",
      "na",
      "ne",
      "ng",
      "rw",
      "st",
      "sn",
      "sc",
      "sl",
      "so",
      "za",
      "ss",
      "sd",
      "tz",
      "tg",
      "ug",
      "zm",
      "zw",
    ],
  },
  {
    id: "mediterranean",
    label: "Mediterranean",
    queryTerms: ["Mediterranean"],
    countries: [
      "al",
      "cy",
      "hr",
      "eg",
      "gr",
      "il",
      "it",
      "lb",
      "ly",
      "mt",
      "me",
      "ma",
      "ps",
      "si",
      "es",
      "sy",
      "tn",
      "tr",
    ],
  },
];

/** Regional umbrellas a country belongs to, narrowest first. */
export function umbrellasForCountry(code: string, limit = 2): CuisineUmbrella[] {
  const key = code.trim().toLowerCase();
  return CUISINE_UMBRELLAS.filter((umbrella) => umbrella.countries.includes(key)).slice(
    0,
    limit,
  );
}
