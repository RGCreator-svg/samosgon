import test from "node:test";
import assert from "node:assert/strict";

let stored = null;
let writes = 0;
globalThis.localStorage = {
  getItem() { return stored; },
  setItem(key, value) { stored = value; writes += 1; },
  removeItem() { stored = null; }
};

const { loadGame, saveGame, createInitialState } = await import("../js/engine.js");
const { addInventory, removeInventory, setInventoryCount, hasInventory } = await import("../js/economy.js");
const { advanceGameDay } = await import("../js/gameLoop.js");

test("legacy saves migrate without losing inventory and receive legacy quality lots", () => {
  stored = JSON.stringify({
    day: 9,
    money: 245,
    inventory: { potato: 4, apple: 2 },
    skills: ["country_life"]
  });
  const state = loadGame();

  assert.equal(state.day, 9);
  assert.equal(state.money, 245);
  assert.equal(state.schemaVersion, 1);
  assert.equal(state.inventory.potato, 4);
  assert.equal(state.inventory.apple, 2);
  assert.equal(state.production.active, false);

  const lotTotals = {};
  for (const lot of state.qualityLots) {
    lotTotals[lot.item] = (lotTotals[lot.item] || 0) + lot.remaining;
    assert.equal(lot.legacy, true);
  }
  assert.equal(lotTotals.potato, 4);
  assert.equal(lotTotals.apple, 2);
});

test("saveGame skips identical snapshots", () => {
  stored = null;
  writes = 0;
  const state = createInitialState();
  assert.equal(saveGame(state), true);
  assert.equal(saveGame(state), false);
  assert.equal(writes, 1);
  state.money += 1;
  assert.equal(saveGame(state), true);
  assert.equal(writes, 2);
});

test("inventory API respects stock, capacity and quality lot accounting", () => {
  const state = createInitialState();
  state.inventory = { apple: 3 };
  state.qualityLots = [
    { item: "apple", remaining: 2, quality: 91, passportId: "p-1" },
    { item: "apple", remaining: 1, quality: null, legacy: true }
  ];

  assert.equal(hasInventory(state, { apple: 3 }), true);
  assert.equal(hasInventory(state, { apple: 4 }), false);
  assert.equal(removeInventory(state, "apple", 2), 2);
  assert.equal(state.inventory.apple, 1);
  assert.equal(state.qualityLots.reduce((sum, lot) => sum + lot.remaining, 0), 1);

  assert.equal(addInventory(state, "pear", 50), 26);
  assert.equal(state.inventory.pear, 26);
  assert.equal(addInventory(state, "pear", 1), 0);

  setInventoryCount(state, "apple", 4);
  assert.equal(state.inventory.apple, 4);
  assert.equal(state.qualityLots.filter(lot => lot.item === "apple").reduce((sum, lot) => sum + lot.remaining, 0), 4);
  setInventoryCount(state, "apple", 1);
  assert.equal(state.inventory.apple, 1);
  assert.equal(state.qualityLots.filter(lot => lot.item === "apple").reduce((sum, lot) => sum + lot.remaining, 0), 1);
});

test("daily simulation runs phases in a fixed order and applies needs", () => {
  const state = createInitialState();
  const phases = [];
  const record = name => () => phases.push(name);
  advanceGameDay(state, {
    notify: message => phases.push("notify:" + message),
    earnExperience: record("xp"),
    advanceOrdersDay: record("orders"),
    advanceDeliveries: record("deliveries"),
    advanceExpansionDay: record("expansion"),
    advanceWorldDay: record("world"),
    advanceResearchLabDay: record("research"),
    advanceFeaturePackDay: record("production"),
    advanceViticultureDay: record("viticulture"),
    getWorldColdPenalty: () => 0,
    startNewDay: record("new-day")
  });

  assert.equal(state.day, 2);
  assert.deepEqual(phases.slice(0, 7), ["orders", "deliveries", "expansion", "world", "research", "production", "viticulture"]);
  assert.equal(state.hunger, 60);
  assert.equal(state.warmth, 65);
  assert.equal(state.energy, 100);
  assert.ok(phases.includes("new-day"));
  assert.ok(phases.includes("xp"));
});
