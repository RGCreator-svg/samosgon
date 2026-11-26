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
}
function hasItems(s,items){return Object.entries(items).every(([id,n])=>(Number(s.inventory?.[id])||0)>=n);}
function render(s){
 ensure(s);const root=$("#researchLab");if(!root)return;root.replaceChildren();
 const intro=el("p","feature-intro","Лаборатория связывает сырьё, рецептуры и контроль качества. Проводите опыты, накапливайте исследовательские баллы и открывайте технологические улучшения. Прогресс сохраняется в вашей партии.");
 root.append(intro);
 const stats=el("div","lab-kpis");
 [[s.lab.points,"Исследовательские баллы"],[s.lab.completed.length+"/"+TECH.length,"Открыто технологий"],[s.lab.qualityBonus,"Бонус качества"],[s.lab.experiments,"Проведено опытов"]].forEach(([v,t])=>{const card=el("div","lab-kpi");card.append(el("b","",String(v)),el("span","",t));stats.append(card);});
 root.append(stats);
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
