import { consumeQualityLots } from "./quality.js";
export const BUILDINGS = [
  {
    id: "warehouse",
    name: "Склад",
    emoji: "📦",
    description: "Увеличивает вместимость хозяйственных запасов.",
    levels: [
      { cost: 180, parts: { timber: 4, fasteners: 2 }, capacity: 80 },
      { cost: 420, parts: { timber: 8, metal: 4, fasteners: 4 }, capacity: 180 },
      { cost: 900, parts: { timber: 12, metal: 8, fasteners: 8 }, capacity: 350 }
    ]
  },
  {
    id: "workshop",
    name: "Мастерская",
    emoji: "🛠️",
    description: "Открывает доступ к более сложным улучшениям оборудования.",
    levels: [
      { cost: 250, parts: { timber: 5, metal: 3, tools: 1 } },
      { cost: 600, parts: { timber: 8, metal: 8, tools: 2 } },
      { cost: 1200, parts: { metal: 12, tools: 4, controller: 1 } }
    ]
  },
  {
    id: "production",
    name: "Производственный цех",
    emoji: "🏭",
    description: "Расширяет производственные возможности хозяйства.",
    levels: [
      { cost: 400, parts: { timber: 6, metal: 5, fasteners: 3 }, slots: 2 },
      { cost: 900, parts: { timber: 10, metal: 10, pump: 1 }, slots: 3 },
      { cost: 1800, parts: { metal: 16, pump: 2, controller: 1 }, slots: 5 }
    ]
  },
  {
    id: "laboratory",
    name: "Лаборатория",
    emoji: "🧪",
    description: "Исследовательская площадка для будущих технологических веток.",
    levels: [
      { cost: 650, parts: { timber: 5, metal: 6, tools: 2, controller: 1 } },
      { cost: 1400, parts: { metal: 12, tools: 3, controller: 2 } }
    ]
  }
];

export const PARTS = [
  { id: "timber", name: "Пиломатериалы", emoji: "🪵", price: 18, delivery: 1, description: "Для ремонта и расширения построек." },
  { id: "metal", name: "Металлические заготовки", emoji: "🔩", price: 35, delivery: 2, description: "Универсальный строительный материал." },
  { id: "fasteners", name: "Крепёж", emoji: "🧷", price: 12, delivery: 1, description: "Мелочь, без которой всё разваливается." },
  { id: "tools", name: "Набор инструментов", emoji: "🧰", price: 90, delivery: 2, description: "Для игровой мастерской и ремонта." },
  { id: "pump", name: "Насосный модуль", emoji: "⚙️", price: 160, delivery: 3, description: "Комплектующий модуль для будущих производственных улучшений." },
  { id: "controller", name: "Контроллер автоматики", emoji: "🎛️", price: 240, delivery: 3, description: "Основа будущей автоматизации хозяйства." }
];

const $ = (selector) => document.querySelector(selector);

export function getStorageCapacity(state) {
  const level = Math.max(0, Math.min(3, Number(state.buildings?.warehouse) || 0));
  return [30, 80, 180, 350][level];
}

export function getInventoryCount(state, itemId) {
  return Math.max(0, Math.floor(Number(state.inventory?.[itemId]) || 0));
}

