import { queuePurchase, registerCartHandler } from "./economy.js";
export const EQUIPMENT_TIERS = [
  { name:"Бабушкин аппарат", description:"Старенький, капризный, но семейная реликвия.", cost:0, parts:{}, workshop:0, laboratory:0, skill:null },
  { name:"Восстановленная установка", description:"Надёжная базовая игровая установка.", cost:350, parts:{timber:3,metal:3,tools:1}, workshop:1, laboratory:0, skill:"old_still" },
  { name:"Медная установка", description:"Более высокий класс оборудования.", cost:900, parts:{metal:8,tools:2,pump:1}, workshop:2, laboratory:0, skill:"precision_assembly" },
  { name:"Модульная установка", description:"Поддерживает дополнительные узлы и расширенный контроль.", cost:1800, parts:{metal:12,pump:2,controller:1}, workshop:3, laboratory:1, skill:"modular_systems" },
  { name:"Ректификационная колонна", description:"Финальная технологическая ступень хозяйства.", cost:4500, parts:{metal:20,pump:3,controller:3,tools:3}, workshop:3, laboratory:2, skill:"column_master" }
];
export const AUTOMATION_TIERS = [
  {name:"Ручное управление",description:"Все операции выполняются вручную.",cost:0,parts:{},workshop:0,laboratory:0,skill:null},
  {name:"Базовые датчики",description:"Игровые датчики следят за состоянием участка.",cost:500,parts:{metal:3,controller:1},workshop:1,laboratory:0,skill:"automation_basics"},
  {name:"Автоматический контроль",description:"Система помогает следить за запасами и состоянием оборудования.",cost:1300,parts:{metal:6,controller:2,pump:1},workshop:2,laboratory:1,skill:"auto_control"},
  {name:"Умное хозяйство",description:"Продвинутая игровая автоматизация процессов.",cost:2800,parts:{metal:10,controller:3,pump:2,tools:2},workshop:3,laboratory:2,skill:"full_automation"}
];
export const EQUIPMENT_MODULES = [{"id":"airlock","name":"Гидрозатвор","group":"Брожение","tier":0,"cost":90,"parts":{"metal":1},"desc":"Стабильность брожения; меньше случайных потерь качества."},{"id":"ferment_thermo","name":"Термометр ферментера","group":"Брожение","tier":1,"cost":140,"parts":{"metal":1,"tools":1},"desc":"Контроль состояния сахарной, фруктовой и зерновой браги."},{"id":"cooling_jacket","name":"Охлаждающая рубашка","group":"Брожение","tier":2,"cost":420,"parts":{"metal":3,"pump":1},"desc":"Снижает штрафы качества от нестабильного брожения."},{"id":"mixer","name":"Мешалка ферментера","group":"Брожение","tier":2,"cost":360,"parts":{"metal":2,"tools":1},"desc":"Поддержка плотного зернового и фруктового сусла."},{"id":"sugar_tank","name":"Смесительный бак","group":"Подготовка сырья","tier":1,"cost":180,"parts":{"metal":1,"timber":1},"desc":"Специализированный игровой модуль для сахарной браги."},{"id":"fruit_filter","name":"Фильтр фруктового сусла","group":"Подготовка сырья","tier":1,"cost":220,"parts":{"metal":2,"tools":1},"desc":"Улучшает игровой профиль фруктового сырья."},{"id":"grain_screen","name":"Зерновая корзина","group":"Подготовка сырья","tier":2,"cost":380,"parts":{"metal":3,"tools":1},"desc":"Модуль обработки зерновых партий; снижает штраф за плотное сырьё."},{"id":"false_bottom","name":"Перфорированное фальшдно","group":"Подготовка сырья","tier":2,"cost":440,"parts":{"metal":4},"desc":"Дополнительный модуль зернового производственного контура."},{"id":"copper_head","name":"Медный шлем","group":"Дистилляция","tier":1,"cost":320,"parts":{"metal":3,"tools":1},"desc":"Ароматный профиль для фруктовых и зерновых партий."},{"id":"lyne_arm","name":"Паропровод и лебединая шея","group":"Дистилляция","tier":1,"cost":260,"parts":{"metal":2},"desc":"Открывает классическую конфигурацию перегонного аппарата."},{"id":"basic_condenser","name":"Холодильник-конденсатор","group":"Дистилляция","tier":0,"cost":120,"parts":{"metal":1},"desc":"Базовый модуль охлаждения игрового аппарата."},{"id":"sight_glass","name":"Смотровое окно","group":"Дистилляция","tier":2,"cost":300,"parts":{"metal":1,"tools":1},"desc":"Визуальный контроль состояния игровой линии."},{"id":"plate_column","name":"Тарельчатая секция","group":"Ректификация","tier":3,"cost":850,"parts":{"metal":6,"tools":2,"pump":1},"desc":"Промежуточная ступень между ароматной перегонкой и глубокой ректификацией."},{"id":"dephlegmator","name":"Дефлегматор","group":"Ректификация","tier":3,"cost":760,"parts":{"metal":4,"pump":1},"desc":"Открывает игровой возврат флегмы и настройку чистоты профиля."},{"id":"packed_column","name":"Насадочная колонна","group":"Ректификация","tier":4,"cost":1450,"parts":{"metal":8,"tools":2,"pump":2},"desc":"Продвинутая игровая ступень ректификации для нейтрального профиля."},{"id":"auto_cooling","name":"Автоматический контур охлаждения","group":"Автоматика","tier":3,"cost":920,"parts":{"metal":4,"pump":2,"controller":1},"desc":"Стабилизирует качество и уменьшает износ в игровых расчётах."},{"id":"fraction_receiver","name":"Модульный приёмник фракций","group":"Автоматика","tier":3,"cost":680,"parts":{"metal":3,"controller":1},"desc":"Открывает расширенный игровой контроль результата партии."},{"id":"safety_monitor","name":"Блок датчиков и защиты","group":"Автоматика","tier":2,"cost":390,"parts":{"metal":2,"controller":1},"desc":"Игровой бонус к надёжности; не заменяет реальные системы безопасности."},{"id":"carbon_filter","name":"Финишный фильтр","group":"Финишная обработка","tier":3,"cost":540,"parts":{"metal":2,"tools":1},"desc":"Дополнительная игровая очистка нейтрального профиля."},{"id":"oak_module","name":"Бочка выдержки с контролем","group":"Финишная обработка","tier":2,"cost":460,"parts":{"timber":4,"metal":1},"desc":"Усиливает игровой бонус выдержки и ароматный профиль.",{"id":"dimroth_condenser","name":"Спиральный холодильный узел","group":"Охлаждение","tier":2,"cost":520,"parts":{"metal":3,"pump":1},"desc":"Альтернативный игровой тип холодильного узла: стабильнее профиль партии, но требует обслуживания."},{"id":"shell_condenser","name":"Кожухотрубный холодильник","group":"Охлаждение","tier":3,"cost":740,"parts":{"metal":5,"pump":1},"desc":"Мощный вариант игрового охлаждения; повышает стабильность длинных партий."},{"id":"direct_cooler","name":"Прямоточный холодильник","group":"Охлаждение","tier":1,"cost":280,"parts":{"metal":2},"desc":"Компактная базовая альтернатива с небольшим бонусом к производительности."},{"id":"glass_column","name":"Стеклянная смотровая колонна","group":"Колонны и материалы","tier":2,"cost":620,"parts":{"metal":1,"tools":1},"desc":"Наглядная игровая конфигурация: улучшает анализ партии и открывает визуальный контроль."},{"id":"copper_column","name":"Медная колонная секция","group":"Колонны и материалы","tier":3,"cost":880,"parts":{"metal":5,"tools":2},"desc":"Ароматная специализация с бонусом для фруктовых и зерновых партий."},{"id":"stainless_column","name":"Нержавеющая колонная секция","group":"Колонны и материалы","tier":3,"cost":820,"parts":{"metal":6},"desc":"Универсальный и износостойкий игровой вариант."},{"id":"insulated_column","name":"Теплоизолированный кожух","group":"Колонны и материалы","tier":2,"cost":390,"parts":{"metal":2,"timber":1},"desc":"Снижает игровые колебания качества и износ установки."},{"id":"liquid_takeoff","name":"Жидкостный узел отбора","group":"Узлы отбора","tier":3,"cost":650,"parts":{"metal":3,"tools":1},"desc":"Игровой вариант узла отбора с повышенной повторяемостью результата."},{"id":"vapor_takeoff","name":"Паровой узел отбора","group":"Узлы отбора","tier":3,"cost":610,"parts":{"metal":3},"desc":"Альтернативная конфигурация с бонусом к выходу и более выраженными колебаниями качества."},{"id":"auto_takeoff","name":"Автоматический узел отбора","group":"Узлы отбора","tier":4,"cost":1080,"parts":{"metal":4,"controller":2,"pump":1},"desc":"Автоматизирует игровой учёт партий, повышает стабильность и снижает износ."},{"id":"digital_sensor","name":"Цифровой измерительный блок","group":"Контроль и измерение","tier":2,"cost":420,"parts":{"metal":1,"controller":1},"desc":"Точнее отображает игровые параметры партии и добавляет бонус к паспорту качества."},{"id":"flow_meter","name":"Индикатор потока","group":"Контроль и измерение","tier":3,"cost":560,"parts":{"metal":2,"controller":1},"desc":"Повышает повторяемость игрового результата при серийном производстве."},{"id":"copper_mesh","name":"Медная насадка","group":"Колонны и материалы","tier":2,"cost":460,"parts":{"metal":3},"desc":"Усиливает ароматный профиль фруктовых и зерновых партий."},{"id":"stainless_mesh","name":"Нержавеющая насадка","group":"Колонны и материалы","tier":2,"cost":430,"parts":{"metal":3},"desc":"Стабильная универсальная игровая насадка с бонусом к чистоте."}}];
const $=selector=>document.querySelector(selector);
function ensureState(s){
s.equipmentTier=Math.max(0,Number(s.equipmentTier)||0);
s.automationTier=Math.max(0,Number(s.automationTier)||0);
s.equipmentModules=Array.isArray(s.equipmentModules)?s.equipmentModules:[];
s.equipmentModuleInventory=Array.isArray(s.equipmentModuleInventory)?s.equipmentModuleInventory:[];
const occupied=new Set();
s.equipmentModules=s.equipmentModules.filter(id=>{
const slot=slotForModule(id);
if(!slot)return true;
if(occupied.has(slot.id)){if(!s.equipmentModuleInventory.includes(id))s.equipmentModuleInventory.push(id);return false;}
occupied.add(slot.id);return true;
});
s.equipmentModuleInventory=[...new Set(s.equipmentModuleInventory)].filter(id=>!s.equipmentModules.includes(id));
s.equipmentFinish ??="rustic";
if(!["rustic","copper","steel"].includes(s.equipmentFinish))s.equipmentFinish="rustic";
}
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function canAfford(s,t){return s.money>=t.cost&&(s.buildings.workshop||0)>=t.workshop&&(s.buildings.laboratory||0)>=t.laboratory&&(!t.skill||s.skills.includes(t.skill))&&Object.entries(t.parts).every(([id,n])=>(s.parts[id]||0)>=n);}
function requirements(t,s){const missing=[];if((s.buildings.workshop||0)<t.workshop)missing.push("мастерская "+t.workshop+" ур.");if((s.buildings.laboratory||0)<t.laboratory)missing.push("лаборатория "+t.laboratory+" ур.");if(t.skill&&!s.skills.includes(t.skill))missing.push("нужен навык");const p=Object.entries(t.parts).filter(([id,n])=>(s.parts[id]||0)<n).map(([id,n])=>id+" "+n);if(p.length)missing.push("детали: "+p.join(", "));return missing.length?missing.join(" · "):"Все требования выполнены";}
function renderTrack(root,tiers,current,s,action){root.replaceChildren();tiers.forEach((t,i)=>{const card=node("article","tech-card"+(i===current?" current":"")+(i<current?" completed":""));const body=node("div","tech-body");body.append(node("h4","",t.name),node("p","",t.description));if(i===current)body.append(node("span","tech-status","Текущий уровень"));if(i===current+1){body.append(node("p","tech-cost","Стоимость: "+t.cost+" монет"),node("p","tech-requirements",requirements(t,s)));const b=node("button","","Добавить улучшение в корзину");b.dataset.queueTech=action+":"+i;b.disabled=(s.buildings.workshop||0)<t.workshop||(s.buildings.laboratory||0)<t.laboratory||(t.skill&&!s.skills.includes(t.skill));body.append(b);}else if(i>current+1)body.append(node("small","tech-locked","Сначала откройте предыдущую ступень"));card.append(node("div","tech-marker",i<current?"✓":String(i+1)),body);root.append(card);});}
function canInstallModule(s,m){return (s.equipmentModules||[]).includes(m.id)||(s.equipmentModuleInventory||[]).includes(m.id)||(s.equipmentTier>=m.tier&&s.money>=m.cost&&Object.entries(m.parts).every(([id,n])=>(s.parts[id]||0)>=n));}
const EQUIPMENT_SLOTS=[
{id:"fermenter",name:"Ферментер",modules:["airlock","ferment_thermo","cooling_jacket"]},
{id:"boiler",name:"Куб и подготовка сырья",modules:["sugar_tank","fruit_filter","grain_screen","false_bottom","mixer"]},
{id:"head",name:"Шлем аппарата",modules:["copper_head"]},
{id:"vapor",name:"Паропровод",modules:["lyne_arm"]},
{id:"column",name:"Колонна",modules:["plate_column","packed_column","glass_column","copper_column","stainless_column"]},
{id:"dephlegmator",name:"Дефлегматор",modules:["dephlegmator"]},
{id:"packing",name:"Внутренняя конфигурация",modules:["copper_mesh","stainless_mesh","insulated_column"]},
{id:"condenser",name:"Холодильник",modules:["basic_condenser","dimroth_condenser","shell_condenser","direct_cooler"]},
{id:"receiver",name:"Приёмник продукта",modules:["fraction_receiver","liquid_takeoff","vapor_takeoff","auto_takeoff"]},
{id:"control",name:"Контроль и охлаждение",modules:["safety_monitor","auto_cooling","digital_sensor","flow_meter"]},
{id:"inspection",name:"Смотровой узел",modules:["sight_glass"]},
{id:"finish",name:"Финишная обработка",modules:["carbon_filter","oak_module"]}
];
function slotForModule(id){return EQUIPMENT_SLOTS.find(slot=>slot.modules.includes(id))||null;}
function moduleInSlot(s,slot){return (s.equipmentModules||[]).find(id=>slot.modules.includes(id))||null;}
let lastAssemblyModules=null;
let lastRemovedModule=null;
function renderEquipmentSlots(s){
const root=$("#equipmentSlots");if(!root)return;root.replaceChildren();
EQUIPMENT_SLOTS.forEach(slot=>{
const installed=moduleInSlot(s,slot);const released=lastRemovedModule&&slot.modules.includes(lastRemovedModule);const card=node("article","equipment-slot"+(installed?" occupied":"")+(released?" slot-release":""));card.dataset.slotId=slot.id;
card.append(node("h4","",slot.name));
if(installed){const mod=EQUIPMENT_MODULES.find(m=>m.id===installed);card.append(node("p","slot-installed",mod?mod.name:installed));const remove=node("button","module-remove","Освободить слот");remove.dataset.removeModule=installed;card.append(remove);}
else{card.append(node("p","slot-empty","Свободно"));const options=EQUIPMENT_MODULES.filter(m=>slot.modules.includes(m.id));const hint=node("small","slot-options",options.map(m=>m.name).join(" · "));card.append(hint);}
root.append(card);});
lastRemovedModule=null;
}
function renderModules(s){
const root=$("#moduleCatalog");if(!root)return;root.replaceChildren();
const groups=[...new Set(EQUIPMENT_MODULES.map(m=>m.group))];
groups.forEach(group=>{root.append(node("h3","module-group-title",group));const grid=node("div","module-grid");
EQUIPMENT_MODULES.filter(m=>m.group===group).forEach(m=>{
const owned=s.equipmentModules.includes(m.id);const slot=slotForModule(m.id);const occupant=slot?moduleInSlot(s,slot):null;const pending=slot?(s.purchaseCart||[]).find(item=>item.kind==="equipmentModule"&&slotForModule(item.payload?.id)?.id===slot.id):null;
const c=node("article","module-card"+(owned?" installed":""));
c.append(node("h4","",m.name),node("p","",m.desc),node("p","module-meta","Ступень аппарата: "+m.tier+" · "+m.cost+" монет"));
const parts=Object.entries(m.parts).map(([id,n])=>id+": "+n).join(" · ");c.append(node("small","module-parts",parts||"Без деталей"));
if(owned){c.append(node("span","tech-status","Установлен в слот: "+(slot?slot.name:"вспомогательный")));}
else{const stored=(s.equipmentModuleInventory||[]).includes(m.id);const b=node("button","",stored?"Установить со склада":"В корзину: купить модуль");b.dataset.installModule=m.id;const eligible=s.equipmentTier>=m.tier;const slotFree=!slot||(!occupant&&!pending);b.disabled=!eligible||!slotFree;c.append(b);if(stored)c.append(node("small","tech-status","Уже приобретён · повторная установка бесплатна"));
if(slot&&!slotFree)c.append(node("small","tech-locked",pending?"В корзине уже есть модуль для этого слота.":"Слот занят: "+(EQUIPMENT_MODULES.find(x=>x.id===occupant)?.name||occupant)));
else if(s.equipmentTier<m.tier)c.append(node("small","tech-locked","Сначала улучшите аппарат до нужной ступени."));}
grid.append(c);});root.append(grid);});
}
export function getEquipmentProfile(s,mashType="sugar"){
 const owned=new Set(s.equipmentModules||[]),has=id=>owned.has(id);
 let mode="pot",quality=0,output=0,flavour=0,stability=0,wear=0;
 if((has("plate_column")||has("glass_column")||has("copper_column")||has("stainless_column")||has("packed_column"))&&has("dephlegmator"))mode=has("packed_column")?"rectification":"hybrid";
 if(has("copper_head")||has("copper_column")||has("copper_mesh"))flavour+=8;
 if(has("sight_glass")||has("glass_column"))quality+=3;
 if(has("auto_cooling")||has("dimroth_condenser"))quality+=6;
 if(has("shell_condenser")){quality+=5;stability+=5;wear-=1;}
 if(has("direct_cooler")){output+=1;stability-=2;}
 if(has("fraction_receiver"))quality+=4;
 if(has("digital_sensor")){quality+=4;stability+=3;}
 if(has("flow_meter")||has("liquid_takeoff")){quality+=5;stability+=4;}
 if(has("vapor_takeoff")){output+=1;quality-=2;}
 if(has("auto_takeoff")){quality+=7;stability+=7;wear-=2;}
 if(has("stainless_column")||has("stainless_mesh")){quality+=4;stability+=3;}
 if(has("copper_mesh"))flavour+=6;
 if(has("copper_column"))flavour+=8;
 if(has("insulated_column")){quality+=3;stability+=5;wear-=1;}
 if(has("carbon_filter"))quality+=7;
 if(has("grain_screen")&&mashType==="grain")quality+=8;
 if(has("fruit_filter")&&mashType==="fruit")quality+=8;
 if(has("sugar_tank")&&mashType==="sugar")quality+=8;
 if(has("airlock"))quality+=3;
 if(has("cooling_jacket"))quality+=5;
 if(has("mixer")&&mashType!=="sugar")quality+=4;
 if(has("oak_module"))flavour+=6;
 if(mode==="hybrid"){quality+=8;output-=1;}
 if(mode==="rectification"){quality+=18;flavour-=8;}
 if(mashType==="fruit")flavour+=12;if(mashType==="grain")flavour+=8;if(mashType==="honey")flavour+=10;
 return {mode,quality,output,flavour,stability,wear,installed:owned.size};
}
function renderVisualAssembly(s){
  const root=$("#equipmentVisual");
  if(!root)return;
  const owned=new Set(s.equipmentModules||[]);
  const has=id=>owned.has(id);
  const tier=Math.max(0,Math.min(4,Number(s.equipmentTier)||0));
  const rect=has("packed_column")&&has("dephlegmator");
  const hybrid=!rect&&has("plate_column")&&has("dephlegmator");
  const column=["packed_column","plate_column","glass_column","copper_column","stainless_column"].some(has);
  const columnModule=["packed_column","plate_column","glass_column","copper_column","stainless_column"].find(has)||"plate_column";
  const copper=has("copper_head");
  const arm=has("lyne_arm");
  const condenser=["basic_condenser","dimroth_condenser","shell_condenser","direct_cooler"].some(has);
  const receiver=["fraction_receiver","liquid_takeoff","vapor_takeoff","auto_takeoff"].some(has);
  const glass=has("sight_glass");
  const sensor=["safety_monitor","auto_cooling","digital_sensor","flow_meter"].some(has);
  const cooling=["auto_cooling","cooling_jacket","dimroth_condenser","shell_condenser","direct_cooler"].some(has);
  const stage=rect?"Ректификационная колонна":hybrid?"Гибридный аппарат":tier>=2?"Улучшенный перегонный куб":"Старый перегонный куб";
  const status=rect?"Колонный режим":hybrid?"Гибридная конфигурация":copper&&condenser?"Перегонный аппарат": "Базовая конфигурация";
  const labels=[];
  if(copper)labels.push("медный шлем");
  if(arm)labels.push("паропровод");
  if(column)labels.push(({packed_column:"насадочная колонна",plate_column:"тарельчатая секция",glass_column:"стеклянная колонна",copper_column:"медная колонна",stainless_column:"нержавеющая колонна"})[columnModule]);
  if(has("dephlegmator"))labels.push("дефлегматор");
  if(condenser)labels.push(({dimroth_condenser:"спиральный холодильник",shell_condenser:"кожухотрубный холодильник",direct_cooler:"прямоточный холодильник",basic_condenser:"базовый холодильник"})[[...owned].find(id=>["dimroth_condenser","shell_condenser","direct_cooler","basic_condenser"].includes(id))]);
  if(has("liquid_takeoff"))labels.push("жидкостный узел");if(has("vapor_takeoff"))labels.push("паровой узел");if(has("auto_takeoff"))labels.push("автоматический отбор");
  if(receiver)labels.push("узел приёма");
  const peripheralModules={airlock:["◉","Гидрозатвор"],ferment_thermo:["🌡","Термометр"],cooling_jacket:["❄","Рубашка охлаждения"],mixer:["⟳","Мешалка"],sugar_tank:["▤","Смесительный бак"],fruit_filter:["◈","Фильтр сусла"],grain_screen:["▦","Зерновая корзина"],false_bottom:["▥","Фальшдно"],carbon_filter:["✧","Финишный фильтр"],oak_module:["▰","Бочка выдержки"]};
  const peripheralMarkup=[...owned].filter(id=>peripheralModules[id]).map(id=>`<span class="still-mounted-module" data-module-visual="${id}"><i>${peripheralModules[id][0]}</i><b>${peripheralModules[id][1]}</b></span>`).join("");
  const previousModules=lastAssemblyModules;
  root.innerHTML=`<div class="still-scene still-scene-2d" data-mode="${rect?"rectification":hybrid?"hybrid":"pot"}" data-finish="${s.equipmentFinish||"rustic"}">
    <div class="still-scene-heading"><div><span class="still-kicker">МАСТЕРСКАЯ · КОНСТРУКТОР</span><h3>${stage}</h3></div><span class="still-mode">${status}</span></div>
    <div class="still-workbench" role="img" aria-label="Анимированная 2D-модель аппарата с установленными модулями">
      <div class="workbench-wall"><span class="wall-pipe wall-pipe-one"></span><span class="wall-pipe wall-pipe-two"></span><span class="wall-hook"></span><span class="wall-shelf"></span></div>
      <div class="still-floor-shadow"></div>
      <div class="still-unit">
        ${column?`<div class="still-column ${rect?"packed":"plate"}" data-module-visual="${columnModule}"><i></i><i></i><i></i><i></i><span class="column-cap"></span></div>`:""}
        ${has("dephlegmator")?'<div class="still-dephlegmator" data-module-visual="dephlegmator"><span></span><i></i></div>':""}
        ${copper?'<div class="still-head" data-module-visual="copper_head"><span class="head-neck"></span><i class="head-rivet"></i></div>':'<div class="still-lid"></div>'}
        <div class="still-neck"></div>
        ${arm?'<div class="still-vapor-arm" data-module-visual="lyne_arm"><i></i><b></b></div>':""}
        ${condenser?'<div class="still-condenser" data-module-visual="basic_condenser"><i></i><i></i><i></i><i></i><i></i><span class="cool-water"></span></div>':""}
        <div class="still-boiler"><div class="boiler-rim"></div><div class="boiler-highlight"></div><div class="boiler-window ${glass?"active":""}" ${glass?'data-module-visual="sight_glass"':""}><i></i></div><div class="boiler-seam"></div><div class="boiler-leg leg-left"></div><div class="boiler-leg leg-right"></div><div class="boiler-tap"></div></div>
        ${sensor?'<div class="still-control" data-module-visual="safety_monitor"><i></i><b></b></div>':""}
        ${receiver?'<div class="still-receiver" data-module-visual="fraction_receiver"><span></span><i></i></div>':""}
        <div class="still-hose hose-left"></div><div class="still-hose hose-right"></div>
        <div class="still-steam steam-one"></div><div class="still-steam steam-two"></div><div class="still-steam steam-three"></div>
        ${cooling?'<div class="cooling-indicator" data-module-visual="auto_cooling"><i></i> ОХЛАЖДЕНИЕ</div>':""}
      </div>
      <div class="still-bench"></div>
      <div class="still-module-rack">${peripheralMarkup}</div>
      <div class="still-workbench-label"><span>УЗЕЛ № 01</span><b>${(s.equipmentModules||[]).length} МОДУЛЕЙ УСТАНОВЛЕНО</b><span>СИСТЕМА ${rect?"R-04":hybrid?"H-02":"P-01"}</span></div>
    </div>
    <div class="still-installed"><b>Конфигурация:</b><span>${labels.length?labels.join(" · "):"Базовый куб — установите модули, чтобы достроить аппарат."}</span></div>
    <div class="finish-picker"><b>Внешний вид</b><div class="finish-options"><button type="button" data-set-finish="rustic" class="${s.equipmentFinish==="rustic"?"selected":""}">🪵 Деревенский</button><button type="button" data-set-finish="copper" class="${s.equipmentFinish==="copper"?"selected":""}">🟠 Медный</button><button type="button" data-set-finish="steel" class="${s.equipmentFinish==="steel"?"selected":""}">⚙️ Стальной</button></div></div>
    <div class="still-progress"><span>Развитие оборудования</span><b>${tier+1} / 5 ступеней · ${(s.equipmentModules||[]).length} модулей</b></div>
    <div class="still-progress-track"><i style="width:${(tier+1)*20}%"></i></div>
  </div>`;
  const columnNode=root.querySelector(".still-column");
  if(columnNode){columnNode.classList.add(columnModule);if(has("glass_column"))columnNode.dataset.material="glass";else if(has("copper_column"))columnNode.dataset.material="copper";else if(has("stainless_column"))columnNode.dataset.material="steel";}
  const condenserNode=root.querySelector(".still-condenser");
  if(condenserNode){const kind=[...owned].find(id=>["dimroth_condenser","shell_condenser","direct_cooler"].includes(id))||"basic_condenser";condenserNode.classList.add(kind);condenserNode.dataset.moduleVisual=kind;}
  const receiverNode=root.querySelector(".still-receiver");
  if(receiverNode){const kind=[...owned].find(id=>["liquid_takeoff","vapor_takeoff","auto_takeoff"].includes(id))||"fraction_receiver";receiverNode.classList.add(kind);receiverNode.dataset.moduleVisual=kind;}
  const columnNode=root.querySelector(".still-column");
  if(columnNode){columnNode.classList.add(columnModule);if(has("glass_column"))columnNode.dataset.material="glass";else if(has("copper_column"))columnNode.dataset.material="copper";else if(has("stainless_column"))columnNode.dataset.material="steel";}
  const condenserNode=root.querySelector(".still-condenser");
  if(condenserNode){const kind=[...owned].find(id=>["dimroth_condenser","shell_condenser","direct_cooler"].includes(id))||"basic_condenser";condenserNode.classList.add(kind);condenserNode.dataset.moduleVisual=kind;}
  const receiverNode=root.querySelector(".still-receiver");
  if(receiverNode){const kind=[...owned].find(id=>["liquid_takeoff","vapor_takeoff","auto_takeoff"].includes(id))||"fraction_receiver";receiverNode.classList.add(kind);receiverNode.dataset.moduleVisual=kind;}
  if(previousModules){
    const added=[...owned].filter(id=>!previousModules.has(id));
    const removed=[...previousModules].filter(id=>!owned.has(id));
    added.forEach(id=>root.querySelectorAll(`[data-module-visual="${id}"]`).forEach(el=>el.classList.add("module-arrive")));
    if(removed.length)lastRemovedModule=removed[0];
  }
  lastAssemblyModules=new Set(owned);
}
export function renderEquipment(s){const equipment=$("#equipmentTrack"),automation=$("#automationTrack"),summary=$("#equipmentSummary");if(!equipment||!automation||!summary)return;renderVisualAssembly(s);renderEquipmentSlots(s);renderTrack(equipment,EQUIPMENT_TIERS,s.equipmentTier,s,"equipment");renderTrack(automation,AUTOMATION_TIERS,s.automationTier,s,"automation");summary.textContent="Оборудование: "+(EQUIPMENT_TIERS[s.equipmentTier]?.name||"неизвестно")+" · Автоматика: "+(AUTOMATION_TIERS[s.automationTier]?.name||"неизвестно")+" · Модулей: "+s.equipmentModules.length;renderModules(s);}
export function initEquipment(s,{render,notify}){ensureState(s);const nav=$(".navigation"),game=$("#game");if(!nav||!game)return;if(!$("#equipment")){const tab=node("button","","⚙️ Оборудование");tab.dataset.tab="equipment";nav.append(tab);const section=node("section","tab-content panel hidden");section.id="equipment";section.innerHTML='<h2>⚙️ Мастерская оборудования</h2><div id="equipmentVisual"></div><p>Собирай конфигурацию из модулей. Все эффекты ниже — игровые характеристики, а не инструкция по сборке реального оборудования.</p><div id="equipmentSummary" class="equipment-summary"></div><h3>Базовые ступени аппарата</h3><div id="equipmentTrack" class="tech-track"></div><h3>Автоматизация</h3><div id="automationTrack" class="tech-track"></div><h3>Посадочные места аппарата</h3><p>Каждый слот принимает только совместимые узлы. Чтобы заменить модуль, сначала освободи его место.</p><div id="equipmentSlots" class="equipment-slots"></div><h3>Каталог модулей и аксессуаров</h3><div id="moduleCatalog"></div>';game.append(section);}
registerCartHandler("equipmentModule",(current,item)=>{const mod=EQUIPMENT_MODULES.find(x=>x.id===item.payload?.id);if(!mod||current.equipmentModules.includes(mod.id))return;const slot=slotForModule(mod.id);if(slot&&moduleInSlot(current,slot))return;current.equipmentModules.push(mod.id);});
registerCartHandler("equipmentTier",(current,item)=>{if(EQUIPMENT_TIERS[current.equipmentTier+1])current.equipmentTier++;});
registerCartHandler("automationTier",(current,item)=>{if(AUTOMATION_TIERS[current.automationTier+1])current.automationTier++;});
$("#equipment").addEventListener("click",e=>{const queueTech=e.target.closest("[data-queue-tech]");if(queueTech){const [kind,index]=queueTech.dataset.queueTech.split(":");const tiers=kind==="equipment"?EQUIPMENT_TIERS:AUTOMATION_TIERS;const tier=tiers[Number(index)];if(!tier||(s.buildings.workshop||0)<tier.workshop||(s.buildings.laboratory||0)<tier.laboratory||(tier.skill&&!s.skills.includes(tier.skill)))return;queuePurchase(s,{key:"tier:"+kind+":"+index,kind:kind==="equipment"?"equipmentTier":"automationTier",name:tier.name,cost:tier.cost,parts:tier.parts,payload:{index:Number(index)}});notify("Улучшение добавлено в общую корзину.");render();return;}const finish=e.target.closest("[data-set-finish]");if(finish){s.equipmentFinish=finish.dataset.setFinish;render();return;}const remove=e.target.closest("[data-remove-module]");if(remove){const id=remove.dataset.removeModule;const index=s.equipmentModules.indexOf(id);if(index<0)return;s.equipmentModules.splice(index,1);s.equipmentModuleInventory??=[];if(!s.equipmentModuleInventory.includes(id))s.equipmentModuleInventory.push(id);lastRemovedModule=id;notify("Модуль снят и помещён на склад оборудования. Его можно установить повторно бесплатно.");render();return;}const tech=e.target.closest("[data-tech-action]");if(tech){const isEq=tech.dataset.techAction==="equipment",tiers=isEq?EQUIPMENT_TIERS:AUTOMATION_TIERS,current=isEq?s.equipmentTier:s.automationTier,next=tiers[current+1];if(!next||!canAfford(s,next)){notify("Не выполнены требования для улучшения.");return;}queuePurchase(s,{key:"tier:"+(isEq?"equipment":"automation")+":"+(current+1),kind:isEq?"equipmentTier":"automationTier",name:next.name,cost:next.cost,parts:next.parts,payload:{index:current+1}});notify("Улучшение добавлено в общую корзину: "+next.name);render();return;}const install=e.target.closest("[data-install-module]");if(install){const m=EQUIPMENT_MODULES.find(x=>x.id===install.dataset.installModule);if(!m||s.equipmentModules.includes(m.id))return;const slot=slotForModule(m.id);if(slot&&moduleInSlot(s,slot))return;s.equipmentModuleInventory??=[];const storedIndex=s.equipmentModuleInventory.indexOf(m.id);if(storedIndex>=0){s.equipmentModuleInventory.splice(storedIndex,1);s.equipmentModules.push(m.id);notify("Установлен модуль со склада: "+m.name);render();return;}if(s.equipmentTier<m.tier)return;queuePurchase(s,{key:"module:"+m.id,kind:"equipmentModule",name:m.name,cost:m.cost,parts:m.parts,payload:{id:m.id}});notify("Модуль добавлен в общую корзину: "+m.name);render();return;}});renderEquipment(s);}
