import { removeInventory, queuePurchase, registerCartHandler, addInventory } from "./economy.js";
import { getEquipmentProfile } from "./equipment.js";
import { getWorldYieldMultiplier } from "./world.js";
import { recordProduction } from "./productionhub.js";
import { initMashHouse, renderMashHouse, handleMashHouseClick, advanceMashHouseDay } from "./mashhouse.js";

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
  { id:"apiary", name:"Пасека", icon:"🐝", cost:300, desc:"Приносит регулярный доход и помогает саду.", yields:{apple:1,pear:1,honey:1} }
];

function ensure(s) {
  s.market ??= { multiplier:1, trend:"ровный", lastShiftDay:0 };
  s.specialization ??= null;
  s.distillation ??= { active:false, quality:0, result:0 };
  if(s.distillation.active && !s.distillation.phase)s.distillation.phase="stabilization";
  s.maintenance=Math.max(0,Math.min(100,Number(s.maintenance??100)));
  s.mashType ??= "sugar";
  s.bragaQuality = Math.max(0, Math.min(100, Number(s.bragaQuality ?? 55)));
  s.barrelAging ??= [];
  s.farmUpgrades ??= [];
  s.featureEvent ??= null;
}
function btn(label, attr, value, disabled=false) { const b=el("button","",label); b.setAttribute(`data-${attr}`,value); b.disabled=disabled; return b; }
function card(parent,title,desc) { const c=el("article","feature-card"); c.append(el("h3","",title),el("p","",desc)); parent.append(c); return c; }

export function resolveDistillationChoice(distillation,choice){
  const phase=distillation.phase||"stabilization";
  const impacts={
    stabilization:{precise:[2,0],steady:[1,0],fast:[-2,1]},
    heads:{precise:[3,-1],steady:[1,0],fast:[-2,1]},
    heart:{precise:[3,0],steady:[1,1],fast:[-3,2]},
    tails:{precise:[2,0],steady:[0,1],fast:[-3,2]}
  };
  const impact=impacts[phase]?.[choice];
  if(!impact)return {valid:false,done:false,phase};
  distillation.qualityPoints=(Number(distillation.qualityPoints)||0)+impact[0];
  distillation.outputPoints=(Number(distillation.outputPoints)||0)+impact[1];
  distillation.completedStages??=[];
  if(!distillation.completedStages.includes(phase))distillation.completedStages.push(phase);
  const order=["stabilization","heads","heart","tails"],index=order.indexOf(phase);
  if(index===order.length-1)return {valid:true,done:true,phase:null};
  distillation.phase=order[index+1];
  return {valid:true,done:false,phase:distillation.phase};
}

export function calculateDistillationResult(state){
  const profile=getEquipmentProfile(state,state.mashType);
  const owned=new Set(state.equipmentModules||[]);
  const coolingBonus=(owned.has("auto_cooling")?3:0)+(owned.has("safety_monitor")?2:0)+(owned.has("basic_condenser")?1:0);
  const equipmentBonus=(Number(state.equipmentTier)||0)*4;
  const baseQuality=Number(state.bragaQuality)||55;
  const artisan=state.specialization==="artisan"?8:0;
  const quality=Math.max(20,Math.min(100,Math.round(baseQuality+(Number(state.distillation.qualityPoints)||0)+artisan+equipmentBonus+profile.quality+coolingBonus+(Number(state.lab?.qualityBonus)||0)+(Number(state.story?.petrovichQualityBonus)||0))));
  const output=Math.max(1,Math.round((2+(Number(state.distillation.outputPoints)||0)+profile.output)*(Number(state.processCenter?.outputMultiplier)||1)));
  return {quality,output,stillMode:profile.mode,flavour:profile.flavour};
}

