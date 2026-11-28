const GROUPS = [
  { title: "Усадьба", icon: "🏡", tabs: ["home", "farm", "orchard", "barn"] },
  { title: "Торговля", icon: "🧺", tabs: ["market", "economy"] },
  { title: "Производство", icon: "⚗️", tabs: ["productionHub", "productionPlant", "featurePack", "viticulture", "cellar"] },
  { title: "Развитие", icon: "🌱", tabs: ["skills", "researchLab", "processCenter"] },
  { title: "Журнал", icon: "📜", tabs: ["notebook", "milestones", "orders", "goals"] }
];
const LABELS = {
  home:"Дом",farm:"Огород",orchard:"Сад",barn:"Сарай",
  market:"Рынок",economy:"Финансы",skills:"Умения",notebook:"Записки",
  productionHub:"Диспетчер",productionPlant:"Цех",featurePack:"Винокурня",
  viticulture:"Винодельня",cellar:"Погреб",researchLab:"Лаборатория",
  processCenter:"Техцентр",milestones:"Достижения",orders:"Задания",goals:"Цели"
};

function arrangeNavigation(nav) {
  const side=document.querySelector(".prototype-side");
  if(side){
    for(const button of side.querySelectorAll("button[data-tab]")) nav.append(button);
    side.remove();
  }
  const buttons=[...nav.querySelectorAll(":scope > button[data-tab]")];
  const byId=new Map(buttons.map(button=>[button.dataset.tab,button]));
  const fragment=document.createDocumentFragment();
  for(const info of GROUPS){
    const group=document.createElement("div");
    group.className="nav-group";
    const toggle=document.createElement("button");
    toggle.type="button";
    toggle.className="nav-category-toggle";
    toggle.setAttribute("aria-expanded","false");
    toggle.innerHTML='<span class="nav-category-icon" aria-hidden="true">'+info.icon+'</span><span class="nav-category-label">'+info.title+'</span><span class="nav-category-chevron" aria-hidden="true">⌄</span>';
    const dropdown=document.createElement("div");
    dropdown.className="nav-dropdown";
    dropdown.hidden=true;
    for(const id of info.tabs){
      const button=byId.get(id);
      if(!button)continue;
      button.textContent=LABELS[id]||button.textContent;
      button.classList.add("nav-dropdown-item");
      dropdown.append(button);
      byId.delete(id);
    }
    if(dropdown.children.length){
      group.append(toggle,dropdown);
      fragment.append(group);
      toggle.addEventListener("click",()=>{
        const opening=dropdown.hidden;
        nav.querySelectorAll(".nav-dropdown").forEach(menu=>{menu.hidden=true;menu.previousElementSibling?.setAttribute("aria-expanded","false");});
        dropdown.hidden=!opening;
        toggle.setAttribute("aria-expanded",String(opening));
      });
    }
  }
  for(const button of byId.values()) fragment.append(button);
  nav.replaceChildren(fragment);
  nav.setAttribute("aria-label","Пять основных разделов хозяйства");
  document.addEventListener("click",event=>{
    if(nav.contains(event.target))return;
    nav.querySelectorAll(".nav-dropdown").forEach(menu=>{menu.hidden=true;menu.previousElementSibling?.setAttribute("aria-expanded","false");});
  });
  nav.addEventListener("click",event=>{
    if(event.target.closest(".nav-dropdown-item")){
      nav.querySelectorAll(".nav-dropdown").forEach(menu=>{menu.hidden=true;menu.previousElementSibling?.setAttribute("aria-expanded","false");});
    }
  });
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
  document.querySelectorAll(".farm-plot").forEach(plot=>plot.addEventListener("click",()=>{
    document.querySelector("#harvestVegetables")?.click();
  }));
  document.querySelector("#bottomWarehouse")?.addEventListener("click",()=>{
    const warehouse=document.querySelector(".warehouse-panel");
    if(warehouse){
      const opening=!warehouse.open;
      warehouse.open=opening;
      if(opening){
        document.querySelector("#sharedPurchaseCart")?.classList.remove("is-open");
        document.querySelector(".cart-overlay-scrim")?.classList.remove("is-visible");
        document.querySelector("#cartToggle")?.setAttribute("aria-expanded","false");
      }
      warehouse.scrollIntoView({block:"nearest",behavior:"smooth"});
    }
  });
  document.querySelector("#bottomMarket")?.addEventListener("click",()=>openTab("market"));
}
