import { getEquipmentProfile } from "./equipment.js";
import { queuePurchase, registerCartHandler } from "./economy.js";
import { removeInventory } from "./economy.js";

const $ = selector => document.querySelector(selector);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

const INSTRUMENTS = [
  {id:"density_meter",name:"Ареометр",icon:"⚗️",cost:85,desc:"Игровая оценка плотности и завершённости партии."},
  {id:"refractometer",name:"Рефрактометр",icon:"🔭",cost:130,desc:"Сравнение показаний сырья и контрольных образцов."},
  {id:"ph_meter",name:"pH-метр",icon:"🧪",cost:110,desc:"Дополнительный контроль стабильности сырьевой базы."},
  {id:"precision_thermo",name:"Точный термометр",icon:"🌡️",cost:160,desc:"Снижает неопределённость температурного игрового параметра."},
  {id:"sensory_panel",name:"Дегустационная панель",icon:"👃",cost:220,desc:"Расширяет оценку аромата и органолептики."}
];

const RAW = [
  {id:"apple",name:"Яблоки",group:"Фрукты",icon:"🍎",season:"Лето — осень",profile:"Фруктовый, мягкий",uses:"Сидр, фруктовые купажи",base:82},
  {id:"pear",name:"Груши",group:"Фрукты",icon:"🍐",season:"Конец лета — осень",profile:"Мягкий, цветочный",uses:"Грушевое вино, купажи",base:78},
  {id:"grapes",name:"Виноград",group:"Фрукты",icon:"🍇",season:"Осень",profile:"Яркий, насыщенный",uses:"Вино и авторские сорта",base:86},
  {id:"honey",name:"Мёд",group:"Пасека",season:"Лето",icon:"🍯",profile:"Цветочный, плотный",uses:"Медовуха и медовая линия",base:88},
  {id:"yeast",name:"Дрожжи",group:"Культура",icon:"🧫",season:"Круглый год",profile:"Зависит от штамма",uses:"Винные и ферментационные партии",base:74},
  {id:"potato",name:"Картофель",group:"Огород",icon:"🥔",season:"Лето — осень",profile:"Нейтральный, крахмалистый",uses:"Сырьевая база хозяйства",base:65},
  {id:"grain_braga",name:"Зерновая брага",group:"Зерновая линия",icon:"🌾",season:"Круглый год",profile:"Зерновой, хлебный",uses:"Зерновые производственные партии",base:80},
  {id:"fruit_braga",name:"Фруктовая брага",group:"Фруктовая линия",icon:"🍏",season:"Сезон фруктов",profile:"Фруктовый, свежий",uses:"Фруктовые производственные партии",base:84}
];

function ensure(s) {
  s.processCenter ??= {};
  const p=s.processCenter;
  p.controls ??={heat:3,cooling:3,pace:3};
  p.controls.heat=Math.max(1,Math.min(5,Number(p.controls.heat)||3));
  p.controls.cooling=Math.max(1,Math.min(5,Number(p.controls.cooling)||3));
  p.controls.pace=Math.max(1,Math.min(5,Number(p.controls.pace)||3));
  p.instruments=Array.isArray(p.instruments)?p.instruments:[];
  p.simulations=Array.isArray(p.simulations)?p.simulations:[];
  p.rawStudies=p.rawStudies&&typeof p.rawStudies==="object"?p.rawStudies:{};
}

