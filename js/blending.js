import { addInventory, removeInventory, hasInventory } from "./economy.js";

export const BLEND_RECIPES = [
  {id:"house_blend",name:"Деревенский купаж",item:"house_blend",description:"Сбалансированный профиль: свежая партия и выдержанный запас.",ingredients:{spirit:2,aged_spirit:1},bonus:2},
  {id:"orchard_blend",name:"Садовый купаж",item:"orchard_blend",description:"Фруктовые ноты усиливаются выдержанной основой.",ingredients:{spirit:2,aged_spirit:1},bonus:5,flavorTag:"фруктовый акцент"},
  {id:"honey_blend",name:"Медовый резерв",item:"honey_blend",description:"Медовый дистиллят с округлой выдержанной нотой.",ingredients:{honey_spirit:2,aged_honey_spirit:1},bonus:4,flavorTag:"медовый шлейф"},
  {id:"berry_tincture_blend",name:"Ягодный бархат",item:"berry_reserve_tincture",description:"Смородиновая насыщенность и мягкая малиновая сладость.",ingredients:{blackcurrant_tincture:2,raspberry_tincture:1},bonus:7,flavorTag:"ягодный бархат"},
  {id:"herbal_tincture_blend",name:"Лесная пряность",item:"herbal_spice_tincture",description:"Мята и можжевельник создают свежий хвойно-травяной профиль.",ingredients:{mint_tincture:2,juniper_tincture:1},bonus:7,flavorTag:"хвойная свежесть"},
  {id:"meadow_tincture_blend",name:"Луговой резерв",item:"meadow_reserve_tincture",description:"Цветочная луговая основа с мягким шиповниковым оттенком.",ingredients:{meadow_tincture:2,rosehip_tincture:1},bonus:8,flavorTag:"цветочно-фруктовый профиль"}
];

const FALLBACK = {
  spirit:{body:55,aroma:54,notes:["нейтральный","зерновой"]},
  aged_spirit:{body:72,aroma:68,notes:["дубовый","мягкий"]},
  honey_spirit:{body:70,aroma:78,notes:["медовый","цветочный"]},
  aged_honey_spirit:{body:82,aroma:84,notes:["медовый","древесный"]},
  blackcurrant_tincture:{body:76,aroma:88,notes:["смородина","ягодная кислинка"]},
  raspberry_tincture:{body:68,aroma:91,notes:["малина","летние ягоды"]},
  blueberry_tincture:{body:72,aroma:86,notes:["черника","лесные ягоды"]},
  forest_tincture:{body:82,aroma:90,notes:["лесные ягоды","терпкость"]},
  mint_tincture:{body:58,aroma:92,notes:["мята","свежесть"]},
  meadow_tincture:{body:66,aroma:89,notes:["луговые травы","цветы"]},
  juniper_tincture:{body:84,aroma:90,notes:["можжевельник","хвоя"]},
  rosehip_tincture:{body:74,aroma:84,notes:["шиповник","мягкая кислинка"]}
};
const el = (tag,cls,text) => { const node=document.createElement(tag); if(cls)node.className=cls; if(text!==undefined)node.textContent=text; return node; };

export function calculateBlendProfile(state, recipe) {
  let total=0,quality=0,body=0,aroma=0,notes=[];
  for(const [item,amount] of Object.entries(recipe.ingredients)){
    let remaining=amount,covered=0;
    for(const lot of state.qualityLots||[]){
      if(lot.item!==item||remaining<=0)continue;
      const take=Math.min(remaining,Math.max(0,Number(lot.remaining)||0));
      if(!take)continue;
      const passport=state.productionLog?.find(row=>row.passport?.id===lot.passportId)?.passport;
      const profile=passport?.flavorProfile||FALLBACK[item]||FALLBACK.spirit;
      quality+=(lot.quality==null?60:Number(lot.quality))*take;
      body+=(Number(profile.body)||50)*take;
      aroma+=(Number(profile.aroma)||50)*take;
      covered+=take;
      notes.push(...(profile.notes||[]));
      remaining-=take;
    }
    if(remaining>0){const fallback=FALLBACK[item]||FALLBACK.spirit;quality+=60*remaining;body+=(fallback.body||50)*remaining;aroma+=(fallback.aroma||50)*remaining;notes.push(...(fallback.notes||[]));}
    total+=amount;
  }
  const score=Math.max(20,Math.min(100,Math.round(quality/Math.max(1,total)+recipe.bonus)));
  const profile={body:Math.round(body/Math.max(1,total)),aroma:Math.round(aroma/Math.max(1,total)),notes:[...new Set(notes)].slice(0,4)};
  if(recipe.flavorTag)profile.notes=[...new Set([...profile.notes,recipe.flavorTag])].slice(0,4);
  return {score,profile};
}

