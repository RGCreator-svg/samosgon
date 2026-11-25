// ============================================================
//  КАТАЛОГ: магазин, материалы, рецепты, товары рынка
// ============================================================

export type Quality = 1 | 2 | 3;

export interface ShopItem {
  id: string;
  section: "column" | "distill" | "brew" | "build" | "provision";
  name: string;
  desc: string;
  price: number;
  quality?: Quality;
  part?: boolean;            // узел колонны
  storageBonus?: number;     // +слотов склада
  storageMultiplier?: number;
  effect?: { purity?: number; distillPower?: number; brewQuality?: number; aging?: number };
  material?: string;         // для провизии: что положить на склад
  qty?: number;
}

export interface Product { id: string; name: string; basePrice: number; }
export interface Recipe {
  id: string;
  name: string;
  kind: string;              // mash | fruit | veg | beer | mead | cider | tinct
  days: number;
  liters: number;
  inputs: Record<string, number>;
  output: string;
  needs?: string;            // mead | cider | tinct | brewery
}

// ------------------------------------------------------------
// МАГАЗИН «У Тыка с доставкой»
// ------------------------------------------------------------

export const SHOP: ShopItem[] = [
  // ---------- Колонна: 4 узла, без всех — ректификация не работает ----------
  { id: "tsarga-n",       section: "column", name: "Царга нержавейка ✦",      desc: "База колонны, честные 40 см.",           price: 6000,  quality: 1, part: true, effect: { purity: 0 } },
  { id: "tsarga-copper",  section: "column", name: "Царга медовая ✦✦",        desc: "Медь связывает серу — мягче и чище.",    price: 12000, quality: 2, part: true, effect: { purity: 1 } },
  { id: "tsarga-pro",     section: "column", name: "Царга PRO ✦✦✦",           desc: "Зеркальная полировка, заводской допуск.", price: 22000, quality: 3, part: true, effect: { purity: 2 } },
  { id: "packing-rpn",    section: "column", name: "Насадка РПН ✦",           desc: "Регулярная проволочная насадка.",        price: 4500,  quality: 1, part: true, effect: { purity: 0 } },
  { id: "packing-sel",    section: "column", name: "Насадка Селиваненко ✦✦",  desc: "Редкая штучка, курс на «У Тыка».",       price: 9000,  quality: 2, part: true, effect: { purity: 1 } },
  { id: "packing-pro",    section: "column", name: "Насадка Панченкова PRO ✦✦✦", desc: "Максимум теоретических тарелок.",     price: 16000, quality: 3, part: true, effect: { purity: 2 } },
  { id: "dephl-simple",   section: "column", name: "Дефлегматор простой ✦",   desc: "Водопроводный. Работает, и ладно.",      price: 7000,  quality: 1, part: true, effect: { purity: 0 } },
  { id: "dephl-ice",      section: "column", name: "Дефлегматор «Ледяной» ✦✦", desc: "Стабильный отбор даже жарким днём.",    price: 13000, quality: 2, part: true, effect: { purity: 1 } },
  { id: "dephl-pro",      section: "column", name: "Дефлегматор PRO ✦✦✦",     desc: "С термопарой и плавной регулировкой.",   price: 24000, quality: 3, part: true, effect: { purity: 2 } },
  { id: "node-simple",    section: "column", name: "Узел отбора простой ✦",   desc: "Краник и честное слово.",                price: 5000,  quality: 1, part: true, effect: { purity: 0 } },
  { id: "node-precise",   section: "column", name: "Узел отбора «Игла» ✦✦",   desc: "Миллилитры контролируешь ты.",           price: 9000,  quality: 2, part: true, effect: { purity: 1 } },
  { id: "node-pro",       section: "column", name: "Узел отбора PRO ✦✦✦",     desc: "Электронный отбор по капле.",            price: 18000, quality: 3, part: true, effect: { purity: 2 } },

  // ---------- Перегонка ----------
  { id: "cube-20",        section: "distill", name: "Куб 20 л ✦",             desc: "Скромно, но начало.",                    price: 8000,  quality: 1, effect: { distillPower: 1 } },
  { id: "cube-37",        section: "distill", name: "Куб 37 л с парогенератором ✦✦", desc: "Пар сам греет — руки целы.",       price: 15000, quality: 2, effect: { distillPower: 2 } },
  { id: "cube-50",        section: "distill", name: "Куб 50 л PRO ✦✦✦",       desc: "Для серьёзных партий.",                  price: 26000, quality: 3, effect: { distillPower: 3 } },
  { id: "dimka-2",        section: "distill", name: "Аппарат «Димка 2.0» ✦",  desc: "Классика: головы, хвосты, ароматы.",     price: 12000, quality: 1, effect: { distillPower: 1 } },
  { id: "apparatus-pure", section: "distill", name: "Аппарат «Чистый спирт» ✦✦", desc: "Тарельчатый, выход побольше.",        price: 22000, quality: 2, effect: { distillPower: 2 } },
  { id: "tyk-pro",        section: "distill", name: "Аппарат «Дядюшка Тык» PRO ✦✦✦", desc: "Венчик Тыка лично тестировал.",  price: 40000, quality: 3, effect: { distillPower: 4 } },
  { id: "thermo-basic",   section: "distill", name: "Термометр биметалл ✦",   desc: "Стрелочка дрожит, но показывает.",       price: 3000,  quality: 1 },
  { id: "thermo-digital", section: "distill", name: "Термометр цифровой ✦✦",  desc: "Точность до десятых градуса.",           price: 6000,  quality: 2, effect: { distillPower: 1 } },
  { id: "auto-samovar",   section: "distill", name: "Автоматика «Самовар» ✦", desc: "Следит за головами сама.",               price: 8000,  quality: 1, effect: { distillPower: 1 } },
  { id: "auto-master",    section: "distill", name: "Автоматика «Хозяин» ✦✦", desc: "Отбери головы и спи спокойно.",          price: 15000, quality: 2, effect: { distillPower: 2 } },
  { id: "barrel-oak",     section: "distill", name: "Бочка дубовая ✦",        desc: "Выдержка: дистиллят становится благороднее.", price: 10000, quality: 1, effect: { aging: 1 } },
  { id: "barrel-france",  section: "distill", name: "Бочка французский дуб ✦✦", desc: "Выдержка топ-уровня, коньячный вайб.", price: 20000, quality: 2, effect: { aging: 2 } },

  // ---------- Пивоварня ----------
  { id: "brew-kettle",    section: "brew", name: "Кот пивоваренный ✦",        desc: "Открывает варку пива. Кастрюля с амбициями.", price: 9000,  quality: 1, effect: { brewQuality: 1 } },
  { id: "brew-kettle-2",  section: "brew", name: "Кот закалённый ✦✦",         desc: "Не пригорает солод — пиво чище.",       price: 16000, quality: 2, effect: { brewQuality: 2 } },
  { id: "brew-kettle-pro",section: "brew", name: "Кот нержавеющий PRO ✦✦✦",   desc: "Паровая рубашка, точный нагрев.",       price: 28000, quality: 3, effect: { brewQuality: 3 } },
  { id: "chiller-ice",    section: "brew", name: "Охладитель «Ванна со льдом» ✦", desc: "Дедовский, зато честный.",          price: 5000,  quality: 1, effect: { brewQuality: 1 } },
  { id: "chiller-coil",   section: "brew", name: "Чиллер спиральный ✦✦",      desc: "Вода бежит — сусло остывает.",          price: 10000, quality: 2, effect: { brewQuality: 2 } },
  { id: "chiller-plate",  section: "brew", name: "Пластинчатый теплообменник ✦✦✦", desc: "Сусло холоднее совести бывалого.", price: 19000, quality: 3, effect: { brewQuality: 3 } },
  { id: "fermenter-basic",section: "brew", name: "Ферментер: ведро ✦",        desc: "Просто, дёшево, пахнет на всю кухню.",  price: 4000,  quality: 1, effect: { brewQuality: 1 } },
  { id: "fermenter-seal", section: "brew", name: "Ферментер с гидрозатвором ✦✦", desc: "Гидрозатвор — уже почти винодел.",  price: 9000,  quality: 2, effect: { brewQuality: 2 } },
  { id: "fermenter-pro",  section: "brew", name: "Ферментер конический PRO ✦✦✦", desc: "Слив осадка краником. Люкс.",       price: 18000, quality: 3, effect: { brewQuality: 3 } },

  // ---------- Стройка склада ----------
  { id: "shelf",     section: "build", name: "Стеллаж",              desc: "+8 слотов на складе.",                        price: 2500,  storageBonus: 8 },
  { id: "shed",      section: "build", name: "Сарай",                desc: "+20 слотов. Пахнет досками и хмелем.",        price: 7000,  storageBonus: 20 },
  { id: "granary",   section: "build", name: "Амбар",                desc: "+45 слотов. Солидно.",                        price: 15000, storageBonus: 45 },
  { id: "logistics", section: "build", name: "Логистический центр",  desc: "Вместимость всего склада ×2.",                price: 30000, storageMultiplier: 2 },

  // ---------- Провизия (сразу на склад) ----------
  { id: "prov-sugar",    section: "provision", name: "Сахар (10 кг)",        desc: "База любой браги.",                 price: 600,  material: "sugar",       qty: 10 },
  { id: "prov-yeast",    section: "provision", name: "Дрожжи (5 пачек)",     desc: "Хлебопекарные, но справятся.",      price: 750,  material: "yeast",       qty: 5 },
  { id: "prov-honey",    section: "provision", name: "Мёд (5 кг)",           desc: "Пока своя пасека не подоспела.",    price: 2000, material: "honey",       qty: 5 },
  { id: "prov-fruit",    section: "provision", name: "Фрукты (10 кг)",       desc: "Для наливок и сидра.",              price: 1500, material: "fruit",       qty: 10 },
  { id: "prov-veg",      section: "provision", name: "Овощи (10 кг)",        desc: "Морковка Тыка одобряет.",           price: 1000, material: "veg",         qty: 10 },
  { id: "prov-herbs",    section: "provision", name: "Травяной сбор (5 шт.)", desc: "Для настоек.",                     price: 1250, material: "herbs",       qty: 5 },
  { id: "prov-malt",     section: "provision", name: "Солод (10 кг)",        desc: "Для пива.",                         price: 1200, material: "malt",        qty: 10 },
  { id: "prov-hops",     section: "provision", name: "Хмель «Каскад» (5 шт.)", desc: "Цитрусовый аромат.",              price: 2500, material: "hops",        qty: 5 },
  { id: "prov-us05",     section: "provision", name: "Дрожжи US-05 (5 шт.)", desc: "Американский эль мечтает о них.",   price: 2250, material: "yeast_us05",  qty: 5 },
  { id: "prov-lager-y",  section: "provision", name: "Дрожжи лагерные (3 шт.)", desc: "Редкость. Для лагера.",          price: 3600, material: "yeast_lager", qty: 3 },
  { id: "prov-hops-mun", section: "provision", name: "Хмель «Халлертау» (3 шт.)", desc: "Для лагера.",                  price: 2700, material: "hops_munich", qty: 3 },
];