function renderSimulator(s,root) {
  const p=s.processCenter, c=p.controls, profile=getEquipmentProfile(s,"sugar");
  const panel=el("section","process-card");
  panel.append(el("h3","","🛠️ Симулятор производственной установки"));
  panel.append(el("p","process-muted","Игровая модель учитывает конфигурацию аппарата, состояние оборудования и выбранный режим. Параметры условные: это балансировка внутриигровой системы, не инструкция для реального оборудования."));
  const metrics=el("div","process-machine-summary");
  [[profile.mode==="rectification"?"Колонна":profile.mode==="hybrid"?"Гибрид":"Перегонный куб","Конфигурация"],[profile.installed+"","Модулей"],[(Number(s.still)||0)+"%","Состояние аппарата"],[(Number(s.maintenance??100)||0)+"%","Обслуживание"]].forEach(([v,l])=>{const m=el("div","process-mini-stat");m.append(el("b","",v),el("span","",l));metrics.append(m);});
  panel.append(metrics);
  const controls=el("div","process-controls");
  const descriptors=[["heat","Нагрузка установки","Спокойная","Интенсивная"],["cooling","Баланс охлаждения","Мягкий","Усиленный"],["pace","Темп процесса","Медленный","Быстрый"]];
  descriptors.forEach(([id,label,left,right])=>{
    const row=el("label","process-control-row");
    const head=el("span","process-control-head");head.append(el("b","",label),el("strong","",String(c[id])+"/5"));
    const range=el("input","");range.type="range";range.min="1";range.max="5";range.step="1";range.value=String(c[id]);range.dataset.processControl=id;
    const ends=el("span","process-control-ends");ends.append(el("small","",left),el("small","",right));
    row.append(head,range,ends);controls.append(row);
  });
  panel.append(controls);
  const run=el("button","process-primary","▶ Провести моделирование · 5 монет и 3 энергии");
  run.dataset.processSimulate="true";run.disabled=s.money<5||s.energy<3;panel.append(run);
  if(p.lastSimulation){
    const x=p.lastSimulation, result=el("div","process-sim-result");
    result.append(el("div","process-result-head", "Последняя симуляция · день "+x.day),el("strong","",x.score+"/100 · "+x.grade));
    result.append(el("p","","Влияние на следующие партии: качество "+(x.qualityDelta>=0?"+":"")+x.qualityDelta+" · выход ×"+x.outputMultiplier.toFixed(2)));
    result.append(el("p","",x.note));panel.append(result);
  }
  root.append(panel);
}

function renderInstruments(s,root) {
  const p=s.processCenter, panel=el("section","process-card");
  panel.append(el("h3","","🔬 Измерительная лаборатория"),el("p","process-muted","Приборы расширяют игровые измерения и делают анализы стабильнее. Покупка проходит через общую корзину."));
  const grid=el("div","process-instrument-grid");
  INSTRUMENTS.forEach(item=>{
    const owned=p.instruments.includes(item.id),card=el("article","process-instrument"+(owned?" owned":""));
    card.append(el("span","process-instrument-icon",item.icon),el("h4","",item.name),el("p","",item.desc));
    if(owned)card.append(el("small","process-owned","✓ В лаборатории"));
    else{const b=el("button","","В корзину · "+item.cost+" монет");b.dataset.buyInstrument=item.id;card.append(b);}
    grid.append(card);
  });
  panel.append(grid);
  const quality=p.instruments.length;
  panel.append(el("p","process-muted","Установлено приборов: "+quality+" из "+INSTRUMENTS.length+". Приборы уменьшают разброс анализов и добавляют точность в оценке партий."));
  root.append(panel);
}

function renderLibrary(s,root) {
  const p=s.processCenter,panel=el("section","process-card");
  panel.append(el("h3","","📚 Библиотека сырья и технологических профилей"),el("p","process-muted","Изучайте свойства сырья, сравнивайте сезонность и открывайте справочные карточки. Для исследования нужен один образец со склада и 12 монет."));
  const grid=el("div","process-raw-grid");
  RAW.forEach(raw=>{
    const studied=!!p.rawStudies[raw.id],stock=Number(s.inventory?.[raw.id])||0,card=el("article","process-raw-card"+(studied?" studied":""));
    card.append(el("div","process-raw-title",raw.icon+" "+raw.name),el("small","process-raw-group",raw.group));
    if(studied){
      card.append(el("p","","Профиль: "+raw.profile),el("p","","Сезон: "+raw.season),el("p","","Применение: "+raw.uses),el("small","process-owned","Изучено · базовый индекс "+raw.base+"/100"));
    }else{
      card.append(el("p","","Справочная карточка пока закрыта. Образцов на складе: "+stock));
      const b=el("button","","Исследовать · 12 монет");b.dataset.studyRaw=raw.id;b.disabled=stock<1||s.money<12;card.append(b);
    }
    grid.append(card);
  });
  panel.append(grid);
  panel.append(el("p","process-library-bonus","Изучено профилей: "+Object.keys(p.rawStudies).length+" · библиотека постепенно повышает точность общей оценки качества."));
  root.append(panel);
}

