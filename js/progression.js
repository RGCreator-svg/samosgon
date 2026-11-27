const $ = (s) => document.querySelector(s);
const GOALS = [
  {id:"first_repair",title:"Крепкий фундамент",icon:"🏚️",desc:"Доведи дом до 100% состояния.",test:s=>s.house>=100,reward:{money:45,xp:20}},
  {id:"barn_ready",title:"Рабочая мастерская",icon:"🛠️",desc:"Отремонтируй сарай до 100%.",test:s=>s.barn>=100,reward:{money:55,xp:25}},
  {id:"orchard",title:"Сад снова живёт",icon:"🍎",desc:"Восстанови бабушкин сад.",test:s=>!!s.orchardRestored,reward:{money:50,xp:25}},
  {id:"first_order",title:"Слово держать",icon:"📦",desc:"Выполни первый заказ жителя.",test:s=>(s.orders?.completed||0)>=1,reward:{money:65,xp:30}},
  {id:"reputation_15",title:"Уважаемый человек",icon:"⭐",desc:"Подними репутацию до 15.",test:s=>(s.reputation||0)>=15,reward:{money:80,xp:35}},
  {id:"specialist",title:"Своё ремесло",icon:"🌟",desc:"Выбери профессиональную специализацию.",test:s=>!!s.specialization,reward:{money:70,xp:30}},
  {id:"first_spirit",title:"Новая ступень",icon:"⚗️",desc:"Получи первую единицу игрового спирта-сырца.",test:s=>(s.inventory?.spirit||0)>0||(s.inventory?.aged_spirit||0)>0,reward:{money:75,xp:35}},
  {id:"aged_product",title:"Терпение вознаграждено",icon:"🪵",desc:"Получи выдержанный продукт.",test:s=>(s.inventory?.aged_spirit||0)>0,reward:{money:100,xp:45}},
  {id:"farm_builder",title:"Хозяин угодий",icon:"🌱",desc:"Построй две хозяйственные постройки.",test:s=>(s.farmUpgrades||[]).length>=2,reward:{money:100,xp:40}},
  {id:"level_5",title:"Опытный хозяин",icon:"🎖️",desc:"Достигни 5-го уровня.",test:s=>(s.level||1)>=5,reward:{money:150,xp:60}},
  {id:"day_15",title:"Укоренился",icon:"📅",desc:"Доживи до 15-го игрового дня.",test:s=>(s.day||1)>=15,reward:{money:100,xp:40}},
  {id:"orders_10",title:"Надёжный поставщик",icon:"🤝",desc:"Выполни 10 заказов.",test:s=>(s.orders?.completed||0)>=10,reward:{money:220,xp:80}},
  {id:"four_seasons",title:"Круглый год в деревне",icon:"🗓️",desc:"Познакомься со всеми четырьмя сезонами.",test:s=>(s.world?.seasonsSeen||[]).length>=4,reward:{money:180,xp:65}},
  {id:"weather_watcher",title:"Смотритель погоды",icon:"🌦️",desc:"Наблюдай не менее шести видов погоды.",test:s=>(s.world?.weatherSeen||[]).length>=6,reward:{money:130,xp:55}},
  {id:"farm_network",title:"Большое хозяйство",icon:"🏡",desc:"Построй теплицу, полив и пасеку.",test:s=>(s.farmUpgrades||[]).length>=3,reward:{money:200,xp:75}},
  {id:"first_winter",title:"Мороз нипочём",icon:"🧣",desc:"Доживи до зимнего сезона.",test:s=>(s.world?.seasonsSeen||[]).includes("winter"),reward:{money:100,xp:40}},
  {id:"first_wine",title:"Первый урожай винодела",icon:"🍷",desc:"Получи первую партию вина.",test:s=>(s.inventory?.wine||0)>0,reward:{money:120,xp:50}},
  {id:"first_mead",title:"Медовое ремесло",icon:"🍯",desc:"Получи первую медовуху.",test:s=>(s.inventory?.mead||0)>0,reward:{money:120,xp:50}},
  {id:"honey_spirit",title:"Золотая капля",icon:"🥃",desc:"Получи медовый дистиллят.",test:s=>(s.inventory?.honey_spirit||0)>0,reward:{money:160,xp:65}},
  {id:"vineyard",title:"Свои лозы",icon:"🍇",desc:"Построй виноградник.",test:s=>(s.viticulture?.buildings||[]).includes("vineyard"),reward:{money:100,xp:40}},
  {id:"first_cider",title:"Яблочная искра",icon:"🍏",desc:"Получи первую партию яблочного сидра.",test:s=>(s.inventory?.apple_cider||0)>0,reward:{money:110,xp:45}},
  {id:"first_pear_wine",title:"Грушевый букет",icon:"🍐",desc:"Получи первую партию грушевого вина.",test:s=>(s.inventory?.pear_wine||0)>0,reward:{money:130,xp:50}},
  {id:"fruit_wine_master",title:"Садовый купажист",icon:"🍷",desc:"Получи фруктовое вино из яблок и груш.",test:s=>(s.inventory?.fruit_wine||0)>0,reward:{money:160,xp:65}}
];
function ensure(s){s.milestones??={claimed:[]};s.milestones.claimed=Array.isArray(s.milestones.claimed)?s.milestones.claimed:[];}
function make(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;}
function render(s){
 ensure(s);
 const root=$("#milestoneContent");if(!root)return;
 root.replaceChildren();
 const done=GOALS.filter(g=>g.test(s));
 const claimed=done.filter(g=>s.milestones.claimed.includes(g.id)).length;
 const summary=make("div","milestone-summary milestone-summary-visual",`Открыто целей: ${done.length}/${GOALS.length} · Получено наград: ${claimed}/${GOALS.length}`);
 root.append(summary);
 const list=make("div","milestone-grid");
 GOALS.forEach(goal=>{
  const unlocked=goal.test(s), received=s.milestones.claimed.includes(goal.id);
  const card=make("article",`milestone-card ${unlocked?"unlocked":""} ${received?"claimed":""}`);
  const emblem=make("div",`milestone-emblem ${unlocked?"earned":"locked"} ${received?"collected":""}`,goal.icon);emblem.dataset.medal=goal.id;emblem.setAttribute("aria-hidden","true");
  card.append(emblem,make("h3","milestone-title",goal.title),make("p","",goal.desc));
  card.append(make("p","milestone-reward",`Награда: ${goal.reward.money} монет · ${goal.reward.xp} XP`));
  const status=make("span","milestone-status",received?"Награда получена":unlocked?"Цель выполнена":"Ещё впереди");
  card.append(status);
  if(unlocked&&!received){const b=make("button","","Забрать награду");b.dataset.claimMilestone=goal.id;card.append(b);}
  list.append(card);
 });
 root.append(list);
}
export function renderMilestones(s){render(s);}
export function initMilestones(s,{renderGame,notify,earnExperience}){
 ensure(s);
 const nav=$(".navigation"),game=$("#game");if(!nav||!game)return;
 if(!$("#milestones")){
  const tab=make("button","","🏆 Цели");tab.dataset.tab="milestones";nav.append(tab);
  const section=make("section","tab-content panel hidden");section.id="milestones";
  const h=make("h2","","🏆 Долгосрочные цели");section.append(h,make("p","","Небольшие и большие достижения помогают планировать развитие хозяйства. Награды выдаются один раз и сохраняются в вашей партии."));
  const content=make("div","","");content.id="milestoneContent";section.append(content);
  game.append(section);
 }
 $("#milestones").addEventListener("click",e=>{
  const b=e.target.closest("[data-claim-milestone]");if(!b)return;
  const goal=GOALS.find(g=>g.id===b.dataset.claimMilestone);
  if(!goal||s.milestones.claimed.includes(goal.id)||!goal.test(s))return;
  s.milestones.claimed.push(goal.id);
  s.money+=goal.reward.money;
  earnExperience(goal.reward.xp);
  notify(`Достижение «${goal.title}»! Получено ${goal.reward.money} монет и ${goal.reward.xp} опыта.`);
  renderGame();render(s);
 });
  render(s);
}
