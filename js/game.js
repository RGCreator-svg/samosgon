import { consumeQualityForSale } from "./quality.js";
import { initImportedFarmAnimations } from "./farmAnimations.js";
import { advanceGameDay } from "./gameLoop.js";
import { discoverRepairStory, renderGrandmaNotes, runGrandmaQuestDev, runPetrovichEncounterDev } from "./grandmaNotes.js";

import { loadGame, saveGame, addXP } from "./engine.js";
import { ITEMS, SKILL_BRANCHES } from "./data.js";
import { renderAll, renderAdvisor, reactGrishkaToEvent } from "./ui.js";
import { initOrders, advanceOrdersDay } from "./orders.js";
import { initDevTools } from "./dev.js";
import { startNewDay } from "./events.js";
import { initEconomy, renderEconomy, advanceDeliveries, addInventory, removeInventory, queuePurchase, queuePart, registerCartHandler, PARTS } from "./economy.js";
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
import { renderCurrentTasks } from "./tasks.js";

let state = loadGame();
// Старые сохранения получают поэтапное состояние деталей дома без потери общего прогресса.
state.houseParts ??= { roof: Number(state.house)||0, walls: Number(state.house)||0, windows: Number(state.house)||0, floor: Number(state.house)||0, heating: Number(state.house)||0 };
state.farmPlots ??= ["needs_water","needs_weed","needs_fertilize"];
state.guardDog ??= false;
state.farmPlotCooldowns ??= {};

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
const $all = (selector) => document.querySelectorAll(selector);

const HOMESTEAD_REPAIRS = {
  house: { name:"Ремонт дома", button:"#repairHouse", baseCost:30, discountedCost:20, parts:{ timber:1, fasteners:1, paint:1 }, progress:20, xp:5 },
  barn: { name:"Ремонт сарая", button:"#repairBarn", baseCost:30, discountedCost:20, parts:{ timber:2, fasteners:1, paint:1 }, progress:25, xp:5 },
  still: { name:"Ремонт аппарата", button:"#repairStill", baseCost:50, discountedCost:35, parts:{ metal:1, fasteners:1, tools:1 }, progress:30, xp:8 },
  garden: { name:"Расчистка огорода", button:"#repairGarden", baseCost:20, discountedCost:15, parts:{ timber:1, fasteners:1 }, progress:30, xp:0 },
  orchard: { name:"Восстановление сада", button:"#restoreOrchard", baseCost:40, discountedCost:30, parts:{ timber:2, fasteners:1, tools:1 }, progress:0, xp:20 },
  house_roof: { name:"Ремонт крыши", button:'[data-house-part="roof"]', baseCost:30, discountedCost:20, parts:{ timber:2, fasteners:1, paint:1 }, progress:25, xp:3 },
  house_walls: { name:"Укрепление стен", button:'[data-house-part="walls"]', baseCost:35, discountedCost:25, parts:{ timber:2, fasteners:2, paint:1 }, progress:25, xp:4 },
  house_windows: { name:"Установка окон", button:'[data-house-part="windows"]', baseCost:25, discountedCost:18, parts:{ timber:1, fasteners:1, paint:1 }, progress:25, xp:3 },
  house_floor: { name:"Ремонт пола", button:'[data-house-part="floor"]', baseCost:25, discountedCost:18, parts:{ timber:2, fasteners:1 }, progress:25, xp:3 },
  house_heating: { name:"Установка отопления", button:'[data-house-part="heating"]', baseCost:40, discountedCost:30, parts:{ metal:1, fasteners:1, tools:1 }, progress:25, xp:5 }
};

function save() {
  const saved = saveGame(state);
  const indicator = $("#saveStatus");
  if (indicator) {
    if (saved) {
      const time = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      indicator.textContent = "✓ Сохранено";
      indicator.dataset.status = "saved";
      indicator.title = "Последнее сохранение: " + time;
    } else {
      indicator.textContent = "⚠ Ошибка сохранения";
      indicator.dataset.status = "error";
      indicator.title = "Браузер не смог записать сохранение. Проверьте свободное место и настройки приватности.";
    }
  }
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
  const eventCount = document.querySelector("#eventCount");
  if (eventCount) eventCount.textContent = String(container.children.length);
}

