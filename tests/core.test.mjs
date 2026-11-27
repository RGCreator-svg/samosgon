import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

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
const { ensureGrandmaStory, runGrandmaQuestDev, runPetrovichEncounterDev, resolvePetrovichEncounter } = await import("../js/grandmaNotes.js");
const { ensureMashHouse, getMashCapacity, startMashBatch, advanceMashHouseDay, MASH_RECIPES } = await import("../js/mashhouse.js");
const { resolveDistillationChoice, calculateDistillationResult } = await import("../js/featurepack.js");
const { blendBatch, calculateBlendProfile } = await import("../js/blending.js");
const { recordProduction } = await import("../js/productionhub.js");

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

  assert.equal(addInventory(state, "pear", 50), 29);
  assert.equal(state.inventory.pear, 29);
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

test("all feature modules can be imported as one dependency graph", async () => {
  const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../js");
  const files = (await readdir(directory)).filter(file => file.endsWith(".js") && file !== "game.js");
  for (const file of files) {
    await import(new URL("../js/" + file, import.meta.url));
  }
  assert.ok(files.length >= 15);
});


test("grandmother mystery advances through key, barn chest and orchard box", () => {
  const state = createInitialState();
  const story = ensureGrandmaStory(state);
  const messages = [];
  const notify = message => messages.push(message);

  runGrandmaQuestDev(state, notify);
  assert.equal(story.questStep, "floorboard");
  runGrandmaQuestDev(state, notify);
  assert.equal(story.keyFound, true);
  assert.equal(story.questStep, "barnChest");

  state.barn = 70;
  runGrandmaQuestDev(state, notify);
  assert.equal(story.chestOpened, true);
  assert.equal(story.questStep, "orchardBox");
  assert.ok(story.discovered.includes("quest_barn_chest"));

  state.orchardRestored = true;
  runGrandmaQuestDev(state, notify);
  assert.equal(story.questStep, "completed");
  assert.equal(story.familyRecipeUnlocked, true);
  assert.equal(story.recipeFound, true);
  assert.ok(story.discovered.includes("quest_orchard_box"));
  assert.equal(state.money, createInitialState().money + 55);
  assert.ok(messages.length >= 4);
});


test("Petrovich encounters offer choices and apply their consequences", () => {
  const state = createInitialState();
  const messages = [];
  const notify = message => messages.push(message);
  runPetrovichEncounterDev(state, notify);
  assert.equal(state.story.pendingPetrovich, "clue");
  const money = state.money;
  assert.equal(resolvePetrovichEncounter(state, "take", notify), true);
  assert.equal(state.money, money + 6);
  assert.equal(state.story.pendingPetrovich, null);
  assert.equal(state.story.findings[0].title, "Петрович тоже кое-что нашёл");
  assert.equal(resolvePetrovichEncounter(state, "unknown", notify), false);
  runPetrovichEncounterDev(state, notify);
  assert.equal(state.story.pendingPetrovich, "wrong");
  assert.equal(resolvePetrovichEncounter(state, "keep", notify), true);
  assert.ok(messages.length >= 3);
});


test("Petrovich remembers choices and can improve a distillation batch", () => {
  const state = createInitialState();
  const notify = () => {};
  runPetrovichEncounterDev(state, notify);
  assert.equal(state.story.pendingPetrovich, "clue");
  assert.equal(resolvePetrovichEncounter(state, "thank", notify), true);
  assert.equal(state.story.petrovichRelation, 8);

  runPetrovichEncounterDev(state, notify);
  assert.equal(state.story.pendingPetrovich, "wrong");
  resolvePetrovichEncounter(state, "keep", notify);
  assert.equal(state.story.petrovichRelation, 5);

  for (let i = 0; i < 3; i++) runPetrovichEncounterDev(state, notify);
  assert.equal(state.story.pendingPetrovich, "distill_help");
  resolvePetrovichEncounter(state, "accept", notify);
  assert.equal(state.story.petrovichQualityBonus, 5);
  assert.equal(state.parts.fasteners, 1);
});


