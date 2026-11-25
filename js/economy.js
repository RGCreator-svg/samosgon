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

export function addInventory(state, itemId, amount) {
  const currentTotal = Object.values(state.inventory || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const free = Math.max(0, getStorageCapacity(state) - currentTotal);
  const accepted = Math.max(0, Math.min(Math.floor(amount), free));
  state.inventory[itemId] = (Number(state.inventory[itemId]) || 0) + accepted;
  return accepted;
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

function cartTotal(state) {
  return Object.entries(state.materialCart || {}).reduce((sum, [id, qty]) => sum + (PARTS.find(part => part.id === id)?.price || 0) * Math.max(0, Number(qty) || 0), 0);
}

function renderMaterialCart(state) {
  const root = $("#materialCart");
  if (!root) return;
  root.replaceChildren();
  state.materialCart ??= {};
  const entries = Object.entries(state.materialCart).filter(([id, qty]) => PARTS.some(part => part.id === id) && Number(qty) > 0);
  if (!entries.length) {
    root.append(element("p", "economy-empty", "Корзина пока пуста. Добавьте материалы из карточки нужной постройки."));
    return;
  }
  entries.forEach(([id, quantity]) => {
    const part = PARTS.find(item => item.id === id);
    const row = element("div", "material-cart-row");
    const info = element("div", "material-cart-info");
    info.append(element("b", "", `${part.emoji} ${part.name}`), element("small", "", `${part.price} монет за шт. · ${part.price * quantity} монет`));
    const controls = element("div", "material-cart-controls");
    const minus = element("button", "", "−"); minus.dataset.cartAction = `dec:${id}`; minus.setAttribute("aria-label", `Уменьшить ${part.name}`);
    const count = element("b", "material-cart-quantity", String(quantity));
    const plus = element("button", "", "+"); plus.dataset.cartAction = `inc:${id}`; plus.setAttribute("aria-label", `Увеличить ${part.name}`);
    const remove = element("button", "cart-remove", "Убрать"); remove.dataset.cartAction = `remove:${id}`;
    controls.append(minus, count, plus, remove); row.append(info, controls); root.append(row);
  });
  const total = cartTotal(state);
  const footer = element("div", "material-cart-footer");
  footer.append(element("b", "", `Итого: ${total} монет`));
  const pay = element("button", "primary-button", "Оплатить корзину");
  pay.dataset.cartAction = "pay"; pay.disabled = (Number(state.money) || 0) < total;
  const clear = element("button", "", "Очистить"); clear.dataset.cartAction = "clear";
  footer.append(pay, clear);
  if ((Number(state.money) || 0) < total) footer.append(element("small", "cart-warning", `Не хватает ${total - (Number(state.money) || 0)} монет.`));
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
      next ? "Построить / улучшить" : "Максимальный уровень",
      `build:${building.id}`,
      !next || state.money < next.cost ||
      Object.entries(next.parts).some(([id, qty]) => (state.parts[id] || 0) < qty)
    );
    if (next) {
      const detail = [...buildingCard.querySelectorAll(".economy-detail")].find(node => node.textContent.startsWith("Детали:"));
      if (detail) {
        const row = element("div", "building-material-action");
        detail.replaceWith(row); row.append(detail);
        const missing = Object.entries(next.parts).reduce((sum, [partId, qty]) => sum + Math.max(0, qty - (Number(state.parts[partId]) || 0) - (Number(state.materialCart[partId]) || 0)), 0);
        const add = element("button", "", missing ? "Добавить необходимые материалы в корзину" : "Материалы уже учтены");
        add.dataset.cartAction = `add:${building.id}`; add.disabled = missing === 0;
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
    const orderButton = element("button", "", "Заказать 1 шт.");
    orderButton.dataset.economyAction = `order:${part.id}`;
    orderButton.disabled = state.money < part.price;
    card.append(orderButton);
    if (arrived > 0) {
      const collectButton = element("button", "collect-all-button", `Забрать всё доставленное (${arrived})`);
      collectButton.dataset.economyAction = `collectAll:${part.id}`;
      card.append(collectButton);
    }
    partsRoot.append(card);
  });

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

  $("#economy")?.addEventListener("click", event => {
    const button = event.target.closest("[data-economy-action]");
    if (!button) return;
    const [action, id] = button.dataset.economyAction.split(":");

    if (action === "add") {
      const building = BUILDINGS.find(item => item.id === id);
      const upgrade = building?.levels[state.buildings[id] || 0];
      if (!upgrade) return;
      state.materialCart ??= {};
      Object.entries(upgrade.parts).forEach(([partId, required]) => {
        const missing = Math.max(0, required - (Number(state.parts[partId]) || 0) - (Number(state.materialCart[partId]) || 0));
        if (missing) state.materialCart[partId] = (Number(state.materialCart[partId]) || 0) + missing;
      });
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

    if (action === "clear") state.materialCart = {};

    if (action === "pay") {
      const entries = Object.entries(state.materialCart || {}).filter(([partId, qty]) => PARTS.some(part => part.id === partId) && Number(qty) > 0);
      const total = entries.reduce((sum, [partId, qty]) => sum + PARTS.find(part => part.id === partId).price * Math.floor(Number(qty)), 0);
      if (!entries.length || (Number(state.money) || 0) < total) {
        notify("Не хватает денег для оплаты корзины.");
        renderEconomy(state); return;
      }
      state.money -= total;
      entries.forEach(([partId, qty]) => { state.parts[partId] = (Number(state.parts[partId]) || 0) + Math.floor(Number(qty)); });
      state.materialCart = {};
      notify(`Корзина оплачена: материалы закуплены на ${total} монет и добавлены в комплектующие.`);
    }

    if (action === "order") {
      const part = PARTS.find(item => item.id === id);
      if (!part || state.money < part.price) return;
      state.money -= part.price;
      state.deliveries.push({
        id: `delivery_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        partId: part.id,
        name: part.name,
        quantity: 1,
        arrivalDay: state.day + part.delivery
      });
      notify(`Заказ оформлен: ${part.name}. Почта обещает доставить через ${part.delivery} дн. Почта — оптимист.`);
    }

    if (action === "build") {
      const building = BUILDINGS.find(item => item.id === id);
      const level = state.buildings[id] || 0;
      const upgrade = building?.levels[level];
      if (!upgrade || state.money < upgrade.cost) return;
      if (Object.entries(upgrade.parts).some(([partId, qty]) => (state.parts[partId] || 0) < qty)) {
        notify("Не хватает комплектующих. Стройка пока на паузе.");
        return;
      }
      state.money -= upgrade.cost;
      Object.entries(upgrade.parts).forEach(([partId, qty]) => state.parts[partId] -= qty);
      state.buildings[id] = level + 1;
      notify(`${building.name} улучшен до уровня ${level + 1}! Соседи уже считают, что вы олигарх.`);
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
