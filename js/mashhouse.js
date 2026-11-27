import { queuePurchase, registerCartHandler, addInventory } from "./economy.js";
import { recordProduction } from "./productionhub.js";

const $ = selector => document.querySelector(selector);
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

export const MASH_RECIPES = [
  {
    id:"sugar", name:"Сахарная брага", icon:"🫙",
    desc:"Классическая партия. Надёжный базовый выход без выраженного вкусового профиля.",
    consume:{sugar:4,water:2,yeast:1,yeast_nutrient:1},
    days:3, outputItem:"braga", output:3, quality:60, rawItem:"braga"
  },
  {
    id:"fruit", name:"Фруктовая брага", icon:"🍎",
    desc:"Яблоки и груши дают более ароматную партию, но требуют больше времени.",
    consume:{apple:3,pear:1,yeast:1,yeast_nutrient:1},
    days:4, outputItem:"fruit_braga", output:3, quality:70, rawItem:"fruit_braga"
  },
  {
    id:"grain", name:"Зерновая брага", icon:"🌾",
    desc:"Отдельная зерновая линия с повышенным базовым качеством и затратами сырья.",
    consume:{grain:4,water:2,yeast:1,yeast_nutrient:1},
    days:4, outputItem:"grain_braga", output:3, quality:73, rawItem:"grain_braga"
  }
];

export function ensureMashHouse(state) {
  state.mashHouse ??= { batches:[], nextId:1, tempProfile:"stable" };
  state.mashHouse.tempProfile ??= "stable";
  if (!Array.isArray(state.mashHouse.batches)) state.mashHouse.batches = [];
  state.mashHouse.nextId = Math.max(1,Number(state.mashHouse.nextId)||1);
  return state.mashHouse;
}

export function getMashCapacity(state) {
  return 2 + Math.max(0,Math.min(3,Number(state.buildings?.production)||0));
}

export function startMashBatch(state,recipeId,tempProfile=ensureMashHouse(state).tempProfile) {
  const recipe=MASH_RECIPES.find(entry=>entry.id===recipeId);
  const house=ensureMashHouse(state);
  if(!recipe||house.batches.length>=getMashCapacity(state))return false;
  const days=Math.max(1,recipe.days-(state.skills?.includes("patient_master")?1:0));
  house.batches.push({
    id:house.nextId++,recipeId:recipe.id,name:recipe.name,
    remaining:days,totalDays:days,stage:"fermentation",ready:false,
    output:recipe.output,outputItem:recipe.outputItem,quality:recipe.quality,rawItem:recipe.rawItem,
    tempProfile:["stable","fast","gentle"].includes(tempProfile)?tempProfile:"stable",temperatureDrift:0
  });
  return true;
}

export function getQueuedMashCount(state) {
  return (state.purchaseCart||[])
    .filter(item=>item.kind==="mashHouseBatch")
    .reduce((sum,item)=>sum+Math.max(1,Number(item.quantity)||1),0);
}

export function initMashHouse(state,{notify=()=>{}}={}) {
  ensureMashHouse(state);
  registerCartHandler("mashHouseBatch",(current,item)=>{
    const house=ensureMashHouse(current);
    const recipe=MASH_RECIPES.find(entry=>entry.id===item.payload?.recipeId);
    if(!recipe)return;
    for(let i=0;i<Math.max(1,Number(item.quantity)||1);i++)startMashBatch(current,recipe.id,item.payload?.tempProfile);
    notify("Новая партия поставлена в бродильню.");
  });
}

export function renderMashHouse(state,root) {
  const house=ensureMashHouse(state);
  const capacity=getMashCapacity(state);
  const queued=getQueuedMashCount(state);
  const card=el("article","feature-card mash-house-card");
  card.append(el("h3","","🫙 Бродильня — подготовка браги"));
  card.append(el("p","","Основной производственный цикл начинается здесь. Выбери сырьё, поставь партию и дождись завершения брожения. Состав и срок влияют на игровой профиль будущего дистиллята."));
  const summary=el("div","mash-house-summary");
  summary.append(el("b","",String(house.batches.length)+" / "+capacity+" чанов занято"));
  summary.append(el("span","",queued?"В общей корзине ожидает запуска: "+queued:"Новых запусков в корзине нет"));
  card.append(summary);
  const profilePanel=el("div","mash-temp-panel");
  profilePanel.append(el("b","","Игровой режим контроля брожения"));
  const profiles=[["stable","🌡 Стабильный","Ровный результат, стандартный срок."],["fast","⚡ Ускоренный","Быстрее, но выше риск потери качества."],["gentle","🍃 Бережный","Немного дольше, бонус к стабильности партии."]];
  profiles.forEach(([id,label,desc])=>{
    const button=el("button","mash-temp-option"+(house.tempProfile===id?" selected":""),label);
    button.type="button";button.dataset.mashTempProfile=id;button.title=desc;
    profilePanel.append(button);
  });
  profilePanel.append(el("small","","Термометр ферментера и охлаждающая рубашка уменьшают игровые погодные колебания. Это условная механика, не инструкция по реальному брожению."));
  card.append(profilePanel);

  const recipes=el("div","mash-recipe-grid");
  MASH_RECIPES.forEach(recipe=>{
    const item=el("article","mash-recipe");
    item.append(el("h4","",recipe.icon+" "+recipe.name),el("p","",recipe.desc));
    item.append(el("p","mash-recipe-meta","Сырьё: "+Object.entries(recipe.consume).map(([id,n])=>id+" × "+n).join(" · ")));
    item.append(el("p","mash-recipe-meta","Срок: "+recipe.days+" игровых дня · Выход: "+recipe.output+" ед."));
    const missing=Object.entries(recipe.consume).filter(([id,n])=>(Number(state.inventory?.[id])||0)<n);
    const button=el("button","","Поставить партию · 8 монет");
    button.type="button";
    button.dataset.mashBatch=recipe.id;
    button.disabled=!state.skills?.includes("ferment")||house.batches.length+queued>=capacity||missing.length>0;
    item.append(button);
    if(!state.skills?.includes("ferment"))item.append(el("small","tech-locked","Изучите «Основы брожения»."));
    else if(missing.length)item.append(el("small","tech-locked","Не хватает: "+missing.map(([id,n])=>id+" × "+(n-(Number(state.inventory?.[id])||0))).join(", ")));
    recipes.append(item);
  });
  card.append(recipes);

  const batches=el("div","mash-batch-list");
  batches.append(el("h4","","Текущие чаны"));
  if(!house.batches.length)batches.append(el("p","economy-empty","Пока пусто. Запусти первую партию браги."));
  house.batches.forEach(batch=>{
    const row=el("div","mash-batch-row"+(batch.ready?" is-ready":""));
    const info=el("div","mash-batch-info");
    info.append(el("b","",batch.name),el("span","",batch.ready?"Брожение завершено · предварительное качество "+batch.quality+"/100":"Брожение · осталось "+batch.remaining+" дн."));
    const meter=el("div","mash-progress");
    const fill=el("span","");
    fill.style.width=(batch.ready?100:Math.max(0,Math.min(100,100*(1-batch.remaining/Math.max(1,batch.totalDays)))))+"%";
    meter.append(fill);info.append(meter);row.append(info);
    if(batch.ready){const collect=el("button","","Снять брагу на склад");collect.type="button";collect.dataset.mashCollect=String(batch.id);row.append(collect);}
    batches.append(row);
  });
  card.append(batches);
  root.append(card);
}

