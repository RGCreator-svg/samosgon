// ============================================================
//  ДЕРЕВО УМЕНИЙ — расширение v2
//  29 старых узлов + 18 новых + «Книга Тыка» = 48 узлов
//  Экономика: 1 → 2 → 4 → 6
// ============================================================

export interface SkillNode {
  id: string;
  name: string;
  branch: string;
  desc: string;
  cost: number;
  requires: string[];
  requiresAny?: string[];   // достаточно ОДНОГО из перечисленных
  icon: string;
  conflicts?: string[];
  hidden?: boolean;         // узел не виден, пока не раскрыт
  unlockHint?: string;
  x: number;
  y: number;
}

export const BRANCH_COLORS: Record<string, string> = {
  start:   '#cfa060',
  dist:    '#e0a34a',
  rect:    '#5aa7e0',
  comm:    '#e0c04a',
  farm:    '#7ec850',
  herbs:   '#a8d060',
  orchard: '#e07070',
  apiary:  '#f0c040',
  oak:     '#8b5a2b',   // Бочка и выдержка
  soc:     '#607d8b',   // Город и события
  hands:   '#d32f2f',   // Рука мастера
};

export const BRANCH_NAMES: Record<string, string> = {
  start:   'Заводской двор',
  dist:    'Дистилляция',
  rect:    'Ректификация',
  comm:    'Коммерция',
  farm:    'Огород',
  herbs:   'Специи и травы',
  orchard: 'Фруктовый сад',
  apiary:  'Пасека',
  oak:     'Бочка и выдержка',
  soc:     'Город и события',
  hands:   'Рука мастера',
};