function renderDistillation(s, root) {
  const c=card(root,"⚗️ Перегонка и контроль качества","Переведи готовую брагу в игровую категорию «спирт-сырец». Выбор режима влияет только на условные игровые показатели качества и выхода.");
  const profile=getEquipmentProfile(s,s.mashType);
  const mashItem={sugar:"braga",fruit:"fruit_braga",grain:"grain_braga",honey:"honey_braga"}[s.mashType]||"braga";
  const mashCount=s.inventory[mashItem]||0;
  c.append(el("p","feature-meta",`Сырьевой профиль: ${({sugar:"Сахарная",fruit:"Фруктовая",grain:"Зерновая",honey:"Медовая"})[s.mashType]} · На складе: ${mashCount} ед. · Качество: ${s.distillation.quality||0}/100`));
  const mashPicker=el("div","mash-picker");
  [["sugar","🍬 Сахарная"],["fruit","🍎 Фруктовая"],["grain","🌾 Зерновая"],["honey","🍯 Медовая"]].forEach(([id,label])=>{const b=btn(label,"mashType",id,s.distillation.active || (id==="honey" && !s.skills.includes("honey_distillation")));if(s.mashType===id)b.classList.add("selected");mashPicker.append(b);});c.append(mashPicker);
  c.append(el("p","module-meta",`Конфигурация: ${{pot:"Перегонный аппарат",hybrid:"Гибридная колонна",rectification:"Ректификационная колонна"}[profile.mode]} · Бонус модулей к качеству: +${profile.quality}`));
  if (s.distillation.active) {
    const phases={
      stabilization:{title:"Подготовка аппарата",text:"Игровой этап: выбери, насколько внимательно система стабилизирует процесс.",choices:[["precise","Точный контроль"],["steady","Ровный темп"],["fast","Быстрый запуск"]]},
      heads:{title:"Начальная фракция",text:"Условный игровой выбор: аккуратность против общего выхода.",choices:[["precise","Аккуратное отделение"],["steady","Сбалансированно"],["fast","Собрать больше"]]},
      heart:{title:"Основная фракция",text:"Главная игровая часть партии. Реши, что важнее: качество, баланс или количество.",choices:[["precise","Приоритет качества"],["steady","Баланс качества и выхода"],["fast","Приоритет выхода"]]},
      tails:{title:"Завершение партии",text:"Финальный игровой выбор влияет на итоговый объём и стабильность результата.",choices:[["precise","Завершить аккуратно"],["steady","Обычное завершение"],["fast","Продлить сбор"]]}
    };
    const phase=phases[s.distillation.phase]||phases.stabilization;
    c.append(el("h4","","Этап: "+phase.title),el("p","",phase.text));
    const track=el("div","distillation-stage-track");
    [["stabilization","Подготовка"],["heads","Начальная"],["heart","Основная"],["tails","Завершение"]].forEach(([id,label])=>{const step=el("span",id===s.distillation.phase?"is-current":(s.distillation.completedStages||[]).includes(id)?"is-done":"",label);track.append(step);});
    c.append(track);
    phase.choices.forEach(([id,label])=>c.append(btn(label,"distill-cut",id)));
    c.append(el("p","feature-meta", "Условная игровая симуляция: здесь нет реальных температур, режимов или технологических инструкций."));
  } else {
    c.append(el("p","","Для запуска требуется 3 единицы выбранного типа браги. Перегонка проходит в четыре игровых этапа; решения меняют условные качество и выход."));
    c.append(btn("Запустить перегонку","distill-start","yes",mashCount<3 || s.distillation.result>0));
  }
  if (s.distillation.result>0) c.append(el("p","feature-success",`Получено игрового спирта-сырца: ${s.distillation.result} ед. Качество: ${s.distillation.quality}/100. Забери результат на склад.`),btn("Забрать на склад","distill-collect","yes"));
  const service=card(root,"🔧 Обслуживание установки","Состояние оборудования влияет на паспорта качества. Работа постепенно изнашивает установку; обслуживание возвращает её в форму.");
  service.append(el("p","feature-meta",`Текущее состояние: ${s.maintenance}% · Бонус качества зависит от состояния узлов.`));
  service.append(btn("Обслужить установку · "+Math.max(10,Math.ceil((100-s.maintenance)*1.5))+" монет","equipment-service","repair",s.maintenance>=100||s.distillation.active));
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
  const c=card(root,"🪵 Выдержка в бочках","Обычный и медовый дистиллят можно выдерживать отдельно. Это игровая абстракция созревания продукта.");
  const raw=s.inventory.spirit||0, honey=s.inventory.honey_spirit||0;
  c.append(el("p","feature-meta",`Спирт-сырец: ${raw} · Медовый дистиллят: ${honey} · Бочек на выдержке: ${s.barrelAging.length}/3`));
  c.append(btn("Заложить 2 ед. спирта на выдержку (20 монет)","age-start","spirit",raw<2||s.barrelAging.length>=3));
  c.append(btn("Заложить 2 ед. медового дистиллята (20 монет)","age-start","honey",honey<2||s.barrelAging.length>=3));
  if(!s.barrelAging.length)c.append(el("p","", "Бочки пока пусты."));
  s.barrelAging.forEach((b,i)=>{const line=el("div","aging-row",`Бочка ${i+1}: ${b.remaining} дн. · качество ${b.quality}/100 · ${b.ready?"готова":"созревает"}`);if(b.ready)line.append(btn("Забрать выдержанный продукт","age-collect",String(i)));c.append(line);});
}
function renderFarms(s,root) {
  const c=card(root,"🌱 Расширение хозяйства","Постройки дают регулярный урожай при переходе дня. Их можно развивать независимо от основного огорода.");
  FARMS.forEach(f=>{const owned=s.farmUpgrades.includes(f.id);const item=el("div","farm-upgrade",`${f.icon} ${f.name} — ${owned?"построено":f.cost+" монет"}`);item.append(el("p","",f.desc));if(!owned)item.append(btn("Добавить в общую корзину","farm-build",f.id));c.append(item);});
  c.append(el("p","feature-meta",`Построек: ${s.farmUpgrades.length}/3`));
}
export function renderFeaturePack(s) {
  ensure(s); const root=$("#featurePack"); if(!root)return; root.replaceChildren();
  const intro=el("p","feature-intro","Винокурня и бродильня: готовь сахарную, фруктовую и зерновую брагу, контролируй перегонку, выдерживай дистиллят и развивай оборудование.");root.append(intro);
  renderMashHouse(s,root); renderDistillation(s,root); renderSpecialization(s,root); renderMarket(s,root); renderAging(s,root); renderFarms(s,root);
}
export function initFeaturePack(s,{render,notify,earnExperience}) {
  ensure(s);
  initMashHouse(s,{notify});
  const nav=$(".navigation"), game=$("#game"); if(!nav||!game)return;
  if(!$("#featurePack")) {
    const tab=btn("⚗️ Винокурня","tab","featurePack");tab.dataset.tab="featurePack";nav.append(tab);
    const section=el("section","tab-content panel hidden");section.id="featurePack";section.innerHTML="<h2>⚗️ Винокурня и производство</h2><p class=\"feature-meta\">Главный производственный цикл: сырьё → брага → перегонка → выдержка → готовый продукт.</p>";game.append(section);
  }
    registerCartHandler("equipmentService",(current)=>{current.maintenance=100;notify("Установка обслужена. Состояние восстановлено до 100%.");});
  registerCartHandler("farmUpgrade",(current,item)=>{const farm=FARMS.find(x=>x.id===item.payload?.id);if(farm&&!current.farmUpgrades.includes(farm.id)){current.farmUpgrades.push(farm.id);earnExperience(20);}});
  registerCartHandler("barrelAging",(current,item)=>{if((current.barrelAging||[]).length<3){const input=item.payload?.inputItem||"spirit";current.barrelAging.push({remaining:3,quality:Math.max(45,Number(current.distillation.quality)||65),ready:false,inputItem:input,outputItem:input==="honey_spirit"?"aged_honey_spirit":"aged_spirit"});}});
  $("#featurePack").addEventListener("click",e=>{
    const b=e.target.closest("button");if(!b)return;
    if(handleMashHouseClick(s,b,{notify,render:()=>{render();renderFeaturePack(s);}}))return;
    if(b.dataset.mashType){s.mashType=b.dataset.mashType;}
    if(b.dataset.distillStart){const item={sugar:"braga",fruit:"fruit_braga",grain:"grain_braga",honey:"honey_braga"}[s.mashType]||"braga";if((s.inventory[item]||0)<3||s.distillation.result>0)return;const qualityLot=(s.qualityLots||[]).find(lot=>lot.item===item&&lot.quality!==null&&lot.quality!==undefined&&Number.isFinite(Number(lot.quality)));if(qualityLot)s.bragaQuality=Number(qualityLot.quality);removeInventory(s,item,3);s.distillation={active:true,phase:"stabilization",completedStages:[],quality:0,result:0,outputPoints:0,qualityPoints:0,mashType:s.mashType,resultItem:s.mashType==="honey"?"honey_spirit":"spirit"};notify("Перегонка запущена. Пройди четыре игровых этапа.");}
    if(b.dataset.distillCut){
      if(!s.distillation.active)return;
      const result=resolveDistillationChoice(s.distillation,b.dataset.distillCut);
      if(!result.valid)return;
      if(!result.done){notify("Игровой этап завершён. Следующий этап: "+({heads:"начальная фракция",heart:"основная фракция",tails:"завершение партии"}[result.phase])+".");}
      else{
        const outcome=calculateDistillationResult(s);
        s.distillation={...s.distillation,active:false,phase:null,quality:outcome.quality,result:outcome.output,stillMode:outcome.stillMode,flavour:outcome.flavour};
        const owned=new Set(s.equipmentModules||[]);
        s.maintenance=Math.max(0,(Number(s.maintenance)||100)-(owned.has("safety_monitor")?1:3));
        s.story??={};s.story.petrovichQualityBonus=0;
        notify("Перегонка завершена: "+outcome.output+" ед., качество "+outcome.quality+"/100. Состояние установки: "+s.maintenance+"%.");
        earnExperience(14);
      }
    }
    if(b.dataset.distillCollect){const n=s.distillation.result;const got=addInventory(s,s.distillation.resultItem||"spirit",n);if(got===n)s.distillation.result=0;else s.distillation.result-=got;if(got){recordProduction(s,{name:s.distillation.resultItem==="honey_spirit"?"Медовый дистиллят":"Спирт-сырец",amount:got,item:s.distillation.resultItem||"spirit",process:"Перегонка",quality:s.distillation.quality});notify(`На склад помещено ${got} ед. спирта-сырца.`);}}
    if(b.dataset.equipmentService){
      if(s.maintenance>=100)return;
      queuePurchase(s,{key:"equipment-service",kind:"equipmentService",name:"Обслуживание установки",cost:Math.max(10,Math.ceil((100-s.maintenance)*1.5)),payload:{}});
      notify("Обслуживание добавлено в общую корзину.");
    }
    if(b.dataset.specialize){if(s.specialization||(s.skillPoints||0)<3)return;s.skillPoints-=3;s.specialization=b.dataset.specialize;notify(`Выбрана специализация: ${SPECIALIZATIONS.find(x=>x.id===s.specialization).name}.`);}
    if(b.dataset.eventChoice!==undefined){const event=EVENTS.find(x=>x.id===s.featureEvent?.id);const choice=event?.choices[Number(b.dataset.eventChoice)];if(!choice || ((choice.money||0)<0 && s.money<Math.abs(choice.money)))return;s.money=Math.max(0,s.money+(choice.money||0));s.reputation=Math.max(0,Math.min(100,(s.reputation||0)+(choice.reputation||0)));s.market.multiplier=Math.max(.75,Math.min(1.35,s.market.multiplier+(choice.market||0)));s.maintenance=Math.max(0,Math.min(100,(s.maintenance||100)+(choice.maintenance||0)));if(choice.xp)earnExperience(choice.xp);notify(`Решение принято: «${event.title}».`);s.featureEvent=null;}
    if(b.dataset.ageStart){const input=b.dataset.ageStart==="honey"?"honey_spirit":"spirit";if((s.inventory[input]||0)<2||s.barrelAging.length>=3)return;queuePurchase(s,{key:"barrel-aging:"+input,kind:"barrelAging",name:input==="honey_spirit"?"Выдержка медового дистиллята":"Выдержка спирта-сырца",cost:20,consume:{[input]:2},payload:{inputItem:input}});notify("Закладка бочки добавлена в общую корзину.");}
    if(b.dataset.ageCollect!==undefined){const i=Number(b.dataset.ageCollect);const barrel=s.barrelAging[i];if(!barrel?.ready)return;const got=addInventory(s,barrel.outputItem||"aged_spirit",2);if(got===2){s.barrelAging.splice(i,1);s.money+=Math.round(2*(barrel.outputItem==="aged_honey_spirit"?34:18)*(1+barrel.quality/100));recordProduction(s,{name:barrel.outputItem==="aged_honey_spirit"?"Выдержанный медовый дистиллят":"Выдержанный продукт",amount:got,item:barrel.outputItem||"aged_spirit",process:"Выдержка",quality:Math.min(100,(Number(barrel.quality)||60)+2)});notify("Выдержанный продукт принят на склад. Цена выше обычной.");}}
    if(b.dataset.farmBuild){const farm=FARMS.find(x=>x.id===b.dataset.farmBuild);if(!farm||s.farmUpgrades.includes(farm.id))return;queuePurchase(s,{key:"farm:"+farm.id,kind:"farmUpgrade",name:farm.name,cost:farm.cost,payload:{id:farm.id}});notify(farm.name+" добавлено в общую корзину.");}
    render();renderFeaturePack(s);
  });
  renderFeaturePack(s);
}
export function advanceFeaturePackDay(s,notify) {
  ensure(s);
  advanceMashHouseDay(s,notify);
  const swing=(Math.random()-.48)*.18;
  s.market.multiplier=Math.max(.78,Math.min(1.32,(s.market.multiplier||1)+swing));
  s.market.trend=swing>.025?"спрос растёт":swing<-.025?"спрос падает":"ровный";
  s.market.lastShiftDay=s.day;
  if(s.specialization==="engineer")s.maintenance=Math.min(100,(s.maintenance||0)+1);
  s.barrelAging.forEach(b=>{if(!b.ready){b.remaining-=s.specialization==="engineer"?1:1;if(b.remaining<=0){b.remaining=0;b.ready=true;b.quality=Math.min(100,b.quality+12);notify("Бочка выдержки готова! Качество выросло.");}}});
  s.farmUpgrades.forEach(id=>{const farm=FARMS.find(x=>x.id===id);if(!farm)return;Object.entries(farm.yields).forEach(([item,qty])=>{const base=qty+(s.specialization==="farmer"?1:0);addInventory(s,item,Math.max(1,Math.round(base*getWorldYieldMultiplier(s,item==="apple"||item==="pear"?"fruit":"vegetable",true))));});if(id==="apiary")s.money+=8;});
  if(!s.featureEvent && Math.random()<.24){const event=EVENTS[Math.floor(Math.random()*EVENTS.length)];s.featureEvent={id:event.id,day:s.day};notify(`Новое событие: ${event.title}. Загляни во вкладку «Технологии».`);}
}
export function getMarketMultiplier(s){ensure(s);return s.market.multiplier*(s.specialization==="merchant"?1.1:1);}