const FARM_ACTION_DELAY_MS = 10000;
const MAX_FARM_PLOTS = 12;
const FARM_PLOT_EXPANSION_COST = 100;
const FARM_CROPS = {
  potato: { name: "Картофель", emoji: "🥔", item: "potato", image: "assets/images/farm/crops/potato.png" },
  carrot: { name: "Морковь", emoji: "🥕", item: "carrot", image: "assets/images/farm/crops/carrot.png" },
  cabbage: { name: "Капуста", emoji: "🥬", item: "cabbage", image: "assets/images/farm/crops/cabbage.png" },
  tomato: { name: "Помидоры", emoji: "🍅", item: "tomato", image: "assets/images/farm/crops/tomato.png" },
  cucumber: { name: "Огурцы", emoji: "🥒", item: "cucumber", image: "assets/images/farm/crops/cucumber.png" },
  beet: { name: "Свёкла", emoji: "🫜", item: "beet", image: "assets/images/farm/crops/beet.png" },
  pepper: { name: "Перец", emoji: "🫑", item: "pepper", image: "assets/images/farm/crops/pepper.png" },
  pumpkin: { name: "Тыква", emoji: "🎃", item: "pumpkin", image: "assets/images/farm/crops/pumpkin.png" },
  radish: { name: "Редис", emoji: "🔴", item: "radish", image: "assets/images/farm/crops/radish.png" }
};
state.farmCropTypes ??= {};
// Старые сохранения получат изображения для трёх стартовых культур.
const STARTER_CROPS = ["potato","carrot","cabbage"];
state.farmPlots.forEach((stage,index)=>{
  if(stage!=="empty"&&!state.farmCropTypes[index]){
    state.farmCropTypes[index]=STARTER_CROPS[index%STARTER_CROPS.length];
  }
});
function farmCooldownRemaining(index) {
  return Math.max(0,(Number(state.farmPlotCooldowns?.[index])||0)-Date.now());
}
function renderFarmPlots() {
  const plots=Array.isArray(state.farmPlots)?state.farmPlots:[];
  const container=$("#farmPlots");
  if(!container)return;
  const animal=container.querySelector(".farm-yard-animal");
  let buttons=[...container.querySelectorAll(".farm-plot")];
  while(buttons.length<plots.length){
    const button=document.createElement("button");
    button.type="button";button.className="farm-plot";
    button.innerHTML='<img class="farm-plot-ground" alt="" draggable="false"><img class="farm-plot-crop" alt="" draggable="false" hidden><img class="farm-plot-action" alt="" draggable="false" hidden>';
    container.insertBefore(button,animal||null);buttons.push(button);
  }
  while(buttons.length>plots.length){buttons.pop().remove();}
  const stages={empty:{label:"Выбрать семена",icon:""},needs_water:{label:"Полить грядку",icon:"need_water"},needs_weed:{label:"Прополоть грядку",icon:"need_weed"},needs_fertilize:{label:"Удобрить грядку",icon:"need_fertilize"},ready:{label:"Собрать урожай",icon:"need_take"}};
  buttons.forEach((plot,index)=>{
    const stage=stages[plots[index]]?plots[index]:"empty",info=stages[stage],remaining=farmCooldownRemaining(index);
    const cropInfo=FARM_CROPS[state.farmCropTypes[index]]||null;
    plot.dataset.plotIndex=String(index);plot.dataset.stage=stage;plot.dataset.cooldown=remaining>0?"true":"false";plot.dataset.cropType=state.farmCropTypes[index]||"none";
    plot.setAttribute("aria-label","Грядка "+(index+1)+": "+(cropInfo?cropInfo.name+". ":"")+info.label+(remaining>0?". Ожидание "+Math.ceil(remaining/1000)+" сек.":""));
    plot.title=(cropInfo?cropInfo.name+" · ":"")+info.label;
    const ground=plot.querySelector(".farm-plot-ground"),crop=plot.querySelector(".farm-plot-crop"),action=plot.querySelector(".farm-plot-action");
    if(ground)ground.src="assets/images/farm/"+(index%2?"land_2":"land_1")+".png";
    if(crop){crop.hidden=stage==="empty"||!cropInfo;crop.src=cropInfo?.image||"";crop.alt=cropInfo?.name||"Растение";}
    if(action){action.hidden=!info.icon;if(info.icon)action.src="assets/images/farm/"+info.icon+".png";}
    let timer=plot.querySelector(".farm-plot-timer");
    if(!timer){timer=document.createElement("span");timer.className="farm-plot-timer";timer.setAttribute("aria-live","off");plot.append(timer);}
    timer.hidden=remaining<=0;timer.textContent=remaining>0?Math.ceil(remaining/1000)+" с":"";
    plot.disabled=remaining>0;
  });
  const count=$("#farmPlotCount"),expand=$("#expandFarm");
  if(count)count.textContent="Грядки: "+plots.length+" / "+MAX_FARM_PLOTS;
  if(expand){expand.textContent=plots.length>=MAX_FARM_PLOTS?"✓ Огород расширен до максимума":"➕ Пристроить грядку · "+FARM_PLOT_EXPANSION_COST+" монет";expand.disabled=plots.length>=MAX_FARM_PLOTS||state.money<FARM_PLOT_EXPANSION_COST;}
}
setInterval(()=>{
  document.querySelectorAll(".farm-plot").forEach((plot,index)=>{
    const remaining=farmCooldownRemaining(index),timer=plot.querySelector(".farm-plot-timer");
    if(timer){timer.hidden=remaining<=0;timer.textContent=remaining>0?Math.ceil(remaining/1000)+" с":"";}
    plot.disabled=remaining>0;plot.dataset.cooldown=remaining>0?"true":"false";
  });
},250);

