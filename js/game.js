import { consumeQualityForSale } from "./quality.js";
import { advanceGameDay } from "./gameLoop.js";
import { discoverRepairStory, renderGrandmaNotes, runGrandmaQuestDev, runPetrovichEncounterDev } from "./grandmaNotes.js";

import { loadGame, saveGame, addXP } from "./engine.js";
import { ITEMS, SKILL_BRANCHES } from "./data.js";
import { renderAll, renderAdvisor, reactGrishkaToEvent } from "./ui.js";
import { initOrders, advanceOrdersDay } from "./orders.js";
import { initDevTools } from "./dev.js";
import { startNewDay } from "./events.js";
import { initEconomy, renderEconomy, advanceDeliveries, addInventory, removeInventory, queuePurchase, registerCartHandler, PARTS } from "./economy.js";
import { initEquipment, renderEquipment } from "./equipment.js";
import { initExpansion, renderExpansion, advanceExpansionDay } from "./expansion.js";
import { initFeaturePack, renderFeaturePack, advanceFeaturePackDay, getMarketMultiplier } from "./featurepack.js";
import { initMilestones, renderMilestones } from "./progression.js";
import { initWorld, renderWorld, advanceWorldDay, getWorldYieldMultiplier, getWorldColdPenalty } from "./world.js";
import { initViticulture, renderViticulture, advanceViticultureDay } from "./viticulture.js";
import { initProductionHub, renderProductionHub, recordProduction } from "./productionhub.js";
import { initResearchLab, renderResearchLab, advanceResearchLabDay } from "./researchlab.js";
import { initProcessCenter, renderProcessCenter } from "./processcenter.js";
import { initProductionPlant, renderProductionPlant, advanceProductionPlantDay } from "./productionplant.js";
import { initCellar, renderCellar, ageBarrelsOneDay } from "./cellar.js";
import { initGamePresentation } from "./gamePresentation.js";

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
  state.waterSystem ??= { level: 0 };
  renderAll(state);
  renderHouseRepairDetails();
  renderWaterDevelopment();
  renderGrandmaNotes(state, notify, render);
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
  renderProductionPlant(state);
  renderCellar(state);
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
  window.dispatchEvent(new CustomEvent("samosgon:tab-change", { detail: tabId }));
}

// Поэтапное развитие водоснабжения: колодец → насос → водонапорная башня.
state.waterSystem ??= { level: 0 };
function renderWaterDevelopment() {
  const level=Math.max(0,Math.min(3,Number(state.waterSystem?.level)||0));
  const stages=[
    {name:"Колодец",desc:"Собственная шахта с доступом к грунтовой воде.",cost:60,parts:{timber:2,tools:1},skill:null,button:"⛏ Вырыть колодец"},
    {name:"Насосная система",desc:"Механический насос подаёт воду к грядкам и постройкам.",cost:180,parts:{metal:2,pump:1},skill:"handyman",button:"⚙️ Установить насос"},
    {name:"Водонапорная башня",desc:"Резервуар создаёт запас и стабильное давление воды.",cost:500,parts:{metal:5,pump:2,controller:1},skill:"modular_systems",button:"🏗️ Построить водонапорную башню"}
  ];
  const status=$("#wellDevelopmentStatus"),details=$("#wellDevelopmentDetails"),button=$("#wellDevelopmentAction");
  if(!status||!details||!button)return;
  status.textContent=level===3?"Водоснабжение полностью развито: водонапорная башня обеспечивает запас воды и давление.":stages[level].desc;
  details.replaceChildren();
  if(level===3){button.textContent="✓ Водоснабжение улучшено";button.disabled=true;return;}
  const stage=stages[level];
  const materialNames={timber:"пиломатериалы",tools:"набор инструментов",metal:"металлические заготовки",pump:"насосный модуль",controller:"контроллер автоматики"};
  const skillName={handyman:"«Руки из плеч»",modular_systems:"«Модульные системы»"};
  const skill=document.createElement("p");skill.className="water-requirement";
  skill.textContent="Навык: "+(stage.skill?(skillName[stage.skill]+" — обязателен"):"специальный навык не требуется");
  const materials=document.createElement("p");materials.className="water-requirement";
  materials.textContent="Материалы: "+Object.entries(stage.parts).map(([id,n])=>materialNames[id]+" × "+n+" (на складе: "+(Number(state.parts?.[id])||0)+")").join(", ");
  const cost=document.createElement("p");cost.className="water-requirement";cost.textContent="Работа: "+stage.cost+" монет";
  const effect=document.createElement("p");effect.className="water-requirement";effect.textContent="Эффект после строительства: "+((level+1)*4)+"% к урожайности огорода и "+((level+1)*2)+"% к урожайности сада.";details.append(skill,materials,cost,effect);
  button.textContent=stage.button;button.disabled=!!(stage.skill&&!state.skills.includes(stage.skill));
  button.dataset.waterUpgrade=String(level+1);
}
$("#wellDevelopmentAction")?.addEventListener("click",()=>{
  const level=Math.max(0,Math.min(3,Number(state.waterSystem?.level)||0));
  const stages=[
    {cost:60,parts:{timber:2,tools:1},skill:null,name:"Колодец"},
    {cost:180,parts:{metal:2,pump:1},skill:"handyman",name:"Насосная система"},
    {cost:500,parts:{metal:5,pump:2,controller:1},skill:"modular_systems",name:"Водонапорная башня"}
  ];
  const stage=stages[level];if(!stage)return;
  if(stage.skill&&!state.skills.includes(stage.skill)){notify("Для этого этапа нужен навык: "+stage.skill+".");return;}
  if(state.money<stage.cost){notify("Для строительства «"+stage.name+"» нужно "+stage.cost+" монет.");return;}
  const missing=Object.entries(stage.parts).filter(([id,n])=>(Number(state.parts?.[id])||0)<n);
  if(missing.length){notify("Не хватает материалов для «"+stage.name+"»: "+missing.map(([id,n])=>(PARTS.find(p=>p.id===id)?.name||id)+" × "+(n-(Number(state.parts?.[id])||0))).join(", ")+".");return;}
  state.money-=stage.cost;Object.entries(stage.parts).forEach(([id,n])=>{state.parts[id]-=n;});
  state.waterSystem.level=level+1;
  earnExperience([15,30,60][level]);
  notify("Готово: "+stage.name+" построен. Затраты: "+stage.cost+" монет; материалы списаны со склада.");
  render();
});

