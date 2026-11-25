import { queuePurchase, registerCartHandler, addInventory } from "./economy.js";

const $ = selector => document.querySelector(selector);
const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };

const SUPPLIES = [
  { id:"grapes", name:"Виноград", emoji:"🍇", price:18, desc:"Свежее винодельческое сырьё." },
  { id:"honey", name:"Мёд", emoji:"🍯", price:28, desc:"Для медовухи и медовой браги." },
  { id:"yeast", name:"Винные дрожжи", emoji:"🧫", price:16, desc:"Игровой ингредиент для брожения." },
  { id:"sugar", name:"Сахар", emoji:"🧂", price:9, desc:"Дополнительное сырьё для рецептур." },
  { id:"bottles", name:"Пустые бутылки", emoji:"🍾", price:7, desc:"Тара для готовой продукции." },
  { id:"corks", name:"Пробки", emoji:"🪵", price:3, desc:"Укупорка бутылок." }
];

const BUILDINGS = [
  { id:"vineyard", name:"Виноградник", cost:620, parts:{timber:5,tools:1}, desc:"Даёт виноград каждый игровой день в подходящий сезон." },
  { id:"winePress", name:"Винный пресс", cost:480, parts:{timber:3,metal:2,tools:1}, desc:"Открывает переработку винограда в игровые партии вина." },
  { id:"wineCellar", name:"Винный погреб", cost:850, parts:{timber:6,metal:3}, desc:"Ускоряет и улучшает выдержку вина и медовухи." },
  { id:"meadery", name:"Медоварня", cost:540, parts:{timber:3,metal:2,tools:1}, desc:"Открывает отдельную линейку медовых напитков." }
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
    if(!owned){const button=el("button","","Добавить в общую корзину");button.dataset.vitiBuild=building.id;line.append(button);}
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
    {id:"wine",name:"Виноградное вино",desc:"5 винограда + дрожжи + бутылки и пробки. Требуется виноградник, пресс и погреб.",consume:{grapes:5,yeast:1,bottles:2,corks:2},days:3,output:"wine",amount:2,needs:["vineyard","winePress","wineCellar"]},
    {id:"mead",name:"Медовуха",desc:"4 мёда + дрожжи + сахар. Требуется медоварня.",consume:{honey:4,yeast:1,sugar:1},days:3,output:"mead",amount:3,needs:["meadery"]},
    {id:"honeyMash",name:"Медовая брага",desc:"6 мёда + дрожжи + сахар. После созревания её можно выбрать в игровой перегонке.",consume:{honey:6,yeast:1,sugar:1},days:3,output:"honey_braga",amount:3,needs:["meadery"]}
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
  s.viticulture.batches.forEach(job=>batches.append(el("p","",job.name+" · осталось "+job.remaining+" дн."+(job.ready?" · готово к сбору":""))));
  const stock=card(root,"📦 Запасы винодельни","Виноград и мёд с собственных хозяйств попадают сюда же, что и купленные партии.");
  ["grapes","honey","yeast","sugar","bottles","corks","wine","mead","honey_braga","honey_spirit"].forEach(id=>stock.append(el("p","economy-detail",id+": "+(s.inventory[id]||0))));
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
    if(supply)addInventory(state,supply.id,item.quantity);
  });
  registerCartHandler("viticultureBatch",(state,item)=>{
    const recipe=item.payload?.recipe;
    if(!recipe)return;
    for(let i=0;i<item.quantity;i++)state.viticulture.batches.push({id:state.viticulture.nextId++,name:recipe.name,remaining:recipe.days,days:recipe.days,output:recipe.amount,outputItem:recipe.output,ready:false});
  });
  $("#viticulture").addEventListener("click",event=>{
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
      queuePurchase(s,{key:"viti-supply:"+item.id,kind:"viticultureSupply",name:item.name,cost:item.price,payload:{id:item.id},quantity:1});
      notify(item.name+" добавлено в общую корзину.");renderGame();return;
    }
    const batch=event.target.closest("[data-viti-batch]");
    if(batch){
      const recipes={
        wine:{id:"wine",name:"Виноградное вино",consume:{grapes:5,yeast:1,bottles:2,corks:2},days:3,output:"wine",amount:2,needs:["vineyard","winePress","wineCellar"]},
        mead:{id:"mead",name:"Медовуха",consume:{honey:4,yeast:1,sugar:1},days:3,output:"mead",amount:3,needs:["meadery"]},
        honeyMash:{id:"honeyMash",name:"Медовая брага",consume:{honey:6,yeast:1,sugar:1},days:3,output:"honey_braga",amount:3,needs:["meadery"]}
      };
      const recipe=recipes[batch.dataset.vitiBatch];
      if(!recipe||recipe.needs.some(id=>!s.viticulture.buildings.includes(id)))return;
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
  if(s.farmUpgrades?.includes("apiary"))addInventory(s,"honey",2);
  s.viticulture.batches.forEach(job=>{
    if(job.ready)return;
    job.remaining--;
    if(job.remaining<=0){
      job.remaining=0;job.ready=true;
      const received=addInventory(s,job.outputItem,job.output);
      job.output-=received;
      if(job.output<=0)notify("Готова партия: "+job.name+". Продукция помещена на склад.");
      else notify("Партия "+job.name+" готова, но склад переполнен. Остаток ждёт места.");
    }
  });
  s.viticulture.batches=s.viticulture.batches.filter(job=>!job.ready||job.output>0);
}
export function renderViticulture(s){render(s);}
