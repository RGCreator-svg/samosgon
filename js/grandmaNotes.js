import { addInventory } from "./economy.js";
import { addXP } from "./engine.js";

const NOTEBOOK = {
  house: [
    { id:"house_letter_1", title:"Письмо под обоями", text:"«Дорогая внучка (или внук, если опять перепутала конверты). Дом не продавай. В нём скрипит половица у окна — под ней ключ от сундука. Сундук не открывай без пирога. Это не суеверие, это техника безопасности»." },
    { id:"house_letter_2", title:"Список важных дел", text:"«1. Починить крышу. 2. Посадить укроп. 3. Не давать Петровичу стремянку. 4. Если Петрович уже взял стремянку — считать её подарком судьбы и купить новую»." },
    { id:"house_letter_3", title:"Записка на кухне", text:"«В шкафу чашки для гостей. Сколотая — для Петровича. Он всё равно говорит, что чай у него дома вкуснее. Пусть хоть чашка будет с характером»." }
  ],
  garden: [
    { id:"garden_letter_1", title:"План огорода на салфетке", text:"«Картошку сажать рядами. Морковь — рядом. Петровича — вообще не подпускать к грядкам. В прошлом году он перепутал семена с кормом для кур, и теперь у меня растёт очень подозрительная капуста»." },
    { id:"garden_letter_2", title:"Секрет большой моркови", text:"«Хорошая морковь любит рыхлую землю и терпение. Плохая морковь любит спорить с хозяином. Если выросла кривая — не ругай. Может, она просто обходит камень»." },
    { id:"garden_letter_3", title:"Долг огородный", text:"«Петрович должен мне три ведра навоза, две лопаты и объяснение, почему у него кабачок размером с телёнка. Не забудь спросить. Он начнёт рассказывать про луну — не верь»." }
  ],
  orchard: [
    { id:"orchard_letter_1", title:"Письмо из старого сада", text:"«Яблони помнят больше нас. Под самой старой, что наклонилась к колодцу, закопана жестяная коробка. Не пугайся ржавчины: там не клад, а мои лучшие рецепты. Хотя клад тоже был бы кстати»." },
    { id:"orchard_letter_2", title:"Про грушу и соседей", text:"«Груши снимай чуть раньше, чем их заметит Петрович. У него удивительное зрение: свои яблоки он не видит, а чужую грушу — за три участка»." },
    { id:"orchard_letter_3", title:"Садовый календарь", text:"«Если яблоня цветёт — не торопись. Если яблоня не цветёт — тоже не торопись. Суета нужна только Петровичу, когда он объясняет, куда делась моя лестница»." }
  ],
  barn: [
    { id:"barn_letter_1", title:"Инструкция к сараю", text:"«В сарае всё лежит на своих местах. Если не нашёл — значит, Петрович одолжил. Если Петрович отрицает — ищи у него за баней. Если нашёл — не спрашивай, зачем ему три гаечных ключа и свадебная фата»." },
    { id:"barn_letter_2", title:"Чертёж неизвестного устройства", text:"«Нарисовала аппарат для автоматической уборки. Ведро, верёвка, колесо и курица. Не получилось. Курица теперь не разговаривает со мной, а ведро требует отдельную комнату»." },
    { id:"barn_letter_3", title:"Заметка на балке", text:"«Не выбрасывай старые бочки. Одну оставь под яблоки, вторую под инструменты, третью — для Петровича, когда он опять скажет: “Я на минутку”»." }
  ],
  special: [
    { id:"quest_barn_chest", title:"Записка в сундуке", text:"«Если ты нашёл ключ, значит, сарай наконец-то привели в чувство. В жестяной коробке под старой яблоней лежит рецепт. Не отдавай его Петровичу: он однажды перепутал корицу с удобрением и до сих пор считает это авторским вкусом»." },
    { id:"quest_orchard_box", title:"Последняя страница", text:"«Вот и встретились снова, мой хороший. Рецепт — семейный, но главное в нём не пропорции, а терпение. А ещё не бери пример с Петровича: он даже чай заваривает методом перебора»." }
  ],
  still: [
    { id:"still_letter_1", title:"Памятка мастеру", text:"«Любое железо любит уход. Аппарат любит ещё больше. А если он начал стучать — это не музыка, даже если Петрович уже пустился в пляс»." },
    { id:"still_letter_2", title:"Запись о первой партии", text:"«Первая партия получилась так себе. Зато дед сказал, что напиток бодрит. Правда, он сказал это после того, как проснулся на сеновале. Надо будет записать, что именно мы тогда сделали»." }
  ]
};