// ------------------------------------------------------------
// МАТЕРИАЛЫ (словарь: id → название и цена за единицу)
// ------------------------------------------------------------

export const MATERIALS: Record<string, { name: string; price: number }> = {
  sugar:       { name: "Сахар (кг)",               price: 60 },
  yeast:       { name: "Дрожжи",                   price: 150 },
  honey:       { name: "Мёд (кг)",                 price: 400 },
  fruit:       { name: "Фрукты (кг)",              price: 150 },
  veg:         { name: "Овощи (кг)",               price: 100 },
  herbs:       { name: "Травяной сбор",            price: 250 },
  malt:        { name: "Солод (кг)",               price: 120 },
  hops:        { name: "Хмель «Каскад»",           price: 500 },
  hops_munich: { name: "Хмель «Халлертау»",        price: 900 },
  yeast_us05:  { name: "Дрожжи US-05",             price: 450 },
  yeast_lager: { name: "Дрожжи лагерные",          price: 1200 },
  samogon:     { name: "Дистиллят (л)",            price: 350 },
  "any-raw":   { name: "Дистиллят-сырец (л)",      price: 0 },
};

// ------------------------------------------------------------
// ТОВАРЫ РЫНКА
// ------------------------------------------------------------

export const PRODUCTS: Product[] = [
  { id: "raw-sugar", name: "Сырец сахарный",        basePrice: 350 },
  { id: "raw-fruit", name: "Сырец фруктовый",       basePrice: 420 },
  { id: "raw-veg",   name: "Сырец овощной",         basePrice: 320 },
  { id: "rectified", name: "Ректификат 96,6",       basePrice: 550 },
  { id: "aged",      name: "Выдержанный дистиллят", basePrice: 900 },
  { id: "tincture",  name: "Настойка",              basePrice: 700 },
  { id: "ale",       name: "Эль",                   basePrice: 220 },
  { id: "lager",     name: "Лагер",                 basePrice: 300 },
  { id: "mead",      name: "Медовуха",              basePrice: 450 },
  { id: "cider",     name: "Сидр",                  basePrice: 250 },
];