test("mash house supports multiple recipes and independent concurrent vats", () => {
  const state = createInitialState();
  state.skills = ["ferment"];
  const house = ensureMashHouse(state);
  assert.equal(getMashCapacity(state), 2);
  assert.equal(startMashBatch(state, "sugar"), true);
  assert.equal(startMashBatch(state, "fruit"), true);
  assert.equal(startMashBatch(state, "grain"), false);
  state.buildings.production = 1;
  assert.equal(getMashCapacity(state), 3);
  assert.equal(startMashBatch(state, "grain"), true);
  assert.equal(house.batches.length, 3);
  assert.deepEqual(house.batches.map(batch => batch.outputItem), ["braga", "fruit_braga", "grain_braga"]);
  assert.deepEqual(MASH_RECIPES.map(recipe => recipe.id), ["sugar", "fruit", "grain"]);
});

test("mash fermentation advances by game days and becomes collectable once ready", () => {
  const state = createInitialState();
  state.skills = ["ferment", "patient_master"];
  const messages = [];
  const notify = message => messages.push(message);
  assert.equal(startMashBatch(state, "grain"), true);
  const batch = state.mashHouse.batches[0];
  assert.equal(batch.totalDays, 3);
  advanceMashHouseDay(state, notify);
  assert.equal(batch.remaining, 2);
  advanceMashHouseDay(state, notify);
  advanceMashHouseDay(state, notify);
  assert.equal(batch.ready, true);
  assert.equal(batch.remaining, 0);
  advanceMashHouseDay(state, notify);
  assert.equal(messages.length, 1);
  assert.equal(batch.outputItem, "grain_braga");
});


test("distillation requires four deliberate game stages before producing a batch", () => {
  const state = createInitialState();
  state.mashType = "sugar";
  state.bragaQuality = 70;
  state.distillation = { active:true, phase:"stabilization", qualityPoints:0, outputPoints:0, completedStages:[] };
  const choices = ["precise","steady","precise","steady"];
  const expected = ["heads","heart","tails",null];
  choices.forEach((choice,index)=>{
    const result=resolveDistillationChoice(state.distillation,choice);
    assert.equal(result.valid,true);
    assert.equal(result.phase,expected[index]);
    assert.equal(result.done,index===3);
  });
  assert.deepEqual(state.distillation.completedStages,["stabilization","heads","heart","tails"]);
  assert.equal(state.distillation.qualityPoints,6);
  const result=calculateDistillationResult(state);
  assert.equal(result.quality,76);
  assert.equal(result.output,3);
  assert.equal(resolveDistillationChoice(state.distillation,"invalid").valid,false);
});

test("distillation result reflects installed cooling modules and artisan specialization", () => {
  const state=createInitialState();
  state.mashType="fruit";
  state.bragaQuality=60;
  state.distillation={qualityPoints:0,outputPoints:0};
  const basic=calculateDistillationResult(state);
  state.equipmentModules=["auto_cooling","safety_monitor","basic_condenser"];
  state.specialization="artisan";
  const improved=calculateDistillationResult(state);
  assert.ok(improved.quality>basic.quality);
  assert.equal(improved.output,basic.output);
});


test("blending consumes multiple source lots and creates a flavored quality passport", () => {
  const state=createInitialState();
  state.inventory={spirit:2,aged_spirit:1};
  state.qualityLots=[
    {item:"spirit",remaining:2,quality:84,passportId:"spirit-p"},
    {item:"aged_spirit",remaining:1,quality:92,passportId:"aged-p"}
  ];
  state.productionLog=[
    {passport:{id:"spirit-p",flavorProfile:{body:58,aroma:72,notes:["фруктовый"]}}},
    {passport:{id:"aged-p",flavorProfile:{body:88,aroma:66,notes:["дубовый"]}}}
  ];
  const result=blendBatch(state,"orchard_blend",recordProduction);
  assert.ok(result);
  assert.equal(result.output,2);
  assert.equal(state.inventory.spirit,0);
  assert.equal(state.inventory.aged_spirit,0);
  assert.equal(state.inventory.orchard_blend,2);
  assert.ok(result.score>84);
  assert.ok(result.profile.notes.includes("фруктовый акцент"));
  const passport=state.productionLog[0].passport;
  assert.equal(passport.process,"Купажирование");
  assert.equal(passport.flavorProfile.body,result.profile.body);
  assert.equal(state.qualityLots.at(-1).item,"orchard_blend");
});

test("blend recipes cannot start without every required source product", () => {
  const state=createInitialState();
  state.inventory={spirit:2};
  assert.equal(blendBatch(state,"house_blend",recordProduction),null);
  assert.equal(state.inventory.spirit,2);
});