function renderGuardDog(){
  const post=$("#guardDogPost"),button=$("#guardDogAction"),status=$("#guardDogStatus");
  if(post)post.dataset.active=state.guardDog?"true":"false";
  if(button){button.disabled=Boolean(state.guardDog);button.textContent=state.guardDog?"✓ Будка построена · Барс охраняет дом":"🐕 Построить будку и нанять собаку · 120 монет";}
  if(status)status.textContent=state.guardDog?"Барс на посту! Ночью он сторожит двор и отгоняет мышей от запасов.":"Участок пока без охраны. Собака будет отгонять мышей от запасов.";
}
function render() {
  state.waterSystem ??= { level: 0 };
  renderGuardDog();
  renderAll(state);
  renderFarmPlots();
  renderHouseRepairDetails();
  renderAllRepairButtons();
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
  renderCurrentTasks(state);
  save();
}

function showGame() {
  $("#intro")?.classList.add("hidden");
  $("#game")?.classList.remove("hidden");
}

function showTab(tabId) {
  $all(".tab-content").forEach((section) => {
    section.classList.toggle("hidden", section.id !== tabId);
  });

  $all("[data-tab]").forEach((button) => {
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
const startButton = $("#startGame");
if (state.gameStarted) {
  showGame();
  showTab("home");
} else {
  $("#intro")?.classList.remove("hidden");
  $("#game")?.classList.add("hidden");
}
if (startButton && state.gameStarted) startButton.textContent = "Продолжить хозяйство";

// Единый делегированный обработчик работает и для вкладок,
 // которые подключаются динамически отдельными игровыми модулями.
// Строительство будки: делегированный обработчик не зависит от перемещения карточки интерфейсом.
document.addEventListener("click",(event)=>{
  const button=event.target.closest("#guardDogAction");
  if(!button)return;
  event.preventDefault();
  if(state.guardDog){notify("Барс уже на посту. Будка построена, повторная покупка не требуется.");return;}
  const cost=120,materials={timber:2,fasteners:1};
  state.parts ??= {};
  const balance=Number(state.money)||0;
  if(balance<cost){notify("Не хватает монет: для найма Барса нужно 120, сейчас у вас "+balance+". Материалы пока не списываются.");return;}
  const missing=Object.entries(materials).filter(([id,n])=>(Number(state.parts[id])||0)<n);
  if(missing.length){
    const details=missing.map(([id,n])=>(PARTS.find(p=>p.id===id)?.name||id)+" — нужно "+n+", на складе "+(Number(state.parts[id])||0));
    notify("Будку пока нельзя построить. Получите на склад усадьбы: "+details.join("; ")+". Откройте «Снабжение» → «Доставки» и нажмите «ЗАБРАТЬ ДЕТАЛИ НА СКЛАД».");
    return;
  }
  state.money=balance-cost;
  Object.entries(materials).forEach(([id,n])=>{state.parts[id]=(Number(state.parts[id])||0)-n;});
  state.guardDog=true;
  earnExperience(12);
  notify("Будка построена! 120 монет и материалы списаны со склада. Барс занял пост и теперь охраняет усадьбу.");
  render();
});

$("#game")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tab]");
  if (!button) return;
  showTab(button.dataset.tab);
});

