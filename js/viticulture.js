import { queuePurchase, registerCartHandler, addInventory } from "./economy.js";

const $ = selector => document.querySelector(selector);
const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };

const SUPPLIES = [
  { id:"grapes", name:"Виноград", emoji:"🍇", price:18, desc:"Свежее винодельческое сырьё." },
  { id:"honey", name:"Мёд", emoji:"🍯", price:28, desc:"Для медовухи и медовой браги." },
  { id:"yeast", name:"Винные дрожжи", emoji:"🧫", price:16, desc:"Игровой ингредиент для брожения." },
  { id:"sugar", name:"Сахар", emoji:"🧂", price:9, desc:"Дополнительное сырьё для рецептур." },
  { id:"bottles", name:"Пустые бутылки", emoji:"🍾", price:7, desc:"Тара для готовой продукции." },
  { id:"corks", name:"Пробки", emoji:"🪵", price:3, desc:"Укупорка бутылок." },
  { id:"water", name:"Подготовленная вода", emoji:"💧", price:2, desc:"Игровой ингредиент для медовых партий." },
  { id:"yeast_nutrient", name:"Питательная добавка", emoji:"🧪", price:12, desc:"Вспомогательный ингредиент для стабильного игрового брожения." }
];

const BUILDINGS = [
  { id:"vineyard", name:"Виноградник", cost:620, parts:{timber:5,tools:1}, skill:"wine_basics", desc:"Даёт виноград каждый игровой день в подходящий сезон." },
  { id:"winePress", name:"Винный пресс", cost:480, parts:{timber:3,metal:2,tools:1}, skill:"wine_pressing", desc:"Открывает переработку винограда в игровые партии вина." },
  { id:"wineCellar", name:"Винный погреб", cost:850, parts:{timber:6,metal:3}, skill:"cellar_aging", desc:"Ускоряет и улучшает выдержку вина и медовухи." },
  { id:"meadery", name:"Медоварня", cost:540, parts:{timber:3,metal:2,tools:1}, skill:"mead_brewing", desc:"Открывает отдельную линейку медовых напитков." }
];

function ensure(s) {
  s.viticulture ??= { buildings:[], batches:[], nextId:1 };
  s.viticulture.buildings ??= [];
  s.viticulture.batches ??= [];
  s.viticulture.nextId ??= 1;
}

function card(root,title,description) {
  const c=el("article","feature-card");
  c.append(el("h3","",title),el("p","",description));
  root.append(c);
  return c;
}

