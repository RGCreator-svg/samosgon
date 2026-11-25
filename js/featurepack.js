import { addInventory } from "./economy.js";

const $ = (s) => document.querySelector(s);
const el = (tag, cls, value) => { const n = document.createElement(tag); if (cls) n.className = cls; if (value !== undefined) n.textContent = value; return n; };
const SPECIALIZATIONS = [
  { id: "artisan", name: "Мастер-винокур", icon: "⚗️", desc: "Больше качественной продукции; мини-игра про точность даёт усиленный бонус." },
  { id: "merchant", name: "Хваткий торговец", icon: "🪙", desc: "Рыночные колебания выгоднее, а продажи приносят +10%." },
  { id: "engineer", name: "Сельский инженер", icon: "⚙️", desc: "Обслуживание оборудования дешевле, бочки стареют быстрее." },
  { id: "farmer", name: "Хозяин земли", icon: "🌾", desc: "Урожай хозяйственных построек увеличен на 1 единицу." }
];
const EVENTS = [
  { id:"fair", title:"Ярмарка в соседнем селе", text:"Организаторы предлагают место на прилавке. Вложиться в оформление или отказаться?", choices:[{label:"Заплатить 35 монет", money:-35, reputation:5, market:0.08},{label:"Продать без оформления", money:15, reputation:1, market:0}] },
  { id:"repair", title:"Петрович и его инструмент", text:"Сосед предлагает помочь с оборудованием. Правда, его отвёртка старше самого Петровича.", choices:[{label:"Нанять Петровича за 25", money:-25, maintenance:18},{label:"Обойтись своими силами", xp:12}] },
  { id:"demand", title:"Внезапный спрос", text:"В деревне праздник, спрос на товары вырос. Можно быстро распродать запасы или придержать их.", choices:[{label:"Использовать ажиотаж", money:30, reputation:2, market:0.12},{label:"Не рисковать", xp:8}] }
];
const FARMS = [
  { id:"greenhouse", name:"Теплица", icon:"🏡", cost:260, desc:"Каждый новый день даёт овощи.", yields:{potato:2,carrot:1} },
  { id:"irrigation", name:"Поливочная система", icon:"💧", cost:340, desc:"Улучшает урожай огорода и снижает износ.", yields:{potato:2,cabbage:1} },
  { id:"apiary", name:"Пасека", icon:"🐝", cost:300, desc:"Приносит регулярный доход и помогает саду.", yields:{apple:1,pear:1} }
];

function ensure(s) {
  s.market ??= { multiplier:1, trend:"ровный", lastShiftDay:0 };
  s.specialization ??= null;
  s.distillation ??= { active:false, quality:0, result:0 };
  s.bragaQuality = Math.max(0, Math.min(100, Number(s.bragaQuality ?? 55)));
  s.barrelAging ??= [];
  s.farmUpgrades ??= [];
  s.featureEvent ??= null;
}
function btn(label, attr, value, disabled=false) { const b=el("button","",label); b.dataset[attr]=value; b.disabled=disabled; return b; }
function card(parent,title,desc) { const c=el("article","feature-card"); c.append(el("h3","",title),el("p","",desc)); parent.append(c); return c; }