function renderAnalytics(s,root) {
  const panel=el("section","process-card");
  panel.append(el("h3","","📈 Аналитика и сравнение партий"),el("p","process-muted","Сводка строится по паспортам из производственного архива. Старые партии без отдельного паспорта качества учитываются по сохранённой оценке."));
  const logs=(s.productionLog||[]).slice(0,20).filter(x=>x.passport);
  const scored=logs.map(x=>({name:x.name,day:x.day,quality:Number(x.passport.quality)||0,amount:Number(x.amount)||0,process:x.process,grade:x.passport.grade||"—"}));
  const avg=scored.length?Math.round(scored.reduce((n,x)=>n+x.quality,0)/scored.length):0;
  const best=[...scored].sort((a,b)=>b.quality-a.quality)[0],worst=[...scored].sort((a,b)=>a.quality-b.quality)[0];
  const stats=el("div","process-analytics-kpis");
  [[scored.length,"Партий в выборке"],[avg+"/100","Среднее качество"],[best?best.quality+"/100":"—","Лучший результат"],[scored.reduce((n,x)=>n+x.amount,0),"Единиц произведено"]].forEach(([v,l])=>{const box=el("div","process-mini-stat");box.append(el("b","",String(v)),el("span","",l));stats.append(box);});
  panel.append(stats);
  const chart=el("div","process-quality-chart");
  if(!scored.length)chart.append(el("p","process-muted","Пока нет завершённых партий. После производства здесь появятся сравнение и динамика."));
  scored.slice().reverse().forEach(x=>{
    const row=el("div","process-chart-row"),label=el("div","process-chart-label");
    label.append(el("b","",x.name),el("small","","День "+x.day+" · "+x.process+" · "+x.grade));
    const track=el("div","process-chart-track"),fill=el("i","");fill.style.width=Math.max(0,Math.min(100,x.quality))+"%";track.append(fill);
    row.append(label,track,el("strong","",x.quality+""));chart.append(row);
  });
  panel.append(chart);
  if(best&&worst){
    const compare=el("div","process-comparison");
    compare.append(el("b","","Сравнение крайних результатов"),el("p","","Лучшая: "+best.name+" — "+best.quality+"/100. Требует внимания: "+worst.name+" — "+worst.quality+"/100. Разница: "+(best.quality-worst.quality)+" пунктов."));
    panel.append(compare);
  }
  root.append(panel);
}

function render(s) {
  ensure(s);const root=$("#processCenter");if(!root)return;root.replaceChildren();
  root.append(el("p","feature-intro","Технологический центр объединяет модель установки, измерительные приборы, справочник сырья и аналитику производственных паспортов."));
  renderSimulator(s,root);renderInstruments(s,root);renderLibrary(s,root);renderAnalytics(s,root);
}

