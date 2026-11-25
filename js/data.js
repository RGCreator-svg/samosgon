
export const ITEMS = [
  {
    id: "potato",
    name: "Картошка",
    emoji: "🥔",
    price: 8,
    description: "Главная валюта деревни после сплетен."
  },
  {
    id: "carrot",
    name: "Морковь",
    emoji: "🥕",
    price: 10,
    description: "Для супа, кроликов и сомнительных сделок."
  },
  {
    id: "cabbage",
    name: "Капуста",
    emoji: "🥬",
    price: 12,
    description: "Кочан крепкий. Как характер тёти Зины."
  },
  {
    id: "apple",
    name: "Яблоки",
    emoji: "🍎",
    price: 15,
    description: "Пахнут осенью и потенциальной прибылью."
  },
  {
    id: "pear",
    name: "Груши",
    emoji: "🍐",
    price: 18,
    description: "Почти деликатес. Если не считать червяка."
  },
  {
    id: "braga",
    name: "Брага",
    emoji: "🫙",
    price: 25,
    description: "Пока не напиток, но уже предмет разговоров."
  },
  {
    id: "spirit",
    name: "Спирт-сырец",
    emoji: "⚗️",
    price: 42,
    description: "Игровой продукт после условной перегонки."
  },
  {
    id: "aged_spirit",
    name: "Выдержанный продукт",
    emoji: "🪵",
    price: 68,
    description: "Продукт, созревший в игровой бочке."
  }
];

export const SKILL_BRANCHES = [
  {
    id: "farming",
    name: "🌱 Земледелие",
    skills: [
      {
        id: "green_thumb",
        name: "Зелёный палец",
        description: "Огород приносит больше овощей.",
        cost: 1
      },
      {
        id: "orchard_lore",
        name: "Садовод",
        description: "Восстановление сада приносит больше деревьев.",
        cost: 1,
        requires: "green_thumb"
      },
      {
        id: "big_harvest",
        name: "Богатый урожай",
        description: "Сбор овощей и фруктов становится прибыльнее.",
        cost: 1,
        requires: "orchard_lore"
      }
    ]
  },
  {
    id: "fermentation",
    name: "🫙 Брожение",
    skills: [
      {
        id: "ferment",
        name: "Основы брожения",
        description: "Открывает производство браги.",
        cost: 1
      },
      {
        id: "clean_barrel",
        name: "Чистая бочка",
        description: "За партию получается больше браги.",
        cost: 1,
        requires: "ferment"
      },
      {
        id: "patient_master",
        name: "Терпеливый мастер",
        description: "Партии готовятся на один день быстрее.",
        cost: 1,
        requires: "clean_barrel"
      }
    ]
  },
  {
    id: "engineering",
    name: "🔧 Механика",
    skills: [
      {
        id: "handyman",
        name: "Руки из плеч",
        description: "Ремонт дома, сарая и оборудования дешевле.",
        cost: 1
      },
      {
        id: "old_still",
        name: "Вторая жизнь аппарата",
        description: "Открывает восстановление старого оборудования.",
        cost: 1,
        requires: "handyman"
      },
      {
        id: "precision_assembly",
        name: "Точная сборка",
        description: "Открывает следующий технологический класс аппарата.",
        cost: 2,
        requires: "old_still"
      },
      {
        id: "modular_systems",
        name: "Модульные системы",
        description: "Разрешает устанавливать продвинутые игровые модули.",
        cost: 2,
        requires: "precision_assembly"
      },
      {
        id: "column_master",
        name: "Инженер-технолог",
        description: "Открывает финальную ступень технологического дерева.",
        cost: 3,
        requires: "modular_systems"
      }
    ]
  },
  {
    id: "automation",
    name: "🤖 Автоматизация",
    skills: [
      {
        id: "automation_basics",
        name: "Основы автоматики",
        description: "Открывает установку простых автоматических модулей.",
        cost: 1,
        requires: "precision_assembly"
      },
      {
        id: "auto_control",
        name: "Автоматический контроль",
        description: "Разрешает улучшенные системы управления хозяйством.",
        cost: 2,
        requires: "automation_basics"
      },
      {
        id: "full_automation",
        name: "Умное хозяйство",
        description: "Открывает максимальный уровень автоматизации.",
        cost: 3,
        requires: "auto_control"
      }
    ]
  },
  {
    id: "trade",
    name: "🪙 Торговля",
    skills: [
      {
        id: "bargain",
        name: "Торг уместен",
        description: "Продажи приносят на 20% больше денег.",
        cost: 1
      },
      {
        id: "regulars",
        name: "Постоянные клиенты",
        description: "Продажи дают дополнительный опыт.",
        cost: 1,
        requires: "bargain"
      }
    ]
  },
  {
    id: "survival",
    name: "🔥 Выживание",
    skills: [
      {
        id: "country_life",
        name: "Деревенская закалка",
        description: "Сытость и тепло медленнее падают.",
        cost: 1
      },
      {
        id: "good_sleep",
        name: "Крепкий сон",
        description: "После сна восстанавливается больше энергии.",
        cost: 1,
        requires: "country_life"
      }
    ]
  }
];

export const GAME_CONFIG = {
  startingMoney: 80,
  startingSkillPoints: 1,
  startingInventory: {
    potato: 4,
    carrot: 3,
    cabbage: 2,
    apple: 2,
    pear: 1,
    braga: 2
  },
  xpPerLevel: 100
};
