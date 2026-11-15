
import { ITEMS, SKILL_BRANCHES } from "./data.js";
import { getStorageCapacity } from "./economy.js";

const $ = (selector) => document.querySelector(selector);

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

function setBar(selector, value) {
  const element = $(selector);
  if (element) {
    element.style.width = `${Math.max(0, Math.min(100, value))}%`;
  }
}

export function renderHUD(state) {
  setText("#day", state.day);
  setText("#money", state.money);
  setText("#level", state.level);
}

export function renderNeeds(state) {
  setText("#hungerValue", state.hunger);
  setText("#energyValue", state.energy);
  setText("#warmthValue", state.warmth);

  setBar("#hungerBar", state.hunger);
  setBar("#energyBar", state.energy);
  setBar("#warmthBar", state.warmth);
}

export function renderXP(state) {
  const xpNeeded = 100;
  const currentXP = Math.max(0, Number(state.xp) || 0);
  const progress = (currentXP / xpNeeded) * 100;

  setText("#xpValue", currentXP);
  setText("#xpNext", xpNeeded);
  setBar("#xpBar", progress);
}

export function renderWarehouse(state) {
  const warehouse = $("#warehouseItems");
  if (!warehouse) return;

  warehouse.innerHTML = "";

  let total = 0;

  ITEMS.forEach((item) => {
    const quantity = Math.max(
      0,
      Number(state.inventory?.[item.id]) || 0
    );

    total += quantity;

    const card = document.createElement("div");
    card.className = "warehouse-item";

    const icon = document.createElement("span");
    icon.className = "warehouse-icon";
    icon.textContent = item.emoji;

    const name = document.createElement("span");
    name.className = "warehouse-name";
    name.textContent = item.name;

    const count = document.createElement("b");
    count.className = "warehouse-count";
    count.textContent = `${quantity} шт.`;

    card.append(icon, name, count);
    warehouse.appendChild(card);
  });

  setText("#warehouseTotal", `${total} / ${getStorageCapacity(state)}`);
}

export function renderProduction(state) {
  const status = $("#productionStatus");

  if (status) {
    if (state.production.ready) {
      status.textContent =
        "Брага готова! Бочка подозрительно булькает.";
    } else if (state.production.active) {
      status.textContent =
        `Идёт брожение. Осталось дней: ${state.production.daysLeft}.`;
    } else {
      status.textContent = "Пока ничего не бродит. Даже настроение.";
    }
  }

  const start = $("#startBatch");
  const collect = $("#collectBatch");

  if (start) {
    start.disabled =
      !state.skills.includes("ferment") ||
      state.production.active ||
      state.production.ready ||
      state.money < 10 ||
      state.energy < 10;
  }

  if (collect) {
    collect.disabled = !state.production.ready;
  }
}

export function renderMarket(state) {
  const market = $("#marketItems");
  const inventory = $("#inventory");

  if (!market || !inventory) return;

  market.innerHTML = "";

  ITEMS.forEach((item) => {
    const quantity = state.inventory[item.id] || 0;

    const card = document.createElement("div");
    card.className = "market-item";

    const heading = document.createElement("h3");
    heading.textContent = `${item.emoji} ${item.name}`;

    const description = document.createElement("p");
    description.textContent = item.description;

    const stock = document.createElement("p");
    stock.textContent = `В запасе: ${quantity}`;

    const price = document.createElement("p");
    const multiplier = state.skills.includes("bargain") ? 1.2 : 1;
    const salePrice = Math.round(item.price * multiplier);
    price.textContent = `Цена: ${salePrice} монет за штуку`;

    const button = document.createElement("button");
    button.textContent = "Продать 1";
    button.disabled = quantity <= 0;
    button.dataset.sell = item.id;

    card.append(heading, description, stock, price, button);
    market.appendChild(card);
  });

  inventory.textContent = ITEMS
    .map(item => `${item.emoji} ${item.name}: ${state.inventory[item.id] || 0}`)
    .join("  |  ");
}