export function blendBatch(state, recipeId, recordProduction, ratio=null) {
  const baseRecipe=BLEND_RECIPES.find(row=>row.id===recipeId);
  if(!baseRecipe)return null;
  const ids=Object.keys(baseRecipe.ingredients);
  const saved=state.blendStandards?.[recipeId];
  const chosen=ratio||saved||null;
  const ingredients=chosen&&ids.length===2?{[ids[0]]:Math.max(1,Math.min(4,Number(chosen.a)||baseRecipe.ingredients[ids[0]])),[ids[1]]:Math.max(1,Math.min(4,Number(chosen.b)||baseRecipe.ingredients[ids[1]]))}:baseRecipe.ingredients;
  const recipe={...baseRecipe,ingredients};
  const deviation=ids.reduce((sum,id)=>sum+Math.abs(ingredients[id]-baseRecipe.ingredients[id]),0);
  recipe.bonus=baseRecipe.bonus-deviation*2;
  if(!hasInventory(state,recipe.ingredients))return null;
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
  const output=Math.max(1,Object.values(recipe.ingredients).reduce((sum,n)=>sum+n,0)-1);
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
  const recentScores=(state.blendLog||[]).slice(0,9).map(row=>Number(row.quality)||0);
  state.blendReputation=Math.round(([...recentScores,score].reduce((sum,n)=>sum+n,0))/Math.max(1,recentScores.length+1));
  const passportId=recordProduction(state,{
    name:recipe.name,item:recipe.item,amount:output,process:"Купажирование",
    quality:score,recipeId:recipe.id,recipeName:recipe.name,
    ratio:Object.entries(recipe.ingredients).map(([id,n])=>id+":"+n).join(" + "),
    flavorProfile:profile,passportType:"signature"
  });
  state.blendLog??=[];
  state.blendLog.unshift({day:Number(state.day)||1,name:recipe.name,item:recipe.item,recipeId:recipe.id,quality:score,passportId,flavorProfile:profile,ratio:{a:ingredients[ids[0]],b:ingredients[ids[1]]}});
  state.blendLog=state.blendLog.slice(0,20);
  return {recipe,score,profile,output,passportId};
}

