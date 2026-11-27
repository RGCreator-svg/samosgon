import { consumeQualityForSale } from "./quality.js";
import { advanceGameDay } from "./gameLoop.js";

import { loadGame, saveGame, addXP } from "./engine.js";
import { ITEMS, SKILL_BRANCHES } from "./data.js";
import { renderAll, renderAdvisor, reactGrishkaToEvent } from "./ui.js";
import { initOrders, advanceOrdersDay } from "./orders.js";
import { initDevTools } from "./dev.js";
import { startNewDay } from "./events.js";
import { initEconomy, renderEconomy, advanceDeliveries, addInventory, removeInventory, queuePurchase, registerCartHandler } from "./economy.js";
import { initEquipment, renderEquipment } from "./equipment.js";
import { initExpansion, renderExpansion, advanceExpansionDay } from "./expansion.js";
import { initFeaturePack, renderFeaturePack, advanceFeaturePackDay, getMarketMultiplier } from "./featurepack.js";
import { initMilestones, renderMilestones } from "./progression.js";
import { initWorld, renderWorld, advanceWorldDay, getWorldYieldMultiplier, getWorldColdPenalty } from "./world.js";
import { initViticulture, renderViticulture, advanceViticultureDay } from "./viticulture.js";
import { initProductionHub, renderProductionHub, recordProduction } from "./productionhub.js";
import { initResearchLab, renderResearchLab, advanceResearchLabDay } from "./researchlab.js";
import { initProcessCenter, renderProcessCenter } from "./processcenter.js";

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
  renderWorld(state);
  renderViticulture(state);
  renderProductionHub(state);
  renderResearchLab(state);
  renderProcessCenter(state);
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

// Единый делегированный обработчик работает и для вкладок,
 // которые подключаются динамически отдельными игровыми модулями.
$(".navigation")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tab]");
  if (!button) return;
  showTab(button.dataset.tab);
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
initWorld(state, { render, notify });
initViticulture(state, { render, notify });
initProductionHub(state);
initResearchLab(state, { render, notify, earnExperience });
initProcessCenter(state, { render, notify, earnExperience });
registerCartHandler("homesteadRepair",(current,item)=>{
  const action=item.payload.action;
  if(action==="house"){current.house=Math.min(100,current.house+20*item.quantity);earnExperience(5*item.quantity);}
  if(action==="barn"){current.barn=Math.min(100,current.barn+25*item.quantity);earnExperience(5*item.quantity);}
  if(action==="still"){current.still=Math.min(100,current.still+30*item.quantity);earnExperience(8*item.quantity);}
  if(action==="garden")current.garden=Math.min(100,current.garden+30*item.quantity);
  if(action==="orchard"&&!current.orchardRestored){current.orchardRestored=true;current.trees=current.skills.includes("orchard_lore")?5:3;earnExperience(20);}
  if(action==="basicBatch"&&!current.production.active&&!current.production.ready){current.energy=Math.max(0,current.energy-10);current.production.active=true;current.production.ready=false;current.production.daysLeft=current.skills.includes("patient_master")?1:2;}
});

// Журнал событий всегда находится внизу игрового экрана, после динамических вкладок.
const eventConsole = $("#notifications")?.closest(".event-console");
if (eventConsole) $("#game")?.append(eventConsole);

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
  const quality = consumeQualityForSale(state,itemId,1);
  const price = Math.round(item.price * multiplier * quality.multiplier);

  removeInventory(state, itemId, 1, { consumeQuality: false });
  state.money += price;

  earnExperience(state.skills.includes("regulars") ? 8 : 5);

  notify(`${item.emoji} Продано: ${item.name}. Получено ${price} монет${quality.hasPassport? " · качество "+quality.quality+"/100 ("+quality.grade.label+")":""}.`);
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

  const seasonYield = getWorldYieldMultiplier(state, "vegetable");
  const harvested = addInventory(state, "potato", Math.max(1, Math.round((2 + bonus + harvestBonus) * seasonYield)))
    + addInventory(state, "carrot", Math.max(1, Math.round((1 + (bonus ? 1 : 0)) * seasonYield)))
    + addInventory(state, "cabbage", Math.max(1, Math.round(seasonYield)));

  state.energy -= 5;
  earnExperience(10);

  notify(harvested > 0 ? `Урожай собран: ${harvested} единиц. Земля пока не требует долю.` : "Склад забит под завязку. Сначала продайте или используйте запасы.");
  render();
});

// Расчистка огорода через единую корзину.
$("#repairGarden")?.addEventListener("click", () => {
  const cost=state.skills.includes("handyman")?15:20;
  queuePurchase(state,{key:"repair:garden:"+state.garden,kind:"homesteadRepair",name:"Расчистка огорода",cost,payload:{action:"garden"}});
  notify("Расчистка огорода добавлена в общую корзину.");render();
});

