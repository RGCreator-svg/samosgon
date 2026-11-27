import { addInventory, removeInventory, queuePurchase, registerCartHandler } from "./economy.js";
import { getEquipmentProfile } from "./equipment.js";
import { recordProduction } from "./productionhub.js";

const $ = selector => document.querySelector(selector);
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

export const STILL_MODELS = {
  copper:{name:"Медный аппарат",icon:"🟠",quality:5,flavour:8,output:0,wear:3,description:"Акцент на характере фруктовых и зерновых партий."},
  glass:{name:"Стеклянная установка",icon:"🔬",quality:4,flavour:3,output:0,wear:2,description:"Наглядная конфигурация с бонусом к стабильности."},
  stainless:{name:"Стальная установка",icon:"⚙️",quality:2,flavour:0,output:1,wear:1,description:"Универсальная производительная конфигурация."}
};
export const STILL_MASHES = {
  sugar:{item:"braga",name:"Сахарная брага",result:"spirit",base:60},
  fruit:{item:"fruit_braga",name:"Фруктовая брага",result:"spirit",base:70},
  grain:{item:"grain_braga",name:"Зерновая брага",result:"spirit",base:73},
  honey:{item:"honey_braga",name:"Медовая брага",result:"honey_spirit",base:72}
};
const STAGES = [
  {id:"setup",name:"Подготовка",choices:[["careful","Внимательно",2,0],["balanced","Сбалансированно",1,0],["quick","Быстро",-2,1]]},
  {id:"control",name:"Контроль партии",choices:[["careful","Точный контроль",3,-1],["balanced","Ровный ход",1,0],["quick","Ускорить",-2,1]]},
  {id:"finish",name:"Завершение",choices:[["careful","Аккуратно",2,0],["balanced","Сбалансированно",1,1],["quick","Приоритет выхода",-3,2]]}
];
const MASH_LABELS = {sugar:"Сахарная",fruit:"Фруктовая",grain:"Зерновая",honey:"Медовая"};