export function renderSkills(state) {
  const tree = $("#skillTree");
  if (!tree) return;
  setText("#skillPoints", state.skillPoints);
  tree.replaceChildren();

  const width = 1120;
  const height = 760;
  const cx = 560;
  const cy = 380;
  const angles = [-155, -105, -55, 15, 75, 145];
  const colors = ["#b7d7a2", "#d6bd83", "#a9c8dc", "#d7a3a3", "#c2b0dc", "#d2a879"];
  const icons = ["🌱", "🫙", "⚙️", "🤖", "🪙", "🔥"];
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "skill-map-lines");
  svg.setAttribute("aria-hidden", "true");

  const hub = document.createElementNS(svgNS, "circle");
  hub.setAttribute("cx", cx); hub.setAttribute("cy", cy); hub.setAttribute("r", "58");
  hub.setAttribute("class", "skill-hub-ring");
  svg.append(hub);

  const layer = document.createElement("div");
  layer.className = "skill-map-nodes";
  const allSkills = SKILL_BRANCHES.flatMap(branch => branch.skills);

  SKILL_BRANCHES.forEach((branch, branchIndex) => {
    const angle = angles[branchIndex] * Math.PI / 180;
    const branchColor = colors[branchIndex];
    let previous = { x: cx, y: cy };
    branch.skills.forEach((skill, index) => {
      const radius = 145 + index * 112;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const path = document.createElementNS(svgNS, "path");
      const mx = (previous.x + x) / 2;
      const my = (previous.y + y) / 2;
      path.setAttribute("d", `M ${previous.x} ${previous.y} Q ${mx + (branchIndex - 2) * 12} ${my - 12} ${x} ${y}`);
      path.setAttribute("class", "skill-link");
      path.setAttribute("stroke", branchColor);
      svg.append(path);

      const ring = document.createElementNS(svgNS, "circle");
      ring.setAttribute("cx", x); ring.setAttribute("cy", y);
      ring.setAttribute("r", "48"); ring.setAttribute("class", "skill-node-halo");
      svg.append(ring);

      const unlocked = state.skills.includes(skill.id);
      const available = !skill.requires || state.skills.includes(skill.requires);
      const requiredSkill = allSkills.find(item => item.id === skill.requires);
      const node = document.createElement("button");
      node.type = "button";
      node.className = `skill-orbit-node${unlocked ? " unlocked" : ""}${!available ? " locked" : ""}`;
      node.dataset.skill = skill.id;
      node.disabled = unlocked || !available || state.skillPoints < skill.cost;
      node.style.left = `${x / width * 100}%`;
      node.style.top = `${y / height * 100}%`;
      node.style.setProperty("--branch-color", branchColor);
      node.title = `${skill.name}. ${skill.description} ${unlocked ? "Изучено" : skill.requires && !available ? "Требуется: " + (requiredSkill?.name || skill.requires) : "Стоимость: " + skill.cost + " очков"}`;
      node.innerHTML = `<span class="skill-orbit-icon">${unlocked ? "✓" : icons[branchIndex]}</span><span class="skill-orbit-label"></span>`;
      node.querySelector(".skill-orbit-label").textContent = skill.name;
      layer.append(node);
      previous = { x, y };
    });

    const label = document.createElement("div");
    label.className = "skill-branch-label";
    label.textContent = branch.name;
    label.style.left = `${(cx + Math.cos(angle) * 365) / width * 100}%`;
    label.style.top = `${(cy + Math.sin(angle) * 365) / height * 100}%`;
    label.style.setProperty("--branch-color", branchColor);
    layer.append(label);
  });

  tree.append(svg, layer);
}

export function renderWorld(state) {
  setText("#houseValue", state.house);
  setText("#barnValue", state.barn);
  setText("#stillValue", state.still);
  setText("#gardenValue", state.garden);
  setText("#orchardValue", state.orchardRestored ? 100 : 0);
  setText("#treeCount", state.trees);

  setText(
    "#homeDescription",
    state.house >= 70
      ? "Дом почти уютный. Осталось выгнать сквозняк и пару мышей."
      : "Крыша местами есть. В дождь можно выбирать, где именно стоять."
  );

  setText(
    "#barnDescription",
    state.barn >= 70
      ? "Сарай держится молодцом. В отличие от его владельца."
      : "Внутри пахнет сеном, ржавчиной и решениями, о которых жалеют."
  );

  setText(
    "#orchardDescription",
    state.orchardRestored
      ? "Сад ожил! Яблони и груши снова дают урожай."
      : "Заросли такие, что даже крапива просит карту местности."
  );

  const restore = $("#restoreOrchard");

  if (restore) {
    restore.disabled = state.orchardRestored || state.money < 40;
    restore.textContent = state.orchardRestored
      ? "Сад восстановлен"
      : "Расчистить сад — 40 монет";
  }

  const harvestFruit = $("#harvestFruit");

  if (harvestFruit) {
    harvestFruit.disabled =
      !state.orchardRestored || state.energy < 5;
  }

  const harvestVegetables = $("#harvestVegetables");

  if (harvestVegetables) {
    harvestVegetables.disabled =
      state.energy < 5 || state.garden < 20;
  }
}

export function renderAll(state) {
  renderHUD(state);
  renderNeeds(state);
  renderXP(state);
  renderWarehouse(state);
  renderProduction(state);
  renderMarket(state);
  renderSkills(state);
  renderWorld(state);
}
