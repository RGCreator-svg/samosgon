import { queuePurchase, registerCartHandler, addInventory } from "./economy.js";
import { recordProduction } from "./productionhub.js";
import { BERRY_CROPS, ensureBerryGarden, plantBerryBush, harvestBerryBush, advanceBerryGardenDay } from "./berries.js";

const $ = selector => document.querySelector(selector);
const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };

const SUPPLIES = [
  { id:"grapes", name:"Виноград", emoji:"🍇", price:18, desc:"Свежее винодельческое сырьё." },
  { id:"apple", name:"Яблоки для сидра", emoji:"🍎", price:15, desc:"Сырьё для сидра и фруктового вина." },
  { id:"pear", name:"Груши для вина", emoji:"🍐", price:18, desc:"Сырьё для грушевого вина и купажей." },
  { id:"sugar", name:"Сахар", emoji:"🧂", price:10, desc:"Базовое сырьё для классической партии браги." },
  { id:"grain", name:"Зерно", emoji:"🌾", price:14, desc:"Сырьё для отдельной зерновой линии брожения." },
  { id:"honey", name:"Мёд", emoji:"🍯", price:28, desc:"Для медовухи и медовой браги." },
  { id:"yeast", name:"Винные дрожжи", emoji:"🧫", price:16, desc:"Игровой ингредиент для брожения." },
  { id:"bottles", name:"Пустые бутылки", emoji:"🍾", price:7, desc:"Тара для готовой продукции." },
  { id:"corks", name:"Пробки", emoji:"🪵", price:3, desc:"Укупорка бутылок." },
  { id:"labels", name:"Этикетки", emoji:"🏷️", price:2, desc:"Маркировка готовой продукции." },
  { id:"water", name:"Подготовленная вода", emoji:"💧", price:2, desc:"Игровой ингредиент для медовых партий." },
  { id:"yeast_nutrient", name:"Питательная добавка", emoji:"🧪", price:12, desc:"Вспомогательный ингредиент для стабильного игрового брожения." }
];

const BUILDINGS = [
  { id:"vineyard", name:"Виноградник", cost:620, parts:{timber:5,tools:1}, skill:"wine_basics", desc:"Даёт виноград каждый игровой день в подходящий сезон." },
  { id:"winePress", name:"Винный пресс", cost:480, parts:{timber:3,metal:2,tools:1}, skill:"wine_pressing", desc:"Открывает переработку винограда в игровые партии вина." },
  { id:"wineCellar", name:"Винный погреб", cost:850, parts:{timber:6,metal:3}, skill:"cellar_aging", desc:"Обеспечивает отдельную стадию созревания вина." },
  { id:"wineFilter", name:"Узел осветления и фильтрации", cost:360, parts:{metal:2,tools:1}, skill:"cellar_aging", desc:"Финишная подготовка вина перед розливом." },
  { id:"meadery", name:"Медоварня", cost:540, parts:{timber:3,metal:2,tools:1}, skill:"mead_brewing", desc:"Открывает отдельную линейку медовых напитков." },
  { id:"berryGarden", name:"Ягодник", cost:320, parts:{timber:4,fasteners:3,tools:1}, skill:"berry_growing", desc:"Шесть грядок под кусты смородины, малины, черники и клюквы. Урожай зависит от сезона." }
];

function ensure(s) {
  s.viticulture ??= { buildings:[], batches:[], nextId:1 };
  s.viticulture.buildings ??= [];
  s.viticulture.batches ??= [];
  s.viticulture.nextId ??= 1;
  ensureBerryGarden(s);
}

function addIcon(parent,file,alt) {
  const image=el("img","viticulture-icon");
  image.src="assets/images/ui/"+file;
  image.alt=alt;
  image.loading="lazy";
  parent.append(image);
}

function card(root,title,description) {
  const c=el("article","feature-card");
  const icon=title.includes("Постройки")?"icon_gear.png":title.includes("Поставщик")?"icon_shop.png":title.includes("линии")?"icon_flask.png":title.includes("партии")?"icon_barrel.png":"icon_leaf.png";
  addIcon(c,icon,title);
  c.append(el("h3","",title),el("p","",description));
  root.append(c);
  return c;
}