// Переезд в деревню
$("#startGame")?.addEventListener("click", () => {
  state.gameStarted = true;
  showGame();
  showTab("home");
  render();

  notify("Вы приехали. Автобус уехал. Обратного билета, разумеется, нет.");
  notify("Бабушкин дом ждёт. Кажется, он даже немного осел от радости.");
});

// Каждый запуск начинается с титульного экрана. Сохранение загружается,
// но игрок сам решает, когда перейти к хозяйству.
$("#intro")?.classList.remove("hidden");
$("#game")?.classList.add("hidden");
const startButton = $("#startGame");
if (startButton && state.gameStarted) startButton.textContent = "Продолжить хозяйство";

// Единый делегированный обработчик работает и для вкладок,
 // которые подключаются динамически отдельными игровыми модулями.
$("#game")?.addEventListener("click", (event) => {
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

initDevTools(state, { render, notify, onStoryTest: (area) => { discoverRepairStory(state, area, notify); render(); }, onQuestTest: () => { runGrandmaQuestDev(state, notify); render(); }, onPetrovichTest: () => { runPetrovichEncounterDev(state, notify); render(); }, onEquipmentTest: () => { const ids=["dimroth_condenser","shell_condenser","direct_cooler","glass_column","copper_column","stainless_column","insulated_column","liquid_takeoff","vapor_takeoff","auto_takeoff","digital_sensor","flow_meter","copper_mesh","stainless_mesh"]; state.equipmentTier=4; state.equipmentModuleInventory??=[]; ids.forEach(id=>{if(!state.equipmentModules.includes(id)&&!state.equipmentModuleInventory.includes(id))state.equipmentModuleInventory.push(id);}); render(); notify("DEV: новые модули оборудования выданы на склад. Можно собирать разные конфигурации."); } });
initEconomy(state, { render, notify });
initEquipment(state, { render, notify });
initExpansion(state, { render, notify, earnExperience });
initFeaturePack(state, { render, notify, earnExperience });
initMilestones(state, { renderGame: render, notify, earnExperience });
initWorld(state, { render, notify });
initViticulture(state, { render, notify });
initProductionHub(state, { notify });
initResearchLab(state, { render, notify, earnExperience });
initProcessCenter(state, { render, notify, earnExperience });
initProductionPlant(state, { render, notify, earnExperience });
initCellar(state, { render, notify });
initGamePresentation();
registerCartHandler("homesteadRepair",(current,item)=>{
  const action=item.payload.action;
  if(action==="house"){current.house=Math.min(100,current.house+20*item.quantity);earnExperience(5*item.quantity);}
  if(action==="barn"){current.barn=Math.min(100,current.barn+25*item.quantity);earnExperience(5*item.quantity);}
  if(action==="still"){current.still=Math.min(100,current.still+30*item.quantity);earnExperience(8*item.quantity);}
  if(action==="garden")current.garden=Math.min(100,current.garden+30*item.quantity);
  if(action==="orchard"&&!current.orchardRestored){current.orchardRestored=true;current.trees=current.skills.includes("orchard_lore")?5:3;earnExperience(20);}
  if(action==="basicBatch"&&!current.production.active&&!current.production.ready){current.energy=Math.max(0,current.energy-10);current.production.active=true;current.production.ready=false;current.production.daysLeft=current.skills.includes("patient_master")?1:2;}
  if(["house","barn","still","garden","orchard"].includes(action)) {
    discoverRepairStory(current,action,notify);
    // Сад расчищается одной крупной операцией, поэтому за неё открываются
    // несколько связанных страниц из садовой части бабушкиного архива.
    if(action==="orchard") {
      discoverRepairStory(current,action,notify);
      discoverRepairStory(current,action,notify);
    } else if(item.quantity>1 && Math.random()<0.22) {
      discoverRepairStory(current,action,notify);
    }
  }
});

// Журнал остаётся внутри .game-footer-dock рядом с тыквой.
 // Не переносить его в #game: это разрывает общий flex-контейнер и ломает расположение.

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

// Показываем стоимость работы, материалы и влияние навыка прямо на экране дома.
function renderHouseRepairDetails() {
  const details=$("#houseRepairDetails");
  const button=$("#repairHouse");
  if(!details||!button)return;
  const hasSkill=state.skills.includes("handyman");
  const cost=hasSkill?20:30;
  button.textContent=state.house>=100?"✓ Дом полностью отремонтирован":`🔨 Отремонтировать дом — ${cost} монет`;
  button.disabled=state.house>=100;
  details.replaceChildren();
  const work=document.createElement("p");
  work.className="repair-work-cost";
  work.textContent=`Работа: ${cost} монет`;
  const materials=document.createElement("p");
  materials.innerHTML="<strong>Материалы:</strong> Пиломатериалы × 1, Крепёж и гвозди × 1, Краска × 1";
  const skill=document.createElement("p");
  skill.className=hasSkill?"repair-skill learned":"repair-skill";
  skill.textContent=hasSkill?"Навык «Руки из плеч» изучен: стоимость работы снижена до 20 монет.":"Навык «Руки из плеч» не изучен: доступен как улучшение для снижения стоимости ремонта до 20 монет.";
  details.append(work,materials,skill);
}

// Работа оплачивается сразу, а в общую корзину попадают только нужные материалы.
function queueHomesteadRepair(action, name, cost, parts) {
  const key = "repair:" + action + ":" + (action === "orchard" ? "restore" : state[action]);
  state.purchaseCart ??= [];
  if (state.purchaseCart.some(item => item.key === key)) {
    notify("Этот ремонт уже ожидает материалы в корзине.");
    return;
  }
  if ((Number(state.money) || 0) < cost) {
    notify(`Для работы нужно ${cost} монет. Сейчас денег не хватает.`);
    return;
  }
  state.money -= cost;
  queuePurchase(state, { key, kind:"homesteadRepair", name, cost:0, parts, payload:{ action } });
  const materialNames=Object.fromEntries(PARTS.map(part=>[part.id,part.name]));
  const materialSummary=Object.entries(parts).map(([id,qty])=>(materialNames[id]||id)+" × "+qty).join(", ");
  const skillSummary=state.skills.includes("handyman")?"Навык «Руки из плеч» изучен: действует скидка на работу.":"Навык «Руки из плеч» не изучен: доступен как улучшение для снижения стоимости ремонта.";
  notify(`${name}. Работа: ${cost} монет. Материалы: ${materialSummary}. ${skillSummary} Материалы добавлены в корзину, работа оплачена отдельно.`);
  render();
}

// Расчистка огорода: инструменты, доски и крепёж.
$("#repairGarden")?.addEventListener("click", () => {
  const cost=state.skills.includes("handyman")?15:20;
  queueHomesteadRepair("garden", "Расчистка огорода", cost, { timber:1, fasteners:1 });
});

// Восстановление сада: инструменты, доски и крепёж.
$("#restoreOrchard")?.addEventListener("click", () => {
  if(state.orchardRestored)return;
  const cost=state.skills.includes("handyman")?30:40;
  queueHomesteadRepair("orchard", "Восстановление сада", cost, { timber:2, fasteners:1, tools:1 });
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

// Ремонт дома: доски, гвозди и краска.
$("#repairHouse")?.addEventListener("click", () => {
  if(state.house>=100)return;
  const cost=state.skills.includes("handyman")?20:30;
  queueHomesteadRepair("house", "Ремонт дома", cost, { timber:1, fasteners:1, paint:1 });
});

// Ремонт сарая: доски, гвозди и краска.
$("#repairBarn")?.addEventListener("click", () => {
  if(state.barn>=100)return;
  const cost=state.skills.includes("handyman")?20:30;
  queueHomesteadRepair("barn", "Ремонт сарая", cost, { timber:2, fasteners:1, paint:1 });
});

// Ремонт аппарата: металлические заготовки, крепёж и инструменты.
$("#repairStill")?.addEventListener("click", () => {
  if(state.still>=100)return;
  const cost=state.skills.includes("handyman")?35:50;
  queueHomesteadRepair("still", "Ремонт аппарата", cost, { metal:1, fasteners:1, tools:1 });
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
      advanceProductionPlantDay,
      ageBarrelsOneDay,
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
