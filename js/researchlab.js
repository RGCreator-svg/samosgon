const $ = selector => document.querySelector(selector);
const el = (tag, cls, text) => { const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text; return n; };

const TECH = [
 {id:"lab_basics",name:"Основы лабораторного дела",icon:"🧪",branch:"Фундамент",cost:0,money:0,days:0,requires:[],desc:"Открывает журнал исследований и базовые опыты.",effect:"Лаборатория введена в эксплуатацию.",bonus:0},
 {id:"yeast_selection",name:"Подбор культур",icon:"🧫",branch:"Брожение",cost:3,money:45,days:1,requires:["lab_basics"],desc:"Подбор дрожжей под разные типы сырья.",effect:"+3 к качеству перегонки.",bonus:3},
 {id:"temperature_control",name:"Точный температурный контроль",icon:"🌡️",branch:"Брожение",cost:4,money:70,days:2,requires:["yeast_selection"],desc:"Стабильнее протекают игровые процессы брожения.",effect:"+4 к качеству перегонки.",bonus:4},
 {id:"fruit_chemistry",name:"Химия фруктового сырья",icon:"🍎",branch:"Сырьё",cost:3,money:55,days:1,requires:["lab_basics"],desc:"Изучение различий яблочного, грушевого и виноградного сырья.",effect:"+3 к качеству фруктовых партий.",bonus:3},
 {id:"clarification",name:"Осветление и фильтрация",icon:"💧",branch:"Обработка",cost:5,money:90,days:2,requires:["fruit_chemistry"],desc:"Подбор режима фильтрации и осветления.",effect:"+5 к общему качеству продукции.",bonus:5},
 {id:"sensory_panel",name:"Дегустационная комиссия",icon:"👃",branch:"Контроль",cost:6,money:120,days:2,requires:["temperature_control","clarification"],desc:"Сравнение аромата, чистоты и стабильности партий.",effect:"+6 к качеству перегонки.",bonus:6},
 {id:"cellar_science",name:"Наука выдержки",icon:"🪵",branch:"Созревание",cost:7,money:150,days:3,requires:["sensory_panel"],desc:"Контроль созревания и подбор условий погреба.",effect:"+8 к качеству выдержанного продукта.",bonus:8}
];

const EXPERIMENTS = [
 {id:"fruit",name:"Сравнить фруктовое сырьё",desc:"Потрать 1 яблоко и 1 грушу, чтобы получить исследовательские данные.",items:{apple:1,pear:1},money:12,points:3,xp:5},
 {id:"ferment",name:"Проверить брожение",desc:"Потрать 1 брагу и изучи стабильность партии.",items:{braga:1},money:18,points:4,xp:7},
 {id:"honey",name:"Исследовать медовое сырьё",desc:"Потрать 1 мёд и изучи свойства медовой линии.",items:{honey:1},money:20,points:4,xp:7}
];

function ensure(s){
 s.lab??={points:0,unlocked:["lab_basics"],qualityBonus:0,active:null,completed:[],experiments:0};
 s.lab.points=Math.max(0,Number(s.lab.points)||0);
 s.lab.unlocked=Array.isArray(s.lab.unlocked)?s.lab.unlocked:["lab_basics"];
 s.lab.completed=Array.isArray(s.lab.completed)?s.lab.completed:[];
 s.lab.qualityBonus=Math.max(0,Number(s.lab.qualityBonus)||0);
 s.lab.experiments=Math.max(0,Number(s.lab.experiments)||0);
 s.lab.selectedSample??="braga";s.lab.lastAnalysis??=null;recipeState(s);
}
function hasItems(s,items){return Object.entries(items).every(([id,n])=>(Number(s.inventory?.[id])||0)>=n);}