function render(s) {
  const root=$("#viticulturePanel");
  if(!root)return;
  root.replaceChildren();
  ensure(s);
  const intro=el("p","feature-intro","Отдельное направление хозяйства: виноградник, винодельня, медоварня и медовый дистиллят. Сырьё можно вырастить/получить на ферме или купить у поставщика. Все покупки проходят через общую корзину.");
  root.append(intro);

  const b=card(root,"🏡 Производственные постройки","Стройте инфраструктуру постепенно. Постройки и комплектующие оплачиваются вместе через общую корзину.");
  BUILDINGS.forEach(building=>{
    const owned=s.viticulture.buildings.includes(building.id);
    const line=el("div","farm-upgrade",building.name+" · "+(owned?"построено":building.cost+" монет"));
    line.append(el("p","",building.desc));
    if(!owned){const button=el("button","","Добавить в общую корзину");button.dataset.vitiBuild=building.id;button.disabled=!s.skills.includes(building.skill);line.append(button);if(!s.skills.includes(building.skill))line.append(el("small","tech-locked","Изучите навык: "+building.skill));}
    b.append(line);
  });

  const supply=card(root,"🧺 Поставщик сырья и тары","Закупайте виноград, мёд, дрожжи и тару. Повторные позиции объединяются в общей корзине.");
  const grid=el("div","economy-grid");
  SUPPLIES.forEach(item=>{
    const c=el("article","economy-card");
    c.append(el("h4","",item.emoji+" "+item.name),el("p","",item.desc),el("p","economy-detail","Цена: "+item.price+" монет · На складе: "+(s.inventory[item.id]||0)));
    const button=el("button","","Добавить 1 шт. в общую корзину");
    button.dataset.vitiSupply=item.id;
    c.append(button);grid.append(c);
  });
  supply.append(grid);

  const prod=card(root,"🍷 Производственные линии","Игровые циклы условны и не являются реальными технологическими инструкциями. Сырьё списывается при оплате заказа, а готовая партия появляется через несколько игровых дней.");
  const recipes=[
    {id:"wine",name:"Виноградное вино",desc:"5 винограда + дрожжи + бутылки и пробки. Требуется виноградник, пресс и погреб.",consume:{grapes:5,yeast:1,yeast_nutrient:1,bottles:2,corks:2},days:3,output:"wine",amount:2,needs:["vineyard","winePress","wineCellar"],skill:"cellar_aging"},
    {id:"mead",name:"Медовуха",desc:"4 мёда + дрожжи + сахар. Требуется медоварня.",consume:{honey:4,water:2,yeast:1,yeast_nutrient:1,bottles:3,corks:3},days:3,output:"mead",amount:3,needs:["meadery"],skill:"mead_brewing"},
    {id:"honeyMash",name:"Медовая брага",desc:"6 мёда + дрожжи + сахар. После созревания её можно выбрать в игровой перегонке.",consume:{honey:6,water:2,yeast:1,yeast_nutrient:1},days:3,output:"honey_braga",amount:3,needs:["meadery"],skill:"honey_distillation"}
  ];
  recipes.forEach(recipe=>{
    const missing=recipe.needs.filter(id=>!s.viticulture.buildings.includes(id));
    const c=el("div","farm-upgrade");
    c.append(el("h4","",recipe.name),el("p","",recipe.desc),el("p","feature-meta","Сырьё: "+Object.entries(recipe.consume).map(([id,n])=>id+" × "+n).join(", ")+" · Срок: "+recipe.days+" дн. · Выход: "+recipe.amount));
    const button=el("button","","Поставить партию в общую корзину");
    button.dataset.vitiBatch=recipe.id;
    button.disabled=missing.length>0;
    if(missing.length)c.append(el("small","tech-locked","Нужны постройки: "+missing.join(", ")));
    c.append(button);prod.append(c);
  });

  const batches=card(root,"⏳ Подвальные партии","Текущие партии созревают по игровому календарю.");
  if(!s.viticulture.batches.length)batches.append(el("p","economy-empty","Пока нет активных партий."));
  s.viticulture.batches.forEach(job=>{const row=el("div","aging-row",job.name+" · "+(job.ready?"готово к сбору":"осталось "+job.remaining+" дн."));if(job.ready){const collect=el("button","","Забрать продукцию");collect.dataset.vitiCollect=String(job.id);row.append(collect);}batches.append(row);});
  const stock=card(root,"📦 Запасы винодельни","Виноград и мёд с собственных хозяйств попадают сюда же, что и купленные партии.");
  ["grapes","honey","yeast","yeast_nutrient","water","bottles","corks","wine","mead","honey_braga","honey_spirit"].forEach(id=>stock.append(el("p","economy-detail",id+": "+(s.inventory[id]||0))));
}

