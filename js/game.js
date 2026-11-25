
import { loadGame, saveGame, addXP } from "./engine.js";
import { ITEMS, SKILL_BRANCHES } from "./data.js";
import { renderAll, renderAdvisor, reactGrishkaToEvent } from "./ui.js";
import { initOrders, advanceOrdersDay } from "./orders.js";
import { initDevTools } from "./dev.js";
import { startNewDay } from "./events.js";
import { initEconomy, renderEconomy, advanceDeliveries, addInventory } from "./economy.js";
import { initEquipment, renderEquipment } from "./equipment.js";
import { initExpansion, renderExpansion, advanceExpansionDay } from "./expansion.js";
import { initFeaturePack, renderFeaturePack, advanceFeaturePackDay, getMarketMultiplier } from "./featurepack.js";
import { initMilestones, renderMilestones } from "./progression.js";

let state = loadGame();

// Миграция сохранений: старые партии не теряют прогресс.
state.reputation ??= 0;

state.orders ??= {
  offers: [],
  active: [],
  completed: 0,
  failed: 0
};

state.orders.offers ??= [];
state.orders.active ??= [];
state.orders.completed ??= 0;
state.orders.failed ??= 0;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function save() {
  saveGame(state);
}

function notify(message) {
  reactGrishkaToEvent(message);
  const container = $("#notifications");
  if (!container) return;

  const item = document.createElement("div");
  item.className = "notification";
  item.textContent = message;
  container.prepend(item);

  while (container.children.length > 8) {
    container.lastChild.remove();
  }
}

function render() {
  renderAll(state);
  renderEconomy(state);
  renderEquipment(state);
  renderExpansion(state);
  renderFeaturePack(state);
  renderMilestones(state);
  renderAdvisor(state);
  save();
}

function showGame() {
  $("#intro")?.classList.add("hidden");
  $("#game")?.classList.remove("hidden");
}

function showTab(tabId) {
  $$(".tab-content").forEach((section) => {
    section.classList.toggle("hidden", section.id !== tabId);
  });

  $$("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });
}

// Переезд в деревню
$("#startGame")?.addEventListener("click", () => {
  state.gameStarted = true;
  showGame();
  showTab("home");
  render();

  notify("Вы приехали. Автобус уехал. Обратного билета, разумеется, нет.");
  notify("Бабушкин дом ждёт. Кажется, он даже немного осел от радости.");
});

// При загрузке сохранённой игры
if (state.gameStarted) {
  showGame();
} else {
  $("#intro")?.classList.remove("hidden");
  $("#game")?.classList.add("hidden");
}

// Переключение разделов
$$("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    showTab(button.dataset.tab);
  });
});

// Опыт и уровень
function earnExperience(amount) {
  const oldLevel = state.level;
  addXP(state, amount);

  if (state.level > oldLevel) {
    notify(`Новый уровень: ${state.level}! Вы стали опытнее. Почти специалист.`);
  }
}

// Подключение доски заказов.
initOrders(state, {
  notify,
  render,
  earnExperience
});

initDevTools(state, { render, notify });
initEconomy(state, { render, notify });
initEquipment(state, { render, notify });
initExpansion(state, { render, notify, earnExperience });
initFeaturePack(state, { render, notify, earnExperience });
initMilestones(state, { renderGame: render, notify, earnExperience });

// Продажа товаров — кнопки создаются в ui.js
$("#marketItems")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-sell]");
  if (!button) return;

  const itemId = button.dataset.sell;
  const item = ITEMS.find((entry) => entry.id === itemId);

  if (!item) return;

  const quantity = state.inventory[itemId] || 0;

  if (quantity <= 0) {
    notify("Продавать нечего. Покупатели уже начали терять к вам интерес.");
    return;
  }

  const multiplier = (state.skills.includes("bargain") ? 1.2 : 1) * getMarketMultiplier(state);
  const price = Math.round(item.price * multiplier);

  state.inventory[itemId] -= 1;
  state.money += price;

  earnExperience(state.skills.includes("regulars") ? 8 : 5);

  notify(`${item.emoji} Продано: ${item.name}. Получено ${price} монет.`);
  render();
});

