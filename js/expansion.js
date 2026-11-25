import { addInventory, getStorageCapacity } from "./economy.js";

const RECIPES = [
  { id: "basic", name: "Обычная партия браги", cost: 10, days: 2, output: 3, tier: 0, description: "Небольшая партия на старом оборудовании." },
  { id: "refined", name: "Улучшенная партия", cost: 35, days: 2, output: 5, tier: 2, description: "Технологическая партия для модернизированной установки." },
  { id: "precision", name: "Точная партия", cost: 75, days: 1, output: 7, tier: 3, qualityBonus: 12, description: "Быстрая партия с повышенным качеством." },
  { id: "master", name: "Мастерская партия", cost: 140, days: 2, output: 9, tier: 4, qualityBonus: 22, description: "Премиальная партия для полностью развитой установки." }
];

const CHAPTERS = [
  { id: "note_1", title: "Записка под верстаком", text: "«Если аппарат снова закашляет — не бей по нему молотком. Сначала проверь крепления. И не говори деду, что я это написала». На обороте — схема неизвестного узла.", condition: s => s.day >= 3 },
  { id: "note_2", title: "Чертёж из старого сундука", text: "Между пожелтевшими газетами найден чертёж модульной установки. Бабушка явно собиралась модернизировать сарай, но кто-то вырвал последнюю страницу.", condition: s => s.equipmentTier >= 1 && s.buildings.workshop >= 1 },
  { id: "note_3", title: "Письмо из районного техникума", text: "В конверте приглашение на выставку сельских изобретений. На полях бабушка написала: «Не доверяй человеку, который называет отвёртку универсальным инструментом».", condition: s => s.equipmentTier >= 2 && s.orders?.completed >= 2 },
  { id: "note_4", title: "Тайна ректификационной колонны", text: "Последняя записка указывает на старую мастерскую за садом. Бабушка оставила не просто аппарат — она оставила незаконченный проект.", condition: s => s.equipmentTier >= 4 && s.automationTier >= 2 }
];

const $ = selector => document.querySelector(selector);
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

function ensure(state) {
  state.advancedProduction ??= { lines: [], queue: [], nextId: 1 };
  state.advancedProduction.lines ??= [];
  state.advancedProduction.queue ??= [];
  state.advancedProduction.nextId ??= 1;
  state.advancedProduction.lines.forEach(line => { line.quality = Math.max(25, Math.min(100, Number(line.quality) || 55)); });
  state.advancedProduction.queue.forEach(job => { job.quality = Math.max(25, Math.min(100, Number(job.quality) || 55)); });
  state.maintenance ??= 100;
  state.bragaQuality = Math.max(0, Math.min(100, Number(state.bragaQuality ?? 55)));
  state.story ??= { unlocked: [] };
  state.story.unlocked ??= [];
  state.advancedContracts ??= { offer: null, completed: 0 };
  state.advancedContracts.completed ??= 0;
}

function qualityLabel(value) {
  if (value >= 90) return "превосходное";
  if (value >= 75) return "высокое";
  if (value >= 60) return "хорошее";
  if (value >= 45) return "обычное";
  return "низкое";
}

function batchQuality(state, recipe) {
  const tierBonus = Math.max(0, Number(state.equipmentTier) || 0) * 6;
  const maintenanceEffect = ((Number(state.maintenance) || 0) - 60) * 0.22;
  return Math.max(25, Math.min(100, Math.round(48 + tierBonus + maintenanceEffect + (recipe.qualityBonus || 0))));
}

function lineCapacity(state) {
  return Math.min(5, 1 + Math.max(0, Number(state.buildings?.production) || 0));
}

function startQueued(state) {
  const data = state.advancedProduction;
  while (data.lines.length < lineCapacity(state) && data.queue.length) {
    const job = data.queue.shift();
    data.lines.push({ ...job, startedDay: state.day, remaining: job.days, ready: false });
  }
}

function makeContract(state) {
  const requiredTier = Math.min(4, Math.max(1, Number(state.equipmentTier) || 1));
  const quantity = 4 + requiredTier * 2;
  return {
    id: `contract_${state.day}_${Math.floor(Math.random() * 99999)}`,
    title: ["Поставка для районной ярмарки", "Заказ от нового торгового дома", "Пробная партия для кооператива"][Math.floor(Math.random() * 3)],
    requiredTier,
    quantity,
    reward: 180 + requiredTier * 240,
    xp: 25 + requiredTier * 15
  };
}

