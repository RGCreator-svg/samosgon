const GROUPS = [
  { title: "УСАДЬБА", tabs: ["home", "farm", "orchard", "barn"] },
  { title: "ТОРГОВЛЯ", tabs: ["market", "economy"] },
  { title: "ПРОИЗВОДСТВО", tabs: ["productionHub", "productionPlant", "featurePack", "viticulture", "cellar"] },
  { title: "РАЗВИТИЕ", tabs: ["skills", "researchLab", "processCenter"] },
  { title: "ЖУРНАЛ", tabs: ["notebook", "milestones", "orders", "goals"] }
];
const LABELS = {
  home:"🏠 Дом",farm:"🥕 Огород",orchard:"🍎 Сад",barn:"🛠 Сарай",
  market:"🧺 Рынок",skills:"🌳 Умения",notebook:"📖 Записки",
  productionHub:"📋 Диспетчер",productionPlant:"🏭 Цех",featurePack:"⚗️ Винокурня",
  viticulture:"🍇 Винодельня",cellar:"🪵 Погреб",researchLab:"🧪 Лаборатория",
  processCenter:"🧰 Техцентр"
};

function arrangeNavigation(nav) {
  const side=document.querySelector(".prototype-side");
  if(side){
    for(const button of side.querySelectorAll("button[data-tab]")){
      button.classList.remove("side-btn");
      button.querySelector(".big")?.remove();
      nav.append(button);
    }
    side.remove();
  }
  const buttons=[...nav.querySelectorAll(":scope > button[data-tab]")];
  const byId=new Map(buttons.map(button=>[button.dataset.tab,button]));
  const fragment=document.createDocumentFragment();
  for(const groupInfo of GROUPS){
    const group=document.createElement("div");
    group.className="nav-group";
    const title=document.createElement("span");
    title.className="nav-group-title";
    title.textContent=groupInfo.title;
    group.append(title);
    for(const id of groupInfo.tabs){
      const button=byId.get(id);
      if(!button)continue;
      button.textContent=LABELS[id]||button.textContent;
      group.append(button);
      byId.delete(id);
    }
    if(group.children.length>1)fragment.append(group);
  }
  for(const button of byId.values()){
    const group=document.createElement("div");
    group.className="nav-group";
    group.append(button);
    fragment.append(group);
  }
  nav.replaceChildren(fragment);
  nav.setAttribute("aria-label","Разделы усадьбы");
}

function openTab(id){
  const button=document.querySelector('[data-tab="'+id+'"]');
  if(button)button.click();
}

function initSceneInteractions(){
  const scene=document.querySelector("#homestead-scene");
  if(!scene)return;
  const targets=[
    ["#scene-house","home"],
    ["#scene-tree","orchard"],
    ["#scene-barn","barn"],
    ["#scene-beds","farm"],
    ["#scene-well","farm"]
  ];
  for(const [selector,tab] of targets){
    const node=scene.querySelector(selector);
    if(!node)continue;
    node.classList.add("clickable");
    node.addEventListener("click",()=>openTab(tab));
    node.addEventListener("keydown",event=>{
      if(event.key==="Enter"||event.key===" "){event.preventDefault();openTab(tab);}
    });
    node.setAttribute("role","button");
    node.setAttribute("tabindex","0");
  }
  const phrases=[
    "Хозяйство под присмотром! Тыква одобряет.",
    "Не стой столбом — урожай сам себя не соберёт.",
    "Кажется, в сарае опять что-то подозрительно булькает.",
    "Усадьба хорошеет. Или мне просто солнце в глаза."
  ];
  const mascot=document.querySelector("#pumpkinMascot");
  const bubble=document.querySelector("#pumpkinSay");
  let phrase=0;
  const speak=()=>{
    if(bubble){phrase=(phrase+1)%phrases.length;bubble.textContent=phrases[phrase];}
  };
  mascot?.addEventListener("click",speak);
  mascot?.addEventListener("keydown",event=>{
    if(event.key==="Enter"||event.key===" "){event.preventDefault();speak();}
  });
  const scenePumpkin=scene.querySelector("#scene-pumpkin");
  scenePumpkin?.addEventListener("click",speak);
}

export function initGamePresentation(){
  const nav=document.querySelector(".navigation");
  if(nav)arrangeNavigation(nav);
  const objective=document.querySelector(".prototype-task");
  const homeHeading=document.querySelector("#home .home-heading");
  if(objective&&homeHeading){
    objective.classList.add("home-objective");
    homeHeading.after(objective);
  }
  initSceneInteractions();
  document.querySelector("#bottomWarehouse")?.addEventListener("click",()=>{
    const warehouse=document.querySelector(".warehouse-panel");
    if(warehouse){warehouse.open=!warehouse.open;warehouse.scrollIntoView({block:"nearest",behavior:"smooth"});}
  });
  document.querySelector("#bottomMarket")?.addEventListener("click",()=>openTab("market"));
}
