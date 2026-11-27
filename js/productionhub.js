import { assessBatchQuality } from "./quality.js";
const $ = selector => document.querySelector(selector);
const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };

function makePassport(entry, s, type = "production") {
  const assessment=assessBatchQuality(s,entry);
  const standard=entry.recipeId?s.lab?.standards?.[entry.recipeId]:null;
  return {
    id:"passport-"+Date.now()+"-"+Math.floor(Math.random()*1e7),
    type,day:Number(s.day)||1,product:String(entry.item||""),
    productName:String(entry.name||"Партия"),amount:Math.max(0,Number(entry.amount)||0),
    remaining:Math.max(0,Number(entry.amount)||0),sold:0,
    process:String(entry.process||"Производство"),quality:assessment.score,grade:assessment.grade.label,
    baseQuality:assessment.base,saleModifier:Math.round((1+(assessment.score-60)*.005)*100),aroma:assessment.aroma,purity:assessment.purity,stability:assessment.stability,
    factors:assessment.factors,standardDelta:assessment.standardDelta,
    recipeId:entry.recipeId||null,recipeName:entry.recipeName||null,ratio:entry.ratio||null,
    standardId:standard?.trialId||null,standardMatch:assessment.standardMatch
  };
}

function ensure(s) {
  s.productionLog ??= [];
  if (!Array.isArray(s.productionLog)) s.productionLog = [];
  if (!Array.isArray(s.qualityLots)) {
    s.qualityLots = Object.entries(s.inventory||{}).filter(([,amount])=>Number(amount)>0).map(([item,amount])=>({item,remaining:Number(amount),quality:null,passportId:null,legacy:true}));
  }
  s.productionLog.forEach(entry => { if (!entry.passport) entry.passport = makePassport(entry, s, "legacy"); });
}

export function recordProduction(s, entry) {
  ensure(s);
  const record = {
    id: Date.now() + Math.random(), day: Number(s.day) || 1,
    name: String(entry.name || "Партия"), amount: Math.max(0, Number(entry.amount) || 0),
    item: String(entry.item || ""), process: String(entry.process || "Производство"),
    quality: entry.quality !== null && entry.quality !== undefined && Number.isFinite(Number(entry.quality)) ? Number(entry.quality) : null,
    recipeId: entry.recipeId || null, recipeName: entry.recipeName || null, ratio: entry.ratio || null
  };
  record.passport = makePassport({...entry, ...record}, s, entry.passportType || "production");
  record.quality=record.passport.quality;
  s.productionLog.unshift(record);
  if ((entry.passportType||"production")!=="experiment" && record.amount>0) {
    s.qualityLots ??= [];
    s.qualityLots.push({item:record.item,remaining:record.amount,quality:record.passport.quality,passportId:record.passport.id});
  }
  s.productionLog = s.productionLog.slice(0, 60);
  return record.passport.id;
}

function stageCard(parent, icon, title, detail, status) {
  const node = el("article", "production-stage " + status);
  const image = el("img", "production-stage-icon");
  image.src = "assets/images/ui/" + icon;
  image.alt = "";
  image.loading = "lazy";
  node.append(image, el("h4", "", title), el("p", "", detail));
  node.append(el("small", "production-stage-state", status === "stage-done" ? "Есть результат" : status === "stage-active" ? "В работе" : "Ожидает"));
  parent.append(node);
}

