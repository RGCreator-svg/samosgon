/**
 * Единственная точка перехода к следующему игровому дню.
 * Порядок фаз важен: сначала мир и системы производства,
 * затем потребности героя и события нового дня.
 */
export function advanceGameDay(state, systems) {
  state.day = Math.max(1, Number(state.day) || 1) + 1;
  state.skills = Array.isArray(state.skills) ? state.skills : [];
  state.production ??= { active: false, ready: false, daysLeft: 0 };
  state.production.active = Boolean(state.production.active);
  state.production.daysLeft = Number(state.production.daysLeft) || 0;

  const phases = [
    ["Заказы", () => systems.advanceOrdersDay(state, systems.notify)],
    ["Доставки", () => systems.advanceDeliveries(state, systems.notify)],
    ["Расширение производства", () => systems.advanceExpansionDay(state, systems.notify)],
    ["Мир и погода", () => systems.advanceWorldDay(state, systems.notify)],
    ["Исследования", () => systems.advanceResearchLabDay(state, systems.notify, systems.earnExperience)],
    ["Производственные системы", () => systems.advanceFeaturePackDay(state, systems.notify)],
    ["Винодельня", () => systems.advanceViticultureDay(state, systems.notify)],
    ["Производственный цех", () => systems.advanceProductionPlantDay(state, systems.notify)]
  ];

  for (const [name, run] of phases) {
    try {
      run();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error("Фаза «" + name + "»: " + reason, { cause: error });
    }
  }

  const hungerLoss = state.skills.includes("country_life") ? 5 : 10;
  const warmthLoss = (state.skills.includes("country_life") ? 2 : 5) + systems.getWorldColdPenalty(state);
  const energyGain = state.skills.includes("good_sleep") ? 100 : 70;

  state.hunger = Math.max(0, (Number(state.hunger) || 0) - hungerLoss);
  state.warmth = Math.max(0, (Number(state.warmth) || 0) - warmthLoss);
  state.energy = Math.min(100, (Number(state.energy) || 0) + energyGain);

  if (state.production.active) {
    state.production.daysLeft -= 1;
    if (state.production.daysLeft <= 0) {
      state.production.active = false;
      state.production.ready = true;
      systems.notify("Брага готова! В сарае пахнет успехом и дрожжами.");
    }
  }

  if (state.hunger === 0) {
    state.energy = Math.max(0, state.energy - 10);
    systems.notify("Вы голодны. Желудок уже рассматривает вариант увольнения.");
  }

  if (state.warmth === 0) {
    state.energy = Math.max(0, state.energy - 10);
    systems.notify("Вы замёрзли. Надо бы заняться домом, а не только бизнесом.");
  }

  systems.earnExperience(5);
  systems.startNewDay(state, systems.notify);
  return state;
}
