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
const { getEquipmentProfile, EQUIPMENT_MODULES } = await import("../js/equipment.js");
const { recordProduction } = await import("../js/productionhub.js");
const { BERRY_CROPS, HERB_CROPS, GARDEN_CROPS, ensureBerryGarden, plantBerryBush, advanceBerryGardenDay, harvestBerryBush } = await import("../js/berries.js");
const { HERBAL_FORMULAS, runHerbalFormula } = await import("../js/researchlab.js");
const { ensureProductionPlant, getStillCapacity, startStillBatch, resolveStillChoice, STILL_MODELS } = await import("../js/productionplant.js");
const { ensureCellar, startAging, ageBarrelsOneDay, BARREL_WOODS } = await import("../js/cellar.js");

test("berry garden grows seasonal bushes, harvests repeat crops and respects warehouse capacity", () => {
  const state=createInitialState();
  state.viticulture={buildings:["berryGarden"],batches:[],nextId:1};
  state.skills=["berry_growing","big_harvest"];
  state.world={season:"summer",weather:"rain"};
  const bush=plantBerryBush(state,"raspberry");
  assert.ok(bush);
  assert.equal(bush.remaining,3);
  advanceBerryGardenDay(state);
  advanceBerryGardenDay(state);
  assert.equal(bush.ready,false);
  advanceBerryGardenDay(state);
  assert.equal(bush.ready,true);
  assert.equal(bush.readyAmount,5);
  const harvest=harvestBerryBush(state,bush.id);
  assert.equal(harvest.harvested,5);
  assert.equal(state.inventory.raspberry,5);
  assert.equal(bush.ready,false);
  assert.equal(bush.remaining,2);
  state.world.season="winter";
  advanceBerryGardenDay(state);
  assert.equal(bush.remaining,2);
  state.world.season="autumn";
  state.world.weather="cloudy";
  const cranberry=plantBerryBush(state,"cranberry");
  advanceBerryGardenDay(state);
  advanceBerryGardenDay(state);
  advanceBerryGardenDay(state);
  advanceBerryGardenDay(state);
  assert.equal(cranberry.ready,true);
  assert.equal(harvestBerryBush(state,cranberry.id).harvested,4);
  assert.equal(ensureBerryGarden(state).plots.length,2);
  assert.equal(BERRY_CROPS.length,4);
});

test("berry garden limits planting to six plots", () => {
  const state=createInitialState();
  for(let i=0;i<6;i++)assert.ok(plantBerryBush(state,"blackcurrant"));
  assert.equal(plantBerryBush(state,"raspberry"),null);
});

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

 
test("equipment catalog offers distinct columns, cooling, takeoff and sensor modules", () => {
  const ids=new Set(EQUIPMENT_MODULES.map(module=>module.id));
  for(const id of ["glass_column","copper_column","stainless_column","dimroth_condenser","shell_condenser","direct_cooler","liquid_takeoff","vapor_takeoff","auto_takeoff","digital_sensor","flow_meter","copper_mesh","stainless_mesh"])assert.ok(ids.has(id),id);
  const state=createInitialState();
  state.equipmentModules=["glass_column","shell_condenser","auto_takeoff","copper_mesh","digital_sensor"];
  const profile=getEquipmentProfile(state,"fruit");
  assert.ok(profile.quality>=15);
  assert.ok(profile.stability>=10);
  assert.ok(profile.flavour>=10);
  assert.ok(profile.wear<0);
});

test("apparatus specializations reward coherent sugar, fruit, grain and honey production lines", () => {
  const state=createInitialState();
  const plain=getEquipmentProfile(state,"fruit");
  state.equipmentModules=["fruit_filter","copper_head"];
  const developing=getEquipmentProfile(state,"fruit");
  state.equipmentModules.push("copper_column","copper_mesh");
  const specialized=getEquipmentProfile(state,"fruit");
  assert.equal(developing.lineage,"Фруктовая · ароматный сад");
  assert.equal(developing.lineageModules,2);
  assert.equal(developing.lineageQuality,3);
  assert.equal(specialized.lineageModules,4);
  assert.equal(specialized.lineageQuality,7);
  assert.ok(specialized.quality>plain.quality);
  assert.equal(specialized.lineageTag,"fruit");
  state.equipmentModules=["grain_screen","false_bottom","mixer","shell_condenser"];
  assert.equal(getEquipmentProfile(state,"grain").lineageQuality,7);
  state.equipmentModules=["oak_module","copper_head","glass_column","sight_glass"];
  assert.equal(getEquipmentProfile(state,"honey").lineageQuality,7);
  state.equipmentModules=["sugar_tank","stainless_column","stainless_mesh","auto_cooling"];
  assert.equal(getEquipmentProfile(state,"sugar").lineageQuality,7);
});