// ------------------------------------------------------------
// РЕЦЕПТЫ (партии на вкладке «Производство»)
// ------------------------------------------------------------

// Быстрый доступ к товару по id (PRODUCTS — массив, для поиска по id используй эту карту)
export const PRODUCTS_BY_ID: Record<string, Product> = {};
PRODUCTS.forEach((p) => { PRODUCTS_BY_ID[p.id] = p; });

// Дистиллят-сырец любого вида: суммируется из raw-sugar / raw-fruit / raw-veg
export const ANY_RAW_IDS = ["raw-sugar", "raw-fruit", "raw-veg"];

export const RECIPES: Recipe[] = [
  { id: "braga-sugar", name: "Сахарная брага",  kind: "mash",  days: 5,  liters: 25, inputs: { sugar: 10, yeast: 2 },                       output: "raw-sugar" },
  { id: "braga-fruit", name: "Фруктовая брага", kind: "fruit", days: 6,  liters: 22, inputs: { fruit: 15, sugar: 5, yeast: 2 },              output: "raw-fruit" },
  { id: "braga-veg",   name: "Овощная брага",   kind: "veg",   days: 6,  liters: 18, inputs: { veg: 15, sugar: 5, yeast: 2 },               output: "raw-veg" },
  { id: "beer-ale",    name: "Эль",             kind: "beer",  days: 7,  liters: 20, inputs: { malt: 8, hops: 2, yeast_us05: 1 },           output: "ale",  needs: "brewery" },
  { id: "beer-lager",  name: "Лагер",           kind: "beer",  days: 10, liters: 20, inputs: { malt: 8, hops_munich: 2, yeast_lager: 1 },   output: "lager", needs: "brewery" },
  { id: "mead",        name: "Медовуха",        kind: "mead",  days: 10, liters: 15, inputs: { honey: 8, yeast: 2 },                        output: "mead",  needs: "mead" },
  { id: "cider",       name: "Сидр",            kind: "cider", days: 7,  liters: 18, inputs: { fruit: 15 },                                 output: "cider", needs: "cider" },
  { id: "tincture",    name: "Травяная настойка", kind: "tinct", days: 3, liters: 3, inputs: { "any-raw": 2, herbs: 3 },                    output: "tincture", needs: "tinct" },
];