function render(s) {
  ensure(s);
  const root = $("#productionHub");
  if (!root) return;
  root.replaceChildren();
  root.append(el("p", "feature-intro", "Единый диспетчер: отслеживай партии браги, винодельни, перегонки и выдержки. Новые рецептуры и запуск нескольких чанов доступны во вкладке «Винокурня»."));

  const distillFocus = el("article","production-distill-focus");
  distillFocus.append(el("h3","","⚗️ Главное дело — самогоноварение"));
  const mashItem = ({sugar:"braga",fruit:"fruit_braga",grain:"grain_braga",honey:"honey_braga"})[s.mashType] || "braga";
  const mashNames = {sugar:"сахарная",fruit:"фруктовая",grain:"зерновая",honey:"медовая"};
  const focusText = s.distillation?.active
    ? "Перегонка запущена: выбери игровой режим контроля качества."
    : (Number(s.distillation?.result)||0)>0
      ? "Партия готова к сбору: "+s.distillation.result+" ед. · качество "+(s.distillation.quality||0)+"/100."
      : "Выбрана "+(mashNames[s.mashType]||"сахарная")+" брага. На складе: "+(s.inventory?.[mashItem]||0)+" ед. Для старта нужно 3 ед.";
  distillFocus.append(el("p","",focusText));
  const distillButton=el("button","production-distill-button","Перейти в винокурню");
  distillButton.type="button";
  distillButton.dataset.tab="featurePack";
  distillFocus.append(distillButton);
  root.append(distillFocus);

  const batches = [];
  if (s.production?.active) batches.push({name:"Базовая брага",stage:"Брожение",left:s.production.daysLeft||0,done:false,detail:"Сахарная линия"});
  if (s.production?.ready) batches.push({name:"Базовая брага",stage:"Готова",left:0,done:true,detail:"Можно забрать в сарае"});
  (s.mashHouse?.batches||[]).forEach(job=>batches.push({name:job.name,stage:job.ready?"Готова к сбору":"Брожение",left:job.remaining||0,done:!!job.ready,detail:"Бродильня · выход "+(job.output||0)+" ед. · качество "+(job.quality||0)+"/100"}));
  (s.viticulture?.batches||[]).forEach(job => batches.push({name:job.name,stage:job.ready?"Готова":job.stage==="aging"?"Выдержка":"Брожение",left:job.remaining||0,done:!!job.ready,detail:"Винодельня · выход "+(job.output||0)+" ед."}));
  if (s.distillation?.active) batches.push({name:"Перегонка · "+({sugar:"сахарная",fruit:"фруктовая",grain:"зерновая",honey:"медовая"}[s.distillation.mashType]||"сырьевая")+" партия",stage:"Контроль качества",left:null,done:false,detail:"Выберите режим во вкладке «Винокурня»"});
  if ((s.distillation?.result||0)>0) batches.push({name:"Спирт-сырец",stage:"Ожидает сбора",left:0,done:true,detail:(s.distillation.result||0)+" ед. · качество "+(s.distillation.quality||0)+"/100"});
  (s.barrelAging||[]).forEach((barrel,i)=>batches.push({name:barrel.outputItem==="aged_honey_spirit"?"Медовый дистиллят · бочка":"Спирт-сырец · бочка",stage:barrel.ready?"Готова":"Выдержка",left:barrel.remaining||0,done:!!barrel.ready,detail:"Бочка "+(i+1)+" · качество "+(barrel.quality||0)+"/100"}));

  const summary = el("div","production-hub-summary");
  const active = batches.filter(x=>!x.done).length, ready = batches.filter(x=>x.done).length;
  [[batches.length,"Всего партий"],[active,"В работе"],[ready,"Ожидают сбора"],[(s.productionLog||[]).length,"Записей в архиве"]].forEach(([n,label])=>{const item=el("div","production-kpi");item.append(el("b","",String(n)),el("span","",label));summary.append(item);});
  root.append(summary);

  const flow = el("div","production-flow");
  stageCard(flow,"flaticon-kettle.png","Сырьё","Урожай, закупки и склад",Object.keys(s.inventory||{}).some(k=>(s.inventory[k]||0)>0)?"stage-done":"stage-wait");
  stageCard(flow,"flaticon-filter.png","Брожение","Сахарные, фруктовые, зерновые и винные партии",batches.some(x=>x.stage==="Брожение")?"stage-active":batches.some(x=>x.stage==="Готова к сбору"||x.stage==="Готова")?"stage-done":"stage-wait");
  stageCard(flow,"flaticon-distillation.png","Перегонка","Игровая перегонка и оценка качества",s.distillation?.active?"stage-active":(s.distillation?.result||0)>0?"stage-done":"stage-wait");
  stageCard(flow,"icon_barrel.png","Выдержка","Созревание в бочках и погребе",(s.barrelAging||[]).some(x=>!x.ready)||(s.viticulture?.batches||[]).some(x=>x.stage==="aging"&&!x.ready)?"stage-active":(s.barrelAging||[]).some(x=>x.ready)?"stage-done":"stage-wait");
  stageCard(flow,"icon_flask.png","Готовая продукция","Склад, рынок и заказы",Object.entries(s.inventory||{}).some(([id,n])=>n>0&&["wine","mead","apple_cider","pear_wine","fruit_wine","spirit","aged_spirit","honey_spirit","aged_honey_spirit"].includes(id))?"stage-done":"stage-wait");
  root.append(el("h3","","Производственная цепочка"),flow);

  const list = el("div","production-batch-list");
  root.append(el("h3","","Активные партии"));
  if (!batches.length) list.append(el("p","economy-empty","Пока нет активных партий. Запустите брожение, винную партию или перегонку — они появятся здесь."));
  batches.forEach(job=>{const row=el("article","production-batch-row "+(job.done?"is-ready":""));const main=el("div","production-batch-main");main.append(el("b","",job.name),el("span","",job.detail));const state=el("div","production-batch-status");state.append(el("strong","",job.stage),el("small","",job.left===null?"Требуется действие":job.done?"Можно забрать": "Осталось: "+job.left+" дн."));row.append(main,state);list.append(row);});
  root.append(list);

  root.append(el("h3","","Архив завершённых операций"));
  const archive=el("div","production-archive");
  if (!s.productionLog.length) archive.append(el("p","economy-empty","Архив пополнится после сбора готовой продукции."));
  s.productionLog.slice(0,10).forEach(entry=>{const row=el("div","production-log-row");row.append(el("span","production-log-day","День "+entry.day),el("b","",entry.name),el("span","",entry.process+" · "+entry.amount+" ед."));if(entry.quality!==null)row.append(el("small","","Качество: "+entry.quality+"/100"));archive.append(row);});
  root.append(archive);

  root.append(el("h3", "", "Паспорта качества партий"));
  const passports = el("div", "production-passports");
  s.productionLog.slice(0, 12).forEach(entry => {
    const p = entry.passport || makePassport(entry, s, "legacy");
    entry.passport = p;
    const card = el("article", "production-passport");
    const head = el("div", "passport-head");
    head.append(el("b", "", p.productName), el("strong", "", p.quality + "/100 · "+(p.grade||"Обычное")) );
    card.append(head, el("small", "", "№ " + p.id + " · день " + p.day + " · " + p.process));
    const metrics = el("div", "passport-metrics");
    [["Аромат",p.aroma],["Чистота",p.purity],["Стабильность",p.stability]].forEach(([label,value]) => metrics.append(el("span","",label+": "+value)));
    card.append(metrics,el("small","passport-sale","Влияние на цену: "+(p.saleModifier>=100?"+":"")+(p.saleModifier-100)+"%"));
    const factors=el("details","passport-factors");factors.append(el("summary","","Разбор оценки качества"));
    (p.factors||[]).forEach(f=>factors.append(el("p","",f.label+": "+(f.value>0?"+":"")+f.value+" · "+f.detail)));
    card.append(factors);
    card.append(el("small","passport-stock","На складе по паспорту: "+(p.remaining??p.amount??0)+" · продано: "+(p.sold||0)));
    if (p.ratio) card.append(el("small","passport-recipe","Рецепт: "+(p.recipeName||p.recipeId)+" · пропорция "+p.ratio));
    if (p.standardId) card.append(el("small","passport-standard",p.standardMatch?"✓ Соответствует стандарту":"Отклонение от стандарта"));
    passports.append(card);
  });
  if (!passports.childElementCount) passports.append(el("p","economy-empty","Паспорта появятся после завершения первых партий."));
  root.append(passports);

  root.append(el("h3", "", "Стандарты лаборатории"));
  const standards = el("div", "production-standards");
  Object.entries(s.lab?.standards || {}).forEach(([id,st]) => {
    const names={orchard:"Румянец старого сада",vineyard:"Золотой винтаж",pear:"Грушевый медовый резерв"};
    const card=el("article","production-standard");
    card.append(el("b","",names[id]||id),el("span","",st.a+":"+st.b+" · качество "+st.quality+"/100"),el("small","","Закреплён по паспорту "+(st.passportId||"—")));
    standards.append(card);
  });
  if (!standards.childElementCount) standards.append(el("p","economy-empty","Пока нет закреплённых стандартов. Лучшие партии можно закрепить во вкладке «Лаборатория»."));
  root.append(standards);
}

export function initProductionHub(s) {
  ensure(s);
  const nav=$(".navigation"), game=$("#game");
  if(!nav||!game)return;
  if(!$("#productionHub")){
    const tab=el("button","","🏭 Производство");
    tab.dataset.tab="productionHub";
    nav.append(tab);
    const section=el("section","tab-content panel hidden");
    section.id="productionHub";
    section.innerHTML="<h2>🏭 Производственный центр</h2>";
    game.append(section);
  }
    render(s);
}
export function renderProductionHub(s){render(s);}
