#!/usr/bin/env python3
"""Expand thin authored country menus to 7 recipes and patch specialty shops."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COUNTRIES = ROOT / "src/content/countries"
SHOPS = ROOT / "src/content/shops/specialtyShops.ts"

# Classic dishes with Wikipedia titles for sourceUrl (home-cookable, distinct from core menus).
EXPANSIONS: dict[str, list[dict]] = {
    "bg": [
        {
            "id": "tarator",
            "name": "Cold Yogurt Cucumber Soup",
            "localName": "Таратор",
            "category": "starter",
            "description": "Chilled yogurt soup with cucumber, dill, garlic, and walnuts for hot Balkan days.",
            "wiki": "Tarator",
            "labels": ["vegetarian", "gluten-free"],
            "ingredients": [
                ("Bulgarian yogurt", 500, "g"),
                ("cucumber", 1, "piece"),
                ("dill", 15, "g"),
                ("walnuts", 40, "g"),
            ],
            "steps": [
                "1. Grate the cucumber and squeeze out excess liquid.",
                "2. Whisk yogurt with cold water until pourable, then stir in cucumber, crushed garlic, and dill.",
                "3. Chill thoroughly and finish with chopped walnuts and a drizzle of oil.",
            ],
        },
        {
            "id": "sarmi",
            "name": "Stuffed Cabbage Leaves",
            "localName": "Сарми",
            "category": "main",
            "description": "Cabbage leaves rolled around seasoned rice and minced meat, simmered gently until tender.",
            "wiki": "Sarma",
            "labels": ["contains-meat"],
            "ingredients": [
                ("sauerkraut leaves or cabbage", 12, "pieces"),
                ("minced pork and beef", 500, "g"),
                ("rice", 100, "g"),
                ("onion", 1, "piece"),
            ],
            "steps": [
                "1. Soften onion and mix with minced meat, rinsed rice, paprika, and salt.",
                "2. Roll spoonfuls into cabbage leaves and pack snugly in a pot.",
                "3. Cover with water or light stock and simmer until the rice is cooked through.",
            ],
        },
        {
            "id": "mekitsi",
            "name": "Fried Yogurt Dough",
            "localName": "Мекици",
            "category": "dessert",
            "description": "Puffy yogurt fritters dusted with sugar, often eaten for breakfast with jam.",
            "wiki": "Mekitsa",
            "labels": ["vegetarian"],
            "ingredients": [
                ("flour", 400, "g"),
                ("yogurt", 250, "g"),
                ("egg", 1, "piece"),
                ("baking soda", 5, "g"),
            ],
            "steps": [
                "1. Mix flour, yogurt, egg, and baking soda into a soft sticky dough and rest briefly.",
                "2. Pull small pieces and stretch them thin with oiled hands.",
                "3. Fry in medium-hot oil until golden, then dust with sugar.",
            ],
        },
    ],
    "es": [
        {
            "id": "tortilla-espanola",
            "name": "Spanish Potato Omelette",
            "localName": "Tortilla española",
            "category": "main",
            "description": "Eggs and slowly cooked potatoes set into a thick omelette, served warm or room temperature.",
            "wiki": "Spanish_omelette",
            "labels": ["vegetarian", "gluten-free"],
            "ingredients": [
                ("waxy potatoes", 700, "g"),
                ("eggs", 6, "pieces"),
                ("onion", 1, "piece"),
                ("olive oil", 120, "ml"),
            ],
            "steps": [
                "1. Gently fry sliced potatoes and onion in olive oil until tender, then drain.",
                "2. Mix with beaten seasoned eggs and return to a hot pan.",
                "3. Cook until set, flip carefully, and finish the second side.",
            ],
        },
        {
            "id": "gazpacho",
            "name": "Andalusian Gazpacho",
            "localName": "Gazpacho",
            "category": "starter",
            "description": "Chilled tomato soup blended with pepper, cucumber, garlic, and olive oil.",
            "wiki": "Gazpacho",
            "labels": ["vegetarian", "vegan"],
            "ingredients": [
                ("ripe tomatoes", 800, "g"),
                ("cucumber", 0.5, "piece"),
                ("green pepper", 1, "piece"),
                ("stale bread", 60, "g"),
            ],
            "steps": [
                "1. Soak bread briefly, then blend with tomatoes, cucumber, pepper, and garlic.",
                "2. Stream in olive oil and sherry vinegar until silky.",
                "3. Chill well and serve with diced vegetable garnishes.",
            ],
        },
        {
            "id": "churros",
            "name": "Churros with Chocolate",
            "localName": "Churros",
            "category": "dessert",
            "description": "Crisp fried dough ridges rolled in sugar and dipped in thick drinking chocolate.",
            "wiki": "Churro",
            "labels": ["vegetarian"],
            "ingredients": [
                ("flour", 250, "g"),
                ("water", 250, "ml"),
                ("butter", 30, "g"),
                ("dark chocolate", 150, "g"),
            ],
            "steps": [
                "1. Bring water, butter, and salt to a boil, then beat in flour to a smooth dough.",
                "2. Pipe ridges into hot oil and fry until deep golden.",
                "3. Toss in sugar and serve with melted chocolate for dipping.",
            ],
        },
    ],
    "gr": [
        {
            "id": "spanakopita",
            "name": "Spinach Pie",
            "localName": "Σπανακόπιτα",
            "category": "starter",
            "description": "Flaky filo pastry layered with spinach, herbs, and briny feta cheese.",
            "wiki": "Spanakopita",
            "labels": ["vegetarian"],
            "ingredients": [
                ("filo pastry", 250, "g"),
                ("spinach", 500, "g"),
                ("feta", 200, "g"),
                ("spring onions", 4, "pieces"),
            ],
            "steps": [
                "1. Wilt spinach, squeeze dry, and mix with feta, herbs, and spring onions.",
                "2. Layer buttered filo in a tin, add filling, and top with more sheets.",
                "3. Score and bake until the pastry is shatteringly crisp.",
            ],
        },
        {
            "id": "souvlaki",
            "name": "Pork Souvlaki",
            "localName": "Σουβλάκι",
            "category": "main",
            "description": "Lemon-oregano marinated pork skewers grilled until juicy and lightly charred.",
            "wiki": "Souvlaki",
            "labels": ["contains-meat"],
            "ingredients": [
                ("pork shoulder", 700, "g"),
                ("lemon", 2, "pieces"),
                ("dried oregano", 10, "g"),
                ("olive oil", 60, "ml"),
            ],
            "steps": [
                "1. Cube the pork and marinate with lemon, oregano, garlic, and oil.",
                "2. Thread onto skewers and grill over high heat, turning often.",
                "3. Rest briefly and serve with pita, tzatziki, and salad.",
            ],
        },
        {
            "id": "baklava",
            "name": "Honey Nut Baklava",
            "localName": "Μπακλαβάς",
            "category": "dessert",
            "description": "Buttery filo layers filled with nuts and soaked in fragrant honey syrup.",
            "wiki": "Baklava",
            "labels": ["vegetarian"],
            "ingredients": [
                ("filo pastry", 250, "g"),
                ("walnuts", 250, "g"),
                ("butter", 150, "g"),
                ("honey", 200, "g"),
            ],
            "steps": [
                "1. Layer buttered filo with chopped nuts and cinnamon in a tin.",
                "2. Bake until golden, then pour cool honey syrup over the hot pastry.",
                "3. Rest until the syrup is absorbed before cutting into diamonds.",
            ],
        },
    ],
    "tr": [
        {
            "id": "lahmacun",
            "name": "Turkish Flatbread Pizza",
            "localName": "Lahmacun",
            "category": "main",
            "description": "Thin crisp flatbread topped with spiced minced meat, then rolled with herbs and lemon.",
            "wiki": "Lahmacun",
            "labels": ["contains-meat"],
            "ingredients": [
                ("pizza dough or flatbread dough", 400, "g"),
                ("minced lamb or beef", 300, "g"),
                ("tomato", 2, "pieces"),
                ("parsley", 30, "g"),
            ],
            "steps": [
                "1. Blend minced meat with tomato, pepper, onion, and spices into a fine paste.",
                "2. Spread thinly over rolled dough rounds.",
                "3. Bake very hot until the edges crisp, then roll with parsley and lemon.",
            ],
        },
        {
            "id": "imam-bayildi",
            "name": "Stuffed Eggplant",
            "localName": "İmam bayıldı",
            "category": "side",
            "description": "Eggplants slowly cooked with olive oil, onion, and tomato until silky and sweet.",
            "wiki": "Imam_bayildi",
            "labels": ["vegetarian", "vegan"],
            "ingredients": [
                ("eggplants", 4, "pieces"),
                ("onions", 2, "pieces"),
                ("tomatoes", 400, "g"),
                ("olive oil", 80, "ml"),
            ],
            "steps": [
                "1. Soften slit eggplants in olive oil until pliable.",
                "2. Fill with slowly cooked onion, tomato, and garlic.",
                "3. Bake gently until collapsing and fragrant, then cool slightly.",
            ],
        },
        {
            "id": "baklava-tr",
            "name": "Gaziantep Baklava",
            "localName": "Baklava",
            "category": "dessert",
            "description": "Paper-thin pastry layered with pistachios and soaked in light sugar syrup.",
            "wiki": "Baklava",
            "labels": ["vegetarian"],
            "ingredients": [
                ("filo pastry", 250, "g"),
                ("pistachios", 200, "g"),
                ("butter", 150, "g"),
                ("sugar", 250, "g"),
            ],
            "steps": [
                "1. Butter filo sheets in a tin, scattering pistachios through the middle layers.",
                "2. Cut into diamonds and bake until deep golden.",
                "3. Pour warm light syrup over and rest before serving.",
            ],
        },
    ],
    "lb": [
        {
            "id": "tabbouleh",
            "name": "Parsley Tabbouleh",
            "localName": "تبولة",
            "category": "side",
            "description": "A herb-forward salad of parsley, mint, tomato, and fine bulgur dressed with lemon.",
            "wiki": "Tabbouleh",
            "labels": ["vegetarian", "vegan"],
            "ingredients": [
                ("flat-leaf parsley", 150, "g"),
                ("tomatoes", 3, "pieces"),
                ("fine bulgur", 40, "g"),
                ("lemons", 2, "pieces"),
            ],
            "steps": [
                "1. Soak bulgur briefly, then drain well.",
                "2. Finely chop parsley, mint, and tomato.",
                "3. Toss with lemon juice, olive oil, and salt just before serving.",
            ],
        },
        {
            "id": "shawarma",
            "name": "Chicken Shawarma",
            "localName": "شاورما دجاج",
            "category": "main",
            "description": "Spice-rubbed chicken roasted until caramelised, carved into warm flatbread wraps.",
            "wiki": "Shawarma",
            "labels": ["contains-meat"],
            "ingredients": [
                ("chicken thighs", 800, "g"),
                ("shawarma spice mix", 30, "g"),
                ("yogurt", 100, "g"),
                ("flatbreads", 8, "pieces"),
            ],
            "steps": [
                "1. Marinate chicken in yogurt, spices, garlic, and lemon for at least an hour.",
                "2. Roast or grill until the edges char lightly.",
                "3. Slice thinly and wrap with garlic sauce, pickles, and salad.",
            ],
        },
        {
            "id": "maamoul",
            "name": "Date-Filled Cookies",
            "localName": "معمول",
            "category": "dessert",
            "description": "Shortbread-like cookies filled with dates or nuts, pressed in decorative moulds.",
            "wiki": "Maamoul",
            "labels": ["vegetarian"],
            "ingredients": [
                ("semolina", 300, "g"),
                ("butter", 150, "g"),
                ("date paste", 250, "g"),
                ("orange blossom water", 15, "ml"),
            ],
            "steps": [
                "1. Rub butter into semolina with a little blossom water to form a dough.",
                "2. Enclose date paste in small discs and press into moulds.",
                "3. Bake until pale gold and dust with icing sugar when cool.",
            ],
        },
    ],
    "ma": [
        {
            "id": "harira",
            "name": "Harira Soup",
            "localName": "حريرة",
            "category": "starter",
            "description": "Tomato, lentil, and chickpea soup thickened with flour and brightened with herbs and lemon.",
            "wiki": "Harira",
            "labels": ["contains-meat"],
            "ingredients": [
                ("lamb or beef", 300, "g"),
                ("red lentils", 100, "g"),
                ("chickpeas", 200, "g"),
                ("tomatoes", 400, "g"),
            ],
            "steps": [
                "1. Brown the meat with onion, celery, and spices.",
                "2. Add tomatoes, lentils, chickpeas, and stock; simmer until soft.",
                "3. Thicken lightly with a flour slurry and finish with coriander and lemon.",
            ],
        },
        {
            "id": "couscous-tfaya",
            "name": "Couscous with Tfaya",
            "localName": "كسكس",
            "category": "main",
            "description": "Steamed couscous topped with caramelised onion-raisin tfaya and a fragrant broth.",
            "wiki": "Couscous",
            "labels": ["vegetarian"],
            "ingredients": [
                ("couscous", 400, "g"),
                ("onions", 3, "pieces"),
                ("raisins", 80, "g"),
                ("chickpeas", 250, "g"),
            ],
            "steps": [
                "1. Steam couscous in stages, fluffing with butter or oil between rounds.",
                "2. Slowly caramelise onions with cinnamon and raisins for the tfaya.",
                "3. Serve couscous mounded with chickpeas, broth, and the sweet onion topping.",
            ],
        },
        {
            "id": "chebakia",
            "name": "Sesame Honey Pastries",
            "localName": "شباكية",
            "category": "dessert",
            "description": "Flower-shaped fried pastries soaked in honey and coated with sesame.",
            "wiki": "Chebakia",
            "labels": ["vegetarian"],
            "ingredients": [
                ("flour", 400, "g"),
                ("sesame seeds", 80, "g"),
                ("honey", 300, "g"),
                ("orange blossom water", 30, "ml"),
            ],
            "steps": [
                "1. Knead a spiced dough with sesame and blossom water, then rest.",
                "2. Shape into flowers, fry until deep golden, and drain.",
                "3. Dip in warm honey and sprinkle with more sesame.",
            ],
        },
    ],
    "et": [
        {
            "id": "tibs",
            "name": "Sautéed Beef Tibs",
            "localName": "ጥብስ",
            "category": "main",
            "description": "Quick-seared beef with onion, rosemary, and berbere, served sizzling with injera.",
            "wiki": "Tibs",
            "labels": ["contains-meat", "gluten-free"],
            "ingredients": [
                ("beef sirloin", 600, "g"),
                ("onion", 2, "pieces"),
                ("berbere", 15, "g"),
                ("fresh rosemary", 5, "g"),
            ],
            "steps": [
                "1. Cube the beef and season lightly with salt.",
                "2. Sear hard in a hot pan, then add onion, berbere, and rosemary.",
                "3. Cook until the onions soften and the spices bloom; serve at once.",
            ],
        },
        {
            "id": "shiro",
            "name": "Chickpea Shiro Stew",
            "localName": "ሽሮ",
            "category": "side",
            "description": "Silky spiced chickpea-flour stew that is everyday comfort across Ethiopia.",
            "wiki": "Shiro_(food)",
            "labels": ["vegetarian", "vegan"],
            "ingredients": [
                ("shiro flour or chickpea flour", 150, "g"),
                ("onion", 1, "piece"),
                ("tomato", 1, "piece"),
                ("niter kibbeh or oil", 40, "ml"),
            ],
            "steps": [
                "1. Soften onion in oil until sweet, then add tomato.",
                "2. Whisk in shiro flour with water to a smooth pourable paste.",
                "3. Simmer, stirring, until thick and creamy; season to taste.",
            ],
        },
        {
            "id": "genfo",
            "name": "Barley Porridge",
            "localName": "ገንፎ",
            "category": "dessert",
            "description": "Thick barley porridge shaped into a well and filled with spiced butter.",
            "wiki": "Genfo",
            "labels": ["vegetarian"],
            "ingredients": [
                ("barley flour", 250, "g"),
                ("water", 600, "ml"),
                ("niter kibbeh or butter", 60, "g"),
                ("berbere", 5, "g"),
            ],
            "steps": [
                "1. Whisk barley flour into boiling salted water until very thick.",
                "2. Shape into a mound with a hollow centre.",
                "3. Fill the well with melted spiced butter and a pinch of berbere.",
            ],
        },
    ],
    "sn": [
        {
            "id": "yassa-poulet",
            "name": "Chicken Yassa",
            "localName": "Yassa poulet",
            "category": "main",
            "description": "Onion-lemon marinated chicken grilled then simmered in a tangy caramelised sauce.",
            "wiki": "Yassa_(food)",
            "labels": ["contains-meat"],
            "ingredients": [
                ("chicken pieces", 1000, "g"),
                ("onions", 4, "pieces"),
                ("lemons", 3, "pieces"),
                ("Dijon mustard", 30, "g"),
            ],
            "steps": [
                "1. Marinate chicken with lemon, mustard, onion, and garlic.",
                "2. Brown the chicken, then slowly cook the onions until deep gold.",
                "3. Simmer everything together until the sauce is glossy and sharp.",
            ],
        },
        {
            "id": "maafe",
            "name": "Peanut Stew",
            "localName": "Mafé",
            "category": "main",
            "description": "Rich peanut and tomato stew with tender meat or vegetables, served over rice.",
            "wiki": "Maafe",
            "labels": ["contains-meat"],
            "ingredients": [
                ("beef or chicken", 700, "g"),
                ("natural peanut butter", 150, "g"),
                ("tomato paste", 60, "g"),
                ("onion", 1, "piece"),
            ],
            "steps": [
                "1. Brown the meat with onion and tomato paste.",
                "2. Stir in peanut butter thinned with stock and simmer gently.",
                "3. Cook until thick and the meat is tender; serve with rice.",
            ],
        },
        {
            "id": "fataya",
            "name": "Fish Pastries",
            "localName": "Fataya",
            "category": "snack",
            "description": "Crisp half-moon pastries filled with seasoned fish, onion, and herbs.",
            "wiki": "Senegalese_cuisine",
            "labels": ["contains-meat"],
            "ingredients": [
                ("flour", 300, "g"),
                ("cooked flaked fish", 250, "g"),
                ("onion", 1, "piece"),
                ("parsley", 20, "g"),
            ],
            "steps": [
                "1. Make a soft dough and rest while preparing the filling.",
                "2. Mix fish with softened onion, parsley, and seasoning.",
                "3. Seal into half-moons and fry until golden.",
            ],
        },
    ],
    "za": [
        {
            "id": "boerewors",
            "name": "Boerewors Sausage",
            "localName": "Boerewors",
            "category": "main",
            "description": "Coiled spiced beef-and-pork sausage grilled over coals for a classic braai.",
            "wiki": "Boerewors",
            "labels": ["contains-meat"],
            "ingredients": [
                ("boerewors sausage", 800, "g"),
                ("braai spice or coriander seed", 10, "g"),
                ("soft rolls", 4, "pieces"),
            ],
            "steps": [
                "1. Bring the coiled sausage to room temperature and oil lightly.",
                "2. Grill over medium coals, turning carefully so the casing does not split.",
                "3. Rest briefly and serve in rolls with chakalaka or onion relish.",
            ],
        },
        {
            "id": "potjiekos",
            "name": "Potjie Stew",
            "localName": "Potjiekos",
            "category": "main",
            "description": "Layered meat-and-vegetable stew cooked slowly in a cast-iron potjie over fire.",
            "wiki": "Potjiekos",
            "labels": ["contains-meat"],
            "ingredients": [
                ("beef stewing meat", 800, "g"),
                ("potatoes", 400, "g"),
                ("carrots", 300, "g"),
                ("onion", 2, "pieces"),
            ],
            "steps": [
                "1. Brown meat in a potjie or heavy casserole with onions.",
                "2. Layer vegetables without stirring and add a little stock.",
                "3. Cover and simmer slowly until everything is tender and juices mingle.",
            ],
        },
        {
            "id": "koeksisters",
            "name": "Syrup Twists",
            "localName": "Koeksisters",
            "category": "dessert",
            "description": "Plaited doughnuts plunged into ice-cold syrup until glassy and intensely sweet.",
            "wiki": "Koeksister",
            "labels": ["vegetarian"],
            "ingredients": [
                ("flour", 400, "g"),
                ("milk", 200, "ml"),
                ("sugar", 400, "g"),
                ("lemon", 1, "piece"),
            ],
            "steps": [
                "1. Mix a soft dough, rest, then plait into small twists.",
                "2. Fry until golden while chilling a lemon-ginger syrup.",
                "3. Dunk hot koeksisters straight into the ice-cold syrup.",
            ],
        },
    ],
    "in": [
        {
            "id": "palak-paneer",
            "name": "Spinach Paneer Curry",
            "localName": "पालक पनीर",
            "category": "main",
            "description": "Soft paneer cubes in a velvety spinach gravy scented with cumin and garlic.",
            "wiki": "Palak_paneer",
            "labels": ["vegetarian", "gluten-free"],
            "ingredients": [
                ("spinach", 500, "g"),
                ("paneer", 300, "g"),
                ("onion", 1, "piece"),
                ("garam masala", 5, "g"),
            ],
            "steps": [
                "1. Blanch and blend spinach into a smooth puree.",
                "2. Fry onion, garlic, and spices, then simmer with the spinach.",
                "3. Add paneer cubes gently and warm through without boiling hard.",
            ],
        },
        {
            "id": "masala-dosa",
            "name": "Masala Dosa",
            "localName": "மசாலா தோசை",
            "category": "main",
            "description": "Crisp fermented rice-lentil crepe filled with spiced potato mash.",
            "wiki": "Masala_dosa",
            "labels": ["vegetarian", "vegan"],
            "ingredients": [
                ("dosa batter", 500, "ml"),
                ("potatoes", 500, "g"),
                ("mustard seeds", 5, "g"),
                ("curry leaves", 10, "pieces"),
            ],
            "steps": [
                "1. Make a tempered potato filling with mustard seeds, onion, and curry leaves.",
                "2. Spread thin batter on a hot greased tawa until crisp.",
                "3. Add filling, fold, and serve with coconut chutney and sambar.",
            ],
        },
        {
            "id": "jalebi",
            "name": "Jalebi",
            "localName": "जलेबी",
            "category": "dessert",
            "description": "Crisp saffron-tinted pretzel swirls soaked in warm sugar syrup.",
            "wiki": "Jalebi",
            "labels": ["vegetarian"],
            "ingredients": [
                ("flour", 150, "g"),
                ("yogurt", 80, "g"),
                ("sugar", 250, "g"),
                ("saffron or food colour", 1, "pinch"),
            ],
            "steps": [
                "1. Ferment a flour-yogurt batter until slightly sour and bubbly.",
                "2. Pipe spirals into hot oil and fry until crisp.",
                "3. Dunk briefly in warm sugar syrup and serve warm.",
            ],
        },
    ],
    "vn": [
        {
            "id": "banh-mi",
            "name": "Vietnamese Banh Mi",
            "localName": "Bánh mì",
            "category": "main",
            "description": "Crisp baguette filled with pâté, mayo, pickled vegetables, herbs, and seasoned protein.",
            "wiki": "Bánh_mì",
            "labels": ["contains-meat"],
            "ingredients": [
                ("baguettes", 4, "pieces"),
                ("pork or tofu", 300, "g"),
                ("pickled carrot and daikon", 150, "g"),
                ("fresh coriander", 20, "g"),
            ],
            "steps": [
                "1. Warm the baguettes until the crust crackles.",
                "2. Spread mayo and pâté, then layer protein, pickles, cucumber, and chilli.",
                "3. Finish with coriander and a squeeze of lime or Maggi-style seasoning.",
            ],
        },
        {
            "id": "bun-cha",
            "name": "Hanoi Bun Cha",
            "localName": "Bún chả",
            "category": "main",
            "description": "Grilled pork patties and slices in a sweet-salty broth with rice noodles and herbs.",
            "wiki": "Bun_cha",
            "labels": ["contains-meat"],
            "ingredients": [
                ("minced pork", 400, "g"),
                ("pork belly slices", 300, "g"),
                ("rice vermicelli", 300, "g"),
                ("fish sauce", 60, "ml"),
            ],
            "steps": [
                "1. Season minced pork and belly with fish sauce, sugar, and garlic; form patties.",
                "2. Grill until caramelised, then nestle into a warm diluted dipping broth.",
                "3. Serve with noodles, lettuce, and a pile of fresh herbs.",
            ],
        },
        {
            "id": "banh-xeo",
            "name": "Sizzling Crepes",
            "localName": "Bánh xèo",
            "category": "starter",
            "description": "Turmeric rice crepes filled with pork, prawns, and beansprouts, eaten in lettuce wraps.",
            "wiki": "Bánh_xèo",
            "labels": ["contains-meat"],
            "ingredients": [
                ("rice flour", 200, "g"),
                ("turmeric", 3, "g"),
                ("prawns", 200, "g"),
                ("beansprouts", 150, "g"),
            ],
            "steps": [
                "1. Whisk a thin rice-flour batter with turmeric and coconut milk.",
                "2. Pour into a hot oiled pan with fillings until the edges crisp.",
                "3. Fold and wrap pieces in lettuce with herbs and nuoc cham.",
            ],
        },
    ],
    "pe": [
        {
            "id": "lomo-saltado",
            "name": "Lomo Saltado",
            "localName": "Lomo saltado",
            "category": "main",
            "description": "Wok-tossed beef with onion, tomato, and soy, served with fries and rice.",
            "wiki": "Lomo_saltado",
            "labels": ["contains-meat"],
            "ingredients": [
                ("beef sirloin", 600, "g"),
                ("red onion", 2, "pieces"),
                ("tomatoes", 3, "pieces"),
                ("soy sauce", 40, "ml"),
            ],
            "steps": [
                "1. Sear beef strips over very high heat so they brown without stewing.",
                "2. Toss with onion, tomato, soy, and vinegar briefly.",
                "3. Serve immediately over fries with a scoop of rice.",
            ],
        },
        {
            "id": "aji-de-gallina",
            "name": "Aji de Gallina",
            "localName": "Ají de gallina",
            "category": "main",
            "description": "Shredded chicken in a creamy yellow chilli sauce thickened with bread and nuts.",
            "wiki": "Ají_de_gallina",
            "labels": ["contains-meat"],
            "ingredients": [
                ("cooked chicken", 500, "g"),
                ("aji amarillo paste", 40, "g"),
                ("evaporated milk", 200, "ml"),
                ("bread", 80, "g"),
            ],
            "steps": [
                "1. Soften onion and garlic, then fry the aji paste until aromatic.",
                "2. Blend soaked bread with milk and nuts; simmer into a thick sauce.",
                "3. Fold in shredded chicken and serve with rice and potatoes.",
            ],
        },
        {
            "id": "picarones",
            "name": "Picarones",
            "localName": "Picarones",
            "category": "dessert",
            "description": "Pumpkin-sweet potato doughnuts soaked in spiced chancaca syrup.",
            "wiki": "Picarones",
            "labels": ["vegetarian"],
            "ingredients": [
                ("sweet potato", 250, "g"),
                ("pumpkin puree", 200, "g"),
                ("flour", 300, "g"),
                ("chancaca or dark sugar", 200, "g"),
            ],
            "steps": [
                "1. Mash cooked sweet potato and pumpkin into a yeasted dough with flour.",
                "2. Pull rings and fry until puffed and golden.",
                "3. Dip in warm clove-cinnamon syrup and serve hot.",
            ],
        },
    ],
    "br": [
        {
            "id": "coxinha",
            "name": "Chicken Coxinha",
            "localName": "Coxinha",
            "category": "starter",
            "description": "Teardrop croquettes of creamy shredded chicken wrapped in dough and fried crisp.",
            "wiki": "Coxinha",
            "labels": ["contains-meat"],
            "ingredients": [
                ("cooked chicken", 400, "g"),
                ("cream cheese", 100, "g"),
                ("flour", 300, "g"),
                ("chicken stock", 400, "ml"),
            ],
            "steps": [
                "1. Mix shredded chicken with cream cheese and seasonings for the filling.",
                "2. Cook a thick dough with stock and flour, cool, then wrap the filling.",
                "3. Bread and deep-fry until evenly golden.",
            ],
        },
        {
            "id": "moqueca",
            "name": "Bahian Fish Stew",
            "localName": "Moqueca",
            "category": "main",
            "description": "Fish gently cooked with coconut milk, peppers, tomatoes, and dendê oil.",
            "wiki": "Moqueca",
            "labels": ["gluten-free"],
            "ingredients": [
                ("firm white fish", 700, "g"),
                ("coconut milk", 400, "ml"),
                ("red pepper", 2, "pieces"),
                ("dendê or palm oil", 30, "ml"),
            ],
            "steps": [
                "1. Layer fish with peppers, tomato, onion, and coriander in a wide pot.",
                "2. Pour over coconut milk and dendê oil; simmer gently without stirring hard.",
                "3. Cook until the fish flakes and the broth turns silky; serve with rice.",
            ],
        },
        {
            "id": "pudim",
            "name": "Brazilian Milk Pudding",
            "localName": "Pudim de leite",
            "category": "dessert",
            "description": "Silky condensed-milk flan with a dark caramel top, chilled until sliceable.",
            "wiki": "Crème_caramel",
            "labels": ["vegetarian", "gluten-free"],
            "ingredients": [
                ("sweetened condensed milk", 395, "g"),
                ("whole milk", 400, "ml"),
                ("eggs", 3, "pieces"),
                ("sugar", 150, "g"),
            ],
            "steps": [
                "1. Caramelise sugar in a mould and swirl to coat.",
                "2. Blend condensed milk, milk, and eggs; pour over the caramel.",
                "3. Bake in a water bath, chill overnight, then unmould.",
            ],
        },
    ],
    "jm": [
        {
            "id": "jerk-chicken",
            "name": "Jerk Chicken",
            "localName": "Jerk chicken",
            "category": "main",
            "description": "Chicken marinated in fiery allspice-scotch bonnet paste and grilled until lacquered.",
            "wiki": "Jerk_(cooking)",
            "labels": ["contains-meat"],
            "ingredients": [
                ("chicken thighs", 1000, "g"),
                ("jerk seasoning or paste", 60, "g"),
                ("scotch bonnet", 1, "piece"),
                ("lime", 2, "pieces"),
            ],
            "steps": [
                "1. Score the chicken and rub thoroughly with jerk paste; marinate overnight if possible.",
                "2. Grill over medium heat, turning and basting, until cooked through.",
                "3. Rest briefly and serve with rice and peas plus a squeeze of lime.",
            ],
        },
        {
            "id": "callaloo",
            "name": "Callaloo Greens",
            "localName": "Callaloo",
            "category": "side",
            "description": "Leafy greens simmered with onion, tomato, and thyme into a soft, savoury side.",
            "wiki": "Callaloo",
            "labels": ["vegetarian", "vegan"],
            "ingredients": [
                ("callaloo or spinach", 500, "g"),
                ("onion", 1, "piece"),
                ("tomato", 1, "piece"),
                ("thyme", 5, "g"),
            ],
            "steps": [
                "1. Soften onion and garlic in oil with thyme.",
                "2. Add tomato, then the washed greens.",
                "3. Cover and cook until tender; season with salt and black pepper.",
            ],
        },
        {
            "id": "rum-cake",
            "name": "Jamaican Rum Cake",
            "localName": "Rum cake",
            "category": "dessert",
            "description": "Dense fruit-studded cake soaked with dark rum syrup for festive gatherings.",
            "wiki": "Rum_cake",
            "labels": ["vegetarian"],
            "ingredients": [
                ("mixed dried fruit", 300, "g"),
                ("dark rum", 120, "ml"),
                ("butter", 200, "g"),
                ("brown sugar", 200, "g"),
            ],
            "steps": [
                "1. Soak dried fruit in rum, then cream butter and sugar.",
                "2. Fold in eggs, flour, spices, and the fruit; bake until a skewer comes out clean.",
                "3. Brush warm cake with extra rum syrup and cool in the tin.",
            ],
        },
    ],
    "fr": [
        {
            "id": "quiche-lorraine",
            "name": "Quiche Lorraine",
            "localName": "Quiche lorraine",
            "category": "main",
            "description": "Savoury custard tart with smoked bacon baked in a crisp pastry shell.",
            "wiki": "Quiche_Lorraine",
            "labels": ["contains-meat"],
            "ingredients": [
                ("shortcrust pastry", 300, "g"),
                ("smoked bacon lardons", 200, "g"),
                ("eggs", 3, "pieces"),
                ("cream", 250, "ml"),
            ],
            "steps": [
                "1. Blind-bake the pastry case until lightly coloured.",
                "2. Scatter fried lardons, then pour over beaten eggs and cream.",
                "3. Bake until just set in the centre with a golden top.",
            ],
        },
        {
            "id": "salade-nicoise",
            "name": "Salade Niçoise",
            "localName": "Salade niçoise",
            "category": "starter",
            "description": "Provençal composed salad of tuna, eggs, olives, tomatoes, and crisp vegetables.",
            "wiki": "Salade_niçoise",
            "labels": ["gluten-free"],
            "ingredients": [
                ("tuna in olive oil", 200, "g"),
                ("eggs", 4, "pieces"),
                ("tomatoes", 4, "pieces"),
                ("Niçoise olives", 80, "g"),
            ],
            "steps": [
                "1. Soft-boil eggs and prepare tomatoes, beans, and potatoes if using.",
                "2. Arrange tuna, eggs, olives, and vegetables on a platter.",
                "3. Dress with olive oil, vinegar, and herbs at the table.",
            ],
        },
        {
            "id": "clafoutis",
            "name": "Cherry Clafoutis",
            "localName": "Clafoutis",
            "category": "dessert",
            "description": "Batter pudding of cherries baked under a lightly sweet eggy custard.",
            "wiki": "Clafoutis",
            "labels": ["vegetarian"],
            "ingredients": [
                ("cherries", 500, "g"),
                ("eggs", 3, "pieces"),
                ("milk", 250, "ml"),
                ("flour", 80, "g"),
            ],
            "steps": [
                "1. Butter a dish and fill with pitted or whole cherries.",
                "2. Whisk eggs, sugar, flour, and milk into a thin batter.",
                "3. Pour over and bake until puffed and golden; dust with sugar.",
            ],
        },
    ],
    "de": [
        {
            "id": "schnitzel",
            "name": "Wiener-Style Schnitzel",
            "localName": "Schnitzel",
            "category": "main",
            "description": "Thin pounded cutlets breaded and fried until crisp, served with lemon.",
            "wiki": "Schnitzel",
            "labels": ["contains-meat"],
            "ingredients": [
                ("pork or veal cutlets", 600, "g"),
                ("flour", 80, "g"),
                ("eggs", 2, "pieces"),
                ("breadcrumbs", 150, "g"),
            ],
            "steps": [
                "1. Pound cutlets thin and season lightly.",
                "2. Coat in flour, egg, and breadcrumbs.",
                "3. Fry in hot fat until golden on both sides; serve with lemon wedges.",
            ],
        },
        {
            "id": "spaetzle",
            "name": "Spaetzle",
            "localName": "Spätzle",
            "category": "side",
            "description": "Soft egg dumplings scraped into boiling water, then tossed in butter.",
            "wiki": "Spätzle",
            "labels": ["vegetarian"],
            "ingredients": [
                ("flour", 300, "g"),
                ("eggs", 3, "pieces"),
                ("milk", 120, "ml"),
                ("butter", 40, "g"),
            ],
            "steps": [
                "1. Beat flour, eggs, milk, and salt into a thick elastic batter.",
                "2. Press or scrape into simmering water until the dumplings float.",
                "3. Drain and toss in butter; brown lightly if you like.",
            ],
        },
        {
            "id": "apfelstrudel",
            "name": "Apple Strudel",
            "localName": "Apfelstrudel",
            "category": "dessert",
            "description": "Paper-thin pastry wrapped around spiced apples, raisins, and crumbs.",
            "wiki": "Apple_strudel",
            "labels": ["vegetarian"],
            "ingredients": [
                ("puff pastry or strudel dough", 300, "g"),
                ("apples", 700, "g"),
                ("raisins", 60, "g"),
                ("breadcrumbs", 40, "g"),
            ],
            "steps": [
                "1. Toss sliced apples with sugar, cinnamon, raisins, and toasted crumbs.",
                "2. Roll into pastry, tuck the ends, and brush with butter or egg.",
                "3. Bake until deep golden and dust with icing sugar.",
            ],
        },
    ],
    "kr": [
        {
            "id": "bulgogi",
            "name": "Bulgogi",
            "localName": "불고기",
            "category": "main",
            "description": "Thinly sliced beef marinated in soy, pear, and sesame, then quickly grilled.",
            "wiki": "Bulgogi",
            "labels": ["contains-meat"],
            "ingredients": [
                ("ribeye or sirloin", 600, "g"),
                ("soy sauce", 60, "ml"),
                ("Asian pear", 0.5, "piece"),
                ("sesame oil", 15, "ml"),
            ],
            "steps": [
                "1. Slice beef thinly and marinate with soy, grated pear, garlic, and sesame oil.",
                "2. Grill or pan-sear quickly over high heat.",
                "3. Serve with rice, lettuce wraps, and ssamjang.",
            ],
        },
        {
            "id": "tteokbokki",
            "name": "Spicy Rice Cakes",
            "localName": "떡볶이",
            "category": "snack",
            "description": "Chewy rice cakes simmered in a sweet-spicy gochujang sauce with fish cakes.",
            "wiki": "Tteokbokki",
            "labels": ["contains-meat"],
            "ingredients": [
                ("cylindrical rice cakes", 400, "g"),
                ("gochujang", 40, "g"),
                ("fish cakes", 150, "g"),
                ("spring onions", 3, "pieces"),
            ],
            "steps": [
                "1. Soften rice cakes in warm water if refrigerated.",
                "2. Simmer gochujang, sugar, and stock into a glossy sauce.",
                "3. Add rice cakes and fish cakes until chewy and coated; finish with spring onion.",
            ],
        },
        {
            "id": "kimchi-jjigae",
            "name": "Kimchi Stew",
            "localName": "김치찌개",
            "category": "main",
            "description": "Bubbling stew of aged kimchi, pork or tofu, and gochugaru in a deep red broth.",
            "wiki": "Kimchi-jjigae",
            "labels": ["contains-meat"],
            "ingredients": [
                ("aged kimchi", 300, "g"),
                ("pork belly", 200, "g"),
                ("tofu", 200, "g"),
                ("gochugaru", 10, "g"),
            ],
            "steps": [
                "1. Stir-fry kimchi and pork until the edges caramelise.",
                "2. Add water or stock and gochugaru; simmer until bold and sour-spicy.",
                "3. Nestle in tofu and spring onions for the last few minutes.",
            ],
        },
    ],
    "cn": [
        {
            "id": "mapo-tofu",
            "name": "Mapo Tofu",
            "localName": "麻婆豆腐",
            "category": "main",
            "description": "Silken tofu in a numbing-spicy Sichuan sauce with minced meat and doubanjiang.",
            "wiki": "Mapo_tofu",
            "labels": ["contains-meat"],
            "ingredients": [
                ("silken tofu", 400, "g"),
                ("minced pork", 150, "g"),
                ("doubanjiang", 30, "g"),
                ("Sichuan pepper", 5, "g"),
            ],
            "steps": [
                "1. Fry doubanjiang with minced pork until the oil turns red.",
                "2. Add stock and gently simmer cubed tofu.",
                "3. Thicken lightly and finish with ground Sichuan pepper and spring onion.",
            ],
        },
        {
            "id": "xiaolongbao",
            "name": "Soup Dumplings",
            "localName": "小笼包",
            "category": "starter",
            "description": "Pleated dumplings filled with pork and gelatin-rich broth that melts when steamed.",
            "wiki": "Xiaolongbao",
            "labels": ["contains-meat"],
            "ingredients": [
                ("dumpling wrappers", 30, "pieces"),
                ("minced pork", 300, "g"),
                ("aspic or gelatin stock", 150, "g"),
                ("ginger", 20, "g"),
            ],
            "steps": [
                "1. Mix pork with finely diced aspic, ginger, and seasoning.",
                "2. Fill wrappers, pleat carefully, and steam over high heat.",
                "3. Serve with black vinegar and ginger; bite a small hole first to sip the soup.",
            ],
        },
        {
            "id": "kung-pao-chicken",
            "name": "Kung Pao Chicken",
            "localName": "宫保鸡丁",
            "category": "main",
            "description": "Diced chicken stir-fried with dried chillies, Sichuan pepper, and peanuts.",
            "wiki": "Kung_Pao_chicken",
            "labels": ["contains-meat"],
            "ingredients": [
                ("chicken thigh", 500, "g"),
                ("dried chillies", 8, "pieces"),
                ("roasted peanuts", 60, "g"),
                ("Sichuan peppercorns", 5, "g"),
            ],
            "steps": [
                "1. Marinate diced chicken briefly with soy and cornstarch.",
                "2. Stir-fry chillies and peppercorns, then the chicken until just cooked.",
                "3. Toss with a sweet-sour sauce and peanuts; serve at once.",
            ],
        },
    ],
    "pt": [
        {
            "id": "pasteis-de-bacalhau",
            "name": "Salt Cod Fritters",
            "localName": "Pastéis de bacalhau",
            "category": "starter",
            "description": "Golden quenelles of salt cod, potato, and parsley fried until crisp outside.",
            "wiki": "Pastéis_de_bacalhau",
            "labels": ["gluten-free"],
            "ingredients": [
                ("desalted salt cod", 300, "g"),
                ("potatoes", 400, "g"),
                ("eggs", 2, "pieces"),
                ("parsley", 20, "g"),
            ],
            "steps": [
                "1. Mash cooked potato with flaked salt cod, egg, and parsley.",
                "2. Shape quenelles with two spoons.",
                "3. Deep-fry until deep gold and drain on paper.",
            ],
        },
        {
            "id": "francesinha",
            "name": "Francesinha",
            "localName": "Francesinha",
            "category": "main",
            "description": "Porto sandwich of meat and sausage smothered in melted cheese and beer sauce.",
            "wiki": "Francesinha",
            "labels": ["contains-meat"],
            "ingredients": [
                ("thick sandwich bread", 8, "slices"),
                ("steak and sausage", 400, "g"),
                ("sliced cheese", 200, "g"),
                ("beer", 250, "ml"),
            ],
            "steps": [
                "1. Build sandwiches with steak, ham, and sausage; cover in cheese.",
                "2. Simmer a tomato-beer sauce until rich.",
                "3. Bake until the cheese melts, then drown in hot sauce; add a fried egg if you like.",
            ],
        },
        {
            "id": "arroz-doce",
            "name": "Portuguese Rice Pudding",
            "localName": "Arroz doce",
            "category": "dessert",
            "description": "Creamy lemon-scented rice pudding finished with cinnamon patterns.",
            "wiki": "Arroz_doce",
            "labels": ["vegetarian", "gluten-free"],
            "ingredients": [
                ("short-grain rice", 180, "g"),
                ("milk", 1000, "ml"),
                ("egg yolks", 3, "pieces"),
                ("lemon zest", 1, "piece"),
            ],
            "steps": [
                "1. Cook rice in milk with lemon zest and sugar until creamy.",
                "2. Temper in egg yolks off the heat for richness.",
                "3. Cool slightly and decorate with cinnamon.",
            ],
        },
    ],
    "ar": [
        {
            "id": "milanesa",
            "name": "Milanesa",
            "localName": "Milanesa",
            "category": "main",
            "description": "Breaded beef cutlets fried crisp, often served with lemon and a simple salad.",
            "wiki": "Milanesa",
            "labels": ["contains-meat"],
            "ingredients": [
                ("beef cutlets", 600, "g"),
                ("eggs", 2, "pieces"),
                ("breadcrumbs", 150, "g"),
                ("lemons", 2, "pieces"),
            ],
            "steps": [
                "1. Pound cutlets thin and season.",
                "2. Dip in egg and breadcrumbs.",
                "3. Fry until golden and serve with lemon wedges.",
            ],
        },
        {
            "id": "locro",
            "name": "Locro Stew",
            "localName": "Locro",
            "category": "main",
            "description": "Hearty corn, bean, and squash stew with chorizo for national-day tables.",
            "wiki": "Locro",
            "labels": ["contains-meat"],
            "ingredients": [
                ("hominy or white corn", 300, "g"),
                ("squash", 400, "g"),
                ("chorizo", 200, "g"),
                ("white beans", 200, "g"),
            ],
            "steps": [
                "1. Simmer soaked corn and beans until beginning to soften.",
                "2. Add squash, onion, and sliced chorizo.",
                "3. Cook until thick and stew-like; finish with paprika oil if desired.",
            ],
        },
        {
            "id": "flan-dulce-de-leche",
            "name": "Dulce de Leche Flan",
            "localName": "Flan",
            "category": "dessert",
            "description": "Vanilla custard unmoulded onto dulce de leche or caramel for a café classic.",
            "wiki": "Crème_caramel",
            "labels": ["vegetarian", "gluten-free"],
            "ingredients": [
                ("eggs", 4, "pieces"),
                ("milk", 500, "ml"),
                ("sugar", 150, "g"),
                ("dulce de leche", 100, "g"),
            ],
            "steps": [
                "1. Coat ramekins with caramel.",
                "2. Whisk eggs, milk, sugar, and vanilla; bake in a water bath.",
                "3. Chill, unmould, and serve with dulce de leche.",
            ],
        },
    ],
    "ng": [
        {
            "id": "egusi-soup",
            "name": "Egusi Soup",
            "localName": "Egusi",
            "category": "main",
            "description": "Melon-seed thickened soup with leafy greens and assorted meats or fish.",
            "wiki": "Egusi_soup",
            "labels": ["contains-meat"],
            "ingredients": [
                ("ground egusi melon seeds", 200, "g"),
                ("palm oil", 60, "ml"),
                ("spinach or ugu leaves", 300, "g"),
                ("assorted meat or fish", 500, "g"),
            ],
            "steps": [
                "1. Cook meats in seasoned stock until tender.",
                "2. Fry ground egusi in palm oil into soft curds, then add stock.",
                "3. Stir in greens at the end and serve with fufu or pounded yam.",
            ],
        },
        {
            "id": "suya",
            "name": "Suya Skewers",
            "localName": "Suya",
            "category": "snack",
            "description": "Spicy peanut-rubbed beef skewers grilled street-style with onions and tomato.",
            "wiki": "Suya",
            "labels": ["contains-meat"],
            "ingredients": [
                ("beef sirloin", 600, "g"),
                ("suya spice or ground peanuts with cayenne", 50, "g"),
                ("onion", 1, "piece"),
                ("groundnut oil", 30, "ml"),
            ],
            "steps": [
                "1. Slice beef thin, oil lightly, and coat in suya spice.",
                "2. Thread onto skewers and grill over high heat.",
                "3. Serve with sliced onion, tomato, and extra spice.",
            ],
        },
        {
            "id": "puff-puff",
            "name": "Puff-Puff",
            "localName": "Puff-puff",
            "category": "dessert",
            "description": "Yeasted deep-fried dough balls that are lightly sweet and cloud-soft inside.",
            "wiki": "Puff_puff",
            "labels": ["vegetarian"],
            "ingredients": [
                ("flour", 350, "g"),
                ("sugar", 60, "g"),
                ("instant yeast", 7, "g"),
                ("warm water", 250, "ml"),
            ],
            "steps": [
                "1. Mix a sticky yeasted batter and proof until doubled.",
                "2. Scoop spoonfuls into hot oil and fry, turning, until mahogany brown.",
                "3. Drain and serve warm, plain or with a dusting of sugar.",
            ],
        },
    ],
    "eg": [
        {
            "id": "ful-medames",
            "name": "Ful Medames",
            "localName": "فول مدمس",
            "category": "main",
            "description": "Slow-cooked fava beans mashed with olive oil, lemon, cumin, and fresh herbs.",
            "wiki": "Ful_medames",
            "labels": ["vegetarian", "vegan"],
            "ingredients": [
                ("dried fava beans", 300, "g"),
                ("olive oil", 60, "ml"),
                ("lemons", 2, "pieces"),
                ("cumin", 5, "g"),
            ],
            "steps": [
                "1. Soak and simmer fava beans until very soft.",
                "2. Mash roughly with cumin, lemon, garlic, and olive oil.",
                "3. Serve warm with pita, eggs, and chopped tomato-onion salad.",
            ],
        },
        {
            "id": "molokhia",
            "name": "Molokhia",
            "localName": "ملوخية",
            "category": "side",
            "description": "Silky jute-leaf soup fragrant with garlic and coriander, poured over rice.",
            "wiki": "Mulukhiyah",
            "labels": ["contains-meat"],
            "ingredients": [
                ("frozen chopped molokhia", 400, "g"),
                ("chicken stock", 800, "ml"),
                ("garlic", 6, "cloves"),
                ("coriander", 20, "g"),
            ],
            "steps": [
                "1. Bring stock to a simmer and stir in molokhia without boiling hard.",
                "2. Fry garlic and coriander in ghee or oil until golden.",
                "3. Stir the garlic mixture into the soup and serve over rice with chicken.",
            ],
        },
        {
            "id": "om-ali",
            "name": "Om Ali",
            "localName": "أم علي",
            "category": "dessert",
            "description": "Egyptian bread pudding baked with milk, nuts, and coconut until bubbling.",
            "wiki": "Om_Ali",
            "labels": ["vegetarian"],
            "ingredients": [
                ("puff pastry or stale croissants", 250, "g"),
                ("milk", 800, "ml"),
                ("mixed nuts", 100, "g"),
                ("sugar", 80, "g"),
            ],
            "steps": [
                "1. Bake or toast pastry pieces until crisp, then break into a dish.",
                "2. Scatter nuts and raisins, then pour over sweetened hot milk.",
                "3. Bake until golden and bubbling on top; serve warm.",
            ],
        },
    ],
    "ph": [
        {
            "id": "sinigang",
            "name": "Sinigang",
            "localName": "Sinigang",
            "category": "main",
            "description": "Sour tamarind broth with pork or seafood, radish, and greens.",
            "wiki": "Sinigang",
            "labels": ["contains-meat"],
            "ingredients": [
                ("pork ribs", 800, "g"),
                ("tamarind paste or sinigang mix", 40, "g"),
                ("daikon radish", 200, "g"),
                ("water spinach or spinach", 150, "g"),
            ],
            "steps": [
                "1. Simmer pork until nearly tender, skimming the broth.",
                "2. Add radish and tomato, then season with tamarind until distinctly sour.",
                "3. Finish with greens and fish sauce; serve with rice.",
            ],
        },
        {
            "id": "pancit-bihon",
            "name": "Pancit Bihon",
            "localName": "Pancit bihon",
            "category": "main",
            "description": "Stir-fried rice noodles with vegetables and meat for birthdays and gatherings.",
            "wiki": "Pancit",
            "labels": ["contains-meat"],
            "ingredients": [
                ("rice sticks bihon", 250, "g"),
                ("chicken or pork", 300, "g"),
                ("cabbage", 200, "g"),
                ("soy sauce", 40, "ml"),
            ],
            "steps": [
                "1. Soak noodles until pliable and prep a quick meat-vegetable stir-fry.",
                "2. Add noodles with soy and a splash of stock, tossing until absorbed.",
                "3. Finish with calamansi or lemon and spring onions.",
            ],
        },
        {
            "id": "leche-flan",
            "name": "Leche Flan",
            "localName": "Leche flan",
            "category": "dessert",
            "description": "Dense caramel custard made with egg yolks and condensed milk.",
            "wiki": "Leche_flan",
            "labels": ["vegetarian", "gluten-free"],
            "ingredients": [
                ("egg yolks", 8, "pieces"),
                ("sweetened condensed milk", 395, "g"),
                ("evaporated milk", 350, "ml"),
                ("sugar", 150, "g"),
            ],
            "steps": [
                "1. Caramelise sugar in a mould or llanera.",
                "2. Whisk yolks with condensed and evaporated milk; strain.",
                "3. Steam or bake in a water bath until set, then chill and unmould.",
            ],
        },
    ],
    "gb": [
        {
            "id": "shepherd-pie",
            "name": "Shepherd's Pie",
            "localName": "Shepherd's pie",
            "category": "main",
            "description": "Minced lamb in gravy under a golden mashed-potato crust.",
            "wiki": "Shepherd's_pie",
            "labels": ["contains-meat"],
            "ingredients": [
                ("minced lamb", 600, "g"),
                ("onion", 1, "piece"),
                ("carrots", 2, "pieces"),
                ("potatoes", 900, "g"),
            ],
            "steps": [
                "1. Brown lamb with onion and carrot, then simmer with stock into a thick gravy.",
                "2. Top with buttery mashed potato and rough up the surface.",
                "3. Bake until the peaks are browned and the filling bubbles.",
            ],
        },
        {
            "id": "sunday-roast",
            "name": "Sunday Roast Chicken",
            "localName": "Sunday roast",
            "category": "main",
            "description": "Roast chicken with gravy, roast potatoes, and seasonal vegetables.",
            "wiki": "Sunday_roast",
            "labels": ["contains-meat"],
            "ingredients": [
                ("whole chicken", 1500, "g"),
                ("potatoes", 800, "g"),
                ("carrots", 400, "g"),
                ("chicken stock", 300, "ml"),
            ],
            "steps": [
                "1. Season the chicken and roast until the juices run clear.",
                "2. Parboil and roast potatoes in hot fat until crisp.",
                "3. Make gravy from the pan juices and serve with vegetables.",
            ],
        },
        {
            "id": "scones",
            "name": "Cream Scones",
            "localName": "Scones",
            "category": "dessert",
            "description": "Light tea-time scones split and filled with jam and thick cream.",
            "wiki": "Scone",
            "labels": ["vegetarian"],
            "ingredients": [
                ("flour", 350, "g"),
                ("butter", 80, "g"),
                ("milk", 150, "ml"),
                ("baking powder", 15, "g"),
            ],
            "steps": [
                "1. Rub butter into flour and baking powder, then mix in milk to a soft dough.",
                "2. Pat out, cut rounds, and bake hot until risen and golden.",
                "3. Cool slightly and serve with jam and clotted or whipped cream.",
            ],
        },
    ],
    "pl": [
        {
            "id": "bigos",
            "name": "Hunter's Stew",
            "localName": "Bigos",
            "category": "main",
            "description": "Long-simmered sauerkraut and fresh cabbage with assorted meats and sausage.",
            "wiki": "Bigos",
            "labels": ["contains-meat"],
            "ingredients": [
                ("sauerkraut", 500, "g"),
                ("fresh cabbage", 300, "g"),
                ("smoked sausage", 250, "g"),
                ("pork shoulder", 400, "g"),
            ],
            "steps": [
                "1. Brown meats and sausage, then add onion.",
                "2. Stir in sauerkraut, cabbage, and a little stock or red wine.",
                "3. Simmer slowly until mellow and richly flavoured; reheat even better the next day.",
            ],
        },
        {
            "id": "golabki",
            "name": "Stuffed Cabbage Rolls",
            "localName": "Gołąbki",
            "category": "main",
            "description": "Cabbage leaves filled with rice and meat, baked in tomato sauce.",
            "wiki": "Gołąbki",
            "labels": ["contains-meat"],
            "ingredients": [
                ("cabbage", 1, "piece"),
                ("minced pork and beef", 500, "g"),
                ("rice", 120, "g"),
                ("tomato passata", 400, "ml"),
            ],
            "steps": [
                "1. Blanch cabbage leaves and mix meat with partly cooked rice.",
                "2. Roll fillings into leaves and nestle in a baking dish.",
                "3. Cover with tomato sauce and bake until tender.",
            ],
        },
        {
            "id": "sernik",
            "name": "Polish Cheesecake",
            "localName": "Sernik",
            "category": "dessert",
            "description": "Baked cheesecake of twaróg-style cheese, often on a crumbly base.",
            "wiki": "Sernik",
            "labels": ["vegetarian"],
            "ingredients": [
                ("twaróg or farmer cheese", 500, "g"),
                ("eggs", 3, "pieces"),
                ("sugar", 150, "g"),
                ("butter", 100, "g"),
            ],
            "steps": [
                "1. Cream cheese with sugar, butter, and egg yolks until smooth.",
                "2. Fold in whipped whites and pour onto a simple base.",
                "3. Bake gently until set and lightly golden; chill before slicing.",
            ],
        },
    ],
    "ke": [
        {
            "id": "githeri",
            "name": "Githeri",
            "localName": "Githeri",
            "category": "main",
            "description": "One-pot maize-and-bean stew simmered with onion, tomato, and spices.",
            "wiki": "Githeri",
            "labels": ["vegetarian", "vegan"],
            "ingredients": [
                ("cooked maize kernels", 400, "g"),
                ("cooked beans", 400, "g"),
                ("onion", 1, "piece"),
                ("tomatoes", 2, "pieces"),
            ],
            "steps": [
                "1. Soften onion in oil, then add tomatoes until saucy.",
                "2. Stir in maize and beans with a splash of water or stock.",
                "3. Simmer until thick and well seasoned; serve with greens if you like.",
            ],
        },
        {
            "id": "chapati-ke",
            "name": "Kenyan Chapati",
            "localName": "Chapati",
            "category": "side",
            "description": "Soft, flaky East African flatbreads enriched with oil and cooked on a hot pan.",
            "wiki": "Chapati",
            "labels": ["vegetarian", "vegan"],
            "ingredients": [
                ("flour", 400, "g"),
                ("warm water", 220, "ml"),
                ("oil", 60, "ml"),
                ("salt", 5, "g"),
            ],
            "steps": [
                "1. Knead a soft dough with flour, salt, water, and oil; rest 30 minutes.",
                "2. Roll, oil, coil, and roll again for flaky layers.",
                "3. Cook on a hot dry pan until spotted brown on both sides.",
            ],
        },
        {
            "id": "irio",
            "name": "Irio Mash",
            "localName": "Irio",
            "category": "side",
            "description": "Kikuyu mash of potatoes, maize, peas, and greens pounded together.",
            "wiki": "Irio",
            "labels": ["vegetarian", "vegan"],
            "ingredients": [
                ("potatoes", 600, "g"),
                ("maize kernels", 200, "g"),
                ("green peas", 150, "g"),
                ("spinach", 100, "g"),
            ],
            "steps": [
                "1. Boil potatoes with maize and peas until soft.",
                "2. Add chopped greens for the last minutes.",
                "3. Drain and mash roughly with salt and a little oil or butter.",
            ],
        },
    ],
}

NEW_SHOPS: dict[str, list[dict]] = {
    "bg": [
        {
            "id": "balkan-shop-ams",
            "name": "Balkan / Eastern European grocer",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Sirene, yogurt, peppers, and Balkan spices",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Balkan%20supermarkt%20Amsterdam",
        }
    ],
    "es": [
        {
            "id": "spanish-deli-ams",
            "name": "Spanish deli / tapas shop",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Jamón, olive oil, smoked paprika, and sherry vinegar",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Spaanse%20delicatessen%20Amsterdam",
        }
    ],
    "gr": [
        {
            "id": "greek-deli-ams",
            "name": "Greek deli",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Feta, filo, olives, and oregano",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Griekse%20delicatessen%20Amsterdam",
        }
    ],
    "et": [
        {
            "id": "ethiopian-shop-denhaag",
            "name": "Ethiopian / Eritrean grocer",
            "city": "Den Haag",
            "address": "Den Haag",
            "specialty": "Teff flour, berbere, niter kibbeh, and coffee",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Ethiopische%20winkel%20Den%20Haag",
        }
    ],
    "sn": [
        {
            "id": "west-african-shop-ams",
            "name": "West African grocer",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Broken rice, palm oil, dried fish, and peanut paste",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=West%20Afrikaanse%20supermarkt%20Amsterdam",
        }
    ],
    "za": [
        {
            "id": "south-african-shop-ams",
            "name": "South African shop",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Boerewors spices, Mrs Ball's chutney, and braai staples",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Zuid-Afrikaanse%20winkel%20Amsterdam",
        }
    ],
    "ke": [
        {
            "id": "african-taste-ke",
            "name": "African Taste",
            "city": "Netherlands",
            "address": "Online / Netherlands",
            "specialty": "Maize flour, Royco mchuzi mix, and East African pantry goods",
            "website": "https://africantaste.eu/",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=African%20Taste%20Nederland",
            "notes": "Useful for ugali flour and Kenyan stew seasonings.",
        },
        {
            "id": "africa-products-ke",
            "name": "Africa Products Shop",
            "city": "Netherlands",
            "address": "Online / Netherlands",
            "specialty": "Jogoo maize flour and other Kenyan dry goods",
            "website": "https://africaproducts.nl/",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Africa%20Products%20Nederland",
        },
        {
            "id": "kenyan-delicacies-denhaag",
            "name": "Kenyan Delicacies",
            "city": "Den Haag",
            "address": "Den Haag",
            "specialty": "Kenyan restaurant pantry staples, spices, and tea",
            "website": "https://www.kenyandelicacies.com/",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Kenyan%20Delicacies%20Den%20Haag",
        },
    ],
    "pe": [
        {
            "id": "latin-peruvian-ams",
            "name": "Latin / Peruvian grocer",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Aji amarillo, quinoa, corn, and Andean pantry goods",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Peruaanse%20winkel%20Amsterdam",
        }
    ],
    "br": [
        {
            "id": "brazilian-shop-ams",
            "name": "Brazilian shop",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Cassava flour, dendê oil, guaraná, and beans",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Braziliaanse%20winkel%20Amsterdam",
        }
    ],
    "jm": [
        {
            "id": "caribbean-shop-ams",
            "name": "Caribbean grocer",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Jerk seasoning, scotch bonnet, callaloo, and spices",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Caribische%20supermarkt%20Amsterdam",
        }
    ],
    "fr": [
        {
            "id": "french-deli-leiden",
            "name": "French deli / fromagerie",
            "city": "Leiden",
            "address": "Leiden",
            "specialty": "Cheese, charcuterie, Dijon mustard, and pastry butter",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Franse%20delicatessen%20Leiden",
        }
    ],
    "de": [
        {
            "id": "german-deli-ams",
            "name": "German deli",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Mustards, sausages, sauerkraut, and baking goods",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Duitse%20delicatessen%20Amsterdam",
        }
    ],
    "pt": [
        {
            "id": "portuguese-shop-ams",
            "name": "Portuguese grocer",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Bacalhau, peri-peri, olive oil, and pastries",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Portugese%20winkel%20Amsterdam",
        }
    ],
    "ar": [
        {
            "id": "argentinian-shop-ams",
            "name": "Argentinian / Latin grill shop",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Chimichurri ingredients, dulce de leche, and mate",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Argentijnse%20winkel%20Amsterdam",
        }
    ],
    "ng": [
        {
            "id": "nigerian-shop-ams",
            "name": "Nigerian / West African grocer",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Egusi, palm oil, stockfish, and pounded yam flour",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Nigeriaanse%20supermarkt%20Amsterdam",
        }
    ],
    "eg": [
        {
            "id": "egyptian-shop-ams",
            "name": "Egyptian / Middle Eastern grocer",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Fava beans, molokhia, spices, and flatbreads",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Egyptische%20winkel%20Amsterdam",
        }
    ],
    "ph": [
        {
            "id": "filipino-shop-ams",
            "name": "Filipino store",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Sinigang mix, banana ketchup, rice noodles, and vinegar",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Filipijnse%20winkel%20Amsterdam",
        }
    ],
    "gb": [
        {
            "id": "british-shop-ams",
            "name": "British specialty shop",
            "city": "Amsterdam",
            "address": "Amsterdam",
            "specialty": "Cheddar, marmite, custard, and baking staples",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=British%20shop%20Amsterdam",
        }
    ],
    "pl": [
        {
            "id": "polish-shop-leiden",
            "name": "Polish supermarket",
            "city": "Leiden",
            "address": "Leiden",
            "specialty": "Pierogi fillings, kielbasa, sauerkraut, and twaróg",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Poolse%20supermarkt%20Leiden",
        }
    ],
    "nl": [
        {
            "id": "dutch-market-leiden",
            "name": "Leiden market / butchers",
            "city": "Leiden",
            "address": "Leiden",
            "specialty": "Fresh kale, rookworst, and baking goods for stamppot nights",
            "mapsUrl": "https://www.google.com/maps/search/?api=1&query=markt%20Leiden",
        }
    ],
}


def uses_content_helpers(text: str) -> bool:
    return "from \"./content-helpers\"" in text or "from './content-helpers'" in text


def uses_local_r(text: str) -> bool:
    return bool(re.search(r"^const r = \(", text, re.M))


def fmt_helper_recipe(rec: dict) -> str:
    ings = ",\n".join(
        f'          {{ name: "{n}", quantity: {q}, unit: "{u}" }}'
        for n, q, u in rec["ingredients"]
    )
    labels = ", ".join(f'"{x}"' for x in rec["labels"])
    desc = rec["description"].replace('"', '\\"')
    wiki = rec["wiki"]
    return f"""      r(
        "{rec["id"]}",
        "{rec["name"]}",
        "{rec["localName"]}",
        "{rec["category"]}",
        [
{ings},
        ],
        {{
          description:
            "{desc}",
          dietaryLabels: [{labels}],
          sourceUrl: "https://en.wikipedia.org/wiki/{wiki}",
        }},
      )"""


def fmt_object_recipe(rec: dict) -> str:
    ings = ",\n".join(
        f'          {{ name: "{n}", quantity: {q}, unit: "{u}" }}'
        for n, q, u in rec["ingredients"]
    )
    labels = ", ".join(f'"{x}"' for x in rec["labels"])
    steps = ",\n".join(f'          "{s}"' for s in rec["steps"])
    desc = rec["description"].replace('"', '\\"')
    local = rec["localName"].replace('"', '\\"')
    wiki = rec["wiki"]
    return f"""      {{
        id: "{rec["id"]}",
        name: "{rec["name"]}",
        localName: "{local}",
        description:
          "{desc}",
        category: "{rec["category"]}",
        servings: 4,
        prepMinutes: 20,
        cookMinutes: 35,
        difficulty: "medium",
        dietaryLabels: [{labels}],
        ingredients: [
{ings},
        ],
        steps: [
{steps},
        ],
        sourceUrl: "https://en.wikipedia.org/wiki/{wiki}",
      }}"""


def fmt_local_r_recipe(rec: dict) -> str:
    # es-style: r(id, name, localName, description, category, ingredients, steps)
    ings = ",\n".join(
        f'        {{ name: "{n}", quantity: {q}, unit: "{u}" }}'
        for n, q, u in rec["ingredients"]
    )
    steps = ",\n".join(f'        "{s}"' for s in rec["steps"])
    desc = rec["description"].replace('"', '\\"')
    local = rec["localName"].replace('"', '\\"')
    return f"""      r(
        "{rec["id"]}",
        "{rec["name"]}",
        "{local}",
        "{desc}",
        "{rec["category"]}",
        [
{ings},
        ],
        [
{steps},
        ],
      )"""


def insert_more_recipes(text: str, block: str) -> str:
    if "moreRecipes:" in text:
        # Replace existing moreRecipes array content by appending before closing of moreRecipes if short
        # For simplicity: if already has moreRecipes with 3+, skip
        return text
    # Insert before the closing of menu object: after drink section, before `  },\n  status`
    pattern = re.compile(
        r"(    drink:[\s\S]*?\n    \},?\n)(  \},\n  status:)",
        re.M,
    )
    m = pattern.search(text)
    if m:
        insert = m.group(1)
        if not insert.rstrip().endswith(","):
            # drink: drink(...) form may not end with },
            pass
        # Ensure comma after drink line/block
        drink_block = m.group(1).rstrip()
        if not drink_block.endswith(","):
            drink_block += ","
        replacement = f"{drink_block}\n    moreRecipes: [\n{block},\n    ],\n{m.group(2)}"
        return text[: m.start()] + replacement + text[m.end() :]

    # helper drink() form without trailing object close on same pattern
    pattern2 = re.compile(
        r"(    drink:\s*drink\([\s\S]*?\n    \),?\n)(  \},\n  status:)",
        re.M,
    )
    m2 = pattern2.search(text)
    if m2:
        drink_block = m2.group(1).rstrip()
        if not drink_block.endswith(","):
            drink_block += ","
        replacement = f"{drink_block}\n    moreRecipes: [\n{block},\n    ],\n{m2.group(2)}"
        return text[: m2.start()] + replacement + text[m2.end() :]

    raise RuntimeError("Could not find insertion point")


def patch_kenya_shops(text: str) -> str:
    # Remove invalid specialtyShops from ke.ts — shops live in specialtyShops.ts
    return re.sub(
        r"\n  specialtyShops: \[[\s\S]*?\],\n  menu:",
        "\n  menu:",
        text,
        count=1,
    )


def fmt_shop_ts(code: str, shops: list[dict]) -> str:
    parts = []
    for s in shops:
        website = (
            f'\n      website: "{s["website"]}",' if s.get("website") else ""
        )
        notes = f'\n      notes: "{s["notes"]}",' if s.get("notes") else ""
        parts.append(
            f"""    {{
      id: "{s["id"]}",
      name: "{s["name"]}",
      city: "{s["city"]}",
      address: "{s["address"]}",
      specialty: "{s["specialty"]}",{website}
      mapsUrl: "{s["mapsUrl"]}",{notes}
    }}"""
        )
    joined = ",\n".join(parts)
    return f"  {code}: [\n{joined},\n  ],\n"


def main() -> None:
    updated = []
    for code, recipes in EXPANSIONS.items():
        path = COUNTRIES / f"{code}.ts"
        text = path.read_text(encoding="utf-8")
        if code == "ke":
            text = patch_kenya_shops(text)
            # also fix type to AuthoredCountry if needed
            text = text.replace(
                'import type { Country } from "@/types/content";\n\nexport const keCountry: Country =',
                'import type { AuthoredCountry } from "@/types/content";\n\nexport const keCountry: AuthoredCountry =',
            )

        if "moreRecipes:" in text:
            # Already expanded (ge/th/etc may be in map by mistake)
            if code == "ke":
                path.write_text(text, encoding="utf-8")
                updated.append(f"{code}:shops-fixed")
            else:
                updated.append(f"{code}:skipped-has-more")
            continue

        if uses_content_helpers(text):
            block = ",\n".join(fmt_helper_recipe(r) for r in recipes)
        elif uses_local_r(text):
            block = ",\n".join(fmt_local_r_recipe(r) for r in recipes)
        else:
            block = ",\n".join(fmt_object_recipe(r) for r in recipes)

        try:
            new_text = insert_more_recipes(text, block)
        except RuntimeError as exc:
            updated.append(f"{code}:FAILED:{exc}")
            continue

        # For helper recipes with sourceUrl in options - content-helpers may not pass sourceUrl!
        # Check content-helpers - it doesn't include sourceUrl. Need object style for sourceUrl
        # or extend helpers. Safer to use object style always when we want sourceUrl,
        # OR drop sourceUrl from helper options and rely on enrich later.

        path.write_text(new_text, encoding="utf-8")
        updated.append(f"{code}:expanded")

    # Patch specialty shops file
    shops_text = SHOPS.read_text(encoding="utf-8")
    for code, shops in NEW_SHOPS.items():
        if re.search(rf"^\s*{code}:\s*\[", shops_text, re.M):
            continue
        # Insert before closing `};` of specialtyShopsByCountry
        entry = fmt_shop_ts(code, shops)
        shops_text = shops_text.replace(
            "};\n\nexport function specialtyShopsFor",
            f"{entry}}};\n\nexport function specialtyShopsFor",
        )
    SHOPS.write_text(shops_text, encoding="utf-8")

    print("\n".join(updated))
    print(f"Shop keys now include: {sorted(NEW_SHOPS)}")


if __name__ == "__main__":
    main()