// Сбор овощей
$("#harvestVegetables")?.addEventListener("click", () => {
  if (state.energy < 5) {
    notify("Нет сил. Даже картошка сегодня выглядит энергичнее вас.");
    return;
  }

  if (state.garden < 20) {
    notify("Сначала приведите огород в порядок.");
    return;
  }

  const bonus = state.skills.includes("green_thumb") ? 2 : 0;
  const harvestBonus = state.skills.includes("big_harvest") ? 2 : 0;

  const harvested = addInventory(state, "potato", 2 + bonus + harvestBonus)
    + addInventory(state, "carrot", 1 + (bonus ? 1 : 0))
    + addInventory(state, "cabbage", 1);

  state.energy -= 5;
  earnExperience(10);

  notify(harvested > 0 ? `Урожай собран: ${harvested} единиц. Земля пока не требует долю.` : "Склад забит под завязку. Сначала продайте или используйте запасы.");
  render();
});

// Расчистка огорода
$("#repairGarden")?.addEventListener("click", () => {
  const cost = state.skills.includes("handyman") ? 15 : 20;

  if (state.money < cost) {
    notify("Не хватает денег. Сорняки пока победили.");
    return;
  }

  state.money -= cost;
  state.garden = Math.min(100, state.garden + 30);

  notify("Грядки расчищены. Вы нашли три камня и старую ложку.");
  render();
});

// Восстановление сада
$("#restoreOrchard")?.addEventListener("click", () => {
  if (state.orchardRestored) {
    notify("Сад уже восстановлен. Деревья не нуждаются в повторном ремонте.");
    return;
  }

  const cost = state.skills.includes("handyman") ? 30 : 40;

  if (state.money < cost) {
    notify("Не хватает денег на расчистку сада.");
    return;
  }

  state.money -= cost;
  state.orchardRestored = true;
  state.trees = state.skills.includes("orchard_lore") ? 5 : 3;

  earnExperience(20);

  notify("Сад восстановлен! Яблони снова верят в светлое будущее.");
  render();
});

// Сбор фруктов
$("#harvestFruit")?.addEventListener("click", () => {
  if (!state.orchardRestored) {
    notify("Сначала расчистите сад. Сейчас там урожай собирают только комары.");
    return;
  }

  if (state.energy < 5) {
    notify("Сил нет. До яблок ещё нужно дотянуться.");
    return;
  }

  const bonus = state.skills.includes("big_harvest") ? 2 : 0;

  const fruitHarvested = addInventory(state, "apple", state.trees + bonus)
    + addInventory(state, "pear", Math.max(1, Math.floor(state.trees / 2)) + bonus);

  state.energy -= 5;
  earnExperience(12);

  notify(fruitHarvested > 0 ? `Собрано фруктов: ${fruitHarvested}. Одно яблоко вы съели по дороге — для контроля качества.` : "Склад забит. Фрукты пока придётся оставить на деревьях.");
  render();
});

// Ремонт дома
$("#repairHouse")?.addEventListener("click", () => {
  const cost = state.skills.includes("handyman") ? 20 : 30;

  if (state.money < cost) {
    notify("На ремонт не хватает денег.");
    return;
  }

  if (state.house >= 100) {
    notify("Дом уже в порядке. Теперь можно чинить самооценку.");
    return;
  }

  state.money -= cost;
  state.house = Math.min(100, state.house + 20);

  earnExperience(5);
  notify("Дом стал уютнее. Сквозняк отступил к окну.");
  render();
});

// Ремонт сарая
$("#repairBarn")?.addEventListener("click", () => {
  const cost = state.skills.includes("handyman") ? 20 : 30;

  if (state.money < cost) {
    notify("Не хватает денег на ремонт сарая.");
    return;
  }

  if (state.barn >= 100) {
    notify("Сарай уже отремонтирован.");
    return;
  }

  state.money -= cost;
  state.barn = Math.min(100, state.barn + 25);

  earnExperience(5);
  notify("Сарай укреплён. Теперь крыша падает только по праздникам.");
  render();
});