function renderProduction(state) {
  const root = $("#advancedProduction");
  if (!root) return;
  root.replaceChildren();

  const summary = el("p", "expansion-summary",
    `Линий: ${state.advancedProduction.lines.length}/${lineCapacity(state)} · В очереди: ${state.advancedProduction.queue.length} · Аппарат: ${state.equipmentTier}/4 · Среднее качество браги: ${state.bragaQuality}/100`);
  root.append(summary);

  const recipes = el("div", "expansion-grid");
  RECIPES.forEach(recipe => {
    const card = el("article", "expansion-card");
    card.append(el("h3", "", recipe.name), el("p", "", recipe.description),
      el("p", "", `Стоимость: ${recipe.cost} монет · Срок: ${recipe.days} дн. · Выход: ${recipe.output} ед. · Ожидаемое качество: ${batchQuality(state, recipe)}/100`),
      el("p", "", `Требуется ступень аппарата: ${recipe.tier}`));
    const button = el("button", "", "Добавить в очередь");
    button.dataset.productionRecipe = recipe.id;
    button.disabled = state.equipmentTier < recipe.tier || state.money < recipe.cost || state.advancedProduction.queue.length >= 12;
    card.append(button);
    recipes.append(card);
  });
  root.append(recipes);

  root.append(el("h3", "", "Работающие линии"));
  if (!state.advancedProduction.lines.length) root.append(el("p", "economy-empty", "Линии свободны. Даже оборудование ждёт понедельника."));
  state.advancedProduction.lines.forEach(line => {
    const card = el("article", `production-line${line.ready ? " ready" : ""}`);
    card.append(el("h4", "", line.name));
    card.append(el("p", "", line.ready ? `Готово: ${line.output} ед. · качество ${line.quality}/100 (${qualityLabel(line.quality)})` : `Осталось дней: ${line.remaining} · качество ${line.quality}/100`));
    const progress = el("div", "production-progress");
    const fill = el("span");
    fill.style.width = line.ready ? "100%" : `${Math.max(0, 100 * (line.days - line.remaining) / line.days)}%`;
    progress.append(fill); card.append(progress);
    if (line.ready) {
      const collect = el("button", "", "Собрать партию");
      collect.dataset.collectLine = line.id;
      card.append(collect);
    }
    root.append(card);
  });

  root.append(el("h3", "", "Очередь производства"));
  const queue = el("div", "production-queue");
  if (!state.advancedProduction.queue.length) queue.append(el("p", "economy-empty", "Очередь пуста."));
  state.advancedProduction.queue.forEach((job, index) => queue.append(
    el("div", "production-queue-item", `${index + 1}. ${job.name} — ${job.output} ед. · ${job.days} дн.`)
  ));
  root.append(queue);
}

function renderMaintenance(state) {
  const root = $("#maintenancePanel");
  if (!root) return;
  root.replaceChildren();
  root.append(el("p", "", `Состояние оборудования: ${state.maintenance}%`));
  const meter = el("div", "maintenance-meter");
  const fill = el("span");
  fill.style.width = `${state.maintenance}%`;
  meter.append(fill); root.append(meter);
  root.append(el("p", "", state.automationTier >= 2
    ? "Автоматика контролирует состояние и при наличии инструментов проводит мелкое обслуживание."
    : "Износ растёт каждый день. Продвинутый контроль доступен после улучшения автоматики."));
}

function renderBarnVisual(state) {
  const root = $("#barnVisual");
  if (!root) return;
  const tier = Math.max(0, Math.min(4, Number(state.equipmentTier) || 0));
  root.dataset.tier = String(tier);
  const scenes = ["🪚 🛢️ 🪣", "🛠️ ⚙️ 🛢️", "🔧 🟤 ⚙️", "⚙️ 🧪 🎛️", "🏭 ⚙️ 🧪"];
  root.textContent = scenes[tier];
  const caption = $("#barnVisualCaption");
  if (caption) caption.textContent = [
    "Старый сарай и аппарат, который пережил три ремонта и один семейный скандал.",
    "Укреплённая мастерская: появились новые узлы и место для работы.",
    "Медная установка и аккуратно собранная техническая зона.",
    "Модульное производство с контроллерами и отдельными рабочими секциями.",
    "Современный производственный комплекс. Соседи теперь приходят «просто посмотреть»."
  ][tier];
}

