const $ = selector => document.querySelector(selector);
const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };

function ensure(s) {
  s.productionLog ??= [];
  if (!Array.isArray(s.productionLog)) s.productionLog = [];
}

export function recordProduction(s, entry) {
  ensure(s);
  s.productionLog.unshift({
    id: Date.now() + Math.random(),
    day: Number(s.day) || 1,
    name: String(entry.name || "Партия"),
    amount: Math.max(0, Number(entry.amount) || 0),
    item: String(entry.item || ""),
    process: String(entry.process || "Производство"),
    quality: Number.isFinite(Number(entry.quality)) ? Number(entry.quality) : null
  });
  s.productionLog = s.productionLog.slice(0, 30);
}

function stageCard(parent, icon, title, detail, status) {
  const node = el("article", "production-stage " + status);
  node.append(el("span", "production-stage-icon", icon), el("h4", "", title), el("p", "", detail));
  node.append(el("small", "production-stage-state", status === "stage-done" ? "Есть результат" : status === "stage-active" ? "В работе" : "Ожидает"));
  parent.append(node);
}

function render(s) {
  ensure(s);
  const root = $("#productionHub");
  if (!root) return;
  root.replaceChildren();
  root.append(el("p", "feature-intro", "Единый диспетчер хозяйства: здесь собраны активные партии из сарая, винодельни, перегонки и бочек. Это обзор игрового производства, а не отдельная производственная механика."));

  const batches = [];
  if (s.production?.active) batches.push({name:"Базовая брага",stage:"Брожение",left:s.production.daysLeft||0,done:false,detail:"Сахарная линия"});
  if (s.production?.ready) batches.push({name:"Базовая брага",stage:"Готова",left:0,done:true,detail:"Можно забрать в сарае"});
  (s.viticulture?.batches||[]).forEach(job => batches.push({name:job.name,stage:job.ready?"Готова":job.stage==="aging"?"Выдержка":"Брожение",left:job.remaining||0,done:!!job.ready,detail:"Винодельня · выход "+(job.output||0)+" ед."}));
  if (s.distillation?.active) batches.push({name:"Перегонка · "+({sugar:"сахарная",fruit:"фруктовая",grain:"зерновая",honey:"медовая"}[s.distillation.mashType]||"сырьевая")+" партия",stage:"Контроль качества",left:null,done:false,detail:"Выберите режим перегонки во вкладке «Технологии»"});
  if ((s.distillation?.result||0)>0) batches.push({name:"Спирт-сырец",stage:"Ожидает сбора",left:0,done:true,detail:(s.distillation.result||0)+" ед. · качество "+(s.distillation.quality||0)+"/100"});
  (s.barrelAging||[]).forEach((barrel,i)=>batches.push({name:barrel.outputItem==="aged_honey_spirit"?"Медовый дистиллят · бочка":"Спирт-сырец · бочка",stage:barrel.ready?"Готова":"Выдержка",left:barrel.remaining||0,done:!!barrel.ready,detail:"Бочка "+(i+1)+" · качество "+(barrel.quality||0)+"/100"}));

  const summary = el("div","production-hub-summary");
  const active = batches.filter(x=>!x.done).length, ready = batches.filter(x=>x.done).length;
  [[batches.length,"Всего партий"],[active,"В работе"],[ready,"Ожидают сбора"],[(s.productionLog||[]).length,"Записей в архиве"]].forEach(([n,label])=>{const item=el("div","production-kpi");item.append(el("b","",String(n)),el("span","",label));summary.append(item);});
  root.append(summary);

  const flow = el("div","production-flow");
  stageCard(flow,"🌾","Сырьё","Урожай, закупки и склад",Object.keys(s.inventory||{}).some(k=>(s.inventory[k]||0)>0)?"stage-done":"stage-wait");
  stageCard(flow,"🫙","Брожение","Базовая брага и винные партии",batches.some(x=>x.stage==="Брожение")?"stage-active":batches.some(x=>x.done)?"stage-done":"stage-wait");
  stageCard(flow,"⚗️","Перегонка","Игровая перегонка и оценка качества",s.distillation?.active?"stage-active":(s.distillation?.result||0)>0?"stage-done":"stage-wait");
  stageCard(flow,"🪵","Выдержка","Созревание в бочках и погребе",(s.barrelAging||[]).some(x=>!x.ready)||(s.viticulture?.batches||[]).some(x=>x.stage==="aging"&&!x.ready)?"stage-active":(s.barrelAging||[]).some(x=>x.ready)?"stage-done":"stage-wait");
  stageCard(flow,"🍾","Готовая продукция","Склад, рынок и заказы",Object.entries(s.inventory||{}).some(([id,n])=>n>0&&["wine","mead","apple_cider","pear_wine","fruit_wine","spirit","aged_spirit","honey_spirit","aged_honey_spirit"].includes(id))?"stage-done":"stage-wait");
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
