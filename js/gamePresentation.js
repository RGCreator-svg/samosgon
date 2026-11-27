const GROUPS = [
  { title: "Усадьба", tabs: ["home", "farm", "orchard", "barn"] },
  { title: "Хозяйство", tabs: ["market", "skills", "notebook"] },
  { title: "Производство", tabs: ["productionHub", "productionPlant", "featurePack", "viticulture", "cellar"] },
  { title: "Развитие", tabs: ["researchLab", "processCenter"] }
];
const LABELS = {
  home: "🏚 Дом", farm: "🥕 Огород", orchard: "🍎 Сад", barn: "🛠 Сарай",
  market: "🧺 Рынок", skills: "🌳 Умения", notebook: "📖 Записки",
  productionHub: "📋 Диспетчер", productionPlant: "🏭 Цех", featurePack: "⚗️ Винокурня",
  viticulture: "🍇 Винодельня", cellar: "🪵 Погреб", researchLab: "🧪 Лаборатория",
  processCenter: "🧰 Техцентр"
};
const SCENE_LOCATIONS = [
  { id: "home", label: "Бабушкин дом", x: .5, y: .52, w: .22, h: .56, color: 0x806344 },
  { id: "farm", label: "Огород", x: .16, y: .73, w: .22, h: .24, color: 0x718348 },
  { id: "orchard", label: "Сад", x: .83, y: .48, w: .2, h: .48, color: 0x537448 },
  { id: "barn", label: "Сарай", x: .77, y: .78, w: .2, h: .28, color: 0x76513a }
];

function arrangeNavigation(nav) {
  const buttons = [...nav.querySelectorAll(":scope > button[data-tab]")];
  const byId = new Map(buttons.map(button => [button.dataset.tab, button]));
  const fragment = document.createDocumentFragment();
  for (const groupInfo of GROUPS) {
    const group = document.createElement("div");
    group.className = "nav-group";
    const title = document.createElement("span");
    title.className = "nav-group-title";
    title.textContent = groupInfo.title;
    group.append(title);
    for (const id of groupInfo.tabs) {
      const button = byId.get(id);
      if (!button) continue;
      button.textContent = LABELS[id] || button.textContent;
      group.append(button);
      byId.delete(id);
    }
    if (group.children.length > 1) fragment.append(group);
  }
  for (const button of byId.values()) {
    const group = document.createElement("div");
    group.className = "nav-group";
    group.append(button);
    fragment.append(group);
  }
  nav.replaceChildren(fragment);
  nav.setAttribute("aria-label", "Единое меню игры");
}