export const SKILLS: SkillNode[] = [
  { id: 'start', name: 'Заводской двор', branch: 'start', desc: 'Здесь всё начинается. Дядюшка Тык одобряет.', cost: 0, requires: [], icon: 'pumpkin', x: 800, y: 520 },

  // --- Дистилляция (вверх) ---
  { id: 'd1', name: 'Соложение', branch: 'dist', desc: '+5% к выходу дистиллята.', cost: 1, requires: ['start'], icon: 'grain', x: 800, y: 400 },
  { id: 'd2', name: 'Двойная дробная перегонка', branch: 'dist', desc: '+10% к выходу, +5% к аромату.', cost: 2, requires: ['d1'], icon: 'drop', x: 800, y: 280 },
  { id: 'd3', name: 'Дистиллят с душой', branch: 'dist', desc: 'КЕЙСТОУН: +25% к аромату, +10% к цене. Несовместим с «Абсолютом» и «Редкими сортами».', cost: 4, requires: ['d2'], icon: 'star', x: 800, y: 160, conflicts: ['r3', 'o3'] },
  { id: 'd4', name: 'Секрет дядюшки Тыка', branch: 'dist', desc: '+15% к аромату, +5% к выходу.', cost: 6, requires: ['d3'], icon: 'flame', x: 680, y: 70 },

  // --- Ректификация (влево-вниз) ---
  { id: 'r1', name: 'Узлы отбора', branch: 'rect', desc: '+10% к чистоте.', cost: 1, requires: ['start'], icon: 'flask', x: 660, y: 610 },
  { id: 'r2', name: 'Тарельчатая колонна', branch: 'rect', desc: '+15% к чистоте ректификата.', cost: 2, requires: ['r1'], icon: 'gear', x: 540, y: 700 },
  { id: 'r3', name: 'Абсолют', branch: 'rect', desc: 'КЕЙСТОУН: +10% к чистоте, головы смягчаются на 3%. Несовместим с «Дистиллятом с душой».', cost: 4, requires: ['r2'], icon: 'crystal', x: 420, y: 790, conflicts: ['d3'] },
  { id: 'r4', name: '96,6 без вопросов', branch: 'rect', desc: '+20% к чистоте и цене. Несовместим с «Тыковкой».', cost: 6, requires: ['r3'], icon: 'crystal', x: 300, y: 870, conflicts: ['bk4'] },

  // --- Коммерция (вправо-вниз) ---
  { id: 'c1', name: 'Торг', branch: 'comm', desc: '+10% к цене продажи.', cost: 1, requires: ['start'], icon: 'coin', x: 940, y: 610 },
  { id: 'c2', name: 'Связи', branch: 'comm', desc: '+10% к цене, чаще выгодные события.', cost: 2, requires: ['c1'], icon: 'handshake', x: 1060, y: 700 },
  { id: 'c3', name: 'Рука рынка', branch: 'comm', desc: 'КЕЙСТОУН: +15% к цене, рынок стабильнее.', cost: 4, requires: ['c2'], icon: 'shop', x: 1180, y: 790 },
  { id: 'c4', name: 'Сеть таверн', branch: 'comm', desc: '+20% к цене всей продукции. Требуется любой кейстоун производства.', cost: 6, requires: ['c3'], requiresAny: ['d3', 'r3', 'o3', 'bk4'], icon: 'shop', x: 1300, y: 880 },

  // --- Огород (влево-вверх) ---
  { id: 'f1', name: 'Огородничество', branch: 'farm', desc: '+1 кг овощей каждый день.', cost: 1, requires: ['start'], icon: 'carrot', x: 640, y: 390 },
  { id: 'f2', name: 'Теплица', branch: 'farm', desc: '+2 кг овощей в день круглый год. Требуется база трав: сидераты.', cost: 2, requires: ['f1', 'h1'], icon: 'leaf', x: 540, y: 300 },
  { id: 'f3', name: 'Компост и севооборот', branch: 'farm', desc: 'Ещё +2 кг овощей в день.', cost: 4, requires: ['f2'], icon: 'leaf', x: 440, y: 210 },
  { id: 'f4', name: 'Большая грядка', branch: 'farm', desc: 'Ещё +3 кг овощей в день.', cost: 6, requires: ['f3'], icon: 'carrot', x: 340, y: 120 },

  // --- Специи и травы (влево) ---
  { id: 'h1', name: 'Травы и специи', branch: 'herbs', desc: '+1 кг трав каждый день.', cost: 1, requires: ['start'], icon: 'leaf', x: 560, y: 480 },
  { id: 'h2', name: 'Сушка и хранение', branch: 'herbs', desc: 'Ещё +1 кг трав в день.', cost: 2, requires: ['h1'], icon: 'star', x: 440, y: 560 },
  { id: 'h3', name: 'Настойки и настои', branch: 'herbs', desc: 'Открывает рецепт травяной настойки.', cost: 4, requires: ['h2'], icon: 'flask', x: 340, y: 640 },
  { id: 'h4', name: 'Букет специй', branch: 'herbs', desc: 'Ещё +2 кг трав в день.', cost: 6, requires: ['h3'], icon: 'leaf', x: 240, y: 720 },

  // --- Фруктовый сад (вправо-вверх) ---
  { id: 'o1', name: 'Фруктовый сад', branch: 'orchard', desc: '+1 кг фруктов каждый день.', cost: 1, requires: ['start'], icon: 'barrel', x: 960, y: 390 },
  { id: 'o2', name: 'Сидр и наливки', branch: 'orchard', desc: 'Открывает рецепт сидра.', cost: 2, requires: ['o1'], icon: 'beer', x: 1060, y: 300 },
  { id: 'o3', name: 'Редкие сорта', branch: 'orchard', desc: 'КЕЙСТОУН: +1 кг фруктов и редкие вкусы. Несовместим с «Дистиллятом с душой».', cost: 4, requires: ['o2'], icon: 'star', x: 1160, y: 210, conflicts: ['d3'] },
  { id: 'o4', name: 'Ягодная аллея', branch: 'orchard', desc: 'Ещё +2 кг фруктов в день.', cost: 6, requires: ['o3'], icon: 'barrel', x: 1260, y: 120 },

  // --- Пасека (вправо) ---
  { id: 'a1', name: 'Пасека и пчёлы', branch: 'apiary', desc: '+1 кг мёда каждый день.', cost: 1, requires: ['start'], icon: 'bee', x: 1040, y: 480 },
  { id: 'a2', name: 'Дымарь и уход', branch: 'apiary', desc: 'Ещё +1 кг мёда в день, пчёлы спокойны.', cost: 2, requires: ['a1'], icon: 'gear', x: 1160, y: 560 },
  { id: 'a3', name: 'Рецепт медовухи', branch: 'apiary', desc: 'Открывает медовуху — золотая жила! Мёд придётся ещё и перегнать уметь.', cost: 4, requires: ['a2', 'd1'], icon: 'honey', x: 1260, y: 640 },
  { id: 'a4', name: 'Липовый мёд', branch: 'apiary', desc: 'Ещё +2 кг мёда в день.', cost: 6, requires: ['a3'], icon: 'honey', x: 1360, y: 720 },

  // --- Бочка и выдержка (вниз-влево) ---
  { id: 'bk1', name: 'Первая бочка', branch: 'oak', desc: 'Выдержка становится качественнее: +1 к рейтингу выдержки.', cost: 1, requires: ['start'], icon: 'barrel', x: 770, y: 650 },
  { id: 'bk2', name: 'Дубовые клёпки', branch: 'oak', desc: '+5% к цене выдержанного дистиллята.', cost: 2, requires: ['bk1'], icon: 'barrel', x: 700, y: 760 },
  { id: 'bk3', name: 'Лимузенский дуб', branch: 'oak', desc: 'Ещё +10% к цене выдержанного дистиллята.', cost: 4, requires: ['bk2'], icon: 'barrel', x: 640, y: 870 },
  { id: 'bk4', name: 'Тыковка', branch: 'oak', desc: 'КЕЙСТОУН: +40% к цене выдержанного. Характер против чистоты — несовместим с «96,6».', cost: 6, requires: ['bk3'], icon: 'pumpkin', x: 580, y: 960, conflicts: ['r4'] },

  // --- Город и события (вниз-вправо) ---
  { id: 'soc1', name: 'Репутация на рынке', branch: 'soc', desc: 'Плохие события приходят реже.', cost: 1, requires: ['start'], icon: 'coin', x: 870, y: 660 },
  { id: 'soc2', name: 'Городской совет', branch: 'soc', desc: 'Провизия в магазине дешевле на 10%.', cost: 2, requires: ['soc1'], icon: 'shop', x: 930, y: 760 },
  { id: 'soc3', name: 'Контракт с трактиром', branch: 'soc', desc: 'Редкие вкусы продаются с надбавкой ×1,3.', cost: 4, requires: ['soc2'], icon: 'handshake', x: 990, y: 870 },
  { id: 'soc4', name: 'Постоянный контракт', branch: 'soc', desc: 'КЕЙСТОУН: еженедельная стабильная премия за продукцию.', cost: 6, requires: ['soc3'], icon: 'shop', x: 1050, y: 960 },

  // --- Рука мастера (вверх-вправо) ---
  { id: 'hnd1', name: 'Чувство капли', branch: 'hands', desc: 'Зона попадания в мини-игре отсечения голов +10%.', cost: 1, requires: ['start'], icon: 'drop', x: 900, y: 430 },
  { id: 'hnd2', name: 'Тонкая настройка', branch: 'hands', desc: 'Награда за точность в мини-игре +15%.', cost: 2, requires: ['hnd1'], icon: 'drop', x: 940, y: 320 },
  { id: 'hnd3', name: 'Мастер голов', branch: 'hands', desc: 'Шанс «идеального отсечения» +5%.', cost: 4, requires: ['hnd2'], icon: 'flame', x: 980, y: 200 },
  { id: 'hnd4', name: 'Интуиция дистиллятора', branch: 'hands', desc: 'В мини-игре появляется авто-подсказка.', cost: 6, requires: ['hnd3'], icon: 'star', x: 1020, y: 80 },

  // --- Кросс-узлы (мосты) ---
  { id: 'fm1', name: 'Гончарная мастерская', branch: 'farm', desc: 'Брага в керамике бродит на 1 день быстрее.', cost: 3, requires: ['f1'], icon: 'gear', x: 620, y: 250 },
  { id: 'th1', name: 'Травяной дистиллят', branch: 'herbs', desc: 'Настойка наследует аромат дистилляции: +20% к цене настоек.', cost: 3, requires: ['h3', 'd2'], icon: 'flask', x: 700, y: 570 },
  { id: 'fh1', name: 'Фруктовая медовуха', branch: 'apiary', desc: 'Медовуха +25% к цене, рецепт «полусладкая».', cost: 4, requires: ['a3', 'o2'], icon: 'honey', x: 1210, y: 400 },
  { id: 'dz1', name: 'Дегустационный зал', branch: 'comm', desc: 'Раз в неделю редкие сорта продаются с премией ×1,5.', cost: 5, requires: ['c2', 'd3'], hidden: true, unlockHint: 'Откроется, когда изучишь «Связи» и «Дистиллят с душой».', icon: 'shop', x: 1080, y: 120 },

  // --- Книга Тыка ---
  { id: 'book', name: 'Книга дядюшки Тыка', branch: 'start', desc: 'Один раз позволяет сбросить любую ветку и вернуть её очки.', cost: 5, requires: ['start'], icon: 'star', x: 800, y: 730 },
];

