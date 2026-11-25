
import { ITEMS, SKILL_BRANCHES } from "./data.js";
import { getStorageCapacity } from "./economy.js";

const $ = (selector) => document.querySelector(selector);

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

function setBar(selector, value) {
  const element = $(selector);
  if (element) {
    element.style.width = `${Math.max(0, Math.min(100, value))}%`;
  }
}

export function renderHUD(state) {
  setText("#day", state.day);
  setText("#money", state.money);
  setText("#level", state.level);
}

export function renderNeeds(state) {
  setText("#hungerValue", state.hunger);
  setText("#energyValue", state.energy);
  setText("#warmthValue", state.warmth);

  setBar("#hungerBar", state.hunger);
  setBar("#energyBar", state.energy);
  setBar("#warmthBar", state.warmth);
}

const GRISHKA_ADVICE = [
  {
    id: "low-energy",
    when: state => Number(state.energy) <= 20,
    text: "Внучок, присядь. С таким запасом сил ты даже сорняк не напугаешь. Передохни."
  },
  {
    id: "low-hunger",
    when: state => Number(state.hunger) <= 20,
    text: "Живот урчит громче старого трактора. Найди, чем подкрепиться, а то скоро сам себя съешь."
  },
  {
    id: "cold",
    when: state => Number(state.warmth) <= 20,
    text: "У тебя в доме тепла меньше, чем в сердце налогового инспектора. Займись хозяйством и утеплением."
  },
  {
    id: "poor",
    when: state => Number(state.money) < 20,
    text: "Кошелёк опять похудел? Не трать последнее на блестящие железки — сначала продай урожай."
  },
  {
    id: "ready-braga",
    when: state => Boolean(state.production?.ready),
    text: "Эй, мастер! Бочка уже своё отработала. Забирай брагу, пока она не решила стать уксусом."
  },
  {
    id: "fermenting",
    when: state => Boolean(state.production?.active),
    text: "Пусть бочка спокойно булькает. А ты пока займись огородом или проверь заказы."
  },
  {
    id: "repair-still",
    when: state => Number(state.still) < 35,
    text: "Аппарат выглядит так, будто пережил три свадьбы и один пожар. Подлатай его до следующей партии."
  },
  {
    id: "repair-barn",
    when: state => Number(state.barn) < 35,
    text: "Сарай держится на честном слове и паутине. Чуть ремонта — и работать станет спокойнее."
  },
  {
    id: "repair-house",
    when: state => Number(state.house) < 30,
    text: "Дом у тебя пока больше похож на декорацию к фильму про зиму. Не забудь про ремонт."
  },
  {
    id: "garden",
    when: state => Number(state.garden) < 20,
    text: "Грядки заросли так, что картошку пора искать с компасом. Расчисти огород — будет урожай."
  },
  {
    id: "orchard",
    when: state => !state.orchardRestored && Number(state.day) >= 3 && Number(state.money) >= 40,
    text: "За домом сад пропадает. Сорок монет — и яблони снова начнут приносить пользу. Я бы сам расчистил, да спина."
  },
  {
    id: "full-warehouse",
    when: state => {
      const total = Object.values(state.inventory || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
      return total >= getStorageCapacity(state) * 0.9;
    },
    text: "На складе уже яблоку негде упасть. Продай лишнее или расширь хранилище, а то урожай пойдёт жить на улицу."
  },
  {
    id: "unspent-points",
    when: state => Number(state.skillPoints) >= 2,
    text: "У тебя очки навыков копятся, а ты всё тянешь. Загляни в дерево умений — знания сами в голову не заползут."
  },
  {
    id: "automation",
    when: state => Number(state.automationTier) > 0,
    text: "Вот это я понимаю — хозяйство работает само! Только не забывай поглядывать на оборудование. Железо обидчивое."
  },
  {
    id: "equipment",
    when: state => Number(state.equipmentTier) > 0,
    text: "Новое оборудование — это хорошо. Теперь бы научиться выжимать из него толк, а не только хвастаться соседям."
  },
  {
    id: "orchard-restored",
    when: state => Boolean(state.orchardRestored) && Number(state.trees) > 0,
    text: "Сад ожил — красота! Не забывай собирать фрукты. Деревья, конечно, терпеливые, но не до бесконечности."
  },
  {
    id: "first-skills",
    when: state => (state.skills || []).length >= 5,
    text: "Гляжу, мастер растёт! Пять навыков — уже не просто деревенский турист. Скоро и мне советовать будет нечего."
  },
  {
    id: "day-progress",
    when: state => Number(state.day) >= 10,
    text: "Десятый день пошёл, а хозяйство ещё стоит! Бабушка бы сказала: «Главное — не зазнавайся и крышу проверь»."
  }
];

const GRISHKA_DEFAULT_LINES = [
  "Не суетись, внучок. Сначала одно дело доведи до ума, потом хватайся за три следующих.",
  "Хорошее хозяйство строится не за день. Хотя сарай у соседа рухнул за минуту — рекорд, между прочим.",
  "Запомни: если план не сработал, это не провал. Это бесплатный урок с дымом и запахом палёного.",
  "Деньги любят счёт, а деревенские слухи — скорость. Смотри, чтобы второе не обогнало первое.",
  "Бабушка говорила: инструмент держи сухим, запасы — полными, а обещания соседям — осторожными.",
  "Вон сколько дел вокруг. Выбери самое полезное, а не то, которое громче скрипит."
];

export function renderAdvisor(state) {
  const tip = $("#grishkaTip");
  if (!tip) return;

  const advice = GRISHKA_ADVICE.find(entry => entry.when(state));
  const line = advice
    ? advice.text
    : GRISHKA_DEFAULT_LINES[Math.abs(Number(state.day) || 1) % GRISHKA_DEFAULT_LINES.length];

  tip.textContent = `«${line}»`;
  tip.dataset.advice = advice?.id || "general";
}

export function renderXP(state) {
  const xpNeeded = 100;
  const currentXP = Math.max(0, Number(state.xp) || 0);
  const progress = (currentXP / xpNeeded) * 100;

  setText("#xpValue", currentXP);
  setText("#xpNext", xpNeeded);
  setBar("#xpBar", progress);
}

export function renderWarehouse(state) {
  const warehouse = $("#warehouseItems");
  if (!warehouse) return;

  warehouse.innerHTML = "";

  let total = 0;

  ITEMS.forEach((item) => {
    const quantity = Math.max(
      0,
      Number(state.inventory?.[item.id]) || 0
    );

    total += quantity;

    const card = document.createElement("div");
    card.className = "warehouse-item";

    const icon = document.createElement("span");
    icon.className = "warehouse-icon";
    icon.textContent = item.emoji;

    const name = document.createElement("span");
    name.className = "warehouse-name";
    name.textContent = item.name;

    const count = document.createElement("b");
    count.className = "warehouse-count";
    count.textContent = `${quantity} шт.`;

    card.append(icon, name, count);
    warehouse.appendChild(card);
  });

  setText("#warehouseTotal", `${total} / ${getStorageCapacity(state)}`);
}

export function renderProduction(state) {
  const status = $("#productionStatus");

  if (status) {
    if (state.production.ready) {
      status.textContent =
        "Брага готова! Бочка подозрительно булькает.";
    } else if (state.production.active) {
      status.textContent =
        `Идёт брожение. Осталось дней: ${state.production.daysLeft}.`;
    } else {
      status.textContent = "Пока ничего не бродит. Даже настроение.";
    }
  }

  const start = $("#startBatch");
  const collect = $("#collectBatch");

  if (start) {
    start.disabled =
      !state.skills.includes("ferment") ||
      state.production.active ||
      state.production.ready ||
      state.money < 10 ||
      state.energy < 10;
  }

  if (collect) {
    collect.disabled = !state.production.ready;
  }
}

export function renderMarket(state) {
  const market = $("#marketItems");
  const inventory = $("#inventory");

  if (!market || !inventory) return;

  market.innerHTML = "";

  ITEMS.forEach((item) => {
    const quantity = state.inventory[item.id] || 0;

    const card = document.createElement("div");
    card.className = "market-item";

    const heading = document.createElement("h3");
    heading.textContent = `${item.emoji} ${item.name}`;

    const description = document.createElement("p");
    description.textContent = item.description;

    const stock = document.createElement("p");
    stock.textContent = `В запасе: ${quantity}`;

    const price = document.createElement("p");
    const multiplier = state.skills.includes("bargain") ? 1.2 : 1;
    const salePrice = Math.round(item.price * multiplier);
    price.textContent = `Цена: ${salePrice} монет за штуку`;

    const button = document.createElement("button");
    button.textContent = "Продать 1";
    button.disabled = quantity <= 0;
    button.dataset.sell = item.id;

    card.append(heading, description, stock, price, button);
    market.appendChild(card);
  });

  inventory.textContent = ITEMS
    .map(item => `${item.emoji} ${item.name}: ${state.inventory[item.id] || 0}`)
    .join("  |  ");
}

const GRISHKA_TIPS = [
  "Не хватает очков навыков? Продай табуретку. Всё равно на ней никто не сидит!",
  "Автоматизация — это когда железо работает, а ты делаешь вид, что так и задумано.",
  "Улучшай мастерскую! Если задымилось — значит, прогресс пошёл. Наверное.",
  "Секрет урожая? Разговаривай с картошкой. Но деньги ей не одалживай.",
  "Вложись в механику. Молоток — это не универсальный инструмент. Это образ жизни.",
  "Торговля проста: сначала назови цену, потом перестань смеяться.",
  "Изучи выживание. Особенно навык «не есть семена на посадку».",
  "Бабушка говорила: если деталь осталась лишней — значит, ты собрал что-то новое."
];

function createGrishkaPortrait() {
  return `
  <svg class="grishka-art" viewBox="0 0 260 330" role="img" aria-label="Дядька Гришка — хитрый деревенский советчик">
    <defs>
      <linearGradient id="grishka-coat" x2="1" y2="1"><stop stop-color="#71804c"/><stop offset="1" stop-color="#293a28"/></linearGradient>
      <radialGradient id="grishka-face"><stop stop-color="#f3c99a"/><stop offset="1" stop-color="#b97855"/></radialGradient>
      <filter id="grishka-glow"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <ellipse cx="130" cy="304" rx="91" ry="13" fill="#000" opacity=".35"/>
    <path d="M58 295 Q62 210 88 181 L174 181 Q205 224 207 295Z" fill="url(#grishka-coat)" stroke="#a18b5b" stroke-width="3"/>
    <path d="M93 190 L126 225 L111 288 L78 285Z" fill="#d0c2a0"/>
    <path d="M164 190 L133 225 L151 288 L185 285Z" fill="#d0c2a0"/>
    <path d="M92 194 L64 282 M174 194 L198 280" stroke="#b29a65" stroke-width="13" stroke-linecap="round"/>
    <path d="M84 82 Q75 28 130 24 Q190 29 182 95 L169 159 Q132 192 93 154Z" fill="#eee0c5"/>
    <path d="M88 94 Q75 48 113 37 Q146 16 177 58 L173 112 Q160 83 148 80 Q125 105 88 94Z" fill="#f1e6d1"/>
    <ellipse cx="130" cy="105" rx="48" ry="58" fill="url(#grishka-face)" stroke="#6b4939" stroke-width="2"/>
    <path d="M91 87 Q108 69 122 87 M140 87 Q158 68 171 89" stroke="#6b4939" stroke-width="9" stroke-linecap="round"/>
    <ellipse cx="112" cy="103" rx="8" ry="11" fill="#fff"/><ellipse cx="151" cy="103" rx="8" ry="11" fill="#fff"/>
    <circle cx="114" cy="105" r="4" fill="#29251d"/><circle cx="151" cy="105" r="4" fill="#29251d"/>
    <path d="M128 104 Q111 131 132 132 Q145 132 142 122" fill="#c88661" stroke="#7e4d3a" stroke-width="2"/>
    <path d="M105 143 Q130 170 159 140 Q146 180 119 166Z" fill="#57352d"/>
    <path d="M104 145 Q130 156 157 142" stroke="#fff1d8" stroke-width="5"/>
    <path d="M76 61 Q95 8 158 15 Q205 18 215 57 Q162 43 76 61Z" fill="#8c7545" stroke="#d2b56e" stroke-width="4"/>
    <path d="M113 21 Q126 -2 146 17" stroke="#e1c879" stroke-width="8" fill="none"/>
    <circle cx="169" cy="31" r="13" fill="#e7bd49"/><circle cx="169" cy="31" r="5" fill="#754a24"/>
    <path d="M191 154 Q216 130 224 91" stroke="#b2a17a" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M218 92 Q236 48 247 86 Q235 112 218 92Z" fill="#e58d32" stroke="#7a4b26" stroke-width="2"/>
    <path d="M225 65 Q231 49 240 58 M230 67 Q245 49 250 55" stroke="#77934e" stroke-width="5" fill="none"/>
    <path d="M61 285 L38 311 L91 311 L104 289 M167 289 L183 311 L231 311 L202 283" fill="#514233" stroke="#b39b70" stroke-width="4"/>
    <path d="M98 200 L115 218 L101 238 L85 218Z M163 202 L147 221 L165 241 L181 219Z" fill="#a56b45" stroke="#d2a66a" stroke-width="2"/>
  </svg>`;
}

export function renderSkills(state) {
  const tree = $("#skillTree");
  if (!tree) return;
  setText("#skillPoints", state.skillPoints);
  tree.replaceChildren();

  const map = document.createElement("div");
  map.className = "skill-map-stage";
  const width = 1120, height = 760, cx = 560, cy = 380;
  const angles = [-155, -105, -55, 15, 75, 145];
  const colors = ["#b7d7a2", "#d6bd83", "#a9c8dc", "#d7a3a3", "#c2b0dc", "#d2a879"];
  const icons = ["🌱", "🫙", "⚙️", "🤖", "🪙", "🔥"];
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "skill-map-lines");
  svg.setAttribute("aria-hidden", "true");
  const hub = document.createElementNS(svgNS, "circle");
  hub.setAttribute("cx", cx); hub.setAttribute("cy", cy); hub.setAttribute("r", "58");
  hub.setAttribute("class", "skill-hub-ring"); svg.append(hub);
  const layer = document.createElement("div");
  layer.className = "skill-map-nodes";
  const allSkills = SKILL_BRANCHES.flatMap(branch => branch.skills);

  SKILL_BRANCHES.forEach((branch, branchIndex) => {
    const angle = angles[branchIndex] * Math.PI / 180;
    const branchColor = colors[branchIndex];
    let previous = { x: cx, y: cy };
    branch.skills.forEach((skill, index) => {
      const radius = 145 + index * Math.min(94, 300 / Math.max(1, branch.skills.length - 1));
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const path = document.createElementNS(svgNS, "path");
      const mx = (previous.x + x) / 2, my = (previous.y + y) / 2;
      path.setAttribute("d", `M ${previous.x} ${previous.y} Q ${mx + (branchIndex - 2) * 12} ${my - 12} ${x} ${y}`);
      path.setAttribute("class", "skill-link");
      path.setAttribute("stroke", branchColor); svg.append(path);
      const ring = document.createElementNS(svgNS, "circle");
      ring.setAttribute("cx", x); ring.setAttribute("cy", y); ring.setAttribute("r", "48");
      ring.setAttribute("class", "skill-node-halo"); svg.append(ring);

      const unlocked = state.skills.includes(skill.id);
      const available = !skill.requires || state.skills.includes(skill.requires);
      const requiredSkill = allSkills.find(item => item.id === skill.requires);
      const node = document.createElement("button");
      node.type = "button";
      node.className = `skill-orbit-node${unlocked ? " unlocked" : ""}${!available ? " locked" : ""}`;
      node.dataset.skill = skill.id;
      node.disabled = unlocked || !available || state.skillPoints < skill.cost;
      node.style.left = `${x / width * 100}%`; node.style.top = `${y / height * 100}%`;
      node.style.setProperty("--branch-color", branchColor);
      node.title = `${skill.name}. ${skill.description} ${unlocked ? "Изучено" : skill.requires && !available ? "Требуется: " + (requiredSkill?.name || skill.requires) : "Стоимость: " + skill.cost + " очков"}`;
      const icon = document.createElement("span"); icon.className = "skill-orbit-icon"; icon.textContent = unlocked ? "✓" : icons[branchIndex];
      const label = document.createElement("span"); label.className = "skill-orbit-label"; label.textContent = skill.name;
      node.append(icon, label); layer.append(node);
      previous = { x, y };
    });
    const label = document.createElement("div");
    label.className = "skill-branch-label"; label.textContent = branch.name;
    label.style.left = `${(cx + Math.cos(angle) * 365) / width * 100}%`;
    label.style.top = `${(cy + Math.sin(angle) * 365) / height * 100}%`;
    label.style.setProperty("--branch-color", branchColor); layer.append(label);
  });
  map.append(svg, layer);

  tree.append(map);
}