const FORMULAS={orchard:{name:"Садовый купаж",a:"apple",b:"pear",target:2,product:"orchard_blush",productName:"Румянец старого сада",emoji:"🍎",desc:"Авторский яблочно-грушевый купаж."},vineyard:{name:"Виноградный купаж",a:"grapes",b:"honey",target:3,product:"golden_vintage",productName:"Золотой винтаж",emoji:"🍇",desc:"Виноградный сорт с медовым оттенком."},pear:{name:"Грушевый купаж",a:"pear",b:"honey",target:2,product:"pear_honey_reserve",productName:"Грушевый медовый резерв",emoji:"🍐",desc:"Редкий грушево-медовый сорт."}};
const RAW_NAMES={apple:"яблоки",pear:"груши",grapes:"виноград",honey:"мёд"};
function recipeState(s){s.lab.recipeDraft??={type:"orchard",a:2,b:1};s.lab.recipeDraft.type=FORMULAS[s.lab.recipeDraft.type]?s.lab.recipeDraft.type:"orchard";s.lab.recipeDraft.a=Math.max(1,Math.min(4,Number(s.lab.recipeDraft.a)||2));s.lab.recipeDraft.b=Math.max(1,Math.min(4,Number(s.lab.recipeDraft.b)||1));s.lab.discoveredRecipes=Array.isArray(s.lab.discoveredRecipes)?s.lab.discoveredRecipes:[];s.lab.trialLog=Array.isArray(s.lab.trialLog)?s.lab.trialLog:[];}
function renderRecipes(s,root){recipeState(s);const section=el("section","lab-recipe-workshop");section.append(el("h3","","🧬 Конструктор лабораторных рецептур"),el("p","","Меняйте пропорции компонентов, запускайте опытные партии и сравнивайте протоколы. Удачные сочетания открывают авторские сорта для повторного производства."));const d=s.lab.recipeDraft,f=FORMULAS[d.type],types=el("div","lab-recipe-types");Object.entries(FORMULAS).forEach(([id,x])=>{const b=el("button","lab-recipe-type"+(d.type===id?" selected":""),x.name);b.dataset.recipeType=id;types.append(b);});section.append(types);const ratio=el("div","lab-ratio-editor");[[ "a",f.a ],["b",f.b ]].forEach(([key,id])=>{const line=el("div","lab-ratio-line");line.append(el("span","",RAW_NAMES[id]),el("button","","−"));line.lastChild.dataset.ratio=key;line.lastChild.dataset.delta="-1";line.append(el("strong","",d[key]+" дол."));const plus=el("button","","+");plus.dataset.ratio=key;plus.dataset.delta="1";line.append(plus);ratio.append(line);});section.append(ratio,el("p","lab-recipe-cost","Опыт требует: "+d.a+" × "+RAW_NAMES[f.a]+", "+d.b+" × "+RAW_NAMES[f.b]+", 1 дрожжи и 8 монет. Баланс оценивается относительно лабораторной гипотезы."));const run=el("button","lab-trial-button","⚗️ Запустить опытную партию");run.dataset.recipeTrial="true";run.disabled=(s.inventory[f.a]||0)<d.a||(s.inventory[f.b]||0)<d.b||(s.inventory.yeast||0)<1||s.money<8;section.append(run);const discovered=el("div","lab-discovered-recipes");discovered.append(el("h4","","Открытые авторские сорта"));if(!s.lab.discoveredRecipes.length)discovered.append(el("p","","Пока не открыто ни одного сорта."));s.lab.discoveredRecipes.forEach(id=>{const x=FORMULAS[id];if(!x)return;const card=el("article","lab-discovered-card");card.append(el("b","",x.emoji+" "+x.productName),el("p","",x.desc));const b=el("button","","Произвести сорт · 12 монет");b.dataset.recipeProduce=id;b.disabled=s.money<12||(s.inventory[x.a]||0)<d.a||(s.inventory[x.b]||0)<d.b||(s.inventory.yeast||0)<1;card.append(b);discovered.append(card);});section.append(discovered);const history=el("div","lab-trial-history");history.append(el("h4","","Сравнение опытных партий"));if(!s.lab.trialLog.length)history.append(el("p","","История появится после первого опыта."));const table=el("div","lab-trial-table");s.lab.trialLog.slice(0,8).forEach(t=>{const row=el("div","lab-trial-row");row.append(el("span","","День "+t.day+" · "+t.name+" · "+t.ratio),el("b","",t.quality+"/100"),el("small","",t.quality>=80?"Сорт открыт":t.quality>=60?"Перспективно":"Нужна корректировка"));table.append(row);});history.append(table);section.append(history);root.append(section);}
function runFormulaTrial(s,type,a,b,notify,earnExperience,produce=false){const f=FORMULAS[type];if(!f||(s.inventory[f.a]||0)<a||(s.inventory[f.b]||0)<b||(s.inventory.yeast||0)<1||s.money<(produce?12:8))return false;s.inventory[f.a]-=a;s.inventory[f.b]-=b;s.inventory.yeast--;s.money-=produce?12:8;const closeness=Math.max(0,1-Math.abs(a/b-f.target)/f.target),quality=Math.max(35,Math.min(99,Math.round(48+closeness*48+(Number(s.lab.qualityBonus)||0)*.25+(Math.random()*7-3))));s.lab.trialLog.unshift({day:s.day||1,name:f.name,ratio:a+":"+b,quality});s.lab.trialLog=s.lab.trialLog.slice(0,20);s.lab.experiments++;if(quality>=80&&!s.lab.discoveredRecipes.includes(type)){s.lab.discoveredRecipes.push(type);notify("Открыт авторский сорт «"+f.productName+"»!");earnExperience(18);}if(produce){const amount=2+Math.floor(quality/50);s.inventory[f.product]=(Number(s.inventory[f.product])||0)+amount;notify("Произведён сорт «"+f.productName+"»: "+amount+" ед., качество "+quality+"/100.");}else{s.lab.points+=2;notify("Опытная партия: качество "+quality+"/100. Протокол сохранён.");}earnExperience(produce?5:8);return true;}

