import { ITEMS } from "./data.js";

const $ = (selector) => document.querySelector(selector);

const CUSTOMERS = [
  {
    name: "Тётя Зина",
    emoji: "👵",
    phrases: [
      "Только выбери товар получше. Я всё равно проверю.",
      "Мне для хозяйства. И не спрашивай, для какого именно.",
      "Если понравится — расскажу соседкам. Если нет — тоже расскажу."
    ]
  },
  {
    name: "Петрович",
    emoji: "🧔",
    phrases: [
      "Нужно к обеду. У меня гости, а гости — народ прожорливый.",
      "Давай без разговоров, у меня трактор не заведён.",
      "За качество отвечаю своей репутацией. Она, правда, небольшая."
    ]
  },
  {
    name: "Хозяин трактира",
    emoji: "🍲",
    phrases: [
      "Поставки нужны регулярно. Посетители уже спрашивают.",
      "Если товар хороший — будем сотрудничать.",
      "Мне главное, чтобы вовремя. У меня посетители нетерпеливые."
    ]
  },
  {
    name: "Сосед Михалыч",
    emoji: "🧢",
    phrases: [
      "Выручи соседа. Сосед потом тоже может выручить.",
      "Мне немного надо. Ну, по деревенским меркам.",
      "Деньги принесу. Честно. Почти."
    ]
  }
];

const $style = `
.orders-summary {
  display:flex;
  flex-wrap:wrap;
  gap:12px;
  margin:12px 0 18px;
}
.order-stat {
  background:#303328;
  border:1px solid #5a543e;
  border-radius:9px;
  padding:10px 14px;
}
.order-list {
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(230px,1fr));
  gap:12px;
}
.order-card {
  background:#303328;
  border:1px solid #5a543e;
  border-radius:10px;
  padding:14px;
}
.order-card h3 { margin:0 0 8px; color:#d9c18b; }
.order-card p { margin:6px 0; color:#c0b9a8; }
.order-card .order-reward { color:#d7bd83; font-weight:bold; }
.order-card .order-deadline { color:#e2b878; }
.order-card.expired { opacity:.65; }
.order-empty {
  padding:16px;
  border:1px dashed #65583c;
  border-radius:9px;
  color:#aaa18e;
}
`;

function ensureBoard(state) {
  if (!state.orders || typeof state.orders !== "object") {
    state.orders = {
      offers: [],
      active: [],
      completed: 0,
      failed: 0
    };
  }

  state.orders.offers ??= [];
  state.orders.active ??= [];
  state.orders.completed ??= 0;
  state.orders.failed ??= 0;
  state.reputation ??= 0;
}