const FINDS = [
  { id:"coins", title:"Банка с мелочью", text:"В щели между досками нашлась банка с монетами. Бабушка называла это «пенсионным фондом на случай Петровича».", apply(s){s.money+=18;} , reward:"+18 монет" },
  { id:"timber", title:"Сухие доски", text:"Под старым брезентом обнаружились вполне годные доски. Пахнут пылью и разумной экономией.", apply(s){s.parts.timber=(s.parts.timber||0)+2;}, reward:"+2 древесины" },
  { id:"fasteners", title:"Коробка крепежа", text:"Нашлась коробка гвоздей и крепежа. На крышке надпись: «Не отдавать соседям». Мудрая женщина.", apply(s){s.parts.fasteners=(s.parts.fasteners||0)+4;}, reward:"+4 крепежа" },
  { id:"tools", title:"Инструментальный тайник", text:"В старой тряпке лежит приличный инструмент. Петрович, судя по всему, искал его много лет.", apply(s){s.parts.tools=(s.parts.tools||0)+1;}, reward:"+1 инструмент" },
  { id:"potato", title:"Картошка на чёрный день", text:"В сухом углу нашёлся мешочек картошки. Бабушка предусмотрела даже тот случай, когда хозяин забудет поесть.", apply(s){addInventory(s,"potato",3);}, reward:"+3 картофелины" },
  { id:"recipe", title:"Кулинарная вырезка", text:"В жестяной коробке нашлась вырезка с рецептом пирога. На обороте бабушка приписала: «Петровичу не давать, он всё равно съест начинку до выпечки».", apply(s){s.story.recipeFound=true; s.money+=8;}, reward:"+8 монет и рецепт в записках" },
  { id:"nothing", title:"Очень важный камень", text:"Под половицей обнаружился камень. Бабушка подписала его: «Для подпирания двери». В хозяйстве полезно всё. Почти всё.", apply(s){addXP(s,3);}, reward:"+3 опыта" }
];

const AREA_LABELS = { house:"Дом", garden:"Огород", orchard:"Сад", barn:"Сарай", still:"Аппарат" };

export function ensureGrandmaStory(state) {
  state.story ??= { unlocked: [] };
  state.story.unlocked ??= [];
  state.story.discovered ??= [];
  state.story.findings ??= [];
  state.story.read ??= [];
  state.story.questStep ??= "locked";
  state.story.questRewards ??= [];
  state.story.pendingPetrovich ??= null;
  return state.story;
}

export function discoverRepairStory(state, action, notify = () => {}) {
  const story = ensureGrandmaStory(state);
  const area = action === "still" ? "still" : action;
  if (!NOTEBOOK[area]) return null;

  const freshNote = NOTEBOOK[area].find(note => !story.discovered.includes(note.id));
  if (freshNote) {
    story.discovered.push(freshNote.id);
    story.unlocked.push(freshNote.id);
    notify(`📖 Найдена записка: «${freshNote.title}». Загляните в бабушкины записки.`);
    return { type:"note", id:freshNote.id, title:freshNote.title };
  }

  if (Math.random() < 0.42) {
    const available = FINDS.filter(find => !story.findings.some(entry => entry.id === find.id && entry.area === area));
    const find = available[Math.floor(Math.random() * available.length)] || FINDS[Math.floor(Math.random()*FINDS.length)];
    find.apply(state);
    story.findings.unshift({ id:find.id, area, title:find.title, text:find.text, reward:find.reward, day:state.day });
    story.findings = story.findings.slice(0,30);
    notify(`🔎 ${find.title}! ${find.reward}`);
    return { type:"find", id:find.id, title:find.title };
  }

  const quips = [
    "Пыль, паутина и один очень недовольный паук. На этот раз без добычи.",
    "За доской обнаружился старый фантик. Судя по дате, он старше некоторых соседей.",
    "Нашлась пуговица. Бабушка записала бы её в активы, но бухгалтерия пока не готова.",
    "В углу лежала инструкция. К сожалению, от утюга. Но бумага крепкая."
  ];
  notify(`🧹 ${AREA_LABELS[area]}: ${quips[Math.floor(Math.random()*quips.length)]}`);
  return null;
}