function renderContracts(state) {
  const root = $("#advancedContracts");
  if (!root) return;
  root.replaceChildren();
  const contract = state.advancedContracts.offer;
  if (!contract) {
    root.append(el("p", "economy-empty", "Новых технологических заказов пока нет."));
    return;
  }
  const card = el("article", "contract-card");
  card.append(el("h4", "", contract.title),
    el("p", "", `Требуется аппарат не ниже ${contract.requiredTier} ступени.`),
    el("p", "", `Количество: ${contract.quantity} ед. браги`),
    el("p", "", `Награда: ${contract.reward} монет · ${contract.xp} XP`));
  const button = el("button", "", "Выполнить поставку");
  button.dataset.completeContract = "true";
  button.disabled = state.equipmentTier < contract.requiredTier || (state.inventory.braga || 0) < contract.quantity;
  card.append(button); root.append(card);
}

function renderStory(state) {
  const root = $("#grandmaChapters");
  if (!root) return;
  root.replaceChildren();
  CHAPTERS.forEach(chapter => {
    const unlocked = state.story.unlocked.includes(chapter.id);
    const available = chapter.condition(state);
    const card = el("article", `story-entry${unlocked ? "" : " locked"}`);
    card.append(el("h4", "", unlocked ? chapter.title : "???"));
    card.append(el("p", "", unlocked ? chapter.text : available ? "Найдено новое свидетельство. Нужен день, чтобы разобрать записи." : "Пока не открыто. Развивайте хозяйство и изучайте оборудование."));
    if (available && !unlocked) {
      const button = el("button", "", "Разобрать записку");
      button.dataset.unlockStory = chapter.id;
      card.append(button);
    }
    root.append(card);
  });
}

export function renderExpansion(state) {
  ensure(state);
  renderProduction(state);
  renderMaintenance(state);
  renderBarnVisual(state);
  renderContracts(state);
  renderStory(state);
}

export function initExpansion(state, { render, notify, earnExperience }) {
  ensure(state);
  const nav = $(".navigation");
  const game = $("#game");
  if (!nav || !game) return;
  if (!$("#expansion")) {
    const tab = el("button", "", "🏭 Производство+");
    tab.dataset.tab = "expansion";
    nav.append(tab);
    const section = el("section", "tab-content panel hidden");
    section.id = "expansion";
    section.innerHTML = `
      <h2>🏭 Производственный комплекс</h2>
      <p>Несколько линий, очередь партий и контроль состояния. Теперь хозяйство работает не только на энтузиазме владельца.</p>
      <h3>Визуальное состояние сарая</h3>
      <div id="barnVisual" class="barn-visual"></div><p id="barnVisualCaption"></p>
      <h3>Производственные рецептуры</h3><div id="advancedProduction"></div>
      <h3>Автоматическое обслуживание</h3><div id="maintenancePanel"></div>
      <h3>Контракты высокого уровня</h3><div id="advancedContracts"></div>
      <h3>Бабушкины тайны — новые главы</h3><div id="grandmaChapters" class="expansion-grid"></div>`;
    game.append(section);
  }

  nav.addEventListener("click", event => {
    if (!event.target.closest('[data-tab="expansion"]')) return;
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.toggle("hidden", tab.id !== "expansion"));
    nav.querySelectorAll("[data-tab]").forEach(item => item.classList.toggle("active", item.dataset.tab === "expansion"));
  });

  $("#expansion").addEventListener("click", event => {
    const recipeButton = event.target.closest("[data-production-recipe]");
    if (recipeButton) {
      const recipe = RECIPES.find(item => item.id === recipeButton.dataset.productionRecipe);
      if (!recipe || state.money < recipe.cost || state.equipmentTier < recipe.tier) return;
      if (state.advancedProduction.queue.length >= 12) {
        notify("Очередь заполнена. Даже у железа есть предел терпения.");
        return;
      }
      state.money -= recipe.cost;
      state.advancedProduction.queue.push({
        id: state.advancedProduction.nextId++,
        recipeId: recipe.id, name: recipe.name, days: recipe.days,
        remaining: recipe.days, output: recipe.output, quality: batchQuality(state, recipe), ready: false
      });
      startQueued(state);
      notify(`В очередь добавлено: «${recipe.name}». Прогноз качества — ${batchQuality(state, recipe)}/100.`);
      render(); return;
    }

    const collectButton = event.target.closest("[data-collect-line]");
    if (collectButton) {
      const index = state.advancedProduction.lines.findIndex(line => String(line.id) === collectButton.dataset.collectLine);
      const line = state.advancedProduction.lines[index];
      if (!line?.ready) return;
      const expected = line.output;
      const oldQty = Math.max(0, Number(state.inventory.braga) || 0);
      const received = addInventory(state, "braga", expected);
      if (received > 0) state.bragaQuality = Math.round(((state.bragaQuality * oldQty) + (line.quality * received)) / Math.max(1, oldQty + received));
      if (received < expected) {
        line.output = expected - received;
        notify(`На склад помещено ${received}. Остаток партии (${line.output}) ждёт свободного места.`);
      } else {
        state.advancedProduction.lines.splice(index, 1);
        notify(`Партия собрана: ${received} ед. браги, качество ${line.quality}/100. Среднее качество запаса: ${state.bragaQuality}/100.`);
        startQueued(state);
        earnExperience(12);
      }
      render(); return;
    }

    if (event.target.closest("[data-complete-contract]")) {
      const contract = state.advancedContracts.offer;
      if (!contract || state.equipmentTier < contract.requiredTier || (state.inventory.braga || 0) < contract.quantity) return;
      state.inventory.braga -= contract.quantity;
      state.money += contract.reward;
      state.reputation = Math.min(100, (state.reputation || 0) + 5);
      state.advancedContracts.completed += 1;
      state.advancedContracts.offer = makeContract(state);
      earnExperience(contract.xp);
      notify(`Технологическая поставка выполнена! Репутация +5, награда ${contract.reward} монет.`);
      render(); return;
    }

    const storyButton = event.target.closest("[data-unlock-story]");
    if (storyButton) {
      const chapter = CHAPTERS.find(item => item.id === storyButton.dataset.unlockStory);
      if (!chapter || !chapter.condition(state) || state.story.unlocked.includes(chapter.id)) return;
      state.story.unlocked.push(chapter.id);
      notify(`Открыта глава: «${chapter.title}».`);
      render();
    }
  });

  if (!state.advancedContracts.offer) state.advancedContracts.offer = makeContract(state);
  renderExpansion(state);
}

