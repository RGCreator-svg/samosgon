
import { GAME_CONFIG } from "./data.js";

const SAVE_KEY = "samosgon_2_save";

export function createInitialState() {
  return {
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

    inventory: { ...GAME_CONFIG.startingInventory },
    buildings: { warehouse: 0, workshop: 0, production: 0, laboratory: 0 },
    parts: { timber: 0, metal: 0, fasteners: 0, tools: 0, pump: 0, controller: 0 },
    deliveries: [],
    equipmentTier: 0,
    automationTier: 0,

    production: {
      active: false,
      ready: false,
      daysLeft: 0
    }
  };
}

export function loadGame() {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return createInitialState();

    const parsed = JSON.parse(saved);
    const initial = createInitialState();

    return {
      ...initial,
      ...parsed,
      inventory: {
        ...initial.inventory,
        ...(parsed.inventory || {})
      },
      production: {
        ...initial.production,
        ...(parsed.production || {})
      },
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      buildings: { ...initial.buildings, ...(parsed.buildings || {}) },
      parts: { ...initial.parts, ...(parsed.parts || {}) },
      deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : [],
      equipmentTier: Math.max(0, Number(parsed.equipmentTier) || 0),
      automationTier: Math.max(0, Number(parsed.automationTier) || 0)
    };
  } catch (error) {
    console.error("Не удалось загрузить сохранение:", error);
    return createInitialState();
  }
}

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Не удалось сохранить игру:", error);
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
