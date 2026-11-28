
import { GAME_CONFIG } from "./data.js";

const SAVE_KEY = "samosgon_2_save";
const BACKUP_SAVE_KEY = "samosgon_2_save_backup";
const SAVE_SCHEMA_VERSION = 1;
let lastSavedSnapshot = null;

export function createInitialState() {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    gameStarted: false,
    day: 1,
    money: GAME_CONFIG.startingMoney,

    level: 1,
    xp: 0,
    skillPoints: GAME_CONFIG.startingSkillPoints,
    skills: [],

    hunger: 70,
    energy: 80,
    warmth: 70,

    house: 25,
    barn: 20,
    still: 5,
    garden: 35,

    orchardRestored: false,
    trees: 0,

    inventory: { ...GAME_CONFIG.startingInventory, spirit: 0, aged_spirit: 0 },
    buildings: { warehouse: 0, workshop: 0, production: 0, laboratory: 0 },
    parts: { timber: 0, metal: 0, fasteners: 0, paint: 0, tools: 0, pump: 0, controller: 0 },
    deliveries: [],
    pendingPurchaseBatches: [],
    equipmentTier: 0,
    automationTier: 0,
    advancedProduction: { lines: [], queue: [], nextId: 1 },
    maintenance: 100,
    story: { unlocked: [] },
    advancedContracts: { offer: null, completed: 0 },
    cellar: { barrels: [], nextId: 1 },

    production: {
      active: false,
      ready: false,
      daysLeft: 0
    }
  };
}

function migrateSave(parsed) {
  const initial = createInitialState();
  const state = {
    ...initial,
    ...parsed,
    schemaVersion: SAVE_SCHEMA_VERSION,
    inventory: { ...initial.inventory, ...(parsed.inventory || {}) },
    production: { ...initial.production, ...(parsed.production || {}) },
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    buildings: { ...initial.buildings, ...(parsed.buildings || {}) },
    parts: { ...initial.parts, ...(parsed.parts || {}) },
    deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : [],
    pendingPurchaseBatches: Array.isArray(parsed.pendingPurchaseBatches) ? parsed.pendingPurchaseBatches : [],
    equipmentTier: Math.max(0, Number(parsed.equipmentTier) || 0),
    automationTier: Math.max(0, Number(parsed.automationTier) || 0),
    advancedProduction: {
      lines: Array.isArray(parsed.advancedProduction?.lines) ? parsed.advancedProduction.lines : [],
      queue: Array.isArray(parsed.advancedProduction?.queue) ? parsed.advancedProduction.queue : [],
      nextId: Math.max(1, Number(parsed.advancedProduction?.nextId) || 1)
    },
    maintenance: Math.max(0, Math.min(100, Number(parsed.maintenance ?? 100))),
    story: { unlocked: Array.isArray(parsed.story?.unlocked) ? parsed.story.unlocked : [] },
    advancedContracts: {
      offer: parsed.advancedContracts?.offer || null,
      completed: Math.max(0, Number(parsed.advancedContracts?.completed) || 0)
    },
    cellar: {
      barrels: Array.isArray(parsed.cellar?.barrels) ? parsed.cellar.barrels : [],
      nextId: Math.max(1, Number(parsed.cellar?.nextId) || 1)
    }
  };

  for (const [id, amount] of Object.entries(state.inventory)) {
    state.inventory[id] = Math.max(0, Math.floor(Number(amount) || 0));
  }
  if (!Array.isArray(state.productionLog)) state.productionLog = [];

  // Сверяем остатки партий с фактическим количеством товара.
  // Недостающие записи считаем старым товаром без паспорта качества.
  const sourceLots = Array.isArray(state.qualityLots) ? state.qualityLots : [];
  const normalizedLots = [];
  const accounted = {};
  for (const lot of sourceLots) {
    const item = String(lot?.item || "");
    const available = Math.max(0, (Number(state.inventory[item]) || 0) - (accounted[item] || 0));
    const quantity = Math.min(available, Math.max(0, Math.floor(Number(lot?.remaining) || 0)));
    if (!item || !quantity) continue;
    normalizedLots.push({ ...lot, item, remaining: quantity });
    accounted[item] = (accounted[item] || 0) + quantity;
  }
  for (const [item, amount] of Object.entries(state.inventory)) {
    const missing = Math.max(0, amount - (accounted[item] || 0));
    if (missing) normalizedLots.push({ item, remaining: missing, quality: null, passportId: null, legacy: true });
  }
  state.qualityLots = normalizedLots;
  return state;
}

function parseSaveSnapshot(snapshot) {
  const parsed = JSON.parse(snapshot);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Некорректный формат сохранения");
  }
  return migrateSave(parsed);
}

export function loadGame() {
  const primary = localStorage.getItem(SAVE_KEY);
  const backup = localStorage.getItem(BACKUP_SAVE_KEY);

  if (primary) {
    try {
      const state = parseSaveSnapshot(primary);
      lastSavedSnapshot = JSON.stringify(state);
      return state;
    } catch (error) {
      console.error("Основное сохранение повреждено, пробуем резервную копию:", error);
    }
  }

  if (backup) {
    try {
      const state = parseSaveSnapshot(backup);
      const recovered = JSON.stringify(state);
      // Восстанавливаем основной слот из проверенной резервной копии.
      localStorage.setItem(SAVE_KEY, recovered);
      lastSavedSnapshot = recovered;
      console.warn("Игра восстановлена из резервной копии сохранения.");
      return state;
    } catch (error) {
      console.error("Не удалось прочитать резервную копию:", error);
    }
  }

  lastSavedSnapshot = null;
  return createInitialState();
}

export function saveGame(state) {
  try {
    state.schemaVersion = SAVE_SCHEMA_VERSION;
    const snapshot = JSON.stringify(state);
    if (snapshot === lastSavedSnapshot) return true;

    const previous = localStorage.getItem(SAVE_KEY);
    if (previous) {
      // Сначала сохраняем предыдущую рабочую версию, затем обновляем основной слот.
      localStorage.setItem(BACKUP_SAVE_KEY, previous);
    }
    localStorage.setItem(SAVE_KEY, snapshot);
    lastSavedSnapshot = snapshot;
    return true;
  } catch (error) {
    console.error("Не удалось сохранить игру:", error);
    return false;
  }
}

export function addXP(state, amount) {
  state.xp += amount;

  while (state.xp >= 100) {
    state.xp -= 100;
    state.level += 1;
    state.skillPoints += 1;
  }
}

export function hasSkill(state, skillId) {
  return state.skills.includes(skillId);
}