export function advanceExpansionDay(state, notify) {
  ensure(state);
  state.maintenance = Math.max(0, state.maintenance - (state.automationTier >= 1 ? 0.5 : 2));

  state.advancedProduction.lines.forEach(line => {
    if (!line.ready) {
      line.remaining -= 1;
      if (line.remaining <= 0) {
        line.remaining = 0;
        line.ready = true;
        notify(`Производственная линия завершила: «${line.name}».`);
      }
    }
  });

  if (state.automationTier >= 1) {
    for (let index = state.advancedProduction.lines.length - 1; index >= 0; index -= 1) {
      const line = state.advancedProduction.lines[index];
      if (!line.ready) continue;
      const expected = line.output;
      const oldQty = Math.max(0, Number(state.inventory.braga) || 0);
      const received = addInventory(state, "braga", expected);
      if (received > 0) state.bragaQuality = Math.round(((state.bragaQuality * oldQty) + (line.quality * received)) / Math.max(1, oldQty + received));
      if (received === expected) {
        state.advancedProduction.lines.splice(index, 1);
        notify(`Автоматика собрала ${received} ед. браги качества ${line.quality}/100.`);
      } else if (received > 0) {
        line.output = expected - received;
        notify(`Автоматика перенесла на склад ${received}; остаток ждёт свободного места.`);
      }
    }
  }

  startQueued(state);
  const stored = Object.values(state.inventory || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  if (stored >= getStorageCapacity(state) * 0.9) notify("Склад почти заполнен. Контроль запасов рекомендует освободить место.");

  if (state.automationTier >= 2 && state.maintenance < 75 && (state.parts.tools || 0) > 0) {
    state.parts.tools -= 1;
    state.maintenance = Math.min(100, state.maintenance + 25);
    notify("Автоматика провела плановое обслуживание оборудования.");
  }

  if (state.maintenance <= 20) notify("Внимание: оборудование сильно изношено. Проведите обслуживание или улучшите автоматику.");
  if (state.automationTier >= 2 && state.advancedProduction.queue.length) startQueued(state);
}
