export const EQUIPMENT_TIERS = [
  {
    name: "Бабушкин аппарат",
    description: "Старенький, капризный, но семейная реликвия. Начальная ступень.",
    cost: 0, parts: {}, workshop: 0, laboratory: 0, skill: null
  },
  {
    name: "Восстановленная установка",
    description: "Надёжная игровая установка после капитального восстановления.",
    cost: 350, parts: { timber: 3, metal: 3, tools: 1 }, workshop: 1, laboratory: 0, skill: "old_still"
  },
  {
    name: "Медная установка",
    description: "Более высокий класс оборудования и новые возможности производства.",
    cost: 900, parts: { metal: 8, tools: 2, pump: 1 }, workshop: 2, laboratory: 0, skill: "precision_assembly"
  },
  {
    name: "Модульная установка",
    description: "Поддерживает дополнительные игровые модули и расширенный контроль.",
    cost: 1800, parts: { metal: 12, pump: 2, controller: 1 }, workshop: 3, laboratory: 1, skill: "modular_systems"
  },
  {
    name: "Ректификационная колонна",
    description: "Финальная технологическая ступень хозяйства. Требует серьёзной инфраструктуры.",
    cost: 4500, parts: { metal: 20, pump: 3, controller: 3, tools: 3 }, workshop: 3, laboratory: 2, skill: "column_master"
  }
];

export const AUTOMATION_TIERS = [
  {
    name: "Ручное управление",
    description: "Все операции выполняются вручную.",
    cost: 0, parts: {}, workshop: 0, laboratory: 0, skill: null
  },
  {
    name: "Базовые датчики",
    description: "Игровые датчики следят за состоянием производственного участка.",
    cost: 500, parts: { metal: 3, controller: 1 }, workshop: 1, laboratory: 0, skill: "automation_basics"
  },
  {
    name: "Автоматический контроль",
    description: "Система помогает следить за запасами и состоянием оборудования.",
    cost: 1300, parts: { metal: 6, controller: 2, pump: 1 }, workshop: 2, laboratory: 1, skill: "auto_control"
  },
  {
    name: "Умное хозяйство",
    description: "Продвинутая игровая автоматизация производственных процессов.",
    cost: 2800, parts: { metal: 10, controller: 3, pump: 2, tools: 2 }, workshop: 3, laboratory: 2, skill: "full_automation"
  }
];

const $ = selector => document.querySelector(selector);

function ensureState(state) {
  state.equipmentTier = Math.max(0, Number(state.equipmentTier) || 0);
  state.automationTier = Math.max(0, Number(state.automationTier) || 0);
}

function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

function canAfford(state, tier) {
  return state.money >= tier.cost &&
    (state.buildings.workshop || 0) >= tier.workshop &&
    (state.buildings.laboratory || 0) >= tier.laboratory &&
    (!tier.skill || state.skills.includes(tier.skill)) &&
    Object.entries(tier.parts).every(([id, count]) => (state.parts[id] || 0) >= count);
}

function describeRequirements(tier, state) {
  const parts = Object.entries(tier.parts)
    .map(([id, count]) => `${id}: ${count}`).join(", ");
  const missing = [];
  if ((state.buildings.workshop || 0) < tier.workshop) missing.push(`мастерская ${tier.workshop} ур.`);
  if ((state.buildings.laboratory || 0) < tier.laboratory) missing.push(`лаборатория ${tier.laboratory} ур.`);
  if (tier.skill && !state.skills.includes(tier.skill)) missing.push("нужен навык");
  if (parts) missing.push("детали: " + parts);
  return missing.length ? missing.join(" · ") : "Все требования выполнены";
}

function renderTrack(root, tiers, current, state, action) {
  root.replaceChildren();
  tiers.forEach((tier, index) => {
    const currentNode = index === current;
    const passed = index < current;
    const card = node("article", `tech-card${currentNode ? " current" : ""}${passed ? " completed" : ""}`);
    const marker = node("div", "tech-marker", passed ? "✓" : String(index + 1));
    const body = node("div", "tech-body");
    body.append(node("h4", "", tier.name), node("p", "", tier.description));
    if (currentNode) body.append(node("span", "tech-status", "Текущий уровень"));
    if (index === current + 1) {
      body.append(node("p", "tech-cost", `Стоимость: ${tier.cost} монет`));
      body.append(node("p", "tech-requirements", describeRequirements(tier, state)));
      const button = node("button", "", "Установить улучшение");
      button.dataset.techAction = action;
      button.disabled = !canAfford(state, tier);
      body.append(button);
    } else if (index > current + 1) {
      body.append(node("small", "tech-locked", "Сначала откройте предыдущую ступень"));
    }
    card.append(marker, body);
    root.append(card);
  });
}

export function renderEquipment(state) {
  const equipment = $("#equipmentTrack");
  const automation = $("#automationTrack");
  const summary = $("#equipmentSummary");
  if (!equipment || !automation || !summary) return;
  renderTrack(equipment, EQUIPMENT_TIERS, state.equipmentTier, state, "equipment");
  renderTrack(automation, AUTOMATION_TIERS, state.automationTier, state, "automation");
  summary.textContent = `Оборудование: ${EQUIPMENT_TIERS[state.equipmentTier]?.name || "неизвестный уровень"} · Автоматика: ${AUTOMATION_TIERS[state.automationTier]?.name || "неизвестный уровень"}`;
}

export function initEquipment(state, { render, notify }) {
  ensureState(state);
  const nav = $(".navigation");
  const game = $("#game");
  if (!nav || !game) return;

  if (!$("#equipment")) {
    const tab = node("button", "", "⚙️ Технологии");
    tab.dataset.tab = "equipment";
    nav.append(tab);

    const section = node("section", "tab-content panel hidden");
    section.id = "equipment";
    section.innerHTML = `
      <h2>⚙️ Технологическое развитие</h2>
      <p>От бабушкиной реликвии до автоматизированного комплекса. Путь долгий, зато соседям будет о чём сплетничать.</p>
      <div id="equipmentSummary" class="equipment-summary"></div>
      <h3>Лестница развития аппарата</h3>
      <div id="equipmentTrack" class="tech-track"></div>
      <h3>Автоматизация хозяйства</h3>
      <div id="automationTrack" class="tech-track"></div>`;
    game.append(section);
  }

  nav.addEventListener("click", event => {
    const button = event.target.closest('[data-tab="equipment"]');
    if (!button) return;
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.toggle("hidden", tab.id !== "equipment"));
    nav.querySelectorAll("[data-tab]").forEach(item => item.classList.toggle("active", item === button));
  });

  $("#equipment")?.addEventListener("click", event => {
    const button = event.target.closest("[data-tech-action]");
    if (!button) return;
    const action = button.dataset.techAction;
    const isEquipment = action === "equipment";
    const tiers = isEquipment ? EQUIPMENT_TIERS : AUTOMATION_TIERS;
    const current = isEquipment ? state.equipmentTier : state.automationTier;
    const next = tiers[current + 1];
    if (!next || !canAfford(state, next)) {
      notify("Не выполнены требования. Технологии не любят спешки — и пустые кошельки.");
      return;
    }
    state.money -= next.cost;
    Object.entries(next.parts).forEach(([id, count]) => { state.parts[id] -= count; });
    if (isEquipment) state.equipmentTier += 1;
    else state.automationTier += 1;
    notify(`Открыто улучшение: «${next.name}»!`);
    render();
    renderEquipment(state);
  });

  renderEquipment(state);
}