export function addInventory(state, itemId, amount) {
  if (!itemId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return 0;
  state.inventory ??= {};
  const currentTotal = Object.values(state.inventory).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const free = Math.max(0, getStorageCapacity(state) - currentTotal);
  const accepted = Math.max(0, Math.min(Math.floor(Number(amount)), free));
  state.inventory[itemId] = getInventoryCount(state, itemId) + accepted;
  return accepted;
}

export function removeInventory(state, itemId, amount = 1, options = {}) {
  const requested = Math.max(0, Math.floor(Number(amount) || 0));
  if (!itemId || requested === 0) return 0;
  state.inventory ??= {};
  const removed = Math.min(requested, getInventoryCount(state, itemId));
  if (!removed) return 0;
  if (options.consumeQuality !== false) consumeQualityLots(state, itemId, removed);
  state.inventory[itemId] = getInventoryCount(state, itemId) - removed;
  return removed;
}

export function hasInventory(state, requirements = {}) {
  return Object.entries(requirements).every(([id, amount]) => getInventoryCount(state, id) >= Math.max(0, Number(amount) || 0));
}

function ensureState(state) {
  state.buildings ??= {};
  for (const building of BUILDINGS) state.buildings[building.id] ??= 0;
  state.parts ??= {};
  for (const part of PARTS) state.parts[part.id] ??= 0;
  state.deliveries ??= [];
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function addCard(parent, title, description, details, buttonText, action, disabled) {
  const card = element("article", "economy-card");
  card.append(element("h3", "", title), element("p", "", description));
  details.forEach(line => card.append(element("p", "economy-detail", line)));
  const button = element("button", "", buttonText);
  button.dataset.economyAction = action;
  button.disabled = disabled;
  card.append(button);
  parent.append(card);
  return card;
}

const CART_HANDLERS = new Map();
export function registerCartHandler(kind, handler) { CART_HANDLERS.set(kind, handler); }
export function queuePurchase(state, purchase) {
  state.purchaseCart ??= [];
  const item = state.purchaseCart.find(entry => entry.key === purchase.key);
  if (item) { if (purchase.stackable) item.quantity += Math.max(1, Number(purchase.quantity) || 1); }
  else state.purchaseCart.push({ ...purchase, quantity: Math.max(1, Number(purchase.quantity) || 1) });
  if (purchase.parts) queueMaterials(state, purchase.parts, true);
  renderMaterialCart(state);
}

function cartTotals(state) {
  const purchases = state.purchaseCart || [];
  const parts = {};
  const inventory = {};
  const incoming = {};
  purchases.forEach(item => {
    Object.entries(item.parts || {}).forEach(([id, qty]) => { parts[id] = (parts[id] || 0) + qty * item.quantity; });
    Object.entries(item.consume || {}).forEach(([id, qty]) => { inventory[id] = (inventory[id] || 0) + qty * item.quantity; });
    Object.entries(item.output || {}).forEach(([id, qty]) => { incoming[id] = (incoming[id] || 0) + qty * item.quantity; });
  });
  const goodsCost = purchases.reduce((sum, item) => sum + item.cost * item.quantity, 0);
  const partsCost = Object.entries(state.materialCart || {}).reduce((sum, [id, qty]) => sum + (PARTS.find(part => part.id === id)?.price || 0) * qty, 0);
  return { purchases, parts, inventory, incoming, money: goodsCost + partsCost };
}
export function queuePart(state, id, quantity = 1) {
  if (!PARTS.some(part => part.id === id)) return;
  state.materialCart ??= {};
  state.materialCart[id] = Math.max(0, Number(state.materialCart[id]) || 0) + Math.max(1, Math.floor(Number(quantity) || 1));
  renderMaterialCart(state);
}

export function queueMaterials(state, requirements, purchaseAlreadyQueued = false) {
  state.materialCart ??= {};
  const committed = {};
  (state.purchaseCart || []).forEach(item => Object.entries(item.parts || {}).forEach(([id, qty]) => { committed[id] = (committed[id] || 0) + qty * item.quantity; }));
  const targets = { ...committed };
  Object.entries(requirements || {}).forEach(([id, qty]) => { targets[id] = (targets[id] || 0) + (purchaseAlreadyQueued ? 0 : Math.floor(Number(qty) || 0)); });
  const added = {};
  Object.entries(targets).forEach(([id, required]) => {
    if (!PARTS.some(part => part.id === id)) return;
    const missing = Math.max(0, required - (Number(state.parts[id]) || 0) - (Number(state.materialCart[id]) || 0));
    if (missing) { state.materialCart[id] = (Number(state.materialCart[id]) || 0) + missing; added[id] = missing; }
  });
  renderMaterialCart(state);
  return added;
}

function renderMaterialCart(state) {
  const root = $("#materialCart");
  if (!root) return;
  root.replaceChildren();
  state.materialCart ??= {};
  state.purchaseCart ??= [];
  const totals = cartTotals(state);
  const entries = Object.entries(state.materialCart).filter(([id, qty]) => PARTS.some(part => part.id === id) && Number(qty) > 0);
  if (!entries.length && !totals.purchases.length) {
    root.append(element("p", "economy-empty", "Корзина пока пуста. Добавляйте товары и улучшения из разных вкладок."));
    return;
  }
  totals.purchases.forEach(item => {
    const row = element("div", "material-cart-row");
    row.append(element("div", "material-cart-info", item.name + " × " + item.quantity + " · " + (item.cost * item.quantity) + " монет"));
    const controls = element("div", "material-cart-controls");
    if (item.stackable) {
      const minus = element("button", "", "−"); minus.dataset.economyAction = "purchaseDec:" + item.key;
      const plus = element("button", "", "+"); plus.dataset.economyAction = "purchaseInc:" + item.key;
      controls.append(minus, plus);
    }
    const remove = element("button", "cart-remove", "Убрать"); remove.dataset.economyAction = "purchaseRemove:" + item.key;
    controls.append(remove); row.append(controls); root.append(row);
  });
  entries.forEach(([id, quantity]) => {
    const part = PARTS.find(item => item.id === id);
    const row = element("div", "material-cart-row");
    const info = element("div", "material-cart-info");
    info.append(element("b", "", `${part.emoji} ${part.name}`), element("small", "", `${part.price} монет за шт. · ${part.price * quantity} монет`));
    const controls = element("div", "material-cart-controls");
    const minus = element("button", "", "−"); minus.dataset.economyAction = `dec:${id}`; minus.setAttribute("aria-label", `Уменьшить ${part.name}`);
    const count = element("b", "material-cart-quantity", String(quantity));
    const plus = element("button", "", "+"); plus.dataset.economyAction = `inc:${id}`; plus.setAttribute("aria-label", `Увеличить ${part.name}`);
    const remove = element("button", "cart-remove", "Убрать"); remove.dataset.economyAction = `remove:${id}`;
    controls.append(minus, count, plus, remove); row.append(info, controls); root.append(row);
  });
  const total = totals.money;
  const footer = element("div", "material-cart-footer");
  footer.append(element("b", "", `Итого: ${total} монет`));
  const pay = element("button", "primary-button", "Оплатить корзину");
  pay.dataset.economyAction = "pay";
  const missingParts = Object.entries(totals.parts).some(([id, qty]) => (Number(state.parts[id]) || 0) + (Number(state.materialCart[id]) || 0) < qty);
  const missingGoods = Object.entries(totals.inventory).some(([id, qty]) => (Number(state.inventory[id]) || 0) + (Number(totals.incoming[id]) || 0) < qty);
  pay.disabled = (Number(state.money) || 0) < total || missingParts || missingGoods;
  const clear = element("button", "", "Очистить"); clear.dataset.economyAction = "clear";
  footer.append(pay, clear);
  if ((Number(state.money) || 0) < total) footer.append(element("small", "cart-warning", `Не хватает ${total - (Number(state.money) || 0)} монет.`));
  if (missingParts) footer.append(element("small", "cart-warning", "Не хватает комплектующих на складе. Добавьте нужные позиции в корзину."));
  if (missingGoods) footer.append(element("small", "cart-warning", "Не хватает производственного сырья. Его можно заказать у поставщика в соответствующей вкладке."));
  root.append(footer);
}

export function renderEconomy(state) {
  const buildingsRoot = $("#buildingCards");
  const partsRoot = $("#partsCatalog");
  const stockRoot = $("#partsStock");
  const deliveriesRoot = $("#partsDeliveries");
  if (!buildingsRoot || !partsRoot || !stockRoot || !deliveriesRoot) return;

  buildingsRoot.replaceChildren();
  partsRoot.replaceChildren();
  stockRoot.replaceChildren();
  deliveriesRoot.replaceChildren();
  state.materialCart ??= {};
  state.purchaseCart ??= [];

  BUILDINGS.forEach(building => {
    const level = state.buildings[building.id] || 0;
    const next = building.levels[level];
    const lines = [`Уровень: ${level}/${building.levels.length}`];
    if (next) {
      lines.push(`Стоимость: ${next.cost} монет`);
      lines.push("Детали: " + Object.entries(next.parts).map(([id, qty]) => `${PARTS.find(p => p.id === id)?.name || id} × ${qty}`).join(", "));
      if (next.capacity) lines.push(`Вместимость после улучшения: ${next.capacity} единиц (сейчас: ${getStorageCapacity(state)})`);
      if (next.slots) lines.push(`Производственные места: ${next.slots}`);
    } else {
      lines.push("Максимальный уровень достигнут.");
    }
    const buildingCard = addCard(buildingsRoot, `${building.emoji} ${building.name}`, building.description, lines,
      next ? "Добавить улучшение в общую корзину" : "Максимальный уровень",
      `queueBuild:${building.id}`,
      !next
    );
    if (next) {
      const detail = [...buildingCard.querySelectorAll(".economy-detail")].find(node => node.textContent.startsWith("Детали:"));
      if (detail) {
        const row = element("div", "building-material-action");
        detail.replaceWith(row); row.append(detail);
        const missing = Object.entries(next.parts).reduce((sum, [partId, qty]) => sum + Math.max(0, qty - (Number(state.parts[partId]) || 0) - (Number(state.materialCart[partId]) || 0)), 0);
        const add = element("button", "", missing ? "Добавить необходимые материалы в корзину" : "Материалы уже учтены");
        add.dataset.economyAction = `add:${building.id}`; add.disabled = missing === 0;
        row.append(add);
      }
    }
  });

  PARTS.forEach(part => {
    const related = state.deliveries.filter(item => item.partId === part.id);
    const ordered = related.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const arrived = related
      .filter(item => item.arrivalDay <= state.day)
      .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const lines = [
      `Цена: ${part.price} монет за единицу`,
      `Доставка: ${part.delivery} игровых дня`,
      `Заказано: ${ordered} шт.`,
      `Уже доставлено: ${arrived} шт.`
    ];
    const card = element("article", "economy-card");
    card.append(element("h3", "", `${part.emoji} ${part.name}`), element("p", "", part.description));
    lines.forEach(line => card.append(element("p", "economy-detail", line)));
    const cartButton = element("button", "", "Добавить 1 шт. в общую корзину");
    cartButton.dataset.economyAction = `cartOrder:${part.id}`;
    card.append(cartButton);
    const orderButton = element("button", "", "Добавить доставку в общую корзину");
    orderButton.dataset.economyAction = `order:${part.id}`;
    orderButton.disabled = false;
    card.append(orderButton);
    if (arrived > 0) {
      const collectButton = element("button", "collect-all-button", `Забрать всё доставленное (${arrived})`);
      collectButton.dataset.economyAction = `collectAll:${part.id}`;
      card.append(collectButton);
    }
    partsRoot.append(card);
  });

  renderMaterialCart(state);

  PARTS.forEach(part => {
    const row = element("div", "parts-stock-row");
    row.append(element("span", "", `${part.emoji} ${part.name}`), element("b", "", `${state.parts[part.id] || 0} шт.`));
    stockRoot.append(row);
  });

  if (!state.deliveries.length) {
    deliveriesRoot.append(element("p", "economy-empty", "Посылок пока нет. Почтальон отдыхает, как и положено."));
  } else {
    const grouped = new Map();
    state.deliveries.forEach(delivery => {
      const group = grouped.get(delivery.partId) || {
        partId: delivery.partId,
        name: delivery.name,
        quantity: 0,
        arrived: 0,
        pending: 0,
        nextArrival: Infinity
      };
      const quantity = Math.max(0, Number(delivery.quantity) || 0);
      group.quantity += quantity;
      if (delivery.arrivalDay <= state.day) group.arrived += quantity;
      else {
        group.pending += quantity;
        group.nextArrival = Math.min(group.nextArrival, delivery.arrivalDay);
      }
      grouped.set(delivery.partId, group);
    });

    grouped.forEach(group => {
      const row = element("div", "delivery-row");
      const left = element("div", "delivery-summary");
      left.append(
        element("b", "", group.name),
        element("span", "", `Всего в заказе: ${group.quantity} шт.`),
        element("small", "", group.pending
          ? `Доставлено: ${group.arrived} · В пути: ${group.pending}`
          : "Весь заказ прибыл")
      );
      row.append(left);
      if (group.pending) {
        row.append(element("b", "", `Следующая доставка: день ${group.nextArrival}`));
      } else {
        row.append(element("b", "", "Прибыло"));
      }
      if (group.arrived > 0) {
        const button = element("button", "collect-all-button", `Забрать всё (${group.arrived})`);
        button.dataset.economyAction = `collectAll:${group.partId}`;
        row.append(button);
      }
      deliveriesRoot.append(row);
    });
  }
}

export function initEconomy(state, { render, notify }) {
  ensureState(state);
  const nav = $(".navigation");
  const game = $("#game");
  if (!nav || !game) return;

  if (!$("#sharedPurchaseCart")) {
    const cartSection = element("section", "panel shared-purchase-cart");
    cartSection.id = "sharedPurchaseCart";
    cartSection.append(element("h2", "", "🛒 Единая корзина закупок"), element("p", "economy-detail", "Здесь объединяются товары, сырьё, комплектующие, строительство, услуги и технологические улучшения из всех вкладок. Одинаковые позиции суммируются, а недостающие детали автоматически добавляются к заказу."));
    const cartRoot = element("div", "material-cart"); cartRoot.id = "materialCart"; cartSection.append(cartRoot);
    const eventPanel = $("#notifications")?.closest(".event-console");
    if (eventPanel?.parentElement === game) game.insertBefore(cartSection, eventPanel); else game.append(cartSection);
  }

  if (!$("#economy")) {
    const tab = element("button", "", "🏗️ Стройка");
    tab.dataset.tab = "economy";
    nav.append(tab);

    const section = element("section", "tab-content panel hidden");
    section.id = "economy";
    section.innerHTML = `
      <h2>🏗️ Строительство и снабжение</h2>
      <p>Хозяйство растёт. Теперь даже гвозди требуют финансового планирования.</p>
      <h3>Постройки</h3><div id="buildingCards" class="economy-grid"></div>
      
      <h3>Магазин «СельхозТехСнаб»</h3><div id="partsCatalog" class="economy-grid"></div>
      <h3>Мои комплектующие</h3><div id="partsStock" class="parts-stock"></div>
      <h3>Доставка</h3><div id="partsDeliveries" class="parts-stock"></div>`;
    const notifications = $("#notifications")?.closest(".panel");
    if (notifications?.parentElement === game) game.insertBefore(section, notifications);
    else game.append(section);
  }

  nav.addEventListener("click", event => {
    const button = event.target.closest('[data-tab="economy"]');
    if (!button) return;
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.toggle("hidden", tab.id !== "economy"));
    nav.querySelectorAll("[data-tab]").forEach(item => item.classList.toggle("active", item === button));
  });

  registerCartHandler("partDelivery", (current, item) => {
    const part = PARTS.find(entry => entry.id === item.payload?.id);
    if (!part) return;
    current.deliveries.push({ id: "delivery_" + Date.now() + "_" + Math.random().toString(16).slice(2), partId: part.id, name: part.name, quantity: item.quantity, arrivalDay: current.day + part.delivery });
  });

  registerCartHandler("building", (current, item) => {
    const building = BUILDINGS.find(entry => entry.id === item.payload?.id);
    const level = current.buildings[item.payload?.id] || 0;
    if (!building || level !== item.payload?.level || !building.levels[level]) return;
    current.buildings[building.id] = level + item.quantity;
    notify(building.name + " улучшен до уровня " + current.buildings[building.id] + ".");
  });

  $("#economy")?.addEventListener("click", event => {
    const button = event.target.closest("[data-economy-action]");
    if (!button) return;
    const [action, ...idParts] = button.dataset.economyAction.split(":");
    const id = idParts.join(":");

    if (action === "cartOrder") {
      const part = PARTS.find(item => item.id === id);
      if (!part) return;
      queuePart(state, id, 1);
      notify(`${part.name} добавлены в общую корзину. Повторные добавления суммируются.`);
    }

    if (action === "queueBuild") {
      const building = BUILDINGS.find(item => item.id === id);
      const level = state.buildings[id] || 0;
      const upgrade = building?.levels[level];
      if (!upgrade) return;
      queuePurchase(state, { key: "building:" + id + ":" + level, kind: "building", name: building.name + " · уровень " + (level + 1), cost: upgrade.cost, parts: upgrade.parts, payload: { id, level } });
    }

    if (action === "add") {
      const building = BUILDINGS.find(item => item.id === id);
      const upgrade = building?.levels[state.buildings[id] || 0];
      if (!upgrade) return;
      state.materialCart ??= {};
      queueMaterials(state, upgrade.parts);
      notify(`Материалы для «${building.name}» добавлены в корзину.`);
    }

    if (action === "inc" || action === "dec" || action === "remove") {
      state.materialCart ??= {};
      const current = Math.max(0, Number(state.materialCart[id]) || 0);
      if (!PARTS.some(part => part.id === id)) return;
      if (action === "inc") state.materialCart[id] = current + 1;
      if (action === "dec") state.materialCart[id] = Math.max(0, current - 1);
      if (action === "remove" || state.materialCart[id] === 0) delete state.materialCart[id];
    }

    if (action === "clear") { state.materialCart = {}; state.purchaseCart = []; }

    if (action === "purchaseInc" || action === "purchaseDec" || action === "purchaseRemove") {
      const item = (state.purchaseCart || []).find(entry => entry.key === id);
      if (item && item.stackable && action === "purchaseInc") item.quantity += 1;
      if (item && item.stackable && action === "purchaseDec") item.quantity -= 1;
      if (item && (action === "purchaseRemove" || item.quantity <= 0)) state.purchaseCart = state.purchaseCart.filter(entry => entry !== item);
    }

    if (action === "pay") {
      const totals = cartTotals(state);
      const shortages = Object.entries(totals.parts).filter(([partId, qty]) => (Number(state.parts[partId]) || 0) + (Number(state.materialCart[partId]) || 0) < qty);
      const inventoryShortages = Object.entries(totals.inventory).filter(([itemId, qty]) => (Number(state.inventory[itemId]) || 0) + (Number(totals.incoming[itemId]) || 0) < qty);
      if ((!totals.purchases.length && !Object.keys(state.materialCart || {}).length) || (Number(state.money) || 0) < totals.money || shortages.length || inventoryShortages.length) {
        notify("Невозможно оплатить корзину: проверьте деньги и комплектующие.");
        renderEconomy(state); return;
      }
      state.money -= totals.money;
      Object.entries(totals.parts).forEach(([partId, qty]) => { state.parts[partId] = (Number(state.parts[partId]) || 0) - qty; });
      Object.entries(totals.inventory).forEach(([itemId, qty]) => { consumeQualityLots(state,itemId,qty); state.inventory[itemId] = (Number(state.inventory[itemId]) || 0) - qty; });
      Object.entries(state.materialCart || {}).forEach(([partId, qty]) => { state.parts[partId] = (Number(state.parts[partId]) || 0) + qty; });
      const purchases = [...totals.purchases];
      state.materialCart = {};
      state.purchaseCart = [];
      purchases.forEach(item => CART_HANDLERS.get(item.kind)?.(state, item));
      notify("Общая корзина оплачена. Все покупки проведены одним платежом.");
    }

    if (action === "order") {
      const part = PARTS.find(item => item.id === id);
      if (!part) return;
      queuePurchase(state,{key:"delivery:"+id,kind:"partDelivery",name:"Доставка: "+part.name,cost:part.price,payload:{id},stackable:true});
      notify("Заказ на доставку добавлен в общую корзину.");
    }

    if (action === "collectAll") {
      const ready = state.deliveries.filter(item => item.partId === id && item.arrivalDay <= state.day);
      if (!ready.length) return;
      const quantity = ready.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      state.parts[id] = (state.parts[id] || 0) + quantity;
      state.deliveries = state.deliveries.filter(item => !(item.partId === id && item.arrivalDay <= state.day));
      const part = PARTS.find(item => item.id === id);
      notify(`Получено всё доставленное: ${part?.name || id} × ${quantity}.`);
    }

    if (action === "collect") {
      const delivery = state.deliveries.find(item => item.id === id);
      if (!delivery || delivery.arrivalDay > state.day) return;
      state.parts[delivery.partId] = (state.parts[delivery.partId] || 0) + delivery.quantity;
      state.deliveries = state.deliveries.filter(item => item.id !== id);
      notify(`Получена посылка: ${delivery.name} × ${delivery.quantity}.`);
    }

    render();
    renderEconomy(state);
  });

  renderEconomy(state);
}

export function advanceDeliveries(state, notify) {
  ensureState(state);
  const arrived = state.deliveries.filter(item => item.arrivalDay <= state.day && !item.notified);
  if (arrived.length) {
    arrived.forEach(item => { item.notified = true; });
    notify(`Почтальон привёз ${arrived.length} посылок. Сегодня даже почта не подвела.`);
  }
}
