import { addXP } from "./engine.js";

const DAY_LINES = [
  "Петух прокукарекал так, будто ему задолжали. Доброе утро.",
  "На крыльце следы. То ли сосед заходил, то ли курица опять строит планы.",
  "Бабушкины часы идут на пять минут впереди. Или весь мир опаздывает.",
  "За окном туман. Даже сарай сегодня выглядит загадочно.",
  "Соседи уже обсуждают ваши успехи. И неудачи. И забор.",
  "Утро началось с грохота в сарае. Хорошо, что вы ещё не успели туда зайти.",
  "На столе новая записка бабушки. Почерк знакомый, содержание подозрительное.",
  "Солнце взошло. Работы меньше не стало, но теперь её хотя бы видно.",
  "Кто-то оставил у калитки пустое ведро. В деревне это почти официальное письмо."
];

const EVENTS = [
  {
    title: "Соседская помощь",
    text: "Петрович заглянул одолжить инструмент. Вернул его вместе с парой картофелин.",
    chance: 0.14,
    apply(state) { state.inventory.potato = (state.inventory.potato || 0) + 2; }
  },
  {
    title: "Неожиданная находка",
    text: "Под половицей обнаружилась заначка. Бабушка явно умела планировать бюджет.",
    chance: 0.10,
    apply(state) { state.money += 25; }
  },
  {
    title: "Сломанная доска",
    text: "В сарае под ногой хрустнула доска. Ремонт опять сам себя не сделает.",
    chance: 0.10,
    apply(state) { state.barn = Math.max(0, state.barn - 5); }
  },
  {
    title: "Удачный базарный день",
    text: "Покупатели сегодня щедрее обычного. Даже тётя Зина не пересчитала сдачу трижды.",
    chance: 0.10,
    apply(state) { state.reputation = Math.min(100, (state.reputation || 0) + 2); state.money += 15; }
  },
  {
    title: "Капризная погода",
    text: "Ночной ветер потрепал грядки. Придётся немного потрудиться.",
    chance: 0.10,
    apply(state) { state.garden = Math.max(0, state.garden - 5); }
  },
  {
    title: "Посылка без адреса",
    text: "У калитки коробка с полезными мелочами. Отправитель подписался: «Доброжелатель».",
    chance: 0.08,
    apply(state) { state.inventory.carrot = (state.inventory.carrot || 0) + 2; state.inventory.cabbage = (state.inventory.cabbage || 0) + 1; }
  },
  {
    title: "Бабушкина подсказка",
    text: "В записной книжке нашлась заметка: «Не вкладывай всё в одну бочку. Особенно если она течёт».",
    chance: 0.08,
    apply(state) { addXP(state, 8); }
  },
  {
    title: "Слухи о заказах",
    text: "Трактирщик расспрашивал о вашем хозяйстве. Похоже, скоро появится новый заказ.",
    chance: 0.08,
    apply(state) { state.reputation = Math.min(100, (state.reputation || 0) + 1); }
  },
  {
    title: "Мышиный рейд",
    text: "Мыши устроили ночной банкет. Пропала часть запасов картошки.",
    chance: 0.08,
    apply(state) { state.inventory.potato = Math.max(0, (state.inventory.potato || 0) - 1); }
  }
];

export function startNewDay(state, notify) {
  const line = DAY_LINES[Math.floor(Math.random() * DAY_LINES.length)];
  notify(`День ${state.day}. ${line}`);

  if (Math.random() > 0.68) return;

  const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  event.apply(state);
  notify(`Событие: ${event.title}. ${event.text}`);
}
