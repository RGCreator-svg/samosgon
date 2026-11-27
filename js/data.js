
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
    name: "Сахарная брага",
    emoji: "🫙",
    price: 25,
    description: "Базовая сахарная партия."
  },
  {
    id: "fruit_braga",
    name: "Фруктовая брага",
    emoji: "🍎",
    price: 34,
    description: "Ароматный игровой продукт из фруктового сырья."
  },
  {
    id: "grain_braga",
    name: "Зерновая брага",
    emoji: "🌾",
    price: 38,
    description: "Игровая зерновая партия с насыщенным профилем."
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
  ,{ id:"sugar", name:"Сахар", emoji:"🧂", price:10, description:"Сырьё для классической сахарной браги." }
  ,{ id:"grain", name:"Зерно", emoji:"🌾", price:14, description:"Сырьё для отдельной зерновой браги." }
  ,{ id:"grapes", name:"Виноград", emoji:"🍇", price:18, description:"Сырьё для винодельни; можно вырастить или купить." }
  ,{ id:"honey", name:"Мёд", emoji:"🍯", price:28, description:"Сырьё пасеки для медовухи и медового дистиллята." }
  ,{ id:"yeast", name:"Винные дрожжи", emoji:"🧫", price:16, description:"Игровой ингредиент для винных и медовых партий." }
  ,{ id:"bottles", name:"Пустые бутылки", emoji:"🍾", price:7, description:"Тара для готовой продукции." }
  ,{ id:"corks", name:"Пробки", emoji:"🪵", price:3, description:"Тара и укупорка для вина." }
  ,{ id:"wine", name:"Вино", emoji:"🍷", price:62, description:"Игровой продукт винодельни." }
  ,{ id:"mead", name:"Медовуха", emoji:"🍯", price:58, description:"Игровой медовый напиток." }
  ,{ id:"honey_braga", name:"Медовая брага", emoji:"🫙", price:38, description:"Игровое сырьё для медового дистиллята." }
  ,{ id:"honey_spirit", name:"Медовый дистиллят", emoji:"🥃", price:78, description:"Игровой продукт условной перегонки медовой браги." }

  ,{ id:"water", name:"Подготовленная вода", emoji:"💧", price:2, description:"Игровое сырьё для медовых партий." }
  ,{ id:"yeast_nutrient", name:"Питательная добавка", emoji:"🧪", price:12, description:"Вспомогательный ингредиент для игровых партий брожения." }

  ,{ id:"aged_honey_spirit", name:"Выдержанный медовый дистиллят", emoji:"🥃", price:96, description:"Игровой медовый дистиллят после выдержки в бочке." }

  ,{ id:"labels", name:"Этикетки", emoji:"🏷️", price:2, description:"Маркировка для готовой продукции винодельни." }
  ,{ id:"apple_cider", name:"Яблочный сидр", emoji:"🍏", price:54, description:"Игровой яблочный напиток после созревания." }
  ,{ id:"pear_wine", name:"Грушевое вино", emoji:"🍐", price:72, description:"Игровое вино из грушевого сырья." }
  ,{ id:"fruit_wine", name:"Садовое фруктовое вино", emoji:"🍷", price:82, description:"Игровой купаж из яблок и груш." }
  ,{ id:"orchard_blush", name:"Румянец старого сада", emoji:"🍷", price:94, description:"Авторский лабораторный яблочно-грушевый сорт." }
  ,{ id:"golden_vintage", name:"Золотой винтаж", emoji:"🥂", price:118, description:"Авторский виноградный сорт с медовым оттенком." }
  ,{ id:"pear_honey_reserve", name:"Грушевый медовый резерв", emoji:"🍐", price:108, description:"Редкий сорт, открытый в лаборатории." }

  ,{id:"house_blend",name:"Деревенский купаж",emoji:"🥃",price:92,description:"Смешанная партия с собственным паспортом качества."}
  ,{id:"orchard_blend",name:"Садовый купаж",emoji:"🍎",price:108,description:"Купаж с подчёркнутым фруктовым профилем."}
  ,{id:"honey_blend",name:"Медовый резерв",emoji:"🍯",price:118,description:"Выдержанный купаж с медовыми нотами."}
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
    id: "winemaking",
    name: "🍇 Виноделие и медоварение",
    skills: [
      { id: "wine_basics", name: "Основы виноделия", description: "Открывает развитие виноградника и винодельни.", cost: 1 },
      { id: "wine_pressing", name: "Прессование и сусло", description: "Открывает винный пресс и подготовку винных партий.", cost: 1, requires: "wine_basics" },
      { id: "cellar_aging", name: "Погребное дело", description: "Открывает выдержку и улучшение качества вина.", cost: 2, requires: "wine_pressing" },
      { id: "mead_brewing", name: "Медоварение", description: "Открывает отдельную линию медовухи и медовой браги.", cost: 1, requires: "wine_basics" },
      { id: "honey_distillation", name: "Медовый дистиллят", description: "Открывает медовую брагу как сырьё для игровой перегонки.", cost: 2, requires: "mead_brewing" },
      { id: "cider_making", name: "Сидроделие", description: "Открывает производство яблочного сидра.", cost: 1, requires: "cellar_aging" },
      { id: "pear_wine", name: "Грушевое виноделие", description: "Открывает отдельные партии грушевого вина.", cost: 1, requires: "cellar_aging" },
      { id: "fruit_winemaking", name: "Фруктовые купажи", description: "Открывает производство купажированного вина из яблок и груш.", cost: 2, requires: "pear_wine" }
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