test("custom blend ratios change ingredient demand, output and passport", () => {
  const state=createInitialState();
  state.inventory={spirit:4,aged_spirit:3};
  state.qualityLots=[
    {item:"spirit",remaining:4,quality:86,passportId:"fresh"},
    {item:"aged_spirit",remaining:3,quality:90,passportId:"aged"}
  ];
  state.productionLog=[
    {passport:{id:"fresh",flavorProfile:{body:56,aroma:66,notes:["свежий"]}}},
    {passport:{id:"aged",flavorProfile:{body:82,aroma:75,notes:["древесный"]}}}
  ];
  const result=blendBatch(state,"house_blend",recordProduction,{a:4,b:3});
  assert.ok(result);
  assert.equal(result.output,6);
  assert.equal(state.inventory.house_blend,6);
  assert.equal(state.inventory.spirit,0);
  assert.equal(state.inventory.aged_spirit,0);
  assert.equal(state.productionLog[0].passport.ratio,"spirit:4 + aged_spirit:3");
  assert.equal(state.blendReputation,result.score);
});


test("herb and spice garden supports seasonal crops, repeat harvests and shared six-plot capacity", () => {
const state=createInitialState();state.viticulture={buildings:["berryGarden"],batches:[],nextId:1};state.skills=["berry_growing","herb_gardening"];state.world={season:"summer",weather:"cloudy"};
assert.equal(HERB_CROPS.length,6);assert.equal(GARDEN_CROPS.length,BERRY_CROPS.length+HERB_CROPS.length);
const mint=plantBerryBush(state,"mint");assert.ok(mint);for(let i=0;i<2;i++)advanceBerryGardenDay(state);assert.equal(mint.ready,true);assert.equal(harvestBerryBush(state,mint.id).harvested,3);assert.equal(mint.remaining,2);
const juniper=plantBerryBush(state,"juniper");assert.ok(juniper);for(let i=0;i<5;i++)advanceBerryGardenDay(state);assert.equal(juniper.ready,true);assert.equal(harvestBerryBush(state,juniper.id).wrongSeason,true);state.world.season="autumn";assert.equal(harvestBerryBush(state,juniper.id).harvested,2);
for(let i=0;i<4;i++)assert.ok(plantBerryBush(state,"thyme"));assert.equal(ensureBerryGarden(state).plots.length,6);assert.equal(plantBerryBush(state,"linden"),null);
});

test("laboratory herbal profiles define distinct ingredients, ratios and tincture products",()=>{
 assert.equal(Object.keys(HERBAL_FORMULAS).length,3);
 for(const [id,f] of Object.entries(HERBAL_FORMULAS)){
  assert.ok(HERB_CROPS.some(x=>x.id===f.a));
  assert.ok(HERB_CROPS.some(x=>x.id===f.b));
  assert.ok(f.target>=2);
  assert.ok(["mint_tincture","rosehip_tincture","juniper_tincture"].includes(f.product));
 }
});

test("herbal laboratory discovers a profile, records a passport and reproduces its signature tincture",()=>{
 const state=createInitialState();state.money=200;state.day=8;state.inventory={...state.inventory,mint:2,thyme:1,spirit:3,sugar:2,bottles:2,labels:2};
 state.lab={points:0,qualityBonus:30,standards:{},discoveredHerbalRecipes:[],trialLog:[],experiments:0};
 const notices=[];let xp=0;const notify=m=>notices.push(m);const earn=n=>xp+=n;
 assert.equal(runHerbalFormula(state,"herb_mint",2,1,notify,earn,false),true);
 assert.ok(state.lab.discoveredHerbalRecipes.includes("herb_mint"));
 const trial=state.lab.trialLog[0];assert.equal(trial.recipe,"herb_mint");assert.ok(trial.passportId);
 state.lab.standards.herb_mint={a:2,b:1,quality:trial.quality,trialId:trial.id,passportId:trial.passportId};
 state.inventory.mint=2;state.inventory.thyme=1;
 assert.equal(runHerbalFormula(state,"herb_mint",2,1,notify,earn,true),true);
 assert.equal(state.inventory.mint_tincture,2);
 const passport=state.productionLog.find(x=>x.name==="Мятно-чабрецовая настойка");
 assert.ok(passport);assert.equal(passport.recipeId,"herb_mint");assert.equal(passport.ratio,"2:1");
 assert.ok(xp>0);assert.ok(notices.length>=2);
});