function render(s) {
  const root=$("#viticulturePanel");
  if(!root)return;
  root.replaceChildren();
  ensure(s);
  const intro=el("p","feature-intro","Отдельное направление хозяйства: виноградник, винодельня, медоварня, сидр и фруктовые вина. Яблоки и груши можно собрать в саду или купить у поставщика. Все закупки проходят через общую корзину.");
  root.append(intro);

  const b=card(root,"🏡 Производственные постройки","Стройте инфраструктуру постепенно. Постройки и комплектующие оплачиваются вместе через общую корзину.");
  BUILDINGS.forEach(building=>{
    const owned=s.viticulture.buildings.includes(building.id);
    const line=el("div","farm-upgrade",building.name+" · "+(owned?"построено":building.cost+" монет"));
    line.append(el("p","",building.desc));
    if(!owned){const button=el("button","","Добавить в общую корзину");button.dataset.vitiBuild=building.id;button.disabled=!s.skills.includes(building.skill);line.append(button);if(!s.skills.includes(building.skill))line.append(el("small","tech-locked","Изучите навык: "+building.skill));}
    b.append(line);
  });

  const berryCard=card(root,"🍓 Ягодник и сезонный урожай","Выращивайте ягоды для настоек. Кусты плодоносят в свой сезон, после сбора отрастают снова. Посадка саженцев и постройки оплачиваются через общую корзину.");
  const berryStatus=el("p","feature-meta","Занято грядок: "+s.viticulture.berryGarden.plots.length+"/6 · Сезон: "+({spring:"весна",summer:"лето",autumn:"осень",winter:"зима"}[s.world?.season||"spring"]));
  berryCard.append(berryStatus);
  const berryGrid=el("div","berry-garden-grid");
  BERRY_CROPS.forEach(crop=>{
    const item=el("article","berry-crop-card");
    item.append(el("h4","",crop.emoji+" "+crop.name),el("p","",crop.description),el("small","", "Сбор: "+crop.seasons.map(x=>({summer:"лето",autumn:"осень"}[x]||x)).join(" / ")+" · рост "+crop.growDays+" дн."));
    const pending=(s.purchaseCart||[]).filter(x=>x.kind==="berryPlant"&&x.payload?.berryId===crop.id).reduce((sum,x)=>sum+(Number(x.quantity)||1),0);
    const plant=el("button","","Посадить куст · "+crop.seedCost+" монет");
    plant.dataset.berryPlant=crop.id;
    plant.disabled=!s.skills.includes("berry_growing")||!s.viticulture.buildings.includes("berryGarden")||s.viticulture.berryGarden.plots.length+(s.purchaseCart||[]).filter(x=>x.kind==="berryPlant").reduce((sum,x)=>sum+(Number(x.quantity)||1),0)>=6;
    item.append(plant);
    if(!s.skills.includes("berry_growing"))item.append(el("small","tech-locked","Нужен навык «Ягодное дело»."));
    else if(!s.viticulture.buildings.includes("berryGarden"))item.append(el("small","tech-locked","Сначала постройте ягодник."));
    berryGrid.append(item);
  });
  berryCard.append(berryGrid);
  const plots=el("div","berry-plots");
  if(!s.viticulture.berryGarden.plots.length)plots.append(el("p","economy-empty","Пока нет кустов. Постройте ягодник и посадите первые саженцы."));
  s.viticulture.berryGarden.plots.forEach(plot=>{
    const crop=BERRY_CROPS.find(x=>x.id===plot.berryId);
    const row=el("div","berry-plot-row");
    row.append(el("b","",crop?.emoji+" "+(crop?.name||plot.berryId)),el("span","",plot.ready?"Урожай созрел: "+plot.readyAmount+" шт.":"До урожая: "+plot.remaining+" дн."));
    const harvest=el("button","","Собрать ягоды");
    harvest.dataset.berryHarvest=String(plot.id);
    harvest.disabled=!plot.ready||!crop?.seasons.includes(s.world?.season||"spring");
    if(plot.ready&&!crop?.seasons.includes(s.world?.season||"spring"))row.append(el("small","tech-locked","Сбор будет доступен в сезон: "+crop.seasons.join(" / ")+"."));
    if(plot.ready)row.append(harvest);
    plots.append(row);
  });
  berryCard.append(plots);

  const supply=card(root,"🧺 Склад сырья и поставщик","Закупайте сырьё для браги, виноделия и медоварения. Повторные позиции объединяются в общей корзине.");
  const grid=el("div","economy-grid");
  SUPPLIES.forEach(item=>{
    const c=el("article","economy-card");
    const icon=item.id==="honey"?"icon_honey.png":item.id==="water"?"icon_drop.png":item.id==="yeast"||item.id==="yeast_nutrient"?"icon_flask.png":item.id==="grapes"||item.id==="apple"||item.id==="pear"?"icon_leaf.png":"icon_barrel.png";
    addIcon(c,icon,item.name);
    c.append(el("h4","",item.emoji+" "+item.name),el("p","",item.desc),el("p","economy-detail","Цена: "+item.price+" монет · На складе: "+(s.inventory[item.id]||0)));
    const button=el("button","","Добавить 1 шт. в общую корзину");
    button.dataset.vitiSupply=item.id;
    c.append(button);grid.append(c);
  });
  supply.append(grid);

  const prod=card(root,"🍷 Производственные линии","Игровые циклы условны и не являются реальными технологическими инструкциями. Сырьё списывается при оплате заказа, а готовая партия появляется через несколько игровых дней.");
  const recipes=[
    {id:"wine",name:"Виноградное вино",desc:"5 винограда + дрожжи + бутылки и пробки. Требуются пресс и погреб; виноград можно купить или вырастить.",consume:{grapes:5,yeast:1,yeast_nutrient:1,bottles:2,corks:2,labels:2},days:3,agingDays:2,output:"wine",amount:2,needs:["winePress","wineCellar","wineFilter"],skill:"cellar_aging"},
    {id:"mead",name:"Медовуха",desc:"Мёд, подготовленная вода, дрожжи и питательная добавка. Требуется навык медоварения и медоварня.",consume:{honey:4,water:2,yeast:1,yeast_nutrient:1,bottles:3,corks:3},days:3,agingDays:1,output:"mead",amount:3,needs:["meadery"],skill:"mead_brewing"},
    {id:"honeyMash",name:"Медовая брага",desc:"Мёд, подготовленная вода, дрожжи и питательная добавка. После созревания брагу можно выбрать в игровой перегонке.",consume:{honey:6,water:2,yeast:1,yeast_nutrient:1},days:3,output:"honey_braga",amount:3,needs:["meadery"],skill:"honey_distillation"},
    {id:"cider",name:"Яблочный сидр",desc:"Яблоки превращаются в лёгкий фруктовый напиток. Нужны пресс, погреб и фильтр; сырьё можно собрать в саду или купить.",consume:{apple:6,yeast:1,yeast_nutrient:1,bottles:2,corks:2,labels:2},days:3,agingDays:2,output:"apple_cider",amount:2,needs:["winePress","wineCellar","wineFilter"],skill:"cider_making"},
    {id:"pearWine",name:"Грушевое вино",desc:"Отдельная партия из груш с более длительным созреванием.",consume:{pear:6,yeast:1,yeast_nutrient:1,bottles:2,corks:2,labels:2},days:3,agingDays:3,output:"pear_wine",amount:2,needs:["winePress","wineCellar","wineFilter"],skill:"pear_wine"},
    {id:"fruitWine",name:"Садовое фруктовое вино",desc:"Купаж яблок и груш. Требует навыка работы с фруктовыми партиями.",consume:{apple:3,pear:3,yeast:1,yeast_nutrient:1,bottles:3,corks:3,labels:3},days:4,agingDays:3,output:"fruit_wine",amount:3,needs:["winePress","wineCellar","wineFilter"],skill:"fruit_winemaking"}
  ];
  recipes.forEach(recipe=>{
    const missing=recipe.needs.filter(id=>!s.viticulture.buildings.includes(id));
    const c=el("div","farm-upgrade");
    c.append(el("h4","",recipe.name),el("p","",recipe.desc),el("p","feature-meta","Сырьё: "+Object.entries(recipe.consume).map(([id,n])=>id+" × "+n).join(", ")+" · Срок: "+recipe.days+" дн. · Выход: "+recipe.amount));
    const button=el("button","","Поставить партию в общую корзину");
    button.dataset.vitiBatch=recipe.id;
    button.disabled=missing.length>0||!s.skills.includes(recipe.skill);
    if(missing.length)c.append(el("small","tech-locked","Нужны постройки: "+missing.join(", ")));if(!s.skills.includes(recipe.skill))c.append(el("small","tech-locked","Нужен навык: "+recipe.skill));
    c.append(button);prod.append(c);
  });

  const tinctures=card(root,"🍷 Мастерская настоек","Создавайте отдельные игровые партии на основе собственного ягодного урожая и спирта-сырца. Это условная игровая система, не реальные рецептуры.");
  const tinctureRecipes=[
    {id:"blackcurrantTincture",name:"Смородиновая настойка",desc:"Насыщенный профиль чёрной смородины.",consume:{blackcurrant:3,spirit:2,sugar:1,bottles:2,labels:2},days:3,stage:"infusion",output:"blackcurrant_tincture",amount:2,skill:"infusion_basics",quality:74,flavorProfile:{body:72,aroma:88,notes:["чёрная смородина","ягодный","пряный"]}},
    {id:"raspberryTincture",name:"Малиновая настойка",desc:"Мягкий ароматный профиль малины.",consume:{raspberry:3,spirit:2,sugar:1,bottles:2,labels:2},days:3,stage:"infusion",output:"raspberry_tincture",amount:2,skill:"infusion_basics",quality:76,flavorProfile:{body:66,aroma:92,notes:["малина","цветочный","летний"]}},
    {id:"blueberryTincture",name:"Черничная настойка",desc:"Глубокий лесной ягодный профиль.",consume:{blueberry:3,spirit:2,sugar:1,bottles:2,labels:2},days:4,stage:"infusion",output:"blueberry_tincture",amount:2,skill:"infusion_basics",quality:78,flavorProfile:{body:82,aroma:80,notes:["черника","лесные ягоды","мягкий"]}},
    {id:"forestTincture",name:"Лесная настойка",desc:"Авторский купаж смородины, малины и черники.",consume:{blackcurrant:2,raspberry:2,blueberry:1,cranberry:1,spirit:3,sugar:2,bottles:3,labels:3},days:4,stage:"infusion",output:"forest_tincture",amount:3,skill:"berry_blending",quality:86,flavorProfile:{body:90,aroma:94,notes:["лесные ягоды","смородина","малина","клюква"]}}
  ];
  tinctureRecipes.forEach(recipe=>{
    const line=el("div","farm-upgrade");
    line.append(el("h4","",recipe.name),el("p","",recipe.desc),el("p","feature-meta","Сырьё: "+Object.entries(recipe.consume).map(([id,n])=>id+" × "+n).join(", ")+" · Настой: "+recipe.days+" игровых дн. · Выход: "+recipe.amount));
    const button=el("button","","Запустить настой в общую корзину");
    button.dataset.vitiBatch=recipe.id;
    button.disabled=!s.viticulture.buildings.includes("berryGarden")||!s.skills.includes(recipe.skill);
    if(!s.viticulture.buildings.includes("berryGarden"))line.append(el("small","tech-locked","Нужен ягодник."));
    if(!s.skills.includes(recipe.skill))line.append(el("small","tech-locked","Нужен навык: "+recipe.skill));
    line.append(button);tinctures.append(line);
  });

  const batches=card(root,"⏳ Подвальные партии","Текущие партии созревают по игровому календарю.");
  if(!s.viticulture.batches.length)batches.append(el("p","economy-empty","Пока нет активных партий."));
  s.viticulture.batches.forEach(job=>{const row=el("div","aging-row",job.name+" · "+(job.ready?"готово к сбору":(job.stage==="aging"?"выдержка":job.stage==="infusion"?"настаивание":"брожение")+" · осталось "+job.remaining+" дн."));if(job.ready){const collect=el("button","","Забрать продукцию");collect.dataset.vitiCollect=String(job.id);row.append(collect);}batches.append(row);});
  const stock=card(root,"📦 Запасы винодельни","Виноград и мёд с собственных хозяйств попадают сюда же, что и купленные партии.");
  const stockNames={sugar:"Сахар",grain:"Зерно",grapes:"Виноград",apple:"Яблоки",pear:"Груши",honey:"Мёд",blackcurrant:"Чёрная смородина",raspberry:"Малина",blueberry:"Черника",cranberry:"Клюква",yeast:"Дрожжи",yeast_nutrient:"Питательная добавка",water:"Вода",bottles:"Бутылки",corks:"Пробки",wine:"Вино",mead:"Медовуха",apple_cider:"Яблочный сидр",pear_wine:"Грушевое вино",fruit_wine:"Фруктовое вино",blackcurrant_tincture:"Смородиновая настойка",raspberry_tincture:"Малиновая настойка",blueberry_tincture:"Черничная настойка",forest_tincture:"Лесная настойка",honey_braga:"Медовая брага",honey_spirit:"Медовый дистиллят"};Object.entries(stockNames).forEach(([id,name])=>stock.append(el("p","economy-detail",name+": "+(s.inventory[id]||0))));
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
    if(supply){const accepted=addInventory(state,supply.id,item.quantity);if(accepted<item.quantity)notify("Склад переполнен: принято "+accepted+" из "+item.quantity+" ед. поставки.");}
  });
  registerCartHandler("berryPlant",(state,item)=>{
    ensureBerryGarden(state);
    for(let i=0;i<item.quantity;i++){
      if(state.viticulture.berryGarden.plots.length>=6)break;
      plantBerryBush(state,item.payload?.berryId);
    }
  });
  registerCartHandler("viticultureBatch",(state,item)=>{
    const recipe=item.payload?.recipe;
    if(!recipe)return;
    for(let i=0;i<item.quantity;i++)state.viticulture.batches.push({id:state.viticulture.nextId++,name:recipe.name,remaining:recipe.days,days:recipe.days,agingDays:recipe.agingDays||0,stage:recipe.stage||"fermentation",processLabel:recipe.stage==="infusion"?"Настойка":"Винодельня / медоварня",flavorProfile:recipe.flavorProfile||null,output:recipe.amount,outputItem:recipe.output,quality:Math.max(40,Math.min(96,(recipe.quality||66)+Math.round((Number(state.lab?.qualityBonus)||0)*.15)+(Math.random()*7-3))),recipeId:recipe.id,ready:false});
  });
  $("#viticulture").addEventListener("click",event=>{
    const collect=event.target.closest("[data-viti-collect]");
    if(collect){const index=s.viticulture.batches.findIndex(job=>String(job.id)===collect.dataset.vitiCollect);const job=s.viticulture.batches[index];if(!job?.ready)return;const received=addInventory(s,job.outputItem,job.output);job.output-=received;if(received>0)recordProduction(s,{name:job.name,amount:received,item:job.outputItem,process:job.processLabel||"Винодельня / медоварня",quality:job.quality,recipeId:job.recipeId,recipeName:job.name,flavorProfile:job.flavorProfile});if(job.output<=0)s.viticulture.batches.splice(index,1);notify("На склад помещено: "+received+" ед. продукции.");renderGame();return;}
    const build=event.target.closest("[data-viti-build]");
    if(build){
      const item=BUILDINGS.find(x=>x.id===build.dataset.vitiBuild);
      if(!item||s.viticulture.buildings.includes(item.id))return;
      queuePurchase(s,{key:"viti-building:"+item.id,kind:"viticultureBuilding",name:item.name,cost:item.cost,parts:item.parts,payload:{id:item.id}});
      notify(item.name+" добавлено в общую корзину.");renderGame();return;
    }
    const plant=event.target.closest("[data-berry-plant]");
    if(plant){
      const crop=BERRY_CROPS.find(x=>x.id===plant.dataset.berryPlant);
      const pending=(s.purchaseCart||[]).filter(x=>x.kind==="berryPlant").reduce((sum,x)=>sum+(Number(x.quantity)||1),0);
      if(!crop||!s.skills.includes("berry_growing")||!s.viticulture.buildings.includes("berryGarden")||s.viticulture.berryGarden.plots.length+pending>=6)return;
      queuePurchase(s,{key:"berry-plant:"+crop.id,kind:"berryPlant",name:"Саженец: "+crop.name,cost:crop.seedCost,payload:{berryId:crop.id},quantity:1,stackable:true});
      notify("Саженец "+crop.name.toLocaleLowerCase("ru")+" добавлен в общую корзину.");renderGame();return;
    }
    const harvest=event.target.closest("[data-berry-harvest]");
    if(harvest){
      const result=harvestBerryBush(s,Number(harvest.dataset.berryHarvest));
      if(result.harvested)notify("Собрано ягод: "+result.harvested+" шт. Урожай отправлен на склад.");
      else notify("Сейчас сбор недоступен или на складе нет места.");
      renderGame();return;
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
        wine:{id:"wine",name:"Виноградное вино",consume:{grapes:5,yeast:1,yeast_nutrient:1,bottles:2,corks:2,labels:2},days:3,agingDays:2,output:"wine",amount:2,needs:["winePress","wineCellar","wineFilter"],skill:"cellar_aging"},
        mead:{id:"mead",name:"Медовуха",consume:{honey:4,water:2,yeast:1,yeast_nutrient:1,bottles:3,corks:3},days:3,agingDays:1,output:"mead",amount:3,needs:["meadery"],skill:"mead_brewing"},
        honeyMash:{id:"honeyMash",name:"Медовая брага",consume:{honey:6,water:2,yeast:1,yeast_nutrient:1},days:3,output:"honey_braga",amount:3,needs:["meadery"],skill:"honey_distillation"},
        cider:{id:"cider",name:"Яблочный сидр",consume:{apple:6,yeast:1,yeast_nutrient:1,bottles:2,corks:2,labels:2},days:3,agingDays:2,output:"apple_cider",amount:2,needs:["winePress","wineCellar","wineFilter"],skill:"cider_making"},
        pearWine:{id:"pearWine",name:"Грушевое вино",consume:{pear:6,yeast:1,yeast_nutrient:1,bottles:2,corks:2,labels:2},days:3,agingDays:3,output:"pear_wine",amount:2,needs:["winePress","wineCellar","wineFilter"],skill:"pear_wine"},
        fruitWine:{id:"fruitWine",name:"Садовое фруктовое вино",consume:{apple:3,pear:3,yeast:1,yeast_nutrient:1,bottles:3,corks:3,labels:3},days:4,agingDays:3,output:"fruit_wine",amount:3,needs:["winePress","wineCellar","wineFilter"],skill:"fruit_winemaking"},
        blackcurrantTincture:{id:"blackcurrantTincture",name:"Смородиновая настойка",consume:{blackcurrant:3,spirit:2,sugar:1,bottles:2,labels:2},days:3,stage:"infusion",output:"blackcurrant_tincture",amount:2,skill:"infusion_basics",quality:74,flavorProfile:{body:72,aroma:88,notes:["чёрная смородина","ягодный","пряный"]}},
        raspberryTincture:{id:"raspberryTincture",name:"Малиновая настойка",consume:{raspberry:3,spirit:2,sugar:1,bottles:2,labels:2},days:3,stage:"infusion",output:"raspberry_tincture",amount:2,skill:"infusion_basics",quality:76,flavorProfile:{body:66,aroma:92,notes:["малина","цветочный","летний"]}},
        blueberryTincture:{id:"blueberryTincture",name:"Черничная настойка",consume:{blueberry:3,spirit:2,sugar:1,bottles:2,labels:2},days:4,stage:"infusion",output:"blueberry_tincture",amount:2,skill:"infusion_basics",quality:78,flavorProfile:{body:82,aroma:80,notes:["черника","лесные ягоды","мягкий"]}},
        forestTincture:{id:"forestTincture",name:"Лесная настойка",consume:{blackcurrant:2,raspberry:2,blueberry:1,cranberry:1,spirit:3,sugar:2,bottles:3,labels:3},days:4,stage:"infusion",output:"forest_tincture",amount:3,skill:"berry_blending",quality:86,flavorProfile:{body:90,aroma:94,notes:["лесные ягоды","смородина","малина","клюква"]}}
      };
      const recipe=recipes[batch.dataset.vitiBatch];
      if(!recipe||recipe.needs?.some(id=>!s.viticulture.buildings.includes(id))||!s.skills.includes(recipe.skill)||(recipe.stage==="infusion"&&!s.viticulture.buildings.includes("berryGarden")))return;
      queuePurchase(s,{key:"viti-batch:"+recipe.id,kind:"viticultureBatch",name:"Партия: "+recipe.name,cost:0,consume:recipe.consume,payload:{recipe},stackable:true});
      notify("Производственная партия добавлена в общую корзину.");renderGame();return;
    }
  });
    render(s);
}

export function advanceViticultureDay(s,notify){
  ensure(s);
  advanceBerryGardenDay(s);
  if(s.viticulture.buildings.includes("vineyard")){
    const season=s.world?.season||"spring";
    const amount=season==="summer"?4:season==="autumn"?3:season==="spring"?1:0;
    if(amount)addInventory(s,"grapes",amount);
  }
  s.viticulture.batches.forEach(job=>{
    if(job.ready)return;
    job.remaining--;
    if(job.remaining<=0){
      job.remaining=0;
      if(job.stage==="fermentation"&&job.agingDays>0){job.stage="aging";job.remaining=job.agingDays;job.quality=Math.min(100,(Number(job.quality)||65)+2);notify("Партия "+job.name+" перешла на выдержку в погреб.");}
      else{job.ready=true;job.quality=Math.min(100,(Number(job.quality)||65)+Math.round((Number(s.lab?.qualityBonus)||0)*.1));notify("Партия готова: "+job.name+" · предварительное качество "+job.quality+"/100. Заберите её во вкладке «Винодельня».");}
    }
  });
}
export function renderViticulture(s){render(s);}
