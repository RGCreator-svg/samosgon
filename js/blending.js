import { addInventory, removeInventory, hasInventory } from "./economy.js";

export const BLEND_RECIPES = [
  {id:"house_blend",name:"Деревенский купаж",item:"house_blend",description:"Сбалансированный профиль: свежая партия и выдержанный запас.",ingredients:{spirit:2,aged_spirit:1},bonus:2},
  {id:"orchard_blend",name:"Садовый купаж",item:"orchard_blend",description:"Фруктовые ноты усиливаются выдержанной основой.",ingredients:{spirit:2,aged_spirit:1},bonus:5,flavorTag:"фруктовый акцент"},
  {id:"honey_blend",name:"Медовый резерв",item:"honey_blend",description:"Медовый дистиллят с округлой выдержанной нотой.",ingredients:{honey_spirit:2,aged_honey_spirit:1},bonus:4,flavorTag:"медовый шлейф"}
];

const FALLBACK = {
  spirit:{body:55,aroma:54,notes:["нейтральный","зерновой"]},
  aged_spirit:{body:72,aroma:68,notes:["дубовый","мягкий"]},
  honey_spirit:{body:70,aroma:78,notes:["медовый","цветочный"]},
  aged_honey_spirit:{body:82,aroma:84,notes:["медовый","древесный"]}
};
const el = (tag,cls,text) => { const node=document.createElement(tag); if(cls)node.className=cls; if(text!==undefined)node.textContent=text; return node; };

export function calculateBlendProfile(state, recipe) {
  let total=0,quality=0,body=0,aroma=0,notes=[];
  for(const [item,amount] of Object.entries(recipe.ingredients)){
    let remaining=amount;
    for(const lot of state.qualityLots||[]){
      if(lot.item!==item||remaining<=0)continue;
      const take=Math.min(remaining,Math.max(0,Number(lot.remaining)||0));
      if(!take)continue;
      const passport=state.productionLog?.find(row=>row.passport?.id===lot.passportId)?.passport;
      const profile=passport?.flavorProfile||FALLBACK[item]||FALLBACK.spirit;
      quality+=(lot.quality==null?60:Number(lot.quality))*take;
      body+=(Number(profile.body)||50)*take;
      aroma+=(Number(profile.aroma)||50)*take;
      notes.push(...(profile.notes||[]));
      remaining-=take;
    }
    total+=amount;
  }
  const score=Math.max(20,Math.min(100,Math.round(quality/Math.max(1,total)+recipe.bonus)));
  const profile={body:Math.round(body/Math.max(1,total)),aroma:Math.round(aroma/Math.max(1,total)),notes:[...new Set(notes)].slice(0,4)};
  if(recipe.flavorTag)profile.notes=[...new Set([...profile.notes,recipe.flavorTag])].slice(0,4);
  return {score,profile};
}

export function blendBatch(state, recipeId, recordProduction) {
  const recipe=BLEND_RECIPES.find(row=>row.id===recipeId);
  if(!recipe||!hasInventory(state,recipe.ingredients))return null;
  const {score,profile}=calculateBlendProfile(state,recipe);
  // Отражаем расход в исходных паспортах до FIFO-списания складских лотов.
  for(const [item,amount] of Object.entries(recipe.ingredients)){
    let remaining=amount;
    for(const lot of state.qualityLots||[]){
      if(lot.item!==item||remaining<=0||!lot.passportId)continue;
      const take=Math.min(remaining,Math.max(0,Number(lot.remaining)||0));
      const passport=state.productionLog?.find(row=>row.passport?.id===lot.passportId)?.passport;
      if(passport&&take){passport.remaining=Math.max(0,(Number(passport.remaining??passport.amount)||0)-take);passport.consumed=(Number(passport.consumed)||0)+take;}
      remaining-=take;
    }
  }
  for(const [item,amount] of Object.entries(recipe.ingredients)){
    if(removeInventory(state,item,amount)!==amount)return null;
  }
  const output=2;
  const accepted=addInventory(state,recipe.item,output);
  if(accepted!==output){
    if(accepted>0)removeInventory(state,recipe.item,accepted);
    for(const [item,amount] of Object.entries(recipe.ingredients)){
      state.inventory[item]=(Number(state.inventory[item])||0)+amount;
      state.qualityLots??=[];
      state.qualityLots.push({item,remaining:amount,quality:null,passportId:null,legacy:true});
    }
    return null;
  }
  const passportId=recordProduction(state,{
    name:recipe.name,item:recipe.item,amount:output,process:"Купажирование",
    quality:score,recipeId:recipe.id,recipeName:recipe.name,
    ratio:Object.entries(recipe.ingredients).map(([id,n])=>id+":"+n).join(" + "),
    flavorProfile:profile
  });
  state.blendLog??=[];
  state.blendLog.unshift({day:Number(state.day)||1,name:recipe.name,item:recipe.item,quality:score,passportId,flavorProfile:profile});
  state.blendLog=state.blendLog.slice(0,20);
  return {recipe,score,profile,output,passportId};
}

export function renderBlendWorkshop(state,root) {
  const card=el("section","blend-workshop");
  card.append(el("h3","","🧪 Купажная мастерская"),el("p","","Объединяй готовые партии. Качество и вкусовой профиль рассчитываются по паспортам исходных партий; купаж получает собственный паспорт."));
  for(const recipe of BLEND_RECIPES){
    const row=el("article","blend-recipe");
    const labels={spirit:"Спирт-сырец",aged_spirit:"Выдержанный продукт",honey_spirit:"Медовый дистиллят",aged_honey_spirit:"Выдержанный медовый дистиллят"};
    const requirements=Object.entries(recipe.ingredients).map(([id,n])=>labels[id]+": "+(Number(state.inventory?.[id])||0)+"/"+n).join(" · ");
    row.append(el("h4","",recipe.name),el("p","",recipe.description),el("small","",requirements));
    const button=el("button","","Смешать 2 ед.");
    button.type="button";button.dataset.blend=recipe.id;
    button.disabled=!hasInventory(state,recipe.ingredients);
    row.append(button);card.append(row);
  }
  const history=el("div","blend-history");
  (state.blendLog||[]).slice(0,5).forEach(entry=>history.append(el("p","", "День "+entry.day+" · "+entry.name+" · "+entry.quality+"/100 · "+(entry.flavorProfile?.notes||[]).join(", "))));
  if(!history.childElementCount)history.append(el("small","","Здесь появятся результаты первых купажей."));
  card.append(el("h4","","История купажирования"),history);
  root.append(card);
}

export function handleBlendClick(state,button,recordProduction,notify=()=>{}) {
  if(!button?.dataset?.blend)return false;
  const result=blendBatch(state,button.dataset.blend,recordProduction);
  if(!result){notify("Не хватает подходящих партий или свободного места на складе.");return true;}
  notify("Купаж «"+result.recipe.name+"» готов: "+result.output+" ед., качество "+result.score+"/100.");
  return true;
}
