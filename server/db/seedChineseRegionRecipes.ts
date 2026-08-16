import type { Pool } from "pg";
import type { RecipeCategory } from "../../src/types/content.ts";
import { findSubdivisionByName, normalizeRegionName } from "./regions/catalog.ts";
import { ensureDb } from "./restaurants.ts";

type SeedIngredient = { name: string; quantity: number; unit: string; note?: string };

type ChineseRegionRecipeSeed = {
  region: string;
  id: string;
  name: string;
  localName: string;
  description: string;
  category: RecipeCategory;
  ingredients: SeedIngredient[];
  steps: string[];
};

function dish(
  region: string,
  id: string,
  name: string,
  localName: string,
  description: string,
  category: RecipeCategory,
  ingredients: SeedIngredient[],
  steps: string[],
): ChineseRegionRecipeSeed {
  return { region, id, name, localName, description, category, ingredients, steps };
}

/** One well-known home-cook dish per Chinese provincial region. */
export const CHINESE_REGION_RECIPES: ChineseRegionRecipeSeed[] = [
  dish(
    "Anhui",
    "anhui-li-hongzhang-stew",
    "Li Hongzhang stew",
    "李鸿章杂烩",
    "A classic Huizhou mixed stew with tofu, bamboo shoots, and seafood in a light broth — Anhui's answer to hearty banquet cooking.",
    "main",
    [
      { name: "dried tofu skin", quantity: 80, unit: "g" },
      { name: "bamboo shoots", quantity: 150, unit: "g" },
      { name: "chicken stock", quantity: 800, unit: "ml" },
    ],
    [
      "Soak tofu skin until soft, then slice into strips.",
      "Simmer bamboo shoots in stock for 10 minutes, then add tofu skin.",
      "Season lightly with salt and white pepper; serve hot in bowls.",
    ],
  ),
  dish(
    "Beijing",
    "beijing-zhajiangmian",
    "Zhajiangmian",
    "炸酱面",
    "Beijing noodles topped with a salty fermented soybean pork sauce — everyday comfort food in the capital.",
    "main",
    [
      { name: "fresh wheat noodles", quantity: 400, unit: "g" },
      { name: "minced pork", quantity: 250, unit: "g" },
      { name: "yellow soybean paste", quantity: 3, unit: "tbsp" },
    ],
    [
      "Fry minced pork in oil until browned, then stir in soybean paste and a splash of water.",
      "Simmer the sauce 15 minutes until thick and glossy.",
      "Boil noodles, drain, and toss with sauce; add shredded cucumber if you like.",
    ],
  ),
  dish(
    "Chongqing",
    "chongqing-xiaomian",
    "Chongqing noodles",
    "重庆小面",
    "Spicy Chongqing street noodles with chili oil, Sichuan pepper, and preserved vegetables — bold and aromatic.",
    "main",
    [
      { name: "thin wheat noodles", quantity: 350, unit: "g" },
      { name: "chili oil", quantity: 2, unit: "tbsp" },
      { name: "Sichuan peppercorn", quantity: 1, unit: "tsp" },
    ],
    [
      "Mix chili oil, soy sauce, vinegar, and ground pepper in each serving bowl.",
      "Cook noodles until just done; reserve a little cooking water.",
      "Toss noodles with the sauce and a spoon of hot noodle water; serve immediately.",
    ],
  ),
  dish(
    "Fujian",
    "fujian-oyster-omelette",
    "Oyster omelette",
    "海蛎煎",
    "A sizzling Fujianese omelette of fresh oysters bound with sweet potato starch — crisp edges and soft center.",
    "main",
    [
      { name: "small oysters", quantity: 200, unit: "g" },
      { name: "sweet potato starch", quantity: 80, unit: "g" },
      { name: "eggs", quantity: 3, unit: "piece" },
    ],
    [
      "Mix starch with water to a pourable batter; fold in drained oysters.",
      "Pour into a hot oiled pan; when edges set, add beaten egg.",
      "Flip once for a golden crust; serve with chili sauce.",
    ],
  ),
  dish(
    "Gansu",
    "gansu-lanzhou-beef-noodles",
    "Lanzhou beef noodles",
    "兰州牛肉面",
    "Hand-pulled Lanzhou noodles in clear beef broth with radish and cilantro — Gansu's most famous bowl.",
    "main",
    [
      { name: "beef shank", quantity: 600, unit: "g" },
      { name: "fresh or dried noodles", quantity: 400, unit: "g" },
      { name: "daikon radish", quantity: 200, unit: "g" },
    ],
    [
      "Simmer beef with ginger and star anise until tender; strain a clear broth.",
      "Cook noodles separately until chewy.",
      "Serve noodles in hot broth with sliced beef, radish, and cilantro.",
    ],
  ),
  dish(
    "Guangdong",
    "guangdong-char-siu",
    "Char siu",
    "叉烧",
    "Cantonese barbecue pork glazed with maltose and soy — sweet, lacquered, and perfect with rice.",
    "main",
    [
      { name: "pork shoulder", quantity: 700, unit: "g" },
      { name: "hoisin sauce", quantity: 3, unit: "tbsp" },
      { name: "maltose or honey", quantity: 2, unit: "tbsp" },
    ],
    [
      "Marinate pork overnight with hoisin, soy, honey, and five-spice.",
      "Roast at 200°C, basting every 10 minutes until caramelized.",
      "Rest briefly, slice, and serve with steamed rice.",
    ],
  ),
  dish(
    "Guangxi",
    "guangxi-guilin-rice-noodles",
    "Guilin rice noodles",
    "桂林米粉",
    "Silky rice noodles from Guilin in a fragrant broth with pickled long beans and peanuts.",
    "main",
    [
      { name: "dried rice noodles", quantity: 300, unit: "g" },
      { name: "pork bone broth", quantity: 1, unit: "l" },
      { name: "pickled long beans", quantity: 50, unit: "g" },
    ],
    [
      "Rehydrate rice noodles in hot water until tender.",
      "Heat broth and season with soy and a little chili.",
      "Top noodles with broth, pickled beans, peanuts, and cilantro.",
    ],
  ),
  dish(
    "Guizhou",
    "guizhou-sour-fish-soup",
    "Guizhou sour fish soup",
    "酸汤鱼",
    "Miao-style sour soup with tomato and fermented broth — bright, tangy, and perfect with white fish.",
    "main",
    [
      { name: "white fish fillets", quantity: 500, unit: "g" },
      { name: "tomatoes", quantity: 3, unit: "piece" },
      { name: "sour soup base or rice vinegar", quantity: 3, unit: "tbsp" },
    ],
    [
      "Simmer tomatoes in water until broken down; add sour base and ginger.",
      "Slide in fish pieces and poach gently 5 minutes.",
      "Finish with herbs and serve with steamed rice.",
    ],
  ),
  dish(
    "Hainan",
    "hainan-chicken-rice",
    "Hainanese chicken rice",
    "海南鸡饭",
    "Poached chicken with ginger-scented rice and chili-ginger sauce — Hainan's iconic one-plate meal.",
    "main",
    [
      { name: "whole chicken", quantity: 1.2, unit: "kg" },
      { name: "jasmine rice", quantity: 300, unit: "g" },
      { name: "ginger", quantity: 50, unit: "g" },
    ],
    [
      "Poach chicken in gently simmering water with ginger until just cooked; ice to set skin.",
      "Cook rice in chicken fat and reserved poaching aromatics.",
      "Chop chicken; serve with rice, cucumber, and chili-ginger sauce.",
    ],
  ),
  dish(
    "Hebei",
    "hebei-pork-baozi",
    "Hebei pork baozi",
    "河北包子",
    "Soft steamed buns filled with juicy seasoned pork — a northern breakfast staple from Hebei.",
    "main",
    [
      { name: "all-purpose flour", quantity: 400, unit: "g" },
      { name: "minced pork", quantity: 300, unit: "g" },
      { name: "yeast", quantity: 5, unit: "g" },
    ],
    [
      "Make a soft yeasted dough; rest until doubled.",
      "Mix pork with ginger, soy, and scallion for a juicy filling.",
      "Wrap buns, steam 12 minutes until puffed and cooked through.",
    ],
  ),
  dish(
    "Heilongjiang",
    "heilongjiang-guo-bao-rou",
    "Guo bao rou",
    "锅包肉",
    "Northeastern sweet-and-sour crispy pork in a glossy vinegar glaze — Heilongjiang's celebratory dish.",
    "main",
    [
      { name: "pork loin", quantity: 500, unit: "g" },
      { name: "potato starch", quantity: 100, unit: "g" },
      { name: "rice vinegar", quantity: 3, unit: "tbsp" },
    ],
    [
      "Slice pork, coat in starch, and shallow-fry until very crisp.",
      "Wok-toss with sugar, vinegar, and a little soy until coated.",
      "Serve immediately while the crust stays crunchy.",
    ],
  ),
  dish(
    "Henan",
    "henan-stewed-noodles",
    "Henan stewed noodles",
    "河南烩面",
    "Wide hand-pulled noodles in a rich lamb and vegetable stew — hearty Central Plains comfort food.",
    "main",
    [
      { name: "wide wheat noodles", quantity: 400, unit: "g" },
      { name: "lamb slices", quantity: 250, unit: "g" },
      { name: "napa cabbage", quantity: 200, unit: "g" },
    ],
    [
      "Simmer lamb with ginger and star anise for a flavorful broth.",
      "Add cabbage and noodles; cook until noodles are tender.",
      "Season and serve in deep bowls with chili oil optional.",
    ],
  ),
  dish(
    "Hong Kong",
    "hong-kong-wonton-noodles",
    "Wonton noodle soup",
    "云吞面",
    "Hong Kong-style springy egg noodles with shrimp wontons in a clear broth — cha chaan teng classic.",
    "main",
    [
      { name: "thin egg noodles", quantity: 300, unit: "g" },
      { name: "shrimp wontons", quantity: 12, unit: "piece" },
      { name: "chicken stock", quantity: 1, unit: "l" },
    ],
    [
      "Poach wontons in simmering stock until they float.",
      "Blanch noodles briefly in separate water for a firm bite.",
      "Serve noodles in broth with wontons, choy sum, and a drizzle of soy.",
    ],
  ),
  dish(
    "Hubei",
    "hubei-hot-dry-noodles",
    "Hot dry noodles",
    "热干面",
    "Wuhan breakfast noodles tossed with sesame paste, soy, and pickled radish — nutty and satisfying.",
    "main",
    [
      { name: "alkaline wheat noodles", quantity: 350, unit: "g" },
      { name: "sesame paste", quantity: 2, unit: "tbsp" },
      { name: "pickled radish", quantity: 40, unit: "g" },
    ],
    [
      "Cook noodles, rinse briefly, and toss with oil to prevent sticking.",
      "Loosen sesame paste with soy, vinegar, and a splash of hot water.",
      "Toss noodles with sauce, top with radish and scallion.",
    ],
  ),
  dish(
    "Hunan",
    "hunan-red-braised-pork",
    "Mao's red-braised pork",
    "毛氏红烧肉",
    "Hunan red-braised pork belly with chili and caramelized soy — rich, soft, and deeply savory.",
    "main",
    [
      { name: "pork belly", quantity: 700, unit: "g" },
      { name: "rock sugar", quantity: 25, unit: "g" },
      { name: "dried chilies", quantity: 4, unit: "piece" },
    ],
    [
      "Blanch belly cubes; caramelize sugar until amber.",
      "Braise pork with soy, rice wine, ginger, and chilies until tender.",
      "Reduce sauce until glossy; serve with steamed rice.",
    ],
  ),
  dish(
    "Inner Mongolia",
    "inner-mongolia-boiled-lamb",
    "Mongolian boiled lamb",
    "手把肉",
    "Simple boiled lamb on the bone with salt and onion — the pastoral centerpiece of Inner Mongolian feasts.",
    "main",
    [
      { name: "lamb ribs or shoulder on bone", quantity: 1, unit: "kg" },
      { name: "onion", quantity: 1, unit: "piece" },
      { name: "coarse salt", quantity: 1, unit: "tsp" },
    ],
    [
      "Cover lamb with cold water; bring to a gentle simmer with onion.",
      "Skim foam and cook until meat pulls easily from the bone.",
      "Serve with salt for dipping and hot tea or rice on the side.",
    ],
  ),
  dish(
    "Jiangsu",
    "jiangsu-lions-head-meatballs",
    "Lion's head meatballs",
    "狮子头",
    "Large Huaiyang pork meatballs braised with cabbage — tender, mild, and elegant Jiangsu home cooking.",
    "main",
    [
      { name: "ground pork", quantity: 600, unit: "g" },
      { name: "napa cabbage leaves", quantity: 6, unit: "piece" },
      { name: "ginger", quantity: 15, unit: "g" },
    ],
    [
      "Mix pork with ginger, rice wine, and water until light and bouncy.",
      "Shape into large balls; sear lightly in a pot.",
      "Braise with stock and cabbage until meatballs are silky soft.",
    ],
  ),
  dish(
    "Jiangxi",
    "jiangxi-steamed-pork-rice-flour",
    "Steamed pork with rice flour",
    "粉蒸肉",
    "Jiangxi pork steamed over spiced rice flour — fragrant, tender, and often wrapped in lotus leaves.",
    "main",
    [
      { name: "pork belly slices", quantity: 500, unit: "g" },
      { name: "steamed rice powder", quantity: 100, unit: "g" },
      { name: "fermented bean curd", quantity: 1, unit: "tbsp" },
    ],
    [
      "Marinate pork with bean curd, soy, and five-spice for 30 minutes.",
      "Coat evenly with rice powder.",
      "Steam 60 minutes until pork is meltingly soft.",
    ],
  ),
  dish(
    "Jilin",
    "jilin-suan-cai-hot-pot",
    "Pickled cabbage hot pot",
    "酸菜火锅",
    "Northeastern hot pot with sour pickled cabbage and pork — warming Jilin winter fare.",
    "main",
    [
      { name: "pickled napa cabbage", quantity: 400, unit: "g" },
      { name: "pork belly slices", quantity: 300, unit: "g" },
      { name: "firm tofu", quantity: 250, unit: "g" },
    ],
    [
      "Simmer pickled cabbage in water or stock for 20 minutes.",
      "Add tofu and pork; cook at a gentle bubble.",
      "Serve at the table with dipping sauce and noodles optional.",
    ],
  ),
  dish(
    "Liaoning",
    "liaoning-suan-tai",
    "Liaoning sour cabbage stew",
    "酸菜白肉",
    "Liaoning stew of sour cabbage and sliced pork belly — simple, sour, and deeply comforting.",
    "main",
    [
      { name: "pickled cabbage", quantity: 350, unit: "g" },
      { name: "pork belly", quantity: 400, unit: "g" },
      { name: "glass noodles", quantity: 80, unit: "g" },
    ],
    [
      "Blanch belly; slice thinly.",
      "Stew cabbage with belly and enough water to cover.",
      "Add noodles in the last 5 minutes; serve hot.",
    ],
  ),
  dish(
    "Macao",
    "macau-minchi",
    "Macanese minchi",
    "澳门 minchi",
    "Macanese minced beef and potato hash with soy and Worcestershire — a Lusitanian-Chinese comfort plate.",
    "main",
    [
      { name: "ground beef", quantity: 400, unit: "g" },
      { name: "potatoes", quantity: 2, unit: "piece" },
      { name: "Worcestershire sauce", quantity: 1, unit: "tbsp" },
    ],
    [
      "Dice and pan-fry potatoes until golden.",
      "Brown beef with onion, soy, and Worcestershire.",
      "Combine and fry until crisp at the edges; top with a fried egg.",
    ],
  ),
  dish(
    "Ningxia",
    "ningxia-lamb-noodles",
    "Ningxia lamb noodles",
    "宁夏羊肉面",
    "Hand-pulled noodles in lamb broth with chili and garlic — Hui Muslim northwestern classic.",
    "main",
    [
      { name: "lamb shoulder", quantity: 500, unit: "g" },
      { name: "hand-pulled or wide noodles", quantity: 400, unit: "g" },
      { name: "garlic chives", quantity: 50, unit: "g" },
    ],
    [
      "Simmer lamb with ginger and cumin until tender; keep a rich broth.",
      "Cook noodles in separate water.",
      "Serve noodles in broth with lamb, chives, and chili oil.",
    ],
  ),
  dish(
    "Qinghai",
    "qinghai-lamb-noodle-soup",
    "Qinghai lamb noodle soup",
    "青海羊肉面",
    "High-plateau lamb noodle soup with clear broth and hand-cut noodles — warming Qinghai staple.",
    "main",
    [
      { name: "lamb pieces on bone", quantity: 600, unit: "g" },
      { name: "wheat noodles", quantity: 350, unit: "g" },
      { name: "white radish", quantity: 150, unit: "g" },
    ],
    [
      "Simmer lamb with radish until broth is fragrant and meat is tender.",
      "Cook noodles until al dente.",
      "Serve noodles in bowls with lamb, radish, and cilantro.",
    ],
  ),
  dish(
    "Shaanxi",
    "shaanxi-roujiamo",
    "Roujiamo",
    "肉夹馍",
    "Shaanxi 'Chinese hamburger' — cumin-spiced braised pork stuffed in a crisp flatbread.",
    "main",
    [
      { name: "pork shoulder", quantity: 600, unit: "g" },
      { name: "flatbread or bao buns", quantity: 4, unit: "piece" },
      { name: "cumin", quantity: 1, unit: "tsp" },
    ],
    [
      "Braise pork with soy, star anise, and cumin until shreddable.",
      "Warm bread until crisp outside and soft inside.",
      "Stuff bread with chopped pork and a spoon of braising juices.",
    ],
  ),
  dish(
    "Shandong",
    "shandong-dezhou-chicken",
    "Dezhou braised chicken",
    "德州扒鸡",
    "Shandong's famous braised whole chicken — mahogany skin and aromatic five-spice broth.",
    "main",
    [
      { name: "whole chicken", quantity: 1.2, unit: "kg" },
      { name: "soy sauce", quantity: 100, unit: "ml" },
      { name: "star anise", quantity: 3, unit: "piece" },
    ],
    [
      "Blanch chicken; simmer with soy, sugar, ginger, and spices.",
      "Braise gently until meat is tender but still holding shape.",
      "Cool slightly, chop, and serve with broth spooned over.",
    ],
  ),
  dish(
    "Shanghai",
    "shanghai-red-braised-pork",
    "Shanghai red-braised pork",
    "红烧肉",
    "Shanghai-style hong shao rou — glossy soy-braised pork belly with rock sugar sweetness.",
    "main",
    [
      { name: "pork belly", quantity: 700, unit: "g" },
      { name: "Shaoxing wine", quantity: 3, unit: "tbsp" },
      { name: "dark soy sauce", quantity: 2, unit: "tbsp" },
    ],
    [
      "Blanch belly cubes to remove impurities.",
      "Braise with wine, soy, sugar, and ginger until tender.",
      "Reduce until sauce clings to each piece; serve with rice.",
    ],
  ),
  dish(
    "Shanxi",
    "shanxi-knife-cut-noodles",
    "Knife-cut noodles",
    "刀削面",
    "Shanxi noodles shaved directly into boiling water — thick, chewy, and perfect with tomato sauce.",
    "main",
    [
      { name: "high-gluten flour", quantity: 400, unit: "g" },
      { name: "tomatoes", quantity: 3, unit: "piece" },
      { name: "ground pork", quantity: 200, unit: "g" },
    ],
    [
      "Make a firm dough; rest, then shave ribbons into boiling water.",
      "Fry pork with tomato until saucy.",
      "Toss cooked noodles with the tomato pork sauce.",
    ],
  ),
  dish(
    "Sichuan",
    "sichuan-mapo-tofu",
    "Mapo tofu",
    "麻婆豆腐",
    "Sichuan silken tofu in a fiery doubanjiang sauce with minced pork and Sichuan pepper — the province's signature.",
    "main",
    [
      { name: "silken tofu", quantity: 400, unit: "g" },
      { name: "minced pork", quantity: 150, unit: "g" },
      { name: "doubanjiang", quantity: 2, unit: "tbsp" },
    ],
    [
      "Fry pork with doubanjiang and garlic until fragrant.",
      "Add stock, slide in cubed tofu, and simmer gently 5 minutes.",
      "Thicken slightly; finish with ground Sichuan pepper and scallion.",
    ],
  ),
  dish(
    "Tianjin",
    "tianjin-goubuli-baozi",
    "Goubuli baozi",
    "狗不理包子",
    "Tianjin's pleated pork soup buns — juicy filling and soft steamed wrappers.",
    "main",
    [
      { name: "all-purpose flour", quantity: 400, unit: "g" },
      { name: "minced pork", quantity: 350, unit: "g" },
      { name: "yeast", quantity: 5, unit: "g" },
    ],
    [
      "Prepare a yeasted dough with many fine pleats in mind.",
      "Fill with seasoned pork and a little aspic or stock for juiciness.",
      "Steam 15 minutes until buns are puffed and cooked through.",
    ],
  ),
  dish(
    "Tibet",
    "tibet-momos",
    "Tibetan momos",
    "藏式包子",
    "Tibetan steamed dumplings filled with seasoned beef or yak — often served with chili sauce.",
    "main",
    [
      { name: "all-purpose flour", quantity: 300, unit: "g" },
      { name: "ground beef", quantity: 300, unit: "g" },
      { name: "onion", quantity: 1, unit: "piece" },
    ],
    [
      "Make a simple dough; roll wrappers into small circles.",
      "Fill with beef, onion, ginger, and salt; pleat and seal.",
      "Steam 12 minutes until wrappers are translucent at the edges.",
    ],
  ),
  dish(
    "Xinjiang",
    "xinjiang-dapanji",
    "Big plate chicken",
    "大盘鸡",
    "Xinjiang braised chicken with potatoes and wide belt noodles in a chili-laced sauce.",
    "main",
    [
      { name: "chicken pieces", quantity: 1, unit: "kg" },
      { name: "potatoes", quantity: 3, unit: "piece" },
      { name: "wide belt noodles", quantity: 250, unit: "g" },
    ],
    [
      "Brown chicken; add soy, tomato paste, and dried chilies.",
      "Simmer with potatoes until tender.",
      "Cook noodles separately; serve everything together on one big plate.",
    ],
  ),
  dish(
    "Yunnan",
    "yunnan-crossing-bridge-noodles",
    "Crossing-the-bridge noodles",
    "过桥米线",
    "Yunnan rice noodles with a hot chicken broth that cooks thin meat and vegetables at the table.",
    "main",
    [
      { name: "rice noodles", quantity: 300, unit: "g" },
      { name: "chicken stock", quantity: 1.2, unit: "l" },
      { name: "thinly sliced chicken", quantity: 150, unit: "g" },
    ],
    [
      "Keep stock piping hot in a covered bowl.",
      "Add rice noodles, then slide in chicken, greens, and egg.",
      "Let residual heat cook the meat; eat immediately.",
    ],
  ),
  dish(
    "Zhejiang",
    "zhejiang-dongpo-pork",
    "Dongpo pork",
    "东坡肉",
    "Hangzhou braised pork belly bound with rope — rich, red, and named for the poet Su Dongpo.",
    "main",
    [
      { name: "pork belly block", quantity: 800, unit: "g" },
      { name: "Shaoxing wine", quantity: 200, unit: "ml" },
      { name: "dark soy sauce", quantity: 3, unit: "tbsp" },
    ],
    [
      "Blanch belly; tie into a neat block if you like.",
      "Braise slowly with wine, soy, and sugar for 2 hours.",
      "Rest and slice; serve with steamed buns or rice.",
    ],
  ),
];