function makeOrder(state) {
  const customer = CUSTOMERS[
    Math.floor(Math.random() * CUSTOMERS.length)
  ];

  const item = ITEMS[
    Math.floor(Math.random() * ITEMS.length)
  ];

  const quantity = 1 + Math.floor(Math.random() * 4);
  const deadline = 2 + Math.floor(Math.random() * 3);

  const reputationBonus = Math.max(0, state.reputation) * 0.5;
  const reward = Math.round(
    item.price * quantity * 1.5 + 10 + reputationBonus
  );

  return {
    id: `order_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    customer: customer.name,
    emoji: customer.emoji,
    phrase: customer.phrases[
      Math.floor(Math.random() * customer.phrases.length)
    ],
    itemId: item.id,
    quantity,
    reward,
    xp: 10 + quantity * 3,
    deadline: state.day + deadline,
    createdDay: state.day
  };
}

function fillOffers(state) {
  ensureBoard(state);

  while (state.orders.offers.length < 3) {
    const order = makeOrder(state);

    const duplicate = state.orders.offers.some(
      (entry) =>
        entry.itemId === order.itemId &&
        entry.customer === order.customer
    );

    if (!duplicate) {
      state.orders.offers.push(order);
    } else {
      // Защита от бесконечного поиска при малом числе комбинаций.
      state.orders.offers.push({
        ...order,
        id: `${order.id}_extra`
      });
    }
  }
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function createButton(text, action, orderId, disabled = false) {
  const button = document.createElement("button");
  button.textContent = text;
  button.dataset.orderAction = action;
  button.dataset.orderId = orderId;
  button.disabled = disabled;
  return button;
}

function getItem(itemId) {
  return ITEMS.find((item) => item.id === itemId);
}

function renderOrderCard(order, mode, state) {
  const item = getItem(order.itemId);
  if (!item) return null;

  const card = createElement("article", "order-card");

  const title = createElement(
    "h3",
    "",
    `${order.emoji} ${order.customer}`
  );

  const phrase = createElement("p", "", `«${order.phrase}»`);

  const goods = createElement(
    "p",
    "",
    `${item.emoji} ${item.name}: ${order.quantity} шт.`
  );

  const reward = createElement(
    "p",
    "order-reward",
    `Награда: ${order.reward} монет · ${order.xp} опыта`
  );

  const deadlineDays = order.deadline - state.day;

  const deadline = createElement(
    "p",
    "order-deadline",
    deadlineDays >= 0
      ? `Срок: до конца дня ${order.deadline} (осталось дней: ${deadlineDays})`
      : "Срок истёк"
  );

  card.append(title, phrase, goods, reward, deadline);

  if (mode === "offer") {
    card.append(
      createButton("Принять заказ", "accept", order.id)
    );
  } else {
    const available = state.inventory[order.itemId] || 0;
    const canDeliver = available >= order.quantity;

    const stock = createElement(
      "p",
      "",
      `У вас в запасе: ${available} шт.`
    );

    const deliverButton = createButton(
      "Сдать заказ",
      "deliver",
      order.id,
      !canDeliver || deadlineDays < 0
    );

    card.append(stock, deliverButton);
  }

  return card;
}

function renderOrders(state) {
  ensureBoard(state);

  const offers = $("#orderOffers");
  const active = $("#activeOrders");
  const reputation = $("#reputationValue");
  const completed = $("#completedOrders");
  const failed = $("#failedOrders");

  if (!offers || !active) return;

  offers.innerHTML = "";
  active.innerHTML = "";

  if (reputation) reputation.textContent = state.reputation;
  if (completed) completed.textContent = state.orders.completed;
  if (failed) failed.textContent = state.orders.failed;

  if (state.orders.offers.length === 0) {
    offers.append(
      createElement(
        "p",
        "order-empty",
        "Новых заказов пока нет. Жители заняты своими делами и сплетнями."
      )
    );
  } else {
    state.orders.offers.forEach((order) => {
      const card = renderOrderCard(order, "offer", state);
      if (card) offers.append(card);
    });
  }

  if (state.orders.active.length === 0) {
    active.append(
      createElement(
        "p",
        "order-empty",
        "Активных заказов нет. Можно спокойно работать или делать вид, что работаешь."
      )
    );
  } else {
    state.orders.active.forEach((order) => {
      const card = renderOrderCard(order, "active", state);
      if (card) active.append(card);
    });
  }
}

function addOrdersInterface() {
  if ($("#orders")) return;

  const navigation = document.querySelector(".navigation");
  const game = $("#game");

  if (!navigation || !game) return;

  const navButton = document.createElement("button");
  navButton.dataset.tab = "orders";
  navButton.textContent = "📋 Заказы";
  navigation.append(navButton);

  const section = document.createElement("section");
  section.id = "orders";
  section.className = "tab-content panel hidden";

  section.innerHTML = `
    <h2>📋 Доска заказов</h2>
    <p>
      Жители деревни узнали, что у вас появилось хозяйство.
      Теперь они считают, что вы обязаны решать их проблемы.
    </p>

    <div class="orders-summary">
      <div class="order-stat">
        ⭐ Репутация: <b id="reputationValue">0</b>
      </div>
      <div class="order-stat">
        ✅ Выполнено: <b id="completedOrders">0</b>
      </div>
      <div class="order-stat">
        ❌ Провалено: <b id="failedOrders">0</b>
      </div>
    </div>

    <h3>Новые предложения</h3>
    <div id="orderOffers" class="order-list"></div>

    <h3 style="margin-top:24px">Мои заказы</h3>
    <div id="activeOrders" class="order-list"></div>
  `;

  const notifications = $("section.panel:last-of-type");

  if (notifications && notifications.parentElement === game) {
    game.insertBefore(section, notifications);
  } else {
    game.append(section);
  }

  const style = document.createElement("style");
  style.textContent = $style;
  document.head.append(style);

  navigation.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button || button.dataset.tab !== "orders") return;

    document.querySelectorAll(".tab-content").forEach((tab) => {
      tab.classList.toggle("hidden", tab.id !== "orders");
    });

    navigation.querySelectorAll("[data-tab]").forEach((tabButton) => {
      tabButton.classList.toggle(
        "active",
        tabButton.dataset.tab === "orders"
      );
    });
  });
}

export function initOrders(state, { notify, render, earnExperience }) {
  ensureBoard(state);
  addOrdersInterface();

  if (state.orders.offers.length === 0) {
    fillOffers(state);
  }

  const section = $("#orders");

  if (!section) {
    console.warn("Не удалось создать интерфейс заказов.");
    return;
  }

  section.addEventListener("click", (event) => {
    const button = event.target.closest("[data-order-action]");
    if (!button) return;

    const action = button.dataset.orderAction;
    const orderId = button.dataset.orderId;

    if (action === "accept") {
      if (state.orders.active.length >= 3) {
        notify("У вас уже три заказа. Даже у деревенского предпринимателя есть предел.");
        return;
      }

      const index = state.orders.offers.findIndex(
        (order) => order.id === orderId
      );

      if (index === -1) return;

      const [order] = state.orders.offers.splice(index, 1);
      state.orders.active.push(order);

      fillOffers(state);

      notify(`Заказ принят. ${order.customer} теперь рассчитывает на вас.`);
      render();
      renderOrders(state);
      return;
    }

    if (action === "deliver") {
      const index = state.orders.active.findIndex(
        (order) => order.id === orderId
      );

      if (index === -1) return;

      const order = state.orders.active[index];

      if (state.day > order.deadline) {
        notify("Срок заказа уже истёк.");
        return;
      }

      const available = state.inventory[order.itemId] || 0;

      if (available < order.quantity) {
        notify("Не хватает товара для выполнения заказа.");
        return;
      }

      state.inventory[order.itemId] -= order.quantity;
      state.money += order.reward;
      state.reputation = Math.min(100, state.reputation + 3);
      state.orders.completed += 1;

      state.orders.active.splice(index, 1);

      earnExperience(order.xp);

      notify(
        `Заказ выполнен! Получено ${order.reward} монет. Репутация выросла.`
      );

      render();
      renderOrders(state);
    }
  });

  renderOrders(state);
}

export function advanceOrdersDay(state, notify) {
  ensureBoard(state);

  const remaining = [];

  state.orders.active.forEach((order) => {
    if (state.day > order.deadline) {
      state.orders.failed += 1;
      state.reputation = Math.max(-100, state.reputation - 2);

      notify(
        `Заказ от ${order.customer} просрочен. Репутация немного пострадала.`
      );
    } else {
      remaining.push(order);
    }
  });

  state.orders.active = remaining;

  // Каждый новый день появляются новые предложения.
  fillOffers(state);
}