// Линии для отрисовки, не следующие из requires
export const EXTRA_EDGES: [string, string][] = [
  ['d4', 'o3'],
  ['r2', 'h1'],
  ['c1', 'o1'],
  ['a2', 'c2'],
  ['f2', 'h1'],
];

export interface Bonuses {
  yield: number; aroma: number; purity: number; price: number;
  headsSoft: number; marketStab: number;
  veg: number; herb: number; fruit: number; honey: number;
  rare: boolean; mead: boolean; cider: boolean; tinct: boolean;
  aging: number; agedPrice: number; brewSpeed: number; tinctBoost: number;
  meadPrice: number; rareSale: boolean; rarePrice: number; contract: boolean;
  discount: number; luck: number;
  handsZone: number; handsReward: number; perfectChance: number; hint: boolean;
  resetOnce: boolean;
}

const EFFECTS: Record<string, any> = {
  d1: { yield: 0.05 },
  d2: { yield: 0.1, aroma: 0.05 },
  d3: { aroma: 0.25, price: 0.1 },
  d4: { aroma: 0.15, yield: 0.05 },
  r1: { purity: 0.1 },
  r2: { purity: 0.15 },
  r3: { purity: 0.1, headsSoft: 3 },
  r4: { purity: 0.2 },
  c1: { price: 0.1 },
  c2: { price: 0.1 },
  c3: { price: 0.15, marketStab: 0.3 },
  c4: { price: 0.2 },
  f1: { veg: 1 },
  f2: { veg: 2 },
  f3: { veg: 2 },
  f4: { veg: 3 },
  h1: { herb: 1 },
  h2: { herb: 1 },
  h4: { herb: 2 },
  o1: { fruit: 1 },
  o3: { fruit: 1, rare: true },
  o4: { fruit: 2 },
  a1: { honey: 1 },
  a2: { honey: 1 },
  a4: { honey: 2 },
  bk1:  { aging: 1 },
  bk2:  { agedPrice: 0.05 },
  bk3:  { agedPrice: 0.1 },
  bk4:  { agedPrice: 0.4 },
  soc1: { luck: 1 },
  soc2: { discount: 0.1 },
  soc3: { rarePrice: 0.3 },
  soc4: { contract: true },
  hnd1: { handsZone: 0.1 },
  hnd2: { handsReward: 0.15 },
  hnd3: { perfectChance: 0.05 },
  hnd4: { hint: true },
  fm1: { brewSpeed: 1 },
  th1: { tinctBoost: 0.2 },
  fh1: { meadPrice: 0.25 },
  dz1: { rareSale: true },
  book: { resetOnce: true },
};