export async function seedChineseRegionRecipes(db?: Pool): Promise<number> {
  const pool = db ?? (await ensureDb());
  let inserted = 0;
  let sortOrder = 0;

  for (const entry of CHINESE_REGION_RECIPES) {
    const subdivision = findSubdivisionByName("cn", entry.region);
    if (!subdivision) continue;
    const regionExists = await pool.query<{ id: string }>(
      `SELECT id FROM regions
       WHERE country_code = 'cn' AND normalized_name = $1`,
      [normalizeRegionName(entry.region)],
    );
    const regionRow = regionExists.rows[0];
    if (!regionRow) continue;

    const result = await pool.query(
      `INSERT INTO recipes (
        country_code, id, menu_slot, sort_order, name, local_name, description,
        category, servings, prep_minutes, cook_minutes, difficulty, dietary_labels,
        ingredients, steps, region_id, updated_at
      ) VALUES (
        'cn', $1, 'more', $2, $3, $4, $5,
        $6, 4, 20, 30, 'medium', '[]'::jsonb,
        $7::jsonb, $8::jsonb, $9, NOW()
      )
      ON CONFLICT (country_code, id) DO NOTHING`,
      [
        entry.id,
        sortOrder,
        entry.name,
        entry.localName,
        entry.description,
        entry.category,
        JSON.stringify(entry.ingredients),
        JSON.stringify(entry.steps),
        regionRow.id,
      ],
    );
    inserted += result.rowCount ?? 0;
    sortOrder += 1;
  }

  return inserted;
}