export function initViticulture(s,{render:renderGame,notify}) {
  ensure(s);
  const nav=$(".navigation"),game=$("#game");
  if(!nav||!game)return;
  if(!$("#viticulture")){
    const tab=el("button","","🍇 Винодельня");
    tab.dataset.tab="viticulture";nav.append(tab);
    const section=el("section","tab-content panel hidden");
    section.id="viticulture";
    section.innerHTML='<h2>🍇 Виноделие и медоварение</h2><div id="viticulturePanel"></div>';
    game.append(section);
  }
  registerCartHandler("viticultureBuilding",(state,item)=>{
    const building=BUILDINGS.find(x=>x.id===item.payload?.id);
    if(building&&!state.viticulture.buildings.includes(building.id))state.viticulture.buildings.push(building.id);
  });
  registerCartHandler("viticultureSupply",(state,item)=>{
    const supply=SUPPLIES.find(x=>x.id===item.payload?.id);
    if(supply)state.inventory[supply.id]=(Number(state.inventory[supply.id])||0)+item.quantity;
  });
  registerCartHandler("viticultureBatch",(state,item)=>{
    const recipe=item.payload?.recipe;
    if(!recipe)return;
    for(let i=0;i<item.quantity;i++)state.viticulture.batches.push({id:state.viticulture.nextId++,name:recipe.name,remaining:recipe.days,days:recipe.days,output:recipe.amount,outputItem:recipe.output,ready:false});
  });
  $("#viticulture").addEventListener("click",event=>{
    const collect=event.target.closest("[data-viti-collect]");
    if(collect){const index=s.viticulture.batches.findIndex(job=>String(job.id)===collect.dataset.vitiCollect);const job=s.viticulture.batches[index];if(!job?.ready)return;const received=addInventory(s,job.outputItem,job.output);job.output-=received;if(job.output<=0)s.viticulture.batches.splice(index,1);notify("На склад помещено: "+received+" ед. продукции.");renderGame();return;}
    const build=event.target.closest("[data-viti-build]");
    if(build){
      const item=BUILDINGS.find(x=>x.id===build.dataset.vitiBuild);
      if(!item||s.viticulture.buildings.includes(item.id))return;
      queuePurchase(s,{key:"viti-building:"+item.id,kind:"viticultureBuilding",name:item.name,cost:item.cost,parts:item.parts,payload:{id:item.id}});
      notify(item.name+" добавлено в общую корзину.");renderGame();return;
    }
    const supply=event.target.closest("[data-viti-supply]");
    if(supply){
      const item=SUPPLIES.find(x=>x.id===supply.dataset.vitiSupply);if(!item)return;
      queuePurchase(s,{key:"viti-supply:"+item.id,kind:"viticultureSupply",name:item.name,cost:item.price,payload:{id:item.id},output:{[item.id]:1},quantity:1,stackable:true});
      notify(item.name+" добавлено в общую корзину.");renderGame();return;
    }
    const batch=event.target.closest("[data-viti-batch]");
    if(batch){
      const recipes={
        wine:{id:"wine",name:"Виноградное вино",consume:{grapes:5,yeast:1,yeast_nutrient:1,bottles:2,corks:2},days:3,output:"wine",amount:2,needs:["vineyard","winePress","wineCellar"],skill:"cellar_aging"},
        mead:{id:"mead",name:"Медовуха",consume:{honey:4,water:2,yeast:1,yeast_nutrient:1,bottles:3,corks:3},days:3,output:"mead",amount:3,needs:["meadery"],skill:"mead_brewing"},
        honeyMash:{id:"honeyMash",name:"Медовая брага",consume:{honey:6,water:2,yeast:1,yeast_nutrient:1},days:3,output:"honey_braga",amount:3,needs:["meadery"],skill:"honey_distillation"}
      };
      const recipe=recipes[batch.dataset.vitiBatch];
      if(!recipe||recipe.needs.some(id=>!s.viticulture.buildings.includes(id))||!s.skills.includes(recipe.skill))return;
      queuePurchase(s,{key:"viti-batch:"+recipe.id,kind:"viticultureBatch",name:"Партия: "+recipe.name,cost:0,consume:recipe.consume,payload:{recipe}});
      notify("Производственная партия добавлена в общую корзину.");renderGame();return;
    }
  });
  nav.addEventListener("click",event=>{
    if(!event.target.closest('[data-tab="viticulture"]'))return;
    document.querySelectorAll(".tab-content").forEach(x=>x.classList.toggle("hidden",x.id!=="viticulture"));
    nav.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x.dataset.tab==="viticulture"));
  });
  render(s);
}

export function advanceViticultureDay(s,notify){
  ensure(s);
  if(s.viticulture.buildings.includes("vineyard")){
    const season=s.world?.season||"spring";
    const amount=season==="summer"?4:season==="autumn"?3:season==="spring"?1:0;
    if(amount)addInventory(s,"grapes",amount);
  }
  s.viticulture.batches.forEach(job=>{
    if(job.ready)return;
    job.remaining--;
    if(job.remaining<=0){
      job.remaining=0;job.ready=true;
      notify("Партия готова: "+job.name+". Заберите её во вкладке «Винодельня».");
    }
  });
}
export function renderViticulture(s){render(s);}
