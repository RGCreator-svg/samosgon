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
  { id: "home", label: "Бабушкин дом", x: .5, y: .52, w: .22, h: .56 },
  { id: "farm", label: "Огород", x: .16, y: .73, w: .22, h: .24 },
  { id: "orchard", label: "Сад", x: .83, y: .48, w: .2, h: .48 },
  { id: "barn", label: "Сарай", x: .77, y: .78, w: .2, h: .28 }
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
    constructor() {
      super("Homestead");
      this.hotspots = new Map();
      this.moveSpeed = 230;
      this.playerTarget = null;
    }

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

      // Условный герой — графический спрайт без внешних изображений.
      this.player = this.add.container(width*.34,height*.84).setDepth(9);
      const avatar = this.add.graphics();
      avatar.fillStyle(0x263b32,1); avatar.fillEllipse(0,17,25,8);
      avatar.fillStyle(0x4b6680,1); avatar.fillRoundedRect(-8,-2,16,20,5);
      avatar.fillStyle(0xe6b98b,1); avatar.fillCircle(0,-10,7);
      avatar.fillStyle(0x5b3e2d,1); avatar.fillEllipse(0,-16,15,7);
      avatar.fillStyle(0xead8b8,1); avatar.fillRect(-6,15,5,7); avatar.fillRect(2,15,5,7);
      this.player.add(avatar);
      this.playerLabel=this.add.text(0,27,"Вы",{
        fontFamily:"Arial,sans-serif",fontSize:"10px",fontStyle:"bold",color:"#fff",
        backgroundColor:"#263b32dd",padding:{x:4,y:2}
      }).setOrigin(.5,0);
      this.player.add(this.playerLabel);

      this.controls=this.add.text(12,height-12,"Клик по земле — идти  ·  WASD / стрелки — движение",{
        fontFamily:"Arial,sans-serif",fontSize:"11px",color:"#fff4d8",
        backgroundColor:"#1b211dcc",padding:{x:7,y:4}
      }).setOrigin(0,1).setDepth(20);

      this.input.on("pointerdown",(pointer,over)=> {
        if (over?.length) return;
        this.movePlayerTo(pointer.worldX,pointer.worldY);
      });

      if (this.input.keyboard) {
        this.keys=this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT");
      }
      this.handleTabChange=(event)=>this.markActive(event.detail);
      window.addEventListener("samosgon:tab-change",this.handleTabChange);
      this.events.once("shutdown",()=>{
        window.removeEventListener("samosgon:tab-change",this.handleTabChange);
        this.scale.off("resize",this.handleResize,this);
      });
      this.handleResize=()=>this.scene.restart();
      this.scale.on("resize",this.handleResize,this);
      this.markActive("home");

      this.add.text(width/2,height-10,"Сгенерировать при доступности лимита",{
        fontFamily:"Arial,sans-serif",fontSize:"11px",color:"#f5dba5",
        backgroundColor:"#1b211dcc",padding:{x:8,y:4}
      }).setOrigin(.5,1).setDepth(21);
    }

    movePlayerTo(x,y) {
      const {width,height}=this.scale;
      const targetX=window.Phaser.Math.Clamp(x,22,width-22);
      const targetY=window.Phaser.Math.Clamp(y,height*.48,height-34);
      this.tweens.killTweensOf(this.player);
      const distance=window.Phaser.Math.Distance.Between(this.player.x,this.player.y,targetX,targetY);
      this.tweens.add({
        targets:this.player,x:targetX,y:targetY,
        duration:Math.max(180,distance/this.moveSpeed*1000),
        ease:"Sine.easeInOut"
      });
    }

    update(_time,delta) {
      if(!this.keys||!this.player)return;
      const dx=(this.keys.D.isDown||this.keys.RIGHT.isDown?1:0)-(this.keys.A.isDown||this.keys.LEFT.isDown?1:0);
      const dy=(this.keys.S.isDown||this.keys.DOWN.isDown?1:0)-(this.keys.W.isDown||this.keys.UP.isDown?1:0);
      if(!dx&&!dy)return;
      this.tweens.killTweensOf(this.player);
      const length=Math.hypot(dx,dy)||1;
      const {width,height}=this.scale;
      this.player.x=window.Phaser.Math.Clamp(this.player.x+dx/length*this.moveSpeed*delta/1000,22,width-22);
      this.player.y=window.Phaser.Math.Clamp(this.player.y+dy/length*this.moveSpeed*delta/1000,height*.48,height-34);
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