function render(s){
 ensure(s);const root=$("#researchLab");if(!root)return;root.replaceChildren();
 const intro=el("p","feature-intro","Лаборатория связывает сырьё, рецептуры и контроль качества. Проводите опыты, накапливайте исследовательские баллы и открывайте технологические улучшения. Прогресс сохраняется в вашей партии.");
 root.append(intro);
 const stats=el("div","lab-kpis");
 [[s.lab.points,"Исследовательские баллы"],[s.lab.completed.length+"/"+TECH.length,"Открыто технологий"],[s.lab.qualityBonus,"Бонус качества"],[s.lab.experiments,"Проведено опытов"]].forEach(([v,t])=>{const card=el("div","lab-kpi");card.append(el("b","",String(v)),el("span","",t));stats.append(card);});
 root.append(stats);

 const bench=el("section","lab-bench");
 const visual=el("div","lab-bench-visual");
 visual.innerHTML='<div class="lab-bench-lamp"></div><div class="lab-glassware"><div class="lab-flask"><i></i><b></b></div><div class="lab-cylinder"><i></i><b></b></div><div class="lab-beaker"><i></i><b></b></div></div><div class="lab-bench-instrument"><span>pH</span><strong>6.8</strong><small>READY</small></div><div class="lab-bench-shelf"></div>';
 const panel=el("div","lab-bench-panel");panel.append(el("h3","","Анализ образца"),el("p","","Выберите сырьё со склада. Лаборатория оценит его игровые свойства и сохранит протокол анализа."));
 const samples=[["braga","Сахарная брага","🫙"],["fruit_braga","Фруктовая брага","🍎"],["grain_braga","Зерновая брага","🌾"],["honey_braga","Медовая брага","🍯"],["apple","Яблоки","🍏"],["pear","Груши","🍐"],["grapes","Виноград","🍇"],["honey","Мёд","🍯"]];
 const choices=el("div","lab-sample-choices");
 samples.forEach(([id,name,icon])=>{const b=el("button","lab-sample-choice"+(s.lab.selectedSample===id?" selected":""),icon+" "+name+" · "+(s.inventory?.[id]||0));b.dataset.labSample=id;b.disabled=(s.inventory?.[id]||0)<1;choices.append(b);});
 panel.append(choices);const analyze=el("button","lab-analyze-button","🔬 Провести анализ · 8 монет и 1 образец");analyze.dataset.labAnalyze="true";analyze.disabled=!(s.inventory?.[s.lab.selectedSample]>0)||s.money<8;panel.append(analyze);
 bench.append(visual,panel);root.append(bench);
 const analysis=el("section","lab-analysis-panel");analysis.append(el("h3","","Последний протокол анализа"));
 if(s.lab.lastAnalysis){const a=s.lab.lastAnalysis;analysis.append(el("p","lab-analysis-caption",a.name+" · День "+a.day+" · "+a.note));const meters=el("div","lab-meters");[["Аромат",a.aroma],["Чистота",a.purity],["Стабильность",a.stability]].forEach(([name,value])=>{const m=el("div","lab-meter");m.append(el("div","lab-meter-head",name),el("div","lab-meter-track"));const fill=el("i","lab-meter-fill");fill.style.width=value+"%";m.querySelector(".lab-meter-track").append(fill);m.append(el("b","",value+"/100"));meters.append(m);});analysis.append(meters);}else analysis.append(el("p","lab-analysis-caption","Протоколов пока нет. Выберите образец и проведите первый анализ."));
 root.append(analysis);
 root.append(el("h3","","Экспериментальная лаборатория"));
 const expGrid=el("div","lab-experiments");
 EXPERIMENTS.forEach(exp=>{const card=el("article","lab-card");card.append(el("h4","",exp.name),el("p","",exp.desc),el("small","lab-cost","Реактивы: "+Object.entries(exp.items).map(([id,n])=>id+" × "+n).join(", ")+" · "+exp.money+" монет · +"+exp.points+" балла"));const b=el("button","","Провести опыт");b.dataset.labExperiment=exp.id;b.disabled=!hasItems(s,exp.items)||s.money<exp.money;card.append(b);expGrid.append(card);});
 root.append(expGrid,el("h3","","Технологическое дерево"));
 const tree=el("div","lab-tech-tree");
 TECH.forEach(tech=>{const unlocked=s.lab.unlocked.includes(tech.id),active=s.lab.active?.id===tech.id,done=s.lab.completed.includes(tech.id),available=tech.requires.every(id=>s.lab.unlocked.includes(id))&&!unlocked&&!s.lab.active;
 const card=el("article","lab-tech-card "+(unlocked?"is-unlocked":active?"is-active":available?"is-available":"is-locked"));
 card.append(el("div","lab-tech-icon",tech.icon),el("small","lab-branch",tech.branch),el("h4","",tech.name),el("p","",tech.desc),el("strong","lab-effect",tech.effect));
 const status=unlocked?"Изучено":active?"Исследуется · осталось "+s.lab.active.remaining+" дн.":available?"Доступно для исследования":"Сначала изучите предыдущие технологии";
 card.append(el("small","lab-tech-status",status));
 if(available) {const b=el("button","","Исследовать · "+tech.cost+" балла · "+tech.money+" монет");b.dataset.labTech=tech.id;b.disabled=s.lab.points<tech.cost||s.money<tech.money;card.append(b);}
 tree.append(card);
 });
 root.append(tree);
 if(s.lab.active){const note=el("p","lab-active-note","В работе: "+s.lab.active.name+". Исследование завершится через "+s.lab.active.remaining+" игровых дня.");root.append(note);}
}
export function initResearchLab(s,{render:renderGame,notify,earnExperience}){
 ensure(s);const nav=$(".navigation"),game=$("#game");if(!nav||!game)return;
 if(!$("#researchLab")){const tab=el("button","","🧪 Лаборатория");tab.dataset.tab="researchLab";nav.append(tab);const section=el("section","tab-content panel hidden");section.id="researchLab";section.append(el("h2","","🧪 Лаборатория и исследования"));game.append(section);}
 nav.addEventListener("click",e=>{if(!e.target.closest('[data-tab="researchLab"]'))return;document.querySelectorAll(".tab-content").forEach(x=>x.classList.toggle("hidden",x.id!=="researchLab"));nav.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x.dataset.tab==="researchLab"));});
 $("#researchLab").addEventListener("click",e=>{

  const recipeType=e.target.closest("[data-recipe-type]");if(recipeType){s.lab.recipeDraft.type=recipeType.dataset.recipeType;renderGame();return;}
  const ratioButton=e.target.closest("[data-ratio]");if(ratioButton){const k=ratioButton.dataset.ratio;s.lab.recipeDraft[k]=Math.max(1,Math.min(4,(Number(s.lab.recipeDraft[k])||1)+Number(ratioButton.dataset.delta)));renderGame();return;}
  const trial=e.target.closest("[data-recipe-trial]");if(trial){const d=s.lab.recipeDraft;runFormulaTrial(s,d.type,d.a,d.b,notify,earnExperience,false);renderGame();return;}
  const produce=e.target.closest("[data-recipe-produce]");if(produce){const d=s.lab.recipeDraft;if(!s.lab.discoveredRecipes.includes(produce.dataset.recipeProduce))return;runFormulaTrial(s,produce.dataset.recipeProduce,d.a,d.b,notify,earnExperience,true);renderGame();return;}
  const sampleButton=e.target.closest("[data-lab-sample]");
  if(sampleButton){const id=sampleButton.dataset.labSample;if((s.inventory?.[id]||0)<1)return;s.lab.selectedSample=id;renderGame();return;}
  if(e.target.closest("[data-lab-analyze]")){const id=s.lab.selectedSample;if((s.inventory?.[id]||0)<1||s.money<8)return;const names={braga:"Сахарная брага",fruit_braga:"Фруктовая брага",grain_braga:"Зерновая брага",honey_braga:"Медовая брага",apple:"Яблоки",pear:"Груши",grapes:"Виноград",honey:"Мёд"};const base={braga:[68,72,74],fruit_braga:[82,64,68],grain_braga:[76,78,70],honey_braga:[88,70,66],apple:[84,76,82],pear:[80,72,78],grapes:[90,74,76],honey:[92,80,72]}[id]||[60,60,60];const jitter=()=>Math.floor(Math.random()*9)-4;const values=base.map(v=>Math.max(20,Math.min(100,v+jitter())));s.inventory[id]--;s.money-=8;s.lab.lastAnalysis={id,name:names[id]||id,day:s.day||1,aroma:values[0],purity:values[1],stability:values[2],note:"Показатели — игровые характеристики."};s.lab.points+=2;s.lab.experiments++;s.lab.qualityBonus=Math.min(30,(Number(s.lab.qualityBonus)||0)+1);notify("Анализ завершён: +2 исследовательских балла и +1 к лабораторному бонусу качества.");earnExperience(4);renderGame();return;}
  const expButton=e.target.closest("[data-lab-experiment]");
  if(expButton){const exp=EXPERIMENTS.find(x=>x.id===expButton.dataset.labExperiment);if(!exp||!hasItems(s,exp.items)||s.money<exp.money)return;Object.entries(exp.items).forEach(([id,n])=>s.inventory[id]-=n);s.money-=exp.money;s.lab.points+=exp.points;s.lab.experiments++;earnExperience(exp.xp);notify("Опыт «"+exp.name+"» завершён: +"+exp.points+" исследовательских балла.");renderGame();return;}
  const techButton=e.target.closest("[data-lab-tech]");if(!techButton)return;const tech=TECH.find(x=>x.id===techButton.dataset.labTech);if(!tech||s.lab.unlocked.includes(tech.id)||s.lab.active||!tech.requires.every(id=>s.lab.unlocked.includes(id))||s.lab.points<tech.cost||s.money<tech.money)return;
  s.lab.points-=tech.cost;s.money-=tech.money;s.lab.active={id:tech.id,name:tech.name,remaining:tech.days,bonus:tech.bonus};if(tech.days===0)complete(s,notify,earnExperience);notify("Исследование «"+tech.name+"» начато.");renderGame();
 });
 render(s);
}
function complete(s,notify,earnExperience){const job=s.lab.active;if(!job)return;s.lab.unlocked.push(job.id);s.lab.completed.push(job.id);s.lab.qualityBonus=Math.min(30,s.lab.qualityBonus+(Number(job.bonus)||0));s.lab.active=null;earnExperience(12);notify("Технология «"+job.name+"» изучена. Бонус качества увеличен.");}
export function advanceResearchLabDay(s,notify,earnExperience=()=>{}){ensure(s);if(!s.lab.active)return;s.lab.active.remaining=Math.max(0,s.lab.active.remaining-1);if(!s.lab.active.remaining)complete(s,notify,earnExperience);}
export function renderResearchLab(s){render(s);}