const QUEST_STEPS = {
  floorboard: {
    title: "Скрипучая половица",
    description: "В письме под обоями бабушка упомянула половицу у окна. Проверь, что она скрывает.",
    action: "Осмотреть половицу",
    requirement: () => true
  },
  barnChest: {
    title: "Сундук в сарае",
    description: "Ключ найден. Сначала приведи сарай в порядок — бабушка не любила открывать сундуки среди паутины.",
    action: "Открыть старый сундук",
    requirement: state => (Number(state.barn)||0) >= 70
  },
  orchardBox: {
    title: "Жестяная коробка под яблоней",
    description: "В сундуке лежит схема тайника. Нужен восстановленный сад, чтобы найти старую яблоню у колодца.",
    action: "Раскопать тайник",
    requirement: state => !!state.orchardRestored
  }
};

const PETROVICH_ENCOUNTERS = {
  clue: {
    title: "Петрович тоже кое-что нашёл",
    text: "Петрович вынырнул из-за забора с латунной биркой. «Я тут случайно нашёл. Совершенно случайно. Она сама ко мне прилипла». На бирке знакомый бабушкин знак.",
    choices: [{id:"take",label:"Забрать улику",result:"Ты забрал бирку. Петрович уверяет, что всё равно собирался её подарить.",apply:s=>{s.money=(Number(s.money)||0)+6;}},{id:"thank",label:"Поблагодарить Петровича",result:"Петрович растрогался и ушёл рассказывать всем, что он главный сыщик.",apply:s=>{s.reputation=Math.min(100,(Number(s.reputation)||0)+1);}}]
  },
  wrong: {
    title: "Не та находка",
    text: "Петрович торжественно принёс «старинный ключ». Это ключ от консервной банки, но он настаивает, что замок просто неправильный.",
    choices: [{id:"keep",label:"Оставить ключ на память",result:"Ключ отправился в ящик с бесполезными, но дорогими сердцу вещами.",apply:s=>addXP(s,4)},{id:"return",label:"Вежливо вернуть находку",result:"Петрович обиделся, но признал, что на ключе написано «огурцы».",apply:s=>{s.reputation=Math.min(100,(Number(s.reputation)||0)+1);}}]
  },
  share: {
    title: "Петрович требует долю",
    text: "Услышав про бабушкин сундук, Петрович объявил себя «консультантом по наследству» и просит долю за моральную поддержку.",
    choices: [{id:"pay",label:"Отдать 8 монет",result:"Петрович получил деньги и немедленно купил семечки.",apply:s=>{s.money=Math.max(0,(Number(s.money)||0)-8);}},{id:"refuse",label:"Отказать и напомнить про долги",result:"Петрович ушёл составлять встречный список долгов.",apply:s=>{s.reputation=Math.max(-100,(Number(s.reputation)||0)-1);}}]
  },
  trail: {
    title: "Петрович перепутал следы",
    text: "Петрович показывает уверенный маршрут к тайнику. Через минуту выясняется, что следы ведут к его собственному погребу.",
    choices: [{id:"follow",label:"Проверить его маршрут",result:"В погребе нашлась забытая банка варенья. Петрович делает вид, что так и планировал.",apply:s=>addInventory(s,"apple",1)},{id:"ignore",label:"Идти по бабушкиной схеме",result:"Ты не стал отвлекаться. Петрович назвал это отсутствием командного духа.",apply:s=>addXP(s,3)}]
  }
};

function maybeStartPetrovichEncounter(story) {
  if (story.questStep === "completed" || story.pendingPetrovich) return;
  if (Math.random() < 0.42) {
    const ids = Object.keys(PETROVICH_ENCOUNTERS);
    story.pendingPetrovich = ids[Math.floor(Math.random() * ids.length)];
  }
}

export function runPetrovichEncounterDev(state, notify = () => {}) {
  const story = ensureGrandmaStory(state);
  const ids = Object.keys(PETROVICH_ENCOUNTERS);
  const index = Number(story.petrovichDevIndex || 0) % ids.length;
  story.pendingPetrovich = ids[index];
  story.petrovichDevIndex = index + 1;
  notify("DEV: вызвана встреча с Петровичем — " + PETROVICH_ENCOUNTERS[story.pendingPetrovich].title);
  return true;
}