// Основные разделы переключаются непосредственно кнопками навигации.
// Это сохраняет работу вкладок даже если вложенные панели перехватили всплытие клика.
$all(".navigation [data-tab]").forEach(button => {
  button.addEventListener("click", event => { event.stopPropagation(); showTab(button.dataset.tab); });
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
const startBasicBatchFromCart=(current)=>{
  if(current.production.active||current.production.ready)return;
  current.energy=Math.max(0,current.energy-10);
  current.production.active=true;
  current.production.ready=false;
  current.production.daysLeft=current.skills.includes("patient_master")?1:2;
};
registerCartHandler("basicBatch",startBasicBatchFromCart);
// Поддержка старых сохранений, где запуск браги ещё назывался homesteadRepair.
registerCartHandler("homesteadRepair",(current,item)=>{
  if(item.payload?.action==="basicBatch")startBasicBatchFromCart(current);
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

// Сбор овощей: общая кнопка и отдельные созревшие грядки используют одну механику.
function harvestVegetables(plotIndex=null) {
  if (state.energy < 5) { notify("Нет сил. Даже картошка сегодня выглядит энергичнее вас."); return false; }
  if (state.garden < 20) { notify("Сначала приведите огород в порядок."); return false; }
  const bonus=state.skills.includes("green_thumb")?2:0;
  const harvestBonus=state.skills.includes("big_harvest")?2:0;
  const seasonYield=getWorldYieldMultiplier(state,"vegetable");
  const amount=Math.max(1,Math.round((2+bonus+harvestBonus)*seasonYield));
  const cropId=Number.isInteger(plotIndex)?(FARM_CROPS[state.farmCropTypes[plotIndex]]?.item||"potato"):null;
  const harvested=Number.isInteger(plotIndex)
    ? addInventory(state,cropId,amount)
    : addInventory(state,"potato",amount)+addInventory(state,"carrot",Math.max(1,Math.round((1+(bonus?1:0))*seasonYield)))+addInventory(state,"cabbage",Math.max(1,Math.round(seasonYield)));
  state.energy-=5;earnExperience(10);
  if(harvested>0&&Number.isInteger(plotIndex)){state.farmPlots[plotIndex]="empty";delete state.farmCropTypes[plotIndex];state.farmPlotCooldowns[plotIndex]=Date.now()+FARM_ACTION_DELAY_MS;}
  notify(harvested>0?`Урожай собран: ${harvested} единиц. Земля пока не требует долю.`:"Склад забит под завязку. Сначала продайте или используйте запасы.");
  render();return harvested>0;
}
$("#harvestVegetables")?.addEventListener("click",()=>harvestVegetables());
$("#farmPlots")?.addEventListener("click",event=>{
  const plot=event.target.closest(".farm-plot");
  if(!plot)return;
  const index=Number(plot.dataset.plotIndex);
  const stages=["empty","needs_water","needs_weed","needs_fertilize","ready"];
  const current=stages.includes(state.farmPlots[index])?state.farmPlots[index]:"empty";
  if(farmCooldownRemaining(index)>0)return;
  if(current==="ready"){const harvested=harvestVegetables(index);if(harvested)plot.classList.add("is-harvesting");return;}
  if(current!=="empty"&&state.energy<1){notify("Нет сил ухаживать за грядкой. Отдохните до следующего дня.");return;}
  if(current==="empty"){
    const picker=$("#farmSeedPicker");
    if(picker){picker.dataset.plotIndex=String(index);picker.hidden=false;}
    return;
  }
  state.energy-=1;
  const next={needs_water:"needs_weed",needs_weed:"needs_fertilize",needs_fertilize:"ready"}[current];
  state.farmPlots[index]=next;
  state.farmPlotCooldowns[index]=Date.now()+FARM_ACTION_DELAY_MS;
  const messages={needs_weed:"Грядка полита. Теперь пора убрать сорняки.",needs_fertilize:"Сорняки убраны. Осталось подкормить растения.",ready:"Растения удобрены — урожай созрел!"};
  notify("Грядка "+(index+1)+": "+messages[next]+" Следующее действие через 10 секунд.");
  plot.classList.remove("is-changing");void plot.offsetWidth;plot.classList.add("is-changing");render();
});
$("#expandFarm")?.addEventListener("click",()=>{
  if(state.farmPlots.length>=MAX_FARM_PLOTS){notify("Огород уже расширен до максимума.");return;}
  if(state.money<FARM_PLOT_EXPANSION_COST){notify("Не хватает монет на новую грядку.");return;}
  state.money-=FARM_PLOT_EXPANSION_COST;
  state.farmPlots.push("empty");
  notify("Новая грядка пристыкована к огороду. Теперь участок больше!");
  render();
});
$("#farmSeedPicker")?.addEventListener("click",event=>{
  const cancel=event.target.closest("[data-seed-cancel]");
  const choice=event.target.closest("[data-seed]");
  const picker=$("#farmSeedPicker");
  if(cancel){picker.hidden=true;return;}
  if(!choice)return;
  const index=Number(picker.dataset.plotIndex),cropId=choice.dataset.seed;
  if(!Number.isInteger(index)||!FARM_CROPS[cropId])return;
  state.farmCropTypes[index]=cropId;
  state.farmPlots[index]="needs_water";
  state.farmPlotCooldowns[index]=Date.now()+FARM_ACTION_DELAY_MS;
  picker.hidden=true;
  notify("Грядка "+(index+1)+": посажен "+FARM_CROPS[cropId].name.toLowerCase()+". Следующее действие через 10 секунд.");
  const plot=document.querySelector('.farm-plot[data-plot-index="'+index+'"]');
  plot?.classList.remove("is-changing");if(plot){void plot.offsetWidth;plot.classList.add("is-changing");}
  render();
});

// Единые требования для ремонта и восстановления построек.

function repairCost(config) {
  return state.skills.includes("handyman") ? config.discountedCost : config.baseCost;
}
function repairIsComplete(action) {
  if(action==="orchard")return Boolean(state.orchardRestored);
  if(action.startsWith("house_"))return Number(state.houseParts?.[action.slice(6)])>=100;
  return Number(state[action])>=100;
}
function pendingPartBreakdown(partId) {
  const inCart=Number(state.materialCart?.[partId])||0;
  const deliveries=(state.deliveries||[]).filter(item=>item.partId===partId);
  const arrived=deliveries.filter(item=>item.arrivalDay<=state.day).reduce((sum,item)=>sum+(Number(item.quantity)||0),0);
  const inTransit=deliveries.filter(item=>item.arrivalDay>state.day).reduce((sum,item)=>sum+(Number(item.quantity)||0),0);
  return {inCart,arrived,inTransit,total:inCart+arrived+inTransit};
}
function pendingPartQuantity(partId) {
  return pendingPartBreakdown(partId).total;
}
function getRepairMissing(parts) {
  return Object.entries(parts).reduce((missing,[id,required])=>{
    const amount=Math.max(0,Number(required)-(Number(state.parts?.[id])||0));
    if(amount)missing[id]=amount;
    return missing;
  },{});
}
function renderRepairButton(action) {
  const config=HOMESTEAD_REPAIRS[action];
  const button=$(config.button);
  if(!button)return;
  const complete=repairIsComplete(action);
  const cost=repairCost(config);
  const missing=getRepairMissing(config.parts);
  const notYetOrdered=Object.entries(missing).reduce((out,[id,qty])=>{
    const remaining=Math.max(0,qty-pendingPartQuantity(id));
    if(remaining)out[id]=remaining;
    return out;
  },{});
  const allPending=Object.keys(missing).length>0&&Object.keys(notYetOrdered).length===0;
  if(complete){button.textContent="✓ Готово";button.disabled=true;return;}
  if(!Object.keys(missing).length){
    button.textContent=`🔨 Выполнить работу — ${cost} монет`;
    button.disabled=Number(state.money)<cost;
    return;
  }
  if(allPending){
    const queued=Object.entries(missing).every(([id,qty])=>pendingPartBreakdown(id).inCart>=qty);
    const arrived=Object.entries(missing).every(([id,qty])=>pendingPartBreakdown(id).inCart+pendingPartBreakdown(id).arrived>=qty);
    button.textContent=queued
      ?"🛒 Материалы в корзине — оплатите заказ"
      :arrived?"📦 Доставка прибыла — заберите материалы"
      :"⏳ Материалы в пути — дождитесь доставки";
    button.disabled=true;
  }else{
    button.textContent="🛒 Добавить недостающие материалы в корзину";
    button.disabled=false;
  }
}
function renderHouseRepairDetails() {
  renderRepairButton("house");
  const details=$("#houseRepairDetails");
  if(!details)return;
  const config=HOMESTEAD_REPAIRS.house;
  const cost=repairCost(config);
  details.replaceChildren();
  const work=document.createElement("p");
  work.className="repair-work-cost";
  work.textContent=`Работа: ${cost} монет`;
  const materials=document.createElement("p");
  const materialsTitle=document.createElement("strong");
  materialsTitle.textContent="Материалы:";
  materials.append(materialsTitle);
  const list=document.createElement("ul");
  for(const [id,qty] of Object.entries(config.parts)){
    const part=PARTS.find(item=>item.id===id);
    const stock=Number(state.parts?.[id])||0;
    const line=document.createElement("li");
    line.textContent=`${part?.name||id} × ${qty} (на складе: ${stock})`;
    list.append(line);
  }
  const status=document.createElement("p");
  const missing=getRepairMissing(config.parts);
  if(!Object.keys(missing).length)status.textContent="Все материалы на складе. Ремонт можно выполнить.";
  else {
    const inCart=Object.entries(missing).reduce((sum,[id,qty])=>sum+Math.min(qty,pendingPartBreakdown(id).inCart),0);
    const arrived=Object.entries(missing).reduce((sum,[id,qty])=>sum+Math.min(qty,pendingPartBreakdown(id).arrived),0);
    const inTransit=Object.entries(missing).reduce((sum,[id,qty])=>sum+Math.min(qty,pendingPartBreakdown(id).inTransit),0);
    status.textContent=inCart
      ? "Недостающие материалы находятся в корзине. Оплатите заказ, затем дождитесь доставки."
      : arrived
        ? "Доставка прибыла. Откройте «Снабжение» → «Доставка» и нажмите «Забрать детали на склад»."
        : inTransit
          ? "Материалы оплачены и находятся в пути. Ремонт станет доступен после получения."
          : "Материалов не хватает. Добавьте недостающее в корзину и оплатите заказ — ремонт начнётся только после получения доставки и отдельного нажатия кнопки ремонта.";
  }
  const skill=document.createElement("p");
  const hasSkill=state.skills.includes("handyman");
  skill.className=hasSkill?"repair-skill learned":"repair-skill";
  skill.textContent=hasSkill?"Навык «Руки из плеч» изучен: стоимость работы снижена до 20 монет.":"Навык «Руки из плеч» не изучен: доступен как улучшение для снижения стоимости работы до 20 монет.";
  details.append(work,materials,list,status,skill);
}
function renderAllRepairButtons(){
  Object.keys(HOMESTEAD_REPAIRS).forEach(renderRepairButton);
  renderHousePartProgress();
}
function renderHousePartProgress(){
  const parts=state.houseParts||{};
  const names={roof:"крыши",walls:"стен",windows:"окон",floor:"пола",heating:"отопления"};
  for(const id of ["roof","walls","windows","floor","heating"]){
    const value=Math.max(0,Math.min(100,Number(parts[id])||0));
    const label=$("#housePartValue-"+id);if(label)label.textContent=value+"%";
    const card=$(`[data-house-part-card="${id}"]`);
    if(!card)continue;
    card.dataset.stage=value>=100?"complete":value>0?"repairing":"damaged";
    const button=card.querySelector("[data-house-part]");
    if(!button)continue;
    const config=HOMESTEAD_REPAIRS["house_"+id];
    const missing=getRepairMissing(config.parts);
    const queued=Object.entries(missing).some(([partId])=>pendingPartBreakdown(partId).inCart>0);
    const arrived=Object.entries(missing).some(([partId])=>pendingPartBreakdown(partId).arrived>0);
    const inTransit=Object.entries(missing).some(([partId])=>pendingPartBreakdown(partId).inTransit>0);
    const allAvailable=Object.keys(missing).length===0;
    button.disabled=value>=100||(!allAvailable&&(queued||arrived||inTransit));
    button.textContent=value>=100?"✓ Готово":allAvailable
      ? "🔨 Выполнить ремонт · "+repairCost(config)+" монет"
      : arrived?"📦 Заберите детали в «Снабжении»"
      : queued?"🛒 Оплатите заказ в корзине"
      : inTransit?"⏳ Ожидайте доставку"
      :"🧰 Заказать недостающие детали";
    let hint=card.querySelector(".house-part-status");
    if(!hint){hint=document.createElement("small");hint.className="house-part-status";button.insertAdjacentElement("afterend",hint);}
    hint.textContent=value>=100?"Этап завершён":allAvailable
      ?"Материалы на складе — нажмите кнопку, чтобы закончить работу."
      :arrived?"Снабжение → Доставка → «Забрать всё». Затем вернитесь сюда и нажмите «Выполнить ремонт»."
      :queued?"Откройте корзину закупок и оплатите заказ."
      :inTransit?"Материалы уже оплачены. Они появятся в доставках после указанного срока."
      :"Нажмите кнопку, чтобы добавить недостающее в корзину.";
  }
}

// Если материалов не хватает — в корзину попадает только недостающее.
// Работа и материалы со склада списываются исключительно в момент ремонта.
function queueHomesteadRepair(action) {
  const config=HOMESTEAD_REPAIRS[action];
  if(!config||repairIsComplete(action))return;
  state.parts ??= {};
  state.skills ??= [];
  state.deliveries ??= [];
  state.materialCart ??= {};
  const missing=getRepairMissing(config.parts);
  if(Object.keys(missing).length){
    const added={};
    Object.entries(missing).forEach(([id,qty])=>{
      const amount=Math.max(0,qty-pendingPartQuantity(id));
      if(amount){queuePart(state,id,amount);added[id]=amount;}
    });
    const summary=Object.entries(added).map(([id,qty])=>(PARTS.find(part=>part.id===id)?.name||id)+" × "+qty).join(", ");
    notify(summary
      ? `${config.name}: добавлены недостающие материалы в корзину (${summary}). Работа пока не оплачивается.`
      : `${config.name}: материалы уже заказаны. Дождитесь доставки и заберите их на склад.`);
    render();
    return;
  }
  const cost=repairCost(config);
  if(Number(state.money)<cost){
    notify(`Для работы «${config.name}» нужно ${cost} монет. Материалы не списаны.`);
    return;
  }
  Object.entries(config.parts).forEach(([id,qty])=>{state.parts[id]-=qty;});
  state.money-=cost;
  if(action==="house"){state.house=Math.min(100,state.house+config.progress);earnExperience(config.xp);}
  if(action.startsWith("house_")){
    const part=action.slice(6);state.houseParts??={roof:state.house,walls:state.house,windows:state.house,floor:state.house,heating:state.house};
    state.houseParts[part]=Math.min(100,(Number(state.houseParts[part])||0)+config.progress);
    state.house=Math.round(["roof","walls","windows","floor","heating"].reduce((sum,id)=>sum+Math.max(0,Math.min(100,Number(state.houseParts[id])||0)),0)/5);
    earnExperience(config.xp);
  }
  if(action==="barn"){state.barn=Math.min(100,state.barn+config.progress);earnExperience(config.xp);}
  if(action==="still"){state.still=Math.min(100,state.still+config.progress);earnExperience(config.xp);}
  if(action==="garden"){state.garden=Math.min(100,state.garden+config.progress);}
  if(action==="orchard"){state.orchardRestored=true;state.trees=state.skills.includes("orchard_lore")?5:3;earnExperience(config.xp);}
  if(["house","barn","still","garden","orchard"].includes(action)||action.startsWith("house_")){
    discoverRepairStory(state,action.startsWith("house_")?"house":action,notify);
  }
  notify(`${config.name} выполнен. Работа: ${cost} монет; материалы списаны со склада.`);
  render();
}

// Расчистка огорода: инструменты, доски и крепёж.
$("#repairGarden")?.addEventListener("click", () => {
  queueHomesteadRepair("garden");
});

// Восстановление сада: инструменты, доски и крепёж.
$("#restoreOrchard")?.addEventListener("click", () => {
  if(state.orchardRestored)return;
  queueHomesteadRepair("orchard");
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
  queueHomesteadRepair("house");
});

// Делегируем клики на document: карточки ремонта могут перемещаться
// между панелями при инициализации экономики, поэтому #home не всегда их предок.
document.addEventListener("click", (event) => {
  const button=event.target.closest("[data-house-part]");
  if(!button)return;
  queueHomesteadRepair("house_"+button.dataset.housePart);
});

// Ремонт сарая: доски, гвозди и краска.
$("#repairBarn")?.addEventListener("click", () => {
  if(state.barn>=100)return;
  queueHomesteadRepair("barn");
});

// Ремонт аппарата: металлические заготовки, крепёж и инструменты.
$("#repairStill")?.addEventListener("click", () => {
  if(state.still>=100)return;
  queueHomesteadRepair("still");
});

// Запуск базовой партии браги через общую корзину.
$("#startBatch")?.addEventListener("click", () => {
  if(!state.skills.includes("ferment")){notify("Нужно изучить навык «Основы брожения».");return;}
  if(state.production.active||state.production.ready){notify("Сначала разберитесь с текущей партией.");return;}
  if(state.energy<10){notify("Вы слишком устали.");return;}
  queuePurchase(state,{key:"basic-batch",kind:"basicBatch",name:"Запуск базовой партии браги",cost:10,payload:{action:"basicBatch"}});
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
function advanceDayFromControl(event) {
  event.preventDefault();
  if (sleepInProgress) return;
  const trigger = event.currentTarget;
  const snapshot = JSON.stringify(state);
  sleepInProgress = true;
  $("#sleepButton") && ($("#sleepButton").disabled = true);
  $("#advanceDayShortcut") && ($("#advanceDayShortcut").disabled = true);
  if (trigger) trigger.disabled = true;

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
    Object.keys(state).forEach(key => delete state[key]);
    Object.assign(state, restored);
    render();
    notify("Не получилось завершить день: изменения отменены. Попробуйте ещё раз.");
  } finally {
    sleepInProgress = false;
    if ($("#sleepButton")) $("#sleepButton").disabled = false;
    if ($("#advanceDayShortcut")) $("#advanceDayShortcut").disabled = false;
  }
}
$("#sleepButton")?.addEventListener("click", advanceDayFromControl);
$("#advanceDayShortcut")?.addEventListener("click", advanceDayFromControl);

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
initImportedFarmAnimations();
render();

setInterval(save, 15000);
window.addEventListener("beforeunload", save);
window.addEventListener("pagehide", save);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") save();
});