export function renderBlendWorkshop(state,root) {
  state.blendStandards??={};
  const card=el("section","blend-workshop");
  card.append(el("h3","","🧪 Купажная мастерская"),el("p","","Подбирай пропорции, проводи дегустацию и закрепляй собственную марку. Каждый результат получает паспорт партии."),el("p","blend-brand-reputation","Репутация марки: "+(Number(state.blendReputation)||0)+"/100 · на цену купажей влияет стабильность качества."));
  for(const recipe of BLEND_RECIPES){
    const row=el("article","blend-recipe");
    const labels={spirit:"Спирт-сырец",aged_spirit:"Выдержанный продукт",honey_spirit:"Медовый дистиллят",aged_honey_spirit:"Выдержанный медовый дистиллят",blackcurrant_tincture:"Смородиновая настойка",raspberry_tincture:"Малиновая настойка",mint_tincture:"Мятная настойка",juniper_tincture:"Можжевеловая настойка",meadow_tincture:"Луговая настойка",rosehip_tincture:"Шиповниковая настойка"};
    const requirements=Object.entries(recipe.ingredients).map(([id,n])=>labels[id]+": "+(Number(state.inventory?.[id])||0)+"/"+n).join(" · ");
    row.append(el("h4","",recipe.name),el("p","",recipe.description),el("small","",requirements));
    const ratioPanel=el("div","blend-ratio-panel");
    const ids=Object.keys(recipe.ingredients);
    ids.forEach((id,index)=>{
      const field=el("label","blend-ratio-field",(labels[id]||id)+" · доля");
      const select=el("select","");select.dataset.blendRatio=index===0?"a":"b";select.setAttribute("aria-label","Количество: "+(labels[id]||id));
      const standard=state.blendStandards[recipe.id];
      const defaultRatio=index===0?(standard?.a||recipe.ingredients[id]):(standard?.b||recipe.ingredients[id]);
      for(let n=1;n<=4;n++){const option=el("option","",String(n));option.value=String(n);option.selected=n===defaultRatio;select.append(option);}
      field.append(select);ratioPanel.append(field);
    });
    row.append(ratioPanel);
    const button=el("button","","Смешать партию");
    button.type="button";button.dataset.blend=recipe.id;
    const updateAvailability=()=>{
      const chosen={[ids[0]]:Number(ratioPanel.querySelector("[data-blend-ratio=a]")?.value)||1,[ids[1]]:Number(ratioPanel.querySelector("[data-blend-ratio=b]")?.value)||1};
      button.disabled=!hasInventory(state,chosen);
    };
    ratioPanel.addEventListener("change",updateAvailability);
    updateAvailability();
    row.append(button);
    const standard=state.blendStandards[recipe.id];
    if(standard)row.append(el("small","blend-standard-note","Закреплённый стандарт: "+standard.a+":"+standard.b+" · качество "+standard.quality+"/100"));
    card.append(row);
  }
  const history=el("div","blend-history");
  (state.blendLog||[]).slice(0,5).forEach(entry=>history.append(el("p","", "День "+entry.day+" · "+entry.name+" · "+entry.quality+"/100 · "+(entry.flavorProfile?.notes||[]).join(", "))));
  if(!history.childElementCount)history.append(el("small","","Здесь появятся результаты первых купажей."));
  card.append(el("h4","","История купажирования"),history);
  const latest=state.blendLog?.[0];
  if(latest&&latest.quality>=80){const pin=el("button","blend-pin-standard","Закрепить последний удачный купаж как стандарт");pin.type="button";pin.dataset.pinBlend=latest.recipeId;card.append(pin);}
  const standards=el("div","blend-standards");
  Object.entries(state.blendStandards).forEach(([id,st])=>{const recipe=BLEND_RECIPES.find(x=>x.id===id);if(recipe)standards.append(el("p","",""+recipe.name+" · "+st.a+":"+st.b+" · "+st.quality+"/100"));});
  if(standards.childElementCount){card.append(el("h4","","Мои стандарты купажирования"),standards);}
  root.append(card);
}

export function handleBlendClick(state,button,recordProduction,notify=()=>{}) {
  if(button?.dataset?.pinBlend){
    const latest=state.blendLog?.find(entry=>entry.recipeId===button.dataset.pinBlend);
    if(!latest||latest.quality<80||!latest.ratio)return true;
    state.blendStandards??={};
    const previous=state.blendStandards[latest.recipeId];
    if(previous&&Number(previous.quality)>=Number(latest.quality)){notify("Текущий стандарт уже не хуже этой партии.");return true;}
    state.blendStandards[latest.recipeId]={a:latest.ratio.a,b:latest.ratio.b,quality:latest.quality,passportId:latest.passportId,day:latest.day};
    notify("Удачный купаж закреплён как производственный стандарт.");return true;
  }
  if(!button?.dataset?.blend)return false;
  const row=button.closest(".blend-recipe");
  const ratio={a:Number(row?.querySelector('[data-blend-ratio="a"]')?.value),b:Number(row?.querySelector('[data-blend-ratio="b"]')?.value)};
  const result=blendBatch(state,button.dataset.blend,recordProduction,ratio);
  if(!result){notify("Не хватает подходящих партий или свободного места на складе.");return true;}
  notify("Купаж «"+result.recipe.name+"» готов: "+result.output+" ед., качество "+result.score+"/100. Пропорция: "+Object.entries(result.recipe.ingredients).map(([id,n])=>id+" × "+n).join(" + ")+".");
  return true;
}