export function bonuses(skills: string[]): Bonuses {
  const b: Bonuses = {
    yield: 0, aroma: 0, purity: 0, price: 0, headsSoft: 0, marketStab: 0,
    veg: 0, herb: 0, fruit: 0, honey: 0,
    rare: false, mead: false, cider: false, tinct: false,
    aging: 0, agedPrice: 0, brewSpeed: 0, tinctBoost: 0, meadPrice: 0,
    rareSale: false, rarePrice: 0, contract: false, discount: 0, luck: 0,
    handsZone: 0, handsReward: 0, perfectChance: 0, hint: false, resetOnce: false,
  };
  skills.forEach((id) => {
    const e = EFFECTS[id];
    if (!e) return;
    Object.keys(e).forEach((k) => {
      if (typeof e[k] === 'boolean') (b as any)[k] = true;
      else (b as any)[k] += e[k];
    });
  });
  b.mead = skills.includes('a3');
  b.cider = skills.includes('o2');
  b.tinct = skills.includes('h3');
  return b;
}

export function canLearn(node: SkillNode, learned: string[]): boolean {
  if (learned.includes(node.id)) return false;
  if (!node.requires.every((r) => learned.includes(r))) return false;
  if (node.requiresAny && !node.requiresAny.some((r) => learned.includes(r))) return false;
  if (node.conflicts && node.conflicts.some((c) => learned.includes(c))) return false;
  return true;
}

export function isVisible(node: SkillNode, learned: string[], gameFlags: Record<string, boolean> = {}): boolean {
  if (!node.hidden) return true;
  if (node.id === 'dz1') return learned.includes('c2') && learned.includes('d3');
  return !!gameFlags['reveal_' + node.id];
}

export function branchCost(branch: string): number {
  return SKILLS.filter((n) => n.branch === branch).reduce((s, n) => s + n.cost, 0);
}