export function resolvePetrovichEncounter(state, choiceId, notify = () => {}) {
  const story = ensureGrandmaStory(state);
  const encounter = PETROVICH_ENCOUNTERS[story.pendingPetrovich];
  const choice = encounter?.choices.find(item => item.id === choiceId);
  if (!choice) return false;
  choice.apply(state);
  story.findings.unshift({
    id:"petrovich_" + story.pendingPetrovich + "_" + choiceId,
    area:"house",
    title:encounter.title,
    text:choice.result,
    reward:"Решение принято",
    day:state.day
  });
  story.findings = story.findings.slice(0,30);
  story.pendingPetrovich = null;
  notify("🧔 " + choice.result);
  return true;
}

function unlockSpecialNote(story, id) {
  if (!story.discovered.includes(id)) story.discovered.push(id);
  if (!story.unlocked.includes(id)) story.unlocked.push(id);
}

export function performGrandmaQuestAction(state, notify = () => {}, force = false) {
  const story = ensureGrandmaStory(state);
  const step = story.questStep;
  const quest = QUEST_STEPS[step];
  if (!quest) return false;
  if (!force && !quest.requirement(state)) {
    notify(step === "barnChest"
      ? "🧹 Сначала восстанови сарай хотя бы до 70% — сундук завален хламом."
      : "🌳 Сначала восстанови сад: тайник находится у старой яблони.");
    return false;
  }

  if (step === "floorboard") {
    story.questStep = "barnChest";
    story.keyFound = true;
    story.findings.unshift({
      id:"grandma_key", area:"house", title:"Ключ с потайной бородкой",
      text:"Под половицей лежал маленький латунный ключ. На бирке бабушкиным почерком: «Не для Петровича».",
      reward:"Открывает сундук в сарае", day:state.day
    });
    notify("🗝️ Найден латунный ключ! Бабушка оставила подсказку о сундуке в сарае.");
  } else if (step === "barnChest") {
    story.questStep = "orchardBox";
    story.chestOpened = true;
    state.money = (Number(state.money)||0) + 20;
    state.parts.tools = (Number(state.parts?.tools)||0) + 1;
    unlockSpecialNote(story,"quest_barn_chest");
    story.findings.unshift({
      id:"grandma_chest", area:"barn", title:"Бабушкин сундук",
      text:"Внутри — старый чертёж тайника, инструмент и конверт с монетами. На конверте: «За то, что не бросил дом».",
      reward:"+20 монет, +1 инструмент", day:state.day
    });
    notify("📦 Сундук открыт! Внутри чертёж тайника под старой яблоней.");
  } else if (step === "orchardBox") {
    story.questStep = "completed";
    story.recipeFound = true;
    story.familyRecipeUnlocked = true;
    state.money = (Number(state.money)||0) + 35;
    state.reputation = Math.min(100,(Number(state.reputation)||0)+2);
    addInventory(state,"apple",4);
    unlockSpecialNote(story,"quest_orchard_box");
    story.findings.unshift({
      id:"grandma_legacy", area:"orchard", title:"Семейная жестяная коробка",
      text:"Под корнями яблони нашлась коробка с семейным рецептом, старой фотографией и запиской: «Теперь это твоё. Береги дом, сад и себя. И не одалживай Петровичу лопату».",
      reward:"+35 монет, +4 яблока, +2 репутации · семейный рецепт", day:state.day
    });
    notify("🌳 Найдена семейная коробка! Открыт рецепт «Бабушкин яблочный сбор».");
  }
  maybeStartPetrovichEncounter(story);
  return true;
}

export function runGrandmaQuestDev(state, notify = () => {}) {
  const story = ensureGrandmaStory(state);
  if (story.questStep === "locked") {
    story.questStep = "floorboard";
    notify("DEV: сюжетная цепочка бабушки активирована.");
    return true;
  }
  return performGrandmaQuestAction(state,notify,true);
}