export function renderWorld(state) {
  setText("#houseValue", state.house);
  setText("#barnValue", state.barn);
  setText("#stillValue", state.still);
  setText("#gardenValue", state.garden);
  setText("#orchardValue", state.orchardRestored ? 100 : 0);
  setText("#treeCount", state.trees);

  setText(
    "#homeDescription",
    state.house >= 70
      ? "Дом почти уютный. Осталось выгнать сквозняк и пару мышей."
      : "Крыша местами есть. В дождь можно выбирать, где именно стоять."
  );

  setText(
    "#barnDescription",
    state.barn >= 70
      ? "Сарай держится молодцом. В отличие от его владельца."
      : "Внутри пахнет сеном, ржавчиной и решениями, о которых жалеют."
  );

  setText(
    "#orchardDescription",
    state.orchardRestored
      ? "Сад ожил! Яблони и груши снова дают урожай."
      : "Заросли такие, что даже крапива просит карту местности."
  );

  const restore = $("#restoreOrchard");

  if (restore) {
    restore.disabled = state.orchardRestored || state.money < 40;
    restore.textContent = state.orchardRestored
      ? "Сад восстановлен"
      : "Расчистить сад — 40 монет";
  }

  const harvestFruit = $("#harvestFruit");

  if (harvestFruit) {
    harvestFruit.disabled =
      !state.orchardRestored || state.energy < 5;
  }

  const harvestVegetables = $("#harvestVegetables");

  if (harvestVegetables) {
    harvestVegetables.disabled =
      state.energy < 5 || state.garden < 20;
  }
}

export function renderAll(state) {
  renderHUD(state);
  renderNeeds(state);
  renderXP(state);
  renderWarehouse(state);
  renderProduction(state);
  renderMarket(state);
  renderSkills(state);
  renderWorld(state);
}