function renderDistillation(s, root) {
  const c=card(root,"⚗️ Перегонка и контроль качества","Переведи готовую брагу в игровую категорию «спирт-сырец». Выбор режима влияет только на условные игровые показатели качества и выхода.");
  c.append(el("p","feature-meta",`Браги на складе: ${s.inventory.braga||0} · Качество: ${s.distillation.quality||0}/100`));
  if (s.distillation.active) {
    c.append(el("p","","Выбери стиль отсечения начальной фракции:"));
    c.append(btn("Осторожный режим · меньше выхода, выше качество","distill-cut","careful"));
    c.append(btn("Сбалансированный режим","distill-cut","balanced"));
    c.append(btn("На максимальный выход · качество под вопросом","distill-cut","yield"));
  } else {
    c.append(el("p","","Для запуска требуется 3 единицы браги. Это абстрактная игровая операция, без реальных технологических параметров."));
    c.append(btn("Запустить игровую перегонку (3 браги)","distill-start","yes",(s.inventory.braga||0)<3 || s.distillation.result>0));
  }
  if (s.distillation.result>0) c.append(el("p","feature-success",`Получено игрового спирта-сырца: ${s.distillation.result} ед. Забери результат на склад.`),btn("Забрать на склад","distill-collect","yes"));
}
function renderSpecialization(s,root) {
  const c=card(root,"🌟 Профессиональная специализация","Один выбор на всю партию. Открывается при наличии 3 очков навыков; выбор задаёт долгосрочный стиль развития.");
  if (s.specialization) {
    const spec=SPECIALIZATIONS.find(x=>x.id===s.specialization);
    c.append(el("h4","feature-success",`${spec?.icon||"★"} ${spec?.name||s.specialization}`),el("p","",spec?.desc||"Специализация выбрана."));
  } else {
    c.append(el("p","feature-meta",`Свободно очков навыков: ${s.skillPoints||0} · Нужно: 3`));
    SPECIALIZATIONS.forEach(spec=>c.append(btn(`${spec.icon} ${spec.name}`, "specialize", spec.id,(s.skillPoints||0)<3)));
    c.append(el("small","", "Специализация не заменяет обычное дерево навыков и не блокирует уже изученные умения."));
  }
}
function renderMarket(s,root) {
  const c=card(root,"📈 Живой рынок","Цены меняются каждый игровой день. Следи за трендом: выгоднее продавать в период повышенного спроса.");
  const pct=Math.round(((s.market.multiplier||1)-1)*100);
  c.append(el("p","feature-meta",`Текущий индекс цен: ${(s.market.multiplier||1).toFixed(2)}× (${pct>=0?"+":""}${pct}%) · Тренд: ${s.market.trend}`));
  if(s.featureEvent) {
    const e=EVENTS.find(x=>x.id===s.featureEvent.id);
    if(e){ c.append(el("h4","","📜 "+e.title),el("p","",e.text)); e.choices.forEach((choice,i)=>c.append(btn(choice.label,"event-choice",String(i),(choice.money||0)<0 && s.money<Math.abs(choice.money||0)))); }
  } else c.append(el("p","","Особых предложений сейчас нет. Следующее событие может появиться при смене дня."));
}
function renderAging(s,root) {
  const c=card(root,"🪵 Выдержка в бочках","Положи игровой спирт-сырец на выдержку. Через несколько дней получишь товар с повышенной ценой. Это условная игровая механика.");
  const raw=s.inventory.spirit||0;
  c.append(el("p","feature-meta",`Спирт-сырец: ${raw} · Бочек на выдержке: ${s.barrelAging.length}/3`));
  c.append(btn("Заложить 2 ед. на выдержку (20 монет)","age-start","yes",raw<2 || s.money<20 || s.barrelAging.length>=3));
  if(!s.barrelAging.length)c.append(el("p","", "Бочки пока пусты."));
  s.barrelAging.forEach((b,i)=>{const line=el("div","aging-row",`Бочка ${i+1}: ${b.remaining} дн. · качество ${b.quality}/100 · ${b.ready?"готова":"созревает"}`); if(b.ready)line.append(btn("Забрать выдержанный продукт","age-collect",String(i))); c.append(line);});
}
function renderFarms(s,root) {
  const c=card(root,"🌱 Расширение хозяйства","Постройки дают регулярный урожай при переходе дня. Их можно развивать независимо от основного огорода.");
  FARMS.forEach(f=>{const owned=s.farmUpgrades.includes(f.id);const item=el("div","farm-upgrade",`${f.icon} ${f.name} — ${owned?"построено":f.cost+" монет"}`);item.append(el("p","",f.desc));if(!owned)item.append(btn("Построить","farm-build",f.id,s.money<f.cost));c.append(item);});
  c.append(el("p","feature-meta",`Построек: ${s.farmUpgrades.length}/3`));
}
export function renderFeaturePack(s) {
  ensure(s); const root=$("#featurePack"); if(!root)return; root.replaceChildren();
  const intro=el("p","feature-intro","Новые технологические системы: качество продукции, специализация, рыночная конъюнктура, выдержка и развитие фермы.");root.append(intro);
  renderDistillation(s,root); renderSpecialization(s,root); renderMarket(s,root); renderAging(s,root); renderFarms(s,root);
}
export function initFeaturePack(s,{render,notify,earnExperience}) {
  ensure(s);
  const nav=$(".navigation"), game=$("#game"); if(!nav||!game)return;
  if(!$("#featurePack")) {
    const tab=btn("🧭 Технологии","tab","featurePack");tab.dataset.tab="featurePack";nav.append(tab);
    const section=el("section","tab-content panel hidden");section.id="featurePack";game.append(section);
  }
  nav.addEventListener("click",e=>{if(!e.target.closest('[data-tab="featurePack"]'))return;document.querySelectorAll(".tab-content").forEach(x=>x.classList.toggle("hidden",x.id!=="featurePack"));nav.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x.dataset.tab==="featurePack"));});
  $("#featurePack").addEventListener("click",e=>{
    const b=e.target.closest("button");if(!b)return;
    if(b.dataset.distillStart){if((s.inventory.braga||0)<3||s.distillation.result>0)return;s.inventory.braga-=3;s.distillation.active=true;notify("Игровая перегонка запущена. Выбери режим контроля качества.");}
    if(b.dataset.distillCut){if(!s.distillation.active)return;const mode=b.dataset.distillCut;const bonus=s.specialization==="artisan"?8:0;const values={careful:{quality:24,output:2},balanced:{quality:8,output:3},yield:{quality:-12,output:4}};const v=values[mode];const equipmentBonus=(Number(s.equipmentTier)||0)*4;const baseQuality=Number(s.bragaQuality)||55;s.distillation={active:false,quality:Math.max(20,Math.min(100,Math.round(baseQuality+v.quality+bonus+equipmentBonus))),result:v.output};notify(`Перегонка завершена: ${s.distillation.result} ед., качество ${s.distillation.quality}/100.`);earnExperience(14);}
    if(b.dataset.distillCollect){const n=s.distillation.result;const got=addInventory(s,"spirit",n);if(got===n)s.distillation.result=0;else s.distillation.result-=got;if(got)notify(`На склад помещено ${got} ед. спирта-сырца.`);}
    if(b.dataset.specialize){if(s.specialization||(s.skillPoints||0)<3)return;s.skillPoints-=3;s.specialization=b.dataset.specialize;notify(`Выбрана специализация: ${SPECIALIZATIONS.find(x=>x.id===s.specialization).name}.`);}
    if(b.dataset.eventChoice!==undefined){const event=EVENTS.find(x=>x.id===s.featureEvent?.id);const choice=event?.choices[Number(b.dataset.eventChoice)];if(!choice || ((choice.money||0)<0 && s.money<Math.abs(choice.money)))return;s.money=Math.max(0,s.money+(choice.money||0));s.reputation=Math.max(0,Math.min(100,(s.reputation||0)+(choice.reputation||0)));s.market.multiplier=Math.max(.75,Math.min(1.35,s.market.multiplier+(choice.market||0)));s.maintenance=Math.max(0,Math.min(100,(s.maintenance||100)+(choice.maintenance||0)));if(choice.xp)earnExperience(choice.xp);notify(`Решение принято: «${event.title}».`);s.featureEvent=null;}
    if(b.dataset.ageStart){if((s.inventory.spirit||0)<2||s.money<20||s.barrelAging.length>=3)return;s.inventory.spirit-=2;s.money-=20;s.barrelAging.push({remaining:3,quality:Math.max(45,Number(s.distillation.quality)||65),ready:false});notify("Две единицы заложены в бочку. Теперь потребуется терпение.");}
    if(b.dataset.ageCollect!==undefined){const i=Number(b.dataset.ageCollect);const barrel=s.barrelAging[i];if(!barrel?.ready)return;const got=addInventory(s,"aged_spirit",2);if(got===2){s.barrelAging.splice(i,1);s.money+=Math.round(2*18*(1+barrel.quality/100));notify("Выдержанный продукт принят на склад. Цена выше обычной.");}}
    if(b.dataset.farmBuild){const farm=FARMS.find(x=>x.id===b.dataset.farmBuild);if(!farm||s.farmUpgrades.includes(farm.id)||s.money<farm.cost)return;s.money-=farm.cost;s.farmUpgrades.push(farm.id);notify(`Построено: ${farm.name}. Хозяйство становится самостоятельнее.`);earnExperience(20);}
    render();renderFeaturePack(s);
  });
  renderFeaturePack(s);
}
export function advanceFeaturePackDay(s,notify) {
  ensure(s);
  const swing=(Math.random()-.48)*.18;
  s.market.multiplier=Math.max(.78,Math.min(1.32,(s.market.multiplier||1)+swing));
  s.market.trend=swing>.025?"спрос растёт":swing<-.025?"спрос падает":"ровный";
  s.market.lastShiftDay=s.day;
  if(s.specialization==="engineer")s.maintenance=Math.min(100,(s.maintenance||0)+1);
  s.barrelAging.forEach(b=>{if(!b.ready){b.remaining-=s.specialization==="engineer"?1:1;if(b.remaining<=0){b.remaining=0;b.ready=true;b.quality=Math.min(100,b.quality+12);notify("Бочка выдержки готова! Качество выросло.");}}});
  s.farmUpgrades.forEach(id=>{const farm=FARMS.find(x=>x.id===id);if(!farm)return;Object.entries(farm.yields).forEach(([item,qty])=>addInventory(s,item,qty+(s.specialization==="farmer"?1:0)));if(id==="apiary")s.money+=8;});
  if(!s.featureEvent && Math.random()<.24){const event=EVENTS[Math.floor(Math.random()*EVENTS.length)];s.featureEvent={id:event.id,day:s.day};notify(`Новое событие: ${event.title}. Загляни во вкладку «Технологии».`);}
}
export function getMarketMultiplier(s){ensure(s);return s.market.multiplier*(s.specialization==="merchant"?1.1:1);}
