import { addInventory, removeInventory, queuePurchase, registerCartHandler } from "./economy.js";
import { recordProduction } from "./productionhub.js";

const $=selector=>document.querySelector(selector);
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};

export const CELLAR_PRODUCTS={
  spirit:{name:"Спирт-сырец",output:"aged_spirit",days:4,base:62,bonus:13},
  honey_spirit:{name:"Медовый дистиллят",output:"aged_honey_spirit",days:5,base:68,bonus:15},
  wine:{name:"Вино",output:"wine",days:3,base:64,bonus:10},
  mead:{name:"Медовуха",output:"mead",days:3,base:62,bonus:9},
  apple_cider:{name:"Яблочный сидр",output:"apple_cider",days:2,base:60,bonus:7},
  pear_wine:{name:"Грушевое вино",output:"pear_wine",days:4,base:68,bonus:12},
  fruit_wine:{name:"Садовое фруктовое вино",output:"fruit_wine",days:4,base:70,bonus:12}
};
export const BARREL_WOODS={
  oak:{name:"Дуб",icon:"🪵",quality:5,aroma:8,note:"дубовый"},
  cherry:{name:"Вишня",icon:"🍒",quality:3,aroma:10,note:"ягодно-фруктовый"},
  acacia:{name:"Акация",icon:"🌼",quality:4,aroma:9,note:"цветочный"}
};
export function ensureCellar(state){
  state.cellar??={barrels:[],nextId:1};
  const cellar=state.cellar;
  if(!Array.isArray(cellar.barrels))cellar.barrels=[];
  cellar.barrels.forEach((barrel,index)=>{barrel.id=Number(barrel.id)||index+1;barrel.wood=BARREL_WOODS[barrel.wood]?barrel.wood:"oak";barrel.active??=null;});
  cellar.nextId=Math.max(1,Number(cellar.nextId)||cellar.barrels.length+1);
  if(state.viticulture?.buildings?.includes("wineCellar")){
    while(cellar.barrels.length<2){cellar.barrels.push({id:cellar.nextId++,wood:"oak",active:null});}
  }
  return cellar;
}
export function startAging(state,barrelId,itemId){
  const cellar=ensureCellar(state),barrel=cellar.barrels.find(x=>x.id===Number(barrelId)),product=CELLAR_PRODUCTS[itemId];
  if(!barrel||barrel.active||!product||(Number(state.inventory?.[itemId])||0)<1)return false;
  const lot=(state.qualityLots||[]).find(x=>x.item===itemId&&x.remaining>0);
  const passport=lot?.passportId?(state.productionLog||[]).find(x=>x.passport?.id===lot.passportId)?.passport:null;
  const quality=Number(lot?.quality??passport?.quality??product.base);
  if(removeInventory(state,itemId,1)!==1)return false;
  barrel.active={item:itemId,outputItem:product.output,name:product.name,remaining:product.days,days:product.days,quality:Math.max(35,Math.min(100,quality)),bonus:product.bonus,wood:barrel.wood,flavorProfile:passport?.flavorProfile?{...passport.flavorProfile,notes:[...(passport.flavorProfile.notes||[])]}:null,sourcePassportId:passport?.id||null,startedDay:Number(state.day)||1};
  return true;
}
export function ageBarrelsOneDay(state,notify=()=>{}){
  const cellar=ensureCellar(state);
  cellar.barrels.forEach(barrel=>{
    const batch=barrel.active;
    if(!batch||batch.ready)return;
    batch.remaining=Math.max(0,(Number(batch.remaining)||0)-1);
    if(batch.remaining===0){
      const wood=BARREL_WOODS[batch.wood]||BARREL_WOODS.oak;
      batch.ready=true;
      batch.quality=Math.min(100,Math.round(batch.quality+batch.bonus+wood.quality+(Number(state.lab?.qualityBonus)||0)*.1));
      batch.flavorProfile??={body:60,aroma:60,notes:[]};
      batch.flavorProfile.aroma=Math.min(100,(Number(batch.flavorProfile.aroma)||60)+wood.aroma);
      batch.flavorProfile.body=Math.min(100,(Number(batch.flavorProfile.body)||60)+Math.round(wood.quality/2));
      batch.flavorProfile.notes=[...new Set([...(batch.flavorProfile.notes||[]),wood.note,"выдержанный"])].slice(0,5);
      notify("Погреб: партия «"+batch.name+"» созрела в "+wood.name.toLocaleLowerCase("ru")+" бочке. Качество "+batch.quality+"/100.");
    }
  });
}
export function initCellar(state,{notify=()=>{},render=()=>{}}={}){
  const game=$("#game"),nav=$(".navigation");
  if(game&&nav&&!$("#cellar")){
    const tab=el("button","","🪵 Погреб");tab.type="button";tab.dataset.tab="cellar";nav.append(tab);
    const section=el("section","tab-content panel hidden");section.id="cellar";section.innerHTML="<h2>🪵 Погреб выдержки</h2>";game.append(section);
  }
  registerCartHandler("cellarBarrelUnlock",(current,item)=>{
    const data=ensureCellar(current);
    if(data.barrels.length>=4)return;
    data.barrels.push({id:data.nextId++,wood:item.payload?.wood||"oak",active:null});
    notify("В погреб добавлена новая бочка.");
  });
  game?.addEventListener("click",event=>{
    const button=event.target.closest("[data-cellar-action]");if(!button)return;
    const action=button.dataset.cellarAction,barrelId=Number(button.dataset.barrelId),data=ensureCellar(state),barrel=data.barrels.find(x=>x.id===barrelId);
    if(action==="wood"&&barrel&&!barrel.active&&BARREL_WOODS[button.dataset.wood]){barrel.wood=button.dataset.wood;notify("Бочка №"+barrelId+": выбран профиль "+BARREL_WOODS[barrel.wood].name+".");}
    if(action==="start"&&barrel&&!barrel.active){
      const item=button.dataset.item;
      if(startAging(state,barrelId,item))notify("Партия помещена в бочку №"+barrelId+". До созревания: "+barrel.active.days+" игровых дней.");
      else notify("Не удалось поместить партию в бочку. Проверьте склад и свободное место.");
    }
    if(action==="collect"&&barrel?.active?.ready){
      const batch=barrel.active,received=addInventory(state,batch.outputItem,1);
      if(received){recordProduction(state,{name:batch.name+" · выдержка («"+BARREL_WOODS[batch.wood].name+"»)",amount:received,item:batch.outputItem,process:"Погреб · выдержка",quality:batch.quality,flavorProfile:batch.flavorProfile,passportType:"aged"});barrel.active=null;notify("Выдержанная партия отправлена на склад с новым паспортом качества.");}
      else notify("На складе нет места для готовой партии.");
    }
    if(action==="expand"){
      if(data.barrels.length>=4)return;
      const id=data.nextId;
      queuePurchase(state,{key:"cellar-barrel:"+id,kind:"cellarBarrelUnlock",name:"Новая бочка погреба №"+id,cost:450+data.barrels.length*250,parts:{timber:3,metal:1},payload:{wood:"oak"}});
      notify("Новая бочка добавлена в общую корзину.");
    }
    render();
  });
  render();
}
export function renderCellar(state){
  const root=$("#cellar");if(!root)return;
  const cellar=ensureCellar(state);root.replaceChildren(el("h2","","🪵 Погреб выдержки"));
  root.append(el("p","feature-intro","Отправляй готовые игровые партии в бочки, выбирай древесный профиль и жди созревания. Выдержка занимает несколько игровых дней и создаёт отдельный паспорт качества."));
  if(!state.viticulture?.buildings?.includes("wineCellar")){
    root.append(el("p","tech-locked","Сначала построй «Винный погреб» во вкладке «Винодельня». После этого появятся первые две бочки."));
    const go=el("button","","Открыть винодельню");go.type="button";go.dataset.tab="viticulture";root.append(go);return;
  }
  const summary=el("div","dispatch-summary");
  [[cellar.barrels.length,"Бочек"],[cellar.barrels.filter(x=>x.active&&!x.active.ready).length,"На выдержке"],[cellar.barrels.filter(x=>x.active?.ready).length,"Созрели"],[4-cellar.barrels.length,"Свободных мест"]].forEach(([n,label])=>{const tile=el("div","dispatch-kpi");tile.append(el("b","",String(n)),el("span","",label));summary.append(tile);});
  root.append(summary);
  const grid=el("div","cellar-barrel-grid");
  cellar.barrels.forEach(barrel=>{
    const card=el("article","cellar-barrel-card"),wood=BARREL_WOODS[barrel.wood];
    card.append(el("h3","","🛢 Бочка №"+barrel.id+" · "+wood.name));
    if(barrel.active){
      const batch=barrel.active;
      card.append(el("p","",batch.name+" · "+(batch.ready?"Созрела":"Созревание")));
      card.append(el("div","cellar-progress",batch.ready?"Готово к сбору":"Осталось "+batch.remaining+" из "+batch.days+" игровых дней"));
      const meter=el("div","cellar-meter"),fill=el("span","");fill.style.width=((batch.days-batch.remaining)/batch.days*100)+"%";meter.append(fill);card.append(meter);
      card.append(el("p","cellar-quality","Качество "+batch.quality+"/100 · "+wood.note));
      if(batch.ready){const collect=el("button","dispatch-primary","Забрать выдержанную партию");collect.type="button";collect.dataset.cellarAction="collect";collect.dataset.barrelId=barrel.id;card.append(collect);}
    }else{
      const woodRow=el("div","cellar-wood-options");
      Object.entries(BARREL_WOODS).forEach(([id,item])=>{const b=el("button",barrel.wood===id?"selected":"",item.icon+" "+item.name);b.type="button";b.dataset.cellarAction="wood";b.dataset.barrelId=barrel.id;b.dataset.wood=id;woodRow.append(b);});
      card.append(el("p","","Выбери древесный профиль и партию со склада."));
      card.append(woodRow);
      const products=el("div","cellar-product-options");
      Object.entries(CELLAR_PRODUCTS).forEach(([id,item])=>{const count=Number(state.inventory?.[id])||0;if(!count)return;const b=el("button","","Выдержать: "+item.name+" · "+count+" шт.");b.type="button";b.dataset.cellarAction="start";b.dataset.barrelId=barrel.id;b.dataset.item=id;products.append(b);});
      if(!products.children.length)products.append(el("p","economy-empty","Нет подходящих партий. Сначала произведи и собери продукцию."));
      card.append(products);
    }
    grid.append(card);
  });
  root.append(grid);
  if(cellar.barrels.length<4){const expand=el("button","","Добавить бочку · "+(450+cellar.barrels.length*250)+" монет + 3 пиломатериала + 1 металл");expand.type="button";expand.dataset.cellarAction="expand";expand.disabled=state.money<450+cellar.barrels.length*250||Number(state.parts?.timber||0)<3||Number(state.parts?.metal||0)<1;root.append(expand);}
}