// Ремонт аппарата
$("#repairStill")?.addEventListener("click", () => {
  const cost = state.skills.includes("handyman") ? 35 : 50;

  if (state.money < cost) {
    notify("Не хватает денег на ремонт оборудования.");
    return;
  }

  if (state.still >= 100) {
    notify("Аппарат уже в полном порядке.");
    return;
  }

  state.money -= cost;
  state.still = Math.min(100, state.still + 30);

  earnExperience(8);
  notify("Аппарат починен. Он издал звук, похожий на одобрение.");
  render();
});

// Производство браги
$("#startBatch")?.addEventListener("click", () => {
  if (!state.skills.includes("ferment")) {
    notify("Нужно изучить навык «Основы брожения».");
    return;
  }

  if (state.production.active || state.production.ready) {
    notify("Сначала разберитесь с текущей партией.");
    return;
  }

  if (state.money < 10) {
    notify("Не хватает денег на ингредиенты.");
    return;
  }

  if (state.energy < 10) {
    notify("Вы слишком устали.");
    return;
  }

  state.money -= 10;
  state.energy -= 10;

  state.production.active = true;
  state.production.ready = false;
  state.production.daysLeft =
    state.skills.includes("patient_master") ? 1 : 2;

  notify("Брага поставлена. Теперь главное — не перепутать её с компотом.");
  render();
});

// Забрать готовую брагу
$("#collectBatch")?.addEventListener("click", () => {
  if (!state.production.ready) {
    notify("Брага ещё не готова.");
    return;
  }

  const quantity = state.skills.includes("clean_barrel") ? 5 : 3;

  const collected = addInventory(state, "braga", quantity);
  state.production.active = false;
  state.production.ready = false;
  state.production.daysLeft = 0;

  earnExperience(15);
  notify(`На склад помещено ${collected} из ${quantity} единиц браги. Бабушка бы одобрила. Наверное.`);
  render();
});

// Сон и переход к следующему дню
$("#sleepButton")?.addEventListener("click", () => {
  state.day += 1;
    advanceOrdersDay(state, notify);
  advanceDeliveries(state, notify);
  advanceExpansionDay(state, notify);
  advanceFeaturePackDay(state, notify);

  const hungerLoss = state.skills.includes("country_life") ? 5 : 10;
  const warmthLoss = state.skills.includes("country_life") ? 2 : 5;
  const energyGain = state.skills.includes("good_sleep") ? 100 : 70;

  state.hunger = Math.max(0, state.hunger - hungerLoss);
  state.warmth = Math.max(0, state.warmth - warmthLoss);
  state.energy = Math.min(100, state.energy + energyGain);

  if (state.production.active) {
    state.production.daysLeft -= 1;

    if (state.production.daysLeft <= 0) {
      state.production.active = false;
      state.production.ready = true;
      notify("Брага готова! В сарае пахнет успехом и дрожжами.");
    }
  }

  if (state.hunger === 0) {
    state.energy = Math.max(0, state.energy - 10);
    notify("Вы голодны. Желудок уже рассматривает вариант увольнения.");
  }

  if (state.warmth === 0) {
    state.energy = Math.max(0, state.energy - 10);
    notify("Вы замёрзли. Надо бы заняться домом, а не только бизнесом.");
  }

  earnExperience(5);

  startNewDay(state, notify);
  render();
});

// Изучение навыков — кнопки создаются в ui.js
$("#skillTree")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-skill]");
  if (!button) return;

  const skillId = button.dataset.skill;
  const skill = SKILL_BRANCHES
    .flatMap(branch => branch.skills)
    .find(entry => entry.id === skillId);

  if (!skill) return;

  if (state.skills.includes(skillId)) {
    notify("Этот навык уже изучен. ");
    return;
  }

  if (skill.requires && !state.skills.includes(skill.requires)) {
    notify("Сначала изучите предыдущий навык этой ветки.");
    return;
  }

  if (state.skillPoints < skill.cost) {
    notify("Не хватает очков навыков. Пора работать и получать опыт.");
    return;
  }

  state.skillPoints -= skill.cost;
  state.skills.push(skillId);

  notify(`Изучен навык «${skill.name}»!`);
  render();
});

// Первичная отрисовка и автосохранение
render();

setInterval(save, 15000);
window.addEventListener("beforeunload", save);