export function renderGrandmaNotes(state, notify = () => {}, onUpdate = () => {}) {
  const root = document.querySelector("#grandmaNotes");
  if (!root) return;
  const story = ensureGrandmaStory(state);
  const notes = Object.values(NOTEBOOK).flat().filter(note => story.discovered.includes(note.id));
  const findings = story.findings || [];
  root.replaceChildren();

  const intro = document.createElement("p");
  intro.className = "grandma-notes-intro";
  intro.textContent = "Бабушка оставляла подсказки в самых неожиданных местах. Читайте внимательно: между рецептами и ворчанием иногда прячется польза.";
  root.append(intro);

  if (story.questStep === "locked" && story.discovered.includes("house_letter_1")) {
    story.questStep = "floorboard";
  }
  const encounter = PETROVICH_ENCOUNTERS[story.pendingPetrovich];
  if (encounter) {
    const encounterCard = document.createElement("article");
    encounterCard.className = "grandma-quest-card petrovich-encounter";
    const encounterTitle = document.createElement("h3");
    encounterTitle.textContent = "🧔 " + encounter.title;
    const encounterText = document.createElement("p");
    encounterText.textContent = encounter.text;
    encounterCard.append(encounterTitle, encounterText);
    encounter.choices.forEach(choice => {
      const choiceButton = document.createElement("button");
      choiceButton.type = "button";
      choiceButton.dataset.petrovichChoice = choice.id;
      choiceButton.textContent = choice.label;
      encounterCard.append(choiceButton);
    });
    root.append(encounterCard);
  }
  const activeQuest = QUEST_STEPS[story.questStep];
  if (activeQuest) {
    const questCard = document.createElement("article");
    questCard.className = "grandma-quest-card";
    const questTitle = document.createElement("h3");
    questTitle.textContent = "🧩 Семейная тайна · " + activeQuest.title;
    const questText = document.createElement("p");
    questText.textContent = activeQuest.description;
    const questButton = document.createElement("button");
    questButton.type = "button";
    questButton.dataset.grandmaQuest = "advance";
    questButton.textContent = activeQuest.action;
    questButton.disabled = !activeQuest.requirement(state);
    questCard.append(questTitle,questText,questButton);
    root.append(questCard);
  } else if (story.questStep === "completed") {
    const done = document.createElement("p");
    done.className = "grandma-quest-complete";
    done.textContent = "🏆 Семейная тайна раскрыта. Бабушка бы тобой гордилась. Петровичу, разумеется, ничего не рассказываем.";
    root.append(done);
  }

  const noteHeading = document.createElement("h3");
  noteHeading.textContent = `📜 Записки бабушки · ${notes.length}`;
  root.append(noteHeading);
  if (!notes.length) {
    const empty = document.createElement("p");
    empty.className = "grandma-empty";
    empty.textContent = "Пока страницы пусты. Наведите порядок в доме, огороде, саду или сарае — бабушка явно что-то припрятала.";
    root.append(empty);
  }
  notes.forEach(note => {
    const card = document.createElement("article");
    card.className = "grandma-note-card";
    const title = document.createElement("h4");
    title.textContent = note.title;
    const body = document.createElement("p");
    body.textContent = `«${note.text}»`;
    card.append(title, body);
    root.append(card);
  });

  const findHeading = document.createElement("h3");
  findHeading.textContent = `🔎 Журнал находок · ${findings.length}`;
  root.append(findHeading);
  if (!findings.length) {
    const empty = document.createElement("p");
    empty.className = "grandma-empty";
    empty.textContent = "Здесь будут появляться найденные вещи и небольшие сюрпризы после уборки и ремонта.";
    root.append(empty);
  }
  findings.forEach(find => {
    const card = document.createElement("article");
    card.className = "grandma-find-card";
    const meta = document.createElement("small");
    meta.textContent = `${AREA_LABELS[find.area] || "Хозяйство"} · день ${find.day} · ${find.reward}`;
    const title = document.createElement("h4");
    title.textContent = find.title;
    const body = document.createElement("p");
    body.textContent = find.text;
    card.append(meta, title, body);
    root.append(card);
  });

  if (!root.dataset.questBound) {
    root.dataset.questBound = "true";
    root.addEventListener("click", event => {
      const choice = event.target.closest("[data-petrovich-choice]");
      if (choice) {
        resolvePetrovichEncounter(state, choice.dataset.petrovichChoice, notify);
        onUpdate();
        return;
      }
      const button = event.target.closest("[data-grandma-quest]");
      if (!button) return;
      performGrandmaQuestAction(state, notify);
      onUpdate();
    });
  }
}
