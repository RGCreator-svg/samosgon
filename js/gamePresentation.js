const GROUPS = [
  { id: "homestead", title: "Усадьба", tabs: ["home", "farm", "orchard", "barn"] },
  { id: "trade", title: "Хозяйство", tabs: ["market", "skills", "notebook"] },
  { id: "production", title: "Производство", tabs: ["productionHub", "productionPlant", "featurePack", "viticulture", "cellar"] },
  { id: "research", title: "Развитие", tabs: ["researchLab", "processCenter"] }
];
const LABELS = {
  home: "🏚 Дом", farm: "🥕 Огород", orchard: "🍎 Сад", barn: "🛠 Сарай",
  market: "🧺 Рынок", skills: "🌳 Умения", notebook: "📖 Записки",
  productionHub: "📋 Диспетчер", productionPlant: "🏭 Цех", featurePack: "⚗️ Винокурня",
  viticulture: "🍇 Винодельня", cellar: "🪵 Погреб", researchLab: "🧪 Лаборатория",
  processCenter: "🧰 Техцентр"
};

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
  const scene = {
    create() {
      const { width, height } = this.scale;
      const graphics = this.add.graphics();
      graphics.fillGradientStyle(0x687b50, 0x687b50, 0xb6a878, 0xb6a878, 1);
      graphics.fillRect(0, 0, width, height);
      graphics.fillStyle(0x3f5936, 1);
      graphics.fillEllipse(width * .5, height * .92, width * 1.15, height * .52);
      graphics.fillStyle(0x263b29, 1);
      graphics.fillEllipse(width * .08, height * 1.03, width * .65, height * .5);
      graphics.fillEllipse(width * .95, height * 1.02, width * .55, height * .48);
      graphics.fillStyle(0x4a3828, 1);
      graphics.fillRect(width * .42, height * .42, width * .18, height * .38);
      graphics.fillStyle(0x806344, 1);
      graphics.fillTriangle(width * .39, height * .44, width * .51, height * .18, width * .64, height * .44);
      graphics.fillStyle(0xd7bd83, 1);
      graphics.fillCircle(width * .83, height * .2, 22);
      this.add.text(width / 2, height * .78, "Здесь появится иллюстрация вашей усадьбы", {
        fontFamily: "Georgia, serif", fontSize: "16px", color: "#fff1cf",
        backgroundColor: "#171914bb", padding: { x: 12, y: 7 }
      }).setOrigin(.5);
      this.add.text(width / 2, height * .91, "Сгенерировать при доступности лимита", {
        fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#f0d9a5"
      }).setOrigin(.5);
    }
  };
  new window.Phaser.Game({
    type: window.Phaser.AUTO,
    parent: mount,
    width: 960,
    height: 260,
    backgroundColor: "#20231c",
    scale: { mode: window.Phaser.Scale.FIT, autoCenter: window.Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, pixelArt: false },
    scene: [scene]
  });
}

export function initGamePresentation() {
  const nav = document.querySelector(".navigation");
  if (nav) arrangeNavigation(nav);
  startPhaserScene();
}