test("tincture blending creates distinct signature products with weighted flavor passports",()=>{
 const state=createInitialState();state.money=500;
 state.inventory={blackcurrant_tincture:4,raspberry_tincture:3,mint_tincture:4,juniper_tincture:3,meadow_tincture:4,rosehip_tincture:3};
 state.qualityLots=[
  {item:"blackcurrant_tincture",remaining:4,quality:90,passportId:"bc"},
  {item:"raspberry_tincture",remaining:3,quality:86,passportId:"ra"},
  {item:"mint_tincture",remaining:4,quality:92,passportId:"mi"},
  {item:"juniper_tincture",remaining:3,quality:88,passportId:"ju"},
  {item:"meadow_tincture",remaining:4,quality:89,passportId:"me"},
  {item:"rosehip_tincture",remaining:3,quality:91,passportId:"ro"}
 ];
 state.productionLog=[
  ...[["bc",["смородина"],76,88],["ra",["малина"],68,91],["mi",["мята"],58,92],["ju",["можжевельник"],84,90],["me",["луговые травы"],66,89],["ro",["шиповник"],74,84]].map(([id,notes,body,aroma])=>({passport:{id,flavorProfile:{notes,body,aroma}}}))
 ];
 const berry=blendBatch(state,"berry_tincture_blend",recordProduction,{a:3,b:2});
 assert.ok(berry);assert.equal(berry.recipe.item,"berry_reserve_tincture");assert.equal(state.inventory.berry_reserve_tincture,4);
 assert.ok(berry.profile.notes.includes("ягодный бархат"));
 const passport=state.productionLog.find(x=>x.passport?.product==="berry_reserve_tincture").passport;
 assert.equal(passport.type,"signature");assert.ok(passport.flavorProfile.aroma>70);
 const herb=blendBatch(state,"herbal_tincture_blend",recordProduction,{a:2,b:1});
 assert.ok(herb);assert.equal(state.inventory.herbal_spice_tincture,2);
 state.blendStandards??={};state.blendStandards.berry_tincture_blend={a:3,b:2,quality:berry.score,passportId:berry.passportId};
 assert.equal(state.blendStandards.berry_tincture_blend.a,3);
 const meadow=blendBatch(state,"meadow_tincture_blend",recordProduction,{a:2,b:1});
 assert.ok(meadow);assert.equal(state.inventory.meadow_reserve_tincture,2);
});


test("multi-apparatus production plant runs independent staged batches", () => {
  const state=createInitialState();
  state.buildings.workshop=2;
  state.inventory.braga=6;
  state.inventory.fruit_braga=3;
  const plant=ensureProductionPlant(state);
  assert.equal(plant.units.length,1);
  assert.equal(getStillCapacity(state),3);
  const first=plant.units[0];
  assert.equal(startStillBatch(state,first.id,"sugar"),true);
  assert.equal(startStillBatch(state,first.id,"fruit"),false);
  plant.units.push({id:2,name:"Аппарат №2",model:"stainless",maintenance:100,active:null});
  assert.equal(startStillBatch(state,2,"fruit"),true);
  assert.equal(state.inventory.braga,3);
  assert.equal(state.inventory.fruit_braga,0);
  const choices=["careful","balanced","careful"];
  for(const choice of choices)resolveStillChoice(first.active,choice);
  assert.equal(first.active.ready,true);
  assert.ok(first.active.output>=1);
  assert.equal(plant.units[1].active.ready,false);
  assert.equal(STILL_MODELS.stainless.output,1);
});


test("cellar barrels age separate batches, apply wood profiles and preserve quality",()=>{
  const state=createInitialState();
  state.viticulture={buildings:["wineCellar"],batches:[],nextId:1};
  state.inventory.spirit=2;
  state.inventory.honey_spirit=1;
  state.qualityLots=[{item:"spirit",remaining:2,quality:76,passportId:null},{item:"honey_spirit",remaining:1,quality:81,passportId:null}];
  const cellar=ensureCellar(state);
  assert.equal(cellar.barrels.length,2);
  assert.equal(startAging(state,1,"spirit"),true);
  assert.equal(startAging(state,2,"honey_spirit"),true);
  assert.equal(state.inventory.spirit,1);
  for(let i=0;i<4;i++)ageBarrelsOneDay(state,()=>{});
  assert.equal(cellar.barrels[0].active.ready,true);
  assert.equal(Boolean(cellar.barrels[1].active.ready),false);
  const aged=cellar.barrels[0].active;
  assert.ok(aged.quality>76);
  assert.ok(aged.flavorProfile.notes.includes(BARREL_WOODS.oak.note));
  ageBarrelsOneDay(state,()=>{});
  assert.equal(cellar.barrels[1].active.ready,true);
});
