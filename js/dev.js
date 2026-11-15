const SAVE_KEY = "samosgon_2_save";

const FIELDS = [
  ["day", "День", 1, 9999],
  ["money", "Деньги", 0, 9999999],
  ["level", "Уровень", 1, 9999],
  ["xp", "Опыт", 0, 999999],
  ["skillPoints", "Очки навыков", 0, 99999],
  ["reputation", "Репутация", -100, 100],
  ["hunger", "Сытость", 0, 100],
  ["energy", "Энергия", 0, 100],
  ["warmth", "Тепло", 0, 100],
  ["house", "Дом", 0, 100],
  ["barn", "Сарай", 0, 100],
  ["still", "Аппарат", 0, 100],
  ["garden", "Огород", 0, 100],
  ["trees", "Деревья в саду", 0, 100],
  ["equipmentTier", "Ступень аппарата (0–4)", 0, 4],
  ["automationTier", "Ступень автоматики (0–3)", 0, 3]
];

const INVENTORY = [
  ["potato", "Картошка"],
  ["carrot", "Морковь"],
  ["cabbage", "Капуста"],
  ["apple", "Яблоки"],
  ["pear", "Груши"],
  ["braga", "Брага"]
];

function makeField(key, label, value, min, max) {
  const wrapper = document.createElement("label");
  wrapper.className = "dev-field";
  const caption = document.createElement("span");
  caption.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.name = key;
  input.min = String(min);
  input.max = String(max);
  input.step = "1";
  input.value = String(Number(value) || 0);
  wrapper.append(caption, input);
  return wrapper;
}

export function initDevTools(state, { render, notify }) {
  const topbar = document.querySelector(".topbar");
  if (!topbar || document.querySelector("#devToggle")) return;

  const toggle = document.createElement("button");
  toggle.id = "devToggle";
  toggle.type = "button";
  toggle.className = "dev-toggle";
  toggle.textContent = "DEV";

  const modal = document.createElement("section");
  modal.id = "devPanel";
  modal.className = "dev-overlay hidden";
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-labelledby", "devTitle");

  const dialog = document.createElement("div");
  dialog.className = "dev-dialog";

  const header = document.createElement("div");
  header.className = "dev-header";
  const title = document.createElement("h2");
  title.id = "devTitle";
  title.textContent = "🛠 Меню разработчика";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "dev-close";
  close.textContent = "Закрыть";
  close.addEventListener("click", () => modal.classList.add("hidden"));
  header.append(title, close);

  const note = document.createElement("p");
  note.className = "dev-warning";
  note.textContent = "Изменения применяются к текущему сохранению. Не злоупотребляйте властью — бабушка всё видит.";

  const form = document.createElement("form");
  form.id = "devForm";
  const grid = document.createElement("div");
  grid.className = "dev-grid";

  FIELDS.forEach(([key, label, min, max]) => {
    grid.append(makeField(key, label, state[key], min, max));
  });

  INVENTORY.forEach(([key, label]) => {
    grid.append(makeField("inventory." + key, "Склад: " + label, state.inventory?.[key] ?? 0, 0, 999999));
  });

  const actions = document.createElement("div");
  actions.className = "dev-actions";

  const apply = document.createElement("button");
  apply.type = "submit";
  apply.className = "dev-apply";
  apply.textContent = "Применить изменения";

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "dev-reset";
  reset.textContent = "Сбросить сохранение";

  actions.append(apply, reset);
  form.append(grid, actions);
  dialog.append(header, note, form);
  modal.append(dialog);
  topbar.append(toggle);
  document.body.append(modal);

  toggle.addEventListener("click", () => {
    modal.classList.toggle("hidden");
    if (!modal.classList.contains("hidden")) {
      FIELDS.forEach(([key]) => {
        const input = form.elements.namedItem(key);
        if (input) input.value = String(Number(state[key]) || 0);
      });
      INVENTORY.forEach(([key]) => {
        const input = form.elements.namedItem("inventory." + key);
        if (input) input.value = String(Number(state.inventory?.[key]) || 0);
      });
    }
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.classList.add("hidden");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    FIELDS.forEach(([key, , min, max]) => {
      const input = form.elements.namedItem(key);
      const value = Number(input?.value);
      if (Number.isFinite(value)) state[key] = Math.max(min, Math.min(max, Math.floor(value)));
    });

    INVENTORY.forEach(([key]) => {
      const input = form.elements.namedItem("inventory." + key);
      const value = Number(input?.value);
      if (Number.isFinite(value)) state.inventory[key] = Math.max(0, Math.min(999999, Math.floor(value)));
    });

    render();
    notify("DEV: параметры сохранены. Теперь даже бухгалтерия не придерётся.");
    modal.classList.add("hidden");
  });

  reset.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Полностью удалить сохранение «Самогон 2.0» и начать заново? Это действие нельзя отменить."
    );
    if (!confirmed) return;
    localStorage.removeItem(SAVE_KEY);
    window.location.reload();
  });
}