export function ensureProductionPlant(state){
  state.productionPlant ??= {units:[],nextId:2};
  const plant=state.productionPlant;
  if(!Array.isArray(plant.units))plant.units=[];
  if(!plant.units.length)plant.units.push({id:1,name:"Аппарат №1",model:"copper",maintenance:100,active:null});
  plant.units.forEach((unit,index)=>{
    unit.id=Number(unit.id)||index+1;
    unit.name=unit.name||"Аппарат №"+unit.id;
    unit.model=STILL_MODELS[unit.model]?unit.model:"copper";
    unit.maintenance=Math.max(0,Math.min(100,Number(unit.maintenance??100)));
    unit.active??=null;
  });
  plant.nextId=Math.max(2,Number(plant.nextId)||plant.units.length+1);
  return plant;
}
export function getStillCapacity(state){return Math.min(3,1+Math.max(0,Math.min(2,Number(state.buildings?.workshop)||0)));}
export function resolveStillChoice(batch,choice){
  const stage=STAGES[batch.stageIndex];
  const impact=stage?.choices.find(entry=>entry[0]===choice);
  if(!impact)return {valid:false,done:false};
  batch.qualityPoints=(Number(batch.qualityPoints)||0)+impact[2];
  batch.outputPoints=(Number(batch.outputPoints)||0)+impact[3];
  batch.stageIndex++;
  if(batch.stageIndex>=STAGES.length){batch.ready=true;batch.output=Math.max(1,Math.round(2+batch.outputPoints));return {valid:true,done:true};}
  return {valid:true,done:false,stage:STAGES[batch.stageIndex].name};
}
function peekQuality(state,item){
  const lot=(state.qualityLots||[]).find(entry=>entry.item===item&&entry.remaining>0&&entry.quality!=null);
  return lot?Number(lot.quality):null;
}
function calculateBatchQuality(state,unit,batch){
  const model=STILL_MODELS[unit.model]||STILL_MODELS.copper;
  const profile=getEquipmentProfile(state,batch.mashType);
  const maintenance=unit.maintenance>=80?2:unit.maintenance>=55?0:unit.maintenance>=30?-4:-8;
  const base=Number(batch.baseQuality)||STILL_MASHES[batch.mashType].base;
  return Math.max(20,Math.min(100,Math.round(base+(Number(batch.qualityPoints)||0)+model.quality+Math.round(profile.quality*.45)+Math.min(4,Number(profile.stability)||0)+maintenance+(Number(state.lab?.qualityBonus)||0)*.15)));
}
export function startStillBatch(state,unitId,mashType,baseQuality=null){
  const plant=ensureProductionPlant(state),unit=plant.units.find(entry=>entry.id===Number(unitId));
  const mash=STILL_MASHES[mashType];
  if(!unit||unit.active||!mash||Number(state.inventory?.[mash.item]||0)<3)return false;
  if(!removeInventory(state,mash.item,3))return false;
  unit.active={mashType,baseQuality:baseQuality??peekQuality(state,mash.item)??mash.base,stageIndex:0,qualityPoints:0,outputPoints:0,ready:false,output:0,quality:0,startedDay:Number(state.day)||1};
  return true;
}
export function initProductionPlant(state,{notify=()=>{},render=()=>{},earnExperience=()=>{}}={}){
  const plant=ensureProductionPlant(state);
  const nav=$(".navigation"),game=$("#game");
  if(nav&&game&&!$("#productionPlant")){
    const tab=el("button","","🏭 Производственный цех");tab.type="button";tab.dataset.tab="productionPlant";nav.append(tab);
    const section=el("section","tab-content panel hidden");section.id="productionPlant";section.innerHTML="<h2>🏭 Производственный цех</h2>";game.append(section);
  }
  registerCartHandler("productionStillUnlock",(current,item)=>{
    const target=Number(item.payload?.unitId)||0;
    const data=ensureProductionPlant(current);
    if(data.units.length>=getStillCapacity(current)||data.units.some(unit=>unit.id===target))return;
    data.units.push({id:target,name:"Аппарат №"+target,model:item.payload?.model||"stainless",maintenance:100,active:null});
    data.nextId=Math.max(data.nextId,target+1);
    notify("Новый аппарат установлен. Производственная линия расширена.");
  });
  registerCartHandler("productionStillBatch",(current,item)=>{
    const data=ensureProductionPlant(current),unit=data.units.find(entry=>entry.id===Number(item.payload?.unitId));
    if(!unit||unit.active)return;
    unit.active={mashType:item.payload.mashType,baseQuality:Number(item.payload.baseQuality)||STILL_MASHES[item.payload.mashType].base,stageIndex:0,qualityPoints:0,outputPoints:0,ready:false,output:0,quality:0,startedDay:Number(current.day)||1};
    notify(unit.name+": партия принята в работу.");
  });
  $("#game")?.addEventListener("click",event=>{
    const button=event.target.closest("[data-still-action]");
    if(!button)return;
    const unitId=Number(button.dataset.unitId),action=button.dataset.stillAction;
    const data=ensureProductionPlant(state);
    if(action==="unlock"){
      const target=Number(button.closest("[data-unlock-unit]")?.dataset.unlockUnit)||data.nextId;
      const offers={2:{cost:700,parts:{metal:4,tools:1},model:"stainless"},3:{cost:1800,parts:{metal:8,pump:2,controller:1},model:"glass"}};
      const offer=offers[target];
      if(!offer||data.units.length>=getStillCapacity(state)||data.units.some(entry=>entry.id===target))return;
      queuePurchase(state,{key:"production-still-unlock:"+target,kind:"productionStillUnlock",name:"Установка аппарата №"+target,cost:offer.cost,parts:offer.parts,payload:{unitId:target,model:offer.model}});
      notify("Новый аппарат и необходимые детали добавлены в общую корзину.");
      render();return;
    }
    const unit=data.units.find(entry=>entry.id===unitId);
    if(!unit)return;
    if(action==="model"){
      if(unit.active)return;
      const model=button.dataset.model;
      if(!STILL_MODELS[model])return;
      unit.model=model;notify(unit.name+": конфигурация изменена на «"+STILL_MODELS[model].name+"».");
    }
    if(action==="start"){
      const mashType=button.dataset.mash,recipe=STILL_MASHES[mashType];
      if(!recipe||unit.active||state.money<8||(state.inventory[recipe.item]||0)<3)return;
      const baseQuality=peekQuality(state,recipe.item)??recipe.base;
      queuePurchase(state,{key:"still-batch:"+unit.id+":"+Date.now(),kind:"productionStillBatch",name:"Запуск "+unit.name+" · "+recipe.name,cost:8,consume:{[recipe.item]:3},payload:{unitId:unit.id,mashType,baseQuality}});
      notify("Запуск партии добавлен в общую корзину.");
    }
    if(action==="stage"){
      if(!unit.active||unit.active.ready)return;
      const result=resolveStillChoice(unit.active,button.dataset.choice);
      if(!result.valid)return;
      if(result.done){
        unit.active.quality=calculateBatchQuality(state,unit,unit.active);
        unit.active.output=Math.max(1,Math.round((2+unit.active.outputPoints+(STILL_MODELS[unit.model]?.output||0))*(1+Math.max(0,getEquipmentProfile(state,unit.active.mashType).output)*.1)));
        unit.maintenance=Math.max(0,unit.maintenance-(STILL_MODELS[unit.model]?.wear||2));
        notify(unit.name+": игровая партия завершена. Качество "+unit.active.quality+"/100, выход "+unit.active.output+".");
        earnExperience(8);
      }else notify(unit.name+": этап завершён. Следующий — "+result.stage+".");
    }
    if(action==="collect"){
      if(!unit.active?.ready)return;
      const batch=unit.active,mash=STILL_MASHES[batch.mashType],model=STILL_MODELS[unit.model];
      const got=addInventory(state,mash.result,batch.output);
      if(got>0){
        recordProduction(state,{name:mash.name+" · "+unit.name,amount:got,item:mash.result,process:"Перегонка · "+unit.name,quality:batch.quality,mashType:batch.mashType,rawItem:mash.item,equipmentLineage:model.name,equipmentSynergy:model.quality,passportType:"production"});
        batch.output-=got;
        notify(unit.name+": на склад помещено "+got+" ед. продукции.");
      }
      if(batch.output<=0)unit.active=null;
    }
    if(action==="service"){
      if(unit.maintenance>=100)return;
      queuePurchase(state,{key:"production-still-service:"+unit.id,kind:"productionStillService",name:"Обслуживание "+unit.name,cost:Math.max(10,Math.ceil((100-unit.maintenance)*1.2)),payload:{unitId:unit.id}});
      notify("Обслуживание "+unit.name+" добавлено в общую корзину.");
    }
    render();
  });
  registerCartHandler("productionStillService",(current,item)=>{
    const unit=ensureProductionPlant(current).units.find(entry=>entry.id===Number(item.payload?.unitId));
    if(unit){unit.maintenance=100;notify(unit.name+" обслужен. Состояние восстановлено.");}
  });
  render();
}
export function advanceProductionPlantDay(state,notify=()=>{}){
  const plant=ensureProductionPlant(state);
  plant.units.forEach(unit=>{
    if(unit.active&&!unit.active.ready&&Number(unit.active.stageIndex)>=STAGES.length){
      unit.active.ready=true;unit.active.output=Math.max(1,2+Number(unit.active.outputPoints||0));unit.active.quality=calculateBatchQuality(state,unit,unit.active);
    }
    if(state.specialization==="engineer"&&!unit.active)unit.maintenance=Math.min(100,unit.maintenance+1);
  });
}
function renderUnit(state,unit){
  const model=STILL_MODELS[unit.model],card=el("article","dispatch-still-card");
  const head=el("div","dispatch-still-head");
  const title=el("h3",""," "+model.icon+" "+unit.name);
  head.replaceChildren(title,el("span","dispatch-maintenance","Обслуживание "+unit.maintenance+"%"));
  card.append(head,el("p","dispatch-model-desc",model.description));
  const models=el("div","dispatch-models");
  Object.entries(STILL_MODELS).forEach(([id,entry])=>{
    const b=el("button","dispatch-model"+(unit.model===id?" selected":""),entry.icon+" "+entry.name);
    b.type="button";b.dataset.stillAction="model";b.dataset.unitId=unit.id;b.dataset.model=id;b.disabled=!!unit.active;models.append(b);
  });
  card.append(models);
  if(unit.active){
    const batch=unit.active;
    card.append(el("div","dispatch-batch-title",STILL_MASHES[batch.mashType].name+" · "+(batch.ready?"готова к сбору":"в процессе")));
    if(batch.ready){
      card.append(el("p","dispatch-ready","Качество "+batch.quality+"/100 · выход "+batch.output+" ед."));
      const collect=el("button","dispatch-primary","Забрать результат");
      collect.type="button";collect.dataset.stillAction="collect";collect.dataset.unitId=unit.id;card.append(collect);
    }else{
      const stage=STAGES[batch.stageIndex];
      card.append(el("p","","Игровой этап "+(batch.stageIndex+1)+"/"+STAGES.length+" · "+stage.name));
      const track=el("div","dispatch-track");
      STAGES.forEach((entry,index)=>track.append(el("span",index<batch.stageIndex?"done":index===batch.stageIndex?"current":"",entry.name)));
      card.append(track);
      const choices=el("div","dispatch-choices");
      stage.choices.forEach(([id,label])=>{
        const b=el("button",""," "+label);b.type="button";b.dataset.stillAction="stage";b.dataset.unitId=unit.id;b.dataset.choice=id;choices.append(b);
      });
      card.append(choices);
    }
  }else{
    card.append(el("p","dispatch-idle","Свободен · выбери сырьё для новой партии."));
    const starts=el("div","dispatch-starts");
    Object.entries(STILL_MASHES).forEach(([id,mash])=>{
      const count=Number(state.inventory[mash.item])||0;
      const b=el("button","",""+MASH_LABELS[id]+" брага · "+count+"/3");
      b.type="button";b.dataset.stillAction="start";b.dataset.unitId=unit.id;b.dataset.mash=id;b.disabled=count<3||state.money<8;
      starts.append(b);
    });
    card.append(starts);
  }
  const service=el("button","dispatch-service","🔧 Обслужить · "+Math.max(10,Math.ceil((100-unit.maintenance)*1.2))+" монет");
  service.type="button";service.dataset.stillAction="service";service.dataset.unitId=unit.id;service.disabled=unit.maintenance>=100||!!unit.active;
  card.append(service);
  return card;
}
export function renderProductionPlant(state){
  const root=$("#productionPlant");if(!root)return;
  const plant=ensureProductionPlant(state),capacity=getStillCapacity(state);
  root.replaceChildren();
  root.append(el("p","feature-intro","Диспетчерская производственного цеха. Управляй независимыми аппаратами, распределяй сырьевые партии и следи за состоянием каждой установки. Все показатели — игровые абстракции."));
  const summary=el("div","dispatch-summary");
  const active=plant.units.filter(unit=>unit.active&&!unit.active.ready).length;
  const ready=plant.units.filter(unit=>unit.active?.ready).length;
  [[plant.units.length,"Аппаратов"],[active,"В работе"],[ready,"Готово к сбору"],[capacity,"Доступно мест"]].forEach(([value,label])=>{const tile=el("div","dispatch-kpi");tile.append(el("b","",String(value)),el("span","",label));summary.append(tile);});
  root.append(summary);
  const grid=el("div","dispatch-still-grid");
  plant.units.forEach(unit=>grid.append(renderUnit(state,unit)));
  root.append(grid);
  if(plant.units.length<capacity){
    const next=plant.nextId,options={2:{cost:700,parts:{metal:4,tools:1},model:"stainless"},3:{cost:1800,parts:{metal:8,pump:2,controller:1},model:"glass"}};
    const offer=options[next]||options[3];
    const card=el("article","dispatch-expansion");
    card.append(el("h3","","🏗 Расширение цеха"),el("p","","Построй дополнительное независимое рабочее место. Второй и третий аппараты позволяют вести несколько партий параллельно."));
    const b=el("button","","Установить аппарат №"+next+" · "+offer.cost+" монет + детали");
    b.type="button";b.dataset.stillAction="unlock";b.disabled=state.money<offer.cost;card.append(b);
    card.dataset.unlockUnit=next;root.append(card);
  }
}
