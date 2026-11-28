
import { ITEMS, SKILL_BRANCHES } from "./data.js";
import { getStorageCapacity } from "./economy.js";

const $ = (selector) => document.querySelector(selector);

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

function setBar(selector, value) {
  const element = $(selector);
  if (element) {
    element.style.width = `${Math.max(0, Math.min(100, value))}%`;
  }
}

export function renderHUD(state) {
  setText("#day", state.day);
  setText("#money", state.money);
  setText("#level", state.level);
  const seasonNames = { spring:"Весна", summer:"Лето", autumn:"Осень", winter:"Зима" };
  const season = state.world?.season;
  setText("#hudSeason", seasonNames[season] || "Усадьба");
  setText("#sceneSeasonCaption", `${seasonNames[season] || "Деревня"} · день ${state.day}`);
}

export function renderNeeds(state) {
  setText("#hungerValue", state.hunger);
  setText("#energyValue", state.energy);
  setText("#warmthValue", state.warmth);

  setBar("#hungerBar", state.hunger);
  setBar("#energyBar", state.energy);
  setBar("#warmthBar", state.warmth);
}

const GRISHKA_ADVICE = [
  {
    id: "low-energy",
    when: state => Number(state.energy) <= 20,
    text: "Внучок, присядь. С таким запасом сил ты даже сорняк не напугаешь. Передохни."
  },
  {
    id: "low-hunger",
    when: state => Number(state.hunger) <= 20,
    text: "Живот урчит громче старого трактора. Найди, чем подкрепиться, а то скоро сам себя съешь."
  },
  {
    id: "cold",
    when: state => Number(state.warmth) <= 20,
    text: "У тебя в доме тепла меньше, чем в сердце налогового инспектора. Займись хозяйством и утеплением."
  },
  {
    id: "poor",
    when: state => Number(state.money) < 20,
    text: "Кошелёк опять похудел? Не трать последнее на блестящие железки — сначала продай урожай."
  },
  {
    id: "orders-ready",
    when: state => (state.orders?.active || []).some(order => Number(state.inventory?.[order.itemId]) >= Number(order.quantity) && Number(state.day) <= Number(order.deadline)),
    text: "Соседский заказ уже можно сдать. Загляни на доску объявлений и забери оплату с опытом — товар как раз в наличии."
  },
  {
    id: "orders-deadline",
    when: state => (state.orders?.active || []).some(order => Number(order.deadline) - Number(state.day) <= 1),
    text: "У заказа поджимает срок. Проверь доску: просрочка бьёт по репутации, а соседям ждать некогда."
  },
  {
    id: "water-development",
    when: state => Number(state.waterSystem?.level || 0) < 3 && Number(state.day) >= 2,
    text: "Вода сама к грядкам не побежит. На главной усадьбе посмотри следующий этап водоснабжения и проверь, каких деталей не хватает."
  },
  {
    id: "ready-braga",
    when: state => Boolean(state.production?.ready),
    text: "Эй, мастер! Бочка уже своё отработала. Забирай брагу, пока она не решила стать уксусом."
  },
  {
    id: "fermenting",
    when: state => Boolean(state.production?.active),
    text: "Пусть бочка спокойно булькает. А ты пока займись огородом или проверь заказы."
  },
  {
    id: "repair-still",
    when: state => Number(state.still) < 35,
    text: "Аппарат выглядит так, будто пережил три свадьбы и один пожар. Подлатай его до следующей партии."
  },
  {
    id: "repair-barn",
    when: state => Number(state.barn) < 35,
    text: "Сарай держится на честном слове и паутине. Чуть ремонта — и работать станет спокойнее."
  },
  {
    id: "repair-house",
    when: state => Number(state.house) < 30,
    text: "Дом у тебя пока больше похож на декорацию к фильму про зиму. Не забудь про ремонт."
  },
  {
    id: "garden",
    when: state => Number(state.garden) < 20,
    text: "Грядки заросли так, что картошку пора искать с компасом. Расчисти огород — будет урожай."
  },
  {
    id: "orchard",
    when: state => !state.orchardRestored && Number(state.day) >= 3 && Number(state.money) >= 40,
    text: "За домом сад пропадает. Сорок монет — и яблони снова начнут приносить пользу. Я бы сам расчистил, да спина."
  },
  {
    id: "full-warehouse",
    when: state => {
      const total = Object.values(state.inventory || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
      return total >= getStorageCapacity(state) * 0.9;
    },
    text: "На складе уже яблоку негде упасть. Продай лишнее или расширь хранилище, а то урожай пойдёт жить на улицу."
  },
  {
    id: "unspent-points",
    when: state => Number(state.skillPoints) >= 2,
    text: "У тебя очки навыков копятся, а ты всё тянешь. Загляни в дерево умений — знания сами в голову не заползут."
  },
  {
    id: "automation",
    when: state => Number(state.automationTier) > 0,
    text: "Вот это я понимаю — хозяйство работает само! Только не забывай поглядывать на оборудование. Железо обидчивое."
  },
  {
    id: "equipment",
    when: state => Number(state.equipmentTier) > 0,
    text: "Новое оборудование — это хорошо. Теперь бы научиться выжимать из него толк, а не только хвастаться соседям."
  },
  {
    id: "orchard-restored",
    when: state => Boolean(state.orchardRestored) && Number(state.trees) > 0,
    text: "Сад ожил — красота! Не забывай собирать фрукты. Деревья, конечно, терпеливые, но не до бесконечности."
  },
  {
    id: "first-skills",
    when: state => (state.skills || []).length >= 5,
    text: "Гляжу, мастер растёт! Пять навыков — уже не просто деревенский турист. Скоро и мне советовать будет нечего."
  },
  {
    id: "day-progress",
    when: state => Number(state.day) >= 10,
    text: "Десятый день пошёл, а хозяйство ещё стоит! Бабушка бы сказала: «Главное — не зазнавайся и крышу проверь»."
  }
];

const GRISHKA_VARIANTS = {
  "low-energy": [
    "Сбавь обороты, внучок. Даже трактор иногда глохнет — и ничего, его не стыдят.",
    "Энергия на донышке? Присядь, попей воды. Грядки никуда не убегут, они привязаны.",
    "Ты работаешь так, будто за тобой гонится налоговая. Отдохни немного."
  ],
  "low-hunger": [
    "Сначала поешь, потом геройствуй. Голодный хозяин и прибыль посчитает неправильно.",
    "Живот урчит? Это не двигатель прогресса, это просьба о каше.",
    "Не путай экономию с голодом. Даже лопате нужен хозяин сытый."
  ],
  cold: [
    "В доме холоднее, чем у Петровича после разговора о долгах. Подкинь дров и займись ремонтом.",
    "Если зубы стучат — это не музыкальный талант. Утепляйся.",
    "Тепло в доме — это не роскошь. Роскошь — это когда сквозняк платит аренду."
  ],
  poor: [
    "Монеты считают тишину, внучок. Продай что-нибудь с урожая, а потом мечтай о колонне.",
    "Кошелёк пустой, зато амбиций на три района. Начни с торговли.",
    "Не покупай блестящую железку на последние деньги. Железка не сварит тебе суп."
  ],
  "ready-braga": [
    "Бочка уже отработала смену! Забирай результат, пока дрожжи не потребовали отпуск.",
    "Слышишь бульканье? Это не бабушкин самовар. Брага готова — освободи ёмкость.",
    "Пора собирать брагу. Не заставляй её ждать, у неё тоже планы на жизнь."
  ],
  fermenting: [
    "Пусть бочка трудится. А ты пока проверь запасы — дрожжи не любят пустой склад.",
    "Брожение идёт своим чередом. Не заглядывай туда каждые пять минут, она стесняется.",
    "Пока булькает — займись огородом или ремонтом. Хозяйство само себя не починит."
  ],
  "repair-still": [
    "Аппарат кашляет громче деда после бани. Подремонтируй его до следующей партии.",
    "Не проси старый аппарат работать на честном слове. Честное слово прокладку не заменит.",
    "Сначала приведи железо в чувство, потом запускай производство."
  ],
  "repair-barn": [
    "Сарай держится на паутине и оптимизме. Подкинь ему немного ремонта.",
    "Если крыша смотрит на тебя с укором — это не семейная драма, это ремонт.",
    "В сарае сквозняк такой, что инструменты сами уходят зимовать. Почини стены."
  ],
  "repair-house": [
    "Дом просит ремонта. И желательно не только морального.",
    "Бабушкин дом ещё крепкий духом, но доски уже пишут завещание.",
    "Почини дом, внучок. Иначе зимой будешь спать в куртке и характере."
  ],
  garden: [
    "Сорняки уже завели там своё правительство. Пора вернуть огороду законную власть.",
    "Грядки заросли. Картошку скоро придётся искать по объявлению.",
    "Расчисти огород — земля отблагодарит. Ну, хотя бы не будет цепляться за сапоги."
  ],
  orchard: [
    "Сад — это не просто деревья, это будущие пироги и прибыль. Верни его к жизни.",
    "Яблони ждут. Если затянешь, они решат, что ты городской.",
    "Сорок монет за сад — хорошая сделка. У Петровича за эти деньги только совет купишь."
  ],
  "full-warehouse": [
    "Склад трещит по швам. Продай лишнее или расширься — урожай на полу не хранится.",
    "Запасы уже занимают проход. Скоро придётся входить в сарай боком.",
    "Склад забит. Хватит коллекционировать картошку, пора превращать её в деньги."
  ],
  "unspent-points": [
    "Очки навыков сами себя не потратят. Загляни в дерево — там есть чему поучиться.",
    "Знания — единственное, что у соседа не получится одолжить без спроса.",
    "Не держи навыки про запас, внучок. Это не консервация."
  ],
  automation: [
    "О, автоматика! Теперь можно меньше бегать и больше смотреть, как всё работает. Почти отпуск.",
    "Механизмы трудятся, а ты присматривай. Умная система тоже иногда делает глупости.",
    "Вот это прогресс! Только не называй автоматизацию волшебством — она любит обслуживание."
  ],
  equipment: [
    "Новое железо — новые возможности. Главное, не пытайся чинить его молотком с размаху.",
    "Апгрейд хорош. Теперь бы освоить его, а не только показывать соседям.",
    "Техника стала серьёзнее. Надеюсь, и хозяин подтянется."
  ],
  "orchard-restored": [
    "Сад ожил! Яблони уже шепчутся, что в этом году будет урожай.",
    "Вот это красота. Деревья стоят, птицы поют, а Петрович уже присматривается к яблокам.",
    "Сад восстановлен — теперь собирай плоды, а не только любуйся."
  ],
  "first-skills": [
    "Пять навыков! Ещё немного — и начнёшь мне советы раздавать. Только не наглей.",
    "Вижу, учёба пошла впрок. Бабушка говорила: умная голова и руки не боятся.",
    "Мастер растёт. Скоро сам сможешь объяснять Петровичу, почему он неправ."
  ],
  "day-progress": [
    "Десятый день! Хозяйство уже не развалилось — это серьёзная победа.",
    "Столько дней в деревне, а ты всё ещё не сбежал. Начинаю уважать.",
    "День за днём — и хозяйство крепнет. Только крышу проверяй, привычка полезная.",
    "Ты уже почти местный. Осталось научиться отличать трактор Петровича от его долгов.",
    "Хозяйство растёт! Скоро соседи начнут просить советы. Не соглашайся — это ловушка.",
    "Если сегодня всё идёт по плану, проверь план. Бабушка говорила, что так надёжнее.",
    "Я вижу прогресс. Даже курица перестала смотреть на тебя как на временного жильца."
  ]
};

const GRISHKA_EVENT_REACTIONS = [
  { test: /Продано:|Получено .*монет|продажа/i, mood: "happy", lines: ["Ха! Деньги звякнули — музыка для настоящего хозяина.", "Продажа прошла! Запомни цену и не рассказывай Петровичу, сколько заработал.", "Вот так и растёт хозяйство: урожай в дело, монеты в сундук."] },
  { test: /Брага готова|готовая брага/i, mood: "happy", lines: ["Есть результат! Забирай брагу, не заставляй бочку скучать.", "Бульк-бульк — и готово. Вот за это я люблю терпение.", "Отлично! Только не перепутай готовую партию с компотом."] },
  { test: /поставлена|Поставить брагу|Брожение/i, mood: "thinking", lines: ["Началось! Теперь главное — не трясти бочку и не задавать ей лишних вопросов.", "Партия поставлена. Запиши день, чтобы потом не гадать по пузырькам.", "Дрожжи приступили к работе. У них дисциплина лучше, чем у Петровича."] },
  { test: /Изучен навык|Новый уровень/i, mood: "happy", lines: ["Новое умение! Голова работает — уже половина успеха.", "Поздравляю, внучок. Знания — капитал, который не сгниёт в сарае.", "Так держать! Ещё один шаг от новичка к мастеру."] },
  { test: /Сад восстановлен|Сад ожил/i, mood: "happy", lines: ["Яблони снова в строю! Скоро будем считать урожай, а не пни.", "Вот это дело! Сад теперь не стыдно и гостям показать.", "Хорошая работа. Петрович уже наверняка точит корзину."] },
  { test: /починен|укреплён|ремонт/i, mood: "happy", lines: ["Крепче стало! Хороший хозяин сначала чинит, потом хвастается.", "Молоток сегодня не зря ел хлеб. Отличная работа.", "Ещё одна дырка побеждена. Дом потихоньку становится домом."] },
  { test: /Склад забит|Склад переполнен|места на складе/i, mood: "worried", lines: ["Тревога! Скоро придётся хранить картошку в карманах. Освободи место.", "Склад не резиновый. Продай лишнее или расширяйся.", "Не превращай сарай в музей запасов — освободи проход."] },
  { test: /заказ|доставк|посылк/i, mood: "thinking", lines: ["Заказы — дело серьёзное. Проверь сроки, чтобы покупатель не состарился в ожидании.", "Торговля пошла! Следи за доставками и не теряй накладные.", "Покупатель любит две вещи: товар и когда он приехал вовремя."] },
  { test: /Не хватает денег|не хватает монет|денег на/i, mood: "worried", lines: ["Похоже, бюджет сказал «до свидания». Сначала заработай, потом покупай.", "Монеты не растут на яблонях. Хотя с твоим садом стоило бы проверить.", "Отложи покупку и найди, что можно выгодно продать."] },
  { test: /Аппарат|оборудовани|колонн/i, mood: "thinking", lines: ["С железом аккуратнее. Оно любит точность, а не крепкое деревенское слово.", "Техника — штука полезная, пока за ней следят. Проверяй состояние.", "Каждая новая деталь должна приносить пользу, а не просто блестеть."] },
  { test: /Перегонка завершена|спирта-сырца/i, mood: "thinking", lines: ["Вот это уже технологический подход! Запиши качество партии, пригодится для сравнения.", "Смотри-ка, освоил новый этап. Только не зазнавайся — железо любит уход.", "Качество получилось? Отлично. Теперь подумай, как его сохранить и улучшить."] },
  { test: /Выбрана специализация/i, mood: "happy", lines: ["Выбрал своё ремесло — это серьёзный шаг. Теперь развивай сильную сторону.", "Специалистом становятся не по вывеске, а по результатам. Покажи, на что способен.", "Хороший выбор, внучок. Только помни: мастерство требует постоянства."] },
  { test: /Бочка выдержки готова|Выдержанный продукт/i, mood: "happy", lines: ["Терпение окупилось! Хорошая выдержка любит тишину и порядок.", "Бочка своё отработала. Теперь продукт дороже, а ты — мудрее.", "Вот и дождались. Не торопись продавать всё сразу, смотри на рынок."] },
  { test: /Новое событие|Решение принято|Ярмарка|Внезапный спрос/i, mood: "thinking", lines: ["Событие — это не беда, а проверка смекалки. Выбирай с холодной головой.", "В деревне каждый день что-нибудь да случается. Главное — не терять выгоду.", "Подумай о последствиях. Не всякая блестящая возможность золотая."] },
  { test: /Построено:|Теплица|Пасека|Поливочная система/i, mood: "happy", lines: ["Хозяйство расширяется! Скоро у тебя будет больше помощников, чем у председателя.", "Хорошее вложение. Теперь земля будет работать даже пока ты спишь.", "Вот это развитие! Только не забывай собирать то, что растёт."] }
];

let grishkaReactionCount = 0;
let pendingGrishkaReaction = null;

export function reactGrishkaToEvent(message) {
  const reaction = GRISHKA_EVENT_REACTIONS.find(entry => entry.test.test(String(message)));
  if (!reaction) return;

  const line = reaction.lines[grishkaReactionCount % reaction.lines.length];
  grishkaReactionCount += 1;

  pendingGrishkaReaction = { line, mood: reaction.mood };
  const tip = $("#grishkaTip");
  const advisor = tip?.closest(".game-advisor");
  if (tip) {
    tip.textContent = `«${line}»`;
    tip.dataset.advice = "event-reaction";
    tip.dataset.event = reaction.mood;
  }
  if (advisor) {
    advisor.classList.remove("mood-worried", "mood-happy", "mood-thinking", "mood-neutral", "reaction-pop");
    advisor.classList.add(`mood-${reaction.mood}`, "reaction-pop");
    advisor.dataset.mood = reaction.mood;
  }
}

const GRISHKA_DEFAULT_LINES = [
  "Не суетись, внучок. Сначала одно дело доведи до ума, потом хватайся за три следующих.",
  "Хорошее хозяйство строится не за день. Хотя сарай у соседа рухнул за минуту — рекорд, между прочим.",
  "Запомни: если план не сработал, это не провал. Это бесплатный урок с дымом и запахом палёного.",
  "Деньги любят счёт, а деревенские слухи — скорость. Смотри, чтобы второе не обогнало первое.",
  "Бабушка говорила: инструмент держи сухим, запасы — полными, а обещания соседям — осторожными.",
  "Вон сколько дел вокруг. Выбери самое полезное, а не то, которое громче скрипит."
];

export function renderAdvisor(state) {
  const tip = $("#grishkaTip");
  if (!tip) return;

  const reaction = pendingGrishkaReaction;
  pendingGrishkaReaction = null;
  const advice = GRISHKA_ADVICE.find(entry => entry.when(state));
  const variants = advice && GRISHKA_VARIANTS[advice.id];
  const line = reaction
    ? reaction.line
    : variants
      ? variants[(Math.max(1, Number(state.day) || 1) - 1) % variants.length]
      : advice
        ? advice.text
        : GRISHKA_DEFAULT_LINES[Math.abs(Number(state.day) || 1) % GRISHKA_DEFAULT_LINES.length];

  const adviceId = reaction ? "event-reaction" : advice?.id || "general";
  tip.textContent = `«${line}»`;
  tip.dataset.advice = adviceId;

  // Меняем настроение портрета вместе с текущим советом.
  const advisor = tip.closest(".game-advisor");
  if (advisor) {
    advisor.classList.remove("mood-worried", "mood-happy", "mood-thinking", "mood-neutral", "reaction-pop");

    const worried = ["low-energy", "low-hunger", "cold", "poor", "orders-deadline", "repair-still", "repair-barn", "repair-house", "garden", "full-warehouse"];
    const happy = ["orchard-restored", "automation", "equipment", "first-skills"];
    const thinking = ["ready-braga", "fermenting", "unspent-points", "orchard", "water-development"];

    const mood = reaction
      ? `mood-${reaction.mood}`
      : worried.includes(adviceId)
        ? "mood-worried"
        : happy.includes(adviceId)
          ? "mood-happy"
          : thinking.includes(adviceId)
            ? "mood-thinking"
            : "mood-neutral";

    advisor.classList.add(mood);
    advisor.dataset.mood = mood.replace("mood-", "");
    if (reaction) advisor.classList.add("reaction-pop");
  }
}

export function renderXP(state) {
  const xpNeeded = 100;
  const currentXP = Math.max(0, Number(state.xp) || 0);
  const progress = (currentXP / xpNeeded) * 100;

  setText("#xpValue", currentXP);
  setText("#xpNext", xpNeeded);
  setText("#skillXpValue", currentXP);
  setText("#skillXpNext", xpNeeded);
  setBar("#xpBar", progress);
}

export let warehouseStateRef = null;
let warehouseShowEmpty = false;

const WAREHOUSE_GROUPS = [
  { id: "farm", title: "🌱 Урожай и сырьё", items: ["potato", "carrot", "cabbage", "apple", "pear", "grapes", "honey", "blackcurrant", "raspberry", "blueberry", "cranberry", "mint", "st_johns_wort", "thyme", "linden", "rosehip", "juniper"] },
  { id: "fermentation", title: "🫙 Брожение", items: ["braga", "fruit_braga", "grain_braga", "honey_braga"] },
  { id: "products", title: "⚗️ Готовая продукция", items: ["spirit", "aged_spirit", "honey_spirit", "aged_honey_spirit", "wine", "mead", "apple_cider", "pear_wine", "fruit_wine", "orchard_blush", "golden_vintage", "pear_honey_reserve", "blackcurrant_tincture", "raspberry_tincture", "blueberry_tincture", "forest_tincture", "mint_tincture", "meadow_tincture", "juniper_tincture", "rosehip_tincture"] },
  { id: "supplies", title: "🧰 Материалы и тара", items: ["yeast", "yeast_nutrient", "water", "bottles", "corks", "labels"] }
];

function renderWarehouse(state) {
  const warehouse = $("#warehouseItems");
  if (!warehouse) return;
  warehouseStateRef = state;

  const search = $("#warehouseSearch");
  const showEmpty = $("#warehouseShowEmpty");
  if (showEmpty && !showEmpty.dataset.bound) {
    showEmpty.dataset.bound = "true";
    showEmpty.addEventListener("change", () => {
      warehouseShowEmpty = showEmpty.checked;
      if (warehouseStateRef) renderWarehouse(warehouseStateRef);
    });
  }
  if (search && !search.dataset.bound) {
    search.dataset.bound = "true";
    search.addEventListener("input", () => {
      if (warehouseStateRef) renderWarehouse(warehouseStateRef);
    });
  }
  if (showEmpty) showEmpty.checked = warehouseShowEmpty;

  const openGroups = new Set([...warehouse.querySelectorAll("details[open]")].filter(node => node.dataset.autoOpened !== "true").map(node => node.dataset.group));
  const query = (search?.value || "").trim().toLocaleLowerCase("ru");
  warehouse.replaceChildren();

  const total = Object.values(state.inventory || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  setText("#warehouseTotal", `${total} / ${getStorageCapacity(state)} шт.`);

  const groupedIds = new Set(WAREHOUSE_GROUPS.flatMap(group => group.items));
  const groups = [...WAREHOUSE_GROUPS, {
    id: "other", title: "📦 Прочее",
    items: ITEMS.filter(item => !groupedIds.has(item.id)).map(item => item.id)
  }];

  groups.forEach(group => {
    const entries = group.items
      .map(id => ITEMS.find(item => item.id === id))
      .filter(Boolean)
      .filter(item => {
        const quantity = Math.max(0, Number(state.inventory?.[item.id]) || 0);
        return (warehouseShowEmpty || quantity > 0) &&
          (!query || item.name.toLocaleLowerCase("ru").includes(query) || item.id.includes(query));
      });
    if (!entries.length) return;

    const count = entries.reduce((sum, item) => sum + Math.max(0, Number(state.inventory?.[item.id]) || 0), 0);
    const section = document.createElement("details");
    section.className = "warehouse-category";
    section.dataset.group = group.id;
    section.dataset.autoOpened = query ? "true" : "false";
    section.open = openGroups.has(group.id) || (!!query && entries.length > 0);

    const summary = document.createElement("summary");
    summary.className = "warehouse-category-summary";
    const title = document.createElement("strong");
    title.textContent = group.title;
    const meta = document.createElement("span");
    meta.textContent = `${entries.length} поз. · ${count} шт.`;
    summary.append(title, meta);

    const list = document.createElement("div");
    list.className = "warehouse-grid";
    entries.forEach(item => {
      const quantity = Math.max(0, Number(state.inventory?.[item.id]) || 0);
      const iconFile = ({
        braga: "flaticon-filter.png", fruit_braga: "flaticon-filter.png", grain_braga: "flaticon-filter.png", honey_braga: "flaticon-filter.png",
        spirit: "flaticon-distillation.png", honey_spirit: "flaticon-distillation.png", aged_spirit: "icon_barrel.png", aged_honey_spirit: "icon_barrel.png",
        water: "flaticon-kettle.png"
      })[item.id];
      const card = document.createElement("div");
      card.className = `warehouse-item${quantity === 0 ? " is-empty" : ""}`;
      const icon = iconFile ? document.createElement("img") : document.createElement("span");
      icon.className = "warehouse-icon";
      if (iconFile) { icon.src = "assets/images/ui/" + iconFile; icon.alt = ""; icon.loading = "lazy"; }
      else icon.textContent = item.emoji;
      const name = document.createElement("span");
      name.className = "warehouse-name";
      name.textContent = item.name;
      const amount = document.createElement("b");
      amount.className = "warehouse-count";
      amount.textContent = `${quantity} шт.`;
      card.append(icon, name, amount);
      list.append(card);
    });
    section.append(summary, list);
    warehouse.append(section);
  });

  if (!warehouse.children.length) {
    const empty = document.createElement("p");
    empty.className = "warehouse-empty";
    empty.textContent = query ? "По этому запросу ничего не найдено." : "На складе пока пусто. Первые запасы появятся после сбора урожая или закупки.";
    warehouse.append(empty);
  }
}

export function renderProduction(state) {
  const status = $("#productionStatus");

  if (status) {
    if (state.production.ready) {
      status.textContent =
        "Брага готова! Бочка подозрительно булькает.";
    } else if (state.production.active) {
      status.textContent =
        `Идёт брожение. Осталось дней: ${state.production.daysLeft}.`;
    } else {
      status.textContent = "Пока ничего не бродит. Даже настроение.";
    }
  }

  const start = $("#startBatch");
  const collect = $("#collectBatch");

  if (start) {
    start.disabled =
      !state.skills.includes("ferment") ||
      state.production.active ||
      state.production.ready ||
      state.money < 10 ||
      state.energy < 10;
  }

  if (collect) {
    collect.disabled = !state.production.ready;
  }
}

export function renderMarket(state) {
  const market = $("#marketItems");
  const inventory = $("#inventory");

  if (!market || !inventory) return;

  market.innerHTML = "";

  ITEMS.forEach((item) => {
    const quantity = state.inventory[item.id] || 0;

    const card = document.createElement("div");
    card.className = "market-item";

    const heading = document.createElement("h3");
    heading.textContent = `${item.emoji} ${item.name}`;

    const description = document.createElement("p");
    description.textContent = item.description;

    const stock = document.createElement("p");
    stock.textContent = `В запасе: ${quantity}`;

    const price = document.createElement("p");
    const multiplier = (state.skills.includes("bargain") ? 1.2 : 1) * (Number(state.market?.multiplier) || 1) * (state.specialization === "merchant" ? 1.1 : 1);
    const salePrice = Math.round(item.price * multiplier);
    price.textContent = `Цена: ${salePrice} монет за штуку`;

    const button = document.createElement("button");
    button.textContent = "Продать 1";
    button.disabled = quantity <= 0;
    button.dataset.sell = item.id;

    card.append(heading, description, stock, price, button);
    market.appendChild(card);
  });

  inventory.textContent = ITEMS
    .map(item => `${item.emoji} ${item.name}: ${state.inventory[item.id] || 0}`)
    .join("  |  ");
}

const GRISHKA_TIPS = [
  "Не хватает очков навыков? Продай табуретку. Всё равно на ней никто не сидит!",
  "Автоматизация — это когда железо работает, а ты делаешь вид, что так и задумано.",
  "Улучшай мастерскую! Если задымилось — значит, прогресс пошёл. Наверное.",
  "Секрет урожая? Разговаривай с картошкой. Но деньги ей не одалживай.",
  "Вложись в механику. Молоток — это не универсальный инструмент. Это образ жизни.",
  "Торговля проста: сначала назови цену, потом перестань смеяться.",
  "Изучи выживание. Особенно навык «не есть семена на посадку».",
  "Бабушка говорила: если деталь осталась лишней — значит, ты собрал что-то новое."
];


export function renderSkills(state) {
  const tree = $("#skillTree");
  if (!tree) return;
  setText("#skillPoints", state.skillPoints);
  tree.replaceChildren();

  const icons = ["🌱", "🫙", "⚙️", "🤖", "🪙", "🔥", "🍇", "🧪", "🏭"];
  SKILL_BRANCHES.forEach((branch, branchIndex) => {
    const card = document.createElement("section");
    card.className = "skill-branch skill-branch-list";
    const unlockedCount = branch.skills.filter(skill => state.skills.includes(skill.id)).length;

    const heading = document.createElement("div");
    heading.className = "skill-branch-heading";
    const title = document.createElement("h3");
    title.textContent = `${icons[branchIndex] || "✨"} ${branch.name.replace(/^\p{Emoji_Presentation}\s*/u, "")}`;
    const progress = document.createElement("span");
    progress.className = "skill-branch-progress";
    progress.textContent = `${unlockedCount} / ${branch.skills.length}`;
    heading.append(title, progress);
    card.append(heading);

    const track = document.createElement("div");
    track.className = "skill-branch-track";
    branch.skills.forEach((skill, index) => {
      const unlocked = state.skills.includes(skill.id);
      const available = !skill.requires || state.skills.includes(skill.requires);
      const requiredSkill = branch.skills.find(item => item.id === skill.requires);
      const row = document.createElement("article");
      row.className = `skill-step${unlocked ? " unlocked" : ""}${!available ? " locked" : ""}`;

      const marker = document.createElement("span");
      marker.className = "skill-step-marker";
      marker.textContent = unlocked ? "✓" : String(index + 1);
      const info = document.createElement("div");
      info.className = "skill-step-info";
      const name = document.createElement("strong");
      name.textContent = skill.name;
      const description = document.createElement("p");
      description.textContent = skill.description;
      const status = document.createElement("small");
      status.textContent = unlocked ? "Изучено" : !available
        ? `Сначала: ${requiredSkill?.name || skill.requires}`
        : `Стоимость: ${skill.cost} очк.`;
      info.append(name, description, status);

      const action = document.createElement("button");
      action.type = "button";
      action.className = "skill-step-action";
      action.dataset.skill = skill.id;
      action.textContent = unlocked ? "Открыто" : "Изучить";
      action.disabled = unlocked || !available || state.skillPoints < skill.cost;
      row.append(marker, info, action);
      track.append(row);
    });
    card.append(track);
    tree.append(card);
  });
}

export function renderWorld(state) {
  setText("#houseValue", state.house);
  setText("#barnValue", state.barn);
  setText("#stillValue", state.still);
  setText("#gardenValue", state.garden);
  setText("#orchardValue", state.orchardRestored ? 100 : 0);
  setText("#treeCount", state.trees);

  // Сезон и погода берутся из того же календаря, что влияет на урожай.
  const seasonIds = ["spring", "summer", "autumn", "winter"];
  const seasonNames = {spring:"Весна",summer:"Лето",autumn:"Осень",winter:"Зима"};
  const seasonIcons = {spring:"🌸",summer:"☀️",autumn:"🍂",winter:"❄️"};
  const dayOfYear = ((Math.max(1, Number(state.day) || 1) - 1) % 28) + 1;
  const seasonId = state.world?.season && seasonIds.includes(state.world.season)
    ? state.world.season
    : seasonIds[Math.floor((dayOfYear - 1) / 7)];
  const weatherId = state.world?.weather || "sunny";
  const seasonLabel = seasonIcons[seasonId] + " " + seasonNames[seasonId];

  const applySeasonToScene = (scene) => {
    if (!scene) return;
    scene.dataset.season = seasonId;
    scene.dataset.weather = weatherId;
    let overlay = scene.querySelector(".location-season-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "location-season-overlay";
      overlay.setAttribute("aria-hidden", "true");
      scene.append(overlay);
    }
    overlay.dataset.season = seasonId;
    overlay.dataset.weather = weatherId;
    let label = scene.querySelector(".location-season-label");
    if (!label) {
      label = document.createElement("span");
      label.className = "location-season-label";
      label.setAttribute("aria-hidden", "true");
      scene.append(label);
    }
    label.textContent = seasonLabel;
  };

  // Сцены отражают состояние хозяйства и обновляются вместе с обычным рендером.
  const homeScene = $(".homestead-scene");
  applySeasonToScene(homeScene);
  const house = Math.max(0, Math.min(100, Number(state.house) || 0));
  const houseStage = house < 40 ? "ruined" : house < 70 ? "repairing" : house < 100 ? "restored" : "complete";
  if (homeScene) {
    homeScene.dataset.houseStage = houseStage;
    homeScene.setAttribute("aria-label", ({
      ruined:"Сильно обветшавший деревенский дом, ремонт ещё не начат",
      repairing:"Деревенский дом постепенно ремонтируется",
      restored:"Отремонтированный деревенский дом, остались последние улучшения",
      complete:"Полностью восстановленный деревенский дом"
    })[houseStage]);
    const caption = homeScene.querySelector(".scene-caption strong");
    if (caption) caption.textContent = ({
      ruined:"Дом ждёт ремонта",
      repairing:"Дом постепенно оживает",
      restored:"Почти родной дом",
      complete:"Дом полностью восстановлен"
    })[houseStage];
    const status = $(".homestead-status");
    if (status) {
      status.dataset.stage = houseStage;
      status.lastChild.textContent = ({
        ruined:" Требует капитального ремонта",
        repairing:" Идёт восстановление",
        restored:" Почти готов",
        complete:" Полностью восстановлен"
      })[houseStage];
    }
  }
  const productionActive = Boolean(state.production?.active || state.mashHouse?.batches?.length || state.distillation?.active || state.viticulture?.batches?.some(batch => batch.status === "fermenting" || batch.status === "aging" || batch.daysLeft > 0));
  const productionReady = Boolean(state.production?.ready || state.mashHouse?.batches?.some(batch => Number(batch.daysLeft) <= 0));
  if (homeScene) { homeScene.dataset.production = productionReady ? "ready" : productionActive ? "active" : "idle"; }
  const farmScene = $(".farm-scene");
  applySeasonToScene(farmScene);
  if (farmScene) {
    const garden = Math.max(0, Math.min(100, Number(state.garden) || 0));
    const farmStage = garden < 20 ? "overgrown" : garden < 60 ? "cleared" : garden < 90 ? "cultivated" : "lush";
    farmScene.dataset.stage = farmStage;
    const farmSign = farmScene.querySelector(".loc-sign span");
    if (farmSign) farmSign.textContent = ({overgrown:"Сорняки захватили грядки",cleared:"Участок расчищен",cultivated:"Пошли первые всходы",lush:"Зелёный урожайный огород"})[farmStage];
    const farmTag = $("#farm .location-tag");
    if (farmTag) farmTag.textContent = ({overgrown:"🌿 Требует расчистки",cleared:"🪴 Земля подготовлена",cultivated:"🌱 Посадки растут",lush:"🥕 Огород процветает"})[farmStage];
  }

  const orchardScene = $(".orchard-scene");
  applySeasonToScene(orchardScene);
  if (orchardScene) {
    const orchardStage = state.orchardRestored ? "restored" : "wild";
    orchardScene.dataset.stage = orchardStage;
    const orchardSign = orchardScene.querySelector(".loc-sign span");
    if (orchardSign) orchardSign.textContent = state.orchardRestored ? "Яблони и груши снова плодоносят" : "Заросли скрывают старые деревья";
    const orchardTag = $("#orchard .location-tag");
    if (orchardTag) orchardTag.textContent = state.orchardRestored ? "🍎 Сад цветёт и плодоносит" : "🌳 Заброшенные деревья";
  }

  const barnScene = $(".barn-scene");
  applySeasonToScene(barnScene);
  if (barnScene) {
    const barn = Math.max(0, Math.min(100, Number(state.barn) || 0));
    const barnStage = barn < 35 ? "ruined" : barn < 70 ? "repairing" : "workshop";
    barnScene.dataset.stage = barnStage;
    const barnSign = barnScene.querySelector(".loc-sign span");
    if (barnSign) barnSign.textContent = ({ruined:"Нужен серьёзный ремонт",repairing:"Постепенно приводим в порядок",workshop:"Чистая и оборудованная мастерская"})[barnStage];
    const barnTag = $("#barn .location-tag");
    if (barnTag) barnTag.textContent = ({ruined:"🪚 Требует ремонта",repairing:"🔧 Идёт восстановление",workshop:"🛠 Мастерская готова"})[barnStage];
  }

  setText(
    "#homeDescription",
    state.house >= 100
      ? "Дом полностью восстановлен: крыша не течёт, стены утеплены, окна целы. Теперь здесь действительно можно жить."
      : state.house >= 70
        ? "Дом уже выглядит уютно. Остались последние штрихи: отделка, мелкий ремонт и защита от сквозняков."
        : state.house >= 40
          ? "Дом постепенно оживает: стены укреплены, но крыша и окна всё ещё требуют внимания."
          : "Дом сильно обветшал: повреждена крыша, стены потемнели от времени, часть окон разбита. Пора начинать ремонт."
  );

  setText(
    "#barnDescription",
    state.barn >= 70
      ? "Сарай держится молодцом. В отличие от его владельца."
      : "Внутри пахнет сеном, ржавчиной и решениями, о которых жалеют."
  );

  setText(
    "#orchardDescription",
    state.orchardRestored
      ? "Сад ожил! Яблони и груши снова дают урожай."
      : "Заросли такие, что даже крапива просит карту местности."
  );

  const restore = $("#restoreOrchard");

  if (restore) {
    restore.disabled = state.orchardRestored || state.money < 40;
    restore.textContent = state.orchardRestored
      ? "Сад восстановлен"
      : "Расчистить сад — 40 монет";
  }

  const harvestFruit = $("#harvestFruit");

  if (harvestFruit) {
    harvestFruit.disabled =
      !state.orchardRestored || state.energy < 5;
  }

  const harvestVegetables = $("#harvestVegetables");

  if (harvestVegetables) {
    harvestVegetables.disabled =
      state.energy < 5 || state.garden < 20;
  }
}

export function renderAll(state) {
  renderHUD(state);
  renderNeeds(state);
  renderXP(state);
  renderWarehouse(state);
  renderProduction(state);
  renderMarket(state);
  renderSkills(state);
  renderWorld(state);
}