// Восстановление сада через единую корзину.
$("#restoreOrchard")?.addEventListener("click", () => {
  if(state.orchardRestored)return;
  const cost=state.skills.includes("handyman")?30:40;
  queuePurchase(state,{key:"repair:orchard",kind:"homesteadRepair",name:"Восстановление сада",cost,payload:{action:"orchard"}});
  notify("Восстановление сада добавлено в общую корзину.");render();
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

  const seasonYield = getWorldYieldMultiplier(state, "fruit");
  const fruitHarvested = addInventory(state, "apple", Math.max(1, Math.round((state.trees + bonus) * seasonYield)))
    + addInventory(state, "pear", Math.max(1, Math.round((Math.max(1, Math.floor(state.trees / 2)) + bonus) * seasonYield)));

  state.energy -= 5;
  earnExperience(12);

  notify(fruitHarvested > 0 ? `Собрано фруктов: ${fruitHarvested}. Одно яблоко вы съели по дороге — для контроля качества.` : "Склад забит. Фрукты пока придётся оставить на деревьях.");
  render();
});

// Ремонт дома через единую корзину.
$("#repairHouse")?.addEventListener("click", () => {
  if(state.house>=100)return;
  const cost=state.skills.includes("handyman")?20:30;
  queuePurchase(state,{key:"repair:house:"+state.house,kind:"homesteadRepair",name:"Ремонт дома",cost,payload:{action:"house"}});
  notify("Ремонт дома добавлен в общую корзину.");render();
});

// Ремонт сарая через единую корзину.
$("#repairBarn")?.addEventListener("click", () => {
  if(state.barn>=100)return;
  const cost=state.skills.includes("handyman")?20:30;
  queuePurchase(state,{key:"repair:barn:"+state.barn,kind:"homesteadRepair",name:"Ремонт сарая",cost,payload:{action:"barn"}});
  notify("Ремонт сарая добавлен в общую корзину.");render();
});

// Ремонт аппарата через единую корзину.
$("#repairStill")?.addEventListener("click", () => {
  if(state.still>=100)return;
  const cost=state.skills.includes("handyman")?35:50;
  queuePurchase(state,{key:"repair:still:"+state.still,kind:"homesteadRepair",name:"Ремонт аппарата",cost,payload:{action:"still"}});
  notify("Ремонт аппарата добавлен в общую корзину.");render();
});

// Запуск базовой партии браги через общую корзину.
$("#startBatch")?.addEventListener("click", () => {
  if(!state.skills.includes("ferment")){notify("Нужно изучить навык «Основы брожения».");return;}
  if(state.production.active||state.production.ready){notify("Сначала разберитесь с текущей партией.");return;}
  if(state.energy<10){notify("Вы слишком устали.");return;}
  queuePurchase(state,{key:"basic-batch",kind:"homesteadRepair",name:"Запуск базовой партии браги",cost:10,payload:{action:"basicBatch"}});
  notify("Запуск браги добавлен в общую корзину.");render();
});

// Забрать готовую брагу
$("#collectBatch")?.addEventListener("click", () => {
  if (!state.production.ready) {
    notify("Брага ещё не готова.");
    return;
  }

  const quantity = state.skills.includes("clean_barrel") ? 5 : 3;

  const collected = addInventory(state, "braga", quantity);
  if (collected > 0) recordProduction(state, { name: "Базовая брага", amount: collected, item: "braga", process: "Брожение" });
  state.production.active = false;
  state.production.ready = false;
  state.production.daysLeft = 0;

  earnExperience(15);
  notify(`На склад помещено ${collected} из ${quantity} единиц браги. Бабушка бы одобрила. Наверное.`);
  render();
});

// Сон и переход к следующему дню. Защищаем переход от двойного клика
// и откатываем состояние, если один из дневных модулей выбросил ошибку.
let sleepInProgress = false;
$("#sleepButton")?.addEventListener("click", (event) => {
  event.preventDefault();
  if (sleepInProgress) return;

  const sleepButton = $("#sleepButton");
  const snapshot = JSON.stringify(state);
  sleepInProgress = true;
  if (sleepButton) sleepButton.disabled = true;

  try {
    advanceGameDay(state, {
      notify,
      earnExperience,
      advanceOrdersDay,
      advanceDeliveries,
      advanceExpansionDay,
      advanceWorldDay,
      advanceResearchLabDay,
      advanceFeaturePackDay,
      advanceViticultureDay,
      getWorldColdPenalty,
      startNewDay
    });
    render();
  } catch (error) {
    console.error("Не удалось завершить игровой день:", error);
    const restored = JSON.parse(snapshot);
    // Не заменяем объект state: игровые модули хранят ссылку на него.
    Object.keys(state).forEach(key => delete state[key]);
    Object.assign(state, restored);
    render();
    notify("Не получилось завершить день: изменения отменены. Попробуйте ещё раз.");
  } finally {
    sleepInProgress = false;
    const button = $("#sleepButton");
    if (button) button.disabled = false;
  }
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
