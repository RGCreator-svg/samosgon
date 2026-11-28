const $ = (selector) => document.querySelector(selector);
const QUESTS = [
 {id:"house",icon:"🏚️",title:"Вернуть дому тепло",description:"Отремонтируйте бабушкин дом до 100%.",tab:"home",progress:s=>Math.min(100,Math.max(0,Number(s.house)||0)),done:s=>Number(s.house)>=100,action:"Перейти к ремонту дома"},
 {id:"garden",icon:"🌱",title:"Расчистить огород",description:"Поднимите состояние огорода до 100%.",tab:"home",progress:s=>Math.min(100,Math.max(0,Number(s.garden)||0)),done:s=>Number(s.garden)>=100,action:"Открыть усадьбу"},
 {id:"orchard",icon:"🍎",title:"Вернуть сад к жизни",description:"Восстановите фруктовый сад.",tab:"orchard",progress:s=>s.orchardRestored?100:0,done:s=>Boolean(s.orchardRestored),action:"Перейти в сад"},
 {id:"water",icon:"💧",title:"Наладить водоснабжение",description:"Пройдите три этапа: колодец, насос и водонапорная башня.",tab:"home",progress:s=>Math.min(100,Math.max(0,Number(s.waterSystem?.level)||0)/3*100),done:s=>Number(s.waterSystem?.level)>=3,action:"Открыть водоснабжение"},
 {id:"barn",icon:"🛠️",title:"Подготовить мастерскую",description:"Отремонтируйте сарай до 100%.",tab:"barn",progress:s=>Math.min(100,Math.max(0,Number(s.barn)||0)),done:s=>Number(s.barn)>=100,action:"Перейти в сарай"},
 {id:"order",icon:"📦",title:"Помочь первому соседу",description:"Выполните первый заказ на доске объявлений.",tab:"orders",progress:s=>(Number(s.orders?.completed)||0)>0?100:0,done:s=>(Number(s.orders?.completed)||0)>0,action:"Открыть доску заказов"}
];
function make(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
export function renderCurrentTasks(state){
 const card=$(".prototype-task"),list=$("#storyQuestList");if(!card||!list)return;
 const activeIndex=QUESTS.findIndex(q=>!q.done(state)),active=activeIndex<0?null:QUESTS[activeIndex],doneCount=QUESTS.filter(q=>q.done(state)).length;
 card.replaceChildren();card.append(make("h4","","❗ Текущая задача"));
 const row=make("div","task-row"),icon=make("span","task-icon",active?.icon||"🏡"),copy=make("div","task-current-copy");
 copy.append(make("strong","",active?.title||"Усадьба восстановлена!"),make("small","",active?.description||"Все основные этапы выполнены. Можно развивать хозяйство дальше."));
 const track=make("div","task-progress"),fill=make("span","");fill.style.width=(active?active.progress(state):100)+"%";track.append(fill);
 copy.append(track,make("small","task-progress-label",active?Math.round(active.progress(state))+"% · "+doneCount+"/"+QUESTS.length+" этапов":"Все этапы пройдены"));row.append(icon,copy);card.append(row);
 if(active){const b=make("button","task-action",active.action);b.type="button";b.dataset.tab=active.tab;card.append(b);}
 list.replaceChildren();list.append(make("p","story-quest-summary","Основная линия усадьбы · выполнено "+doneCount+" из "+QUESTS.length));
 QUESTS.forEach((q,i)=>{const completed=q.done(state),unlocked=i<=activeIndex,pct=Math.round(q.progress(state));
  const item=make("article","story-quest "+(completed?"is-done":unlocked?"is-current":"is-locked"));
  const head=make("div","story-quest-head");head.append(make("span","story-quest-icon",q.icon),make("strong","",q.title),make("span","story-quest-status",completed?"✓ Выполнено":unlocked?"В работе":"🔒 Позже"));
  const desc=make("p","",q.description),bar=make("div","story-quest-track"),barFill=make("span","");barFill.style.width=pct+"%";bar.append(barFill);
  const footer=make("div","story-quest-footer");footer.append(make("small","",pct+"%"));
  if(unlocked&&!completed){const b=make("button","",q.action);b.type="button";b.dataset.tab=q.tab;footer.append(b);}
  item.append(head,desc,bar,footer);list.append(item);
 });
}