export function initProcessCenter(s,{render:renderGame,notify,earnExperience}) {
  ensure(s);const nav=$(".navigation"),game=$("#game");if(!nav||!game)return;
  if(!$("#processCenter")){
    const tab=el("button","","🧰 Техцентр");tab.dataset.tab="processCenter";nav.append(tab);
    const section=el("section","tab-content panel hidden");section.id="processCenter";section.append(el("h2","","🧰 Технологический центр"));game.append(section);
  }
  registerCartHandler("processInstrument",(current,item)=>{
    current.processCenter??={instruments:[],controls:{heat:3,cooling:3,pace:3},rawStudies:{},simulations:[]};
    const id=item.payload?.id;if(INSTRUMENTS.some(x=>x.id===id)&&!current.processCenter.instruments.includes(id))current.processCenter.instruments.push(id);
  });
  $("#processCenter").addEventListener("input",e=>{
    const input=e.target.closest("[data-process-control]");if(!input)return;
    const id=input.dataset.processControl;s.processCenter.controls[id]=Math.max(1,Math.min(5,Number(input.value)||3));
    const head=input.closest(".process-control-row")?.querySelector(".process-control-head strong");if(head)head.textContent=s.processCenter.controls[id]+"/5";
  });
  $("#processCenter").addEventListener("click",e=>{
    const buy=e.target.closest("[data-buy-instrument]");
    if(buy){const item=INSTRUMENTS.find(x=>x.id===buy.dataset.buyInstrument);if(!item||s.processCenter.instruments.includes(item.id))return;queuePurchase(s,{key:"process-instrument:"+item.id,kind:"processInstrument",name:item.name,cost:item.cost,payload:{id:item.id}});notify("Прибор добавлен в общую корзину: "+item.name);renderGame();return;}
    const study=e.target.closest("[data-study-raw]");
    if(study){const raw=RAW.find(x=>x.id===study.dataset.studyRaw);if(!raw||s.processCenter.rawStudies[raw.id]||(s.inventory[raw.id]||0)<1||s.money<12)return;removeInventory(s,raw.id,1);s.money-=12;s.processCenter.rawStudies[raw.id]={day:s.day||1,base:raw.base};notify("Изучен профиль сырья: "+raw.name+". Данные добавлены в библиотеку.");earnExperience(5);renderGame();return;}
    if(e.target.closest("[data-process-simulate]")){
      if(s.money<5||s.energy<3)return;const c=s.processCenter.controls,profile=getEquipmentProfile(s,"sugar");
      const score=Math.max(25,Math.min(100,Math.round(100-Math.abs(c.heat-3)*11-Math.abs(c.cooling-3)*10-Math.abs(c.pace-3)*8+(profile.quality*.35)+(s.still>=80?3:-4))));
      const balance=Math.max(0,1-(Math.abs(c.heat-3)*.045+Math.abs(c.cooling-3)*.04+Math.abs(c.pace-3)*.035));
      const qualityDelta=Math.max(-8,Math.min(8,Math.round((score-72)*.18)));
      const outputMultiplier=Math.max(.82,Math.min(1.12,Number((.9+c.heat*.025+c.pace*.018).toFixed(2))));
      const note=score>=88?"Конфигурация сбалансирована. Система показывает устойчивый игровой режим.":score>=68?"Рабочий режим найден, но параметры дают заметный компромисс.":"Симуляция выявила нестабильный режим. Попробуйте более ровный баланс.";
      const result={day:s.day||1,score,grade:score>=90?"Отличная":score>=75?"Хорошая":score>=55?"Средняя":"Слабая",qualityDelta,outputMultiplier,note,controls:{...c}};
      s.money-=5;s.energy-=3;s.processCenter.lastSimulation=result;s.processCenter.simulations.unshift(result);s.processCenter.simulations=s.processCenter.simulations.slice(0,12);
      s.processCenter.qualityDelta=qualityDelta;s.processCenter.outputMultiplier=outputMultiplier;
      notify("Симуляция установки завершена: "+score+"/100. Эффект будет учтён в следующих паспортах качества.");earnExperience(4);renderGame();return;
    }
  });
  nav.addEventListener("click",e=>{const b=e.target.closest('[data-tab="processCenter"]');if(!b)return;document.querySelectorAll(".tab-content").forEach(x=>x.classList.toggle("hidden",x.id!=="processCenter"));nav.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));});
  render(s);
}

export function renderProcessCenter(s){render(s);}