export function handleMashHouseClick(state,button,{notify=()=>{},render=()=>{}}={}) {
  if(button.dataset.mashTempProfile){ensureMashHouse(state).tempProfile=button.dataset.mashTempProfile;render();return true;}
  const recipeId=button.dataset.mashBatch;
  if(recipeId){
    const recipe=MASH_RECIPES.find(item=>item.id===recipeId);
    const house=ensureMashHouse(state);
    const occupied=house.batches.length+getQueuedMashCount(state);
    if(!recipe||!state.skills?.includes("ferment")||occupied>=getMashCapacity(state))return true;
    if(Object.entries(recipe.consume).some(([id,n])=>(Number(state.inventory?.[id])||0)<n)){
      notify("Не хватает сырья для этой партии.");return true;
    }
    queuePurchase(state,{
      key:"mash-house:"+recipe.id,kind:"mashHouseBatch",
      name:"Брожение: "+recipe.name,cost:8,consume:recipe.consume,
      payload:{recipeId:recipe.id,tempProfile:ensureMashHouse(state).tempProfile},stackable:true
    });
    notify("Партия добавлена в общую корзину. После оплаты чаны начнут работу.");
    render();return true;
  }
  if(button.dataset.mashCollect!==undefined){
    const house=ensureMashHouse(state);
    const index=house.batches.findIndex(item=>String(item.id)===button.dataset.mashCollect);
    const batch=house.batches[index];
    if(!batch?.ready)return true;
    const accepted=addInventory(state,batch.outputItem,batch.output);
    if(accepted>0){
      recordProduction(state,{
        name:batch.name,amount:accepted,item:batch.outputItem,
        process:"Брожение",quality:batch.quality,rawItem:batch.rawItem
      });
      batch.output-=accepted;
    }
    if(batch.output<=0)house.batches.splice(index,1);
    notify(accepted?"На склад поступило "+accepted+" ед. браги.":"Склад заполнен — освободи место для готовой партии.");
    render();return true;
  }
  return false;
}

export function advanceMashHouseDay(state,notify=()=>{}) {
  const house=ensureMashHouse(state);
  house.batches.forEach(batch=>{
    if(batch.ready)return;
    const weather=state.world?.weather||"sunny";
    const unstable=["heat","frost","storm","snow"].includes(weather);
    const owned=new Set(state.equipmentModules||[]);
    const control=owned.has("ferment_thermo")?2:0;
    const cooling=owned.has("cooling_jacket")?2:0;
    const airlock=owned.has("airlock")?1:0;
    const protection=control+cooling+airlock;
    if(unstable){
      const risk=batch.tempProfile==="fast"?3:batch.tempProfile==="gentle"?0:1;
      const drift=Math.max(0,risk-protection);
      batch.temperatureDrift=(Number(batch.temperatureDrift)||0)+drift;
      batch.quality=Math.max(35,(Number(batch.quality)||60)-drift);
    } else if(batch.tempProfile==="gentle") batch.quality=Math.min(96,(Number(batch.quality)||60)+1);
    batch.remaining=Math.max(0,(Number(batch.remaining)||0)-(batch.tempProfile==="fast"?1:1));
    if(batch.remaining===0){
      batch.ready=true;
      const bonus= batch.tempProfile==="gentle"?2:0;
      batch.quality=Math.max(35,Math.min(96,(Number(batch.quality)||60)+bonus));
      notify("🫙 "+batch.name+" готова! Игровая оценка стабильности: "+Math.max(0,100-(batch.temperatureDrift||0)*8)+"/100.");
    }
  });
}