function startPhaserScene() {
  const mount = document.querySelector("#game-world");
  const fallback = mount?.querySelector(".world-fallback");
  if (!mount || !window.Phaser) return;
  fallback?.remove();

  class HomesteadScene extends window.Phaser.Scene {
    constructor() { super("Homestead"); this.hotspots = new Map(); }
    create() {
      const { width, height } = this.scale;
      const g = this.add.graphics();
      g.fillGradientStyle(0x72875a, 0x72875a, 0xb9a878, 0xb9a878, 1);
      g.fillRect(0, 0, width, height);
      g.fillStyle(0xe4c98c, 1); g.fillCircle(width * .86, height * .18, 25);
      g.fillStyle(0x536d43, 1); g.fillEllipse(width * .5, height * .92, width * 1.2, height * .48);
      g.fillStyle(0x344c31, 1); g.fillEllipse(width * .02, height * 1.04, width * .55, height * .5);
      g.fillEllipse(width * 1.02, height * 1.04, width * .58, height * .5);

      // Дом — временная Canvas-заглушка до появления иллюстраций.
      g.fillStyle(0x493526, 1); g.fillRect(width*.415,height*.38,width*.17,height*.39);
      g.fillStyle(0x906b43, 1); g.fillTriangle(width*.39,height*.4,width*.5,height*.13,width*.61,height*.4);
      g.fillStyle(0xd7bd83, 1); g.fillRect(width*.44,height*.49,width*.04,height*.07); g.fillRect(width*.52,height*.49,width*.04,height*.07);
      g.fillStyle(0x30271f, 1); g.fillRect(width*.48,height*.62,width*.04,height*.15);

      // Грядки.
      for (let i=0;i<3;i++) {
        g.fillStyle(0x76553a,1); g.fillRoundedRect(width*(.055+i*.015),height*(.65+i*.09),width*.2,height*.055,8);
        for(let j=0;j<5;j++){g.fillStyle(0x91a45b,1);g.fillCircle(width*(.075+i*.015+j*.036),height*(.675+i*.09),5);}
      }
      // Кроны сада.
      for (const [x,y] of [[.76,.39],[.88,.42],[.94,.56]]) {
        g.fillStyle(0x4c683c,1);g.fillCircle(width*x,height*y,24);
        g.fillStyle(0x76513a,1);g.fillRect(width*x-4,height*y+12,8,24);
        g.fillStyle(0xb78a48,1);g.fillCircle(width*(x-.025),height*(y-.025),4);
      }
      // Сарай.
      g.fillStyle(0x694a32,1);g.fillRect(width*.69,height*.68,width*.16,height*.22);
      g.fillStyle(0x9a7046,1);g.fillTriangle(width*.67,height*.69,width*.77,height*.53,width*.87,height*.69);
      g.fillStyle(0x30271f,1);g.fillRect(width*.745,height*.76,width*.05,height*.14);

      this.add.text(width/2, 12, "ВЫБЕРИ МЕСТО НА УСАДЬБЕ", {
        fontFamily:"Arial,sans-serif",fontSize:"12px",fontStyle:"bold",color:"#fff0ce",
        backgroundColor:"#1b211acc",padding:{x:10,y:5}
      }).setOrigin(.5,0);

      for (const location of SCENE_LOCATIONS) {
        const x=width*location.x,y=height*location.y;
        const zone=this.add.zone(x,y,width*location.w,height*location.h).setInteractive({useHandCursor:true});
        const label=this.add.text(x,y+height*location.h*.52,location.label,{
          fontFamily:"Georgia,serif",fontSize:"14px",fontStyle:"bold",color:"#fff4d8",
          backgroundColor:"#1b211dcc",padding:{x:8,y:5},align:"center"
        }).setOrigin(.5);
        label.setDepth(5);
        zone.on("pointerover",()=>{label.setScale(1.08);this.game.canvas.style.cursor="pointer";});
        zone.on("pointerout",()=>{label.setScale(1);this.game.canvas.style.cursor="default";});
        zone.on("pointerdown",()=>this.openLocation(location.id));
        this.hotspots.set(location.id,{zone,label});
      }
      this.scale.on("resize",()=>this.scene.restart());
      window.addEventListener("samosgon:tab-change",this.handleTabChange=(event)=>this.markActive(event.detail));
      this.markActive("home");
      this.add.text(width/2,height-10,"Сгенерировать при доступности лимита",{
        fontFamily:"Arial,sans-serif",fontSize:"11px",color:"#f5dba5",
        backgroundColor:"#1b211dcc",padding:{x:8,y:4}
      }).setOrigin(.5,1);
    }
    openLocation(id) {
      const button=document.querySelector('[data-tab="'+id+'"]');
      if(button)button.click();
    }
    markActive(tab) {
      for(const [id,item] of this.hotspots) {
        const active=id===tab;
        item.label.setStyle({backgroundColor:active?"#8b6835":"#1b211dcc",color:"#fff4d8"});
        item.label.setScale(active?1.08:1);
      }
    }
  }

  new window.Phaser.Game({
    type:window.Phaser.AUTO,parent:mount,width:960,height:260,
    backgroundColor:"#20231c",
    scale:{mode:window.Phaser.Scale.FIT,autoCenter:window.Phaser.Scale.CENTER_BOTH},
    render:{antialias:true,pixelArt:false},
    scene:[HomesteadScene]
  });
}

export function initGamePresentation() {
  const nav=document.querySelector(".navigation");
  if(nav)arrangeNavigation(nav);
  startPhaserScene();
}
