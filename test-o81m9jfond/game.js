"use strict";
/* РУССКИЙ РЭП НА ВЫЛЕТ — Pixel Fighter
 * Single-file canvas engine. All timings are in seconds and all speeds in px/s,
 * so the game runs the same on 60 Hz and 144 Hz displays.
 */

const canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const FLOOR_Y = 600;
const GRAVITY = 3900;     // snappier, less floaty jumps
const JUMP_V = 1290;
const ROUND_TIME = 60;
const GAME_SPEED = 1.12;   // the whole fight runs a little faster
const DMG_SCALE = 1.15;    // rounds end sooner
const WALL_L = 70;
const WALL_R = W - 70;
const ROUNDS_TO_WIN = 2;
const MAX_ROUNDS = 5;

const FONT_HEAD = '"Russo One", "Arial Black", system-ui, sans-serif';
const FONT_PIX = '"Press Start 2P", "Courier New", monospace';

const GOLD = "#ffd54a";
const CREAM = "#fff6c8";
const P_COLORS = ["#ffd54a", "#5fd8ff"];

/* ------------------------------------------------------------------ */
/* Storage (wrapped: private mode or blocked storage must not break)  */
/* ------------------------------------------------------------------ */
const store = {
  get(key, def) {
    try {
      const v = localStorage.getItem("gvnbeta_" + key);
      return v === null ? def : JSON.parse(v);
    } catch (e) { return def; }
  },
  set(key, val) {
    try { localStorage.setItem("gvnbeta_" + key, JSON.stringify(val)); } catch (e) {}
  },
};

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */
const CHARS = {
  loki: {
    id: "loki", name: "ЛОКИ", special: "КОКТЕЙЛЬ", color: "#d07a3a",
    speed: 275, power: 1.08, specialCd: 6.0, tough: 1.05, jump: 0.95, weight: 1.15, dash: 0.95,
    stats: { "СКОРОСТЬ": 2, "СИЛА": 4, "ЗДОРОВЬЕ": 4 },
    perk: "ФИШКА: огонь на полу жжёт соперника, пока тот стоит в нём",
    blurb: "Маньяк, тихоходка, шмыга.",
    loseTitle: "ЛОКИ ВСЁ",
    quotes: ["НАХ*Й ВЗЯЛ ЭТИ ПОНТЫ?", "ПРОШМЫГНУ, КАК ТИХОХОДКА", "БАЗАР НЕ ВЫДАВАЙ ЗА МЫСЛИ", "ХОЧЕШЬ СТЕЛИСЬ, КАК ССЫКЛО", "Я ТЕБЯ ОТПРАВЛЮ В K.O."],
    moves: {
      // heavy straight right: slower than a jab, hurts more
      light: { frame: "light", startup: 0.1, active: 0.09, recovery: 0.21, dmg: 8, reach: 125,
        y0: -220, y1: -160, hitstun: 0.4, blockstun: 0.18, knock: 260, height: "high", sfx: "hitHeavy", stop: 0.08 },
      // big swinging roundhouse from the ground
      heavy: { frame: "heavy", startup: 0.17, active: 0.1, recovery: 0.32, dmg: 11, reach: 150, lunge: 40,
        y0: -215, y1: -130, hitstun: 0.5, blockstun: 0.22, knock: 460, height: "high", sfx: "hitKick", stop: 0.1 },
    },
  },
  fludd: {
    id: "fludd", name: "GONE.FLUDD", short: "ФЛАДД", special: "КУБИК ЛЬДА", color: "#ff3b5c",
    speed: 285, power: 1.0, specialCd: 6.0, tough: 1.0, jump: 1.05, weight: 1.0, dash: 1.05,
    stats: { "СКОРОСТЬ": 3, "СИЛА": 3, "ЗДОРОВЬЕ": 3 },
    perk: "ФИШКА: кубик льда замораживает — соперник ненадолго замедляется",
    blurb: "Худрич.",
    loseTitle: "ФЛАД ВСЁ",
    quotes: ["ШВЕПСОВО", "ТУПАЯ СУКА, БУДТО ПИТЕКАНТРОП", "ТЫ С ЧЛЕНОМ ВО РТУ — ЭТО МАМБЛ", "GLAM GO!", "ЧИЗАРП"],
    moves: {
      // kung-fu tiger claw from a wide stance
      light: { frame: "light", startup: 0.08, active: 0.08, recovery: 0.18, dmg: 6, reach: 134,
        y0: -220, y1: -150, hitstun: 0.36, blockstun: 0.16, knock: 210, height: "high", sfx: "hitLight", stop: 0.06 },
      // knee chamber, then a straight kung-fu side kick
      heavy: { frame: "heavy", startup: 0.16, active: 0.1, recovery: 0.3, dmg: 10, reach: 168, lunge: 25,
        y0: -225, y1: -150, hitstun: 0.48, blockstun: 0.2, knock: 400, height: "high", sfx: "hitKick", stop: 0.09 },
    },
  },
  smoky: {
    id: "smoky", name: "СМОКИ МО", special: "КАРА-ТЭ", color: "#9aa6b8",
    speed: 290, power: 1.0, specialCd: 6.5, tough: 1.0, jump: 1.0, weight: 1.05, dash: 1.0,
    stats: { "СКОРОСТЬ": 3, "СИЛА": 3, "ЗДОРОВЬЕ": 3 },
    perk: "ФИШКА: раз в раунд на половине здоровья уходит в дым — удар проходит мимо",
    blurb: "Питерская легенда.",
    loseTitle: "ДЫМНЫЙ МО ВСЁ",
    quotes: ["HANANA!", "ВСЯ СИЛА В ОДНОМ КУЛАКЕ", "КОД НЕ МЕНЯЕТСЯ: 8-1-2", "ЭТО ПРОИЗВОДСТВО ОТ СМОКИ МО"],
    moves: {
      // straight karate punch from the stance
      light: { frame: "light", startup: 0.08, active: 0.08, recovery: 0.18, dmg: 6, reach: 128,
        y0: -220, y1: -160, hitstun: 0.36, blockstun: 0.16, knock: 200, height: "high", sfx: "hitLight", stop: 0.06 },
      // high roundhouse to the head
      heavy: { frame: "heavy", startup: 0.15, active: 0.1, recovery: 0.29, dmg: 10, reach: 158, lunge: 30,
        y0: -225, y1: -150, hitstun: 0.48, blockstun: 0.2, knock: 380, height: "high", sfx: "hitKick", stop: 0.09 },
    },
  },
  tito: {
    id: "tito", name: "БОГДАН ТИТОМИР", short: "ТИТОМИР", special: "ДЕЛАЙ КАК Я", color: "#e8c050",
    speed: 305, power: 1.03, specialCd: 5.5, tough: 1.0, jump: 1.05, weight: 0.95, dash: 1.05,
    stats: { "СКОРОСТЬ": 3, "СИЛА": 3, "ЗДОРОВЬЕ": 3 },
    perk: "ФИШКА: высокая энергия — после попадания двойника бьёт сильнее",
    blurb: "Титан прошлого.",
    loseTitle: "ТИТОМИР УСТАЛ",
    quotes: ["ДЕЛАЙ КАК Я!", "ИДИ В НИКУДА", "ЭЙ, ПРИЯТЕЛЬ, ПОСМОТРИ НА МЕНЯ", "РАЗМЕР ИМЕЕТ ЗНАЧЕНИЕ"],
    moves: {
      light: { frame: "light", startup: 0.07, active: 0.08, recovery: 0.17, dmg: 6, reach: 118,
        y0: -215, y1: -160, hitstun: 0.34, blockstun: 0.15, knock: 190, height: "high", sfx: "hitLight", stop: 0.06 },
      heavy: { frame: "heavy", startup: 0.14, active: 0.1, recovery: 0.27, dmg: 9, reach: 142, lunge: 50,
        y0: -190, y1: -120, hitstun: 0.45, blockstun: 0.2, knock: 360, height: "mid", sfx: "hitKick", stop: 0.08 },
    },
  },
  krip: {
    id: "krip", name: "КРИП-А-КРИП", special: "ГЛЕБЗИЛЛА", color: "#c0c4c8",
    speed: 290, power: 1.04, specialCd: 6.5, tough: 1.04, jump: 0.95, weight: 1.1, dash: 1.0,
    stats: { "СКОРОСТЬ": 3, "СИЛА": 3, "ЗДОРОВЬЕ": 3 },
    perk: "ФИШКА: бумбокс — щит: блок отталкивает противника дальше",
    blurb: "Купчино, Юг.",
    loseTitle: "КУПЧИНО, ТЫ ЧЕГО",
    quotes: ["ОБРУШИЛ НА ТЕБЯ РИФМУ", "Я НЕ СЛЫШУ, ЧТО ТЫ ТАМ МНЕ ЧЕШЕШЬ", "У ТЕБЯ ВМЕСТО РТА РЕДКИЙ ВИД ВУЛЬВ", "ТЕБЕ НЕ ДАНО СТАТЬ МНОЙ, НЕДОНОСОК"],
    moves: {
      // swing with the boombox
      light: { frame: "light", startup: 0.09, active: 0.09, recovery: 0.2, dmg: 7, reach: 130,
        y0: -220, y1: -150, hitstun: 0.38, blockstun: 0.18, knock: 240, height: "high", sfx: "hitHeavy", stop: 0.08 },
      heavy: { frame: "heavy", startup: 0.14, active: 0.1, recovery: 0.27, dmg: 9, reach: 140, lunge: 50,
        y0: -185, y1: -115, hitstun: 0.45, blockstun: 0.2, knock: 360, height: "mid", sfx: "hitKick", stop: 0.08 },
    },
  },
  shilo: {
    id: "shilo", name: "ШИЛО", special: "ЗЛЫЕ ГОЛУБИ", color: "#d8443a",
    speed: 295, power: 1.06, specialCd: 4.8, tough: 1.04, jump: 1.0, weight: 0.95, dash: 1.0,
    stats: { "СКОРОСТЬ": 3, "СИЛА": 3, "ЗДОРОВЬЕ": 3 },
    perk: "ФИШКА: гантеля проламывает блок — даже через защиту отнимает здоровье",
    blurb: "Моча рано ударила в голову.",
    loseTitle: "ШИЛО ЗАТУПИЛОСЬ",
    quotes: ["И БУДЕТ ФАРШ, И БУДЕТ МЯСО", "РУБИ, ТОПОР, ДА ЕБ*ШЬ", "ГОЛУБИ ЭТИ НЕ ЗНАЮТ ПОЩАДЫ", "ДУМАЙ ПОЗИТИВНО", "БЕЙ И УЛЫБАЙСЯ"],
    moves: {
      // swing with the dumbbell: heavier and slower than a jab
      light: { frame: "light", startup: 0.09, active: 0.09, recovery: 0.2, dmg: 7, reach: 125, dumbbell: true,
        y0: -220, y1: -160, hitstun: 0.38, blockstun: 0.18, knock: 240, height: "high", sfx: "hitHeavy", stop: 0.08 },
      heavy: { frame: "heavy", startup: 0.14, active: 0.1, recovery: 0.27, dmg: 9, reach: 140, lunge: 50,
        y0: -185, y1: -115, hitstun: 0.45, blockstun: 0.2, knock: 360, height: "mid", sfx: "hitKick", stop: 0.08 },
    },
  },
  sqwoz: {
    id: "sqwoz", name: "SQWOZ BAB", special: "ЭЧПОЧМАК", color: "#e0a050",
    speed: 300, power: 1.07, specialCd: 4.8, tough: 1.04, jump: 1.0, weight: 0.95, dash: 1.0,
    stats: { "СКОРОСТЬ": 3, "СИЛА": 3, "ЗДОРОВЬЕ": 3 },
    perk: "ФИШКА: попал эчпочмаком — сытый, следующий удар сильнее",
    blurb: "Татарский богатырь.",
    loseTitle: "SQWOZ BAB УСТАЛ",
    quotes: ["ТАТАРСКИЙ БОГАТЫРЬ!", "МОИ ВОЛКИ ДЕЛАЮТ АУФ", "КУСЬ", "БРАТВА НА СВЯЗИ", "Я ПЛАМЕННЫЙ ТАТАРИН", "ЗУБЫ РАЗЛЕТАЮТСЯ КАК БРЫЗГИ"],
    moves: {
      light: { frame: "light", startup: 0.07, active: 0.08, recovery: 0.17, dmg: 6, reach: 115,
        y0: -215, y1: -160, hitstun: 0.34, blockstun: 0.15, knock: 190, height: "high", sfx: "hitLight", stop: 0.06 },
      heavy: { frame: "heavy", startup: 0.14, active: 0.1, recovery: 0.27, dmg: 9, reach: 140, lunge: 50,
        y0: -185, y1: -115, hitstun: 0.45, blockstun: 0.2, knock: 360, height: "mid", sfx: "hitKick", stop: 0.08 },
    },
  },
  babangida: {
    id: "babangida", name: "БАБАНГИДА", special: "БУСИДО", color: "#c8c8b0",
    speed: 270, power: 1.08, specialCd: 6.5, tough: 1.04, jump: 0.92, weight: 1.2, dash: 0.95,
    stats: { "СКОРОСТЬ": 2, "СИЛА": 4, "ЗДОРОВЬЕ": 4 },
    perk: "ФИШКА: может внезапно встать после падения",
    blurb: "Андеграунд здесь.",
    loseTitle: "БАБАН ВСЁ",
    quotes: ["ОПЯТЬ ОТМЕЧАЕМ УДАЧНЫЙ МАХАЧ", "Я С НОГИ ОФОРМЛЮ В КАПОТ", "НЕ ВАЖНО КТО ТЫ, ГАНГСТЕР ИЛИ БЭКПЭКЕР", "ВАШУ РЭП-ИГРУ Я В РОТОК БОДРЮ"],
    moves: {
      // heavy straight right: long wind-up, whole body weight behind it
      light: { frame: "light", startup: 0.11, active: 0.09, recovery: 0.22, dmg: 8, reach: 122,
        y0: -225, y1: -165, hitstun: 0.42, blockstun: 0.18, knock: 300, height: "high", sfx: "hitHeavy", stop: 0.09 },
      // muay thai knee in the clinch: short range, lifts the opponent
      heavy: { frame: "heavy", startup: 0.14, active: 0.1, recovery: 0.3, dmg: 10, reach: 92, lunge: 160,
        y0: -190, y1: -110, hitstun: 0.5, blockstun: 0.22, knock: 260, height: "mid", sfx: "hitBody", stop: 0.1, launch: -380 },
    },
  },
  husky: {
    id: "husky", name: "ХАСКИ", special: "КАНЬЕ", color: "#9fb8d8",
    speed: 310, power: 1.0, specialCd: 6.0, tough: 1.0, jump: 1.05, weight: 0.95, dash: 1.05,
    stats: { "СКОРОСТЬ": 3, "СИЛА": 3, "ЗДОРОВЬЕ": 3 },
    perk: "ФИШКА: раз в раунд на последнем издыхании пьёт живую воду",
    blurb: "Едет по России, не доедет до конца.",
    loseTitle: "ХАСКИ СКУЛИТ",
    quotes: ["ЛУЧШЕ РАССКАЖИ, НА ЧЁ ТЫ ДРОЧИШЬ", "ПОСОСИ Х*ЁВ", "Я ЕБ* СЛОВА", "УБИТЬ РЭПЕРА!"],
    moves: {
      // straight right: quick and clean
      light: { frame: "light", startup: 0.07, active: 0.08, recovery: 0.17, dmg: 6, reach: 112,
        y0: -215, y1: -160, hitstun: 0.34, blockstun: 0.15, knock: 190, height: "high", sfx: "hitLight", stop: 0.06 },
      // side kick to the body
      heavy: { frame: "heavy", startup: 0.14, active: 0.1, recovery: 0.27, dmg: 9, reach: 138, lunge: 60,
        y0: -175, y1: -105, hitstun: 0.45, blockstun: 0.2, knock: 380, height: "mid", sfx: "hitKick", stop: 0.08 },
    },
  },
  ramirez: {
    id: "ramirez", name: "РЭМ", special: "ОБЕЗЬЯНЫ", color: "#b4c94a",
    speed: 280, power: 1.04, specialCd: 6.0, tough: 1.04, jump: 0.95, weight: 1.2, dash: 0.95,
    stats: { "СКОРОСТЬ": 2, "СИЛА": 4, "ЗДОРОВЬЕ": 4 },
    perk: "ФИШКА: пропустил удар — звереет и бьёт сильнее",
    blurb: "Король слэма.",
    loseTitle: "РЭМ ВСЁ",
    quotes: ["УСЛЕДИ ЗА БАЗАРОМ, АГОРАНОМ", "Я ПОТОПЛЮ ТЕБЯ ЗА НЕДОГОН", "ТВОЯ СУКА ГЛОТАЕТ НАШ КОКТЕЙЛЬ", "ДОЛБО*Б ИСЧЕЗ, МНЕ ХВАТИЛО ЛИШЬ ЩЁЛКНУТЬ ЕБ*ЛОМ"],
    moves: {
      // windmill (hardcore dancing): the arm swings a full circle and comes down from above — reaches crouchers
      light: { frame: "light", startup: 0.1, active: 0.1, recovery: 0.2, dmg: 7, reach: 118,
        y0: -240, y1: -100, hitstun: 0.36, blockstun: 0.16, knock: 200, height: "mid", sfx: "hitLight", stop: 0.07 },
      // front push kick: shoves the opponent away
      heavy: { frame: "heavy", startup: 0.15, active: 0.1, recovery: 0.3, dmg: 10, reach: 136,
        y0: -170, y1: -100, hitstun: 0.45, blockstun: 0.22, knock: 520, height: "mid", sfx: "hitKick", stop: 0.09 },
    },
  },
  guf: {
    id: "guf", name: "ГУФ", special: "ЧАЙ", color: "#f0e3b0",
    speed: 295, power: 1.0, specialCd: 5.0, tough: 1.0, jump: 1.0, weight: 1.0, dash: 1.0,
    stats: { "СКОРОСТЬ": 3, "СИЛА": 3, "ЗДОРОВЬЕ": 3 },
    perk: "ФИШКА: иногда пьяно уворачивается от удара",
    blurb: "Пьяный мастер.",
    loseTitle: "ГУФ УМЕР",
    quotes: ["АЛИК В УДАРЕ", "ЧИТАЙ СВОИ СТИШКИ", "КУДА СЪЕБ*ЛСЯ?"],
    moves: {
      // spinning back kick: turns his back, then lunges with a heel strike
      heavy: { frame: "heavy", startup: 0.17, active: 0.1, recovery: 0.3, dmg: 10, reach: 130, lunge: 280, spin: true,
        y0: -205, y1: -110, hitstun: 0.5, blockstun: 0.22, knock: 470, height: "high", sfx: "hitHeavy", stop: 0.1 },
    },
  },
  noize: {
    id: "noize", name: "НОЙЗ", special: "ГИТАРА", color: "#8fc7ff",
    speed: 285, power: 0.97, specialCd: 2.4, tough: 1.05, jump: 0.97, weight: 1.05, dash: 1.0,
    stats: { "СКОРОСТЬ": 2, "СИЛА": 4, "ЗДОРОВЬЕ": 3 },
    perk: "ФИШКА: концовка связки бьёт на 25% сильнее",
    blurb: "Король фристайла с гитарой.",
    loseTitle: "НОЙЗ СДУЛСЯ",
    quotes: ["ПРЕДУПРЕЖДАЮ, У*БЫВАЮ", "ЩА УСТРОЮ ДЕСТРОЙ", "ВЫДЫХАЙСЯ СКОРЕЙ"],
    moves: {
      // plain heavy kick (the guitar is saved for the special)
      heavy: { frame: "heavy", startup: 0.16, active: 0.11, recovery: 0.3, dmg: 10, reach: 158,
        y0: -230, y1: -90, hitstun: 0.48, blockstun: 0.22, knock: 430, height: "mid", sfx: "hitKick", stop: 0.1 },
    },
  },
  oxxxy: {
    id: "oxxxy", name: "ОКСИ", special: "ТЕНТАКЛИ", color: "#e8c88a",
    speed: 330, power: 1.0, specialCd: 3.2, tough: 0.95, jump: 1.03, weight: 0.95, dash: 1.05,
    stats: { "СКОРОСТЬ": 4, "СИЛА": 2, "ЗДОРОВЬЕ": 3 },
    perk: "ФИШКА: длинные связки быстро копят панч",
    blurb: "Лысый из Оксфорда.",
    loseTitle: "ОКСИ ВСЁ",
    quotes: ["У МЕНЯ ТОЖЕ ЕСТЬ ПТИЧКИ", "Я ЗДЕСЬ ЧИСТО ПО ФАНУ", "ТЫ ПОСПЕШИЛ, НАСМЕШИЛ", "Я ЛИШЬ УГОРАЮ С ТЕБЯ"],
    moves: {
      // boxer's double jab
      light: { frame: "light", startup: 0.05, active: 0.16, recovery: 0.14, dmg: 3, reach: 100, hits: 2,
        y0: -212, y1: -150, hitstun: 0.3, blockstun: 0.13, knock: 70, height: "high", sfx: "hitLight", stop: 0.04 },
      // uppercut that launches
      heavy: { frame: "light", startup: 0.12, active: 0.1, recovery: 0.34, dmg: 9, reach: 98, uppercut: true, launch: -760,
        y0: -250, y1: -120, hitstun: 0.55, blockstun: 0.22, knock: 140, height: "mid", sfx: "hitHeavy", stop: 0.1 },
    },
  },
  chip: {
    id: "chip", name: "ЧИПИНКОС", special: "АЗБУКА", color: "#e8c35a",
    speed: 275, power: 1.0, specialCd: 6.0, tough: 1.08, jump: 0.95, weight: 1.1, dash: 0.9,
    stats: { "СКОРОСТЬ": 2, "СИЛА": 4, "ЗДОРОВЬЕ": 4 },
    perk: "ФИШКА: начинает раунд с запасом панча",
    blurb: "Финальный босс. Строчит азбукой как из пулемёта.",
    loseTitle: "ЧИПИНКОС ВЫУЧИЛ УРОК",
    quotes: ["Я ГАНГСТЕР!", "Я И ЕСТЬ ХИП-ХОП!", "ТЫ ЛОХ", "УЧИ МОЮ АЗБУКУ!", "ИДИ НАХ*Й", "ТЫ МАМКИН ГАНГСТЕР"],
    moves: {
      // punch with a fist wrapped in silver chains: a bit longer and heavier than a normal jab
      light: { frame: "light", startup: 0.07, active: 0.09, recovery: 0.17, dmg: 6, reach: 112,
        y0: -210, y1: -150, hitstun: 0.34, blockstun: 0.15, knock: 190, height: "high", sfx: "hitLight", stop: 0.06 },
    },
  },
  face: {
    id: "face", name: "FACE", special: "БУРГЕР", color: "#3fa35a",
    speed: 300, power: 0.9, specialCd: 5.5, tough: 1.0, jump: 1.0, weight: 1.05, dash: 1.0,
    stats: { "СКОРОСТЬ": 3, "СИЛА": 3, "ЗДОРОВЬЕ": 3 },
    perk: "ФИШКА: у стены бьёт на 25% сильнее",
    blurb: "Уронил Запад и Россию.",
    loseTitle: "FACE В БЛЭКЛИСТЕ",
    quotes: ["Я РОНЯЮ ЗАПАД, У", "ЖРИ МОЙ БУРГЕР", "ТЫ ПОПАЛ В БЛЭКЛИСТ!", "МНЕ ПОХ*Й"],
    moves: {
      // shuto: knife-hand chop from above — reaches crouching opponents
      light: { frame: "light", startup: 0.08, active: 0.09, recovery: 0.18, dmg: 7, reach: 112,
        y0: -200, y1: -100, hitstun: 0.32, blockstun: 0.15, knock: 160, height: "mid", sfx: "hitLight", stop: 0.06 },
      // yoko-geri: side kick with huge knockback; slams into the wall
      heavy: { frame: "heavy", startup: 0.15, active: 0.1, recovery: 0.3, dmg: 9, reach: 135, wall: true,
        y0: -185, y1: -120, hitstun: 0.5, blockstun: 0.22, knock: 760, height: "high", sfx: "hitHeavy", stop: 0.09 },
    },
  },
  korzh: {
    id: "korzh", name: "МАКС КОРЖ", special: "ЗЕМЛЕТРЯСЕНИЕ", color: "#e05050",
    speed: 265, power: 1.05, specialCd: 6.0, tough: 1.0, armorActive: 0, jump: 0.9, weight: 1.3, dash: 0.9,
    stats: { "СКОРОСТЬ": 1, "СИЛА": 5, "ЗДОРОВЬЕ": 4 },
    perk: "ФИШКА: тяжёлый удар не сбить лёгким",
    blurb: "Главный собиратель стадионов.",
    loseTitle: "КОРЖ ПРИТИХ",
    quotes: ["Я ВЫБИРАЮ ЖИТЬ В КАЙФ!", "НЕБО ПОМОЖЕТ МНЕ", "ГОРЫ ПО КОЛЕНО", "НУ И ЧТО ТЕБЕ СЫГРАТЬ?",
      "МАЛЫЙ ПОВЗРОСЛЕЛ!", "НУ ЧТО ТЫ, БРАТИШКА, ПРИТИХ?", "Я ЗАТОЛКАЮ ТЕБЯ В ТАЧКУ СИЛОЙ"],
    moves: {
      // wing chun chain punches: three quick hits per press
      light: { frame: "light", startup: 0.05, active: 0.27, recovery: 0.14, dmg: 3, reach: 104, hits: 3,
        y0: -205, y1: -140, hitstun: 0.26, blockstun: 0.12, knock: 60, height: "high", sfx: "hitLight", stop: 0.03 },
      // spinning hook kick: lunges forward while spinning
      heavy: { frame: "heavy", startup: 0.15, active: 0.13, recovery: 0.36, dmg: 10, reach: 132, lunge: 520,
        y0: -220, y1: -140, hitstun: 0.45, blockstun: 0.22, knock: 380, height: "high", sfx: "hitHeavy", stop: 0.09 },
    },
  },
  atl: {
    id: "atl", name: "ATL", special: "ЯДЕРКА", color: "#b06cff",
    speed: 270, power: 1.02, specialCd: 7.5, tough: 1.08, jump: 0.92, weight: 1.1, dash: 0.9,
    stats: { "СКОРОСТЬ": 2, "СИЛА": 3, "ЗДОРОВЬЕ": 4 },
    perk: "ФИШКА: даже через блок посох отнимает здоровье",
    blurb: "Общается с миром мёртвых.",
    loseTitle: "ATL РАСЧЕХЛИЛИ",
    quotes: ["ПОХЕР, ТАНЦУЙТЕ!", "СЛЫШЬ, БРАТИШКА, НЕ БОРЩИ", "Я ВСКРОЮ ТВОЁ ЛИЦО", "Я РАСЧЕХЛЮ СВОЙ БОЖЕСТВЕННЫЙ ФЛОУ",
      "ВЕСЬ ТВОЙ ГЭНГСТА НА ТУАЛЕТНОЙ БУМАГЕ", "ТЫ САМЫЙ КРУПНЫЙ ИЗ СЕКСУАЛЬНЫХ МЕНЬШИНСТВ"],
    // staff: longer reach; "heavy" is a short-range dark-magic bolt instead of a kick
    moves: {
      light: { frame: "light", startup: 0.09, active: 0.1, recovery: 0.2, dmg: 6, reach: 165,
        y0: -200, y1: -130, hitstun: 0.32, blockstun: 0.15, knock: 220, height: "high", sfx: "hitHeavy", stop: 0.06 },
      heavy: { frame: "heavy", startup: 0.16, active: 0.01, recovery: 0.42, dmg: 0, reach: 0,
        y0: 0, y1: 0, hitstun: 0, blockstun: 0, knock: 0, height: "mid", sfx: "hitHeavy", stop: 0, magic: true },
    },
  },
  slava: {
    id: "slava", name: "СЛАВА КПСС", special: "ТОЛПА", color: "#ff5a4a",
    speed: 315, power: 1.04, specialCd: 5.5, tough: 0.97, jump: 1.0, weight: 1.0, dash: 1.1,
    stats: { "СКОРОСТЬ": 4, "СИЛА": 3, "ЗДОРОВЬЕ": 3 },
    perk: "ФИШКА: рывком проскакивает за спину",
    blurb: "Главный трикстер.",
    loseTitle: "СЛАВА В АНТИХАЙПЕ",
    quotes: ["ЛУЧШЕ Я СДОХНУ, ЧЕМ СТАНУ ТОБОЙ!", "Я ЕДИНСТВЕННЫЙ РЭПЕР!", "ТЫ ЛОВИШЬ ПРЯМОЙ В КАДЫК", "АНТИХАЙП!"],
  },
  kreed: {
    id: "kreed", name: "ЕГОР", special: "СИНЯК", color: "#7aa8e8",
    speed: 305, power: 1.06, specialCd: 5.0, tough: 1.0, jump: 1.0, weight: 1.0, dash: 1.0,
    stats: { "СКОРОСТЬ": 3, "СИЛА": 3, "ЗДОРОВЬЕ": 3 },
    perk: "ФИШКА: на последнем здоровье бьёт сильнее",
    blurb: "Главный холостяк страны.",
    loseTitle: "ЕГОР ОТКРИДИЛСЯ",
    quotes: ["СЮДА, БЛИН", "ЭТО НЕ ШОУ-ПРЕДСТАВЛЕНИЕ", "Я САМЫЙ ГРЯЗНЫЙ ЗАЯЦ", "ТЫ ПРИМЕШЬ ЭТУ РОЗУ?"],
  },
  maybe: {
    id: "maybe", name: "МЭЙБИ БЭЙБИ", special: "ХЛЫСТ", color: "#7fb2ff",
    speed: 325, power: 1.0, specialCd: 2.8, tough: 0.95, jump: 1.12, weight: 0.8, dash: 1.1,
    stats: { "СКОРОСТЬ": 4, "СИЛА": 2, "ЗДОРОВЬЕ": 2 },
    perk: "ФИШКА: прыгает выше всех, в прыжке бьёт сильнее",
    blurb: "Принцесса для этих кварталов.",
    loseTitle: "МЭЙБИ В ДРУГОЙ РАЗ",
    quotes: [
      "ЭЙ, МАМОЧКА ДОМА",
      "МОЙ СТИЛИСТ — СТИЛИСТ ТВОЕГО СТИЛИСТА",
      "РАЗНЕСУ ТЕБЕ УТРЕСКИ",
      "ЭТУ КИСКУ ИЗИ ЗАГИБАЮ В ДОГИ!",
      "У МЕНЯ ПОБОЛЬШЕ ЯЙЦА!",
      "ТЫ СИЛИКОНОВЫЙ ГНОМ",
    ],
  },
  morgen: {
    id: "morgen", name: "МОРГЕН", special: "CADILLAC", color: "#ff86d8",
    speed: 345, power: 1.02, specialCd: 5.5, tough: 1.0, jump: 1.0, weight: 0.9, dash: 1.2,
    stats: { "СКОРОСТЬ": 5, "СИЛА": 3, "ЗДОРОВЬЕ": 2 },
    perk: "ФИШКА: удар сразу после рывка сильнее на 30%",
    blurb: "Молодой аристократ.",
    loseTitle: "МОРГЕН СКАТИЛСЯ",
    quotes: ["ПОСОСИ", "МНЕ ПОХ", "ТЫ ПОДОХ"],
    moves: {
      // slap with a wad of cash — bills fly everywhere
      light: { frame: "light", startup: 0.06, active: 0.08, recovery: 0.16, dmg: 6, reach: 104, money: true,
        y0: -218, y1: -150, hitstun: 0.38, blockstun: 0.14, knock: 210, height: "high", sfx: "hitLight", stop: 0.07 },
    },
  },
};
// The bars in the character select are computed from the real numbers above (1–5).
// Strength = power multiplier × average damage of the fighter's own jab and heavy.
function punch(d) {
  const m = d.moves || {};
  const l = m.light || { dmg: 5 }, h = m.heavy || { dmg: 9 };
  return d.power * ((l.dmg * (l.hits || 1)) + (h.magic ? 8 : h.dmg)) / 2;
}
for (const d of Object.values(CHARS)) {
  const st = (v) => Math.max(1, Math.min(5, Math.round(v)));
  d.stats = {
    "СКОРОСТЬ": st(1 + (d.speed - 265) / 20),
    "СИЛА": st(3 + (punch(d) - 7.3) / 0.3),
    "ЗДОРОВЬЕ": st(3 + ((d.tough || 1) - 1) / 0.04),
  };
}
const BASE_IDS = ["guf", "noize", "oxxxy", "morgen", "maybe", "kreed", "slava", "atl", "korzh", "face", "ramirez", "husky", "sqwoz", "shilo", "krip", "tito", "loki", "smoky", "fludd"];
// Chipinkos is the arcade boss; he joins the roster once he has been beaten in the arcade
const CHAR_IDS = [...BASE_IDS];
function chipUnlocked() { return CHAR_IDS.includes("chip"); }
function babUnlocked() { return CHAR_IDS.includes("babangida"); }
const CLOSE_SPECIAL = new Set(["oxxxy", "maybe", "babangida", "smoky"]); // specials that hit at mid range, not projectiles

const STAGES = {
  moscow: { id: "moscow", name: "ГОРОД ДОРОГ", ambient: "snow" },
  thailand: { id: "thailand", name: "ТАИЛАНД", ambient: "motes" },
  concert: { id: "concert", name: "КОНЦЕРТ", ambient: "confetti" },
  londograd: { id: "londograd", name: "ЛОНДОНГРАД", ambient: "rain" },
  bar: { id: "bar", name: "БАР 1703", ambient: "motes" },
  circus: { id: "circus", name: "ЦИРК", ambient: "confetti" },
  yard: { id: "yard", name: "ПАДИК", ambient: "leaves" },
  fountains: { id: "fountains", name: "МЁРТВЫЕ ФОНТАНЫ", ambient: "motes" },
  wasteland: { id: "wasteland", name: "АПОКАЛИПСИС", ambient: "ash" },
  gorgorod: { id: "gorgorod", name: "ГОРГОРОД", ambient: "rain" },
  mansion: { id: "mansion", name: "ОСОБНЯК МОРГЕНА", ambient: "motes" },
  train: { id: "train", name: "АНТИХАЙП-ПОЕЗД", ambient: "none" },
  roof: { id: "roof", name: "ЗАКАТ", ambient: "motes" },
  palenka: { id: "palenka", name: "РЫНОК", ambient: "motes" },
  tunnel: { id: "tunnel", name: "ПЕРЕХОД", ambient: "motes" },
};
const STAGE_IDS = ["moscow", "thailand", "concert", "londograd", "bar", "circus", "yard", "fountains", "wasteland", "gorgorod", "mansion", "train", "roof", "palenka", "tunnel"];
// Circus garland bulbs found in the background art: [x, y, size] in 1280x720 image space
const CIRCUS_BULBS = [[556,17,7],[702,19,8],[784,24,7],[616,36,4],[493,46,5],[810,48,6],[702,55,7],[703,89,7],[142,96,3],[1016,100,8],[147,101,3],[374,114,8],[1046,118,8],[342,133,8],[1078,136,8],[702,142,10],[132,143,3],[586,144,4],[826,145,4],[310,150,8],[1110,152,8],[129,157,5],[705,162,7],[90,161,3],[128,161,3],[108,162,3],[126,163,4],[122,163,3],[278,167,8],[1141,166,8],[122,166,4],[570,168,6],[842,168,6],[136,169,3],[100,170,3],[133,174,5],[90,173,4],[124,172,4],[114,172,3],[140,177,4],[118,178,3],[126,178,3],[134,180,3],[246,182,7],[1172,182,7],[120,181,3],[128,182,4],[162,182,3],[135,190,7],[120,186,4],[130,186,4],[160,186,4],[705,188,7],[144,190,4],[554,190,6],[122,190,3],[858,190,6],[162,193,4],[1205,194,8],[125,193,3],[213,195,7],[148,194,3],[116,195,3],[126,197,3],[132,198,3],[134,198,3],[153,198,4],[164,199,4],[130,200,4],[136,201,3],[153,202,4],[1236,204,8],[128,203,3],[138,204,4],[130,205,3],[153,211,5],[164,210,4],[130,209,3],[539,210,6],[874,211,6],[106,210,3],[132,211,3],[1269,214,7],[706,214,6],[134,214,3],[117,216,3],[164,218,3],[116,220,5],[120,218,3],[126,223,4],[142,223,3],[132,226,3],[524,228,6],[890,228,6],[128,228,3],[94,230,3],[139,231,3],[88,234,3],[150,234,3],[706,238,6],[508,244,5],[906,244,6],[124,245,3],[196,246,3],[120,251,3],[274,256,6],[493,256,5],[922,256,6],[706,258,6],[242,264,6],[129,264,3],[146,266,3],[478,268,6],[938,268,6],[152,268,3],[708,276,6],[462,276,6],[952,276,5],[964,281,5],[448,284,5],[48,284,5],[1271,284,6],[976,285,5],[52,289,5],[431,288,6],[348,290,7],[988,289,5],[1067,290,5],[708,290,5],[104,290,3],[1001,292,5],[357,292,4],[415,292,5],[1014,294,5],[403,294,5],[1060,293,4],[1244,296,8],[201,295,5],[396,294,3],[1021,294,3],[96,296,3],[101,296,3],[352,297,4],[232,299,5],[334,300,5],[107,300,4],[708,301,5],[820,302,3],[1180,302,5],[278,304,3],[310,306,7],[1069,307,8],[1147,306,6],[709,307,5],[402,309,7],[144,308,3],[361,308,4],[1016,310,6],[1116,309,5],[190,310,3],[206,311,5],[214,312,6],[220,312,4],[599,312,3],[606,314,3],[816,314,4],[821,314,4],[825,316,4],[988,317,5],[600,317,3],[456,319,5],[638,319,4],[781,319,5],[144,319,3],[516,319,4],[906,320,4],[533,320,4],[538,320,4],[630,320,4],[884,320,3],[889,320,5],[484,322,5],[525,322,6],[656,324,6],[898,323,5],[548,324,6],[622,323,4],[844,325,6],[875,324,6],[962,326,7],[1130,325,5],[1133,324,5],[582,326,6],[614,324,4],[754,326,6],[800,324,3],[813,324,3],[968,326,4],[1138,325,4],[186,326,3],[806,326,3],[816,327,3],[707,331,6],[711,330,5],[466,336,4],[146,361,4],[318,367,4],[1120,367,4],[951,378,3],[142,384,3],[160,384,4],[330,386,4],[1107,386,4],[943,389,3],[78,390,3],[812,398,4],[596,398,3],[934,404,3],[173,405,4],[1090,407,4],[342,408,4],[507,415,3],[924,415,4],[602,416,4],[806,416,4],[188,426,4],[1076,427,4],[352,429,4],[914,432,4],[518,432,3],[608,434,3],[800,434,3],[146,438,4],[793,444,3]];
// Yard babushkas: anchor (bottom of the bench legs, centre) per pose
const BABUSHKA_META = {"A_idle":{"ax":76,"ay":123},"A_cheer":{"ax":83,"ay":131},"A_shock":{"ax":75,"ay":125},"B_idle":{"ax":76,"ay":124},"B_cheer":{"ax":72,"ay":133},"B_shock":{"ax":76,"ay":123}};
// Bar 1703: the host's anchor (feet centre) per pose
const HOST_META = {"idle": {"ax": 38, "ay": 198}, "point": {"ax": 38, "ay": 194}, "shock": {"ax": 38, "ay": 198}, "win": {"ax": 41, "ay": 206}};

const DIFFICULTIES = {
  easy: { id: "easy", label: "ЛЁГКИЙ", skulls: 1, desc: "Медленно думает, редко защищается",
    think: 0.42, react: 0.34, block: 0.15, attack: 0.45, combo: 0.0, special: 0.18, dodge: 0.2, jumpIn: 0.03 },
  normal: { id: "normal", label: "СРЕДНИЙ", skulls: 2, desc: "Блокирует и прыгает через снаряды",
    think: 0.26, react: 0.22, block: 0.42, attack: 0.6, combo: 0.35, special: 0.32, dodge: 0.55, jumpIn: 0.06 },
  hard: { id: "hard", label: "СЛОЖНЫЙ", skulls: 3, desc: "Комбо, контратаки, быстрая реакция",
    think: 0.15, react: 0.12, block: 0.72, attack: 0.75, combo: 0.85, special: 0.45, dodge: 0.85, jumpIn: 0.09 },
};
const DIFF_IDS = ["easy", "normal", "hard"];

// height: high = ducked by crouching, blocked standing (hold back)
//         low  = must be blocked crouching
//         mid  = blocked either way
const MOVES = {
  light: { frame: "light", startup: 0.06, active: 0.08, recovery: 0.15, dmg: 5, reach: 96,
    y0: -205, y1: -145, hitstun: 0.32, blockstun: 0.14, knock: 170, height: "high", sfx: "hitLight", stop: 0.05 },
  heavy: { frame: "heavy", startup: 0.14, active: 0.10, recovery: 0.26, dmg: 9, reach: 118,
    y0: -125, y1: -25, hitstun: 0.42, blockstun: 0.2, knock: 340, height: "low", sfx: "hitHeavy", stop: 0.08 },
  airLight: { frame: "light", startup: 0.05, active: 0.12, recovery: 0.1, dmg: 5, reach: 90,
    y0: -190, y1: -90, hitstun: 0.3, blockstun: 0.12, knock: 150, height: "mid", sfx: "hitLight", stop: 0.05 },
  airHeavy: { frame: "heavy", startup: 0.1, active: 0.14, recovery: 0.12, dmg: 8, reach: 108,
    y0: -120, y1: 0, hitstun: 0.38, blockstun: 0.18, knock: 260, height: "mid", sfx: "hitHeavy", stop: 0.07 },
};

const SPECIALS = {
  guf: { startup: 0.16, total: 0.5, sfx: "special_guf" },
  noize: { startup: 0.14, total: 0.48, sfx: "special_noize" },
  oxxxy: { startup: 0.2, active: 0.3, total: 0.72, sfx: "special_oxxxy" },
  morgen: { startup: 0.5, total: 0.78, sfx: "special_morgen" },
  kreed: { startup: 0.45, total: 0.8, sfx: "special_kreed" },
  slava: { startup: 0.3, total: 0.9, sfx: "special_slava" },
  atl: { startup: 0.45, total: 0.85, sfx: "special_atl" },
  korzh: { startup: 0.32, total: 0.8, sfx: "special_korzh" },
  face: { startup: 0.3, total: 0.7, sfx: "special_face" },
  chip: { startup: 0.25, total: 1.3, sfx: "special_chip" },
  ramirez: { startup: 0.35, total: 0.85, sfx: "special_ramirez" },
  husky: { startup: 0.32, total: 0.75, sfx: "special_husky" },
  babangida: { startup: 0.45, total: 1.25, sfx: "special_babangida" },
  sqwoz: { startup: 0.42, total: 0.8, sfx: "special_sqwoz" },
  shilo: { startup: 0.45, total: 0.85, sfx: "special_shilo" },
  krip: { startup: 0.55, total: 1.0, sfx: "special_krip" },
  tito: { startup: 0.4, total: 0.8, sfx: "special_tito" },
  loki: { startup: 0.38, total: 0.8, sfx: "special_loki" },
  smoky: { startup: 0.4, total: 1.3, sfx: "whoosh" },
  fludd: { startup: 0.36, total: 0.8, sfx: "whoosh" },
  maybe: { startup: 0.27, active: 0.12, total: 0.74, sfx: "special_maybe" },
};

/* ------------------------------------------------------------------ */
/* Assets                                                              */
/* ------------------------------------------------------------------ */
const ASSET_PATHS = {
  logo: "assets/ui/logo.png",
  dklogo: "assets/ui/dk_logo.png",
  // optional generated art: titlebg -> "assets/ui/title_bg.webp"
  "bg.moscow": "assets/backgrounds/moscow_msu.webp",
  "bg.thailand": "assets/backgrounds/thailand_beach.webp",
  "bg.concert": "assets/backgrounds/concert_stage.webp",
  "bg.londograd": "assets/backgrounds/londograd.webp",
  "bg.bar": "assets/backgrounds/bar_1703.webp",
  "bg.circus": "assets/backgrounds/circus.webp",
  "bg.yard": "assets/backgrounds/yard.webp",
  "bg.fountains": "assets/backgrounds/fountains.webp",
  "bg.wasteland": "assets/backgrounds/wasteland.webp",
  "bg.gorgorod": "assets/backgrounds/gorgorod.webp",
  "bg.mansion": "assets/backgrounds/mansion.webp",
  "bg.train": "assets/backgrounds/train.webp",
  "bg.roof": "assets/backgrounds/roof.webp",
  "roof.sky": "assets/backgrounds/roof_sky.png",
  "bg.palenka": "assets/backgrounds/palenka.webp",
  "bg.tunnel": "assets/backgrounds/tunnel.webp",
  "tunnel.bayan_1": "assets/backgrounds/tunnel_bayan_1.png", "tunnel.bayan_2": "assets/backgrounds/tunnel_bayan_2.png",
  "tunnel.guitar_1": "assets/backgrounds/tunnel_guitar_1.png", "tunnel.guitar_2": "assets/backgrounds/tunnel_guitar_2.png",
  "palenka.idle": "assets/backgrounds/palenka_idle.png", "palenka.close": "assets/backgrounds/palenka_close.png",
  "train.fg": "assets/backgrounds/train_fg.png",
  "train.view": "assets/backgrounds/train_view.png",
  "wasteland.cloud": "assets/backgrounds/wasteland_cloud.png",
  "yard.A_idle": "assets/stage_yard/babA_idle.png",
  "yard.A_cheer": "assets/stage_yard/babA_cheer.png",
  "yard.A_shock": "assets/stage_yard/babA_shock.png",
  "yard.B_idle": "assets/stage_yard/babB_idle.png",
  "yard.B_cheer": "assets/stage_yard/babB_cheer.png",
  "yard.B_shock": "assets/stage_yard/babB_shock.png",
  "bar.crowd_calm": "assets/stage_bar/crowd_calm.png",
  "bar.crowd_hype": "assets/stage_bar/crowd_hype.png",
  "bar.host_idle": "assets/stage_bar/host_idle.png",
  "bar.host_point": "assets/stage_bar/host_point.png",
  "bar.host_shock": "assets/stage_bar/host_shock.png",
  "bar.host_win": "assets/stage_bar/host_win.png",
  "portrait.guf": "assets/portraits/guf_portrait.png",
  "portrait.noize": "assets/portraits/noize_portrait.png",
  "portrait.oxxxy": "assets/portraits/oxxxy_portrait.png",
  "portrait.morgen": "assets/portraits/morgen_portrait.png",
  "portrait.maybe": "assets/portraits/maybe_portrait.png",
  "fx.kettle": "assets/effects/kettle_projectile.png",
  "fx.gnome": "assets/effects/gnome.png",     // optional: face for Maybe's "силиконовый гном"
  "fx.zamay": "assets/effects/zamay.png",     // optional: face for Slava's "антихайп"
  "fx.guitar": "assets/effects/guitar_projectile.png",
  "fx.cadillac": "assets/effects/cadillac_projectile.png",
  "fx.dora_run": "assets/effects/dora_run.png", "fx.dora_swing": "assets/effects/dora_swing.png", "fx.hearse": "assets/effects/hearse.png",
  "fx.stork_1": "assets/effects/stork_1.png", "fx.stork_2": "assets/effects/stork_2.png",
  "fx.fox": "assets/effects/fox.png", "fx.fox_full": "assets/effects/fox_full.png", "fx.amphibian": "assets/effects/amphibian.png",
  "fx.tv": "assets/effects/tv.png", "fx.mug": "assets/effects/mug.png",
  "end.noize": "assets/endings/noize.webp", "end.oxxxy": "assets/endings/oxxxy.webp", "end.guf": "assets/endings/guf.webp", "end.morgen": "assets/endings/morgen.webp", "end.kreed": "assets/endings/kreed.webp", "end.maybe": "assets/endings/maybe.webp", "end.atl": "assets/endings/atl.webp", "end.slava": "assets/endings/slava.webp", "end.loki": "assets/endings/loki.webp", "end.tito": "assets/endings/tito.webp", "end.krip": "assets/endings/krip.webp", "end.babangida": "assets/endings/babangida.webp", "end.ramirez": "assets/endings/ramirez.webp", "end.chip": "assets/endings/chip.webp", "end.korzh": "assets/endings/korzh.webp", "end.shilo": "assets/endings/shilo.webp", "end.face": "assets/endings/face.webp", "end.husky": "assets/endings/husky.webp", "end.sqwoz": "assets/endings/sqwoz.webp", "end.smoky": "assets/endings/smoky.webp", "end.fludd": "assets/endings/fludd.webp",
  "fx.wolf": "assets/effects/wolf.png", "fx.korzh_car": "assets/effects/korzh_car.png",
  "fx.monkey": "assets/effects/monkey_run.png",
  "fx.kanye_fly": "assets/effects/kanye_fly.png",
  "fx.echpochmak": "assets/effects/echpochmak.png",
  "fx.molotov": "assets/effects/molotov.png",
  "fx.pigeon_1": "assets/effects/pigeon_1.png",
  "fx.zilla": "assets/effects/zilla.png",
  "fx.zilla_foot": "assets/effects/zilla_foot.png",
  "fx.pigeon_2": "assets/effects/pigeon_2.png",
  "fx.kanye_lie": "assets/effects/kanye_lie.png",
  "fx.kanye_walk": "assets/effects/kanye_walk.png",
  "fx.sinyak": "assets/effects/sinyak_projectile.png",
  "fx.kpss_jacket_1": "assets/effects/kpss_jacket_1.png",
  "fx.kpss_jacket_2": "assets/effects/kpss_jacket_2.png",
  "fx.kpss_bard_1": "assets/effects/kpss_bard_1.png",
  "fx.kpss_bard_2": "assets/effects/kpss_bard_2.png",
  "fx.kpss_yellow_1": "assets/effects/kpss_yellow_1.png",
  "portrait.slava": "assets/portraits/slava_portrait.png",
  "portrait.atl": "assets/portraits/atl_portrait.png",
  "portrait.korzh": "assets/portraits/korzh_portrait.png",
  "portrait.face": "assets/portraits/face_portrait.png",
  "portrait.chip": "assets/portraits/chip_portrait.png",
  "portrait.ramirez": "assets/portraits/ramirez_portrait.png",
  "portrait.husky": "assets/portraits/husky_portrait.png",
  "portrait.babangida": "assets/portraits/babangida_portrait.png",
  "portrait.smoky": "assets/portraits/smoky_portrait.png",
  "portrait.fludd": "assets/portraits/fludd_portrait.png",
  "fx.icecube": "assets/effects/icecube.png", "fx.rose": "assets/effects/rose.png", "fx.egg": "assets/effects/egg.png", "fx.bill": "assets/effects/bill.png", "fx.sunglasses": "assets/effects/sunglasses.png", "fx.ice_block": "assets/effects/ice_block.png",
  "fx.ice_shard_1": "assets/effects/ice_shard_1.png", "fx.ice_shard_2": "assets/effects/ice_shard_2.png", "fx.ice_shard_3": "assets/effects/ice_shard_3.png", "fx.ice_shard_4": "assets/effects/ice_shard_4.png", "fx.ice_shard_5": "assets/effects/ice_shard_5.png", "fx.ice_shard_6": "assets/effects/ice_shard_6.png", "fx.lollipop": "assets/effects/lollipop.png",
  "portrait.sqwoz": "assets/portraits/sqwoz_portrait.png",
  "portrait.shilo": "assets/portraits/shilo_portrait.png",
  "portrait.krip": "assets/portraits/krip_portrait.png",
  "portrait.tito": "assets/portraits/tito_portrait.png",
  "portrait.loki": "assets/portraits/loki_portrait.png",
  "fx.burger": "assets/effects/burger.png",
  "fx.nuke": "assets/effects/nuke_bomb.png",
  "portrait.kreed": "assets/portraits/kreed_portrait.png",
  "fx.spark": "assets/effects/hit_spark.png",
  "fx.dust": "assets/effects/dust_jump.png",
  "fx.wave": "assets/effects/sound_wave_projectile.png",
};
for (const [cid, frames] of Object.entries(SPRITE_META)) {
  for (const [name, meta] of Object.entries(frames)) ASSET_PATHS[`spr.${cid}.${name}`] = meta.src;
}

const images = {};
let loaded = 0;
let total = 0;
let fontsReady = false;

// Stage-select thumbnails: small copies so the menu doesn't need the full arenas
for (const k of Object.keys(ASSET_PATHS)) {
  if (k.startsWith("bg.")) ASSET_PATHS["thumb." + k.slice(3)] = ASSET_PATHS[k].replace("backgrounds/", "backgrounds/thumbs/");
}
// Only what the menus need blocks the loading screen; full arenas and fight poses
// download in the background right after (and the VS screen waits for them if needed).
function deferredAsset(key) {
  if (key === "bg.concert") return false;                 // title backdrop
  if (key.startsWith("bg.") || key.startsWith("end.") || key.startsWith("yard.") || key.startsWith("bar.") || key.startsWith("wasteland.") || key.startsWith("train.") || key.startsWith("roof.") || key.startsWith("palenka.") || key.startsWith("tunnel.")) return true;
  return key.startsWith("spr.") && !key.endsWith(".idle");
}
let deferredStarted = false;
function loadList(list, onDone) {
  for (const [key, src] of list) {
    const img = new Image();
    img.onload = img.onerror = onDone;
    img.src = src;
    images[key] = img;
  }
}
// A small queue (6 at a time) so the files the next fight needs can jump ahead
// fighter poses first (every fight needs two sets), arenas after
const deferredQueue = Object.entries(ASSET_PATHS).filter(([k]) => deferredAsset(k))
  .sort((a, b) => (a[0].startsWith("spr.") ? 0 : 1) - (b[0].startsWith("spr.") ? 0 : 1));
let deferredActive = 0;
function pumpDeferred() {
  while (deferredStarted && deferredActive < 6 && deferredQueue.length) {
    const [key, src] = deferredQueue.shift();
    deferredActive++;
    loadList([[key, src]], () => { deferredActive--; pumpDeferred(); });
  }
}
function loadDeferred() {
  if (deferredStarted) return;
  deferredStarted = true;
  pumpDeferred();
}
function prioritizeAssets(keys) {
  const want = new Set(keys);
  const front = deferredQueue.filter(([k]) => want.has(k));
  if (!front.length) return;
  const rest = deferredQueue.filter(([k]) => !want.has(k));
  deferredQueue.length = 0; deferredQueue.push(...front, ...rest);
  loadDeferred(); pumpDeferred();
}
function fightAssetKeys(chars, stage) {
  const keys = stage ? ["bg." + stage] : [];
  for (const cid of new Set(chars.filter(Boolean))) {
    for (const k of Object.keys(ASSET_PATHS)) if (k.startsWith(`spr.${cid}.`)) keys.push(k);
  }
  if (stage === "yard" || stage === "bar" || stage === "wasteland" || stage === "train" || stage === "roof" || stage === "palenka" || stage === "tunnel") keys.push(...Object.keys(ASSET_PATHS).filter((k) => k.startsWith(stage + ".")));
  return keys;
}
function fightAssetsReady() {
  prioritizeAssets(fightAssetKeys(G.chars, G.stage));
  return fightAssetKeys(G.chars, G.stage).every((k) => { const i = images[k]; return !!i && i.complete; });   // complete = loaded or failed
}

function loadAssets() {
  const list = Object.entries(ASSET_PATHS).filter(([k]) => !deferredAsset(k));
  total = list.length;
  loadList(list, () => { loaded++; if (loaded >= total) loadDeferred(); });
  setTimeout(loadDeferred, 8000);                          // never stall the rest on one slow file
  const fontLoads = document.fonts
    ? Promise.all([
        document.fonts.load(`40px ${FONT_HEAD}`, "ГУФ ABC"),
        document.fonts.load(`20px ${FONT_PIX}`, "РАУНД 123"),
      ])
    : Promise.resolve();
  Promise.race([fontLoads, new Promise((r) => setTimeout(r, 2500))]).then(() => { fontsReady = true; });
}
loadAssets();

// Offline: a service worker keeps the game's files, so after one visit it starts without internet
// Android app build (the APK serves the files itself — no service worker there)
const IN_APK = /[?&]apk\b/.test(location.search) || location.hostname === "appassets.androidplatform.net";
if (!IN_APK && "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
}

function ready(img) { return img && img.complete && img.naturalWidth > 0; }
function img(key) { const i = images[key]; return ready(i) ? i : null; }

// White silhouettes for hit flashes, generated once per frame image.
const silhouetteCache = new Map();
function silhouette(image, color = "#ffffff") {
  const key = image.src + color;
  let c = silhouetteCache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = image.naturalWidth;
    c.height = image.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(image, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    silhouetteCache.set(key, c);
  }
  return c;
}

/* ------------------------------------------------------------------ */
/* Audio                                                               */
/* ------------------------------------------------------------------ */
const sfxPools = {};
document.querySelectorAll("audio[data-sfx]").forEach((el) => {
  (sfxPools[el.dataset.sfx] = sfxPools[el.dataset.sfx] || []).push(el);
});
const music = document.getElementById("battle-music");
let audioUnlocked = false;
let muted = store.get("muted", false);

const SFX_VOLUME = {
  hitLight: 0.7, hitHeavy: 0.8, hitBody: 0.8, hitCrit: 0.9, block: 0.65, koHit: 1.0, superStart: 0.8, crowdReact: 0.5, hitKick: 0.75, whooshLight: 0.3, whooshHeavy: 0.35, bodyfall: 0.7, parry: 0.55, counter: 0.7, throw: 0.8, sweep: 0.8, wallHit: 0.85, jump: 0.35, land: 0.4, landHeavy: 0.6, dash: 0.45, comboFinisher: 0.85, launch: 0.7, superReady: 0.5, superHit: 0.8, sway: 0.8, armor: 0.75, money: 0.8, special_kreed_hit: 0.85, atl_boom: 0.25, atl_bolt: 0.45, special_face_hit: 0.85, special_morgen_hit: 0.85, special_guf_hit: 0.8, special_noize_hit: 0.8, react_yard: 0.28, react_circus: 0.3, react_concert: 0.45, uiMove: 0.12, uiBack: 0.18, uiPick: 0.35, uiVs: 0.55, uiUnlock: 0.8, uiTimer: 0.5, voice_a_attack: 0.65, voice_a_hurt: 0.65, voice_a_ko: 0.8, voice_b_attack: 0.65, voice_b_hurt: 0.65, voice_b_ko: 0.8, voice_v_attack: 0.65, voice_v_ko: 0.8, voice_g_hurt: 0.65, voice_g_attack: 0.7, react_fountains: 0.5, uiConfirm: 0.25, whoosh: 0.35, ko: 0.9, roundStart: 0.4,
  special_ramirez: 0.7, special_babangida: 0.75, special_sqwoz: 0.75, special_shilo: 0.7, special_krip: 0.7, special_tito: 0.7,
  finish_heartbeat: 0.9, dazed_birds: 0.35, fat_rose_swoon: 0.7, fat_hearse_engine: 0.7, fat_car_door: 0.8, fat_car_leave: 0.7, fat_stork: 0.75, fat_glitch: 0.7, fat_guitar_smash: 0.9, fat_mug_land: 0.85, fat_tea_splash: 0.8, fat_wolf: 0.85, fat_howl: 0.6, fat_monster: 0.85, fat_bubbles: 0.7, fat_burp: 0.8, fat_crowd: 0.7, fat_brawl: 0.8, secret_unlock: 0.7, zilla_step: 0.75, rem_monkeys_hit: 0.75,
  special_husky: 0.8, husky_heal: 0.75, special_loki: 0.8, el_charge: 0.7, el_water: 0.85, el_wood: 0.85, el_earth: 0.9, el_metal: 0.9, el_boom: 0.95, fat_fox: 0.8, boss_reveal: 0.9, bab_fake_death: 0.8,
  special_smoky: 0.9, special_fludd: 0.9, voice_fladality: 1.0, fludd_ice_hit: 0.9, fat_candy_smash: 1.0, voice_chip_win: 1.0, voice_fatality: 1.0, voice_holostyality: 1.0, voice_ragequit: 1.0, voice_finish_him: 1.0,
  fat_bottle_smash: 0.9, fat_laser: 0.75, loki_fire: 0.55, fatality_sting: 0.85, fat_burn: 0.8, fat_flies: 0.7,
  fat_freeze: 0.8, fat_ice_shatter: 0.9, fat_tv_smash: 0.95, fat_stomp: 0.9, fat_dust: 0.8,
  react_wasteland: 0.3, react_gorgorod: 0.35, react_train: 0.3, react_mansion: 0.3, react_roof: 0.3, react_palenka: 0.3, react_tunnel: 0.35, react_moscow: 0.3, react_thailand: 0.3, react_londograd: 0.3, tunnel_busker: 0.22, gorgorod_thunder: 0.5, tunnel_coin: 0.5, palenka_till: 0.7,
  menuSelect: 0.3, special_guf: 0.45, special_noize: 0.4, special_oxxxy: 0.7, special_morgen: 0.7, special_maybe: 0.75, special_kreed: 0.7, special_slava: 0.75, special_atl: 0.15, special_korzh: 0.9, special_face: 0.8, special_chip: 0.8,
};

// impacts get a random pitch on every play (±%), so a hundred punches per fight don't sound identical
const PITCH_VARY = { hitLight: 0.06, hitHeavy: 0.05, hitKick: 0.05, hitBody: 0.05, hitCrit: 0.03, block: 0.1, whooshLight: 0.12, whooshHeavy: 0.1, bodyfall: 0.08, land: 0.1, dash: 0.1, jump: 0.1,
  voice_a_attack: 0.06, voice_a_hurt: 0.06, voice_b_attack: 0.06, voice_b_hurt: 0.06, voice_v_attack: 0.06 };
// Sound effects go through Web Audio: decoded once, then every play is instant and cheap.
// (iPhone Safari stalls badly when many <audio> elements play at once.) The <audio> tags
// remain only as a fallback, e.g. when the game is opened as a local file and fetch() is blocked.
let actx = null, sfxOut = null, voices = 0;
const sfxBuf = {};
function initWebAudio() {
  if (actx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { actx = new AC(); } catch (e) { actx = null; return; }
  sfxOut = actx.createGain(); sfxOut.connect(actx.destination);
  for (const [name, pool] of Object.entries(sfxPools)) {
    sfxBuf[name] = [];
    for (const src of new Set(pool.map((e) => e.getAttribute("src")))) {
      fetch(src).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
        .then((ab) => new Promise((res, rej) => actx.decodeAudioData(ab, res, rej)))
        .then((buf) => sfxBuf[name].push(buf))
        .catch(() => { for (const el of pool) { try { el.load(); } catch (e) {} } });   // fall back to the <audio> tag
    }
  }
}
function unlockAudio() {
  if (actx && actx.state !== "running") { try { actx.resume(); } catch (e) {} }   // iOS suspends it after interruptions
  if (audioUnlocked) return;
  audioUnlocked = true;
  initWebAudio();
  if (!actx) for (const pool of Object.values(sfxPools)) for (const el of pool) { try { el.load(); } catch (e) {} }
}

function playSfx(name) {
  if (!audioUnlocked || muted) return;
  const bufs = sfxBuf[name];
  if (actx && bufs && bufs.length) {
    if (voices > 28) return;   // never pile up more than ~28 sounds at once
    try {
      const srcNode = actx.createBufferSource();
      srcNode.buffer = bufs[Math.floor(Math.random() * bufs.length)];
      const vary = PITCH_VARY[name];
      if (vary) srcNode.playbackRate.value = 1 + (Math.random() * 2 - 1) * vary;
      const g = actx.createGain();
      g.gain.value = SFX_VOLUME[name] ?? 0.8;
      srcNode.connect(g); g.connect(sfxOut);
      voices++; srcNode.onended = () => { voices--; };
      srcNode.start();
      return { stop: () => { try { srcNode.stop(); } catch (e) {} } };
    } catch (e) {}
    return;
  }
  const pool = sfxPools[name];
  if (!pool) return;
  const free = pool.filter((e) => e.paused || e.ended);
  const el = free.length ? free[Math.floor(Math.random() * free.length)] : pool[0];   // random free copy: variants alternate
  try {
    el.currentTime = 0;
    el.volume = SFX_VOLUME[name] ?? 0.8;
    const vary = PITCH_VARY[name];
    el.preservesPitch = el.mozPreservesPitch = el.webkitPreservesPitch = !vary;
    el.playbackRate = vary ? 1 + (Math.random() * 2 - 1) * vary : 1;
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
    return { stop: () => { try { el.pause(); } catch (e) {} } };
  } catch (e) {}
}

// Music follows the screen: menu → select → arena track (boss in the arcade final) → win / lose jingle.
// Tracks load only when first needed, so they don't slow down the start.
const MUSIC = {
  menu: "menu", select: "select", bar: "bar", yard: "yard", circus: "circus", fountains: ["fountains", "fountains_2"], concert: "concert",
  londograd: "londograd", moscow: "moscow", thailand: "thailand", boss: "boss", tutorial: "select",
  wasteland: "wasteland", gorgorod: "gorgorod", mansion: "mansion", train: "train", roof: "roof", palenka: "palenka", tunnel: "tunnel",
  jingle_win: "jingle_win", jingle_lose: "jingle_lose", jingle_arcade_end: "jingle_arcade_end",
};
const MUSIC_VOL = { jingle_win: 0.42, jingle_lose: 0.3, jingle_arcade_end: 0.3 };
let musicKey = null, musicFile = null;
function wantedMusic() {
  const s = G.screen;
  if (s === "loading") return null;
  if (s === "fight") {
    if (!F) return null;
    if (G.tutorial) return "tutorial";
    return G.arcadeBoss ? "boss" : (MUSIC[G.stage] ? G.stage : "bar");
  }
  if (s === "end") {
    if (!F) return null;
    const youWon = G.mode === 2 ? F.matchWinner >= 0 : F.matchWinner === 0;
    return youWon ? "jingle_win" : "jingle_lose";
  }
  if (s === "arcadeEnd") return G.screenT < 16 ? "jingle_arcade_end" : "menu";
  if (s === "character" || s === "stage" || s === "vs" || s === "ladder") return "select";
  return "menu";
}
function updateMusic() {
  if (!audioUnlocked || muted) { if (!music.paused) music.pause(); return; }
  const key = wantedMusic();
  if (key !== musicKey) {
    musicKey = key;
    if (!key) { music.pause(); return; }
    const v = MUSIC[key];
    const file = Array.isArray(v) ? pick(v) : v;
    if (file !== musicFile) {
      musicFile = file;
      music.src = `assets/music/${file}.mp3`;
    }
    music.loop = !key.startsWith("jingle");
    try { music.currentTime = 0; } catch (e) {}
  }
  if (!key) return;
  music.volume = MUSIC_VOL[key] || 0.17;
  // fight music pauses on pause and during the knockout, then carries on
  const hold = G.screen === "fight" && (G.paused || (F && F.phase === "ko"));
  if (hold) { if (!music.paused) music.pause(); return; }
  if (music.paused && !(music.ended && !music.loop)) { const p = music.play(); if (p && p.catch) p.catch(() => {}); }
}
function startMusic(restart = false) { if (restart && musicKey && !musicKey.startsWith("jingle")) { musicKey = null; } }
function stopMusic() {}
// Looping background noise per arena (crowd, wind, rain…) — only arenas that have a file
const AMBIENCE = { bar: "assets/audio/amb_bar.mp3", yard: "assets/audio/amb_yard.mp3", circus: "assets/audio/amb_circus.mp3", concert: "assets/audio/amb_concert.mp3",
  londograd: "assets/audio/amb_londograd.mp3", moscow: "assets/audio/amb_moscow.mp3", thailand: "assets/audio/amb_thailand.mp3", fountains: "assets/audio/amb_fountains.mp3" };
const AMB_VOL = { bar: 0.32, yard: 0.6, circus: 0.38, concert: 0.2, londograd: 0.5, moscow: 0.31, thailand: 0.4, fountains: 0.2 };
// Crowd reaction to big hits and knockouts, per arena
const REACT = { bar: "crowdReact", yard: "react_yard", circus: "react_circus", concert: "react_concert", fountains: "react_fountains",
  wasteland: "react_wasteland", gorgorod: "react_gorgorod", train: "react_train", mansion: "react_mansion", roof: "react_roof", palenka: "react_palenka",
  tunnel: "react_tunnel", moscow: "react_moscow", thailand: "react_thailand", londograd: "react_londograd" };
const REACT_CD = { bar: 4, yard: 14, circus: 16, concert: 6, fountains: 6, wasteland: 14, gorgorod: 14, train: 16, mansion: 12, roof: 16, palenka: 12, tunnel: 14, moscow: 14, thailand: 16, londograd: 14 };   // seconds between crowd reactions
// Fighter voices (grunts): voice set per fighter; only sets with files are used
const VOICE = { guf: "a", korzh: "a", atl: "a", chip: "a", noize: "b", oxxxy: "b", face: "b", kreed: "v", slava: "v", morgen: "v", maybe: "g", ramirez: "a", husky: "b", babangida: "a", sqwoz: "b", shilo: "b", krip: "a", tito: "b", loki: "a", smoky: "a", fludd: "b" };
// a voice set without one of the sounds borrows it: v has no hurt (→ b), g has no attack shout (→ her gasp)
const VOICE_FALLBACK = { voice_v_hurt: "voice_b_hurt", voice_g_hurt: "none", voice_g_ko: "none" };
function voice(f, what, chance = 1) {
  const v = VOICE[f.cid];
  if (!v || Math.random() >= chance) return;
  const k = `voice_${v}_${what}`;
  const alt = sfxPools[k] ? k : VOICE_FALLBACK[k] || `voice_a_${what}`;
  if (alt !== "none") playSfx(alt);
}
const ambEl = new Audio(); ambEl.loop = true; ambEl.preload = "auto";
let ambStage = null;
function updateAmbience() {
  const want = G.screen === "fight" && !G.paused && !muted && audioUnlocked ? AMBIENCE[G.stage] || null : null;
  if (want !== ambStage) {
    ambStage = want;
    try {
      if (!want) ambEl.pause();
      else { ambEl.src = want; ambEl.volume = (AMB_VOL[G.stage] || 0.3) * 0.75; const p = ambEl.play(); if (p && p.catch) p.catch(() => {}); }
    } catch (e) {}
  } else if (want && ambEl.paused) { try { const p = ambEl.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
}
function setMuted(m) {
  muted = m;
  store.set("muted", m);
  updateMusic();
  toast(m ? "ЗВУК ВЫКЛЮЧЕН" : "ЗВУК ВКЛЮЧЁН");
}

/* ------------------------------------------------------------------ */
/* Global state                                                        */
/* ------------------------------------------------------------------ */
const G = {
  screen: "loading",
  mode: 1,                         // 1 = vs bot, 2 = two players
  difficulty: store.get("difficulty", "normal"),
  chars: [null, null],
  stage: null,
  sel: 0,                          // menu cursor
  charCursor: [0, 1],
  picking: 0,
  screenT: 0,
  paused: false,
  pauseSel: 0,
  toast: null,
  time: 0,
};
if (!DIFFICULTIES[G.difficulty]) G.difficulty = "normal";

let F = null; // current fight

function setScreen(name) {
  G.screen = name;
  G.screenT = 0;
  G.sel = 0;
  G.paused = false;
  hitRegions = [];
  hover = null;
  updateTouchVisibility();
}

function toast(text) { G.toast = { text, t: 1.6 }; }

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */
const ACTIONS = ["left", "right", "up", "down", "light", "heavy", "special", "block"];
const heldKeys = new Set();
const tappedKeys = new Set();
const touchHeld = new Set();
const touchTapped = new Set();
const navQueue = [];

const KEYMAP_1P = {
  left: ["ArrowLeft"], right: ["ArrowRight"], up: ["ArrowUp", "Space"], down: ["ArrowDown"],
  light: ["KeyA", "KeyJ", "KeyZ"], heavy: ["KeyS", "KeyK", "KeyX"], special: ["KeyD", "KeyL", "KeyC"],
  block: ["KeyF", "Semicolon", "KeyV"],
};
const KEYMAP_2P = [
  { left: ["KeyA"], right: ["KeyD"], up: ["KeyW"], down: ["KeyS"],
    light: ["KeyF"], heavy: ["KeyG"], special: ["KeyH"], block: ["KeyR"] },
  { left: ["ArrowLeft"], right: ["ArrowRight"], up: ["ArrowUp"], down: ["ArrowDown"],
    light: ["KeyJ", "Numpad1"], heavy: ["KeyK", "Numpad2"], special: ["KeyL", "Numpad3"], block: ["Semicolon", "Numpad0"] },
];

function blankCtrl() {
  const c = { held: {}, pressed: {} };
  for (const a of ACTIONS) { c.held[a] = false; c.pressed[a] = false; }
  return c;
}
const ctrls = [blankCtrl(), blankCtrl()];
const padPrev = [{}, {}];

// Gamepad (DualShock / DualSense / Xbox). Layout:
//   □/X рука · ×/A нога · ○/B спец · △/Y ПАНЧ · R1/L2 блок · L1 бросок · R2 рывок · Options/Start пауза
// Browsers give most pads the "standard" layout; a Sony pad without it (Firefox, some Macs) is read raw.
let padSeen = false;
// Console mode: a handheld (Retroid / Anbernic on Android) or ?console in the URL.
// Hides the touch buttons, shows button hints instead of keyboard keys.
const IS_ANDROID = /Android/i.test(navigator.userAgent);
let padMode = false;
function setPadMode() {
  if (padMode) return;
  padMode = true;
  document.body.classList.add("pad-mode");
  if (typeof updateTouchVisibility === "function") updateTouchVisibility();
  // Android turns the B button into "browser back": keep the page, treat it as НАЗАД
  if (IS_ANDROID && history.pushState) {
    try {
      history.pushState({ rnv: 1 }, "");
      window.addEventListener("popstate", () => {
        navQueue.push({ type: "back", player: -1 });
        try { history.pushState({ rnv: 1 }, ""); } catch (e) {}
      });
    } catch (e) {}
  }
}
if (/[?&](console|apk)\b/.test(location.search)) setTimeout(setPadMode, 0);
// Real pads only: handhelds also expose odd "gamepads" (power keys, fingerprint, gpio) with a couple of buttons
function listPads() {
  const raw = navigator.getGamepads ? navigator.getGamepads() : [];
  const out = [];
  // APK: the app reads the handheld's buttons natively and puts them here (window.__nativePad)
  const np = window.__nativePad;
  if (np && np.b) out.push({ id: "native", mapping: "standard", connected: true,
    buttons: np.b.map((v) => ({ pressed: !!v, value: v ? 1 : 0 })), axes: np.a || [0, 0] });
  for (const g of raw || []) if (g && g.connected !== false && g.buttons && (g.mapping === "standard" || g.buttons.length >= 8)) out.push(g);
  return out;
}
let padSony = false;
function readPad(pad) {
  if (!pad) return null;
  padSony = /054c|sony|dualsense|dualshock|wireless controller/i.test(pad.id);
  if (!padSeen) { padSeen = true; if (G.screen !== "loading" && !IN_APK) toast("Геймпад подключён"); }
  if (IN_APK && !audioUnlocked) unlockAudio();
  setPadMode();
  const b = (n) => !!(pad.buttons[n] && (pad.buttons[n].pressed || pad.buttons[n].value > 0.5));
  const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
  let k;
  if (pad.mapping === "standard" || !/054c|sony|dualsense|dualshock|wireless controller/i.test(pad.id)) {
    k = { cross: b(0), circle: b(1), square: b(2), triangle: b(3), l1: b(4), r1: b(5), l2: b(6), r2: b(7), share: b(8), options: b(9),
      up: b(12), down: b(13), left: b(14), right: b(15) };
  } else {
    // raw Sony layout: □ × ○ △ L1 R1 L2 R2 share options …, d-pad as a hat axis
    const hat = pad.axes.length > 9 ? pad.axes[9] : 2;
    const near = (v) => Math.abs(hat - v) < 0.2;
    k = { square: b(0), cross: b(1), circle: b(2), triangle: b(3), l1: b(4), r1: b(5), l2: b(6), r2: b(7), share: b(8), options: b(9),
      up: near(-1) || near(-0.71) || near(1), right: near(-0.43) || near(-0.71) || near(-0.14), down: near(0.14) || near(-0.14) || near(0.43),
      left: near(0.71) || near(0.43) || near(1) };
  }
  return {
    left: k.left || ax < -0.5, right: k.right || ax > 0.5,
    up: k.up || ay < -0.6, down: k.down || ay > 0.6,
    light: k.square, heavy: k.cross, special: k.circle, block: k.r1 || k.l2,
    super: k.triangle, throw: k.l1, dash: k.r2,
    confirm: k.cross, back: k.circle || k.share, start: k.options,
  };
}

function buildControllers() {
  const list = listPads().map(readPad);
  let pads;
  if (G.mode === 2) pads = [list[0] || null, list[1] || null];
  else {
    // one player: every pad drives P1 (a handheld can expose its buttons as two devices)
    let m = null;
    for (const r of list) { if (!m) m = Object.assign({}, r); else for (const k in r) m[k] = m[k] || r[k]; }
    pads = [m, null];
  }
  for (let p = 0; p < 2; p++) {
    const c = ctrls[p];
    const map = G.mode === 1 ? (p === 0 ? KEYMAP_1P : null) : KEYMAP_2P[p];
    const pad = pads[p];
    for (const a of ACTIONS) {
      const codes = map ? map[a] : [];
      let held = codes.some((k) => heldKeys.has(k));
      let pressed = codes.some((k) => tappedKeys.has(k));
      if (p === 0) {
        held = held || touchHeld.has(a);
        pressed = pressed || touchTapped.has(a);
        // touch-only combo buttons
        if (touchTapped.has("super") && (a === "light" || a === "heavy")) { held = true; pressed = true; }
        if (touchTapped.has("throw") && F && F.fighters) {
          const towards = F.fighters[0].dir > 0 ? "right" : "left";
          if (a === "light") pressed = true;
          if (a === towards || a === "light") held = true;
        }
      }
      if (pad) {
        held = held || pad[a];
        pressed = pressed || (pad[a] && !padPrev[p][a]);
        // combo buttons on the pad: △ = ПАНЧ (рука + нога), L1 = бросок (вперёд + рука)
        const padEdge = (k2) => pad[k2] && !padPrev[p][k2];
        if (padEdge("super") && (a === "light" || a === "heavy")) { held = true; pressed = true; }
        if (padEdge("throw") && F && F.fighters) {
          const towards = F.fighters[p].dir > 0 ? "right" : "left";
          if (a === "light") pressed = true;
          if (a === towards || a === "light") held = true;
        }
      }
      c.held[a] = held || pressed;
      c.pressed[a] = pressed;
    }
    c.dash = (p === 0 && touchTapped.has("dash")) || !!(pad && pad.dash && !padPrev[p].dash);
    // Gamepad → menu navigation / pause
    if (pad) {
      const edge = (k) => pad[k] && !padPrev[p][k];
      if (edge("left")) navQueue.push({ type: "left", player: p });
      if (edge("right")) navQueue.push({ type: "right", player: p });
      if (edge("up")) navQueue.push({ type: "up", player: p });
      if (edge("down")) navQueue.push({ type: "down", player: p });
      const inFight = G.screen === "fight" && !G.paused;   // in a fight ×/○ are kicks and specials, not menu keys
      if (!inFight && edge("confirm")) navQueue.push({ type: "confirm", player: p });
      if (!inFight && edge("back")) navQueue.push({ type: "back", player: p });
      if (edge("start")) navQueue.push({ type: "pause", player: p });
      padPrev[p] = pad;
    }
  }
}

function clearTaps() {
  tappedKeys.clear();
  touchTapped.clear();
}

const BLOCK_DEFAULT = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Tab"]);

const PAD_ECHO = /^(Arrow(Left|Right|Up|Down)|Enter|NumpadEnter|Escape|Space|Backspace|GoBack|BrowserBack)$/;
window.addEventListener("keydown", (e) => {
  unlockAudio();
  if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
  if (padSeen && IS_ANDROID && (PAD_ECHO.test(e.code) || PAD_ECHO.test(e.key) || /^Gamepad/.test(e.code))) { e.preventDefault(); return; }
  if (e.repeat) return;
  heldKeys.add(e.code);
  tappedKeys.add(e.code);

  if (e.code === "KeyM") { setMuted(!muted); return; }
  if (G.screen === "title") checkCodes(e.code);
  if ((G.screen === "title" || G.screen === "mode") && e.code === "KeyS" && !e.repeat) { confirmSfx(); openSecrets(); return; }
  if (G.screen === "end" && (e.code === "Enter" || e.code === "Space") && G.endLock <= 0 &&
      G.endItems && G.endItems[G.sel] && G.endItems[G.sel][0] === "СОХРАНИТЬ") {
    shareResult();
    return;
  }

  // Menu navigation events (per-player in 2P character select).
  const nav = (type, player = 0) => navQueue.push({ type, player, code: e.code, key: e.key });
  switch (e.code) {
    case "ArrowLeft": nav("left", G.mode === 2 ? 1 : 0); break;
    case "ArrowRight": nav("right", G.mode === 2 ? 1 : 0); break;
    case "ArrowUp": nav("up", G.mode === 2 ? 1 : 0); break;
    case "ArrowDown": nav("down", G.mode === 2 ? 1 : 0); break;
    case "KeyA": nav("left", 0); break;
    case "KeyD": nav("right", 0); break;
    case "KeyW": nav("up", 0); break;
    case "KeyS": nav("down", 0); break;
    case "Enter": case "NumpadEnter": case "Space": nav("confirm", -1); break;
    case "KeyF": if (G.screen === "character") nav("confirm", 0); break;
    case "KeyJ": if (G.screen === "character") nav("confirm", 1); break;
    case "Escape": case "Backspace": nav("back", -1); break;
    case "KeyP": nav("pause", -1); break;
    default:
      if (/^Digit[0-9]$/.test(e.code) || /^Numpad[0-9]$/.test(e.code)) nav("digit:" + (e.code.slice(-1) === "0" ? "10" : e.code.slice(-1)), -1);
  }
});
window.addEventListener("keyup", (e) => {
  heldKeys.delete(e.code);
});
window.addEventListener("blur", () => { heldKeys.clear(); touchHeld.clear(); });

document.addEventListener("visibilitychange", () => {
  if (document.hidden && G.screen === "fight" && F && !G.paused) {
    G.paused = true;
    G.pauseSel = 0;
    stopMusic();
    updateTouchVisibility();
  }
});

/* Touch buttons ------------------------------------------------------ */
document.querySelectorAll("#touch-controls button").forEach((btn) => {
  const action = btn.dataset.key;
  const down = (e) => {
    e.preventDefault();
    unlockAudio();
    btn.classList.add("down");
    if (action === "pause") { navQueue.push({ type: "pause", player: 0 }); return; }
    touchHeld.add(action);
    touchTapped.add(action);
    try { btn.setPointerCapture(e.pointerId); } catch (err) {}
  };
  const up = (e) => {
    e.preventDefault();
    btn.classList.remove("down");
    touchHeld.delete(action);
  };
  btn.addEventListener("pointerdown", down);
  btn.addEventListener("pointerup", up);
  btn.addEventListener("pointercancel", up);
  btn.addEventListener("lostpointercapture", up);
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
});

function updateTouchVisibility() {
  const show = G.screen === "fight" && !G.paused && !padMode;
  document.body.classList.toggle("mobile-fight", show);
}

// Phones: full screen + landscape. Browsers only allow this from a tap, so the "turn your phone" screen
// has a button for it, and the first tap on the game in landscape also goes full screen (once).
const isTouch = matchMedia("(pointer: coarse)").matches;
// iPhone Safari ignores user-scalable=no: block double-tap and pinch zoom ourselves
(() => {
  let lastEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastEnd < 350 && !(e.target.closest && e.target.closest("#rotate"))) e.preventDefault();
    lastEnd = now;
  }, { passive: false });
  for (const ev of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
})();
// Android: short buzz on strong hits (iPhone browsers don't support vibration)
function buzz(pattern) { try { if (isTouch && navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }
function goFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  const lock = () => { try { const p = screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape"); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
  try {
    if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
      const p = req.call(el, { navigationUI: "hide" });
      if (p && p.then) p.then(lock, () => {}); else lock();
    } else lock();
  } catch (e) {}
}
(() => {
  const go = document.getElementById("rotate-go"), skip = document.getElementById("rotate-skip");
  if (go) go.addEventListener("click", () => { unlockAudio(); goFullscreen(); });
  // iPhone Safari has no fullscreen API: the only way to hide its bars is "Add to Home Screen"
  const de = document.documentElement;
  if (/iP(hone|od)/.test(navigator.userAgent) && !de.requestFullscreen && !de.webkitRequestFullscreen && !navigator.standalone) {
    const tip = document.getElementById("rotate-ios");
    if (tip) tip.hidden = false;
    if (go) go.style.display = "none";
  }
  if (skip) skip.addEventListener("click", () => { unlockAudio(); document.body.classList.add("portrait-ok"); });
  let asked = false;
  canvas.addEventListener("touchstart", () => {
    if (!isTouch || asked || !matchMedia("(orientation: landscape)").matches) return;
    asked = true; goFullscreen();
  }, { passive: true });
})();

// Virtual joystick: drag anywhere on the stick area; diagonals allowed.
// A fresh push in a direction counts as a press, so a quick double flick forward = dash.
(() => {
  const stick = document.getElementById("stick");
  if (!stick) return;
  const knob = stick.querySelector(".knob");
  let id = null, cx = 0, cy = 0;
  const dirs = ["left", "right", "up", "down"];
  const set = (on) => {
    for (const d of dirs) {
      if (on[d] && !touchHeld.has(d)) { touchHeld.add(d); touchTapped.add(d); }
      if (!on[d]) touchHeld.delete(d);
    }
  };
  const move = (e) => {
    const r = stick.getBoundingClientRect().width / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const len = Math.hypot(dx, dy), max = r * 0.8;
    if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const k = len < r * 0.28 ? 0 : 1;
    set({ left: k && dx < -r * 0.3, right: k && dx > r * 0.3, up: k && dy < -r * 0.5, down: k && dy > r * 0.42 });
  };
  stick.addEventListener("pointerdown", (e) => {
    e.preventDefault(); unlockAudio();
    if (id !== null) return;
    id = e.pointerId;
    const rc = stick.getBoundingClientRect();
    cx = rc.left + rc.width / 2; cy = rc.top + rc.height / 2;
    try { stick.setPointerCapture(id); } catch (err) {}
    move(e);
  });
  stick.addEventListener("pointermove", (e) => { if (e.pointerId === id) { e.preventDefault(); move(e); } });
  const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ""; set({}); };
  stick.addEventListener("pointerup", end);
  stick.addEventListener("pointercancel", end);
  stick.addEventListener("lostpointercapture", end);
})();

// Light up the SUPER button when the meter is full
function updateTouchHints() {
  const b = document.querySelector(".act-super");
  if (!b) return;
  const ready = F && F.fighters && (F.fighters[0].super || 0) >= 100;
  b.classList.toggle("ready", !!ready);
}

/* Pointer → canvas hit regions -------------------------------------- */
let hitRegions = [];
let hover = null;

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
}
function regionAt(p) {
  for (let i = hitRegions.length - 1; i >= 0; i--) {
    const r = hitRegions[i];
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return r;
  }
  return null;
}
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  const r = regionAt(canvasPoint(e));
  hover = r ? r.id : null;
  if (r && r.onHover) r.onHover();
});
// Links must open on a full click/tap: phones block new tabs opened on "finger down"
const LINK_REGIONS = new Set(["tg-logo", "tg-btn"]);
canvas.addEventListener("click", (e) => {
  const r = regionAt(canvasPoint(e));
  if (r && LINK_REGIONS.has(r.id) && r.onClick) r.onClick();
});
canvas.addEventListener("pointerdown", (e) => {
  unlockAudio();
  const r = regionAt(canvasPoint(e));
  if (r && LINK_REGIONS.has(r.id)) return;      // handled by the click listener above
  if (r && r.onClick) { r.onClick(); return; }
  if (G.screen === "title") navQueue.push({ type: "confirm", player: -1 });
});
function region(id, x, y, w, h, onClick, onHover) {
  hitRegions.push({ id, x, y, w, h, onClick, onHover });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function text(str, x, y, o = {}) {
  const size = o.size || 28;
  ctx.save();
  ctx.font = `${size}px ${o.font || FONT_HEAD}`;
  ctx.textAlign = o.align || "left";
  ctx.textBaseline = o.baseline || "middle";
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.shadow !== false) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(str, x + (o.shadowOff ?? Math.max(2, size / 14)), y + (o.shadowOff ?? Math.max(2, size / 14)));
  }
  if (o.stroke) {
    ctx.lineJoin = "round";
    ctx.lineWidth = o.strokeW || Math.max(3, size / 8);
    ctx.strokeStyle = o.stroke;
    ctx.strokeText(str, x, y);
  }
  if (o.gradient) {
    const m = ctx.measureText(str);
    const top = y - size * 0.55;
    const g = ctx.createLinearGradient(0, top, 0, top + size);
    o.gradient.forEach((c, i) => g.addColorStop(i / (o.gradient.length - 1), c));
    ctx.fillStyle = g;
    void m;
  } else {
    ctx.fillStyle = o.color || "#fff";
  }
  ctx.fillText(str, x, y);
  ctx.restore();
}

function textWidth(str, size, font = FONT_HEAD) {
  ctx.save();
  ctx.font = `${size}px ${font}`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(x, y, w, h, o = {}) {
  ctx.save();
  const active = !!o.active;
  // drop shadow
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x + 6, y + 8, w, h);
  // body
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, active ? "#3a2b72" : "rgba(28,22,58,0.94)");
  g.addColorStop(1, active ? "#1d1446" : "rgba(10,8,24,0.94)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // bevel
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(x, y, w, 3);
  // border
  ctx.lineWidth = active ? 5 : 3;
  ctx.strokeStyle = o.border || (active ? GOLD : "rgba(255,213,74,0.45)");
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  if (active) {
    ctx.shadowColor = o.border || GOLD;
    ctx.shadowBlur = 22 + Math.sin(G.time * 6) * 6;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  }
  ctx.restore();
}

function drawCover(image, x, y, w, h, zoom = 1, ox = 0, oy = 0) {
  const s = Math.max(w / image.naturalWidth, h / image.naturalHeight) * zoom;
  const sw = image.naturalWidth * s;
  const sh = image.naturalHeight * s;
  ctx.drawImage(image, x + (w - sw) / 2 + ox, y + (h - sh) / 2 + oy, sw, sh);
}

let shareSafe = null;   // embedded pictures used for the result card when the game runs from a local file
function frameOf(cid, name) {
  const meta = SPRITE_META[cid][name] || SPRITE_META[cid].idle;
  const image = shareSafe ? (shareSafe.spr[cid] && (shareSafe.spr[cid][name] || shareSafe.spr[cid].idle)) || null
    : img(`spr.${cid}.${name}`) || img(`spr.${cid}.idle`);
  return image ? { image, ax: meta.ax, ay: meta.ay } : null;
}

// Draw a pose with its feet at (x, y).
function drawPose(cid, name, x, y, o = {}) {
  const fr = frameOf(cid, name);
  if (!fr) return;
  const dir = o.dir || 1;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(dir * (o.sx || 1) * (o.scale || 1), (o.sy || 1) * (o.scale || 1));
  if (o.rot) ctx.rotate(o.rot);
  ctx.drawImage(fr.image, -fr.ax, -fr.ay);
  if (o.tint) {
    const ga = ctx.globalAlpha;
    ctx.globalAlpha = ga * o.tint.a;
    ctx.drawImage(silhouette(fr.image, o.tint.color), -fr.ax, -fr.ay);
    ctx.globalAlpha = ga;
  }
  if (o.flash) {
    ctx.globalAlpha *= o.flash;
    ctx.drawImage(silhouette(fr.image, o.flashColor || "#ffffff"), -fr.ax, -fr.ay);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Fight setup                                                         */
/* ------------------------------------------------------------------ */
function makeFighter(cid, slot) {
  const twin = slot === 1 && G.twin;
  return {
    cid, data: twin ? twinData(cid) : CHARS[cid], slot, twin, buffT: 0,
    isBot: G.mode === 1 && slot === 1,
    x: slot === 0 ? 340 : W - 340, y: FLOOR_Y,
    vx: 0, vy: 0, dir: slot === 0 ? 1 : -1,
    hp: 100, shownHp: 100, trailHp: 100, trailDelay: 0,
    onGround: true, crouch: false, blocking: false,
    action: null, hitstun: 0, blockstun: 0, specialCd: 0.6,
    combo: 0, comboShow: 0, comboT: 0,
    flash: 0, land: 0, anim: 0, walkDist: 0, ko: false, won: false,
    afterimages: [], afterT: 0,
    ctrl: blankCtrl(),
    ai: { t: 0, move: 0, wantAttack: null, holdBack: 0, holdDown: 0, jump: false, reactT: 0, plan: null },
  };
}

function startMatch() {
  // Krip-a-Krip meets Smoky Mo: the Petersburg showdown (someone real has to be playing)
  if (!G.botVsBot && !G.tutorial && G.chars.includes("krip") && G.chars.includes("smoky")) setTimeout(() => unlockSecret("a_piter"), 1200);
  F = {
    fighters: [makeFighter(G.chars[0], 0), makeFighter(G.chars[1], 1)],
    projectiles: [], particles: [], popups: [], ambient: [],
    round: 1, wins: [0, 0], timer: ROUND_TIME, hintUntil: G.time + 10,
    phase: "intro", phaseT: 0,
    hitstop: 0, slow: 0, shake: 0, flash: 0,
    winner: -1, endType: "", perfect: false,
    quote: null, quoteCd: rand(6, 10),
    camX: 0,
    diff: DIFFICULTIES[G.difficulty],
    stats: { time: 0, maxCombo: [0, 0] },
    birds: [], flicker: 0, money: 0, legend: false,
  };
  setScreen("fight");
  startRound();
  startMusic(true);
}

function startRound() {
  const prev = F.fighters;
  F.fighters = [makeFighter(prev[0].cid, 0), makeFighter(prev[1].cid, 1)];
  F.fighters.forEach((f, i) => { f.super = prev[i].super || 0; if (f.cid === "chip") f.super = Math.max(f.super, 20); });
  if (G.arcadeBoss) {            // arcade final boss: hits a little harder, starts with a quarter of a super
    const b = F.fighters[1];
    b.data = { ...b.data, power: b.data.power * 1.1 };
    b.super = Math.max(b.super, 25);
  }
  F.superCut = null;
  F.projectiles = [];
  F.particles = [];
  F.popups = [];
  F.timer = ROUND_TIME;
  F.phase = "intro";
  F.phaseT = 0;
  F.hitstop = 0;
  F.slow = 0;
  F.winner = -1;
  F.endType = "";
  F.perfect = false;
  F.quote = null;
  F.quoteCd = rand(7, 11);
  F.introSfx = false;
}

function isFinalRound() {
  return F.wins[0] === ROUNDS_TO_WIN - 1 && F.wins[1] === ROUNDS_TO_WIN - 1;
}

/* ------------------------------------------------------------------ */
/* Fighter logic                                                       */
/* ------------------------------------------------------------------ */
function hurtbox(f) {
  if (!f.onGround) return { x0: f.x - 45, x1: f.x + 45, y0: f.y - 200, y1: f.y - 10 };
  if (f.crouch) return { x0: f.x - 52, x1: f.x + 52, y0: f.y - 140, y1: f.y };
  return { x0: f.x - 46, x1: f.x + 46, y0: f.y - 215, y1: f.y };
}

// "finish" = ДОБЕЙ ЕГО: the fight is still on for the winner
function liveFight() { return F.phase === "fight" || F.phase === "finish"; }
function canAct(f) {
  return liveFight() && !f.ko && !f.dazed && !f.action && f.hitstun <= 0 && f.blockstun <= 0;
}

// Crouching heavy: a low sweep that knocks the opponent down
const SWEEP = { frame: "heavy", startup: 0.12, active: 0.1, recovery: 0.36, dmg: 7, reach: 135, sweep: true, knockdown: true,
  y0: -70, y1: 0, hitstun: 0.5, blockstun: 0.2, knock: 90, height: "low", sfx: "hitHeavy", stop: 0.08 };

// Command normals (same for every fighter). `frame` is the dedicated pose; `fallback` is used until it is drawn.
const CMD_MOVES = {
  crouchLight: { frame: "crouch_light", fallback: "light", crouchAtk: true, noWindup: true, startup: 0.05, active: 0.08, recovery: 0.13, dmg: 4, reach: 98,
    y0: -95, y1: -35, hitstun: 0.3, blockstun: 0.13, knock: 90, height: "low", sfx: "hitLight", stop: 0.04 },
  overhead: { frame: "overhead", fallback: "heavy", overhead: true, noWindup: true, startup: 0.3, active: 0.1, recovery: 0.3, dmg: 9, reach: 120, lunge: 160,
    y0: -240, y1: -120, hitstun: 0.55, blockstun: 0.22, knock: 300, height: "overhead", sfx: "hitHeavy", stop: 0.11 },
  launcher: { frame: "launcher", fallback: "light", uppercut: true, launcherMove: true, noWindup: true, startup: 0.1, active: 0.1, recovery: 0.16, dmg: 6, reach: 102,
    y0: -250, y1: -110, hitstun: 0.95, blockstun: 0.2, knock: 60, height: "mid", sfx: "hitHeavy", stop: 0.1, launch: -1080 },
};
CMD_MOVES.airKick = { ...MOVES.airHeavy, frame: "air_kick", fallback: "heavy", airKick: true, noWindup: true, height: "overhead" };

function startAttack(f, type) {
  let moveKey = type;
  if (!f.onGround) moveKey = type === "light" ? "airLight" : "airHeavy";
  let mv = (f.data.moves && f.data.moves[f.onGround ? type : moveKey]) || MOVES[moveKey];
  const fwd = f.dir === 1 ? f.ctrl.held.right : f.ctrl.held.left;
  if (type === "heavy" && f.onGround && f.ctrl.held.down) mv = SWEEP;
  else if (type === "light" && f.onGround && f.ctrl.held.down) mv = CMD_MOVES.crouchLight;
  // (forward + kick used to be an overhead strike — removed: it hijacked every kick while walking in)
  else if (type === "light" && f.launchReady) mv = CMD_MOVES.launcher;
  else if (type === "heavy" && !f.onGround) mv = CMD_MOVES.airKick;
  f.launchReady = false;
  if (mv.fallback && !(SPRITE_META[f.cid] && SPRITE_META[f.cid][mv.frame])) mv = { ...mv, frame: mv.fallback, drawn: false };
  f.action = { type, move: mv, t: 0, hitDone: false, air: !f.onGround, total: mv.startup + mv.active + mv.recovery };
  playSfx(type === "heavy" ? "whooshHeavy" : "whooshLight");
  if (type === "heavy") voice(f, "attack", 0.35);
}

function startSpecial(f) {
  const sp = SPECIALS[f.cid];
  f.action = { type: "special", t: 0, hitDone: false, spawned: false, total: sp.total, startup: sp.startup, sp };
  f.specialCd = Math.max(4.5, f.data.specialCd * 1.4) * (G.cheats.madness ? 0.2 : 1);
  playSfx(G.cheats.tea ? "special_guf" : sp.sfx);
  voice(f, "attack", 0.6);
  if (!f.isBot && !G.tutorial) { const sd = SECRETS.find((x) => x.special === f.cid); if (sd) unlockSecret(sd.id); }
  if (Math.random() < 0.35) sayQuote(f);
}

function updateFighter(f, opp, dt) {
  const c = f.ctrl;
  f.anim += dt;
  f.specialCd = Math.max(0, f.specialCd - dt);
  f.hitstun = Math.max(0, f.hitstun - dt);
  f.blockstun = Math.max(0, f.blockstun - dt);
  f.flash = Math.max(0, f.flash - dt);
  f.land = Math.max(0, f.land - dt);
  f.comboT = Math.max(0, f.comboT - dt);
  f.buffT = Math.max(0, f.buffT - dt);
  if (f.fedT > 0) f.fedT -= dt;
  if (f.chillT > 0) f.chillT -= dt;
  if (f.energyT > 0) f.energyT -= dt;
  if (f.zillaT > 0) { f.zillaT -= dt; f.invulnT = Math.max(f.invulnT || 0, 0.05); f.vx = 0; }
  if (f.cid === "husky" && !f.waterUsed && !f.ko && f.hp > 0 && f.hp <= 25 && F.phase === "fight") {
    f.waterUsed = true; f.healT = 1.2; playSfx("husky_heal");
    popup(f.x, f.y - 320, "ЖИВАЯ ВОДА!", "#7fd8ff", 30);
  }
  if (f.fakeT > 0) {
    f.fakeT -= dt; f.invulnT = Math.max(f.invulnT || 0, 0.1);
    if (f.fakeT <= 0) { f.hp = 18; popup(f.x, f.y - 320, "СЛУХИ ПРЕУВЕЛИЧЕНЫ!", "#c8c8b0", 30); }
  }
  if (f.healT > 0) {
    f.healT -= dt;
    if (!f.ko) f.hp = Math.min(100, f.hp + 12 * dt / 1.2);
    if (Math.random() < dt * 30) F.particles.push({ type: "sq", x: f.x + rand(-40, 40), y: f.y - rand(20, 220), vx: 0, vy: rand(-160, -60),
      life: 0.5, max: 0.5, size: pick([4, 6]), color: pick(["#7fd8ff", "#c8f0ff", "#3fa8e0"]) });
  }
  f.invulnT = Math.max(0, (f.invulnT || 0) - dt);
  f.parryT = Math.max(0, (f.parryT || 0) - dt);
  f.parryCd = Math.max(0, (f.parryCd || 0) - dt);
  {
    const backKey = f.dir === 1 ? "left" : "right";
    if ((c.pressed[backKey] || c.pressed.block) && f.onGround && !f.action && f.parryCd <= 0) { f.parryT = 0.13; f.parryCd = 0.45; }
  }
  if (f.downT > 0) { f.downT -= dt; if (f.downT <= 0) { f.invulnT = 0.2; spawnDust(f.x, f.y, 0.7); } }
  if (f.chainBuf) { f.chainBuf.t -= dt; if (f.chainBuf.t <= 0) f.chainBuf = null; }
  if (f.comboT <= 0) f.comboShow = 0;

  // HP bar trailing animation
  f.shownHp = lerp(f.shownHp, f.hp, 1 - Math.pow(0.0001, dt));
  if (f.trailDelay > 0) f.trailDelay -= dt;
  else f.trailHp = Math.max(f.hp, f.trailHp - 45 * dt);

  if (f.grab) { updateGrab(f, c, dt); if (f.grab) { f.crouch = false; f.blocking = false; f.blockBtn = false; return; } }
  const fighting = liveFight() && !f.ko;
  const free = canAct(f);

  // Face the opponent while grounded and not committed to an action.
  if (fighting && f.onGround && !f.action && Math.abs(opp.x - f.x) > 6) f.dir = opp.x > f.x ? 1 : -1;

  // Crouch / guard
  const back = f.dir === 1 ? c.held.left : c.held.right;
  if (fighting && f.onGround && !f.action && f.hitstun <= 0) {
    f.crouch = c.held.down;
    f.blockBtn = !!c.held.block;
    f.blocking = c.held.down || back || f.blockBtn;
  } else {
    f.crouch = f.onGround && f.blockstun > 0 && f.crouch;
    f.blocking = false;
    f.blockBtn = false;
  }

  // Super: light + heavy together with a full meter
  let special2 = false;
  const bothPressed = (c.pressed.light && (c.held.heavy || c.pressed.heavy)) || (c.pressed.heavy && c.held.light);
  if (fighting && (f.super || 0) >= 100 && f.onGround && f.hitstun <= 0 && bothPressed &&
      (free || (f.action && f.action.type === "light" && f.action.t < 0.12))) {
    startSuper(f); special2 = true;
  }
  // Throw: forward + light right next to a grounded opponent — can't be blocked
  const fwdHeld = f.dir === 1 ? c.held.right : c.held.left;
  if (!special2 && fighting && free && f.onGround && c.pressed.light && fwdHeld && Math.abs(opp.x - f.x) < 125 &&
      opp.onGround && !opp.ko && opp.hitstun <= 0 && !(opp.downT > 0) && !opp.pull && !opp.thrown && !(opp.invulnT > 0) &&
      !(opp.action && opp.action.type === "super")) {
    startThrow(f, opp); special2 = true;
  }
  if (special2) { c.pressed.light = false; c.pressed.heavy = false; f.chainBuf = null; }

  // Chains: light → light → heavy (finisher). Presses during an attack are buffered
  // and come out as soon as the previous hit has connected (hit or block).
  if (fighting && f.action && !f.action.air && (c.pressed.light || c.pressed.heavy)) {
    f.chainBuf = { key: c.pressed.heavy ? "heavy" : "light", t: 0.25 };
  }
  const a0 = f.action;
  let chained = false;
  if (fighting && f.hitstun <= 0 && f.chainBuf && a0 && a0.type === "light" && !a0.air && a0.connected &&
      a0.t >= a0.move.startup + a0.move.active * 0.5) {
    const step = a0.chainStep || 1;
    if (f.chainBuf.key === "light" && step === 1) {
      startAttack(f, "light"); f.action.chainStep = 2; chained = true;
    } else if (f.chainBuf.key === "heavy") {
      startAttack(f, "heavy"); if (step === 2) makeFinisher(f); chained = true;
    }
    if (chained) { f.chainBuf = null; f.dashT = 0; }
  }

  // Launcher: up + light. If the jump already started this very moment, cancel it.
  f.airT = f.onGround ? 0 : (f.airT || 0) + dt;
  if (fighting && c.pressed.light && c.held.up && f.hitstun <= 0 && (f.onGround && canAct(f) || (!f.onGround && f.airT < 0.12 && f.y > FLOOR_Y - 90 && !f.action))) {
    if (!f.onGround) { f.y = FLOOR_Y; f.vy = 0; f.vx = 0; f.onGround = true; }
    f.launchReady = true;
  }
  // Attacks (light can cancel into heavy / special once it has connected; heavy into special)
  const cancel = !chained && f.action && f.action.type === "light" && f.action.hitDone && f.action.t > f.action.move.startup;
  const spCancel = !chained && f.action && f.action.type === "heavy" && f.action.connected && !f.action.air && f.action.t > f.action.move.startup;
  if (spCancel && fighting && c.pressed.special && f.specialCd <= 0 && f.onGround && f.hitstun <= 0) { f.crouch = false; startSpecial(f); popup(f.x, f.y - 300, "ОТМЕНА!", "#c48bff", 24); }
  if (!chained && fighting && (free || cancel) && f.hitstun <= 0) {
    if (c.pressed.special && f.specialCd <= 0 && f.onGround) { f.crouch = false; startSpecial(f); }
    else if (c.pressed.heavy) { f.crouch = false; startAttack(f, "heavy"); }
    else if (c.pressed.light && free) { f.crouch = false; startAttack(f, "light"); }
  }

  // Dash / backdash: double-tap forward or back
  if (fighting && f.onGround && canAct(f)) {
    for (const k of ["left", "right"]) {
      if (!c.pressed[k]) continue;
      const d = k === "right" ? 1 : -1;
      if (f.tap && f.tap.d === d && G.time - f.tap.t < 0.27) { startDash(f, d); f.tap = null; }
      else f.tap = { d, t: G.time };
    }
  }
  if (c.dash && fighting && f.onGround && canAct(f)) startDash(f, f.dir);      // touch dash button
  if (f.dashT > 0 && (f.action || f.hitstun > 0 || f.blockstun > 0 || !f.onGround || c.held.up)) f.dashT = 0;   // jump cancels a dash

  // Horizontal movement
  if (f.onGround && f.dashT > 0) {
    f.dashT -= dt;
    f.vx = f.dashV * (f.dashT > 0.06 ? 1 : 0.5);
  } else if (f.onGround) {
    let target = 0;
    if (canAct(f) && !f.crouch && !f.blockBtn) {      // holding БЛОК plants you in place
      const dirInput = (c.held.right ? 1 : 0) - (c.held.left ? 1 : 0);
      const isBack = dirInput !== 0 && dirInput !== f.dir;
      target = dirInput * f.data.speed * 1.15 * (isBack ? 0.8 : 1) * (f.chillT > 0 ? 0.55 : 1);
      if (c.held.up) {
        f.vy = -JUMP_V * (f.data.jump || 1);
        f.onGround = false;
        f.vx = dirInput * f.data.speed * 0.95;
        target = f.vx;
        spawnDust(f.x, f.y, 0.8);
        playSfx("jump");
      }
    }
    if (f.onGround) {
      const accel = f.hitstun > 0 || f.blockstun > 0 ? 1500 : 2800;
      const diff = target - f.vx;
      const step = accel * dt;
      f.vx = Math.abs(diff) <= step ? target : f.vx + Math.sign(diff) * step;
      if (f.action && f.action.type !== "special") f.vx *= Math.pow(0.0005, dt);
    }
  }

  // Physics
  f.x += f.vx * dt;
  f.vy += GRAVITY * dt;
  f.y += f.vy * dt;
  if (f.y >= FLOOR_Y) {
    if (!f.onGround) {
      f.land = 0.12;
      spawnDust(f.x, FLOOR_Y, (f.vy > 900 ? 1.2 : 0.8) * (f.data.weight || 1));
      if ((f.data.weight || 1) >= 1.25 && f.vy > 600) F.shake = Math.max(F.shake, 5);
      if (f.ko || f.downT > 0 || (f.hitstun > 0 && f.vy > 500)) playSfx("bodyfall");
      else playSfx((f.data.weight || 1) >= 1.25 ? "landHeavy" : "land");
      if (f.action && f.action.air) f.action = null;
      if (f.ko && f.vy > 700) { // bounce once on KO
        f.vy = -f.vy * 0.3;
        f.y = FLOOR_Y - 1;
        F.shake = Math.max(F.shake, 10);
      } else {
        f.vy = 0;
        f.y = FLOOR_Y;
        f.onGround = true;
        if (f.ko) f.vx *= 0.3;
      }
    } else {
      f.y = FLOOR_Y;
      f.vy = 0;
    }
  } else {
    f.onGround = false;
  }
  if (f.onGround && f.ko) f.vx *= Math.pow(0.02, dt);

  // Wall splat (FACE's yoko-geri)
  f.wallT = Math.max(0, (f.wallT || 0) - dt);
  if (f.wallT > 0 && !f.ko && ((f.x <= WALL_L + 2 && f.vx < -150) || (f.x >= WALL_R - 2 && f.vx > 150))) {
    f.wallT = 0;
    f.vx = -f.vx * 0.45;
    f.vy = Math.min(f.vy, -260);
    f.onGround = false;
    f.hp = Math.max(0, f.hp - 5);
    f.flash = 0.1;
    hitSpark(f.x, f.y - 140, 8);
    popup(f.x, f.y - 300, "В СТЕНУ! -5", "#ff9a3d", 30);
    F.shake = Math.max(F.shake, 12);
    playSfx("wallHit");
    if (f.hp <= 0) endRound("ko", f.wallBy, f.x < W / 2 ? 1 : -1);
  }
  // Walls
  if (f.x < WALL_L) { f.x = WALL_L; if (f.ko && f.vx < -200) { f.vx = -f.vx * 0.3; spawnDust(f.x, f.y - 100, 1); } }
  if (f.x > WALL_R) { f.x = WALL_R; if (f.ko && f.vx > 200) { f.vx = -f.vx * 0.3; spawnDust(f.x, f.y - 100, 1); } }

  if (f.onGround && Math.abs(f.vx) > 20 && !f.action && f.hitstun <= 0) f.walkDist += Math.abs(f.vx) * dt;

  // Action timeline
  if (f.action) {
    const a = f.action;
    a.t += dt;
    if (a.type === "special") updateSpecial(f, opp, a);
    else {
      const mv = a.move;
      if (mv.magic) {
        if (!a.spawned && a.t >= mv.startup) {
          a.spawned = true;
          F.projectiles.push({ kind: "magic", owner: f.slot, dir: f.dir, x: f.x + f.dir * 150, y: f.y - 168,
            vx: f.dir * 820, w: 70, h: 56, dmg: 8, life: 0.55, hit: false, height: "mid", t: 0 });
          playSfx("atl_bolt");
        }
      } else if (mv.hits) {
        const per = mv.active / mv.hits;
        const idx = Math.floor((a.t - mv.startup) / per);
        if (a.t >= mv.startup && idx < mv.hits && idx > (a.hitIdx ?? -1)) {
          a.hitIdx = idx;
          a.hitDone = false;
          meleeCheck(f, opp, a);
          if (idx > 0) playSfx("hitLight");
        }
      } else if (!a.hitDone && a.t >= mv.startup && a.t < mv.startup + mv.active) meleeCheck(f, opp, a);
      if (mv.lunge && a.t < mv.startup + mv.active) f.x = clamp(f.x + f.dir * mv.lunge * dt, WALL_L, WALL_R);
    }
    if (a.t >= a.total) f.action = null;
  }

  // Afterimages on heavy / special
  f.afterT -= dt;
  if (((f.action && (f.action.type === "heavy" || f.action.type === "special" || f.action.type === "super")) || f.dashT > 0) && f.afterT <= 0) {
    f.afterT = 0.035;
    const name = poseName(f);
    f.afterimages.push({ name, x: f.x, y: f.y, dir: f.dir, life: 0.16 });
  }
  for (const ai of f.afterimages) ai.life -= dt;
  f.afterimages = f.afterimages.filter((a) => a.life > 0);
}

function meleeCheck(f, opp, a) {
  const mv = a.move;
  const near = f.x + f.dir * 18;
  const far = f.x + f.dir * (18 + mv.reach);
  const box = { x0: Math.min(near, far), x1: Math.max(near, far), y0: f.y + mv.y0, y1: f.y + mv.y1 };
  if (overlap(box, hurtbox(opp))) {
    a.hitDone = true;
    const res = applyHit(f, opp, {
      dmg: mv.dmg, height: mv.height, hitstun: mv.hitstun, blockstun: mv.blockstun,
      knock: mv.knock, dir: f.dir, sfx: mv.sfx, stop: mv.stop, chip: 0, wall: mv.wall, launch: mv.launch, knockdown: mv.knockdown, melee: true,
      sparkX: opp.x - f.dir * 20, sparkY: f.y + (mv.y0 + mv.y1) / 2,
    });
    if (res === "block") a.hitDone = true;
    if (res === "hit" || res === "block") a.connected = res;
    if (res === "hit" && mv.money) {
      playSfx("money");
      for (let i = 0; i < 14; i++) F.particles.push({ type: "sq", x: opp.x - f.dir * 10, y: f.y - 180 + rand(-20, 20),
        vx: f.dir * rand(60, 360), vy: rand(-420, -120), g: 900, life: rand(0.5, 0.9), max: 0.9, size: pick([6, 8]), color: pick(["#7fd17a", "#a8e89a", "#4f9e4a", "#e8f5d0"]) });
      popup(opp.x, opp.y - 300, "$$$", "#8dff7a", 30);
    }
    if (res === "hit" && mv.finisher) {
      popup(opp.x, opp.y - 340, FINISHERS[f.cid] || "СВЯЗКА!", GOLD, 36);
      F.shake = Math.max(F.shake, 16);
      F.flash = Math.max(F.flash, 0.08);
      F.hypeUntil = G.time + 1.4;
    }
  }
}

function updateSpecial(f, opp, a) {
  const sp = a.sp;
  if (G.cheats.tea && f.cid !== "guf") {
    if (a.spawned || a.t < sp.startup) return;
    a.spawned = true;
    F.projectiles.push({
      kind: "kettle", owner: f.slot, dir: f.dir, x: f.x + f.dir * 110, y: f.y - 128,
      vx: f.dir * 560, w: 84, h: 64, dmg: 13, life: 2.4, hit: false, rot: 0, height: "mid", t: 0,
    });
    return;
  }
  if (f.cid === "maybe") {
    if (a.t >= sp.startup && a.t < sp.startup + sp.active && !a.hitDone) {
      const near = f.x + f.dir * 40;
      const far = f.x + f.dir * WHIP_LEN;
      const box = { x0: Math.min(near, far), x1: Math.max(near, far), y0: f.y - 210, y1: f.y - 120 };
      const hb = hurtbox(opp);
      if (overlap(box, hb)) {
        a.hitDone = true;
        const tip0 = f.x + f.dir * (WHIP_LEN - 150);
        const tip = overlap({ x0: Math.min(tip0, far), x1: Math.max(tip0, far), y0: box.y0, y1: box.y1 }, hb);
        // the hair wraps around the opponent, yanks them in and Maybe throws them over herself
        const res = applyHit(f, opp, {
          dmg: tip ? 14 : 11, height: "mid", hitstun: 2, blockstun: 0.2,
          knock: 0, dir: f.dir, sfx: tip ? "hitHeavy" : "hitLight", stop: tip ? 0.12 : 0.07, chip: 2,
          sparkX: opp.x - f.dir * 16, sparkY: f.y - 165,
        });
        if (res === "hit") {
          opp.pull = { by: f.slot, t: 0.24, dist: 70, mode: "throw" };
          popup(opp.x, opp.y - 320, tip ? "ЩЕЛЧОК!" : "СЮДА!", "#9fd0ff", 32);
        }
      }
    }
    return;
  }
  if (f.cid === "smoky") {
    // КАРА-ТЭ: smoke gathers, he dissolves; two smoke clones strike from behind and from the air,
    // then the real Smoky steps out of the cloud with a palm strike that blasts the opponent away
    const puff = (x, y, n, sp, col) => { for (let i = 0; i < n; i++) { const an = rand(0, 6.28), v = rand(sp * 0.4, sp); F.particles.push({ type: "puff", x: x + rand(-20, 20), y: y + rand(-30, 30), vx: Math.cos(an) * v, vy: Math.sin(an) * v - 40, life: rand(0.4, 0.9), max: 0.9, size: pick([8, 10, 12, 14]), color: col || pick(["rgba(220,225,240,0.75)", "rgba(175,185,205,0.7)", "rgba(130,140,165,0.6)"]) }); } };
    if (a.t < sp.startup) {
      if (Math.random() < 0.7) { const an = rand(0, 6.28); F.particles.push({ type: "puff", x: f.x + Math.cos(an) * 140, y: f.y - 120 + Math.sin(an) * 110, vx: -Math.cos(an) * 320, vy: -Math.sin(an) * 250, life: 0.42, max: 0.42, size: pick([8, 10, 12]), color: "rgba(205,212,232,0.7)" }); }
      return;
    }
    if (!a.dashed) {
      a.dashed = true; a.kara = 0;
      a.ox = clamp(Math.abs(opp.x - f.x) < 520 ? opp.x : f.x + f.dir * 600, WALL_L + 130, WALL_R - 130);
      a.oy = opp.y; a.reach = Math.abs(opp.x - f.x) < 520 && !opp.ko;
      puff(f.x, f.y - 120, 34, 260);
      popup(f.x, f.y - 300, "КИЯ!", "#fff6c8", 46);
      playSfx("special_smoky"); playSfx("whooshHeavy");
      F.shake = Math.max(F.shake, 6);
      f.invulnT = 0.5;
      f.x = clamp(a.ox - f.dir * 125, WALL_L, WALL_R);      // he is already waiting in front of the opponent, hidden
    }
    // [time, side (1 = behind the opponent, 0 = in the air, -1 = the real one in front), dmg, knock]
    const HITS = [[0.55, 1, 3, 0], [0.72, 0, 3, 0], [0.92, -1, 7, 900]];
    while (a.kara < 3 && a.t >= HITS[a.kara][0] - 0.1 && !a["shown" + a.kara]) {
      a["shown" + a.kara] = true;
      const side = HITS[a.kara][1];
      const cx = side === 1 ? a.ox + f.dir * 115 : side === 0 ? a.ox - f.dir * 70 : f.x;
      puff(cx, f.y - (side === 0 ? 230 : 120), 18, 200);
      playSfx("whoosh");
    }
    while (a.kara < 3 && a.t >= HITS[a.kara][0]) {
      const [, side, dmg, knock] = HITS[a.kara]; const last = a.kara === 2; a.kara++;
      if (!a.reach) { if (last) popup(f.x + f.dir * 120, f.y - 300, "МИМО!", "#fff6c8", 26); continue; }
      const dir = side === 1 ? -f.dir : f.dir;
      const res = applyHit(f, opp, { dmg, height: side === 0 ? "overhead" : "mid", hitstun: last ? 0.9 : 0.45, blockstun: 0.2, knock, dir,
        sfx: last ? "hitCrit" : "hitHeavy", stop: last ? 0.22 : 0.08, chip: last ? 3 : 1, noScale: true, launch: last ? -700 : -120,
        sparkX: opp.x - dir * 20, sparkY: opp.y - (side === 0 ? 210 : last ? 140 : 170) });
      F.zoom = Math.max(F.zoom || 0, last ? 0.12 : 0.05); F.zoomX = opp.x; F.zoomY = opp.y - 140;
      F.shake = Math.max(F.shake, last ? 22 : 9);
      if (res === "hit" || res === "block") {
        popup(opp.x, opp.y - 300 - a.kara * 22, ["КИ!", "КИ!", "КАРА-ТЭ!"][a.kara - 1], last ? "#c8d4ff" : "#e8ecf8", last ? 48 : 30);
        if (last) {
          F.flash = Math.max(F.flash, 0.5); buzz([60, 30, 200]);
          for (let r = 0; r < 3; r++) F.particles.push({ type: "ring", x: opp.x - f.dir * 30, y: opp.y - 140, life: 0.3 + r * 0.12, max: 0.3 + r * 0.12, color: "#dfe6ff" });
          puff(opp.x - f.dir * 40, opp.y - 140, 40, 520);
        }
      }
    }
    return;
  }
  if (f.cid === "babangida") {
    // Bushido: iai stance (screen darkens), a flash, he is already behind the opponent; a beat later the cut lands
    if (!a.dashed && a.t >= sp.startup) {
      a.dashed = true;
      const fromX = f.x;
      const inRange = Math.abs(opp.x - f.x) < 640 && (opp.x - f.x) * f.dir > -30 && !opp.ko;
      f.x = inRange ? clamp(opp.x + f.dir * 150, WALL_L, WALL_R) : clamp(f.x + f.dir * 420, WALL_L, WALL_R);
      for (let i = 0; i < 26; i++) { const k = i / 25; F.particles.push({ type: "sq", x: fromX + (f.x - fromX) * k, y: f.y - rand(120, 200), vx: 0, vy: 0, life: 0.35, max: 0.35, size: pick([3, 4, 6]), color: pick(["#ffffff", "#ff3a3a", "#ffd0d0"]) }); }
      F.flash = Math.max(F.flash, 0.1); playSfx("whoosh");
      a.cut = inRange && opp.onGround ? a.t + 0.4 : null;     // a jump at the right moment dodges it
      if (inRange && !a.cut) popup(opp.x, opp.y - 330, "МИМО!", "#fff6c8", 28);
    }
    if (a.cut && a.t >= a.cut) {
      a.cut = null;
      const res = applyHit(f, opp, { dmg: 18, height: "mid", hitstun: 0.85, blockstun: 0.3, knock: 320, dir: Math.sign(opp.x - f.x) || -f.dir,
        sfx: "hitCrit", stop: 0.18, chip: 4, noScale: true, launch: -620, sparkX: opp.x, sparkY: opp.y - 150 });
      F.projectiles.push({ kind: "cut", owner: f.slot, x: opp.x, y: opp.y - 150, w: 1, h: 1, vx: 0, t: 0, life: 0.6, hit: true, pierce: true });
      if (res === "hit") { popup(opp.x, opp.y - 330, "БУСИДО", "#ff3a3a", 40); F.shake = Math.max(F.shake, 12); }
    }
    return;
  }
  if (f.cid === "oxxxy") {
    if (a.t >= sp.startup && a.t < sp.startup + sp.active && !a.hitDone) {
      const near = f.x + f.dir * 70;
      const far = f.x + f.dir * 430;
      const box = { x0: Math.min(near, far), x1: Math.max(near, far), y0: f.y - 205, y1: f.y - 30 };
      if (overlap(box, hurtbox(opp))) {
        a.hitDone = true;
        // tentacles grab and drag the opponent right in front of Oxxxy — free follow-up
        const res = applyHit(f, opp, {
          dmg: 12, height: "mid", hitstun: 0.95, blockstun: 0.26, knock: 0, dir: f.dir,
          sfx: "hitHeavy", stop: 0.1, chip: 3,
          sparkX: opp.x, sparkY: opp.y - 120,
        });
        if (res === "hit") {
          opp.pull = { by: f.slot, t: 0.3, dist: 100, mode: "pull" };
          popup(opp.x, opp.y - 320, "СЮДА!", "#c48bff", 30);
        }
      }
    }
    return;
  }
  if (a.spawned || a.t < sp.startup) return;
  a.spawned = true;
  if (f.cid === "chip") {
    // ABC machine gun: all 33 letters of the Russian alphabet in a burst; every other one hurts
    const ABC = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
    for (let i = 0; i < ABC.length; i++) {
      const last = i === ABC.length - 1;
      F.projectiles.push({ kind: "letter", ch: ABC[i], owner: f.slot, dir: f.dir, delay: i * 0.03,
        x: f.x + f.dir * 95, y: f.y - 168 + Math.sin(i * 1.7) * 26, vx: f.dir * 1050, vy: rand(-40, 40),
        w: 34, h: 40, dmg: last ? 4 : 1, life: 1.6, hit: false, height: "mid", t: 0, harmless: !last && i % 2 === 1, last });
    }
    F.shake = Math.max(F.shake, 4);
  } else if (f.cid === "face") {
    // giant burger rolls along the floor and bounces back off the wall once
    F.projectiles.push({ kind: "burger", owner: f.slot, dir: f.dir, x: f.x + f.dir * 90, y: FLOOR_Y - 70,
      vx: f.dir * 600, w: 150, h: 92, dmg: 14, life: 4.5, hit: false, height: "unblockable", pierce: true, t: 0, rot: 0, bounces: 0 });
  } else if (f.cid === "korzh") {
    // earthquake: a crack runs along the floor both ways; anyone standing on the ground when it passes falls
    F.projectiles.push({ kind: "quake", owner: f.slot, dir: f.dir, x: f.x, y: FLOOR_Y, vx: 0, w: 1, h: 1,
      dmg: 15, life: 1.8, hit: false, height: "unblockable", t: 0, pierce: true, speed: 950 });
    F.shake = Math.max(F.shake, 16);
  } else if (f.cid === "atl") {
    // nuclear strike: a target marker tracks the opponent, locks, then the warhead drops
    F.projectiles.push({ kind: "nuke", owner: f.slot, dir: f.dir, x: opp.x, y: -200, vx: 0, w: 280, h: 1,
      dmg: 24, life: 3.2, hit: false, height: "unblockable", t: 0, pierce: true });
    F.flash = Math.max(F.flash, 0.15);
  } else if (f.cid === "slava") {
    // three alter egos run out from behind Slava one after another
    ["jacket", "bard", "yellow"].forEach((who, i) => {
      F.projectiles.push({
        kind: "runner", who, owner: f.slot, dir: f.dir, delay: i * 0.24,
        x: f.x - f.dir * (260 + i * 10), y: FLOOR_Y - 110,
        vx: f.dir * 820, w: 110, h: 200, dmg: 6, life: 3.0, hit: false, height: "mid", pierce: true, t: 0,
        last: i === 2,
      });
    });
  } else if (f.cid === "loki") {
    // Molotov: a bottle thrown in an arc; it smashes on the floor (or on the opponent) and leaves a pool of fire
    const x0 = f.x + f.dir * 70, y0 = FLOOR_Y - 230, T = 0.7, g = 1600;
    const tx = clamp(opp.x - f.dir * 20, f.x + f.dir * 160 < opp.x === (f.dir > 0) ? opp.x - 400 : opp.x, opp.x + 400);
    const vx = clamp((opp.x - x0) / T, -900, 900);
    F.projectiles.push({ kind: "molotov", phase: "fly", owner: f.slot, dir: f.dir, x: x0, y: y0,
      vx: Math.abs(vx) < 220 ? f.dir * 220 : vx, vy: (FLOOR_Y - 20 - y0 - 0.5 * g * T * T) / T, g, rot: 0,
      w: 50, h: 50, dmg: 10, life: 6, hit: false, height: "mid", pierce: true, t: 0 });
    void tx;
  } else if (f.cid === "tito") {
    // "Do like me": a glowing double steps out from behind him and flies in with a kick at head height — duck or block
    F.projectiles.push({ kind: "double", owner: f.slot, dir: f.dir, x: f.x - f.dir * 40, y: FLOOR_Y - 175,
      vx: f.dir * 980, w: 150, h: 80, dmg: 14, life: 1.6, hit: false, height: "high", pierce: true, t: 0 });
    F.flash = Math.max(F.flash, 0.08);
  } else if (f.cid === "krip") {
    // Glebzilla: Krip turns into a giant monster that charges across the arena and rams the opponent.
    // Block to take only a scratch; otherwise you're sent flying.
    F.projectiles.push({ kind: "zilla", owner: f.slot, dir: f.dir, x: f.x, y: FLOOR_Y, x0: f.x,
      vx: 0, w: 230, h: 380, dmg: 18, life: 2.2, hit: false, pierce: true, height: "mid", t: 0, phase: "grow" });
    f.zillaT = 2.2;
    F.shake = Math.max(F.shake, 14); F.flash = Math.max(F.flash, 0.12);
    popup(f.x, f.y - 330, "ГЛЕБЗИЛЛА!", "#7ccf5a", 40);
  } else if (f.cid === "shilo") {
    // a flock of angry pigeons sweeps in at head height and pecks: duck under it or block
    const birds = [];
    for (let i = 0; i < 14; i++) birds.push({ dx: rand(-130, 130), dy: rand(-40, 40), ph: rand(0, 6.28), s: rand(0.8, 1.15) });
    F.projectiles.push({ kind: "pigeons", owner: f.slot, dir: f.dir, x: f.x - f.dir * 120, y: FLOOR_Y - 185,
      vx: f.dir * 720, w: 260, h: 70, dmg: 3, life: 3, hit: false, pierce: true, height: "high", t: 0, birds, hits: 0, nextHit: 0 });
  } else if (f.cid === "sqwoz") {
    // giant echpochmak flies straight at chest height, spinning: too big to duck under — jump it or block
    F.projectiles.push({ kind: "pie", owner: f.slot, dir: f.dir, x: f.x + f.dir * 110, y: FLOOR_Y - 85,
      vx: f.dir * 900, w: 110, h: 80, dmg: 14, life: 2.4, hit: false, rot: 0, height: "mid", t: 0 });
  } else if (f.cid === "husky") {
    // throws Kanye in a high arc that lands on the opponent's head: crouching won't help, block standing or step away
    const x0 = f.x + f.dir * 60, y0 = FLOOR_Y - 250, T = 0.8, g = 1700, yt = FLOOR_Y - 120;
    const vx = clamp((opp.x - x0) / T, -950, 950);
    F.projectiles.push({ kind: "kanye", phase: "fly", owner: f.slot, dir: f.dir, x: x0, y: y0,
      vx: Math.abs(vx) < 200 ? f.dir * 200 : vx, vy: (yt - y0 - 0.5 * g * T * T) / T, g, rot: 0,
      w: 150, h: 120, dmg: 14, life: 9, hit: false, height: "overhead", pierce: true, t: 0 });
  } else if (f.cid === "ramirez") {
    // wall of death: two walls of monkeys run in from both edges, stare each other down, then crash together on the opponent.
    // Only a well-timed jump saves you.
    const ms = [];
    for (const side of [-1, 1]) for (let k = 0; k < 3; k++) ms.push({ side, k, x: side < 0 ? -150 - k * 60 : W + 150 + k * 60, y: [0, -10, 8][k], sc: [1, 0.9, 1.06][k], ph: rand(0, 6.28), rot: 0, vx: 0, vy: 0 });
    F.projectiles.push({ kind: "mosh", owner: f.slot, dir: f.dir, x: opp.x, y: FLOOR_Y, cx: opp.x, w: 1, h: 1, vx: 0,
      life: 4.2, t: 0, hit: false, pierce: true, height: "unblockable", phase: "enter", ms, ticks: 0 });
    F.shake = Math.max(F.shake, 5);
  } else if (f.cid === "kreed") {
    // Igor Sinyak flies in from behind Kreed at chest height: duck under him or get flattened
    F.projectiles.push({
      kind: "sinyak", owner: f.slot, dir: f.dir,
      x: f.x - f.dir * 420, y: FLOOR_Y - 188,
      vx: f.dir * 1150, w: 300, h: 64, dmg: 16, life: 2.4, hit: false, height: "unblockable", pierce: true, t: 0,
    });
    F.shake = Math.max(F.shake, 5);
  } else if (f.cid === "morgen") {
    F.projectiles.push({
      kind: "cadillac", owner: f.slot, dir: f.dir,
      // smaller and faster than before: a well-timed jump clears it
      x: f.dir === 1 ? -300 : W + 300, y: FLOOR_Y,
      vx: f.dir * 1500, w: 325, h: 98, dmg: 15, life: 1.6, hit: false, height: "unblockable",
    });
    F.shake = Math.max(F.shake, 6);
  } else if (f.cid === "fludd") {
    F.projectiles.push({
      kind: "icecube", owner: f.slot, dir: f.dir, x: f.x + f.dir * 150, y: f.y - 150,
      vx: f.dir * 620, w: 96, h: 92, dmg: 12, life: 2.4, hit: false, rot: 0, height: "mid", t: 0,
    });
    playSfx("whooshHeavy");
    for (let i = 0; i < 12; i++) F.particles.push({ type: "sq", x: f.x + f.dir * 150 + rand(-30, 30), y: f.y - 150 + rand(-30, 30), vx: f.dir * rand(60, 260), vy: rand(-160, 60),
      life: rand(0.25, 0.5), max: 0.5, size: pick([4, 6]), color: pick(["#ffffff", "#d8f2ff", "#9fd8ff"]) });
  } else if (f.cid === "guf") {
    F.projectiles.push({
      kind: "kettle", owner: f.slot, dir: f.dir, x: f.x + f.dir * 110, y: f.y - 128,
      vx: f.dir * 560, w: 84, h: 64, dmg: 13, life: 2.4, hit: false, rot: 0, height: "mid", t: 0,
    });
  } else {
    F.projectiles.push({
      kind: "guitar", owner: f.slot, dir: f.dir, x: f.x + f.dir * 130, y: f.y - 122,
      vx: f.dir * 700, w: 110, h: 56, dmg: 12, life: 2.0, hit: false, rot: 0, height: "mid", t: 0,
    });
  }
}

function warnTime(f) {
  // Morgen's Cadillac warning: shown while the special is winding up.
  return f.action && f.action.type === "special" && (f.cid === "morgen" || f.cid === "kreed") && !f.action.spawned && !G.cheats.tea;
}

// Babangida's perk: the news of his death was fake — once per match he gets back up after a KO
function aaMove(f) { return f.action && f.action.move; }
function fakeDeath(f) {
  if (f.cid !== "babangida") return false;
  F.fakeUsed = F.fakeUsed || {};
  if (F.fakeUsed[f.slot]) return false;
  F.fakeUsed[f.slot] = true;
  f.hp = 1; f.fakeT = 1.9; playSfx("bab_fake_death");
  return true;
}

function applyHit(att, def, h) {
  if (def.dazed) { if (F.phase === "finish") finishKO(def, h.dir || att.dir); return "miss"; }
  if (def.ko) return "miss";
  if (def.invulnT > 0) return "miss";
  if (def.downT > 0) return "miss";                                   // lying on the floor
  if (def.action && def.action.type === "super") return "miss";        // super armour
  def.dashT = 0;
  // Parry: tap BACK just before the hit lands (not vs supers / throws)
  if (def.parryT > 0 && def.onGround && !def.action && def.hitstun <= 0 && !h.noScale && !(att.action && (att.action.type === "super" || att.action.type === "throw"))) {
    def.parryT = 0; def.parryCd = 0;
    if (att.action && att.action.type !== "special") { att.action = null; att.hitstun = 0.5; att.vx = -h.dir * 120; }
    def.flash = 0.12;
    addSuper(def, 12);
    F.hitstop = 0.16; F.flash = Math.max(F.flash, 0.12); F.shake = Math.max(F.shake, 6);
    popup(def.x, def.y - 300, "ПАРИРОВАНИЕ!", "#7fe8ff", 32);
    blockSpark(h.sparkX, h.sparkY); blockSpark(h.sparkX, h.sparkY - 20);
    playSfx("parry");
    if (G.tutorial && def.slot === 0) G.tutorial.parries = (G.tutorial.parries || 0) + 1;
    return "parry";
  }
  // Guf: drunken sway — now and then he simply isn't where the hit lands
  if (def.cid === "guf" && def.onGround && !def.action && def.hitstun <= 0 && def.blockstun <= 0 && !h.noScale &&
      !(att.action && (att.action.type === "super" || att.action.type === "throw")) && G.time - (def.swayAt || -9) > 3 && Math.random() < 0.14) {
    def.swayAt = G.time; def.swayT = 0.4; def.invulnT = 0.25; def.vx = h.dir * 300;
    popup(def.x, def.y - 280, "ШАТНУЛСЯ!", "#f0e3b0", 26);
    playSfx("sway");
    return "miss";
  }
  // Smoky Mo: once a round, at half health or less, he turns to smoke and the hit goes through
  if (def.cid === "smoky" && def.hp <= 50 && def.smokeRound !== F.round && !h.noScale && def.onGround && def.hitstun <= 0 &&
      !(att.action && (att.action.type === "super" || att.action.type === "throw"))) {
    def.smokeRound = F.round;
    for (let i = 0; i < 30; i++) F.particles.push({ type: "puff", x: def.x + rand(-50, 50), y: def.y - rand(0, 230), vx: rand(-90, 90), vy: rand(-140, -30), life: rand(0.5, 1), max: 1, size: pick([8, 10, 12]), color: pick(["rgba(215,220,235,0.8)", "rgba(170,180,200,0.7)", "rgba(120,130,150,0.6)"]) });
    def.x = clamp(def.x + h.dir * 150, WALL_L, WALL_R); def.invulnT = 0.35; def.flash = 0.2;
    popup(def.x, def.y - 290, "ДЫМ!", "#d8deec", 30);
    playSfx("whoosh");
    return "miss";
  }
  const blockable = h.height !== "unblockable";
  let blocked = false;
  if (blockable && def.blocking && def.onGround && !def.action && def.hitstun <= 0) {
    if (h.height === "low") blocked = def.crouch;
    else if (h.height === "overhead") blocked = !def.crouch;   // must be blocked standing
    else blocked = true; // high / mid: blocked by holding back or crouching
  }

  if (blocked) {
    addSuper(att, 2); addSuper(def, 1.5);
    if (G.tutorial && def.slot === 0) G.tutorial.blocks++;
    const chip = (h.chip || 0) + (att.cid === "atl" && h.melee ? 1 : 0) + (att.cid === "shilo" && h.melee && aaMove(att) && aaMove(att).dumbbell ? 2 : 0);
    def.hp = Math.max(1, def.hp - chip); // chip damage never kills
    def.blockstun = h.blockstun;
    def.vx = h.dir * Math.abs(h.knock) * 0.55;
    if (def.cid === "krip" && h.melee) { att.vx = -h.dir * 420; popup(def.x, def.y - 300, "ГРОМЧЕ!", "#c0c4c8", 22); }
    if (chip) { def.trailDelay = 0.4; popup(def.x, def.y - 230, `-${chip}`, "#9fd8ff", 24); }
    blockSpark(h.sparkX, h.sparkY);
    playSfx("block");
    F.hitstop = 0.04;
    att.combo = 0;
    return "block";
  }

  // Korzh: a light hit can't knock him out of his heavy (he still takes the damage)
  const da = def.action;
  if (def.cid === "korzh" && da && da.type === "heavy" && da.move && da.t < da.move.startup + (def.data.armorActive ?? da.move.active) && h.dmg <= 6 && h.melee &&
      !(att.action && (att.action.type === "super" || att.action.type === "throw"))) {
    const ad = Math.max(1, Math.round(h.dmg * DMG_SCALE * att.data.power / (def.data.tough || 1)));
    def.hp = Math.max(0, def.hp - ad); def.trailDelay = 0.45; def.flash = 0.1;
    popup(def.x, def.y - 280, "БРОНЯ!", "#ff9a7a", 26);
    popup(def.x + rand(-14, 14), def.y - 240, `-${ad}`, "#ffef7a", 26);
    blockSpark(h.sparkX, h.sparkY); playSfx("armor"); F.hitstop = 0.05;
    if (def.hp <= 0) endRound("ko", att.slot, h.dir);
    return "hit";
  }
  let counter = !!(def.action && def.action.t < (def.action.move ? def.action.move.startup : def.action.startup || 0));
  if (att.buffT > 0) {
    counter = true;
    att.buffT = 0;
    popup(def.x, def.y - 330, "АЛИК В УДАРЕ!", GOLD, 30);
  }
  att.combo = def.hitstun > 0 ? att.combo + 1 : 1;
  F.stats.maxCombo[att.slot] = Math.max(F.stats.maxCombo[att.slot], att.combo);
  const scale = h.noScale ? 1 : Math.max(0.5, 1 - 0.12 * (att.combo - 1));
  let perk = 1;
  const aa = att.action;
  if (h.melee) {
    if (att.cid === "noize" && aa && aa.move && aa.move.finisher) perk = 1.25;
    if (att.cid === "tito" && att.energyT > 0) perk *= 1.2;
    if (att.cid === "morgen" && G.time - (att.dashAt || -9) < 0.5) { perk = 1.3; popup(def.x, def.y - 320, "ДОРОГО!", "#ff86d8", 24); att.dashAt = -9; }
    if (att.cid === "maybe" && aa && aa.air) perk = 1.2;
    if (att.cid === "face" && (def.x < WALL_L + 130 || def.x > WALL_R - 130)) perk = att.data.wallMul || 1.25;
  }
  if (att.cid === "kreed" && att.hp <= 30 && !h.noScale) perk *= 1.15;
  if (att.cid === "sqwoz" && h.melee && att.fedT > 0) { perk *= 1.3; att.fedT = 0; popup(def.x, def.y - 320, "СЫТЫЙ!", "#e0a050", 24); }
  if (att.cid === "ramirez" && h.melee && G.time - (att.hurtAt ?? -9) < 1.6) { perk *= 1.25; popup(def.x, def.y - 320, "ЗВЕРЕЕТ!", "#b4c94a", 24); att.hurtAt = -9; }
  let dmg = Math.max(1, Math.round(h.dmg * DMG_SCALE * att.data.power * scale * perk * (counter ? 1.25 : 1) / (def.data.tough || 1)));
  def.hp = Math.max(0, def.hp - dmg);
  if (def.hp <= 0 && fakeDeath(def)) h = { ...h, knockdown: true };
  def.hurtAt = G.time;
  def.trailDelay = 0.45;
  def.hitstun = h.hitstun;
  def.action = null;
  def.crouch = false;
  def.flash = 0.12;
  // light hits keep the fight close (combos), heavy hits push hard
  const wt = def.data.weight || 1;
  def.vx = h.knock * h.dir * (Math.abs(h.knock) < 250 ? 0.6 : 1.15) / wt;
  def.hurtK = clamp(dmg / 10, 0.5, 1.6); def.hurtT = 0;
  if (h.wall) { def.wallT = 0.7; def.wallBy = att.slot; }
  if (h.launch && def.onGround) { def.vy = h.launch / Math.sqrt(wt); def.onGround = false; }
  if (!def.onGround && !h.launch) def.vy = Math.min(def.vy, -260);

  if (att.combo >= 2) { att.comboShow = att.combo; att.comboT = 1.3; }
  if (att.combo >= 5 && (att.combo - 5) % 3 === 0) {            // КОМБО! at 5, 8, 11… hits: banner, announcer, bonus super
    F.comboBanner = { slot: att.slot, t: 0, n: att.combo };
    F.shake = Math.max(F.shake, 10); F.flash = Math.max(F.flash, 0.12);
    playSfx(sfxPools.voice_combo ? "voice_combo" : "comboFinisher");
    addSuper(att, 20);
  }
  if (dmg >= 9 || att.combo >= 3) {
    F.hypeUntil = G.time + 1.1;   // bar crowd goes wild
    if (REACT[G.stage] && G.time - (F.crowdSfxAt || -99) > (REACT_CD[G.stage] || 4) && (dmg >= 12 || att.combo >= 4 || !REACT_CD[G.stage] || REACT_CD[G.stage] < 10)) {
      F.crowdSfxAt = G.time; playSfx(REACT[G.stage]);
    }
  }
  if (!(att.action && att.action.type === "super")) addSuper(att, dmg * 1.8 * (att.cid === "oxxxy" && att.combo >= 3 ? 1.6 : 1));
  addSuper(def, dmg * 1.1);
  if (h.knockdown && def.hp > 0) {
    def.downT = 0.8;
    def.hitstun = 0.95;
    def.vx = h.dir * 140;
    popup(def.x, def.y - 200, "ПОДСЕЧКА!", "#ffb347", 28);
  }
  if (dmg >= 13) F.shockUntil = G.time + 0.9;                   // host grabs his head
  popup(def.x + rand(-14, 14), def.y - 240, `-${dmg}`, counter ? "#ff7a3d" : "#ffef7a", 30);
  if (counter) popup(def.x, def.y - 285, "КОНТРАТАКА!", "#ff7a3d", 26);

  hitSpark(h.sparkX, h.sparkY, dmg);
  const am = aa && aa.move;
  let sfx = h.sfx;
  if (h.melee && am) {
    const kick = (am.frame === "heavy" || am.frame === "air_kick" || am.sweep) && !am.guitar && !am.magic;
    if (am.crouchAtk) sfx = "hitBody";                                   // low jab to the body
    else if (sfx === "hitHeavy" && kick) sfx = "hitKick";
    else if (sfx === "hitHeavy" && Math.random() < 0.3) sfx = "hitBody";
  }
  if ((am && am.finisher && h.melee) || counter) sfx = "hitCrit";       // the juiciest ones for finishers and counters
  playSfx(sfx);
  if (dmg >= 9 && (!att.isBot || !def.isBot)) buzz(dmg >= 13 ? 70 : 40);   // phone buzzes on strong hits
  if (dmg >= 6 && def.hp > 0) voice(def, "hurt", 0.45);
  if (h.launch) playSfx("launch");
  if (h.knockdown) playSfx("sweep");
  F.hitstop = Math.min(0.24, h.stop + dmg * 0.007 + (counter ? 0.04 : 0));
  F.shake = Math.max(F.shake, (3 + dmg * 1.0) * (G.cheats.madness ? 2 : 1));
  if (dmg >= 9) { F.zoom = Math.max(F.zoom || 0, Math.min(0.06, dmg * 0.004)); F.zoomX = def.x; F.zoomY = def.y - 120; F.flash = Math.max(F.flash, 0.05); }
  att.vx -= h.dir * 40;   // a little recoil on the attacker

  if (G.tutorial && att.slot === 0) {
    const a = att.action;
    G.tutorial.lastHit = { type: a ? a.type : "proj", sweep: !!(a && a.move && a.move.sweep), finisher: !!(a && a.move && a.move.finisher),
      crouchAtk: !!(a && a.move && a.move.crouchAtk), overhead: !!(a && a.move && a.move.overhead), launcher: !!(a && a.move && a.move.launcherMove), air: !!(a && a.air), juggle: !def.onGround };
  }
  if (def.hp <= 0) endRound("ko", att.slot, h.dir);
  return "hit";
}

/* ------------------------------------------------------------------ */
/* Circus and yard stages                                              */
/* ------------------------------------------------------------------ */
// background art is drawn with drawCover(…, 1.07, -camX * 0.08): map image coords to the screen
function bgPt(x, y, camX) { return [x * 1.07 - W * 0.035 - camX * 0.08, y * 1.07 - H * 0.035]; }

function drawCircusFx(camX) {
  const hype = F && (F.hypeUntil || 0) > G.time;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // twinkling garland bulbs
  for (let i = 0; i < CIRCUS_BULBS.length; i++) {
    const [bx, by, bs] = CIRCUS_BULBS[i];
    const tw = 0.5 + 0.5 * Math.sin(G.time * (2 + (i % 5) * 0.7) + i * 1.7);
    const a = (hype ? 0.55 : 0.25) * tw;
    if (a < 0.05) continue;
    const [x, y] = bgPt(bx, by, camX);
    const r = bs * 2.6;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,230,160,${a})`);
    g.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // two spotlights from the back sweep across the ring
  [[612, 299, 0], [808, 299, 2.1]].forEach(([lx, ly, ph]) => {
    const [x, y] = bgPt(lx, ly, camX);
    const target = (hype && F.fighters ? F.fighters[Math.floor(G.time * 2) % 2].x : W / 2 + Math.sin(G.time * 0.6 + ph) * 420);
    const g = ctx.createLinearGradient(x, y, target, FLOOR_Y);
    g.addColorStop(0, `rgba(255,236,190,${hype ? 0.32 : 0.2})`);
    g.addColorStop(1, "rgba(255,236,190,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y);
    ctx.lineTo(target + 120, FLOOR_Y + 30); ctx.lineTo(target - 120, FLOOR_Y + 30);
    ctx.closePath(); ctx.fill();
  });
  if (hype) { ctx.fillStyle = `rgba(255,200,120,${0.05 + 0.05 * Math.sin(G.time * 20)})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}

// Dead Fountains (Khabarovsk): leaf shadows sway on the concrete, warm sunset haze
// Nuclear wasteland: the mushroom cloud churns and glows, smoke billows up, distant blasts flash on the horizon
const WASTE = { puffs: [], flash: 0, nextFlash: 6, last: 0 };
function drawWastelandFx(bg, camX) {
  const t = G.time, dt = Math.min(0.05, Math.max(0, t - WASTE.last)); WASTE.last = t;
  const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight) * 1.07;
  const ox = (W - bg.naturalWidth * s) / 2 - camX * 0.08, oy = (H - bg.naturalHeight * s) / 2;
  const k = s * bg.naturalWidth / 1280;                      // cloud layer was cut in 1280-wide space
  const X = (x) => ox + x * k, Y = (y) => oy + y * k;
  const cx = X(775), cy = Y(250);                             // the stem base
  // smoke puffs rising from the cap and from the burning city
  const sources = [[775, 110, 46], [700, 120, 30], [850, 120, 30], [440, 230, 18], [560, 220, 16], [1000, 250, 14]];
  if (Math.random() < dt * 9) { const [sx, sy, r] = pick(sources); WASTE.puffs.push({ x: sx + rand(-25, 25), y: sy, r: r * rand(0.6, 1), vx: rand(-8, 8), vy: -rand(8, 18), life: 0, max: rand(5, 8) }); }
  WASTE.puffs = WASTE.puffs.filter((p) => (p.life += dt) < p.max).slice(-60);
  ctx.save();
  for (const p of WASTE.puffs) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 6;
    const a = Math.sin(Math.PI * p.life / p.max) * 0.22;
    ctx.fillStyle = `rgba(70,45,35,${a})`;
    ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r * k, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // the fireball breathes: two layers of the cloud slowly swelling and churning, additive glow
  const cloud = img("wasteland.cloud");
  if (cloud) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 2; i++) {
      const ph = (t * 0.18 + i * 0.5) % 1;                    // each layer swells and fades out in turn
      const sc = 1 + ph * 0.07 + Math.sin(t * 1.3 + i) * 0.008;
      ctx.globalAlpha = (0.32 + 0.12 * Math.sin(t * 5.3 + i * 2)) * Math.sin(ph * Math.PI);
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(sc, sc * (1 + ph * 0.03));
      ctx.drawImage(cloud, (560 - 775) * k, (20 - 250) * k - ph * 8 * k, cloud.width * k, cloud.height * k);
      ctx.restore();
    }
    ctx.restore();
  }
  // flickering fire glow at the base of the stem
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const fl = 0.2 + 0.08 * Math.sin(t * 7) + 0.05 * Math.sin(t * 13.7) + WASTE.flash * 0.6;
  const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 420 * k);
  g.addColorStop(0, `rgba(255,150,50,${fl})`); g.addColorStop(1, "rgba(255,120,40,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // a distant blast now and then: flash + small shake
  WASTE.nextFlash -= dt;
  if (WASTE.nextFlash <= 0) { WASTE.nextFlash = 7 + Math.random() * 7; WASTE.flash = 1; WASTE.fx = rand(150, 1130); if (F && F.phase === "fight") F.shake = Math.max(F.shake, 3); }
  if (WASTE.flash > 0) {
    WASTE.flash = Math.max(0, WASTE.flash - dt * 1.8);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const fx = X(WASTE.fx), fy = Y(300);
    const g2 = ctx.createRadialGradient(fx, fy, 5, fx, fy, 260 * k);
    g2.addColorStop(0, `rgba(255,230,170,${WASTE.flash * 0.7})`); g2.addColorStop(1, "rgba(255,160,60,0)");
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(255,200,120,${WASTE.flash * 0.08})`; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// Gorgorod: searchlights sweep the storm clouds, lightning lights up the tower, puddles shimmer, the mayor's city stamp
const GOR = { flash: 0, next: 5, last: 0, bolt: null };
function drawGorgorodFx(bg, camX) {
  const t = G.time, dt = Math.min(0.05, Math.max(0, t - GOR.last)); GOR.last = t;
  const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight) * 1.07;
  const ox = (W - bg.naturalWidth * s) / 2 - camX * 0.08, oy = (H - bg.naturalHeight * s) / 2;
  const k = s * bg.naturalWidth / 1280;
  const X = (x) => ox + x * k, Y = (y) => oy + y * k;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // searchlight beams from the lamp towers
  [[31, 50, -0.35, 1], [249, 184, -0.6, -1], [1225, 103, -2.75, -1], [1131, 207, -2.5, 1]].forEach(([lx, ly, base, dir], i) => {
    const a = base + Math.sin(t * (0.35 + i * 0.07) + i * 1.7) * 0.45 * dir;
    const len = 900 * k, spread = 0.07;
    const x0 = X(lx), y0 = Y(ly);
    const g = ctx.createRadialGradient(x0, y0, 4, x0, y0, len);
    g.addColorStop(0, "rgba(255,240,200,0.28)"); g.addColorStop(1, "rgba(255,240,200,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + Math.cos(a - spread) * len, y0 + Math.sin(a - spread) * len);
    ctx.lineTo(x0 + Math.cos(a + spread) * len, y0 + Math.sin(a + spread) * len);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(255,235,180,${0.5 + 0.3 * Math.sin(t * 9 + i)})`;
    ctx.beginPath(); ctx.arc(x0, y0, 5 * k, 0, Math.PI * 2); ctx.fill();
  });
  // shimmering reflections in the wet cobblestones
  for (let i = 0; i < 14; i++) {
    const x = X(80 + i * 85 + Math.sin(i * 7.3) * 20), y = Y(500 + (i % 4) * 45);
    const a = 0.05 + 0.05 * Math.sin(t * 3 + i * 1.9);
    ctx.fillStyle = `rgba(255,170,70,${a})`;
    ctx.fillRect(x - 30 * k, y, 60 * k, 3 * k);
  }
  ctx.restore();
  // lightning: a jagged bolt behind the tower and a white flash over the whole city
  GOR.next -= dt;
  if (GOR.next <= 0) {
    GOR.next = 6 + Math.random() * 8; GOR.flash = 1; if (F && F.phase !== "intro") setTimeout(() => playSfx("gorgorod_thunder"), 250);
    const bx = rand(380, 900); const pts = [[bx, 0]];
    for (let y = 30; y < 260; y += rand(25, 45)) pts.push([pts[pts.length - 1][0] + rand(-40, 40), y]);
    GOR.bolt = pts;
    if (F && F.phase === "fight") F.shake = Math.max(F.shake, 2);
  }
  if (GOR.flash > 0) {
    GOR.flash = Math.max(0, GOR.flash - dt * 2.4);
    const f = GOR.flash > 0.75 || (GOR.flash > 0.4 && GOR.flash < 0.55) ? GOR.flash : GOR.flash * 0.3;   // double flicker
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(200,210,255,${f * 0.22})`; ctx.fillRect(0, 0, W, H);
    if (GOR.bolt && f > 0.3) {
      ctx.strokeStyle = `rgba(230,235,255,${f})`; ctx.lineWidth = 3 * k;
      ctx.beginPath(); GOR.bolt.forEach(([x, y], j) => (j ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke();
    }
    ctx.restore();
  }
}

// Morgen's mansion: the pool ripples, a party pulses behind the windows, the white car blinks its lights now and then
const MAN = { last: 0, blink: 0, nextBlink: 4 };
function drawMansionFx(bg, camX) {
  const t = G.time, dt = Math.min(0.05, Math.max(0, t - MAN.last)); MAN.last = t;
  const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight) * 1.07;
  const ox = (W - bg.naturalWidth * s) / 2 - camX * 0.08, oy = (H - bg.naturalHeight * s) / 2;
  const k = s * bg.naturalWidth / 1280, src = bg.naturalWidth / 1280;
  const X = (x) => ox + x * k, Y = (y) => oy + y * k;
  // pool: redraw thin strips of the water band with a wavy sideways offset
  for (let y = 414; y < 460; y += 3) {
    const off = Math.sin(t * 2.2 + y * 0.35) * 2.2 + Math.sin(t * 3.7 + y * 0.9) * 1.2;
    ctx.drawImage(bg, 0, y * src, 1280 * src, 3 * src, X(0) + off * k, Y(y), 1280 * k, 3 * k + 0.5);
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 10; i++) {
    const x = (i * 131 + t * 18 * (i % 2 ? 1 : -1)) % 1280, y = 418 + (i * 13) % 40;
    ctx.fillStyle = `rgba(255,210,140,${0.08 + 0.06 * Math.sin(t * 4 + i)})`;
    ctx.fillRect(X(x), Y(y), 40 * k, 2 * k);
  }
  // party lights behind the big windows
  const cols = ["255,90,200", "90,170,255", "255,200,90", "160,90,255"];
  const c = cols[Math.floor(t * 1.6) % cols.length];
  const a = 0.08 + 0.06 * Math.abs(Math.sin(t * 6));
  ctx.fillStyle = `rgba(${c},${a})`;
  ctx.fillRect(X(278), Y(232), 330 * k, 142 * k);
  ctx.fillRect(X(146), Y(90), 54 * k, 130 * k);
  ctx.fillRect(X(888), Y(280), 54 * k, 98 * k);
  // the white car flashes its lights
  MAN.nextBlink -= dt;
  if (MAN.nextBlink <= 0) { MAN.nextBlink = 5 + Math.random() * 6; MAN.blink = 1.2; }
  if (MAN.blink > 0) {
    MAN.blink -= dt;
    if (Math.floor(MAN.blink * 5) % 2 === 0) {
      [[1253, 366, "255,240,200"], [1067, 368, "255,170,60"]].forEach(([x, y, col]) => {
        const g = ctx.createRadialGradient(X(x), Y(y), 1, X(x), Y(y), 34 * k);
        g.addColorStop(0, `rgba(${col},0.9)`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.fillRect(X(x) - 40 * k, Y(y) - 40 * k, 80 * k, 80 * k);
      });
    }
  }
  // the setting sun breathes
  const sg = ctx.createRadialGradient(X(1138), Y(250), 4, X(1138), Y(250), 160 * k);
  sg.addColorStop(0, `rgba(255,180,120,${0.18 + 0.05 * Math.sin(t * 0.9)})`); sg.addColorStop(1, "rgba(255,120,120,0)");
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Antihype train: the city rushes past the windows, poles flash by, the carriage rocks and the lamps flicker
const TRAIN = { last: 0, flick: 0, tunnel: 0, nextTunnel: 9 };
function drawTrainStage(bg, camX) {
  const t = G.time, dt = Math.min(0.05, Math.max(0, t - TRAIN.last)); TRAIN.last = t;
  const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight) * 1.07;
  const k = s;   // bg is 1280 wide
  const rock = Math.sin(t * 7.1) * 1.4 + Math.sin(t * 2.3) * 1.0 + (Math.random() < 0.02 ? rand(-2, 2) : 0);
  const ox = (W - bg.naturalWidth * s) / 2 - camX * 0.08, oy = (H - bg.naturalHeight * s) / 2 + rock;
  const X = (x) => ox + x * k, Y = (y) => oy + y * k;
  // 1) outside: night sky + rushing city strip + poles + wires
  ctx.fillStyle = "#0b0d1a"; ctx.fillRect(0, Y(120), W, 210 * k);
  const view = img("train.view");
  const speed = 420;                       // px/s in stage space
  TRAIN.nextTunnel -= dt;
  if (TRAIN.nextTunnel <= 0) { TRAIN.tunnel = 1.6; TRAIN.nextTunnel = 10 + Math.random() * 8; }
  if (TRAIN.tunnel > 0) TRAIN.tunnel -= dt;
  if (view) {
    const vw = view.width * k, vh = view.height * k;
    let x = -((t * speed * 0.55 * k) % vw);
    for (; x < W; x += vw) ctx.drawImage(view, x, Y(204), vw, vh);
    // farther, slower skyline layer (dim)
    ctx.save(); ctx.globalAlpha = 0.35;
    let x2 = -((t * speed * 0.2 * k) % vw);
    for (; x2 < W; x2 += vw) ctx.drawImage(view, x2, Y(160), vw, vh * 0.7);
    ctx.restore();
  }
  // catenary wires and poles whipping past
  ctx.strokeStyle = "rgba(20,20,30,0.9)"; ctx.lineWidth = 2 * k;
  for (const wy of [176, 186]) { ctx.beginPath(); ctx.moveTo(0, Y(wy) + Math.sin(t * 3) * 2); ctx.lineTo(W, Y(wy) + Math.sin(t * 3 + 1) * 2); ctx.stroke(); }
  const gap = 520;
  for (let px = -((t * speed * 2.2) % gap); px < 1280 + gap; px += gap) {
    ctx.fillStyle = "rgba(10,10,16,0.95)"; ctx.fillRect(X(px), Y(130), 12 * k, 190 * k);
  }
  // passing station lights / lamps
  for (let i = 0; i < 3; i++) {
    const lx = 1280 - ((t * speed * 1.4 + i * 700) % 2100);
    const g = ctx.createRadialGradient(X(lx), Y(250), 2, X(lx), Y(250), 60 * k);
    g.addColorStop(0, "rgba(255,200,120,0.55)"); g.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = g; ctx.fillRect(X(lx) - 60 * k, Y(190), 120 * k, 120 * k);
  }
  // tunnel: windows go dark with fast streaks of light
  if (TRAIN.tunnel > 0) {
    const a = Math.min(1, TRAIN.tunnel / 0.25, (1.6 - TRAIN.tunnel) / 0.25);
    ctx.fillStyle = `rgba(4,4,8,${0.92 * a})`; ctx.fillRect(0, Y(120), W, 210 * k);
    ctx.fillStyle = `rgba(255,190,90,${0.7 * a})`;
    for (let i = 0; i < 4; i++) { const lx = W - ((t * 2600 + i * 420) % (W + 400)); ctx.fillRect(lx, Y(230 + i * 12), 160, 3); }
  }
  // 2) the carriage itself (windows cut out)
  const fg = img("train.fg");
  ctx.drawImage(fg, ox, oy, fg.width * k, fg.height * k);
  // window glass sheen
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(120,140,200,0.05)";
  for (const [x0, x1] of [[0, 95], [285, 562], [745, 1005], [1190, 1280]]) ctx.fillRect(X(x0), Y(135), (x1 - x0) * k, 177 * k);
  ctx.restore();
  // 3) lamps flicker; hand grips swing with the rocking
  TRAIN.flick = Math.random() < 0.003 ? 0.2 : Math.max(0, TRAIN.flick - dt);
  const dim = TRAIN.flick > 0 ? 0.14 * (Math.random() < 0.5 ? 1 : 0) : 0;
  if (dim) { ctx.fillStyle = `rgba(0,0,0,${dim})`; ctx.fillRect(0, 0, W, H); }
}

// Underground passage: tube lights flicker (one is broken and dripping), headlights sweep past the far
// exit, a guitarist and an old man with a bayan play by the walls, now and then a coin drops in the case.
const TUN = { last: 0, drops: [], coins: [], nextCoin: 3, cars: [], nextCar: 2 };
function drawTunnelFx(bg, camX) {
  const t = G.time, dt = Math.min(0.05, Math.max(0, t - TUN.last)); TUN.last = t;
  const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight) * 1.07;
  const k = s * bg.naturalWidth / 1280;
  const ox = (W - bg.naturalWidth * s) / 2 - camX * 0.08, oy = (H - bg.naturalHeight * s) / 2;
  const X = (x) => ox + x * k, Y = (y) => oy + y * k;
  // headlights crossing the street at the far end of the tunnel
  TUN.nextCar -= dt;
  if (TUN.nextCar <= 0) { TUN.nextCar = 2.5 + Math.random() * 4; TUN.cars.push({ x: Math.random() < 0.5 ? -1 : 1, t: 0 }); }
  ctx.save(); ctx.beginPath(); ctx.rect(X(580), Y(405), 120 * k, 50 * k); ctx.clip(); ctx.globalCompositeOperation = "lighter";
  for (const c of TUN.cars) {
    c.t += dt; const u = c.t / 1.1, cx = c.x < 0 ? X(560 + 160 * u) : X(720 - 160 * u);
    const g = ctx.createRadialGradient(cx, Y(432), 1, cx, Y(432), 40 * k);
    g.addColorStop(0, "rgba(255,240,200,0.8)"); g.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = g; ctx.fillRect(cx - 40 * k, Y(392), 80 * k, 80 * k);
  }
  ctx.restore();
  TUN.cars = TUN.cars.filter((c) => c.t < 1.1);
  // tube lights: soft glow, one row element misbehaves
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  [[639, 25, 1.4], [639, 150, 1.1], [639, 212, 0.9], [639, 258, 0.7], [639, 296, 0.6], [639, 330, 0.5]].forEach(([lx, ly, sz], i) => {
    let a = 0.16 + 0.03 * Math.sin(t * 50 + i);
    if (i === 2 && Math.sin(t * 1.3) > 0.6) a *= Math.random() < 0.5 ? 0.1 : 1;        // the bad one
    const g = ctx.createRadialGradient(X(lx), Y(ly), 2, X(lx), Y(ly), 170 * sz * k);
    g.addColorStop(0, `rgba(210,235,255,${a})`); g.addColorStop(1, "rgba(180,210,255,0)");
    ctx.fillStyle = g; ctx.fillRect(X(lx) - 170 * sz * k, Y(ly) - 170 * sz * k, 340 * sz * k, 340 * sz * k);
  });
  ctx.restore();
  // the broken lamp drips
  if (Math.random() < dt * 2.2) TUN.drops.push({ x: 842 + rand(-6, 6), y: 128, vy: 0 });
  ctx.fillStyle = "rgba(190,220,255,0.75)";
  for (const d of TUN.drops) { d.vy += 900 * dt; d.y += d.vy * dt; ctx.fillRect(X(d.x), Y(d.y), 2 * k, 6 * k); }
  TUN.drops = TUN.drops.filter((d) => d.y < 540);
  // musicians: guitarist on the left facing the fight, old man with a bayan on the right
  const gu = img(Math.floor(t * 4.2) % 2 ? "tunnel.guitar_2" : "tunnel.guitar_1");
  if (gu) ctx.drawImage(gu, X(38), Y(598) - gu.naturalHeight * k * 0.95, gu.naturalWidth * k * 0.95, gu.naturalHeight * k * 0.95);
  const bx = Math.sin(t * 2.6) > 0;                                          // the bellows breathe
  const ba = img(bx ? "tunnel.bayan_1" : "tunnel.bayan_2");
  if (ba) ctx.drawImage(ba, X(1222) - ba.naturalWidth * k, Y(606) - ba.naturalHeight * k, ba.naturalWidth * k, ba.naturalHeight * k);
  // coins into the guitar case now and then
  TUN.nextCoin -= dt;
  if (TUN.nextCoin <= 0) { TUN.nextCoin = 4 + Math.random() * 6; TUN.coins.push({ x: 205 + rand(-20, 20), y: 470, vy: -200, t: 0 }); setTimeout(() => playSfx("tunnel_coin"), 450); }
  // the buskers really play: a quiet tune every so often, under the arena track
  TUN.nextTune = (TUN.nextTune ?? 4) - dt;
  if (TUN.nextTune <= 0) { TUN.nextTune = 16 + Math.random() * 10; if (F && F.phase === "fight") playSfx("tunnel_busker"); }
  for (const c of TUN.coins) { c.t += dt; c.vy += 1200 * dt; c.y = Math.min(c.y + c.vy * dt, 578);
    ctx.fillStyle = Math.sin(c.t * 30) > 0 ? "#ffe27a" : "#c9a040"; ctx.fillRect(X(c.x), Y(c.y), 5 * k, 5 * k); }
  TUN.coins = TUN.coins.filter((c) => c.t < 1.2);
}

// «Палёнка» market stall: the seller dozes at his till, slams it shut when the fight starts and ducks
// at big hits; bulbs flicker, the neon sign stutters, the mannequins wear the faces of rappers.
const PAL = { faces: null, faceMatch: null };
function drawPalenkaFx(bg, camX) {
  const t = G.time;
  const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight) * 1.07;
  const k = s * bg.naturalWidth / 1280;
  const ox = (W - bg.naturalWidth * s) / 2 - camX * 0.08, oy = (H - bg.naturalHeight * s) / 2;
  const X = (x) => ox + x * k, Y = (y) => oy + y * k;
  // warm bulbs, each breathing on its own
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  [[324, 34], [523, 68], [790, 34], [1118, 180], [936, 168], [289, 205], [437, 272]].forEach(([bx, by], i) => {
    const fl = 0.75 + 0.25 * Math.sin(t * (2.1 + i * 0.37) + i * 1.7) - (Math.random() < 0.004 ? 0.5 : 0);
    const g = ctx.createRadialGradient(X(bx), Y(by), 1, X(bx), Y(by), 60 * k);
    g.addColorStop(0, `rgba(255,200,110,${0.35 * fl})`); g.addColorStop(1, "rgba(255,160,60,0)");
    ctx.fillStyle = g; ctx.fillRect(X(bx) - 60 * k, Y(by) - 60 * k, 120 * k, 120 * k);
  });
  // the neon sign: hum + an occasional stutter
  const on = !(Math.sin(t * 0.7) > 0.93 && Math.random() < 0.5);
  if (on) {
    const g = ctx.createRadialGradient(X(1001), Y(138), 4, X(1001), Y(138), 120 * k);
    g.addColorStop(0, `rgba(255,60,90,${0.32 + 0.06 * Math.sin(t * 40)})`); g.addColorStop(1, "rgba(255,40,80,0)");
    ctx.fillStyle = g; ctx.fillRect(X(1001) - 120 * k, Y(138) - 120 * k, 240 * k, 240 * k);
  }
  ctx.restore();
  if (!on) { ctx.fillStyle = "rgba(20,8,10,0.55)"; ctx.fillRect(X(930), Y(115), 142 * k, 46 * k); }
  // mannequins wear rapper faces (two random fighters not in this fight)
  if (F && PAL.faceMatch !== F) {
    PAL.faceMatch = F;
    const pool = Object.keys(CHARS).filter((c) => !F.fighters.some((f) => f.cid === c) && img("portrait." + c));
    PAL.faces = [pick(pool), pick(pool)];
  }
  if (PAL.faces) [[66, 176], [1226, 193]].forEach(([hx, hy], i) => {
    const pim = img("portrait." + PAL.faces[i]); if (!pim) return;
    const r = 15 * k;
    ctx.save(); ctx.beginPath(); ctx.ellipse(X(hx), Y(hy), r * 0.85, r, 0, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(pim, X(hx) - r * 1.3, Y(hy) - r * 1.15, r * 2.6, r * 2.6);
    ctx.fillStyle = "rgba(255,190,120,0.18)"; ctx.fillRect(X(hx) - r, Y(hy) - r, r * 2, r * 2);
    ctx.restore();
  });
  // the seller: idle at the till; slams it shut on "В БОЙ!", ducks lower at big hits
  const closing = F && ((F.phase === "fight" && F.phaseT < 1.8) || (F.phase === "intro" && F.phaseT > 1.35));
  if (F && closing && PAL.tillF !== F) { PAL.tillF = F; playSfx("palenka_till"); }
  if (F && F.phase === "intro" && F.phaseT < 0.5) PAL.tillF = null;
  const sim = img(closing ? "palenka.close" : "palenka.idle");
  if (sim) {
    const duck = F && F.shake > 12 ? 4 : 0;
    const jit = closing && F.phase === "fight" && F.phaseT < 0.35 ? Math.sin(t * 60) * 1.5 : 0;
    const sx = X(988), sy = Y(348) - 76 * k + sim.naturalHeight * k - sim.naturalHeight * k;
    const top = Y(348) - 76 * k - (sim.naturalHeight - 138) * k;
    ctx.drawImage(sim, sx + jit, top + duck, sim.naturalWidth * k, sim.naturalHeight * k);
    ctx.save(); ctx.globalAlpha = 0.2; ctx.drawImage(silhouette(sim, "#ffb060"), sx + jit, top + duck, sim.naturalWidth * k, sim.naturalHeight * k); ctx.restore();
  }
}

// Raspberry sunset rooftop: clouds drift, the sun glows, windows light up one by one, birds fly by,
// the girl on the parapet sips her wine now and then
const ROOF = { last: 0, birds: [], nextBirds: 3, sip: 0, nextSip: 6, wins: [] };
function drawRoofFx(bg, camX) {
  const t = G.time, dt = Math.min(0.05, Math.max(0, t - ROOF.last)); ROOF.last = t;
  const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight) * 1.07;
  const k = s * bg.naturalWidth / 1280, src = bg.naturalWidth / 1280;
  const ox = (W - bg.naturalWidth * s) / 2 - camX * 0.08, oy = (H - bg.naturalHeight * s) / 2;
  const X = (x) => ox + x * k, Y = (y) => oy + y * k;
  // drifting clouds: the sky layer slides slowly, wrapped, over the painted sky
  const sky = img("roof.sky");
  if (sky) {
    const off = (t * 6) % 1280;
    ctx.save(); ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.rect(X(300), Y(0), 980 * k, 235 * k); ctx.clip();
    ctx.drawImage(sky, X(-off), Y(0), 1280 * k, sky.height * k);
    ctx.drawImage(sky, X(1280 - off), Y(0), 1280 * k, sky.height * k);
    ctx.restore();
  }
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  // the sun pulses
  const sg = ctx.createRadialGradient(X(980), Y(250), 6, X(980), Y(250), 220 * k);
  sg.addColorStop(0, `rgba(255,200,120,${0.22 + 0.06 * Math.sin(t * 0.8)})`); sg.addColorStop(1, "rgba(255,80,120,0)");
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  // puddle shimmer
  for (let i = 0; i < 12; i++) {
    const x = 100 + i * 100 + Math.sin(i * 3.7) * 30, y = 470 + (i % 4) * 50;
    ctx.fillStyle = `rgba(255,90,150,${0.04 + 0.04 * Math.sin(t * 2.5 + i * 1.3)})`;
    ctx.fillRect(X(x), Y(y), 70 * k, 3 * k);
  }
  // windows in the distant blocks flicker on and off
  if (!ROOF.wins.length) for (let i = 0; i < 40; i++) ROOF.wins.push({ x: rand(300, 1270), y: rand(255, 330), on: Math.random() < 0.5, next: rand(1, 8) });
  for (const w of ROOF.wins) {
    w.next -= dt; if (w.next <= 0) { w.on = !w.on; w.next = rand(2, 9); }
    if (w.on) { ctx.fillStyle = "rgba(255,200,110,0.55)"; ctx.fillRect(X(w.x), Y(w.y), 3 * k, 4 * k); }
  }
  ctx.restore();
  // birds crossing the sunset
  ROOF.nextBirds -= dt;
  if (ROOF.nextBirds <= 0) { ROOF.nextBirds = 7 + Math.random() * 6; const y = rand(60, 200), dir = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < 5; i++) ROOF.birds.push({ x: dir > 0 ? -40 - i * 30 : 1320 + i * 30, y: y + rand(-15, 15), vx: dir * rand(70, 90), ph: rand(0, 6) }); }
  ROOF.birds = ROOF.birds.filter((b) => b.x > -200 && b.x < 1500);
  ctx.strokeStyle = "rgba(40,10,30,0.85)"; ctx.lineWidth = 2 * k;
  for (const b of ROOF.birds) {
    b.x += b.vx * dt; const f = Math.sin(t * 10 + b.ph) * 4;
    ctx.beginPath(); ctx.moveTo(X(b.x - 6), Y(b.y - f)); ctx.lineTo(X(b.x), Y(b.y)); ctx.lineTo(X(b.x + 6), Y(b.y - f)); ctx.stroke();
  }
  // the girl's hair lifts in the wind: a few loose strands drift off her shoulders
  ctx.save(); ctx.strokeStyle = "rgba(120,50,40,0.8)"; ctx.lineWidth = 1.5 * k;
  for (let i = 0; i < 4; i++) {
    const w = Math.sin(t * 2.2 + i) * 4, y = 300 + i * 5;
    ctx.beginPath(); ctx.moveTo(X(1062), Y(y)); ctx.quadraticCurveTo(X(1054 + w), Y(y + 6), X(1048 + w * 1.5), Y(y + 4 + w * 0.5)); ctx.stroke();
  }
  ctx.restore();
}

function drawFountainsFx() {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#1a0d05";
  for (let i = 0; i < 9; i++) {
    const x = (i * 157 + Math.sin(G.time * 0.7 + i) * 14) % (W + 200) - 100;
    const y = 560 + (i % 3) * 40 + Math.sin(G.time * 0.9 + i * 2) * 4;
    ctx.beginPath(); ctx.ellipse(x, y, 90 + (i % 4) * 20, 12, -0.15, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(W - 200, 120, 10, W - 200, 120, 520);
  g.addColorStop(0, `rgba(255,190,110,${0.16 + 0.03 * Math.sin(G.time)})`);
  g.addColorStop(1, "rgba(255,190,110,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Babushkas on the benches cheer and gasp; drafts of their shouts (to be approved)
const BABUSHKA_CHEER = ["ДАВАЙ, ВНУЧОК!", "ТАК ЕГО!", "ВОТ ЭТО ПО-НАШЕМУ!", "ЕЩЁ РАЗОК!"];
const BABUSHKA_SHOCK = ["ОЙ, УБИЛ!", "БАТЮШКИ!", "МИЛИЦИЮ ВЫЗОВУ!", "В МОЁ ВРЕМЯ ТАК НЕ ДРАЛИСЬ!"];
function drawYard(camX) {
  if (!F) return;
  const shock = (F.shockUntil || 0) > G.time || (F.phase === "ko" && F.phaseT < 1.4);
  const hype = !shock && ((F.hypeUntil || 0) > G.time || (F.phase === "ko"));
  const pose = shock ? "shock" : hype ? "cheer" : "idle";
  // a shout when the mood changes (not too often)
  if (pose !== "idle" && pose !== F.babPose && G.time - (F.babShoutT || -9) > 2.2) {
    F.babShoutT = G.time;
    F.babShout = { who: Math.random() < 0.5 ? 0 : 1, text: pick(pose === "shock" ? BABUSHKA_SHOCK : BABUSHKA_CHEER), t: G.time };
  }
  F.babPose = pose;
  const BS = 1.07 * 1.4;   // babushkas a bit bigger than the painted benches they sit on
  [["A", 118, 1], ["B", 1168, -1]].forEach(([who, bx, dir], i) => {
    const key = `${who}_${pose}`;
    const im = img("yard." + key);
    const m = BABUSHKA_META[key];
    if (!im || !m) return;
    const [x, y] = bgPt(bx, 486, camX);
    const hop = pose === "cheer" ? -Math.abs(Math.sin(G.time * 9 + i)) * 4 : 0;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + hop));
    ctx.scale(dir * BS, BS);
    ctx.drawImage(im, -m.ax, -m.ay);
    ctx.restore();
    const sh = F.babShout;
    if (sh && sh.who === i && G.time - sh.t < 1.8) {
      const a = clamp((1.8 - (G.time - sh.t)) / 0.3, 0, 1);
      const tx = clamp(x, 130, W - 130), ty = y - 215;
      const tw = textWidth(sh.text, 16) + 20;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(255,250,235,0.95)";
      roundRect(tx - tw / 2, ty - 16, tw, 30, 8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(tx - 6, ty + 14); ctx.lineTo(tx + 6, ty + 14); ctx.lineTo(tx + dir * -2, ty + 26); ctx.closePath(); ctx.fill();
      ctx.restore();
      text(sh.text, tx, ty, { size: 16, align: "center", color: "#3a1a10", shadow: false, alpha: a });
    }
  });
}

/* ------------------------------------------------------------------ */
/* Bar 1703 (Versus): the host and the crowd                           */
/* ------------------------------------------------------------------ */
function hostPose() {
  if (!F) return "idle";
  if (F.phase === "intro") return "point";
  if (F.phase === "ko") return F.phaseT < 1.3 ? "shock" : "win";
  if ((F.shockUntil || 0) > G.time) return "shock";
  return "idle";
}

// Restorator's lines (approved texts)
const HOST_LINES = { intro: "ПОШУМИМ, БЛ*ТЬ!", hit: "ЖАРИШКО!", ko: "НЕПЛОХО!", match: "ЭТО БЫЛ ВЕРСУС БАТТЛ..." };
function hostLine() {
  if (!F) return null;
  if (F.phase === "intro") return HOST_LINES.intro;
  if (F.phase === "ko") {
    const decided = F.wins[0] >= ROUNDS_TO_WIN || F.wins[1] >= ROUNDS_TO_WIN;
    return decided && F.phaseT > 1.2 ? HOST_LINES.match : HOST_LINES.ko;
  }
  if ((F.shockUntil || 0) > G.time || (F.hypeUntil || 0) - G.time > 1.2) return HOST_LINES.hit;
  return null;
}
function drawBarHost(camX) {
  const pose = hostPose();
  const im = img("bar.host_" + pose);
  const m = HOST_META[pose];
  if (!im || !m) return;
  const x = W - 120 - camX * 0.1;
  const y = 566;
  const bob = pose === "idle" ? Math.sin(G.time * 2.2) * 1.5 : 0;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.ellipse(x, y + 2, 48, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y + bob));
  ctx.scale(-1, 1);                       // faces the fighters (left)
  ctx.drawImage(im, -m.ax, -m.ay);
  ctx.restore();
  // speech bubble
  const line = hostLine();
  if (line !== F.hostLineNow) { F.hostLineNow = line; F.hostLineT = G.time; }
  if (line && G.time - F.hostLineT < 2.2) {
    const tw = textWidth(line, 18) + 24;
    const bx = Math.min(x, W - tw / 2 - 10), by = y - m.ay - 40;
    ctx.fillStyle = "rgba(255,250,235,0.95)";
    roundRect(bx - tw / 2, by - 18, tw, 34, 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, by + 16); ctx.lineTo(x + 10, by + 16); ctx.lineTo(x + 2, by + 30); ctx.closePath(); ctx.fill();
    text(line, bx, by, { size: 18, align: "center", color: "#1a0830", shadow: false });
  }
}

function drawBarCrowd(camX) {
  // Easter egg: Oxxxy vs Slava KPSS on the Versus stage — the legendary 2017 battle
  const ids = F.fighters.map((f) => f.cid).sort().join();
  if (ids === "oxxxy,slava" && F.phase === "intro" && F.round === 1) {
    if (!F.versusEgg) { F.versusEgg = true; unlockSecret("versus"); }
    text("ТОТ САМЫЙ БАТТЛ • 2017", W / 2, 250, { size: 30, align: "center", gradient: ["#fff6c8", GOLD, "#ff7a3d"], stroke: "#1a0830", strokeW: 6 });
  }
  const hype = (F && (F.hypeUntil || 0) > G.time) || (F && F.phase === "ko");
  const im = img(hype ? "bar.crowd_hype" : "bar.crowd_calm");
  if (!im) return;
  const jump = hype ? Math.abs(Math.sin(G.time * 11)) * 10 : Math.sin(G.time * 1.6) * 2;
  const x = Math.round((W - im.width) / 2 - camX * 0.3);
  const y = Math.round(H + 150 - im.height - jump);
  ctx.drawImage(im, x, y);
  // foreground layer: darken so the fighters stay readable
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.drawImage(silhouette(im, "#0c0614"), x, y);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Super moves, throws                                                 */
/* ------------------------------------------------------------------ */
const SUPER_NAMES = {
  guf: "ХЛЕБНИ ЧАЯ!", noize: "MAKE SOME NOIZE", oxxxy: "РАУНД, С*КА", morgen: "АЛИШЕР ТАГИРОВИЧ",
  maybe: "БИЛЕТ В МЭЙБИЛЭНД!", kreed: "СЮДА, БЛИН", slava: "ПРИДИ И ОХЛАДИ МОЙ ПЫЛ", atl: "Я ТЕБЯ ОТПЕЛ",
  korzh: "МАЛЫЙ ПОВЗРОСЛЕЛ", face: "Я РОНЯЮ ЗАПАД", chip: "ЭТО МОЁ ГЭНГСТА!",
  ramirez: "ДИКИЙ СЛЭМ!", husky: "ПУЛЯ-ДУРА", babangida: "ТЕНЬ", sqwoz: "ТАТАРСКИЙ БОГАТЫРЬ", shilo: "СКВОЗНОЕ", krip: "КРАСНАЯ ЖАРА", tito: "БУДЕТЕ НАКАЗАНЫ", loki: "КОАЛКО", smoky: "ВСЯ СИЛА В ОДНОМ КУЛАКЕ", fludd: "GLAM GO!",
};

function addSuper(f, v) {
  if (!f || f.ko) return;
  const was = f.super || 0;
  if (G.stage === "fountains" && f.cid === "slava") v *= 1.25;   // home arena
  f.super = Math.min(100, was + v);
  if (was < 100 && f.super >= 100) {
    playSfx("superReady"); popup(f.x, f.y - 300, "ПАНЧ ГОТОВ!", GOLD, 28);
    playSfx("menuSelect");
  }
}

function startSuper(f) {
  f.super = 0;
  f.crouch = false;
  f.dashT = 0;
  f.chainBuf = null;
  f.action = { type: "super", move: { frame: "special", startup: 0, active: 0, recovery: 0 }, t: 0, total: 99, phase: "cut", hits: 0 };
  F.superCut = { slot: f.slot, t: 0, dur: 1.05 };
  F.flash = Math.max(F.flash, 0.25);
  playSfx("special_" + f.cid);
  playSfx("superStart");
  if (!f.isBot || G.mode === 2) buzz(60);
}

// Throw = a short grab first (GRAB_T): the victim can break it with БЛОК or РУКА, otherwise the throw lands
const GRAB_T = 0.32;
const BOT_TECH = { easy: 0.12, normal: 0.3, hard: 0.55 };
function startThrow(f, opp) {
  f.crouch = false;
  f.action = { type: "throw", move: { frame: "light", startup: 0.06, active: 0, recovery: 0.32, dmg: 0, reach: 0, y0: 0, y1: 0 },
    t: 0, total: GRAB_T + 0.4, hitDone: true, grab: true };
  f.vx = 0; f.dashT = 0;
  opp.grab = { by: f.slot, t: GRAB_T, botTech: opp.isBot && Math.random() < (BOT_TECH[G.difficulty] || 0.3) };
  opp.action = null; opp.vx = 0; opp.dashT = 0; opp.chainBuf = null;
  popup(f.x, f.y - 320, "ЗАХВАТ!", "#9fd0ff", 28);
  playSfx("whooshLight");
}
function resolveThrow(f, opp) {      // f = attacker, opp = the grabbed one
  f.action.grab = false;
  const res = applyHit(f, opp, { dmg: 4, height: "unblockable", hitstun: 2, blockstun: 0, knock: 0, dir: f.dir,
    sfx: "hitLight", stop: 0.06, chip: 0, noScale: true, sparkX: opp.x - f.dir * 20, sparkY: opp.y - 150 });
  if (res === "hit") opp.pull = { by: f.slot, t: 0.16, dist: 55, mode: "throw" };
}
// Called for the grabbed fighter every frame while the grab lasts
function updateGrab(f, c, dt) {
  const g = f.grab, att = F.fighters[g.by];
  if (!att.action || att.action.type !== "throw" || !att.action.grab || att.ko || f.ko || !liveFight()) { f.grab = null; return; }
  g.t -= dt;
  f.vx = 0; f.noPushT = 0.1;
  f.x = lerp(f.x, clamp(att.x + att.dir * 70, WALL_L, WALL_R), 1 - Math.pow(0.001, dt));
  const breakIt = g.t < GRAB_T - 0.04 && (f.isBot ? g.botTech && g.t < GRAB_T * 0.55 : (c.pressed.block || c.pressed.light));
  if (breakIt) {
    f.grab = null;
    att.action = null;
    att.vx = -att.dir * 460; f.vx = att.dir * 460;
    att.blockstun = 0.18; f.blockstun = 0.12;
    addSuper(f, 4);
    blockSpark((att.x + f.x) / 2, f.y - 160);
    playSfx("block");
    popup(f.x, f.y - 320, "ВЫРВАЛСЯ!", "#8dff7a", 30);
    return;
  }
  if (g.t <= 0) { f.grab = null; resolveThrow(att, f); }
}

function superFlavor(f, opp) {
  switch (f.cid) {
    case "noize": F.flicker = 1.2; break;
    case "oxxxy":
      for (let i = 0; i < 16; i++) F.birds.push({ x: rand(-400, -20), y: rand(110, 380), vx: rand(260, 420), vy: rand(-20, 10), ph: rand(0, 6.28), s: pick([3, 4, 4, 5]) });
      break;
    case "morgen": F.money = 2.6; break;
    case "maybe": break;   // (Easter eggs removed at the author's request)
    case "kreed": F.roses = 2.6; break;
    case "slava": F.antihype = 2.4; break;
    case "atl": F.disco = 3; break;
    case "korzh": F.skyT = 1.6; F.skySlot = f.slot; break;
    case "face": F.fatT = 4; F.fatSlot = opp.slot; break;
    default:
      for (let i = 0; i < 30; i++) F.particles.push({ type: "sq", x: opp.x + rand(-60, 60), y: opp.y - rand(40, 240), vx: rand(-200, 200), vy: rand(-500, -100), g: 600,
        life: rand(0.6, 1.1), max: 1.1, size: pick([6, 8, 10]), color: pick(["#c8862a", "#f0c060", "#fff1c0", "#8a5a20"]) });
  }
}

function updateSuper(f, opp, dt) {
  const a = f.action;
  if (!a || a.type !== "super") return;
  if (a.phase === "cut") return;
  if (a.phase === "rush") {
    a.move.frame = "light";
    f.x = clamp(f.x + f.dir * 1350 * dt, WALL_L, WALL_R);
    f.noPushT = 0.1;
    const reach = Math.abs(opp.x - f.x) < 110 && Math.sign(opp.x - f.x) === f.dir;
    // ПАНЧ can be countered: if the target is guarding when the rush arrives, it bounces off
    if (reach && !opp.ko && opp.blocking && opp.onGround && !opp.action && opp.hitstun <= 0 && !(opp.downT > 0)) {
      a.phase = "recover"; a.t = -0.35; a.move.frame = "heavy";            // longer recovery: punishable
      f.vx = -f.dir * 520; opp.vx = f.dir * 380; opp.blockstun = 0.3;
      addSuper(opp, 10);
      blockSpark(opp.x - f.dir * 40, opp.y - 160);
      playSfx("block"); playSfx("parry");
      F.hitstop = 0.12; F.shake = Math.max(F.shake, 8);
      popup(opp.x, opp.y - 330, "ПАНЧ ОТБИТ!", "#8dff7a", 34);
    } else if (reach && !opp.ko && !(opp.downT > 0) && !(opp.invulnT > 0) && opp.y > FLOOR_Y - 170) {
      a.phase = "combo"; a.t = 0; a.hits = 0; playSfx("superHit");
      opp.vx = 0; opp.vy = 0; opp.hitstun = 3; opp.action = null; opp.pull = null; opp.dashT = 0;
    } else if (a.t > 0.5 || (f.dir > 0 ? f.x >= WALL_R : f.x <= WALL_L) || !liveFight()) {
      a.phase = "recover"; a.t = 0; a.move.frame = "heavy";
      popup(f.x, f.y - 300, "МИМО!", "#9d97c9", 26);
    }
  } else if (a.phase === "combo") {
    f.noPushT = 0.1; opp.noPushT = 0.1;
    opp.vx = 0;
    opp.x = clamp(f.x + f.dir * 92, WALL_L, WALL_R);
    const idx = Math.floor(a.t / 0.085);
    while (a.hits <= idx && a.hits < 7 && a.phase === "combo") {
      const last = a.hits === 6;
      a.move.frame = last ? "special" : (a.hits % 2 ? "heavy" : "light");
      if (!liveFight()) { a.phase = "recover"; a.t = 0; break; }
      applyHit(f, opp, last
        ? { dmg: 14, height: "unblockable", hitstun: 0.9, blockstun: 0, knock: 700, launch: -900, dir: f.dir, sfx: "hitHeavy", stop: 0.22, chip: 0, noScale: true, sparkX: opp.x, sparkY: opp.y - 140 }
        : { dmg: 3, height: "unblockable", hitstun: 3, blockstun: 0, knock: 0, dir: f.dir, sfx: a.hits % 2 ? "hitHeavy" : "hitLight", stop: 0.03, chip: 0, noScale: true, sparkX: opp.x - f.dir * 10, sparkY: opp.y - rand(110, 190) });
      a.hits++;
      if (last) {
        popup(W / 2, 230, SUPER_NAMES[f.cid] || "ПАНЧ!", GOLD, 46);
        superFlavor(f, opp);
        F.shake = Math.max(F.shake, 24);
        F.flash = Math.max(F.flash, 0.22);
        F.hypeUntil = G.time + 2;
        F.shockUntil = G.time + 1.2;
        a.phase = "recover"; a.t = 0;
      }
    }
  } else if (a.phase === "recover") {
    if (a.t > 0.42) f.action = null;
  }
}

function drawSuperCut() {
  const sc = F && F.superCut;
  if (!sc) return;
  const f = F.fighters[sc.slot];
  const k = sc.t / sc.dur;
  const left = f.slot === 0;
  const inK = clamp(k / 0.18, 0, 1), outK = clamp((1 - k) / 0.12, 0, 1);
  const a = Math.min(inK, outK);
  ctx.save();
  ctx.fillStyle = `rgba(4,2,12,${0.72 * a})`;
  ctx.fillRect(0, 0, W, H);
  // coloured band
  const bandY = 210, bandH = 300;
  const slide = (1 - inK) * W * (left ? -1 : 1);
  ctx.globalAlpha = a;
  ctx.translate(slide, 0);
  const g = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  g.addColorStop(0, "rgba(0,0,0,0.2)"); g.addColorStop(0.5, f.data.color); g.addColorStop(1, "rgba(0,0,0,0.2)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, bandY + 40); ctx.lineTo(W, bandY); ctx.lineTo(W, bandY + bandH - 40); ctx.lineTo(0, bandY + bandH);
  ctx.closePath(); ctx.fill();
  // speed lines
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    const yy = bandY + 30 + ((i * 53) % (bandH - 60));
    const xx = ((G.time * 2400 + i * 197) % (W + 400)) - 200;
    ctx.beginPath(); ctx.moveTo(left ? xx : W - xx, yy); ctx.lineTo(left ? xx - 160 : W - xx + 160, yy); ctx.stroke();
  }
  // portrait
  const p = img("portrait." + f.cid);
  const ps = 330;
  const px = left ? 70 : W - 70 - ps, py = bandY + bandH / 2 - ps / 2;
  if (p) {
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (!left) { ctx.translate(px + ps, py); ctx.scale(-1, 1); ctx.drawImage(p, 0, 0, ps, ps); }
    else ctx.drawImage(p, px, py, ps, ps);
    ctx.restore();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 6; ctx.strokeRect(px, py, ps, ps);
  }
  const tx = left ? px + ps + 40 : px - 40;
  text("ПАНЧ", tx, bandY + 90, { size: 26, font: FONT_PIX, align: left ? "left" : "right", color: "#fff", stroke: "#000", strokeW: 6 });
  const name = SUPER_NAMES[f.cid] || "ПАНЧ";
  text(name, tx, bandY + 160, { size: fitText(name, W - ps - 200, 64), align: left ? "left" : "right", gradient: ["#fff6c8", GOLD, "#ff7a3d"], stroke: "#1a0830", strokeW: 10 });
  text(f.data.name, tx, bandY + 222, { size: 30, align: left ? "left" : "right", color: f.data.color, stroke: "#000", strokeW: 6 });
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Combat extras: dash, chain finishers, pulls and throws              */
/* ------------------------------------------------------------------ */
const FINISHERS = {
  guf: "ЭТО ЦЕНТР!", noize: "ВЫДЫХАЙСЯ!", oxxxy: "ГОРГОРОД!", morgen: "ДОРОГО-БОГАТО!",
  maybe: "БЭЙБИ-КОМБО!", kreed: "ХОЛОСТЯК!", slava: "ГНОЙНЫЙ!", atl: "МАРАБУ!",
  korzh: "ЖИТЬ В КАЙФ!", face: "ЮМОРИСТ!", chip: "ГАНГСТА!",
  ramirez: "ВЕРТУШКА!", husky: "РЭПЕРОК, ТЫ КАК", babangida: "БАБАН В ЗДАНИИ", sqwoz: "ТЫ ЖИВОЙ?", shilo: "ПОЗИТИВНО ДУМАЙ", krip: "БУМ!", tito: "ГУД БАЙ", loki: "ГОРСВЕТ ТУТ!", smoky: "КИЯ!", fludd: "ШВЕПСОВО!",
};

function startDash(f, d) {
  const fwd = d === f.dir;
  f.dashT = fwd ? 0.2 : 0.18;
  f.dashV = d * (fwd ? 960 : 760) * (f.data.dash || 1);
  if (fwd) f.dashAt = G.time;
  if (fwd && f.cid === "slava") f.noPushT = 0.24;      // trickster: slips through to the other side
  if (!fwd) f.invulnT = 0.12;            // a backdash slips through the first frames of an attack
  f.tap = null;
  spawnDust(f.x - d * 30, f.y, 0.9);
  playSfx("dash");
}

// Third hit of a light-light-heavy chain: stronger, launches, shows the fighter's finisher name
function makeFinisher(f) {
  const mv = f.action.move;
  f.action.move = { ...mv, reach: mv.reach + 20, dmg: mv.dmg + 5, knock: Math.max(mv.knock, 320) * 1.6, launch: -520,
    hitstun: mv.hitstun + 0.2, stop: 0.14, finisher: true, hits: undefined };
  f.action.total = f.action.move.startup + f.action.move.active + f.action.move.recovery;
}

function updatePull(f, dt) {
  f.noPushT = Math.max(0, (f.noPushT || 0) - dt);
  const pl = f.pull;
  if (pl) {
    const att = F.fighters[pl.by];
    pl.t -= dt;
    const tx = clamp(att.x + att.dir * pl.dist, WALL_L, WALL_R);
    f.x = lerp(f.x, tx, 1 - Math.pow(0.0004, dt));
    f.vx = 0;
    f.noPushT = 0.1;
    f.dir = -att.dir;
    if (pl.t <= 0 || att.ko) {
      f.pull = null;
      if (pl.mode === "throw" && !f.ko && !att.ko) {
        f.x = clamp(att.x + att.dir * 30, WALL_L, WALL_R);
        f.y = Math.min(f.y, FLOOR_Y - 2);
        f.vy = -1150;
        f.vx = -att.dir * 600;
        f.onGround = false;
        f.hitstun = 2;
        f.noPushT = 0.9;
        f.thrown = { by: pl.by };
        playSfx("throw");
        popup(att.x, att.y - 340, "БРОСОК!", "#9fd0ff", 36);
      } else if (pl.mode === "pull") {
        f.hitstun = Math.max(f.hitstun, 0.45);
      }
    }
  }
  if (f.thrown && f.onGround) {
    const by = f.thrown.by;
    f.thrown = null;
    f.hitstun = 0.5;
    const dmg = F.fighters[by] && F.fighters[by].cid === "maybe" ? 12 : 8;   // Maybe's whip slam hits harder
    f.hp = Math.max(0, f.hp - dmg);
    if (f.hp <= 0) fakeDeath(f);
    f.flash = 0.1;
    popup(f.x, f.y - 240, `-${dmg}`, "#ffef7a", 30);
    spawnDust(f.x, FLOOR_Y, 1.6);
    hitSpark(f.x, FLOOR_Y - 40, 10);
    F.shake = Math.max(F.shake, 14);
    F.hypeUntil = G.time + 1.1;
    playSfx("hitHeavy");
    if (f.hp <= 0) endRound("ko", by, f.x < W / 2 ? -1 : 1);
  }
}

/* ------------------------------------------------------------------ */
/* Maybe Baby: hair whip                                               */
/* ------------------------------------------------------------------ */
const WHIP_LEN = 540;
// Hair root relative to the feet in the "special" frame (measured from the sprite).
const WHIP_ROOT = { x: 4, y: -206 };
const HAIR = { outline: "#141d3c", dark: "#224776", mid: "#396698", light: "#5688b6", shine: "#78aedd" }; // sampled from her sprite
// Root angle keyframes (deg, local space: 0 = forward, 90 = down, 270 = up). Unwrapped so
// the hair swings back, over the top of her head and then lashes forward.
const WHIP_KEYS = [[0, 100], [0.15, 212], [0.23, 368], [0.42, 366], [0.7, 460]];
const WHIP_LAG = 0.0042;  // seconds of delay per segment → the wave that makes it a whip
const WHIP_SEGS = 24;

function whipRootAngle(t) {
  if (t <= 0) return WHIP_KEYS[0][1];
  for (let i = 1; i < WHIP_KEYS.length; i++) {
    const [t1, a1] = WHIP_KEYS[i];
    const [t0, a0] = WHIP_KEYS[i - 1];
    if (t <= t1) {
      const u = (t - t0) / (t1 - t0);
      return a0 + (a1 - a0) * u * u * (3 - 2 * u);
    }
  }
  return WHIP_KEYS[WHIP_KEYS.length - 1][1];
}

function whipLength(t) {
  // hair "grows" out for the lash and settles back to its natural length
  const grow = clamp((t - 0.13) / 0.12, 0, 1);
  const settle = clamp((t - 0.44) / 0.24, 0, 1);
  const ext = grow * (1 - settle);
  return 120 + (WHIP_LEN - 120) * (ext * ext * (3 - 2 * ext));
}

function whipStrand(f, t, lagScale, offset) {
  const d = f.dir;
  const L = whipLength(t);
  const seg = L / WHIP_SEGS;
  let x = f.x + d * WHIP_ROOT.x;
  let y = f.y + WHIP_ROOT.y;
  const pts = [[x, y, 0]];
  let prevNx = 0, prevNy = 0;
  for (let i = 0; i < WHIP_SEGS; i++) {
    const u = (i + 1) / WHIP_SEGS;
    const ripple = Math.sin(t * 30 - i * 0.6) * 7 * u;
    const ang = (whipRootAngle(t - i * WHIP_LAG * lagScale) + ripple) * Math.PI / 180;
    const dx = Math.cos(ang) * d;
    const dy = Math.sin(ang);
    x += dx * seg;
    y += dy * seg;
    prevNx = -dy; prevNy = dx;
    const spread = offset * (1 + 4.5 * Math.pow(u, 2));   // strands fan out a little towards the tip
    pts.push([x + prevNx * spread, y + prevNy * spread, u]);
  }
  return pts;
}

// The whip is rendered at half resolution and scaled up with nearest-neighbour,
// so its strands get the same chunky pixels as the sprites.
let whipLayer = null;
function drawHairWhip(f) {
  if (!whipLayer) {
    whipLayer = document.createElement("canvas");
    whipLayer.width = W / 2;
    whipLayer.height = H / 2;
  }
  const main = ctx;
  ctx = whipLayer.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, whipLayer.width, whipLayer.height);
  ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
  try {
    drawHairWhipStrands(f);
  } finally {
    ctx = main;
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(whipLayer, 0, 0, W, H);
  ctx.restore();
}

function drawHairWhipStrands(f) {
  const a = f.action;
  const t = a.t;
  const fade = Math.min(1, t / 0.05, (a.total - t) / 0.1);
  if (fade <= 0) return;
  const K = 7;
  const strands = [];
  for (let k = 0; k < K; k++) {
    const o = k - (K - 1) / 2;
    strands.push({ pts: whipStrand(f, t, 1 + Math.abs(o) * 0.1, o * 0.9), o });
  }
  ctx.save();
  ctx.globalAlpha *= clamp(fade, 0, 1);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const strokeStrand = (pts, width, color, dy = 0, upto = 1) => {
    ctx.strokeStyle = color;
    const n = Math.max(2, Math.floor((pts.length - 1) * upto));
    for (let i = 0; i < n; i++) {
      const [x0, y0, u0] = pts[i];
      const [x1, y1] = pts[i + 1];
      ctx.lineWidth = Math.max(1, width(u0));
      ctx.beginPath();
      ctx.moveTo(x0, y0 + dy);
      ctx.lineTo(x1, y1 + dy);
      ctx.stroke();
    }
  };
  // 1) dark outline of the whole bundle
  for (const s of strands) strokeStrand(s.pts, (u) => lerp(17, 5, u) + 3, HAIR.outline);
  // 2) strands, back to front: darker underneath, light on top
  const order = [...strands].sort((p, q) => q.o - p.o);
  order.forEach((s, idx) => {
    const col = [HAIR.dark, HAIR.mid, HAIR.dark, HAIR.light, HAIR.mid, HAIR.light, HAIR.mid][idx % 7];
    strokeStrand(s.pts, (u) => lerp(13, 3, u), col);
  });
  // 3) glossy highlights along a couple of strands
  const mid = strands[(K - 1) >> 1].pts;
  strokeStrand(mid, (u) => lerp(2.5, 1, u), HAIR.shine, -2, 0.75);
  strokeStrand(strands[(K - 1) / 2 + 2 | 0].pts, () => 1.2, HAIR.shine, -1, 0.5);
  ctx.restore();

  // 4) crack at the tip + a few loose hairs
  const tipT = 0.23 + WHIP_SEGS * WHIP_LAG;
  if (t > tipT - 0.03 && t < tipT + 0.06) {
    const tip = mid[mid.length - 1];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + t * 9;
      ctx.beginPath();
      ctx.moveTo(tip[0] + Math.cos(ang) * 8, tip[1] + Math.sin(ang) * 8);
      ctx.lineTo(tip[0] + Math.cos(ang) * 30, tip[1] + Math.sin(ang) * 30);
      ctx.stroke();
    }
    ctx.restore();
    if (F && !a.crackFx) {
      a.crackFx = true;
      for (let i = 0; i < 10; i++) {
        F.particles.push({ type: "sq", x: tip[0], y: tip[1], vx: f.dir * rand(60, 260), vy: rand(-180, 120), g: 500,
          life: rand(0.25, 0.5), max: 0.5, size: pick([2, 3, 4]), color: pick([HAIR.light, HAIR.mid, HAIR.shine]) });
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Max Korzh: earthquake                                               */
/* ------------------------------------------------------------------ */
function updateQuake(p, dt) {
  p.t += dt;
  p.life -= dt;
  const front = p.t * p.speed;
  F.shake = Math.max(F.shake, 7 * clamp(1 - p.t / 1.4, 0, 1));
  for (const s of [-1, 1]) {
    const fx = p.x + s * front;
    if (fx > -20 && fx < W + 20 && Math.random() < dt * 60) {
      F.particles.push({ type: "sq", x: fx + rand(-10, 10), y: FLOOR_Y - 4, vx: s * rand(20, 120), vy: rand(-520, -260), g: 1500,
        life: rand(0.4, 0.7), max: 0.7, size: pick([6, 8, 10]), color: pick(["#5a4636", "#7a6048", "#3b2e24", "#9a8268"]) });
    }
  }
  const target = F.fighters[1 - p.owner];
  const d = Math.abs(target.x - p.x);
  if (!p.hit && liveFight() && d <= front && d >= front - 140) {
    if (target.onGround) {
      p.hit = true;
      const res = applyHit(F.fighters[p.owner], target, {
        dmg: p.dmg, height: "unblockable", hitstun: 0.8, blockstun: 0.3, knock: 200, dir: target.x >= p.x ? 1 : -1,
        sfx: "hitHeavy", stop: 0.12, chip: 0, launch: -760, sparkX: target.x, sparkY: FLOOR_Y - 30,
      });
      if (res === "hit") popup(target.x, target.y - 300, "ТРЯХНУЛО!", "#e0a060", 34);
    } else if (!p.dodged) {
      p.dodged = true;
      popup(target.x, target.y - 300, "ПЕРЕПРЫГНУЛ!", "#8dff7a", 26);
    }
  }
}

function drawQuake(p) {
  const front = p.t * p.speed;
  const fade = clamp(p.life / 0.5, 0, 1);
  ctx.save();
  ctx.globalAlpha = fade;
  for (const s of [-1, 1]) {
    ctx.strokeStyle = "#140c08";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(p.x, FLOOR_Y + 4);
    for (let d = 0; d <= front; d += 28) {
      const jag = ((Math.floor(d / 28) * 7919 + (s > 0 ? 13 : 37)) % 17 - 8);
      ctx.lineTo(p.x + s * d, FLOOR_Y + 4 + jag);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,150,60,0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
    const fx = p.x + s * front;
    const g = ctx.createRadialGradient(fx, FLOOR_Y, 4, fx, FLOOR_Y, 90);
    g.addColorStop(0, "rgba(170,140,110,0.7)");
    g.addColorStop(1, "rgba(170,140,110,0)");
    ctx.fillStyle = g;
    ctx.fillRect(fx - 90, FLOOR_Y - 90, 180, 110);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* ATL: nuclear strike                                                 */
/* ------------------------------------------------------------------ */
const NUKE_TRACK = 1.0, NUKE_FALL = 0.45;
function updateNuke(p, dt) {
  p.t += dt;
  p.life -= dt;
  const target = F.fighters[1 - p.owner];
  if (p.t < NUKE_TRACK) p.x = lerp(p.x, clamp(target.x, WALL_L, WALL_R), 1 - Math.pow(0.02, dt));
  else if (p.t < NUKE_TRACK + NUKE_FALL) p.y = lerp(-200, FLOOR_Y - 60, (p.t - NUKE_TRACK) / NUKE_FALL);
  if (!p.hit && p.t >= NUKE_TRACK + NUKE_FALL) {
    p.hit = true;
    p.boomT = 0;
    F.flash = 1;
    F.shake = Math.max(F.shake, 26);
    playSfx("atl_boom");
    for (let i = 0; i < 40; i++) {
      const a = rand(Math.PI, Math.PI * 2);
      const sp = rand(200, 700);
      F.particles.push({ type: "sq", x: p.x, y: FLOOR_Y - 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 900,
        life: rand(0.4, 0.9), max: 0.9, size: pick([6, 8, 10]), color: pick(["#fff6b0", "#ffd54a", "#ff9a3d", "#ff4a2a", "#5a3a2a"]) });
    }
    if (Math.abs(target.x - p.x) < p.w / 2 && liveFight()) {
      const res = applyHit(F.fighters[p.owner], target, {
        dmg: p.dmg, height: "unblockable", hitstun: 0.9, blockstun: 0.3, knock: 420, dir: target.x >= p.x ? 1 : -1,
        sfx: "hitHeavy", stop: 0.16, chip: 0, launch: -950, sparkX: target.x, sparkY: target.y - 100,
      });
      if (res === "hit") popup(target.x, target.y - 300, "ЯДЕРКА!", "#ffd54a", 38);
    } else if (liveFight()) {
      popup(target.x, target.y - 280, "МИМО!", "#8dff7a", 30);
    }
  }
  if (p.hit) p.boomT += dt;
}

function drawNuke(p) {
  const locked = p.t >= NUKE_TRACK;
  if (!p.hit) {
    // target marker on the floor
    const blink = locked || Math.floor(p.t * 10) % 2 === 0;
    ctx.save();
    ctx.translate(p.x, FLOOR_Y + 2);
    ctx.scale(1, 0.28);
    ctx.lineWidth = 6;
    ctx.strokeStyle = blink ? "rgba(255,40,40,0.95)" : "rgba(255,40,40,0.4)";
    ctx.fillStyle = "rgba(255,30,30,0.18)";
    ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, p.w / 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-p.w / 2 - 20, 0); ctx.lineTo(p.w / 2 + 20, 0); ctx.moveTo(0, -p.w / 2 - 20); ctx.lineTo(0, p.w / 2 + 20); ctx.stroke();
    ctx.restore();
    if (blink) text("БЕГИ!", p.x, FLOOR_Y - 300, { size: 30, align: "center", color: "#ff5050", stroke: "#000", strokeW: 6 });
    if (locked) {
      const im = img("fx.nuke");
      if (im) ctx.drawImage(im, Math.round(p.x - im.width / 2), Math.round(p.y - im.height));
    }
    return;
  }
  // mushroom cloud
  const t = p.boomT;
  const k = easeOut(Math.min(1, t / 0.6));
  const fade = clamp(1 - (t - 1.2) / 0.8, 0, 1);
  if (fade <= 0) return;
  ctx.save();
  ctx.globalAlpha = fade;
  const x = p.x, base = FLOOR_Y;
  const stemH = 260 * k;
  const g = ctx.createLinearGradient(0, base - stemH, 0, base);
  g.addColorStop(0, "#ffd54a"); g.addColorStop(1, "#ff5a2a");
  ctx.fillStyle = g;
  ctx.fillRect(x - 22 - 10 * k, base - stemH, 44 + 20 * k, stemH);
  const capY = base - stemH - 40 * k;
  const blobs = [[0, 0, 90], [-70, 15, 60], [70, 15, 60], [-40, -35, 55], [40, -35, 55], [0, -55, 50]];
  for (const [dx, dy, r] of blobs) {
    const rg = ctx.createRadialGradient(x + dx * k, capY + dy * k, 5, x + dx * k, capY + dy * k, r * k);
    rg.addColorStop(0, "#fff6b0"); rg.addColorStop(0.5, "#ff9a3d"); rg.addColorStop(1, "rgba(120,40,20,0.9)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(x + dx * k, capY + dy * k, r * k, 0, Math.PI * 2); ctx.fill();
  }
  // ground ring
  ctx.strokeStyle = "rgba(255,220,150,0.8)";
  ctx.lineWidth = 8 * (1 - k) + 2;
  ctx.beginPath(); ctx.ellipse(x, base, 320 * k, 40 * k, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Projectiles                                                         */
/* ------------------------------------------------------------------ */
function projBox(p) {
  if (p.kind === "zilla") { const fr = p.x + p.dir * 170; return { x0: Math.min(fr, fr - p.dir * p.w), x1: Math.max(fr, fr - p.dir * p.w), y0: FLOOR_Y - p.h, y1: FLOOR_Y }; }
  if (p.kind === "cadillac") return { x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: FLOOR_Y - p.h, y1: FLOOR_Y };
  return { x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: p.y - p.h / 2, y1: p.y + p.h / 2 };
}

const MOSH = { enter: 0.45, stare: 1.05, clash: 1.3, pile: 2.2 };
function moshWall(p, side, k) {
  const half = 340;
  const edge = side < 0 ? Math.max(70, p.cx - half) : Math.min(W - 70, p.cx + half);
  return edge + side * k * 58;
}
function updateMosh(p, dt) {
  p.t += dt; p.life -= dt;
  const target = F.fighters[1 - p.owner], att = F.fighters[p.owner];
  if (p.t < MOSH.stare) p.cx = clamp(target.x, WALL_L, WALL_R);         // the walls follow you until they charge
  if (p.t < MOSH.enter) {
    for (const m of p.ms) { const goal = moshWall(p, m.side, m.k); m.x += (goal - m.x) * Math.min(1, dt * 9); }
    if (Math.random() < dt * 20) spawnDust(rand(0, W), FLOOR_Y, 0.4);
  } else if (p.t < MOSH.stare) {
    if (p.phase !== "stare") { p.phase = "stare"; popup(p.cx, FLOOR_Y - 310, "СТЕНКА НА СТЕНКУ!", "#b4c94a", 34); playSfx("crowdReact"); }
    for (const m of p.ms) m.x = moshWall(p, m.side, m.k) + Math.sin(p.t * 30 + m.ph) * 3;
  } else if (p.t < MOSH.clash) {
    p.phase = "charge";
    const k = (p.t - MOSH.stare) / (MOSH.clash - MOSH.stare);
    for (const m of p.ms) { const from = moshWall(p, m.side, m.k); m.x = from + (p.cx + m.side * (18 + m.k * 34) - from) * k * k; }
    F.shake = Math.max(F.shake, 4);
  } else if (p.phase !== "pile" && p.phase !== "scatter") {
    p.phase = "pile"; p.pileT = 0;
    F.shake = Math.max(F.shake, 18); F.flash = Math.max(F.flash, 0.12);
    spawnDust(p.cx, FLOOR_Y, 2.2); playSfx("hitHeavy"); playSfx("crowdReact");
    const grounded = target.y > FLOOR_Y - 55 && Math.abs(target.x - p.cx) < 150;
    p.caught = grounded && !target.ko && liveFight();
    if (!p.caught) popup(p.cx, FLOOR_Y - 310, "МИМО!", "#fff6c8", 30);
    else popup(p.cx, FLOOR_Y - 310, "СЛЭМ!", "#b4c94a", 44);
  }
  if (p.phase === "pile") {
    p.pileT += dt;
    for (const m of p.ms) { m.x = p.cx + m.side * (14 + m.k * 26) + Math.sin(p.t * 26 + m.ph) * 22; m.rot = Math.sin(p.t * 19 + m.ph) * 0.5; m.y = -Math.abs(Math.sin(p.t * 17 + m.ph)) * 26; }
    if (Math.random() < dt * 25) spawnDust(p.cx + rand(-120, 120), FLOOR_Y, 0.7);
    if (p.caught) {
      target.vx = 0; target.x = clamp(p.cx + Math.sin(p.t * 22) * 26, WALL_L, WALL_R);
      const tick = Math.floor(p.pileT / 0.18);
      if (tick < 5 && tick >= p.ticks) {
        p.ticks = tick + 1;
        const last = tick === 4, dir = tick % 2 ? 1 : -1;
        if (tick === 0) playSfx("rem_monkeys_hit");
        applyHit(att, target, { dmg: last ? 6 : 3, height: "unblockable", hitstun: last ? 0.8 : 0.4, blockstun: 0, knock: last ? 420 : 0,
          dir: last ? (att.x < target.x ? 1 : -1) : dir, sfx: last ? "hitHeavy" : "hitLight", stop: last ? 0.1 : 0.03, chip: 0, noScale: true,
          launch: last ? -640 : 0, sparkX: target.x + rand(-40, 40), sparkY: target.y - rand(80, 200) });
        if (last) { p.caught = false; p.pileT = 9; }
      }
    }
    if (p.pileT > 0.95) {
      p.phase = "scatter";
      for (const m of p.ms) { m.vx = m.side * rand(500, 900) * (Math.random() < 0.3 ? -1 : 1); m.vy = rand(-900, -500); m.spin = rand(-12, 12); m.y = 0; }
    }
  }
  if (p.phase === "scatter") {
    for (const m of p.ms) { m.vy += 2000 * dt; m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.spin * dt; }
    if (p.ms.every((m) => m.y > 300 || m.x < -200 || m.x > W + 200)) p.life = 0;
  }
}
function drawMosh(p) {
  const im = img("fx.monkey");
  // strobe while the pile is going
  if (p.phase === "pile" && Math.floor(p.t * 16) % 2 === 0) {
    ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = Math.floor(p.t * 8) % 2 ? "#ffffff" : "#b4c94a"; ctx.fillRect(-100, -100, W + 200, H + 200); ctx.restore();
  }
  if (p.phase === "stare") {
    const a = 0.35 + 0.25 * Math.sin(p.t * 20);
    ctx.fillStyle = `rgba(180,201,74,${a})`;
    ctx.beginPath(); ctx.ellipse(p.cx, FLOOR_Y + 4, 110, 12, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const m of [...p.ms].sort((a, b) => a.y - b.y)) {
    const run = p.phase === "enter" || p.phase === "charge";
    const bob = run ? Math.abs(Math.sin(p.t * 15 + m.ph)) * 14 : p.phase === "stare" ? Math.abs(Math.sin(p.t * 9 + m.ph)) * 6 : 0;
    if (p.phase !== "scatter") { ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(m.x, FLOOR_Y + 4, 66 * m.sc, 8, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.save();
    ctx.translate(m.x, FLOOR_Y + 2 + m.y - bob);
    const face = p.phase === "scatter" ? Math.sign(m.vx) || 1 : -m.side;   // face the middle
    if (face < 0) ctx.scale(-1, 1);
    ctx.rotate(m.rot * face + (run ? Math.sin(p.t * 15 + m.ph) * 0.06 : 0));
    ctx.scale(m.sc, m.sc);
    if (m.k === 1) ctx.filter = "brightness(0.8)";
    if (im) ctx.drawImage(im, -im.width / 2, -im.height);
    ctx.restore();
  }
}
function updatePigeons(p, dt) {
  p.t += dt; p.life -= dt;
  const target = F.fighters[1 - p.owner];
  // the flock slows down while it's on top of the victim
  const on = overlap(projBox(p), hurtbox(target));
  p.x += p.vx * dt * (on && p.hits < 5 ? 0.25 : 1);
  if (Math.random() < dt * 12) F.particles.push({ type: "sq", x: p.x + rand(-100, 100), y: p.y + rand(-30, 30), vx: rand(-80, 80), vy: rand(20, 90), life: 0.9, max: 0.9, size: pick([4, 6]), color: pick(["#d8dce4", "#9aa3b2", "#ffffff"]) });
  p.nextHit -= dt;
  if (on && liveFight() && p.hits < 5 && p.nextHit <= 0) {
    p.nextHit = 0.13; p.hits++;
    const last = p.hits === 5;
    const res = applyHit(F.fighters[p.owner], target, { dmg: last ? 5 : p.dmg, height: "high", hitstun: last ? 0.6 : 0.3, blockstun: 0.18,
      knock: last ? 320 : 40, dir: p.dir, sfx: last ? "hitHeavy" : "hitLight", stop: last ? 0.08 : 0.02, chip: 0.5, noScale: true,
      sparkX: target.x + rand(-30, 30), sparkY: target.y - rand(150, 210) });
    for (let i = 0; i < 6; i++) F.particles.push({ type: "sq", x: target.x + rand(-40, 40), y: target.y - rand(150, 220), vx: rand(-200, 200), vy: rand(-200, 50), g: 300, life: 0.8, max: 0.8, size: pick([4, 6, 8]), color: pick(["#d8dce4", "#9aa3b2", "#ffffff"]) });
    if (last && res === "hit") popup(target.x, target.y - 300, "ЗАКЛЕВАЛИ!", "#d8dce4", 32);
  }
}
function drawPigeon(x, y, dir, ph, s) {
  const im1 = img("fx.pigeon_1"), im2 = img("fx.pigeon_2");
  const up = Math.sin(ph) > 0;
  ctx.save(); ctx.translate(x, y); if (dir < 0) ctx.scale(-1, 1); ctx.scale(s, s);
  const im = up ? im1 : im2;
  if (im) ctx.drawImage(im, -im.width / 2, -im.height / 2);
  else {
    ctx.fillStyle = "#8d96a6"; ctx.beginPath(); ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2); ctx.fill();          // body
    ctx.fillStyle = "#6b7484"; ctx.beginPath(); ctx.arc(18, -6, 7, 0, Math.PI * 2); ctx.fill();                       // head
    ctx.fillStyle = "#3c9a7a"; ctx.fillRect(12, -2, 8, 4);                                                           // neck sheen
    ctx.fillStyle = "#e0a040"; ctx.beginPath(); ctx.moveTo(24, -7); ctx.lineTo(31, -5); ctx.lineTo(24, -3); ctx.fill(); // beak
    ctx.fillStyle = "#ff3030"; ctx.fillRect(19, -9, 3, 3);                                                           // angry eye
    ctx.fillStyle = "#b3bac6"; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(10, -2); ctx.lineTo(2, up ? -26 : 22); ctx.closePath(); ctx.fill(); // wing
    ctx.fillStyle = "#6b7484"; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-30, -5); ctx.lineTo(-30, 6); ctx.closePath(); ctx.fill(); // tail
  }
  ctx.restore();
}
function updateMolotov(p, dt) {
  p.t += dt;
  const target = F.fighters[1 - p.owner], att = F.fighters[p.owner];
  if (p.phase === "fly") {
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += 12 * dt * Math.sign(p.vx || 1);
    if (Math.random() < dt * 40) F.particles.push({ type: "sq", x: p.x - Math.sign(p.vx) * 20, y: p.y - 20, vx: rand(-30, 30), vy: rand(-80, -30), life: 0.3, max: 0.3, size: pick([3, 4]), color: pick(["#ffb030", "#ff6a20", "#ffe080"]) });
    let burst = false;
    if (!p.hit && liveFight() && overlap(projBox(p), hurtbox(target))) {
      p.hit = true; burst = true;
      const res = applyHit(att, target, { dmg: p.dmg, height: "mid", hitstun: 0.6, blockstun: 0.24, knock: 300, dir: Math.sign(p.vx) || p.dir,
        sfx: "hitHeavy", stop: 0.1, chip: 3, launch: -420, sparkX: target.x, sparkY: p.y });
      if (res === "hit") popup(target.x, target.y - 310, "ГОРИ!", "#ff8a30", 34);
    }
    if (burst || p.y >= FLOOR_Y - 10) {
      playSfx("loki_fire");
      p.phase = "fire"; p.t = 0; p.life = 2.6; p.y = FLOOR_Y; p.x = clamp(p.x, WALL_L, WALL_R); p.w = 190; p.h = 40; p.tick = 0;
      F.shake = Math.max(F.shake, 6); playSfx("block");
      for (let i = 0; i < 24; i++) F.particles.push({ type: "sq", x: p.x + rand(-20, 20), y: FLOOR_Y - rand(5, 40), vx: rand(-260, 260), vy: rand(-380, -80), g: 900, life: rand(0.4, 0.8), max: 0.8, size: pick([3, 4, 6]), color: pick(["#ffb030", "#ff6a20", "#ffe080", "#c8e8ff"]) });
    }
    return;
  }
  // pool of fire: burns whoever stands in it (on the ground)
  p.life -= dt;
  p.tick -= dt;
  const inFire = target.onGround && !target.ko && Math.abs(target.x - p.x) < p.w / 2 + 20;
  if (inFire && p.tick <= 0 && liveFight()) {
    p.tick = 0.4;
    applyHit(att, target, { dmg: 3, height: "unblockable", hitstun: 0.22, blockstun: 0, knock: Math.sign(target.x - p.x || 1) * 140, dir: Math.sign(target.x - p.x) || 1,
      sfx: "hitLight", stop: 0.02, chip: 0, noScale: true, sparkX: target.x, sparkY: FLOOR_Y - 40 });
  }
}
function drawFirePool(p) {
  const fade = Math.min(1, p.life / 0.5, p.t / 0.15);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(p.x, FLOOR_Y - 10, 5, p.x, FLOOR_Y - 10, p.w * 0.7);
  g.addColorStop(0, `rgba(255,140,40,${0.45 * fade})`); g.addColorStop(1, "rgba(255,80,20,0)");
  ctx.fillStyle = g; ctx.fillRect(p.x - p.w, FLOOR_Y - 140, p.w * 2, 160);
  ctx.restore();
  for (let i = 0; i < 9; i++) {
    const fx = p.x - p.w / 2 + (i + 0.5) * p.w / 9;
    const fh = (70 + 50 * Math.abs(Math.sin(G.time * 9 + i * 1.7)) + (i % 2) * 20) * fade;
    const fw = 34;
    ctx.fillStyle = `rgba(255,${90 + (i % 3) * 30},20,${0.9 * fade})`;
    ctx.beginPath(); ctx.moveTo(fx - fw / 2, FLOOR_Y + 4); ctx.quadraticCurveTo(fx - fw / 3, FLOOR_Y - fh * 0.6, fx + Math.sin(G.time * 7 + i) * 6, FLOOR_Y - fh);
    ctx.quadraticCurveTo(fx + fw / 3, FLOOR_Y - fh * 0.6, fx + fw / 2, FLOOR_Y + 4); ctx.fill();
    ctx.fillStyle = `rgba(255,230,140,${0.8 * fade})`;
    ctx.beginPath(); ctx.moveTo(fx - fw / 4, FLOOR_Y + 4); ctx.quadraticCurveTo(fx, FLOOR_Y - fh * 0.5, fx + fw / 4, FLOOR_Y + 4); ctx.fill();
  }
  if (Math.random() < 0.5) F.particles.push({ type: "sq", x: p.x + rand(-p.w / 2, p.w / 2), y: FLOOR_Y - rand(20, 60), vx: rand(-20, 20), vy: rand(-120, -60), life: 0.6, max: 0.6, size: pick([3, 4]), color: pick(["#ffb030", "#ffe080", "rgba(60,40,30,0.6)"]) });
}
function updateKanye(p, dt) {
  p.t += dt;
  if (p.phase === "fly") {
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += 7 * dt * Math.sign(p.vx || 1);
    if (p.x < WALL_L - 40 || p.x > WALL_R + 40) { p.vx = -p.vx * 0.4; p.x = clamp(p.x, WALL_L - 40, WALL_R + 40); }
    const target = F.fighters[1 - p.owner];
    if (!p.hit && liveFight() && p.vy > 0 && overlap(projBox(p), hurtbox(target))) {
      p.hit = true;
      const res = applyHit(F.fighters[p.owner], target, { dmg: p.dmg, height: "overhead", hitstun: 0.8, blockstun: 0.26, knock: 360,
        dir: Math.sign(p.vx) || p.dir, sfx: "hitHeavy", stop: 0.12, chip: 3, launch: -520, sparkX: target.x, sparkY: target.y - 200 });
      if (res === "hit") popup(target.x, target.y - 320, "ПРИЗЕМЛИЛСЯ!", "#ff4a3a", 32);
      p.vx = -p.vx * 0.35; p.vy = -380;          // bounces off the head
    }
    if (p.y >= FLOOR_Y - 35 && p.vy > 0) {
      p.phase = "lie"; p.t = 0; p.y = FLOOR_Y; p.vx = 0; p.vy = 0;
      F.shake = Math.max(F.shake, 7); spawnDust(p.x, FLOOR_Y, 1.4); playSfx("bodyfall");
    }
  } else if (p.phase === "lie") {
    if (p.t > 0.9) { p.phase = "walk"; p.t = 0; p.walkDir = p.x < W / 2 ? -1 : 1; }
  } else {
    p.x += p.walkDir * 170 * dt;
    if (p.x < -200 || p.x > W + 200) p.life = 0;
  }
}

function updateProjectiles(dt) {
  for (const p of F.projectiles) {
    if (p.delay > 0) { p.delay -= dt; continue; }
    if (p.kind === "nuke") { updateNuke(p, dt); continue; }
    if (p.kind === "quake") { updateQuake(p, dt); continue; }
    if (p.kind === "kanye") { updateKanye(p, dt); continue; }
    if (p.kind === "molotov") { updateMolotov(p, dt); continue; }
    if (p.kind === "mosh") { updateMosh(p, dt); continue; }
    if (p.kind === "cut") { p.t += dt; p.life -= dt; continue; }
    if (p.kind === "pigeons") { updatePigeons(p, dt); continue; }
    p.t = (p.t || 0) + dt;
    p.x += p.vx * dt;
    p.life -= dt;
    if (p.kind === "kettle") { p.rot += 9 * dt * p.dir; p.y += Math.sin(p.t * 9) * 40 * dt; }
    if (p.kind === "icecube") {
      p.rot += 7 * dt * p.dir;
      if (Math.random() < dt * 40) F.particles.push({ type: "sq", x: p.x - p.dir * rand(30, 60), y: p.y + rand(-40, 40), vx: -p.dir * rand(40, 120), vy: rand(-30, 60),
        life: rand(0.2, 0.45), max: 0.45, size: pick([3, 4, 6]), color: pick(["#ffffff", "#d8f2ff", "#9fd8ff"]) });
    }
    if (p.kind === "guitar") {
      p.rot += 6 * dt * p.dir;
      if (Math.random() < dt * 30) F.particles.push({ type: "img", key: "fx.wave", x: p.x - p.dir * 40, y: p.y + rand(-10, 10), vx: -p.dir * 60, vy: 0, life: 0.25, max: 0.25, w: 64, h: 32, dir: p.dir });
    }
    if (p.kind === "letter") p.y += (p.vy || 0) * dt;
    if (p.kind === "pie") p.rot += 7 * dt * p.dir;
    if (p.kind === "burger") {
      p.rot += (p.vx / 85) * dt;
      p.y = FLOOR_Y - 46 - Math.abs(Math.sin(p.t * 9)) * 4;   // hitbox: the lower part of the burger
      if ((p.x < WALL_L - 20 && p.vx < 0) || (p.x > WALL_R + 20 && p.vx > 0)) {
        if (p.bounces < 1) {
          p.bounces++;
          p.vx = -p.vx * 0.9;
          p.dir = -p.dir;
          p.hit = false;           // can hit again on the way back
          F.shake = Math.max(F.shake, 8);
          spawnDust(p.x, FLOOR_Y, 1.2);
          playSfx("block");
        } else p.life = 0;
      }
      if (Math.random() < dt * 20) spawnDust(p.x - Math.sign(p.vx) * 60, FLOOR_Y, 0.5);
    }
    if (p.kind === "magic") {
      for (let k = 0; k < 2; k++) F.particles.push({ type: "sq", x: p.x - p.dir * rand(0, 30), y: p.y + rand(-22, 22), vx: -p.dir * rand(40, 140), vy: rand(-60, 20),
        life: rand(0.2, 0.4), max: 0.4, size: pick([4, 6, 8]), color: pick(["#1a0b2e", "#3b1466", "#7b2cff", "#c48bff"]) });
    }
    if (p.kind === "sinyak" && Math.random() < dt * 25) {
      F.particles.push({ type: "sq", x: p.x - p.dir * rand(120, 260), y: p.y + rand(-40, 40), vx: -p.dir * 300, vy: 0, life: 0.2, max: 0.2, size: 4, color: "rgba(255,255,255,0.7)" });
    }
    if (p.kind === "zilla") {
      const owner = F.fighters[p.owner];
      if (p.phase === "grow") { p.vx = 0; p.x = owner.x; if (p.t > 0.45) { p.phase = "charge"; p.vx = p.dir * 1000; playSfx("hitHeavy"); } }
      if (p.phase === "charge") { F.shake = Math.max(F.shake, 6); if (Math.random() < dt * 30) spawnDust(p.x - p.dir * 80, FLOOR_Y, 1);
        p.stepT = (p.stepT || 0) - dt; if (p.stepT <= 0) { p.stepT = 0.32; playSfx("zilla_step"); F.shake = Math.max(F.shake, 12); }
        if (p.x < WALL_L - 60 || p.x > WALL_R + 60 || p.t > 1.6) { p.phase = "shrink"; p.vx = 0; p.shrinkT = 0; } }
      if (p.phase === "shrink") { p.vx = 0; p.shrinkT += dt; if (p.shrinkT > 0.3) { p.life = 0; owner.zillaT = 0; } }
    }
    if (p.kind === "monkey" && Math.random() < dt * 14) spawnDust(p.x - p.dir * 30, FLOOR_Y, 0.4);
    if (p.kind === "cadillac") {
      if (Math.random() < dt * 40) spawnDust(p.x - p.dir * 180, FLOOR_Y, 0.55);
      if (Math.abs(p.x - W / 2) < W / 2 + 100) F.shake = Math.max(F.shake, 3);
    }

    if (!p.hit && liveFight() && p.kind === "letter") {
      const target = F.fighters[1 - p.owner];
      if (overlap(projBox(p), hurtbox(target))) {
        p.hit = true; p.life = 0;
        hitSpark(p.x, p.y, 4);
        if (!p.harmless) {
          const res = applyHit(F.fighters[p.owner], target, { dmg: p.dmg, height: "mid", hitstun: p.last ? 0.6 : 0.22, blockstun: 0.12,
            knock: p.last ? 420 : 40, dir: p.dir, sfx: p.last ? "hitHeavy" : "hitLight", stop: p.last ? 0.1 : 0.015,
            chip: p.last ? 2 : 0.4, noScale: true, launch: p.last ? -420 : 0, sparkX: target.x - p.dir * 20, sparkY: p.y });
          if (p.last && res === "hit") popup(target.x, target.y - 300, "УЧИ АЗБУКУ!", "#e8c35a", 32);
        }
      }
      continue;
    }
    if (!p.hit && liveFight() && !(p.kind === "zilla" && p.phase !== "charge")) {
      const target = F.fighters[1 - p.owner];
      if (overlap(projBox(p), hurtbox(target))) {
        p.hit = true;
        const res = applyHit(F.fighters[p.owner], target, {
          dmg: p.dmg, height: p.height, hitstun: p.kind === "monkey" ? (p.last ? 0.8 : 0.4) : p.pierce || p.kind === "cadillac" ? 0.8 : 0.5,
          blockstun: 0.24, knock: p.kind === "zilla" ? 820 : p.kind === "burger" ? 480 : p.kind === "monkey" ? (p.last ? 420 : 90) : p.kind === "runner" ? 260 : p.kind === "sinyak" ? 640 : p.kind === "cadillac" ? 520 : 300, dir: p.dir,
          sfx: ({ kettle: "special_guf_hit", guitar: "special_noize_hit", cadillac: "special_morgen_hit", sinyak: "special_kreed_hit", burger: "special_face_hit", icecube: "fludd_ice_hit" })[p.kind] || "hitHeavy",
          stop: p.kind === "runner" || p.kind === "monkey" ? 0.06 : p.pierce || p.kind === "cadillac" ? 0.12 : 0.08, chip: p.kind === "zilla" ? 5 : p.kind === "runner" || p.kind === "monkey" ? 1 : 3,
          launch: p.kind === "zilla" ? -900 : p.kind === "burger" ? -620 : p.kind === "sinyak" ? -820 : p.kind === "cadillac" ? -720 : p.kind === "runner" || p.kind === "monkey" ? (p.last ? -600 : 0) : -380,
          sparkX: target.x - p.dir * 20, sparkY: p.kind === "cadillac" ? target.y - 80 : p.y,
        });
        if (p.kind !== "cadillac" && !p.pierce) p.life = 0;
        if (res === "hit" && p.kind === "double") { popup(target.x, target.y - 300, "ДЕЛАЙ КАК Я!", "#e8c050", 34); F.fighters[p.owner].energyT = 3; }
        if (res === "hit" && p.kind === "zilla") { popup(target.x, target.y - 300, "РАСТОПТАЛ!", "#7ccf5a", 36); F.shake = Math.max(F.shake, 16); }
        if (res === "hit" && p.kind === "pie") { popup(target.x, target.y - 300, "ЭЧПОЧМАК!", "#e0a050", 34); F.fighters[p.owner].fedT = 3;
          for (let i = 0; i < 22; i++) F.particles.push({ type: "sq", x: p.x + rand(-50, 50), y: p.y + rand(-40, 40), vx: rand(-260, 260), vy: rand(-420, -60), g: 900,
            life: rand(0.5, 0.9), max: 0.9, size: pick([4, 6, 8]), color: pick(["#e0a050", "#c07a30", "#f6d29a", "#6b3a1f", "#ffffff"]) }); }
        if (p.kind === "icecube") {
          for (let i = 0; i < 36; i++) F.particles.push({ type: "sq", x: p.x + rand(-45, 45), y: p.y + rand(-45, 45), vx: rand(-380, 380) - p.dir * 120, vy: rand(-520, -60), g: 1400,
            life: rand(0.5, 1.0), max: 1.0, size: pick([4, 6, 8, 10]), color: pick(["#eefaff", "#bfe6ff", "#8fd0ff", "#ffffff", "#6fb4e8"]) });
          if (res === "hit") { target.chillT = 1.6; popup(target.x, target.y - 300, "ЗАМОРОЗКА!", "#9fe0ff", 34); }
        }
        if (res === "hit" && p.kind === "burger") popup(target.x, target.y - 300, "ЖРИ!", "#ffb347", 34);
        if (res === "hit" && p.kind === "sinyak") popup(target.x, target.y - 300, "СНЕСЛО!", "#ff9a3d", 34);
        if (res === "hit" && p.kind === "monkey" && p.last) popup(target.x, target.y - 300, "В СЛЭМ!", "#b4c94a", 34);
        if (res === "hit" && p.kind === "runner" && p.last) popup(target.x, target.y - 300, "ТОЛПОЙ!", "#ff5a4a", 34);
      }
    }
  }
  // Kettle vs guitar clash
  const small = F.projectiles.filter((p) => p.kind !== "cadillac" && !p.pierce && p.kind !== "nuke" && p.kind !== "letter" && p.life > 0);
  for (let i = 0; i < small.length; i++) {
    for (let j = i + 1; j < small.length; j++) {
      const a = small[i], b = small[j];
      if (a.owner !== b.owner && overlap(projBox(a), projBox(b))) {
        a.life = b.life = 0;
        hitSpark((a.x + b.x) / 2, (a.y + b.y) / 2, 12);
        playSfx("block");
      }
    }
  }
  F.projectiles = F.projectiles.filter((p) => p.life > 0 && p.x > -900 && p.x < W + 900);
}

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */
function hitSpark(x, y, power) {
  F.particles.push({ type: "spark", x, y, life: 0.22, max: 0.22, rot: rand(0, 6.28), size: 80 + power * 4 });
  const n = 8 + Math.floor(power);
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(180, 520);
    F.particles.push({ type: "sq", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, g: 900,
      life: rand(0.2, 0.45), max: 0.45, size: pick([4, 6, 8]), color: pick(["#fff6b0", "#ffd54a", "#ff9a3d", "#ffffff"]) });
  }
}
function blockSpark(x, y) {
  F.particles.push({ type: "ring", x, y, life: 0.22, max: 0.22, color: "#8fd3ff" });
  for (let i = 0; i < 8; i++) {
    const a = rand(-1, 1) + (Math.random() < 0.5 ? 0 : Math.PI);
    F.particles.push({ type: "sq", x, y, vx: Math.cos(a) * rand(150, 320), vy: Math.sin(a) * rand(150, 320), g: 600,
      life: rand(0.15, 0.3), max: 0.3, size: 5, color: pick(["#8fd3ff", "#ffffff", "#5fa8ff"]) });
  }
}
function spawnDust(x, y, s = 1) {
  if (!F) return;
  F.particles.push({ type: "img", key: "fx.dust", x, y: y - 18 * s, vx: 0, vy: -20, life: 0.35, max: 0.35, w: 140 * s, h: 62 * s, dir: 1 });
}
function popup(x, y, str, color, size) {
  F.popups.push({ x, y, str, color, size, life: 0.9, max: 0.9 });
}

function sayQuote(f) {
  if (!F || F.quote && F.quote.t > 0) return;
  if (!f.data.quotes || !f.data.quotes.length) return;
  F.quote = { slot: f.slot, text: pick(f.data.quotes), t: 2.0 };
  F.quoteCd = rand(10, 16);
  quoteEffect(f, F.quote.text);
}

function updateEffects(dt) {
  for (const p of F.particles) {
    p.life -= dt;
    if (p.vx !== undefined) { p.x += p.vx * dt; p.y += (p.vy || 0) * dt; }
    if (p.g) p.vy += p.g * dt;
  }
  F.particles = F.particles.filter((p) => p.life > 0);
  for (const p of F.popups) { p.life -= dt; p.y -= 70 * dt; }
  F.popups = F.popups.filter((p) => p.life > 0);
  if (F.quote) { F.quote.t -= dt; if (F.quote.t <= 0) F.quote = null; }
}

/* Stage ambience */
function updateAmbient(dt, stageId) {
  if (!F) return;
  const kind = STAGES[stageId].ambient;
  const A = F.ambient;
  const rate = { snow: 40, rain: 160, confetti: 26, motes: 14, leaves: 5, ash: 30, none: 0 }[kind] || 0;
  let n = rate * dt;
  while (n > 0) {
    if (Math.random() < n) {
      if (kind === "snow") A.push({ x: rand(-50, W), y: -10, vx: rand(10, 40), vy: rand(50, 110), s: pick([2, 3, 4]), life: 12, c: "rgba(235,240,255,0.85)", sway: rand(0, 6) });
      if (kind === "rain") A.push({ x: rand(-100, W + 100), y: -20, vx: -160, vy: rand(1100, 1400), s: 1, life: 1.2, c: "rgba(170,190,255,0.35)", rain: true });
      if (kind === "confetti") A.push({ x: rand(0, W), y: -10, vx: rand(-30, 30), vy: rand(80, 160), s: pick([4, 6]), life: 9, c: pick(["#ff6bd6", "#5fd8ff", "#ffd54a", "#8dff7a"]), sway: rand(0, 6), spin: rand(2, 8) });
      if (kind === "leaves") A.push({ x: rand(0, W + 100), y: -10, vx: rand(-50, -10), vy: rand(45, 85), s: pick([5, 6, 7]), life: 14, c: pick(["#e8a13a", "#d9782b", "#f2c94c", "#b9531f"]), sway: rand(0, 6), spin: rand(1.5, 4) });
      if (kind === "ash") A.push(Math.random() < 0.25
        ? { x: rand(400, 1000), y: rand(300, 560), vx: rand(-20, 20), vy: rand(-60, -25), s: pick([2, 3]), life: rand(2, 4), max: 4, c: pick(["rgba(255,170,60,0.9)", "rgba(255,220,120,0.9)"]), glow: true }
        : { x: rand(-50, W + 50), y: -10, vx: rand(-30, 10), vy: rand(30, 70), s: pick([2, 3, 4]), life: 16, c: pick(["rgba(90,80,75,0.8)", "rgba(140,125,115,0.7)", "rgba(60,55,55,0.8)"]), sway: rand(0, 6) });
      if (kind === "motes") A.push({ x: rand(0, W), y: rand(250, 560), vx: rand(-12, 12), vy: rand(-20, -8), s: 3, life: rand(3, 6), max: 6, c: "rgba(255,226,140,0.7)", glow: true });
    }
    n -= 1;
  }
  for (const p of A) {
    p.life -= dt;
    p.x += (p.vx + (p.sway !== undefined ? Math.sin(G.time * 2 + p.sway) * 20 : 0)) * dt;
    p.y += p.vy * dt;
    if (p.rain && p.y > FLOOR_Y + rand(0, 100)) {
      p.life = 0;
      if (Math.random() < 0.3) A.push({ x: p.x, y: p.y, vx: 0, vy: 0, s: 3, life: 0.12, c: "rgba(190,210,255,0.5)", splash: true });
    }
  }
  F.ambient = A.filter((p) => p.life > 0 && p.y < H + 20).slice(-400);
}

function drawAmbient() {
  for (const p of F.ambient) {
    ctx.fillStyle = p.c;
    if (p.rain) { ctx.fillRect(p.x, p.y, 2, 18); continue; }
    if (p.splash) { ctx.fillRect(p.x - 4, p.y, 8, 2); continue; }
    if (p.glow) {
      ctx.globalAlpha = Math.min(1, p.life) * 0.9;
      ctx.fillRect(p.x, p.y, p.s, p.s);
      ctx.globalAlpha = 1;
      continue;
    }
    if (p.spin) {
      const w = Math.abs(Math.sin(G.time * p.spin)) * p.s + 1;
      ctx.fillRect(p.x, p.y, w, p.s);
      continue;
    }
    ctx.fillRect(p.x, p.y, p.s, p.s);
  }
}

/* ------------------------------------------------------------------ */
/* Bot AI                                                              */
/* ------------------------------------------------------------------ */
// Each fighter's bot has its own manner
const BOT_STYLE = {
  korzh: { aggro: 1.35, dash: 0.6 }, morgen: { aggro: 1.25, dash: 2.2 }, oxxxy: { aggro: 1.2 }, noize: { aggro: 1.1 },
  maybe: { jump: 2.5 }, guf: { erratic: true }, slava: { dash: 1.8 }, face: { aggro: 1.1 },
  atl: { keep: 190 }, chip: { keep: 280 }, kreed: {}, ramirez: { aggro: 1.3 }, husky: { aggro: 1.15, jump: 1.3 }, babangida: { aggro: 1.2 }, sqwoz: { keep: 240 }, shilo: { aggro: 1.15 }, krip: { aggro: 1.1 }, tito: { aggro: 1.15, jump: 1.3 }, loki: { keep: 230 }, smoky: { aggro: 1.0 }, fludd: { keep: 220 },
};
function updateBot(bot, opp, dt) {
  const c = bot.ctrl;
  const d = F.diff;
  const ai = bot.ai;
  for (const a of ACTIONS) { c.held[a] = false; c.pressed[a] = false; }
  if (!liveFight() || bot.ko) return;

  const dist = Math.abs(opp.x - bot.x);
  const towards = opp.x > bot.x ? "right" : "left";
  const away = towards === "right" ? "left" : "right";
  if (G.tutorial) {                                   // training dummy: stands still, attacks only in the block lesson
    const step = TUTORIAL_STEPS[G.tutorial.step];
    if (step && (step.id === "block" || step.id === "parry") && G.tutorial.wait <= 0) {
      ai.t -= dt;
      if (ai.t <= 0 && canAct(bot) && dist < 125) { c.pressed.light = true; ai.t = 1.1; }   // plain jab (no forward: that would be a throw)
      else if (dist > 110) c.held[towards] = true;
    }
    return;
  }

  ai.t -= dt;
  ai.reactT -= dt;
  ai.holdBack = Math.max(0, ai.holdBack - dt);
  ai.holdDown = Math.max(0, ai.holdDown - dt);

  // Rolling burger: decide once per pass whether to jump, then time the jump every frame
  for (const p of F.projectiles) {
    if (p.kind !== "burger" || p.owner === bot.slot) continue;
    const coming = Math.sign(bot.x - p.x) === Math.sign(p.vx);
    if (!coming) continue;
    const key = "dodge" + p.bounces;
    if (p[key] === undefined) p[key] = Math.random() < d.dodge;
    const tti = (Math.abs(bot.x - p.x) - p.w / 2) / Math.abs(p.vx);
    if (p[key] && tti > 0.19 && tti < 0.3) { ai.jump = true; ai.jumpToward = Math.sign(p.x - bot.x); }
  }
  // --- Reactions (defence) -------------------------------------------
  if (ai.reactT <= 0) {
    ai.reactT = d.react * rand(0.7, 1.3);
    // Incoming melee
    if (opp.action && opp.action.type !== "special" && dist < 190 && Math.random() < d.block) {
      const mv = opp.action.move;
      if (mv.height === "high") { if (Math.random() < 0.5) ai.holdDown = 0.35; else ai.holdBack = 0.35; }
      else ai.holdDown = 0.4;
    }
    // Incoming projectiles
    for (const p of F.projectiles) {
      if (p.owner === bot.slot) continue;
      if (p.kind === "burger") continue;   // handled every frame below
      if (p.kind === "mosh") {
        if (p.t > MOSH.clash - 0.22 && p.t < MOSH.clash - 0.1 && !p.jumpRolled) { p.jumpRolled = true; if (Math.random() < d.dodge * 0.75) ai.jump = true; }
        continue;
      }
      if (p.kind === "kanye") {
        if (p.phase === "fly" && !p.hit && p.vy > -200 && Math.abs(bot.x - (p.x + p.vx * 0.3)) < 180 && Math.random() < d.block) { ai.holdBack = 0.6; ai.holdDown = 0; }
        continue;
      }
      if (p.kind === "quake") {
        const gap = Math.abs(bot.x - p.x) - p.t * p.speed;
        if (!p.hit && gap > 30 && gap < 190 && Math.random() < d.dodge) ai.jump = true;
        continue;
      }
      if (p.kind === "nuke") {
        if (!p.hit && p.t > 0.5 && Math.abs(bot.x - p.x) < p.w / 2 + 30 && Math.random() < d.dodge) {
          ai.fleeT = 0.7; ai.fleeDir = bot.x > p.x ? (bot.x > WALL_R - 150 ? -1 : 1) : (bot.x < WALL_L + 150 ? 1 : -1);
        }
        continue;
      }
      const comingAt = Math.sign(bot.x - p.x) === Math.sign(p.vx);
      const pd = Math.abs(bot.x - p.x);
      if (!comingAt) continue;
      if (p.kind === "quake") {
        const gap = Math.abs(bot.x - p.x) - p.t * p.speed;
        if (!p.hit && gap > 30 && gap < 190 && Math.random() < d.dodge) ai.jump = true;
        continue;
      }
      if (p.kind === "nuke") {
        if (!p.hit && p.t > 0.5 && Math.abs(bot.x - p.x) < p.w / 2 + 30 && Math.random() < d.dodge) {
          ai.fleeT = 0.7; ai.fleeDir = bot.x > p.x ? (bot.x > WALL_R - 150 ? -1 : 1) : (bot.x < WALL_L + 150 ? 1 : -1);
        }
        continue;
      }
      if (p.kind === "molotov") {
        if (p.phase === "fly" && Math.abs(bot.x - (p.x + p.vx * 0.35)) < 160 && Math.random() < d.dodge) { ai.fleeT = 0.5; ai.fleeDir = bot.x > p.x ? 1 : -1; }
        if (p.phase === "fire" && Math.abs(bot.x - p.x) < p.w / 2 + 40 && Math.random() < d.dodge) { ai.fleeT = 0.5; ai.fleeDir = bot.x > p.x ? (bot.x > WALL_R - 120 ? -1 : 1) : (bot.x < WALL_L + 120 ? 1 : -1); }
        continue;
      }
      if (p.kind === "double") {
        if (Math.sign(bot.x - p.x) === Math.sign(p.vx) && Math.abs(bot.x - p.x) < 450 && Math.random() < d.dodge) { ai.holdDown = 0.5; ai.holdBack = 0; }
        continue;
      }
      if (p.kind === "zilla") {
        if (p.phase !== "shrink" && Math.abs(bot.x - p.x) < 650 && Math.random() < d.block) { ai.holdBack = 0.6; ai.holdDown = 0; }
        continue;
      }
      if (p.kind === "pigeons") {
        const coming = Math.sign(bot.x - p.x) === Math.sign(p.vx);
        if (coming && Math.abs(bot.x - p.x) < 420 && Math.random() < d.dodge) { ai.holdDown = 0.6; ai.holdBack = 0; }
        continue;
      }
      if (p.kind === "monkey") {
        if (pd < 380 && pd > 120 && Math.random() < d.dodge * 0.5) ai.jump = true;
        else if (pd < 500 && Math.random() < d.block) { ai.holdBack = 0.8; ai.holdDown = 0; }
      } else if (p.kind === "runner") {
        if (pd < 600 && Math.random() < d.block + 0.1) { ai.holdBack = 1.0; ai.holdDown = 0; }
      } else if (p.kind === "sinyak") {
        if (pd < 520 && Math.random() < d.dodge) ai.holdDown = 0.6;
      } else if (p.kind === "cadillac") {
        // jump when the car's front edge is close enough
        const front = pd - p.w / 2;
        if (front < 400 && front > 130 && Math.random() < d.dodge * 0.6) ai.jump = true;   // bots don't clear it every time
      } else if (pd < 360 && Math.random() < d.dodge) {
        if (Math.random() < 0.55) ai.holdDown = 0.45; else ai.jump = true;
      }
    }
    // Oxxxy tentacles winding up
    if (opp.action && opp.action.type === "special" && CLOSE_SPECIAL.has(opp.cid) && dist < 450 && Math.random() < d.block) ai.holdBack = 0.5;
  }

  // --- Planning (offence / spacing) -----------------------------------
  if (ai.t <= 0) {
    const st = BOT_STYLE[bot.cid] || {};
    ai.t = d.think * (st.erratic ? rand(0.4, 2.0) : rand(0.7, 1.4));
    ai.move = 0;
    ai.wantAttack = null;
    const lr = (bot.data.moves && bot.data.moves.light && bot.data.moves.light.reach) || 96;
    const range = bot.cid === "oxxxy" ? 110 : Math.max(125, lr + 20);
    const cornered = bot.x < WALL_L + 120 || bot.x > WALL_R - 120;
    if (bot.cid === "korzh" && bot.specialCd <= 0 && dist > 200 && Math.random() < d.special * 0.7) {
      ai.wantAttack = "special";
    } else if (bot.cid === "atl" && bot.specialCd <= 0 && Math.random() < d.special * 0.8) {
      ai.wantAttack = "special";
    } else if (dist > 380 && bot.specialCd <= 0 && Math.random() < d.special * (CLOSE_SPECIAL.has(bot.cid) ? 0.2 : 1)) {
      ai.wantAttack = "special";
    } else if (CLOSE_SPECIAL.has(bot.cid) && dist < 400 && dist > 160 && bot.specialCd <= 0 && Math.random() < d.special) {
      ai.wantAttack = "special";
    } else if (st.keep && dist < st.keep - 60 && !cornered && Math.random() < 0.5) {
      ai.move = -1;                                       // zoners back off to their range
    } else if (dist <= range) {
      if (Math.random() < Math.min(0.95, d.attack * (st.aggro || 1))) ai.wantAttack = Math.random() < 0.6 ? "light" : "heavy";
      else if (Math.random() < 0.4 / (st.aggro || 1)) ai.move = -1;
    } else {
      ai.move = Math.random() < (st.keep && dist < st.keep + 120 ? 0.35 : 0.85) ? 1 : -1;
      if (dist < 360 && Math.random() < d.jumpIn * (st.jump || 1)) ai.jump = true;
    }
  }

  // --- Execute ---------------------------------------------------------
  ai.fleeT = Math.max(0, (ai.fleeT || 0) - dt);
  if (ai.fleeT > 0) { c.held[ai.fleeDir > 0 ? "right" : "left"] = true; return; }
  if (ai.holdDown > 0) c.held.down = true;
  if (ai.holdBack > 0) c.held[away] = true;
  else if (ai.move === 1) c.held[towards] = true;
  else if (ai.move === -1) c.held[away] = true;

  // Chains: once a light hit connects, continue light → heavy (skill depends on difficulty)
  if (bot.action && bot.action.type === "light" && bot.action.connected && !bot.action.chainTried) {
    bot.action.chainTried = true;
    if (Math.random() < d.combo) c.pressed[(bot.action.chainStep || 1) === 1 && Math.random() < 0.7 ? "light" : "heavy"] = true;
  }
  // Dashes: close the gap from far away, backdash out of the opponent's attack
  if (canAct(bot) && bot.onGround && !ai.jump && !F.projectiles.some((q) => q.owner !== bot.slot)) {
    if (dist > 380 && Math.random() < dt * d.jumpIn * 6 * ((BOT_STYLE[bot.cid] || {}).dash || 1)) startDash(bot, towards === "right" ? 1 : -1);
    else if (opp.action && opp.action.type !== "special" && dist < 150 && Math.random() < dt * d.block * 1.5) startDash(bot, towards === "right" ? -1 : 1);
  }

  if (ai.jump) {
    ai.jump = false;
    if (bot.onGround) { c.held.up = true; c.held.down = false; ai.holdDown = 0; }
    if (ai.jumpToward) { c.held.right = ai.jumpToward > 0; c.held.left = ai.jumpToward < 0; }
    ai.jumpToward = 0;
  }

  // Punish a whiffed attack in its recovery
  if (opp.action && opp.action.move && !opp.action.connected && opp.action.t > opp.action.move.startup + (opp.action.move.active || 0) &&
      dist < 150 && canAct(bot) && Math.random() < dt * (2 + d.combo * 8)) {
    c.pressed.heavy = true;
  }
  // Parry on hard: tap back right before an incoming hit
  if (opp.action && opp.action.move && opp.action.type !== "special" && dist < 170 && canAct(bot) &&
      Math.abs(opp.action.t - opp.action.move.startup + 0.06) < 0.03 && Math.random() < d.block * 0.25) {
    c.pressed[away] = true;
  }
  // Super when the meter is full and the opponent is in range
  if ((bot.super || 0) >= 100 && canAct(bot) && bot.onGround && dist < 460 && !opp.ko && !(opp.downT > 0) &&
      Math.random() < dt * (0.5 + d.special * 2)) {
    startSuper(bot);
    return;
  }
  // Throw a turtling opponent
  if (canAct(bot) && bot.onGround && dist < 115 && opp.blocking && opp.onGround && Math.random() < dt * (0.6 + d.combo * 3)) {
    c.held[towards] = true; c.pressed.light = true; ai.wantAttack = null;
  }
  if (ai.wantAttack && canAct(bot)) {
    c.pressed[ai.wantAttack] = true;
    const roll = Math.random();
    if (ai.wantAttack === "heavy" && roll < 0.22) c.held.down = true;                         // low sweep
    else if (ai.wantAttack === "light" && roll < 0.2) c.held.down = true;                     // crouching jab
    if (ai.wantAttack === "light" && Math.random() < d.combo) ai.plan = "chain";
    ai.wantAttack = null;
  }
  // Combo chain: light → heavy / special on hit
  if (ai.plan === "chain" && bot.action && bot.action.type === "light" && bot.action.hitDone) {
    c.pressed[bot.specialCd <= 0 && Math.random() < 0.4 ? "special" : "heavy"] = true;
    ai.plan = null;
  }
  if (!bot.action) ai.plan = ai.plan === "chain" && bot.hitstun <= 0 ? ai.plan : null;

  // Hitting the opponent's air approach (anti-air)
  if (!opp.onGround && dist < 140 && canAct(bot) && Math.random() < d.combo * dt * 10) c.pressed.heavy = true;
}

/* ------------------------------------------------------------------ */
/* Round flow                                                          */
/* ------------------------------------------------------------------ */
function endRound(type, winnerSlot, dir = 1) {
  if (F.phase !== "fight") return;
  if (F.fighters[0].hp < 100) F.hurt0 = true;            // RAP GOD: player 1 never lost a single point
  F.phase = "ko";
  F.phaseT = 0;
  F.endType = type;
  const [a, b] = F.fighters;

  if (type === "time") {
    if (Math.abs(a.hp - b.hp) < 0.5) winnerSlot = -1;
    else winnerSlot = a.hp > b.hp ? 0 : 1;
  }
  F.winner = winnerSlot;

  if (winnerSlot >= 0) {
    const w = F.fighters[winnerSlot];
    const l = F.fighters[1 - winnerSlot];
    F.wins[winnerSlot]++;
    F.perfect = w.hp >= 100;
    w.won = true;
    w.action = null;
    if (type === "ko" && !G.tutorial && F.wins[winnerSlot] >= ROUNDS_TO_WIN) { startFinishHim(w, l); stopMusic(); return; }
    if (type === "ko") {
      l.ko = true;
      l.action = null;
      l.vx = dir * 620;
      l.vy = -900;
      l.onGround = false;
      F.slow = 1.1;
      F.flash = 0.35;
      F.shake = 18;
      playSfx("koHit");
      buzz([80, 50, 160]);
      if (REACT[G.stage]) playSfx(REACT[G.stage]);
      voice(l, "ko");
    } else {
      l.ko = true; // time over: loser slumps down
      playSfx("ko");
    }
    if (Math.random() < 0.6) { F.quote = null; sayQuote(w); }
  } else {
    playSfx("ko");
  }
  stopMusic();
}

function afterRound() {
  const done = F.wins[0] >= ROUNDS_TO_WIN || F.wins[1] >= ROUNDS_TO_WIN || F.round >= MAX_ROUNDS;
  if (done) {
    if (F.wins[0] === F.wins[1]) F.matchWinner = -1;
    else F.matchWinner = F.wins[0] > F.wins[1] ? 0 : 1;
    checkMatchSecrets();
    checkLegend();
    checkRapGod();
    setScreen("end");
    if (F.matchWinner >= 0 && F.fighters[F.matchWinner].cid === "chip") setTimeout(() => playSfx("voice_chip_win"), 500);   // «с тотальной победой»
    G.endLock = 0.9;
    return;
  }
  F.round++;
  startRound();
  startMusic();
}

function updateFight(rawDt) {
  if (G.paused) return;
  G.screenT += rawDt;
  updateAmbient(rawDt, G.stage);
  F.flash = Math.max(0, F.flash - rawDt * 2);
  updateEasterFx(rawDt);
  F.shake *= Math.pow(0.002, rawDt);
  if (F.shake < 0.3) F.shake = 0;

  if (F.hitstop > 0) {
    F.hitstop -= rawDt;
    // keep chain inputs pressed during the freeze frames
    F.fighters.forEach((f, i) => {
      const src = i === 0 ? ctrls[0] : (G.mode === 2 ? ctrls[1] : null);
      if (src && f.action && !f.action.air && (src.pressed.light || src.pressed.heavy))
        f.chainBuf = { key: src.pressed.heavy ? "heavy" : "light", t: 0.25 };
    });
    return;
  }
  if (F.superCut) {
    F.superCut.t += rawDt;
    if (F.superCut.t >= F.superCut.dur) {
      const sf = F.fighters[F.superCut.slot];
      F.superCut = null;
      if (sf.action && sf.action.type === "super") { sf.action.phase = "rush"; sf.action.t = 0; playSfx("whoosh"); }
    }
    return;
  }

  if (F.phase === "fatality") { if (F.fatHold) return; F.phaseT += rawDt; updateFatality(rawDt); updateEffects(rawDt); return; }   // fatHold: test hook (freeze frame)

  let dt = rawDt * GAME_SPEED;
  if (F.slow > 0) { F.slow -= rawDt; dt *= 0.3; }

  F.phaseT += dt;
  const [a, b] = F.fighters;

  if (F.phase === "intro") {
    if (!F.introSfx && F.phaseT > 0.05) { F.introSfx = true; playSfx("roundStart"); }
    if (F.phaseT >= 1.7) { F.phase = "fight"; F.phaseT = 0; }
  } else if (F.phase === "fight") {
    const prevSec = Math.ceil(F.timer);
    F.timer = Math.max(0, F.timer - dt);
    if (Math.ceil(F.timer) !== prevSec && prevSec <= 6 && prevSec > 1) playSfx("uiTimer");   // last seconds tick
    F.stats.time += dt;
    if (F.timer <= 0) endRound("time", -1);
    F.quoteCd -= dt;
    if (F.quoteCd <= 0 && !F.quote) { if (Math.random() < dt * 0.5) sayQuote(pick(F.fighters)); }
  } else if (F.phase === "finish") {
    if (F.phaseT >= FINISH_TIME) finishFall();
  } else if (F.phase === "ko") {
    if (F.phaseT >= (F.fatDone ? 3.2 : 2.8)) { afterRound(); return; }
  }

  // Controllers
  if (G.mode === 2) { copyCtrl(ctrls[0], a.ctrl); copyCtrl(ctrls[1], b.ctrl); }
  else { copyCtrl(ctrls[0], a.ctrl); updateBot(b, a, dt); }
  if (G.botVsBot && G.mode === 1) updateBot(a, b, dt);           // test hook: CPU vs CPU
  if (F.phase === "finish") finishControls();
  if (F.phase !== "fight") { for (const f of F.fighters) { if (F.phase === "finish" && f.slot === F.finish.w) continue; for (const k of ACTIONS) { f.ctrl.held[k] = false; f.ctrl.pressed[k] = false; } } }
  if (F.phase === "finish") {
    const w = F.fighters[F.finish.w];
    if (w.ctrl.pressed.special && FATALITIES[w.cid] && canAct(w) && w.onGround) { startFatality(w, F.fighters[F.finish.l]); return; }
  }

  updateFighter(a, b, dt);
  updateFighter(b, a, dt);
  updatePull(a, dt);
  updatePull(b, dt);
  updateSuper(a, b, dt);
  updateSuper(b, a, dt);
  if (G.tutorial) { updateTutorial(dt); if (!F) return; }

  // Push boxes: grounded fighters can't overlap (you can still jump over).
  if (!a.ko && !b.ko && !(a.noPushT > 0) && !(b.noPushT > 0)) {
    const dx = b.x - a.x;
    const minD = 84;
    if (Math.abs(dx) < minD && Math.abs(a.y - b.y) < 170) {
      const push = (minD - Math.abs(dx)) / 2;
      const s = dx === 0 ? (a.dir === 1 ? 1 : -1) : Math.sign(dx);
      a.x -= s * push;
      b.x += s * push;
      if (a.x < WALL_L) { b.x += WALL_L - a.x; a.x = WALL_L; }
      if (a.x > WALL_R) { b.x -= a.x - WALL_R; a.x = WALL_R; }
      if (b.x < WALL_L) { a.x += WALL_L - b.x; b.x = WALL_L; }
      if (b.x > WALL_R) { a.x -= b.x - WALL_R; b.x = WALL_R; }
    }
  }

  updateProjectiles(dt);
  updateEffects(dt);

  // Double KO check (e.g. projectile trade)
  if (F.phase === "fight" && a.hp <= 0 && b.hp <= 0) endRound("time", -1);
}

function copyCtrl(src, dst) {
  for (const k of ACTIONS) { dst.held[k] = src.held[k]; dst.pressed[k] = src.pressed[k]; }
  dst.dash = src.dash;
}

/* ------------------------------------------------------------------ */
/* Fight rendering                                                     */
/* ------------------------------------------------------------------ */
const hasPose = (cid, p) => !!(SPRITE_META[cid] && SPRITE_META[cid][p]);
function poseName(f) {
  if (f.ko) return f.onGround ? "ko" : (hasPose(f.cid, "fall") ? "fall" : "hurt");
  if (f.downT > 0) {
    if (!f.onGround) return hasPose(f.cid, "fall") ? "fall" : "hurt";
    if (f.downT < 0.22) return hasPose(f.cid, "getup") ? "getup" : "crouch";     // getting back up
    return "ko";
  }
  if (f.won && F.phase === "ko") return "win";
  if (f.dazed && f.onGround) return "hurt";
  if (f.grab) return "hurt";          // caught in a throw
  const foe = F && F.fighters && F.fighters[1 - f.slot];
  const guarding = f.blocking && !f.action && f.hitstun <= 0 && foe && (foe.action || F.projectiles.some((q) => q.owner !== f.slot)) &&
    Math.abs(foe.x - f.x) < 260;
  if ((f.blockstun > 0 || guarding || (f.blockBtn && !f.action && f.hitstun <= 0)) && f.onGround) {
    const p = f.crouch ? "crouch_block" : "block";
    if (hasPose(f.cid, p)) return p;
  }
  if (f.hitstun > 0) return (!f.onGround && (f.hurtK || 0) >= 0.9 && hasPose(f.cid, "fall")) ? "fall" : "hurt";
  if (f.action) {
    if (f.action.type === "special") { if (f.cid === "babangida" && f.action.dashed && hasPose(f.cid, "slash")) return "slash";
      if ((f.cid === "sqwoz" || f.cid === "shilo" || f.cid === "loki") && f.action.spawned && hasPose(f.cid, "throw")) return "throw";
      if (f.cid === "smoky" && f.action.dashed) return "kara_3";
      if (f.cid === "fludd") return f.action.spawned ? "special" : "special_0";
      return "special"; }
    // wind-up frame during the first part of a grounded light / heavy
    const a = f.action, mv = a.move;
    if ((a.type === "light" || a.type === "heavy") && !a.air && !mv.sweep && !mv.noWindup && a.t < mv.startup * 0.9 &&
        SPRITE_META[f.cid] && SPRITE_META[f.cid][a.type + "_0"]) return a.type + "_0";
    if (mv.overhead && a.t < mv.startup * 0.8 && hasPose(f.cid, "overhead_0")) return "overhead_0";
    return mv.frame;
  }
  if (!f.onGround) return "jump";
  if (f.crouch) return "crouch";
  if (Math.abs(f.vx) > 30) return "walk_" + (1 + (Math.floor(f.walkDist / 34) % 4));
  return "idle";
}

function drawFighter(f) {
  if (F.fat) { drawFatFighter(f); return; }
  if (f.cid === "smoky" && f.action && f.action.type === "special" && f.action.dashed && !F.fat) { drawSmokyKarate(f); if (f.action.t < 0.82) return; }
  if (f.zillaT > 0) return;          // he IS the monster right now
  const name = poseName(f);
  let sx = 1, sy = 1, ox = 0, oy = 0, rot = 0;

  if (F.fatT > 0 && f.slot === F.fatSlot) { F.fatT -= 1 / 120; sx *= 1 + 0.38 * Math.min(1, F.fatT); }
  if (F.disco > 0 && (name === "idle" || name.startsWith("walk"))) oy -= Math.abs(Math.sin(G.time * 9 + f.slot)) * 14;
  const heavyK = f.data.weight || 1;
  if (name === "idle") {
    const b = Math.sin(f.anim * 3.2 / heavyK + f.slot);
    sy = 1 + 0.013 * b * heavyK; sx = 1 - 0.006 * b;
    if (f.cid === "guf") { rot = Math.sin(f.anim * 1.7) * 0.035; ox = Math.sin(f.anim * 1.7 + 0.6) * 5; }   // drunken master sways
    if (f.cid === "maybe" || f.cid === "morgen") oy = -Math.abs(Math.sin(f.anim * 4.5)) * 3;             // light on their feet
  } else if (name.startsWith("walk")) {
    const ph = (f.walkDist / 34) * Math.PI * 0.5;
    oy = -Math.abs(Math.sin(ph)) * 4;
    rot = clamp(f.vx / 6000, -0.05, 0.05);                  // lean into the walk
    sy = 1 + 0.015 * Math.cos(ph * 2);
  } else if (name === "jump") {
    // stretch on take-off, tuck at the apex, stretch again falling
    if (f.vy < -300) { sy = 1.07; sx = 0.94; }
    else if (f.vy < 300) { sy = 0.95; sx = 1.04; }
    else { sy = 1.04; sx = 0.97; }
    rot = clamp(f.vx / 3000, -0.12, 0.12) * f.dir;
  } else if (name === "hurt" || name === "fall") {
    // snap back from the hit, then settle — harder hits throw the body further
    const hk = f.hurtK || 1;
    const k = clamp(f.hitstun / 0.45, 0, 1);
    rot = -0.13 * f.dir * k * hk;
    ox = -10 * f.dir * k * hk;
    sx = 1 - 0.04 * k;
    if (!f.onGround && !f.ko && name === "hurt") rot -= 0.12 * f.dir * hk;
    if (f.flash > 0) ox += rand(-4, 4);
    if (f.ko && !f.onGround) rot = -0.25 * f.dir * Math.min(1, F.phaseT * 3);
  } else if (name === "win") {
    sy = 1 + 0.025 * Math.abs(Math.sin(G.time * 5));
  } else if (f.action) {
    // anticipation → strike → follow-through → settle
    const a = f.action;
    const mv = a.move || {};
    const startup = mv.startup !== undefined ? mv.startup : (a.startup || 0);
    const active = mv.active || 0.1;
    const total = a.total || startup + active + 0.2;
    if (a.t < startup) {
      const k = a.t / Math.max(0.01, startup);
      ox = -12 * f.dir * Math.sin(k * Math.PI * 0.5);
      rot = -0.06 * f.dir * k;
      sx = 0.96; sy = 1.02;
    } else if (a.t < startup + active) {
      const k = (a.t - startup) / Math.max(0.01, active);
      ox = (14 - 6 * k) * f.dir;
      rot = 0.05 * f.dir * (1 - k);
      sx = 1.06 - 0.04 * k; sy = 0.97 + 0.02 * k;
    } else {
      const k = clamp((a.t - startup - active) / Math.max(0.01, total - startup - active), 0, 1);
      ox = 8 * f.dir * (1 - k);
      sx = 1 + 0.02 * (1 - k);
    }
  }
  if (f.land > 0) { const k = f.land / 0.12 * (f.data.weight || 1); sy *= 1 - 0.08 * k; sx *= 1 + 0.06 * k; }
  if (f.dazed && f.onGround) { rot = Math.sin(G.time * 2.6) * 0.09; ox = Math.sin(G.time * 2.6 + 0.5) * 10; sx = 1; }
  if (f.bigT > 0) {   // "Алик в ударе": swells up, then shrinks back
    f.bigT -= 1 / 60;
    const k = Math.min(1, Math.min(5 - f.bigT, f.bigT) / 0.35);
    sx *= 1 + 0.3 * k; sy *= 1 + 0.3 * k;
  }
  if (f.swayT > 0) { f.swayT -= 1 / 60; const k = Math.sin((1 - f.swayT / 0.4) * Math.PI); rot = -0.3 * f.dir * k; ox -= 26 * f.dir * k; oy += 10 * k; }
  if (name === "crouch" && f.downT > 0) { const k = f.downT / 0.22; sy *= 0.85 + 0.15 * (1 - k); rot = -0.15 * f.dir * k; }   // rising
  if (f.blockstun > 0 && f.onGround && name !== "block" && name !== "crouch_block") { const k = clamp(f.blockstun / 0.2, 0, 1); rot -= 0.07 * f.dir * k; ox -= 6 * f.dir * k; sx *= 1 - 0.03 * k; }
  if (f.wallT > 0 && (f.x <= WALL_L + 2 || f.x >= WALL_R - 2)) { sx *= 0.86; sy *= 1.06; }               // splat against the wall
  let drawDir = f.dir;
  const am = f.action && f.action.move;
  if (am && f.hitstun <= 0) {
    const at = f.action.t;
    if (am.sweep) { sy *= 0.72; sx *= 1.12; }
    if (am.crouchAtk && am.drawn === false) { sy *= 0.7; sx *= 1.1; }
    if (am.overhead && am.drawn === false) {
      if (at < am.startup) { rot = -0.2 * f.dir * (at / am.startup); oy -= 30 * (at / am.startup); }
      else { rot = 0.18 * f.dir; oy += 6; }
    }
    if (am.airKick && am.drawn === false) rot = 0.35 * f.dir;
    if (am.lift && at >= am.startup * 0.7) { const k = clamp((at - am.startup * 0.7) / (am.startup * 0.3 + am.active), 0, 1); oy -= am.lift * Math.sin(Math.min(1, k * 1.4) * Math.PI); }
    if (am.uppercut && at >= am.startup) { rot = -0.32 * f.dir; oy -= 22; }
    if (am.spin && at < am.startup * 0.8) drawDir = -f.dir;      // back turned before the heel strike
  }

  // Shadow
  const lift = clamp((FLOOR_Y - f.y) / 300, 0, 1);
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${0.38 - lift * 0.22})`;
  ctx.beginPath();
  ctx.ellipse(f.x, FLOOR_Y + 4, (name === "ko" ? 120 : 64) * (1 - lift * 0.4), 11 * (1 - lift * 0.4), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Afterimages
  for (const ai of f.afterimages) {
    drawPose(f.cid, ai.name, ai.x, ai.y, { dir: ai.dir, alpha: (ai.life / 0.16) * 0.35, flash: 0.6, flashColor: f.data.color });
  }

  // Maybe Baby's hair whip grows from behind her head, so it goes under the sprite
  if (f.cid === "maybe" && f.action && f.action.type === "special" && !G.cheats.tea) drawHairWhip(f);

  // Smooth pose changes: the previous frame fades out under the new one
  if (f.poseName !== name) { f.prevPose = { name: f.poseName, x: f.x, y: f.y, dir: f.dir }; f.poseName = name; f.poseT = 0; }
  f.poseT = (f.poseT || 0) + 1 / 60;
  const pp = f.prevPose;
  if (pp && pp.name && f.poseT < 0.09 && name !== "ko" && pp.name !== "ko") {
    drawPose(f.cid, pp.name, f.x + ox * 0.5, f.y + oy, { dir: pp.dir, alpha: 0.55 * (1 - f.poseT / 0.09), tint: fighterTint(f) });
  }
  // Motion smear on the active frames of an attack
  if (f.action && f.action.move && f.action.move.reach && f.hitstun <= 0) {
    const mv = f.action.move, t0 = f.action.t - mv.startup;
    if (t0 >= 0 && t0 < (mv.active || 0.1) + 0.04) {
      const k = clamp(t0 / ((mv.active || 0.1) + 0.04), 0, 1);
      const cy = f.y + (mv.y0 + mv.y1) / 2, r = mv.reach * 0.75;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(255,240,200,${0.45 * (1 - k)})`;
      ctx.lineWidth = 10 * (1 - k) + 2;
      ctx.beginPath();
      const a0 = f.dir > 0 ? -0.9 : Math.PI + 0.9, a1 = f.dir > 0 ? 0.35 : Math.PI - 0.35;
      ctx.arc(f.x + f.dir * 20, cy, r, Math.min(a0, a1), Math.max(a0, a1));
      ctx.stroke();
      ctx.restore();
    }
  }

  // Blocking shield
  const blockingNow = f.blockstun > 0;
  if (blockingNow && f.onGround) {
    const k = clamp(f.blockstun / 0.2, 0, 1);
    const cy = f.y - (f.crouch ? 80 : 140);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(140,210,255,${0.55 * k})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    const a0 = f.dir > 0 ? -0.9 : Math.PI - 0.9;
    ctx.arc(f.x + f.dir * 10, cy, f.crouch ? 70 : 95, a0, a0 + 1.8);
    ctx.stroke();
    ctx.restore();
  }
  drawPose(f.cid, name, f.x + ox, f.y + oy, {
    dir: drawDir, sx, sy, rot, tint: fighterTint(f),
    flash: f.flash > 0 ? 0.7 : (blockingNow ? 0.25 : 0),
    flashColor: blockingNow ? "#8fd3ff" : "#ffffff",
  });

  if (f.dazed && f.onGround) drawDazedStars(f);

  // Noize's guitar swing
  if (am && am.guitar && f.hitstun <= 0 && f.action.t >= am.startup * 0.9) {
    const gim = img("fx.guitar");
    if (gim) {
      // held by the neck: the body swings from overhead down onto the opponent
      const k = clamp(f.action.t / (am.startup + am.active), 0, 1);
      const sw = k < 0.55 ? -100 + k / 0.55 * 20 : -80 + (k - 0.55) / 0.45 * 115;   // degrees: wind-up, then the swing
      const ang = (sw - 135) * Math.PI / 180;
      ctx.save();
      ctx.translate(f.x + f.dir * (k < 0.55 ? 30 : 70), f.y - (k < 0.55 ? 205 : 180));
      ctx.scale(f.dir, 1);
      ctx.rotate(ang);
      const gw = 175, gh = gw * gim.naturalHeight / gim.naturalWidth;
      ctx.drawImage(gim, -0.8 * gw, -0.12 * gh, gw, gh);
      ctx.restore();
    }
  }
  // Super ready aura
  if ((f.super || 0) >= 100 && !f.ko && F.phase === "fight") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.18 + 0.1 * Math.sin(G.time * 8);
    const g2 = ctx.createRadialGradient(f.x, f.y - 120, 10, f.x, f.y - 120, 150);
    g2.addColorStop(0, f.data.color); g2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(f.x - 150, f.y - 270, 300, 300);
    ctx.restore();
  }

  // Player tag during the intro
  if (F.phase === "intro" || (F.phase === "fight" && F.phaseT < 1.2 && F.round === 1)) {
    const tag = f.isBot ? "CPU" : (G.mode === 1 ? "ВЫ" : `${f.slot + 1}P`);
    const col = f.isBot ? "#ff8a8a" : P_COLORS[f.slot];
    const ty = f.y - 270 + Math.sin(G.time * 6) * 4;
    text(tag, f.x, ty, { size: 16, font: FONT_PIX, color: col, align: "center" });
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(f.x - 8, ty + 16);
    ctx.lineTo(f.x + 8, ty + 16);
    ctx.lineTo(f.x, ty + 26);
    ctx.fill();
  }
}

function drawProjectiles() {
  for (const f of F.fighters) {
    const a = f.action;
    if (f.cid === "babangida" && a && a.type === "special" && !a.dashed) {
      ctx.save(); ctx.globalAlpha = 0.45 * Math.min(1, a.t / 0.3); ctx.fillStyle = "#05030a"; ctx.fillRect(-100, -100, W + 200, H + 200); ctx.restore();
      drawFighter(f);   // he stays lit
    }
  }
  if (F.ticker && F.ticker.t < 4) {
    F.ticker.t += 1 / 60;
    const y = H - 120;
    ctx.fillStyle = "rgba(160,0,0,0.9)"; ctx.fillRect(0, y, W, 44);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, y, 150, 44);
    text("СРОЧНО", 75, y + 24, { size: 22, align: "center", color: "#a00000" });
    ctx.save(); ctx.beginPath(); ctx.rect(150, y, W - 150, 44); ctx.clip();
    text(F.ticker.text, W + 40 - F.ticker.t * 420, y + 24, { size: 24, color: "#fff", stroke: "#000", strokeW: 3 });
    ctx.restore();
  }
  for (const p of F.projectiles) {
    if (p.kind === "cadillac") {
      const car = img("fx.cadillac");
      ctx.save();
      ctx.translate(p.x, FLOOR_Y + 14);
      if (p.dir < 0) ctx.scale(-1, 1);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.ellipse(0, -6, 245, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      if (car) ctx.drawImage(car, -295, -205, 590, 205);
      ctx.restore();
      continue;
    }
    if (p.kind === "letter") {
      if (p.delay > 0) continue;
      const a = clamp(p.life / 0.3, 0, 1);
      text(p.ch, p.x, p.y, { size: p.last ? 52 : 40, align: "center", color: p.harmless ? "#fff6c8" : "#ffd54a",
        stroke: "#1a0830", strokeW: 6, alpha: a, shadow: false });
      ctx.fillStyle = `rgba(255,220,120,${0.35 * a})`;
      ctx.fillRect(p.x - p.dir * 50, p.y - 2, 30, 4);
      continue;
    }
    if (p.kind === "burger") {
      const im = img("fx.burger");
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.ellipse(p.x, FLOOR_Y + 4, 90, 10, 0, 0, Math.PI * 2); ctx.fill();
      if (im) {
        ctx.save();
        ctx.translate(Math.round(p.x), Math.round(FLOOR_Y - 72 - Math.abs(Math.sin(p.t * 9)) * 6));
        ctx.rotate(p.rot);
        ctx.drawImage(im, -im.width / 2, -im.height / 2);
        ctx.restore();
      }
      continue;
    }
    if (p.kind === "magic") {
      const pulse = 1 + Math.sin(p.t * 40) * 0.12;
      ctx.save();
      ctx.translate(p.x, p.y);
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46 * pulse);
      g.addColorStop(0, "rgba(230,200,255,0.95)");
      g.addColorStop(0.25, "rgba(150,60,255,0.9)");
      g.addColorStop(0.6, "rgba(40,10,70,0.85)");
      g.addColorStop(1, "rgba(10,0,20,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 46 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0b0412";
      for (let k = 0; k < 5; k++) { const a = p.t * 12 + k * 1.26; ctx.fillRect(Math.cos(a) * 22 - 3, Math.sin(a) * 22 - 3, 6, 6); }
      ctx.restore();
      continue;
    }
    if (p.kind === "nuke") { drawNuke(p); continue; }
    if (p.kind === "quake") { drawQuake(p); continue; }
    if (p.kind === "mosh") { drawMosh(p); continue; }
    if (p.kind === "molotov") {
      if (p.phase === "fire") { drawFirePool(p); continue; }
      const im = img("fx.molotov");
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); if (im) ctx.drawImage(im, -im.width / 2, -im.height / 2); ctx.restore();
      continue;
    }
    if (p.kind === "double") {
      const fr = frameOf("tito", "air_kick");
      if (fr) {
        ctx.save();
        ctx.globalAlpha = 0.8 * Math.min(1, p.life / 0.3);
        ctx.translate(p.x, p.y + 175); if (p.dir < 0) ctx.scale(-1, 1);
        ctx.drawImage(silhouette(fr.image, "#ffd86a"), -fr.ax - 6, -fr.ay - 4, fr.image.width + 12, fr.image.height + 8);
        ctx.drawImage(fr.image, -fr.ax, -fr.ay);
        ctx.restore();
      }
      if (Math.random() < 0.6) F.particles.push({ type: "sq", x: p.x - p.dir * rand(30, 90), y: p.y + rand(-40, 60), vx: -p.dir * 60, vy: rand(-40, 40), life: 0.4, max: 0.4, size: pick([3, 4, 6]), color: pick(["#ffd86a", "#fff6c8", "#ff9ad8"]) });
      continue;
    }
    if (p.kind === "zilla") {
      const im = img("fx.zilla");
      if (!im) continue;
      let g = 1;
      if (p.phase === "grow") g = Math.min(1, p.t / 0.4);
      if (p.phase === "shrink") g = Math.max(0, 1 - p.shrinkT / 0.3);
      const hgt = 470 * (0.35 + 0.65 * g);
      const k = hgt / im.height;
      const bob = p.phase === "charge" ? Math.abs(Math.sin(p.t * 14)) * 10 : 0;
      ctx.save();
      ctx.globalAlpha = p.phase === "shrink" ? g : 1;
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(p.x, FLOOR_Y + 6, 220 * k * im.width / 620 * 1.6, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(p.x, FLOOR_Y + 10 - bob);
      if (p.dir < 0) ctx.scale(-1, 1);
      if (p.phase === "charge") ctx.rotate(0.08);
      ctx.scale(k, k);
      ctx.drawImage(im, -im.width * 0.55, -im.height);
      ctx.restore();
      continue;
    }
    if (p.kind === "pigeons") {
      for (const b of p.birds) drawPigeon(p.x + b.dx + Math.sin(p.t * 7 + b.ph) * 10, p.y + b.dy + Math.cos(p.t * 9 + b.ph) * 8, p.dir, p.t * 26 + b.ph, b.s);
      continue;
    }
    if (p.kind === "pie") {
      const im = img("fx.echpochmak");
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(p.x, FLOOR_Y + 4, 70, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (im) ctx.drawImage(im, -im.width / 2, -im.height / 2);
      ctx.restore();
      if (Math.random() < 0.4) F.particles.push({ type: "sq", x: p.x - p.dir * 60, y: p.y + rand(-30, 30), vx: -p.dir * 60, vy: -40, life: 0.4, max: 0.4, size: 6, color: "rgba(255,255,255,0.5)" });
      continue;
    }
    if (p.kind === "cut") {
      const k = p.t / 0.6, len = 260 * Math.min(1, p.t / 0.08);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-0.35);
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = "#ff2a2a"; ctx.fillRect(-len / 2, -5, len, 10);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(-len / 2, -2, len, 4);
      ctx.restore();
      continue;
    }
    if (p.kind === "kanye") {
      ctx.save();
      if (p.phase === "fly") {
        const im = img("fx.kanye_fly");
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath(); ctx.ellipse(p.x, FLOOR_Y + 4, 70, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.translate(p.x, p.y); if (p.vx < 0) ctx.scale(-1, 1); ctx.rotate(p.rot * (p.vx < 0 ? -1 : 1));
        if (im) ctx.drawImage(im, -im.width / 2, -im.height / 2);
      } else if (p.phase === "lie") {
        const im = img("fx.kanye_lie");
        ctx.translate(p.x, FLOOR_Y + 4); if (p.walkDir === 1 || p.x > W / 2) ctx.scale(-1, 1);
        if (im) ctx.drawImage(im, -im.width / 2, -im.height);
      } else {
        const im = img("fx.kanye_walk");
        ctx.translate(p.x, FLOOR_Y + 2 - Math.abs(Math.sin(p.t * 8)) * 4); if (p.walkDir < 0) ctx.scale(-1, 1);
        ctx.rotate(Math.sin(p.t * 8) * 0.04);
        if (im) ctx.drawImage(im, -im.width / 2, -im.height);
      }
      ctx.restore();
      continue;
    }
    if (p.kind === "monkey") {
      if (p.delay > 0) continue;
      const im = img("fx.monkey");
      // single running frame: gallop bounce + squash/stretch so it reads as a sprint
      const ph = p.t * 15 + p.ph;
      const bob = Math.abs(Math.sin(ph)) * 16;
      const sq = 1 + Math.sin(ph * 2) * 0.06;
      const k = p.last ? 1.12 : 1;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.ellipse(p.x, FLOOR_Y + 4, 80 * k, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(p.x, FLOOR_Y + 2 - bob);
      if (p.dir < 0) ctx.scale(-1, 1);
      ctx.rotate(Math.sin(ph) * 0.07);
      ctx.scale(k / sq, k * sq);
      if (p.shade) ctx.filter = "brightness(0.82)";
      if (im) ctx.drawImage(im, -im.width / 2, -im.height);
      else { ctx.fillStyle = "#3a2216"; ctx.fillRect(-80, -80, 160, 70); }
      ctx.restore();
      continue;
    }
    if (p.kind === "runner") {
      if (p.delay > 0) continue;
      const frames = p.who === "yellow" ? ["fx.kpss_yellow_1"] : [`fx.kpss_${p.who}_1`, `fx.kpss_${p.who}_2`];
      const im = img(frames[Math.floor(p.t * 10) % frames.length]);
      const bob = Math.abs(Math.sin(p.t * 16)) * 6;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.ellipse(p.x, FLOOR_Y + 4, 80, 9, 0, 0, Math.PI * 2); ctx.fill();
      if (im) {
        ctx.save();
        ctx.translate(p.x, FLOOR_Y - bob);
        if (p.dir < 0) ctx.scale(-1, 1);
        ctx.drawImage(im, -im.width / 2, -im.height);
        ctx.restore();
      }
      if (Math.random() < 0.3) spawnDust(p.x - p.dir * 60, FLOOR_Y, 0.5);
      continue;
    }
    if (p.kind === "sinyak") {
      const im = img("fx.sinyak");
      ctx.save();
      ctx.translate(p.x, p.y + Math.sin(p.t * 18) * 3);
      if (p.dir < 0) ctx.scale(-1, 1);
      if (im) ctx.drawImage(im, -im.width / 2 - 60, -im.height / 2 + 10);
      ctx.restore();
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.ellipse(p.x, FLOOR_Y + 4, 160, 10, 0, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    if (p.kind === "icecube") {
      const im = img("fx.icecube");
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (im) ctx.drawImage(im, -54, -52, 108, 104);
      else { ctx.fillStyle = "#9fd8ff"; ctx.fillRect(-48, -46, 96, 92); }
      ctx.restore();
      continue;
    }
    const image = img(p.kind === "kettle" ? "fx.kettle" : "fx.guitar");
    const dw = p.kind === "kettle" ? 118 : 150;
    const dh = p.kind === "kettle" ? 82 : 75;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.dir < 0) ctx.scale(-1, 1);
    ctx.rotate(p.kind === "guitar" ? Math.sin(p.t * 10) * 0.25 : Math.sin(p.t * 14) * 0.3);
    if (image) ctx.drawImage(image, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of F.particles) {
    const t = clamp(p.life / p.max, 0, 1);
    ctx.save();
    ctx.globalAlpha = t;
    if (p.type === "sq") {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    } else if (p.type === "puff") {                         // soft round smoke
      ctx.globalAlpha = t * 0.85;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - t * 0.6), 0, Math.PI * 2); ctx.fill();
    } else if (p.type === "spark") {
      const s = p.size * (1.25 - t * 0.5);
      const sp = img("fx.spark");
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalCompositeOperation = "lighter";
      if (sp) ctx.drawImage(sp, -s / 2, -s / 2, s, s);
    } else if (p.type === "ring") {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4 * t + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 70 * (1 - t) + 20, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.type === "bill") {
      drawBill(p);
    } else if (p.type === "rose") {
      drawRose(p);
    } else if (p.type === "egg") {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      drawEgg(p);
    } else if (p.type === "img") {
      const im = img(p.key);
      if (im) {
        ctx.translate(p.x, p.y);
        if (p.dir < 0) ctx.scale(-1, 1);
        ctx.drawImage(im, -p.w / 2, -p.h / 2, p.w, p.h);
      }
    }
    ctx.restore();
  }
  for (const p of F.popups) {
    const t = clamp(p.life / p.max, 0, 1);
    const pop = 1 + Math.max(0, (t - 0.8) * 2.5);
    text(p.str, p.x, p.y, { size: Math.round(p.size * pop), color: p.color, align: "center", stroke: "#1a0d00", alpha: Math.min(1, t * 2) });
  }
}

function drawStage(stageId, camX) {
  const bg = img("bg." + stageId);
  if (stageId === "train" && bg && img("train.fg")) { drawTrainStage(bg, camX); }
  else if (bg) drawCover(bg, 0, 0, W, H, 1.07, -camX * 0.08, 0);
  else { ctx.fillStyle = "#141421"; ctx.fillRect(0, 0, W, H); }
  if (stageId === "bar") drawBarHost(camX);
  if (stageId === "circus") drawCircusFx(camX);
  if (stageId === "yard") drawYard(camX);
  if (stageId === "fountains") drawFountainsFx();
  if (stageId === "wasteland" && bg) drawWastelandFx(bg, camX);
  if (stageId === "gorgorod" && bg) drawGorgorodFx(bg, camX);
  if (stageId === "mansion" && bg) drawMansionFx(bg, camX);
  if (stageId === "roof" && bg) drawRoofFx(bg, camX);
  if (stageId === "palenka" && bg) drawPalenkaFx(bg, camX);
  if (stageId === "tunnel" && bg) drawTunnelFx(bg, camX);

  const t = G.time;
  if (stageId === "concert") {
    const colors = ["rgba(189,120,255,0.13)", "rgba(110,170,255,0.11)", "rgba(255,216,120,0.09)"];
    [180, W / 2, W - 190].forEach((base, i) => {
      const sway = Math.sin(t * (0.9 + i * 0.18) + i) * 60;
      const g = ctx.createLinearGradient(0, 0, 0, H * 0.85);
      g.addColorStop(0, colors[i]);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(base, 30);
      ctx.lineTo(base + 50, 30);
      ctx.lineTo(base + sway + 240, H * 0.85);
      ctx.lineTo(base + sway - 220, H * 0.85);
      ctx.closePath();
      ctx.fill();
    });
  } else if (stageId === "thailand") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(W * 0.73, 300, 10, W * 0.73, 300, 380);
    g.addColorStop(0, `rgba(255,190,110,${0.16 + Math.sin(t * 0.8) * 0.03})`);
    g.addColorStop(1, "rgba(255,190,110,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  } else if (stageId === "moscow") {
    for (let i = 0; i < 3; i++) {
      const y = 330 + i * 70;
      const drift = Math.sin(t * (0.24 + i * 0.08) + i) * 50;
      const g = ctx.createLinearGradient(0, y, 0, y + 40);
      g.addColorStop(0, "rgba(220,230,240,0)");
      g.addColorStop(0.5, "rgba(220,230,240,0.07)");
      g.addColorStop(1, "rgba(220,230,240,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-80 + drift, y, W + 160, 40);
    }
  } else if (stageId === "londograd") {
    ctx.fillStyle = "rgba(40,50,90,0.12)";
    ctx.fillRect(0, 0, W, H);
  }

  // Ground shade + vignette for readability
  const fg = ctx.createLinearGradient(0, FLOOR_Y - 40, 0, H);
  fg.addColorStop(0, "rgba(0,0,0,0)");
  fg.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = fg;
  ctx.fillRect(0, FLOOR_Y - 40, W, H - FLOOR_Y + 40);
}

function drawVignette() {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawCadillacWarning() {
  for (const f of F.fighters) {
    if (!warnTime(f)) continue;
    const fromLeft = f.dir === 1;
    const duck = f.cid === "kreed";
    const x = fromLeft ? 70 : W - 70;
    const blink = Math.floor(G.time * 10) % 2 === 0;
    if (!blink) continue;
    ctx.save();
    ctx.fillStyle = "rgba(255,40,40,0.85)";
    ctx.beginPath();
    const y = duck ? FLOOR_Y - 190 : FLOOR_Y - 70;
    ctx.moveTo(x, y - 46);
    ctx.lineTo(x + 46, y + 34);
    ctx.lineTo(x - 46, y + 34);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    text("!", x, y + 6, { size: 44, color: "#fff", align: "center", shadow: false });
    text(duck ? "ПРИГНИСЬ!" : "ПРЫГАЙ!", x + (fromLeft ? 60 : -60), y - 60, { size: 22, color: "#ffd54a", align: fromLeft ? "left" : "right", stroke: "#000" });
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* ДОБЕЙ ЕГО! / ФАТАЛИТИ                                               */
/* ------------------------------------------------------------------ */
// The match-deciding KO leaves the loser dazed for a few seconds: a plain hit = victory, the special = fatality.
const FINISH_TIME = 5;
const LOLLI_HIT = 1.05;
const TV_CRACK = 1.45;     // Noize: the TV on his head shows his own face, then the screen bursts   // Fludd's lollipop lands
const FATALITIES = {
  guf:    { kind: "ice",   caption: "АЙС БЭЙБИ",              dur: 3.4, titleAt: 1.9 },
  noize:  { kind: "tv",    caption: "Я РОК-ЗВЕЗДА, ИДИТЕ НА",            dur: 3.3, titleAt: 2.4 },
  oxxxy:  { kind: "stomp", caption: "СОПЕРНИК ПОД ПОДОШВОЙ",  dur: 3.6, titleAt: 2.0 },
  morgen: { kind: "burn",  caption: "ЛЕГЕНДАРНАЯ ПЫЛЬ",       dur: 3.9, titleAt: 2.7 },
  maybe:  { kind: "dora",  caption: "ДОРА ДУРА!",               dur: 3.6, titleAt: 2.0 },
  kreed:  { kind: "rose",  caption: "", title: "ХОЛОСТЯЛИТИ", dur: 3.8, titleAt: 2.5 },
  slava:  { kind: "hearse", caption: "КАТАФАЛК",     dur: 4.0, titleAt: 2.4 },
  atl:    { kind: "stork", caption: "АИСТ МАРАБУ",                 dur: 4.8, titleAt: 3.3 },
  loki:   { kind: "quit",  caption: "", title: "RAGE QUIT",   dur: 3.4, titleAt: 1.7 },
  korzh:  { kind: "car",   caption: "МОТЫЛЁК",                dur: 4.0, titleAt: 2.6 },
  chip:   { kind: "tea",   caption: "Я ЛЕГЕНДА",                dur: 4.2, titleAt: 2.4 },
  husky:  { kind: "flies", caption: "МИР МУХ",                dur: 4.0, titleAt: 2.5 },
  babangida: { kind: "elements", caption: "ПЯТЬ СТИХИЙ РОЖДАЮТ ВО МНЕ СТИХИ",      dur: 6.6, titleAt: 5.2 },
  sqwoz:  { kind: "wolf",  caption: "АУФ",                    dur: 3.8, titleAt: 2.2 },
  shilo:  { kind: "lake",  caption: "ЗДРАСЬТЕ-МОРДАСТИ",                 dur: 4.2, titleAt: 2.7 },
  krip:   { kind: "fox",   caption: "УПОРОТЫЙ ЛИС",           dur: 4.0, titleAt: 2.6 },
  tito:   { kind: "crowd", caption: "ПИПЛ ХАВАЕТ",            dur: 4.4, titleAt: 2.9 },
  smoky:  { kind: "smoke", caption: "ВРЕМЯ ТИГРА",     dur: 3.8, titleAt: 2.5 },
  fludd:  { kind: "lollipop", caption: "", title: "ФЛАДАЛИТИ", dur: 3.9, titleAt: 2.3 },
  ramirez: { kind: "acid", caption: "ПСЫ НЕ ЛЮБЯТ ТОКСИН",                 dur: 4.0, titleAt: 2.6 },
  face:   { kind: "laser", caption: "ДЕЛАЮ ВСЁ, ЧТО Я ХОЧУ!",                 dur: 4.3, titleAt: 2.9 },
};

function startFinishHim(w, l) {
  F.phase = "finish"; F.phaseT = 0;
  F.finish = { w: w.slot, l: l.slot, botFat: null };
  w.won = false;                       // still fighting for a moment
  l.dazed = true; l.hp = 0; l.action = null; l.super = 0;
  l.hitstun = Math.min(l.hitstun, 0.3); l.vx *= 0.3; l.grab = null;
  F.slow = 0.6; F.flash = 0.3; F.shake = 14;
  playSfx("koHit"); buzz([60, 40, 120]);
  voice(l, "hurt");
  F.finishSfx = [playSfx("finish_heartbeat"), playSfx("dazed_birds")];
  setTimeout(() => { if (F && F.phase === "finish") playSfx("voice_finish_him"); }, 350);
}
function stopFinishSfx() { for (const h of F.finishSfx || []) if (h) h.stop(); F.finishSfx = null; }

// bot winner: sometimes finishes with the fatality, otherwise just hits
function finishControls() {
  const w = F.fighters[F.finish.w];
  if (!(w.isBot || G.botVsBot)) return;
  if (F.finish.botFat === null) F.finish.botFat = !!FATALITIES[w.cid] && Math.random() < 0.5;
  if (!F.finish.botFat) return;
  for (const k of ACTIONS) { w.ctrl.held[k] = false; w.ctrl.pressed[k] = false; }
  if (F.phaseT > 1.1) w.ctrl.pressed.special = true;
}

// a hit landed: the loser flies like a normal KO
function finishKO(l, dir) {
  stopFinishSfx();
  const w = F.fighters[1 - l.slot];
  l.dazed = false; l.ko = true; l.action = null;
  l.vx = dir * 620; l.vy = -900; l.onGround = false;
  w.won = true;
  F.phase = "ko"; F.phaseT = 0; F.endType = "ko";
  F.slow = 1.1; F.flash = 0.35; F.shake = 18;
  hitSpark(l.x, l.y - 150, 12);
  playSfx("koHit"); buzz([80, 50, 160]);
  if (REACT[G.stage]) playSfx(REACT[G.stage]);
  voice(l, "ko");
  if (Math.random() < 0.6) { F.quote = null; sayQuote(w); }
}

// time ran out: he just collapses
function finishFall() {
  stopFinishSfx();
  const l = F.fighters[F.finish.l], w = F.fighters[F.finish.w];
  l.dazed = false; l.ko = true; l.action = null;
  w.won = true;
  F.phase = "ko"; F.phaseT = 0; F.endType = "ko";
  playSfx("ko");
}

function startFatality(w, l) {
  stopFinishSfx();
  const fd = FATALITIES[w.cid];
  const dir = l.x >= w.x ? 1 : -1;
  const gap = { stomp: 300, burn: 250, tv: 120, rose: 150, dora: 380, hearse: 260, stork: 240, quit: 260,
    car: 220, tea: 200, acid: 150, laser: 300, smoke: 200, flies: 260, elements: 380, wolf: 300, lake: 280, fox: 300, crowd: 300, lollipop: 300 }[fd.kind] || 170;
  const c = clamp((w.x + l.x) / 2, WALL_L + gap / 2 + 40, WALL_R - gap / 2 - 40);
  for (const f of [w, l]) {
    f.action = null; f.vx = 0; f.vy = 0; f.y = FLOOR_Y; f.onGround = true; f.hitstun = 0; f.blockstun = 0;
    f.downT = 0; f.crouch = false; f.grab = null; f.zillaT = 0; f.dashT = 0;
  }
  w.x = c - dir * gap / 2; l.x = c + dir * gap / 2;
  w.dir = dir; l.dir = -dir;
  l.dazed = false; l.ko = true; l.hp = 0;
  w.won = true;
  F.projectiles = [];
  F.phase = "fatality"; F.phaseT = 0; F.endType = "ko";
  F.fat = { kind: fd.kind, caption: fd.caption, title: fd.title || "ФАТАЛИТИ", dur: fd.dur, titleAt: fd.titleAt, t: 0, w: w.slot, l: l.slot, dir, x0: w.x, ev: {}, chunks: null };
  if (fd.kind === "flies") F.fat.flies = Array.from({ length: 170 }, () => ({ a: rand(0, 6.28), r: rand(0.3, 1), sp: rand(3, 9), ph: rand(0, 6.28), h: rand(0, 1), d: rand(0.7, 1.3) }));
  if (fd.kind === "crowd") {
    const pool = Object.keys(CHARS).filter((c) => c !== w.cid && c !== l.cid && hasPose(c, "walk_1"));
    F.fat.mob = Array.from({ length: 14 }, (_, i) => ({ cid: pick(pool), side: i % 2 ? 1 : -1, slot: rand(40, 150), d: rand(0, 0.3), sc: rand(0.88, 1.04), ph: rand(0, 4) }));
  }
  F.slow = 0; F.flash = 0.5; F.shake = 10;
  F.stats.fatality = (F.stats.fatality || 0) + 1;
  if (!w.isBot && !G.botVsBot) {
    for (const sd of SECRETS) if (sd.fat === w.cid) unlockSecret(sd.id);
    const done = new Set(store.get("fat_done", [])); done.add(w.cid); store.set("fat_done", [...done]);
    if (Object.keys(FATALITIES).every((c) => done.has(c))) unlockSecret("a_collector");
  }
  playSfx("superStart");
}

function fatClock() { return F.fat ? F.fat.t : 0; }

function updateFatality(dt) {
  const fat = F.fat;
  fat.t += dt;
  const t = fat.t, w = F.fighters[fat.w], l = F.fighters[fat.l], dir = fat.dir;
  const once = (k, at, fn) => { if (!fat.ev[k] && t >= at) { fat.ev[k] = true; fn(); } };
  const shake0 = F.shake;
  const head = (f) => { const fr = frameOf(f.cid, "hurt"); return f.y - (fr ? fr.ay : 230); };
  once("title", fat.titleAt, () => {
    playSfx("fatality_sting"); F.shake = Math.max(F.shake, 8);
    const vk = fat.kind === "rose" ? "voice_holostyality" : fat.kind === "quit" ? "voice_ragequit" : fat.kind === "lollipop" ? "voice_fladality" : "voice_fatality";
    playSfx(sfxPools[vk] ? vk : "voice_fatality");          // own word for Egor / Loki when recorded
  });

  if (fat.kind === "ice") {
    once("blow", 0.1, () => playSfx("special_guf"));
    if (t > 0.15 && t < 0.85) for (let i = 0; i < 3; i++) F.particles.push({ type: "sq", x: w.x + dir * rand(70, 100), y: w.y - rand(185, 215),
      vx: dir * rand(500, 800), vy: rand(-60, 60), life: Math.abs(l.x - w.x) / 650, max: 0.5, size: pick([4, 6, 8]), color: pick(["#ffffff", "#d8f2ff", "#9fd8ff"]) });
    once("frost", 0.3, () => playSfx("fat_freeze"));
    once("freeze", 0.75, () => { F.flash = 0.25; });
    once("kick", 1.5, () => {
      playSfx("hitKick"); playSfx("fat_ice_shatter"); F.shake = 26; F.flash = 0.4; buzz([60, 30, 200]);
      const top = head(l);
      for (let i = 0; i < 110; i++) F.particles.push({ type: "sq", x: l.x + rand(-70, 70), y: rand(top, l.y), vx: rand(-420, 420) + dir * 260, vy: rand(-820, -120), g: 1500,
        life: rand(0.8, 1.6), max: 1.6, size: pick([4, 6, 8, 10, 12]), color: pick(["#eefaff", "#bfe6ff", "#8fd0ff", "#ffffff", "#6fb4e8"]) });
      fat.chunks = Array.from({ length: 9 }, () => ({ dx: rand(-120, 120) + dir * 40, s: rand(10, 24), r: rand(0, 3) }));
    });
  } else if (fat.kind === "lollipop") {
    once("lift", 0.2, () => playSfx("whoosh"));
    once("swing", 0.92, () => playSfx("whooshHeavy"));
    once("smash", LOLLI_HIT, () => {
      playSfx("fat_candy_smash"); F.shake = 28; F.flash = 0.45; buzz([60, 30, 220]);
      const fr = frameOf(l.cid, "hurt"), vd = l.dir;
      fat.pieces = [];
      if (fr) {
        const cols = 5, rows = 7, tw = Math.ceil(fr.image.width / cols), th = Math.ceil(fr.image.height / rows);
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const sx = c * tw, sy = r * th, lx = sx + tw / 2 - fr.ax, ly = sy + th / 2 - fr.ay;
          const up = 1 - r / rows;
          fat.pieces.push({ im: fr.image, sx, sy, sw: tw, sh: th, vd, x: l.x + vd * lx, y: l.y + ly,
            vx: dir * rand(250, 700) + vd * lx * 3, vy: -rand(300, 900) * (0.5 + up), r: 0, vr: rand(-9, 9) });
        }
      }
      const top = head(l);
      for (let i = 0; i < 90; i++) F.particles.push({ type: "sq", x: l.x + rand(-60, 60), y: rand(top, l.y), vx: rand(-380, 380) + dir * 300, vy: rand(-800, -100), g: 1500,
        life: rand(0.8, 1.6), max: 1.6, size: pick([4, 6, 8, 10]), color: pick(["#ff5fa2", "#ffd23a", "#3aa8ff", "#ffffff", "#ff3b5c"]) });
      hitSpark(l.x, top + 40, 16);
    });
    once("plant", 1.75, () => { playSfx("landHeavy"); F.shake = Math.max(F.shake, 10); spawnDust(l.x, FLOOR_Y, 1.4); });
    for (const pc of fat.pieces || []) {
      pc.vy += 2200 * dt; pc.x += pc.vx * dt; pc.y += pc.vy * dt; pc.r += pc.vr * dt;
      const fl = FLOOR_Y - pc.sh * 0.3;
      if (pc.y > fl) { pc.y = fl; pc.vy *= -0.3; pc.vx *= 0.55; pc.vr *= 0.5; if (Math.abs(pc.vy) < 60) pc.vy = 0; }
    }
  } else if (fat.kind === "tv") {
    once("lift", 0.05, () => playSfx("whoosh"));
    once("swing", 0.6, () => playSfx("whooshHeavy"));
    once("smash", 0.82, () => {
      playSfx("fat_tv_smash"); playSfx("hitHeavy"); F.shake = 24; F.flash = 0.35; buzz([60, 30, 180]);
      hitSpark(l.x, head(l) + 30, 14);
      for (let i = 0; i < 40; i++) F.particles.push({ type: "sq", x: l.x + rand(-50, 50), y: head(l) + rand(0, 70), vx: rand(-380, 380), vy: rand(-600, -100), g: 1400,
        life: rand(0.5, 1.1), max: 1.1, size: pick([3, 4, 6]), color: pick(["#dfe8ee", "#a9c0cc", "#ffffff", "#ffe27a"]) });
    });
    once("crack", TV_CRACK, () => {                          // the broadcast ends: the screen bursts
      playSfx("fat_tv_smash"); playSfx("fat_ice_shatter"); F.shake = 20; F.flash = 0.25; buzz([40, 30, 120]);
      for (let i = 0; i < 46; i++) F.particles.push({ type: "sq", x: l.x + rand(-40, 40), y: head(l) + rand(10, 60), vx: rand(-420, 420), vy: rand(-560, -60), g: 1500,
        life: rand(0.5, 1.1), max: 1.1, size: pick([3, 4, 6]), color: pick(["#dff4ff", "#9fd8ff", "#ffffff", "#7fb4d8"]) });
      hitSpark(l.x, head(l) + 40, 12);
    });
    if (t > TV_CRACK && t < 2.0 && Math.random() < dt * 6) hitSpark(l.x + rand(-40, 40), head(l) + rand(10, 70), 2);
    once("fall", 2.35, () => { playSfx("bodyfall"); playSfx("landHeavy"); F.shake = 16; spawnDust(l.x + dir * 120, FLOOR_Y, 1.6); });
  } else if (fat.kind === "stomp") {
    // the opponent shrinks into an 8-bit platformer enemy, Oxxxy jumps on his head
    once("poof", 0.2, () => { playSfx("superReady"); F.flash = 0.35;
      for (let i = 0; i < 24; i++) F.particles.push({ type: "puff", x: l.x + rand(-60, 60), y: l.y - rand(20, 220), vx: rand(-160, 160), vy: rand(-160, 40), life: rand(0.4, 0.8), max: 0.8, size: pick([10, 14, 18]), color: pick(["rgba(255,255,255,0.8)", "rgba(255,230,150,0.7)"]) });
      popup(l.x, l.y - 260, "8-BIT!", "#ffe27a", 34); });
    once("jump", 0.75, () => { playSfx("jump"); playSfx("whooshHeavy"); spawnDust(fat.x0, FLOOR_Y, 1.2); });
    once("land", 1.3, () => {
      playSfx("fat_stomp"); playSfx("money"); F.shake = 24; F.flash = 0.2; buzz([90, 40, 220]);
      popup(l.x, FLOOR_Y - 190, "+100", "#ffffff", 34);
      fat.coin = { t: 0 };
      spawnDust(l.x - 70, FLOOR_Y, 2); spawnDust(l.x + 70, FLOOR_Y, 2);
      for (let i = 0; i < 40; i++) F.particles.push({ type: "sq", x: l.x + rand(-110, 110), y: FLOOR_Y - rand(0, 20), vx: rand(-500, 500), vy: rand(-500, -120), g: 1500,
        life: rand(0.4, 0.9), max: 0.9, size: pick([4, 6, 8]), color: pick(["#8a7a6a", "#b5a48f", "#5a4c40", "#ffffff"]) });
    });
    if (fat.coin) fat.coin.t += dt;
    if (t > 1.6 && t < 2.6 && Math.random() < dt * 8) F.particles.push({ type: "sq", x: l.x + rand(-120, 120), y: FLOOR_Y - 4, vx: rand(-200, 200), vy: rand(-200, -60), g: 900,
      life: 0.5, max: 0.5, size: pick([4, 6]), color: pick(["#8a7a6a", "#b5a48f"]) });
    once("grind", 1.65, () => playSfx("sweep"));
  } else if (fat.kind === "burn") {
    once("snap", 0.35, () => playSfx("special_morgen"));
    once("ignite", 0.55, () => { playSfx("fat_burn"); F.flash = 0.35; F.shake = 14; });
    if (t > 0.6 && t < 2.6 && Math.random() < dt * 30) F.particles.push({ type: "sq", x: l.x + rand(-60, 60), y: l.y - rand(20, 240), vx: rand(-40, 40), vy: rand(-260, -120),
      life: 0.6, max: 0.6, size: pick([3, 4, 6]), color: pick(["#ffb030", "#ffe080", "#ff6a20", "rgba(50,40,36,0.8)"]) });
    if (t > 1.7 && t < 2.6) for (let i = 0; i < 4; i++) F.particles.push({ type: "sq", x: l.x + rand(-55, 55), y: l.y - rand(0, 230) * (1 - (t - 1.7) / 0.9), vx: rand(-90, 90), vy: rand(-140, 60), g: 120,
      life: rand(0.8, 1.6), max: 1.6, size: pick([3, 4, 6]), color: pick(["#3a3430", "#5c5550", "#1c1816", "#8a827c"]) });
    once("dust", 1.75, () => playSfx("fat_dust"));
  } else if (fat.kind === "dora") {
    once("run", 0.05, () => playSfx("dash"));
    once("swing", 0.85, () => playSfx("whooshHeavy"));
    once("hit", 1.05, () => {
      playSfx("fat_guitar_smash"); playSfx("hitCrit"); F.shake = 26; F.flash = 0.35; buzz([60, 30, 200]);
      hitSpark(l.x - dir * 20, head(l) + 40, 14);
    });
  } else if (fat.kind === "rose") {
    once("give", 0.45, () => playSfx("special_kreed"));
    once("love", 0.8, () => playSfx("fat_rose_swoon"));
    if (t > 0.9 && t < 2.6 && Math.random() < dt * 14) (fat.hearts = fat.hearts || []).push({ x: l.x + rand(-60, 60), y: head(l) + rand(0, 60), vy: rand(-90, -50), t: 0, s: rand(16, 28) });
    once("swoon", 2.25, () => { playSfx("bodyfall"); F.shake = 8; for (let i = 0; i < 16; i++) (fat.hearts = fat.hearts || []).push({ x: l.x + dir * 110 + rand(-90, 90), y: FLOOR_Y - rand(10, 80), vy: rand(-160, -60), t: 0, s: rand(14, 30) }); });
    if (fat.hearts) for (const h of fat.hearts) { h.t += dt; h.y += h.vy * dt; }
  } else if (fat.kind === "hearse") {
    once("arrive", 0.0, () => playSfx("dash"));
    once("door", 0.75, () => playSfx("fat_car_door"));
    once("go", 0.95, () => playSfx("fat_hearse_engine"));
    once("hit", 1.35, () => {
      playSfx("special_morgen_hit"); playSfx("hitCrit"); F.shake = 28; F.flash = 0.35; buzz([80, 40, 220]);
      hitSpark(l.x, l.y - 120, 14);
    });
    once("brake", 1.75, () => playSfx("sweep"));
    once("out", 2.05, () => playSfx("fat_car_door"));
  } else if (fat.kind === "stork") {
    once("caw", 0.1, () => playSfx("fat_stork"));
    once("grab", 1.1, () => { playSfx("throw"); F.shake = 10; for (let i = 0; i < 18; i++) F.particles.push({ type: "sq", x: l.x + rand(-60, 60), y: head(l) + rand(-40, 30), vx: rand(-160, 160), vy: rand(-120, 80), g: 200, life: rand(0.8, 1.5), max: 1.5, size: pick([4, 6]), color: pick(["#f2f0ea", "#9aa0a6", "#3b3f45"]) }); });
    if (t > 1.1 && t < 2.6 && Math.random() < dt * 6) F.particles.push({ type: "sq", x: l.x + rand(-40, 40), y: storkPos(fat, t).y + rand(-20, 60), vx: rand(-60, 60), vy: rand(20, 80), g: 60, life: 1.4, max: 1.4, size: pick([4, 6]), color: pick(["#f2f0ea", "#9aa0a6"]) });
  } else if (fat.kind === "quit") {
    once("glitch", 0.5, () => playSfx("fat_glitch"));
    once("gone", 1.15, () => {
      playSfx("uiBack"); F.flash = 0.2;
      const top = head(l);
      for (let i = 0; i < 70; i++) F.particles.push({ type: "sq", x: l.x + rand(-60, 60), y: rand(top, l.y), vx: rand(-60, 60), vy: rand(-60, 60), life: rand(0.3, 0.8), max: 0.8, size: pick([6, 8, 10]), color: pick(["#ff2bd6", "#20f0ff", "#ffffff", "#7a7a7a"]) });
    });
    once("notice", 1.3, () => playSfx("uiPick"));
  } else if (fat.kind === "smoke") {
    once("exhale", 0.3, () => playSfx("whooshHeavy"));
    once("swirl", 0.9, () => playSfx("fat_dust"));
    if (t > 0.35 && t < 2.6) for (let k = 0; k < 4; k++) {
      const a2 = rand(0, 6.28), r2 = rand(30, 110);
      F.particles.push({ type: "puff", x: l.x + Math.cos(a2) * r2, y: l.y - 120 + Math.sin(a2) * r2 * 1.3, vx: -Math.sin(a2) * 140, vy: Math.cos(a2) * 140 - 60,
        life: rand(0.6, 1.2), max: 1.2, size: pick([10, 12, 14, 16]), color: pick(["rgba(215,220,235,0.55)", "rgba(175,185,205,0.5)", "rgba(130,140,160,0.45)"]) });
    }
    once("gone", 1.9, () => { F.shake = 6; for (let k = 0; k < 60; k++) F.particles.push({ type: "puff", x: l.x + rand(-60, 60), y: l.y - rand(0, 240), vx: rand(-60, 60), vy: rand(-220, -60), life: rand(1, 1.8), max: 1.8, size: pick([10, 14, 18]), color: pick(["rgba(215,220,235,0.5)", "rgba(170,180,200,0.45)"]) }); });
  } else if (fat.kind === "laser") {
    once("off", 0.3, () => playSfx("whoosh"));
    once("glow", 0.65, () => playSfx("superStart"));
    once("fire", 0.9, () => { playSfx("fat_laser"); F.shake = 14; F.flash = 0.2; });
    once("fire2", 1.3, () => playSfx("fat_burn"));
    if (t > 0.9 && t < 2.0) {
      F.shake = Math.max(F.shake, 5);
      const hx = l.x - dir * 10 + Math.sin(t * 7) * 18, hy = head(l) + 60 + Math.sin(t * 5) * 30;
      for (let k = 0; k < 2; k++) F.particles.push({ type: "sq", x: hx, y: hy, vx: rand(-260, 260) - dir * 120, vy: rand(-380, 60), g: 900, life: rand(0.2, 0.45), max: 0.45, size: pick([3, 4, 6]), color: pick(["#ffffff", "#ff4a3a", "#ffb030", "#ffe080"]) });
    }
    if (t > 1.9 && t < 2.7) for (let k = 0; k < 4; k++) F.particles.push({ type: "sq", x: l.x + rand(-55, 55), y: l.y - rand(0, 230) * (1 - (t - 1.9) / 0.8), vx: rand(-90, 90), vy: rand(-140, 60), g: 120, life: rand(0.8, 1.6), max: 1.6, size: pick([3, 4, 6]), color: pick(["#3a3430", "#5c5550", "#1c1816", "#8a827c"]) });
    once("ash", 1.95, () => playSfx("fat_dust"));
    once("back", 2.55, () => playSfx("land"));
  } else if (fat.kind === "acid") {
    once("lift", 0.05, () => playSfx("whoosh"));
    once("swing", 0.55, () => playSfx("whooshHeavy"));
    once("smash", 0.7, () => {
      playSfx("fat_bottle_smash"); playSfx("hitHeavy"); F.shake = 22; F.flash = 0.3; buzz([60, 30, 180]); voice(l, "hurt");
      const hy = head(l) + 20;
      for (let i = 0; i < 26; i++) F.particles.push({ type: "sq", x: l.x + rand(-30, 30), y: hy + rand(-10, 20), vx: rand(-420, 420), vy: rand(-620, -120), g: 1500, life: rand(0.5, 1), max: 1, size: pick([3, 4, 6]), color: pick(["#d8ffd0", "#ffffff", "#9ad890"]) });
      for (let i = 0; i < 50; i++) F.particles.push({ type: "sq", x: l.x + rand(-40, 40), y: hy + rand(-10, 30), vx: rand(-360, 360), vy: rand(-520, -60), g: 1300, life: rand(0.6, 1.2), max: 1.2, size: pick([4, 6, 8, 10]), color: pick(ACID_COLS) });
    });
    if (t > 0.75 && t < 2.6) {
      if (Math.random() < dt * 26) F.particles.push({ type: "sq", x: l.x + rand(-50, 50), y: l.y - rand(0, 220) * (1 - clamp((t - 1.2) / 1.2, 0, 1)), vx: rand(-20, 20), vy: rand(-140, -60), life: 0.7, max: 0.7, size: pick([4, 6, 8]), color: pick(["rgba(180,255,140,0.7)", "rgba(200,220,200,0.5)", "#7dff3a"]) });
      if (Math.random() < dt * 14) F.particles.push({ type: "sq", x: l.x + rand(-45, 45), y: head(l) + rand(20, 120), vx: 0, vy: rand(120, 260), g: 600, life: 0.5, max: 0.5, size: pick([4, 6]), color: pick(ACID_COLS) });
    }
    once("melt", 1.15, () => playSfx("fat_bubbles"));
    once("plop", 2.35, () => { playSfx("fat_bubbles"); F.shake = 4; });
  } else if (fat.kind === "car") {
    once("arrive", 0.0, () => playSfx("dash"));
    once("line", 0.55, () => { F.quote = { slot: w.slot, text: "Я ЗАТОЛКАЮ ТЕБЯ В ТАЧКУ СИЛОЙ...", t: 2.0 }; });
    once("grab", 1.1, () => { playSfx("throw"); voice(l, "hurt"); });
    once("stuff", 1.75, () => { playSfx("bodyfall"); F.shake = 10; });
    once("door", 2.1, () => playSfx("fat_car_door"));
    once("go", 2.25, () => playSfx("fat_car_leave"));
    if (t > 2.3 && t < 3.3 && Math.random() < dt * 20) { const cx = carX(fat, t, w); F.particles.push({ type: "sq", x: cx + dir * 300, y: FLOOR_Y - rand(10, 30), vx: dir * rand(20, 80), vy: rand(-60, -20), life: 0.7, max: 0.7, size: pick([8, 10, 12]), color: pick(["rgba(150,150,150,0.6)", "rgba(110,110,110,0.5)"]) }); }
  } else if (fat.kind === "tea") {
    once("line", 0.05, () => { F.quote = { slot: w.slot, text: "ЧАЙ, ЧАЙ, ЧАЁЧЕК, НАЛИВАЙ КИПЯТОЧЕК!", t: 2.2 }; });
    once("drop", 0.55, () => { playSfx("fat_mug_land"); F.shake = 16; spawnDust(teaX(fat), FLOOR_Y, 1.6); });
    once("throw", 0.9, () => playSfx("throw"));
    once("splash", 1.55, () => {
      playSfx("fat_tea_splash"); F.shake = 12;
      for (let i = 0; i < 40; i++) F.particles.push({ type: "sq", x: teaX(fat) + rand(-90, 90), y: FLOOR_Y - 215, vx: rand(-260, 260), vy: rand(-620, -200), g: 1400, life: rand(0.5, 1), max: 1, size: pick([4, 6, 8]), color: pick(["#8a4a1c", "#b5652a", "#d9a066", "#ffffff"]) });
    });
  } else if (fat.kind === "flies") {
    once("call", 0.25, () => playSfx("whoosh"));
    once("swarm", 0.6, () => playSfx("fat_flies"));
    once("gone", 2.05, () => { playSfx("whooshHeavy"); F.shake = 6; });
  } else if (fat.kind === "elements") {
    const zoomAt = (z) => { F.zoom = Math.max(F.zoom || 0, z); F.zoomX = l.x; F.zoomY = l.y - 130; };
    const flash = (c) => { fat.cflash = { c, t: t }; };
    once("aura", 0.05, () => { playSfx("el_charge"); F.shake = 6; });
    // 1 ВОДА — a torrent from his palm
    once("e0", EL_T[0], () => { playSfx("el_water"); flash("#4ab0ff"); popup(l.x, head(l) - 30, "ВОДА", "#4ab0ff", 40); });
    once("e0h", EL_T[0] + 0.2, () => { playSfx("hitHeavy"); F.shake = 14; zoomAt(0.05); });
    if (t > EL_T[0] + 0.15 && t < EL_T[0] + 0.65) for (let k = 0; k < 3; k++) F.particles.push({ type: "sq", x: elVictim(fat, t).x - dir * 30, y: l.y - rand(110, 200), vx: dir * rand(60, 260), vy: rand(-420, -60), g: 1300, life: rand(0.4, 0.8), max: 0.8, size: pick([4, 6, 8]), color: pick(ELEMENTS[0].cols) });
    // 2 ДЕРЕВО — vines burst from the floor and bind him
    once("e1", EL_T[1], () => { playSfx("el_wood"); flash("#5fd05a"); F.shake = 12; popup(l.x, head(l) - 30, "ДЕРЕВО", "#5fd05a", 40); zoomAt(0.04); });
    if (t > EL_T[1] && t < EL_T[1] + 0.5 && Math.random() < dt * 30) F.particles.push({ type: "sq", x: l.x + rand(-80, 80), y: l.y - rand(0, 200), vx: rand(-100, 100), vy: rand(-160, -40), g: 200, life: 0.9, max: 0.9, size: pick([5, 7]), color: pick(ELEMENTS[1].cols) });
    // 3 ОГОНЬ — a fire pillar erupts under him
    once("e2", EL_T[2], () => { playSfx("fat_burn"); flash("#ff7a2a"); F.shake = 18; popup(l.x, head(l) - 30, "ОГОНЬ", "#ff9a3a", 40); zoomAt(0.06); });
    if (t > EL_T[2] && t < EL_T[2] + 0.75) for (let k = 0; k < 2; k++) F.particles.push({ type: "sq", x: l.x + rand(-70, 70), y: l.y - rand(0, 300), vx: rand(-40, 40), vy: rand(-420, -200), life: 0.6, max: 0.6, size: pick([4, 6]), color: pick(ELEMENTS[2].cols) });
    // 4 ЗЕМЛЯ — rock spikes throw him into the air
    once("e3", EL_T[3], () => { playSfx("el_earth"); flash("#b0844a"); F.shake = 26; popup(l.x, head(l) - 160, "ЗЕМЛЯ", "#d8b080", 40); zoomAt(0.06);
      for (let k = 0; k < 40; k++) F.particles.push({ type: "sq", x: l.x + rand(-140, 140), y: FLOOR_Y - rand(0, 20), vx: rand(-420, 420), vy: rand(-760, -200), g: 1600, life: rand(0.6, 1.1), max: 1.1, size: pick([6, 8, 10, 12]), color: pick(ELEMENTS[3].cols) }); });
    // 5 МЕТАЛЛ — one dash cut straight through him
    once("e4", EL_T[4], () => { playSfx("el_metal"); flash("#ffffff"); F.flash = 0.6; F.shake = 12; });
    once("e4h", EL_T[4] + 0.1, () => { playSfx("hitCrit"); popup(l.x, head(l) - 180, "МЕТАЛЛ", "#e8eef8", 40); zoomAt(0.08);
      for (let k = 0; k < 30; k++) F.particles.push({ type: "sq", x: elVictim(fat, t).x + rand(-40, 40), y: elVictim(fat, t).y - rand(60, 200), vx: dir * rand(200, 700), vy: rand(-300, 200), g: 500, life: rand(0.3, 0.6), max: 0.6, size: pick([3, 4, 6]), color: pick(ELEMENTS[4].cols) }); });
    // the beat of silence, then the wheel fires all five at once
    once("beams", 4.6, () => { playSfx("el_charge"); F.shake = 10; });
    once("boom", EL_BOOM, () => {
      playSfx("el_boom"); playSfx("hitCrit"); F.flash = 0.45; F.shake = 36; zoomAt(0.14); buzz([120, 40, 300]);
      const v = elVictim(fat, t), top = v.y - 240;
      for (let k = 0; k < 220; k++) { const el = ELEMENTS[k % 5], a = rand(0, 6.28), sp = rand(200, 900); F.particles.push({ type: "sq", x: v.x + rand(-40, 40), y: rand(top, v.y), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 200, g: 700, life: rand(0.8, 1.8), max: 1.8, size: pick([4, 6, 8, 10, 12]), color: pick(el.cols) }); }
      ELEMENTS.forEach((el, i) => F.particles.push({ type: "ring", x: v.x, y: v.y - 120, life: 0.3 + i * 0.12, max: 0.3 + i * 0.12, color: el.color }));
    });
  } else if (fat.kind === "wolf") {
    once("auf", 0.25, () => { playSfx("special_krip"); F.shake = 8; });
    once("leap", 0.75, () => playSfx("fat_wolf"));
    once("howl", 2.0, () => playSfx("fat_howl"));
    once("bite", 1.2, () => { playSfx("hitCrit"); playSfx("bodyfall"); F.shake = 18; F.flash = 0.25; spawnDust(l.x, FLOOR_Y, 1.6); });
  } else if (fat.kind === "lake") {
    once("water", 0.2, () => playSfx("special_guf_hit"));
    once("rise", 0.8, () => { playSfx("fat_monster"); F.shake = 12; });
    once("grab", 1.35, () => { playSfx("throw"); voice(l, "hurt"); });
    if (t > 1.4 && t < 3.0 && Math.random() < dt * 18) F.particles.push({ type: "sq", x: l.x + rand(-80, 80), y: FLOOR_Y - rand(0, 10), vx: rand(-20, 20), vy: rand(-90, -40), life: 0.6, max: 0.6, size: pick([4, 6, 8]), color: pick(["rgba(200,240,255,0.8)", "rgba(140,200,230,0.7)"]) });
    once("sink", 1.6, () => playSfx("fat_bubbles"));
  } else if (fat.kind === "fox") {
    once("call", 0.35, () => playSfx("fat_fox"));
    once("pounce", 0.95, () => { playSfx("whooshHeavy"); });
    once("fight", 1.1, () => { F.shake = 12; playSfx("fat_brawl"); });
    if (t > 1.1 && t < 2.2 && Math.random() < dt * 3) { playSfx(pick(["hitLight", "hitBody"])); F.shake = Math.max(F.shake, 6); }
    once("burp", 2.6, () => { playSfx("fat_burp"); popup(l.x, FLOOR_Y - 190, "*ИК*", "#ffd08a", 30); });
  } else if (fat.kind === "crowd") {
    once("shout", 0.15, () => { playSfx("superStart"); F.shake = 10; });
    once("run", 0.75, () => playSfx("fat_crowd"));
    once("brawl", 1.5, () => playSfx("fat_brawl"));
    if (t > 1.5 && t < 2.6 && Math.random() < dt * 3) { playSfx(pick(["hitLight", "hitBody", "hitHeavy"])); F.shake = Math.max(F.shake, 7); }
    once("leave", 2.65, () => playSfx("whooshHeavy"));
  }
  // cinematic push-in: every big hit of a fatality (a jump in screen shake) zooms the camera onto the victim for a moment
  if (fat.kind !== "elements" && F.shake >= 14 && shake0 < 14 && (fat.camHit === undefined || t - fat.camHit > 0.7)) {
    fat.camHit = t; fat.camX = l.x; fat.camY = Math.min(l.y - 130, FLOOR_Y - 130);
  }
  if (t >= fat.dur) { F.phase = "ko"; F.phaseT = 0; F.fatDone = true; F.quote = null; }
}
// 0 → 1 → 0 envelope of the push-in after an impact
function fatCamPush(fat) {
  if (!fat || fat.camHit === undefined) return 0;
  const u = (F.phase === "fatality" ? fat.t : fat.dur + F.phaseT) - fat.camHit;
  if (u < 0) return 0;
  if (u < 0.12) return easeOut(u / 0.12);
  if (u < 0.6) return 1;
  return Math.max(0, 1 - (u - 0.6) / 0.45);
}

// height of the squashed KO pose Oxxxy stands on
function pancakeH(l) { const fr = frameOf(l.cid, "ko"); return fr ? Math.round(fr.ay * 0.6 * 0.8) : 30; }
// КАРА-ТЭ clones: smoke-tinted copies that strike from behind and from the air
function drawSmokyKarate(f) {
  const a = f.action, t = a.t;
  const clone = (pose, x, y, dir, t0, t1) => {
    if (t < t0 || t > t1) return;
    const k = Math.min(1, (t - t0) / 0.06, (t1 - t) / 0.12);
    drawPose("smoky", pose, x, y, { dir, alpha: 0.85 * k, tint: { color: "#b9c4dc", a: 0.55 }, flash: 0.15, flashColor: "#ffffff" });
  };
  clone("kara_1", a.ox + f.dir * 115, f.y, -f.dir, 0.45, 0.66);
  clone("air_kick", a.ox - f.dir * 75, f.y - 95, f.dir, 0.62, 0.84);
  if (t >= 0.82) {                                    // the real one: afterglow streaks behind him
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(f.x + f.dir * 110, f.y - 150, 5, f.x + f.dir * 110, f.y - 150, 120);
    g.addColorStop(0, `rgba(220,230,255,${0.5 * Math.max(0, 1 - (t - 0.9) / 0.3)})`); g.addColorStop(1, "rgba(200,210,255,0)");
    ctx.fillStyle = g; ctx.fillRect(f.x + f.dir * 110 - 120, f.y - 270, 240, 240); ctx.restore();
  }
}
function drawShadowAt(x, w, a = 0.38) {
  ctx.save(); ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath(); ctx.ellipse(x, FLOOR_Y + 4, w, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

// draws both fighters during (and after) a fatality
function drawFatFighter(f) {
  const fat = F.fat;
  const t = F.phase === "fatality" ? fat.t : fat.dur + F.phaseT;
  const isW = f.slot === fat.w, dir = fat.dir;
  const P = (name, x, y, o = {}) => drawPose(f.cid, hasPose(f.cid, name) ? name : "idle", x, y, Object.assign({ dir: f.dir }, o));
  const fr = frameOf(f.cid, "hurt"), hH = fr ? fr.ay : 230, hW = fr ? fr.image.width : 180;
  const sway = Math.sin(G.time * 2.6) * 0.07;
  const end = t > fat.dur - 0.4;

  if (fat.kind === "ice") {
    if (isW) {
      drawShadowAt(f.x, 64);
      P(end ? "win" : t < 0.95 ? "special" : t < 1.38 ? "heavy_0" : t < 1.9 ? "heavy" : "idle", f.x, f.y);
      return;
    }
    if (t < 1.5) {
      const k = clamp((t - 0.35) / 0.5, 0, 1);
      drawShadowAt(f.x, 70);
      P("hurt", f.x, f.y, { rot: sway * (1 - k), tint: { color: "#9ad8ff", a: 0.6 * k } });
      if (k > 0) drawIceBlock(f.x, f.y, hW * 0.85 + 24, hH + 24, k, t > 1.2 ? (t - 1.2) / 0.3 : 0);
    } else if (fat.chunks) {
      for (const c of fat.chunks) drawIceChunk(f.x + c.dx, FLOOR_Y, c.s, c.r);
    }
    return;
  }

  if (fat.kind === "lollipop") {
    const lol = img("fx.lollipop");
    // lollipop: stick bottom at (px, py), angle a (0 = straight up, + = towards the victim)
    const drawLolly = (px, py, a, sc = 1) => {
      if (!lol) return;
      ctx.save(); ctx.translate(px, py); ctx.scale(dir, 1); ctx.rotate(a);
      ctx.drawImage(lol, -lol.width * sc / 2, -lol.height * sc + 20 * sc, lol.width * sc, lol.height * sc);
      ctx.restore();
    };
    if (isW) {
      drawShadowAt(f.x, 64);
      if (t < 0.2) P("idle", f.x, f.y);
      else if (t < 0.92) P("fat", f.x, f.y + Math.sin(t * 40) * (t > 0.6 ? 1.5 : 0), { rot: -0.04 * dir * clamp((t - 0.2) / 0.5, 0, 1) });
      else if (t < 1.7) {
        const k = clamp((t - 0.92) / (LOLLI_HIT - 0.92), 0, 1);
        const a = -0.5 + 1.95 * k * k;
        drawLolly(f.x + dir * 120, f.y - 196 + 40 * k, a, 0.62);
        P("special", f.x, f.y);
      } else P(end ? "win" : "idle", f.x, f.y);
      return;
    }
    if (t < LOLLI_HIT) {
      drawShadowAt(f.x, 70);
      P("hurt", f.x, f.y, { rot: sway, flash: t > 0.92 ? 0.3 : 0, flashColor: "#ffffff" });
      return;
    }
    if (t >= 1.75) {                                   // the lollipop stays stuck in the floor like a tombstone
      const k = clamp((t - 1.75) / 0.12, 0, 1);
      drawShadowAt(f.x, 40);
      drawLolly(f.x, FLOOR_Y + 6 - 60 * (1 - k), 0.12, 0.6);
    }
    for (const pc of fat.pieces || []) {
      ctx.save(); ctx.translate(pc.x, pc.y); ctx.rotate(pc.r); ctx.scale(pc.vd, 1);
      ctx.drawImage(pc.im, pc.sx, pc.sy, pc.sw, pc.sh, -pc.sw / 2, -pc.sh / 2, pc.sw, pc.sh);
      ctx.restore();
    }
    return;
  }

  if (fat.kind === "tv") {
    const hx = (g) => f.x + g;
    if (isW) {
      drawShadowAt(f.x, 64);
      const hasTv = hasPose(f.cid, "tv") && img("fx.tv");
      const fw = frameOf(f.cid, hasTv ? "tv" : "heavy_0"), wh = hasTv ? fw.ay - 55 : fw ? fw.ay : 240;
      if (t < 0.6) {
        if (hasTv) P("tv", f.x, f.y - 8 * clamp(t / 0.4, 0, 1));
        else { P("heavy_0", f.x, f.y); drawTV(f.x - dir * 10, f.y - wh - 40 - 20 * clamp(t / 0.35, 0, 1), 150, 118, 0, 0, false); }
      } else P(end ? "win" : t < 1.3 ? "light" : "idle", f.x, f.y);
      if (t >= 0.6 && t < 0.82) {
        const k = (t - 0.6) / 0.22;
        const x0 = f.x - dir * 10, y0 = f.y - wh - 60, l = F.fighters[fat.l], lh = headOf(l.cid, "hurt"), x1 = l.x + lh.x * l.dir, y1 = l.y + lh.y + 44;
        drawTV(lerp(x0, x1, k), lerp(y0, y1, k) - Math.sin(k * Math.PI) * 60, 150, 118, dir * k * 0.6, 0, false, img("portrait." + l.cid));
      }
      return;
    }
    // victim
    const fall = clamp((t - 1.95) / 0.4, 0, 1), ang = dir * (Math.PI / 2) * fall * fall;
    drawShadowAt(f.x + dir * 110 * fall, 70 + 50 * fall);
    ctx.save(); ctx.translate(f.x, f.y - 46 * fall); ctx.rotate(ang + (t < 1.95 ? sway * 1.4 : 0));
    P("hurt", 0, 0);
    const hd = headOf(f.cid, "hurt");
    if (t >= 0.82) drawTV(hd.x * f.dir, hd.y + 44, 150, 118, 0.12 * Math.sin(t * 9) * (1 - fall), t >= TV_CRACK ? 1 : 0, true, t < TV_CRACK ? img("portrait." + f.cid) : null);
    ctx.restore();
    if (t < 0.82) {} // TV still flying (drawn with the winner)
    return;
  }

  if (fat.kind === "stomp") {
    const l = F.fighters[fat.l];
    const MINI = 0.5, miniTop = () => { const fr2 = frameOf(l.cid, "walk_1") || frameOf(l.cid, "idle"); return fr2 ? fr2.ay * MINI : 120; };
    // the mini waddles back and forth like a platformer enemy
    const waddle = (tt) => Math.sin(Math.min(tt, 1.3) * 5) * 18;
    if (isW) {
      let x = fat.x0, y = FLOOR_Y, name = "crouch", rot = 0;
      if (t < 0.75) name = t < 0.5 ? "idle" : "crouch";
      else if (t < 1.3) {
        const k = (t - 0.75) / 0.55, tx = l.x + waddle(1.3);
        x = lerp(fat.x0, tx, k); y = lerp(FLOOR_Y, FLOOR_Y - 26, k) - 330 * Math.sin(k * Math.PI); name = "jump";
        rot = dir * 0.25 * Math.sin(k * Math.PI);
      } else {
        x = l.x + waddle(1.3); y = FLOOR_Y - 26;
        name = t < 1.6 ? "crouch" : end ? "win" : "idle";
        if (t > 1.65 && t < 2.7) rot = Math.sin((t - 1.65) * 14) * 0.08;
      }
      drawShadowAt(x, 64 * (y < FLOOR_Y - 100 ? 0.6 : 1));
      P(name, x, y, { rot });
      if (fat.coin) {                                       // a spinning coin pops out of the flattened enemy
        const c = fat.coin.t, cy = FLOOR_Y - 60 - 260 * c + 420 * c * c;
        if (c < 1.0) { const w2 = Math.abs(Math.cos(c * 18)) * 16 + 3; ctx.save(); ctx.fillStyle = "#ffd23a"; ctx.strokeStyle = "#8a5a00"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(l.x + waddle(1.3) + 30, cy, w2, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
      }
      return;
    }
    const wx = f.x + (t > 0.45 ? waddle(t - 0.45) : 0);
    if (t < 0.2) { drawShadowAt(f.x, 70); P("hurt", f.x, f.y, { rot: sway }); return; }
    if (t < 0.45) {                                         // shrinking in a puff
      const k = (t - 0.2) / 0.25;
      drawShadowAt(f.x, 70 * (1 - 0.5 * k));
      drawPixelPose(l.cid, "hurt", f.x, f.y, -dir, 1 - (1 - MINI) * k, Math.round(1 + 5 * k));
      return;
    }
    if (t < 1.3) {                                          // 8-bit enemy walking back and forth
      const step = Math.floor(t * 6) % 2;
      const facing = Math.cos((t - 0.45) * 5) > 0 ? 1 : -1;
      drawShadowAt(wx, 34);
      drawPixelPose(l.cid, step ? "walk_1" : "walk_3", wx, f.y - (step ? 3 : 0), facing, MINI, 6);
      return;
    }
    const g = clamp((t - 1.65) / 0.9, 0, 1);               // squashed flat
    drawShadowAt(wx, 60 + 20 * g, 0.5);
    drawPixelPose(l.cid, "hurt", wx, f.y, -dir, MINI, 6, 0.18, 1.5 + 0.3 * g);
    return;
  }

  if (fat.kind === "burn") {
    if (isW) { drawShadowAt(f.x, 64); P(end ? "win" : t < 1.1 ? "special" : "idle", f.x, f.y); return; }
    const char = clamp((t - 0.6) / 1.2, 0, 1), gone = clamp((t - 1.8) / 0.7, 0, 1);
    const fire = clamp((t - 0.55) / 0.25, 0, 1) * (1 - clamp((t - 2.3) / 0.6, 0, 1));
    if (gone < 1) { drawShadowAt(f.x, 70 * (1 - gone)); P("hurt", f.x + rand(-2, 2) * fire, f.y, { rot: sway * (1 - char), alpha: 1 - gone, tint: { color: "#140c08", a: 0.95 * char } }); }
    if (fire > 0) drawBodyFire(f.x, f.y, hH, fire);
    const pile = clamp((t - 2.0) / 0.6, 0, 1);
    if (pile > 0) drawDustPile(f.x, FLOOR_Y, pile, t);
    return;
  }

  // victim knocked far away (Dora's guitar, the hearse): spinning arc off the screen
  const flyAway = (t0, vx, vy) => {
    const u = t - t0;
    if (u < 0) { drawShadowAt(f.x, 70); P("hurt", f.x, f.y, { rot: sway }); return; }
    const x = f.x + dir * vx * u, y = f.y + vy * u + 1400 * u * u;
    if (x < -300 || x > W + 300 || y > H + 300) return;
    P("hurt", x, Math.min(y, FLOOR_Y), { rot: dir * u * 9 });
  };

  if (fat.kind === "dora") {
    if (!isW) { flyAway(1.05, 1500, -900); return; }
    drawShadowAt(f.x, 64);
    P(t < 0.9 ? "special" : end ? "win" : "idle", f.x, f.y);
    // Dora runs in from behind Maybe and swings her guitar
    const l = F.fighters[fat.l];
    const sx0 = dir > 0 ? -160 : W + 160, sx1 = l.x - dir * 150;
    const k = clamp(t / 0.8, 0, 1);
    const dx = lerp(sx0, sx1, easeOut(k));
    drawDora(dx, FLOOR_Y, dir, t);
    return;
  }

  if (fat.kind === "rose") {
    const l = F.fighters[fat.l];
    if (isW) {
      drawShadowAt(f.x, 64);
      const giving = t >= 0.4 && t < 1.7;
      P(end ? "win" : giving ? "light" : "idle", f.x, f.y);
      if (giving) drawBigRose(f.x + dir * 100, f.y - 172, dir * 0.6, 2.4);
      return;
    }
    const fall = clamp((t - 1.85) / 0.4, 0, 1), ang = dir * (Math.PI / 2) * fall * fall;
    const love = clamp((t - 0.8) / 0.6, 0, 1);
    drawShadowAt(f.x + dir * 110 * fall, 70 + 50 * fall);
    ctx.save(); ctx.translate(f.x, f.y - 46 * fall); ctx.rotate(ang + (t < 1.85 ? Math.sin(G.time * 5) * 0.05 * love : 0));
    P("hurt", 0, 0, { tint: { color: "#ff6fae", a: 0.45 * love } });
    if (t >= 1.7) drawBigRose(-dir * 10, -hH * 0.55, dir * 1.2, 2.2);
    ctx.restore();
    for (const h of fat.hearts || []) {
      const a = clamp(1 - h.t / 1.6, 0, 1);
      if (a > 0) text("♥", h.x + Math.sin(h.t * 5 + h.s) * 8, h.y, { size: h.s, align: "center", color: "#ff3d7f", stroke: "#4a0018", strokeW: 3, alpha: a, shadow: false });
    }
    return;
  }

  if (fat.kind === "hearse") {
    const l = F.fighters[fat.l];
    // the hearse pulls up behind Slava, he gets in, it runs the victim over, stops, he steps out
    const cx = hearseX(fat, t, f, l);
    if (!isW) { flyAway(1.35, 1700, -1000); return; }
    if (t < 0.8) { drawShadowAt(f.x, 64); P("special", f.x, f.y); }          // waves it in, then gets in
    drawHearse(cx, dir, t);
    if (t >= 2.05) { const px = cx + dir * 60; drawShadowAt(px, 64); P(end ? "win" : "idle", px, f.y, { dir: -dir }); }
    return;
  }

  if (fat.kind === "stork") {
    const st = storkPos(fat, t);
    if (!isW) {
      if (t < 1.1) { drawShadowAt(f.x, 70); P("hurt", f.x, f.y, { rot: sway }); return; }
      if (st.y + hH < -60) return;
      drawShadowAt(st.x, 50 * clamp(1 - (FLOOR_Y - (st.y + hH + 40)) / 400, 0, 1));
      P("hurt", st.x, st.y + hH + 40, { rot: Math.sin(t * 6) * 0.15 });
      return;
    }
    const sunK = clamp((t - 1.9) / 0.6, 0, 1);
    if (sunK > 0) drawStorkSunset(fat, t, sunK);                // final shot: the stork flies off into the sunset
    drawShadowAt(f.x, 64);
    P(t < 1.0 ? "special" : end ? "win" : "idle", f.x, f.y);
    drawStork(st.x, st.y, dir, t);
    return;
  }

  if (fat.kind === "smoke") {
    if (isW) {
      drawShadowAt(f.x, 64);
      P(t < 1.6 ? "special" : end ? "win" : "idle", f.x, f.y);
      if (t > 0.25 && t < 1.2) {                             // he blows a stream of smoke at the opponent
        const l = F.fighters[fat.l], k = clamp((t - 0.25) / 0.4, 0, 1);
        ctx.save();
        for (let i = 0; i < 9; i++) {
          const u = i / 8 * k, x = lerp(f.x + dir * 70, l.x, u), y = lerp(f.y - 190, l.y - 150, u) + Math.sin(t * 9 + i) * 10;
          ctx.fillStyle = `rgba(210,216,232,${0.35 * (1 - clamp((t - 0.9) / 0.3, 0, 1))})`;
          ctx.beginPath(); ctx.arc(x, y, 14 + u * 26, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      return;
    }
    const fade = clamp((t - 0.9) / 1.0, 0, 1);
    if (fade < 1) {
      drawShadowAt(f.x, 70 * (1 - fade));
      // the body thins out from the feet up, greying into smoke
      const fr2 = frameOf(f.cid, "hurt");
      ctx.save();
      if (fr2) { const cut = f.y - fr2.ay * fade; ctx.beginPath(); ctx.rect(f.x - 300, -100, 600, cut + 100); ctx.clip(); }
      P("hurt", f.x + Math.sin(t * 20) * 2 * fade, f.y - 20 * fade, { rot: sway, alpha: 1 - fade * 0.7, tint: { color: "#c8cede", a: 0.2 + 0.7 * fade } });
      ctx.restore();
    }
    return;
  }

  if (fat.kind === "laser") {
    const l = F.fighters[fat.l];
    if (isW) {
      drawShadowAt(f.x, 64);
      const bare = hasPose(f.cid, "noglass") && t >= 0.4 && t < 2.5;
      P(end ? "win" : bare ? "noglass" : "idle", f.x, f.y);
      if (end) return;
      const ex = f.x + dir * (bare ? FACE_EYE[0] : 8), ey = f.y + (bare ? FACE_EYE[1] : -200);
      const glow = clamp((t - 0.55) / 0.3, 0, 1) * (1 - clamp((t - 2.45) / 0.15, 0, 1));
      if (glow > 0) drawLaserEyes(ex, ey, dir, glow, t, bare);
      // the sunglasses: lifted off and tossed up, then they fall back onto his nose
      let gx = null, gy, gr = 0;
      if (t >= 0.3 && t < 0.9) { const k = (t - 0.3) / 0.6; gx = ex - dir * 30 * k; gy = ey - 260 * k * (2 - k); gr = -dir * 6 * k; }
      else if (t >= 2.2 && t < 2.6) { const k = (t - 2.2) / 0.4; gx = ex - dir * 30 * (1 - k); gy = lerp(-40, ey, k * k); gr = -dir * 6 * (1 - k); }
      if (gx !== null && gy > -60) drawSunglasses(gx, gy, dir, gr);
      if (t > 0.9 && t < 2.0) {
        const hx = l.x - dir * 10 + Math.sin(t * 7) * 18, hy = l.y - (frameOf(l.cid, "hurt") ? frameOf(l.cid, "hurt").ay : 230) + 60 + Math.sin(t * 5) * 30;
        drawLaser(ex + dir * 2, ey - 2, hx, hy, t);
        drawLaser(ex + dir * 2, ey + 3, hx + 6, hy + 8, t + 1);
      }
      return;
    }
    const char = clamp((t - 0.95) / 0.9, 0, 1), gone = clamp((t - 1.95) / 0.7, 0, 1);
    const fire = clamp((t - 1.0) / 0.3, 0, 1) * (1 - clamp((t - 2.0) / 0.5, 0, 1));
    if (gone < 1) { drawShadowAt(f.x, 70 * (1 - gone)); P("hurt", f.x + rand(-2, 2) * fire, f.y, { rot: sway * (1 - char), alpha: 1 - gone, tint: { color: "#140c08", a: 0.95 * char } }); }
    if (fire > 0) drawBodyFire(f.x, f.y, hH * 0.8, fire * 0.8);
    const pile = clamp((t - 2.1) / 0.6, 0, 1);
    if (pile > 0) drawDustPile(f.x, FLOOR_Y, pile, t);
    return;
  }

  if (fat.kind === "acid") {
    const l = F.fighters[fat.l];
    const lh = (() => { const fr2 = frameOf(l.cid, "hurt"); return l.y - (fr2 ? fr2.ay : 230) + 26; })();
    if (isW) {
      drawShadowAt(f.x, 64);
      const fo = frameOf(f.cid, "overhead_0"), top = f.y - (fo ? fo.ay : 250);
      if (t < 0.6) {
        P("overhead_0", f.x, f.y);
        drawAcidBottle(f.x + dir * 4, top + 6 - 8 * clamp(t / 0.4, 0, 1), dir * 0.15 + Math.PI, t);
      } else P(t < 1.3 ? "overhead" : end ? "win" : "idle", f.x, f.y);
      if (t >= 0.6 && t < 0.7) { const k = (t - 0.6) / 0.1; drawAcidBottle(lerp(f.x + dir * 4, l.x - dir * 10, k), lerp(top, lh, k) - Math.sin(k * Math.PI) * 40, Math.PI + dir * k * 2.2, t); }
      return;
    }
    const green = clamp((t - 0.7) / 0.6, 0, 1), m = clamp((t - 1.2) / 1.2, 0, 1);
    const pk = clamp((t - 0.9) / 1.3, 0, 1);
    if (pk > 0) drawAcidPuddle(f.x, pk, t);
    if (m >= 1) return;
    drawShadowAt(f.x, 70 * (1 - m));
    const wob = Math.sin(t * 9) * 0.05 * m;
    P("hurt", f.x, f.y, { rot: t < 0.7 ? sway : sway * (1 - green), sy: 1 - 0.9 * m * m, sx: 1 + 0.7 * m + wob, alpha: 1 - 0.25 * m, tint: green ? { color: "#5aff2a", a: 0.65 * green } : null });
    if (t >= 0.7 && m < 0.6) {                               // acid on his head, dripping (sinks with the melt)
      const hy = f.y - (f.y - lh) * (1 - 0.9 * m * m);
      ctx.save(); ctx.fillStyle = "rgba(125,255,58,0.85)"; ctx.globalAlpha = 1 - m / 0.6;
      ctx.beginPath(); ctx.ellipse(f.x, hy - 6, 46 * (1 + 0.7 * m), 18, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 5; i++) { const dx = -36 + i * 18, len = 20 + ((i * 37) % 30) + 40 * green; ctx.fillRect(f.x + dx * (1 + 0.7 * m), hy - 4, 6, len * (1 - m)); }
      ctx.restore();
    }
    return;
  }

  if (fat.kind === "car") {
    const cx = carX(fat, t, F.fighters[fat.w]);
    const l = F.fighters[fat.l], w = F.fighters[fat.w];
    const door = cx + dir * 120;
    const wx = t < 0.7 ? fat.x0 : t < 1.1 ? lerp(fat.x0, l.x - dir * 95, (t - 0.7) / 0.4) : t < 1.75 ? lerp(l.x - dir * 95, door + dir * 140, (t - 1.1) / 0.65) : door + dir * 140;
    const lx = t < 1.1 ? l.x : t < 1.75 ? lerp(l.x, door + dir * 40, (t - 1.1) / 0.65) : door + dir * 40;
    if (!isW) {
      if (t >= 1.95) return;
      const k = t < 1.75 ? 1 : 1 - (t - 1.75) / 0.2;              // squeezed in through the door
      drawShadowAt(lx, 70 * k);
      P("hurt", lx, f.y, { rot: t < 1.1 ? sway : -dir * 0.3, sx: k, sy: k });
      return;
    }
    if (t < 2.1) {
      const walking = (t >= 0.7 && t < 1.1) || (t >= 1.1 && t < 1.75);
      const name = t < 0.7 ? "idle" : t < 1.1 ? "walk_" + (1 + Math.floor(t * 10) % 4) : t < 1.75 ? "heavy_0" : "idle";
      const k = t < 1.9 ? 1 : 1 - (t - 1.9) / 0.2;
      if (k > 0) { drawShadowAt(wx, 64 * k); P(name, wx, f.y, { dir: walking && t >= 1.1 ? -dir : dir, sx: k, sy: k }); }
    }
    drawKorzhCar(cx, t >= 2.3 ? -dir : dir, t);
    return;
  }

  if (fat.kind === "tea") {
    const mx = teaX(fat);
    if (isW) { drawShadowAt(f.x, 64); P(t < 0.85 ? "idle" : t < 1.3 ? "heavy" : end ? "win" : "idle", f.x, f.y); return; }
    const drop = clamp((t - 0.1) / 0.45, 0, 1), my = lerp(-260, FLOOR_Y, drop * drop);
    if (t < 0.9) { drawShadowAt(f.x, 70); P("hurt", f.x, f.y, { rot: sway }); }
    if (t > 0.1) drawMug(mx, my, "back", t);
    if (t >= 0.9 && t < 1.55) {                                  // thrown in an arc into the mug
      const k = (t - 0.9) / 0.65;
      P("hurt", lerp(f.x, mx, k), lerp(f.y, FLOOR_Y - 120, k) - 330 * Math.sin(k * Math.PI), { rot: dir * k * 7 });
    } else if (t >= 1.55 && t < 2.6) {                          // bobbing in the tea, then gone
      const sink = clamp((t - 1.8) / 0.7, 0, 1);
      const rim = img("fx.mug") ? MUG.rim - 6 : 205;
      ctx.save(); ctx.beginPath(); ctx.rect(mx - 140, my - 600, 280, 600 - rim); ctx.clip();
      P("hurt", mx + Math.sin(t * 6) * 6, my - 120 + sink * 160, { rot: Math.sin(t * 4) * 0.2, tint: { color: "#8a4a1c", a: 0.35 } });
      ctx.restore();
    }
    if (t > 0.1) drawMug(mx, my, "front", t, t >= 1.55 ? f.data.name : null);
    return;
  }

  if (fat.kind === "flies") {
    if (isW) { drawShadowAt(f.x, 64); P(t < 0.9 ? "special" : end ? "win" : "idle", f.x, f.y); return; }
    const gone = t >= 2.05;
    const cover = clamp((t - 0.9) / 0.9, 0, 1);
    if (!gone) { drawShadowAt(f.x, 70); P("hurt", f.x + rand(-2, 2) * cover, f.y, { rot: sway, tint: { color: "#14120e", a: 0.85 * cover } }); }
    drawFlies(fat, f, t, hH);
    return;
  }

  if (fat.kind === "elements") {
    const l = F.fighters[fat.l];
    const v = elVictim(fat, t);
    if (isW) {
      // where he stands: in front, then on the far side after the dash cut
      const dash = clamp((t - EL_T[4]) / 0.12, 0, 1);
      const bx = lerp(f.x, l.x + dir * 240, dash);
      if (dash > 0 && dash < 1) for (let k = 0; k < 5; k++) drawPose(f.cid, "slash", lerp(f.x, bx, k / 5), f.y, { dir, alpha: 0.15 + k * 0.08, flash: 0.8, flashColor: "#e8eef8" });
      drawElementAura(bx, f.y, t);
      drawShadowAt(bx, 64);
      let name = "special";
      if (t >= EL_T[0] && t < EL_T[1]) name = "light";
      else if (t >= EL_T[1] && t < EL_T[2]) name = "heavy_0";
      else if (t >= EL_T[2] && t < EL_T[3]) name = "overhead";
      else if (t >= EL_T[3] && t < EL_T[4]) name = "heavy";
      else if (t >= EL_T[4]) name = t < 4.6 ? "slash" : end ? "win" : "idle";
      P(name, bx, f.y, { dir });
      // water torrent
      const wk = (t - EL_T[0]) / 0.7;
      if (wk > 0 && wk < 1) drawTorrent(f.x + dir * 70, f.y - 165, v.x - dir * 20, v.y - 150, wk, t);
      // the wheel of five above the arena, its nodes light up one by one, then fire
      const wheelA = clamp(t / 0.6, 0, 1) * (1 - clamp((t - EL_BOOM - 0.1) / 0.4, 0, 1));
      if (wheelA > 0) drawElementWheel((f.x + l.x) / 2, 200, 108, t, wheelA, v);
      // the final burst
      const bk = (t - EL_BOOM) / 0.6;
      if (bk > 0 && bk < 1) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ELEMENTS.forEach((el, i) => {
          const r = 60 + 420 * easeOut(bk) * (1 - i * 0.12);
          const g = ctx.createRadialGradient(v.x, v.y - 130, r * 0.2, v.x, v.y - 130, r);
          g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.75, el.color); g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.globalAlpha = 0.5 * (1 - bk);
          ctx.fillStyle = g; ctx.fillRect(v.x - r, v.y - 130 - r, r * 2, r * 2);
        });
        ctx.globalAlpha = 1 - bk;
        const core = ctx.createRadialGradient(v.x, v.y - 130, 5, v.x, v.y - 130, 160);
        core.addColorStop(0, "rgba(255,255,255,1)"); core.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = core; ctx.fillRect(v.x - 160, v.y - 290, 320, 320);
        ctx.restore();
      }
      return;
    }
    if (t >= EL_BOOM) return;
    const hits = EL_T.filter((t0) => t >= t0 + 0.15).length;
    const last = hits ? ELEMENTS[hits - 1] : null;
    const frozen = t >= EL_T[4] + 0.1;
    const lifted = t >= EL_T[3];
    drawShadowAt(v.x, 70 * (lifted ? 0.6 : 1));
    if (t >= EL_T[1]) drawVines(v.x, FLOOR_Y, v.y, clamp((t - EL_T[1]) / 0.35, 0, 1), t, true);
    P(lifted ? "fall" : "hurt", v.x + (frozen ? 0 : rand(-2, 2) * (hits ? 1 : 0)), v.y, { rot: frozen ? -dir * 0.25 : lifted ? -dir * 0.25 * clamp((t - EL_T[3]) / 0.3, 0, 1) : sway, tint: last ? { color: last.color, a: 0.3 } : null, flash: frozen ? 0.15 + 0.15 * Math.sin(t * 30) : 0, flashColor: "#ffffff" });
    if (t >= EL_T[1]) drawVines(v.x, FLOOR_Y, v.y, clamp((t - EL_T[1]) / 0.35, 0, 1), t, false);
    const fk = clamp((t - EL_T[2]) / 0.15, 0, 1) * (1 - clamp((t - EL_T[2] - 0.6) / 0.3, 0, 1));
    if (fk > 0) drawBodyFire(l.x, FLOOR_Y, 300, fk);
    if (t >= EL_T[3]) drawRockSpikes(l.x, FLOOR_Y, clamp((t - EL_T[3]) / 0.18, 0, 1));
    if (frozen) {                                            // the cut: a glowing line straight through him
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(255,255,255,${0.7 + 0.3 * Math.sin(t * 40)})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(v.x - dir * 90, v.y - 210); ctx.lineTo(v.x + dir * 90, v.y - 40); ctx.stroke();
      ctx.restore();
    }
    return;
  }

  if (fat.kind === "wolf") {
    const l = F.fighters[fat.l];
    if (isW) {
      drawShadowAt(f.x, 64); P(t < 0.7 ? "special" : end ? "win" : "idle", f.x, f.y);
      if (t > 0.2 && t < 1.2) { const k = clamp((t - 0.2) / 0.15, 0, 1); text("АУФ!", f.x + dir * 30, f.y - 300, { size: 54 * k, align: "center", gradient: ["#ffffff", "#d8d8e8", "#8a8aa0"], stroke: "#000", strokeW: 6 }); }
      const wp = wolfPos(fat, t, f, l);
      if (wp) drawWolf(wp.x, wp.y, wp.dir, t, wp.carry ? l : null);
      return;
    }
    if (t < 1.2) { drawShadowAt(f.x, 70); P("hurt", f.x, f.y, { rot: sway }); }
    return;
  }

  if (fat.kind === "lake") {
    const lk = clamp((t - 0.15) / 0.5, 0, 1) * (1 - clamp((t - 3.0) / 0.6, 0, 1));
    if (isW) { drawShadowAt(f.x, 64); P(t < 0.8 ? "special" : end ? "win" : "idle", f.x, f.y); return; }
    if (lk > 0) drawLake(f.x, lk, t);
    // the monster rises behind, grabs and pulls under
    const rise = clamp((t - 0.8) / 0.5, 0, 1) * (1 - clamp((t - 1.9) / 0.7, 0, 1));
    const pull = clamp((t - 1.4) / 0.9, 0, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(f.x - 400, -100, 800, FLOOR_Y + 100 - 2); ctx.clip();
    if (rise > 0) drawLakeMonster(f.x + dir * 70, FLOOR_Y + (1 - rise) * 300, dir, t);
    if (pull < 1) P("hurt", f.x, f.y + 20 * clamp(t / 0.7, 0, 1) + pull * 300, { rot: sway + (t > 1.4 ? Math.sin(t * 14) * 0.08 : 0) });
    ctx.restore();
    return;
  }

  if (fat.kind === "fox") {
    const l = F.fighters[fat.l];
    if (isW) {
      drawShadowAt(f.x, 64); P(t < 0.9 ? "special" : end ? "win" : "idle", f.x, f.y);
      // fox: runs in, pounces, (cloud), then sits full and happy
      if (t >= 0.35 && t < 1.1) {
        const k = (t - 0.35) / 0.75, x0 = dir > 0 ? -120 : W + 120;
        const fx = lerp(x0, l.x, k), fy = FLOOR_Y - (k > 0.7 ? Math.sin((k - 0.7) / 0.3 * Math.PI) * 120 : 0);
        drawFox(fx, fy, dir, t, false);
      } else if (t >= 2.2) drawFox(l.x, FLOOR_Y, -dir, t, true);
      return;
    }
    if (t < 1.1) { drawShadowAt(f.x, 70); P("hurt", f.x, f.y, { rot: sway }); }
    if (t >= 1.1 && t < 2.3) drawBrawlCloud(f.x, f.y - 110, 130, t, 1 - clamp((t - 2.1) / 0.2, 0, 1));
    return;
  }

  if (fat.kind === "crowd") {
    const l = F.fighters[fat.l];
    if (isW) {
      drawShadowAt(f.x, 64); P(t < 1.3 ? "special" : end ? "win" : "idle", f.x, f.y);
      if (t > 0.1 && t < 1.5) {
        const k = clamp((t - 0.1) / 0.15, 0, 1);
        text("ПИПЛ ХАВАЕТ!", f.x + dir * 20, f.y - 310, { size: 46 * k, align: "center", gradient: ["#fff6c8", "#ffd54a", "#ff7a3d"], stroke: "#000", strokeW: 6 });
      }
      for (const m of fat.mob) {
        const tin = 0.75 + m.d, tout = 2.65 + m.d * 0.5;
        if (t < tin) continue;
        const edge = m.side > 0 ? W + 120 : -120, spot = l.x + m.side * m.slot;
        let x, face;
        if (t < tin + 0.7) { x = lerp(edge, spot, (t - tin) / 0.7); face = -m.side; }
        else if (t < tout) { x = spot + Math.sin(t * 20 + m.ph) * 8; face = -m.side; }
        else { x = lerp(spot, edge, clamp((t - tout) / 0.7, 0, 1)); face = m.side; }
        if (x < -150 || x > W + 150) continue;
        drawPose(m.cid, "walk_" + (1 + Math.floor(t * 9 + m.ph) % 4), x, FLOOR_Y, { dir: face, sx: m.sc, sy: m.sc, tint: { color: "#3a2c58", a: 0.8 } });
      }
      if (t >= 1.5 && t < 2.75) drawBrawlCloud(l.x, l.y - 120, 160, t, 1 - clamp((t - 2.55) / 0.2, 0, 1));
      return;
    }
    if (t < 1.5) { drawShadowAt(f.x, 70); P("hurt", f.x, f.y, { rot: sway }); }
    return;
  }

  if (fat.kind === "quit") {
    if (isW) { drawShadowAt(f.x, 64); P(t < 1.2 ? "idle" : "win", f.x, f.y); return; }
    if (t >= 1.15) return;
    drawShadowAt(f.x, 70);
    if (t < 0.5) { P("hurt", f.x, f.y, { rot: sway }); return; }
    // glitch: the sprite tears into horizontal slices with RGB shifts
    const fr2 = frameOf(f.cid, "hurt");
    if (!fr2) return;
    const g = clamp((t - 0.5) / 0.65, 0, 1);
    const top = f.y - fr2.ay, hgt = fr2.image.height;
    for (let yy = 0; yy < hgt; yy += 10) {
      const off = (Math.random() < 0.4 ? rand(-30, 30) : 0) * g;
      ctx.save();
      ctx.beginPath(); ctx.rect(f.x - 200, top + yy, 400, 10); ctx.clip();
      if (Math.random() < 0.3 * g) { ctx.globalAlpha = 0.6; P("hurt", f.x + off + 6, f.y, { tint: { color: "#ff2bd6", a: 0.8 } }); P("hurt", f.x + off - 6, f.y, { tint: { color: "#20f0ff", a: 0.8 } }); }
      ctx.globalAlpha = 1 - g * 0.5;
      P("hurt", f.x + off, f.y);
      ctx.restore();
    }
    return;
  }
}

const ELEMENTS = [
  { name: "ВОДА", color: "#4ab0ff", cols: ["#4ab0ff", "#a8dcff", "#ffffff"], sfx: "special_guf_hit" },
  { name: "ДЕРЕВО", color: "#5fd05a", cols: ["#5fd05a", "#2e8a36", "#a8e888"], sfx: "whoosh" },
  { name: "ОГОНЬ", color: "#ff7a2a", cols: ["#ff7a2a", "#ffd04a", "#ff3a1a"], sfx: "whooshHeavy" },
  { name: "ЗЕМЛЯ", color: "#b0844a", cols: ["#b0844a", "#7a5a30", "#d8b080"], sfx: "landHeavy" },
  { name: "МЕТАЛЛ", color: "#c8d0dc", cols: ["#c8d0dc", "#8a94a4", "#ffffff"], sfx: "special_babangida" },
];
const EL_T = [0.8, 1.55, 2.3, 3.05, 3.8], EL_BOOM = 4.95;
// victim position during the five elements: pushed by the water, thrown up by the earth
function elVictim(fat, t) {
  const l = F.fighters[fat.l], dir = fat.dir;
  const push = clamp((t - EL_T[0] - 0.15) / 0.4, 0, 1) * 40;
  const lift = t < EL_T[3] ? 0 : 150 * easeOut(clamp((t - EL_T[3]) / 0.3, 0, 1)) + (t > EL_T[3] + 0.3 ? Math.sin((t - EL_T[3]) * 3) * 6 : 0);
  return { x: l.x + dir * push, y: l.y - lift };
}
function drawElementAura(x, y, t) {
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) {
    const a = t * 2.4 + i * Math.PI * 2 / 5, el = ELEMENTS[i];
    const px = x + Math.cos(a) * 90, py = y - 130 + Math.sin(a) * 26;
    const g = ctx.createRadialGradient(px, py, 1, px, py, 26);
    g.addColorStop(0, el.color); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(px - 26, py - 26, 52, 52);
  }
  const g = ctx.createRadialGradient(x, y - 120, 10, x, y - 120, 170);
  g.addColorStop(0, `rgba(255,240,200,${0.18 + 0.06 * Math.sin(t * 8)})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(x - 170, y - 290, 340, 340);
  ctx.restore();
}
// the wheel of five: a pentagram with a node per element; lit nodes glow, at the end all fire beams
function drawElementWheel(cx, cy, r, t, a, v) {
  const pts = ELEMENTS.map((_, i) => { const ang = -Math.PI / 2 + i * Math.PI * 2 / 5 + t * 0.4; return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]; });
  ctx.save(); ctx.globalAlpha = a;
  ctx.strokeStyle = "rgba(255,240,200,0.55)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r + 16, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); for (let i = 0; i <= 5; i++) { const p = pts[(i * 2) % 5]; i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke();
  ctx.globalCompositeOperation = "lighter";
  ELEMENTS.forEach((el, i) => {
    const lit = t >= EL_T[i];
    const pulse = lit ? 1 + 0.5 * Math.max(0, 1 - (t - EL_T[i]) / 0.4) : 0.4;
    const [px, py] = pts[i];
    const g = ctx.createRadialGradient(px, py, 1, px, py, 34 * pulse);
    g.addColorStop(0, lit ? el.color : "rgba(120,110,140,0.6)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(px - 40 * pulse, py - 40 * pulse, 80 * pulse, 80 * pulse);
    if (t >= 4.6 && t < EL_BOOM + 0.08) {                // five beams converge on the victim
      const k = clamp((t - 4.6) / 0.25, 0, 1);
      ctx.strokeStyle = el.color; ctx.lineWidth = 6 + 10 * k * (0.7 + 0.3 * Math.sin(t * 50 + i));
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(lerp(px, v.x, k), lerp(py, v.y - 130, k)); ctx.stroke();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(lerp(px, v.x, k), lerp(py, v.y - 130, k)); ctx.stroke();
    }
  });
  ctx.restore();
  ELEMENTS.forEach((el, i) => { if (t >= EL_T[i]) text(el.name, pts[i][0], pts[i][1] + 30, { size: 12, font: FONT_PIX, align: "center", color: el.color, shadow: false, alpha: a }); });
}
function drawTorrent(x0, y0, x1, y1, k, t) {
  const grow = clamp(k / 0.25, 0, 1), fade = 1 - clamp((k - 0.7) / 0.3, 0, 1);
  const xe = lerp(x0, x1, grow), len = xe - x0;
  ctx.save(); ctx.globalAlpha = fade;
  for (let layer = 0; layer < 3; layer++) {
    const th = [46, 30, 12][layer];
    ctx.fillStyle = ["rgba(40,120,220,0.75)", "rgba(110,190,255,0.85)", "rgba(230,248,255,0.95)"][layer];
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) { const u = i / 24, x = x0 + len * u, y = lerp(y0, y1, u) - th / 2 + Math.sin(u * 14 - t * 30 + layer) * 6 * (1 - layer * 0.3); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    for (let i = 24; i >= 0; i--) { const u = i / 24, x = x0 + len * u, y = lerp(y0, y1, u) + th / 2 + Math.sin(u * 14 - t * 30 + layer + 2) * 6 * (1 - layer * 0.3); ctx.lineTo(x, y); }
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = "rgba(230,248,255,0.9)";                      // foam at the impact
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(xe + rand(-20, 20), lerp(y0, y1, grow) + rand(-30, 30), rand(8, 20), 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// vines: drawn in two passes so they wrap around the body (back half, then front half)
function drawVines(x, floorY, bodyY, k, t, back) {
  ctx.save(); ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    if ((i % 2 === 0) !== back) continue;
    const side = i % 3 - 1, hgt = (bodyY < floorY - 10 ? floorY - bodyY + 180 : 200) * k * (0.7 + 0.1 * i % 3);
    ctx.strokeStyle = back ? "#1f5a24" : "#3a9a3a"; ctx.lineWidth = 9 - (i % 3);
    ctx.beginPath(); ctx.moveTo(x + side * 50 + (i - 3) * 8, floorY + 2);
    for (let s2 = 1; s2 <= 12; s2++) { const u = s2 / 12; ctx.lineTo(x + side * 50 * (1 - u) + Math.sin(u * 9 + i + t * 2) * 46 * (back ? -1 : 1), floorY - hgt * u); }
    ctx.stroke();
    if (!back) { ctx.fillStyle = "#6fd06a"; for (let s2 = 2; s2 <= 12; s2 += 3) { const u = s2 / 12; ctx.beginPath(); ctx.ellipse(x + side * 50 * (1 - u) + Math.sin(u * 9 + i + t * 2) * 46 + 10, floorY - hgt * u, 10, 5, 0.6, 0, Math.PI * 2); ctx.fill(); } }
  }
  ctx.restore();
}
function drawRockSpikes(x, y, k) {
  const spikes = [[-120, 70, 34], [-70, 150, 40], [-20, 210, 46], [40, 180, 42], [95, 120, 36], [140, 60, 28]];
  ctx.save();
  for (const [dx, h, w] of spikes) {
    const hh = h * k;
    const g = ctx.createLinearGradient(x + dx - w / 2, 0, x + dx + w / 2, 0);
    g.addColorStop(0, "#5a4028"); g.addColorStop(0.5, "#9a7448"); g.addColorStop(1, "#4a3420");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x + dx - w / 2, y + 4); ctx.lineTo(x + dx + 4, y - hh); ctx.lineTo(x + dx + w / 2, y + 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#2a1c10"; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.restore();
}
function drawElementOrb(x, y, el, t) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, 2, x, y, 46);
  g.addColorStop(0, el.color); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(x - 46, y - 46, 92, 92);
  ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 12);
  ctx.fillStyle = el.color; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
  if (el.name === "МЕТАЛЛ") { ctx.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 20, a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (el.name === "ЗЕМЛЯ") { ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(-4, -16); ctx.lineTo(14, -10); ctx.lineTo(16, 8); ctx.lineTo(0, 16); ctx.lineTo(-14, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (el.name === "ДЕРЕВО") { ctx.beginPath(); ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
function drawFlies(fat, f, t, hH) {
  const l = f, dir = fat.dir, w = F.fighters[fat.w];
  const sx = w.x + dir * 60, sy = w.y - 170;
  for (const fl of fat.flies) {
    const gather = clamp((t - 0.3 - fl.h * 0.4) / 0.6, 0, 1), leave = clamp((t - 2.05) / 0.9, 0, 1);
    const cx = l.x + Math.cos(fl.a + t * fl.sp) * 70 * fl.r, cy = l.y - hH * (0.15 + 0.8 * fl.h) + Math.sin(fl.ph + t * fl.sp * 1.3) * 26;
    let x = lerp(sx, cx, gather), y = lerp(sy, cy, gather);
    if (gather <= 0) continue;
    if (leave > 0) { x += Math.cos(fl.a) * 900 * leave * fl.d; y += (Math.sin(fl.a) * 500 - 300) * leave * fl.d; }
    if (x < -20 || x > W + 20 || y < -20) continue;
    ctx.fillStyle = "rgba(220,230,240,0.55)";
    const wb = Math.sin(G.time * 60 + fl.ph) > 0 ? 4 : 2;
    ctx.fillRect(x - 5, y - wb - 1, 5, wb); ctx.fillRect(x + 3, y - wb - 1, 5, wb);
    ctx.fillStyle = "#0e0c0a"; ctx.fillRect(x - 2, y - 2, 6, 5);
    ctx.fillStyle = "#7a1a1a"; ctx.fillRect(x + 3, y - 2, 2, 2);
  }
}
function drawBrawlCloud(x, y, r, t, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.strokeStyle = "#2a2230"; ctx.lineWidth = 8; ctx.lineCap = "round";
  for (let i = 0; i < 5; i++) {                       // fists and feet poking out
    const ang = Math.floor(t * 9 + i * 2.3) * 1.7;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * r * 0.4, y + Math.sin(ang) * r * 0.3); ctx.lineTo(x + Math.cos(ang) * r * 0.95, y + Math.sin(ang) * r * 0.7); ctx.stroke();
  }
  for (let i = 0; i < 10; i++) {
    const ang = i / 10 * Math.PI * 2 + t * 2.5;
    const rr = r * (0.42 + 0.1 * Math.sin(t * 17 + i * 3));
    ctx.fillStyle = i % 2 ? "#ece6da" : "#cfc6b6";
    ctx.beginPath(); ctx.arc(x + Math.cos(ang) * r * 0.5, y + Math.sin(ang) * r * 0.32, rr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "#f6f2ea"; ctx.beginPath(); ctx.arc(x, y, r * 0.48, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const ang = Math.floor(t * 7 + i * 5) * 2.1;
    text(i === 1 ? "#@!" : "★", x + Math.cos(ang) * r * 0.85, y + Math.sin(ang) * r * 0.55, { size: 26, align: "center", color: "#ffe27a", stroke: "#000", strokeW: 4, alpha: a, shadow: false });
  }
}
function drawSunglasses(x, y, dir, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); if (dir < 0) ctx.scale(-1, 1);
  const im = img("fx.sunglasses");
  if (im) { ctx.drawImage(im, -26, -6, 52, 52 * im.height / im.width); ctx.restore(); return; }
  ctx.fillStyle = "#c8323a"; ctx.fillRect(-22, -2, 44, 3);                                // red frame bar
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath(); ctx.ellipse(-11, 4, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, 4, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(-16, 0, 4, 2); ctx.fillRect(7, 0, 4, 2);
  ctx.restore();
}
const FACE_EYE = [19, -215];   // glowing eyes on the no-glasses pose, from the feet anchor
function drawLaserEyes(x, y, dir, k, t, bare) {
  ctx.save();
  if (!bare) { ctx.fillStyle = `rgba(40,8,8,${0.9 * k})`; ctx.fillRect(x - 15, y - 6, 30, 13); }   // hides the painted lenses
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, 1, x, y, 46 * k);
  g.addColorStop(0, `rgba(255,60,40,${0.9 * k})`); g.addColorStop(1, "rgba(255,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(x - 50, y - 50, 100, 100);
  ctx.fillStyle = `rgba(255,${200 + 55 * Math.sin(t * 30)},200,${k})`;
  ctx.fillRect(x - 10, y - 2, 7, 5); ctx.fillRect(x + 4, y - 2, 7, 5);
  ctx.restore();
}
function drawLaser(x0, y0, x1, y1, t) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
  const w = 1 + 0.25 * Math.sin(t * 60);
  ctx.strokeStyle = "rgba(255,30,20,0.35)"; ctx.lineWidth = 22 * w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = "rgba(255,70,50,0.8)"; ctx.lineWidth = 9 * w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = "rgba(255,240,230,0.95)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  const g = ctx.createRadialGradient(x1, y1, 2, x1, y1, 50);
  g.addColorStop(0, "rgba(255,240,200,0.9)"); g.addColorStop(1, "rgba(255,40,0,0)");
  ctx.fillStyle = g; ctx.fillRect(x1 - 50, y1 - 50, 100, 100);
  ctx.restore();
}
// a pose rendered as a chunky 8-bit sprite: scaled down, every `px` pixels become one block
const pixCache = new Map();
function drawPixelPose(cid, name, x, y, dir, scale, px, sy = 1, sx = 1) {
  const fr = frameOf(cid, name); if (!fr) return;
  const key = cid + name + px;
  let c = pixCache.get(key);
  if (!c) {
    const w = Math.max(1, Math.round(fr.image.width / px)), h = Math.max(1, Math.round(fr.image.height / px));
    c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = true; g.drawImage(fr.image, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h);                  // hard alpha + fewer colours = retro look
    for (let i = 0; i < d.data.length; i += 4) { d.data[i + 3] = d.data[i + 3] > 110 ? 255 : 0; for (let j = 0; j < 3; j++) d.data[i + j] = Math.round(d.data[i + j] / 48) * 48; }
    g.putImageData(d, 0, 0); pixCache.set(key, c);
  }
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y)); ctx.scale(dir * scale * sx, scale * sy);
  ctx.drawImage(c, -fr.ax, -fr.ay, fr.image.width, fr.image.height);
  ctx.restore();
}
const ACID_COLS = ["#7dff3a", "#b8ff5a", "#3acc2a", "#e4ff9a"];
function drawAcidBottle(x, y, rot, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(0, 18, 4, 0, 18, 60); g.addColorStop(0, "rgba(125,255,58,0.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(-60, -42, 120, 120); ctx.restore();
  ctx.fillStyle = "rgba(60,90,50,0.9)"; ctx.fillRect(-7, -30, 14, 22);                 // neck
  ctx.fillStyle = "#2a2a2a"; ctx.fillRect(-8, -36, 16, 8);                             // cap
  ctx.fillStyle = "rgba(70,110,60,0.95)"; ctx.beginPath(); ctx.moveTo(-7, -10); ctx.lineTo(-20, 4); ctx.lineTo(-20, 56); ctx.lineTo(20, 56); ctx.lineTo(20, 4); ctx.lineTo(7, -10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(125,255,58,${0.85 + 0.15 * Math.sin(t * 10)})`; ctx.fillRect(-17, 14, 34, 39);   // the glowing liquid
  ctx.fillStyle = "#f2f2e8"; ctx.fillRect(-14, 22, 28, 20);                            // label
  ctx.fillStyle = "#1a1a1a"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center"; ctx.fillText("☠", 0, 38);
  ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(-16, 6, 4, 44);
  ctx.restore();
}
function drawAcidPuddle(x, k, t) {
  const rx = 40 + 120 * k, ry = 10 + 18 * k;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, FLOOR_Y, 4, x, FLOOR_Y, rx * 1.3);
  g.addColorStop(0, "rgba(125,255,58,0.35)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(x - rx * 1.3, FLOOR_Y - 80, rx * 2.6, 110);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#3acc2a"; ctx.beginPath(); ctx.ellipse(x, FLOOR_Y + 2, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#7dff3a"; ctx.beginPath(); ctx.ellipse(x - 8, FLOOR_Y, rx * 0.8, ry * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(230,255,180,0.6)"; ctx.beginPath(); ctx.ellipse(x - rx * 0.35, FLOOR_Y - 3, rx * 0.25, ry * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 7; i++) {                                                         // bubbles popping
    const ph = (t * 1.4 + i * 0.37) % 1, bx = x + Math.sin(i * 2.7) * rx * 0.7, r = 3 + 7 * ph;
    ctx.strokeStyle = `rgba(220,255,180,${0.9 * (1 - ph)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, FLOOR_Y - r * 0.6, r, Math.PI, 0); ctx.stroke();
  }
  ctx.restore();
}
function carX(fat, t, w) {
  const dir = fat.dir, edge = dir > 0 ? -420 : W + 420, stop = fat.x0 - dir * 250, away = dir > 0 ? -520 : W + 520;
  if (t < 0.7) return lerp(edge, stop, easeOut(t / 0.7));
  if (t < 2.3) return stop;
  const k = (t - 2.3) / 0.9; return lerp(stop, away, k * k);
}
function drawKorzhCar(x, face, t) {
  const im = img("fx.korzh_car");
  ctx.save(); ctx.translate(x, FLOOR_Y + 4); if (face < 0) ctx.scale(-1, 1);
  if (t > 1.75 && t < 2.1) ctx.translate(0, Math.sin(t * 50) * 3);          // bounces as he is stuffed in
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(0, 0, 260, 13, 0, 0, Math.PI * 2); ctx.fill();
  if (im) ctx.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight);
  else { const car = img("fx.cadillac"); if (car) ctx.drawImage(car, -260, -180, 520, 180); }
  ctx.restore();
}
function teaX(fat) { const l = F.fighters[fat.l]; return clamp(l.x + fat.dir * 230, 170, W - 170); }
const MUG = {"w": 350, "h": 389, "cx": 129, "rim": 261};
function drawMug(x, y, part, t, label) {
  const mim = img("fx.mug");
  if (mim) {
    if (part !== "front") return;
    ctx.drawImage(mim, x - MUG.cx, y - MUG.h);
    if (label) {
      const top = y - MUG.rim;
      ctx.save(); ctx.strokeStyle = "#f0e8d0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 60, top + 10); ctx.quadraticCurveTo(x - 110, top - 10, x - 140, top + 70); ctx.stroke();
      ctx.fillStyle = "#f2c94c"; ctx.fillRect(x - 188, top + 70, 96, 40); ctx.strokeStyle = "#7a5a10"; ctx.strokeRect(x - 188, top + 70, 96, 40); ctx.restore();
      text(label.length > 9 ? label.slice(0, 9) : label, x - 140, top + 91, { size: 12, font: FONT_PIX, align: "center", color: "#3a2a08", shadow: false });
    }
    return;
  }
  const w = 240, h = 210, top = y - h;
  ctx.save();
  if (part === "back") {
    ctx.fillStyle = "#d9d2c4"; ctx.beginPath(); ctx.ellipse(x, top, w / 2, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7a3e14"; ctx.beginPath(); ctx.ellipse(x, top + 8, w / 2 - 12, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,200,140,0.35)"; ctx.beginPath(); ctx.ellipse(x - 30, top + 4, 40, 7, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = "#e8e2d4"; ctx.lineWidth = 22;                       // handle
    ctx.beginPath(); ctx.arc(x + w / 2 + 6, top + h * 0.45, 48, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, "#c9c1b0"); g.addColorStop(0.35, "#fbf8f0"); g.addColorStop(1, "#b8af9c");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x - w / 2 + 8, y - 16); ctx.quadraticCurveTo(x - w / 2 + 12, y, x - w / 2 + 30, y);
    ctx.lineTo(x + w / 2 - 30, y); ctx.quadraticCurveTo(x + w / 2 - 12, y, x + w / 2 - 8, y - 16); ctx.lineTo(x + w / 2, top);
    ctx.ellipse(x, top, w / 2, 30, 0, 0, Math.PI, false); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8a8070"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, top, w / 2, 30, 0, 0, Math.PI, false); ctx.stroke();
    ctx.fillStyle = "#c8323a"; ctx.font = "bold 30px sans-serif"; ctx.textAlign = "center"; ctx.fillText("♥", x - 10, top + 120);
    if (label) {                                                              // tea bag tag over the rim
      ctx.strokeStyle = "#f0e8d0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 60, top + 10); ctx.quadraticCurveTo(x - 110, top - 10, x - 112, top + 70); ctx.stroke();
      ctx.fillStyle = "#f2c94c"; ctx.fillRect(x - 160, top + 70, 96, 40); ctx.strokeStyle = "#7a5a10"; ctx.strokeRect(x - 160, top + 70, 96, 40);
      ctx.restore(); text(label.length > 9 ? label.slice(0, 9) : label, x - 112, top + 91, { size: 12, font: FONT_PIX, align: "center", color: "#3a2a08", shadow: false }); ctx.save();
    }
    for (let i = 0; i < 3; i++) {                                           // steam
      const s = (t * 0.7 + i / 3) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - s)})`; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x - 50 + i * 50, top - 20 - s * 120); ctx.quadraticCurveTo(x - 30 + i * 50 + Math.sin(t * 3 + i) * 20, top - 60 - s * 120, x - 50 + i * 50, top - 100 - s * 120); ctx.stroke();
    }
  }
  ctx.restore();
}
function wolfPos(fat, t, w, l) {
  const dir = fat.dir;
  if (t < 0.75) return null;
  if (t < 1.2) { const k = (t - 0.75) / 0.45, x0 = dir > 0 ? -200 : W + 200; return { x: lerp(x0, l.x, k), y: FLOOR_Y - Math.sin(k * Math.PI) * 160, dir }; }
  const k = (t - 1.2) / 0.9, x1 = dir > 0 ? W + 400 : -400;
  if (k > 1) return null;
  return { x: lerp(l.x, x1, k * k), y: FLOOR_Y, dir, carry: true };
}
function drawWolf(x, y, dir, t, carried) {
  const im = img("fx.wolf");
  ctx.save(); ctx.translate(x, y); if (dir < 0) ctx.scale(-1, 1);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(0, FLOOR_Y - y + 2, 150, 11, 0, 0, Math.PI * 2); ctx.fill();
  let mouth = [150, -150];
  if (im) { ctx.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight); mouth = [im.naturalWidth * 0.43, -im.naturalHeight * 0.52]; }
  else {
    const m = img("fx.monkey");
    if (m) { const ww = 404 * 1.5, hh = 188 * 1.5; ctx.drawImage(m, -ww / 2, -hh, ww, hh); ctx.globalAlpha = 0.7; ctx.drawImage(silhouette(m, "#5a5f6a"), -ww / 2, -hh, ww, hh); ctx.globalAlpha = 1; }
  }
  if (carried) {                                                // the victim hangs from the jaws
    const fr = frameOf(carried.cid, "hurt");
    if (fr) { ctx.save(); ctx.translate(mouth[0], mouth[1] + 20); ctx.rotate(Math.PI / 2 + Math.sin(t * 16) * 0.12); ctx.scale(0.8, 0.8); ctx.drawImage(fr.image, -fr.ax, -fr.ay * 0.55); ctx.restore(); }
  }
  ctx.restore();
}
function drawLake(x, k, t) {
  const rx = 190 * k, ry = 34 * k;
  ctx.save();
  const g = ctx.createRadialGradient(x, FLOOR_Y, 4, x, FLOOR_Y, rx);
  g.addColorStop(0, "#0c2a36"); g.addColorStop(0.8, "#174a5a"); g.addColorStop(1, "#2a6a7a");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, FLOOR_Y + 2, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(170,230,255,0.45)"; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const s = (t * 0.8 + i / 3) % 1; ctx.beginPath(); ctx.ellipse(x, FLOOR_Y + 2, rx * s, ry * s, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
function drawLakeMonster(x, y, dir, t) {
  const im = img("fx.amphibian");
  ctx.save(); ctx.translate(x, y); if (dir < 0) ctx.scale(-1, 1);
  if (im) ctx.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight);
  else { const z = img("fx.zilla"); if (z) { const ww = 340, hh = 290; ctx.drawImage(z, -ww / 2, -hh, ww, hh); ctx.globalAlpha = 0.55; ctx.drawImage(silhouette(z, "#3f7a3a"), -ww / 2, -hh, ww, hh); } }
  ctx.restore();
}
function drawFox(x, y, dir, t, full) {
  const im = img(full ? "fx.fox_full" : "fx.fox") || img("fx.fox");
  ctx.save(); ctx.translate(x, y); if (dir < 0) ctx.scale(-1, 1);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(0, FLOOR_Y - y + 2, full ? 90 : 70, 9, 0, 0, Math.PI * 2); ctx.fill();
  if (full) ctx.scale(1 + 0.03 * Math.sin(t * 6), 1 - 0.02 * Math.sin(t * 6));   // breathing with a full belly
  if (im) ctx.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight);
  else { const m = img("fx.monkey"); if (m) { const ww = 260, hh = 121; ctx.drawImage(m, -ww / 2, -hh, ww, hh); ctx.globalAlpha = 0.6; ctx.drawImage(silhouette(m, "#e0782a"), -ww / 2, -hh, ww, hh); } }
  ctx.restore();
}
function hearseX(fat, t, w, l) {
  const dir = fat.dir, edge = dir > 0 ? -380 : W + 380, stopNear = w.x - dir * 60, endX = clamp(l.x + dir * 330, 260, W - 260);
  if (t < 0.6) return lerp(edge, stopNear, easeOut(t / 0.6));
  if (t < 1.0) return stopNear;
  if (t < 1.75) { const k = (t - 1.0) / 0.75; return lerp(stopNear, endX, k * k * (3 - 2 * k)); }
  return endX;
}
function drawHearse(x, dir, t) {
  const hs = img("fx.hearse");
  if (hs) {
    ctx.save(); ctx.translate(x, FLOOR_Y + 4); if (dir < 0) ctx.scale(-1, 1);
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(0, 0, 330, 13, 0, 0, Math.PI * 2); ctx.fill();
    if (t > 1.0 && t < 1.75) ctx.translate(0, Math.sin(t * 60) * 2);
    if (t > 1.7 && t < 1.95) ctx.rotate(-0.025 * Math.sin((t - 1.7) / 0.25 * Math.PI));     // nose dips on the brake
    ctx.drawImage(hs, -hs.naturalWidth / 2, -hs.naturalHeight);
    ctx.restore();
    return;
  }
  const car = img("fx.cadillac");
  ctx.save(); ctx.translate(x, FLOOR_Y + 14); if (dir < 0) ctx.scale(-1, 1);
  if (t > 1.0 && t < 1.75) ctx.translate(0, Math.sin(t * 60) * 2);
  ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(0, -6, 245, 14, 0, 0, Math.PI * 2); ctx.fill();
  if (car) {
    ctx.drawImage(car, -295, -205, 590, 205);
    if (!img("fx.hearse")) { ctx.globalAlpha = 0.78; ctx.drawImage(silhouette(car, "#0c0a10"), -295, -205, 590, 205); ctx.globalAlpha = 1;
      ctx.fillStyle = "#c9b27a"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; ctx.fillText("✝", 0, -120); }
  }
  ctx.restore();
}
function storkPos(fat, t) {
  const l = F.fighters[fat.l], dir = fat.dir;
  const fr = frameOf(l.cid, "hurt"), hH = fr ? fr.ay : 230;
  const grabY = l.y - hH - 40;
  if (t < 1.1) { const k = easeOut(t / 1.1); return { x: lerp(dir > 0 ? -150 : W + 150, l.x, k), y: lerp(-180, grabY, k) }; }
  const u = t - 1.1;
  return { x: l.x + dir * 170 * u, y: grabY - 150 * u - 90 * u * u + Math.sin(u * 12) * 6 };
}
function drawStorkSunset(fat, t, k) {
  const dir = fat.dir, sx = dir > 0 ? W * 0.8 : W * 0.2, sy = FLOOR_Y - 175;
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
  g.addColorStop(0, `rgba(90,20,80,${0.35 * k})`); g.addColorStop(0.6, `rgba(255,110,60,${0.42 * k})`); g.addColorStop(1, `rgba(255,170,70,${0.55 * k})`);
  ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, FLOOR_Y + 60);
  const glow = ctx.createRadialGradient(sx, sy, 20, sx, sy, 260);
  glow.addColorStop(0, `rgba(255,220,120,${0.7 * k})`); glow.addColorStop(1, "rgba(255,140,60,0)");
  ctx.fillStyle = glow; ctx.fillRect(sx - 260, sy - 260, 520, 520);
  ctx.beginPath(); ctx.arc(sx, sy, 92, 0, Math.PI * 2); ctx.clip();       // retro striped sun
  const sg = ctx.createLinearGradient(0, sy - 92, 0, sy + 92);
  sg.addColorStop(0, `rgba(255,236,140,${k})`); sg.addColorStop(1, `rgba(255,96,70,${k})`);
  ctx.fillStyle = sg; ctx.fillRect(sx - 92, sy - 92, 184, 184);
  ctx.fillStyle = `rgba(120,30,70,${0.8 * k})`;
  for (let i = 0; i < 5; i++) ctx.fillRect(sx - 92, sy + 18 + i * 15, 184, 3 + i * 1.5);
  ctx.restore();
  // the stork with the victim, a dark silhouette shrinking towards the sun
  const u = clamp((t - 2.7) / 1.8, 0, 1);
  if (u <= 0 || u >= 1) return;
  const e = easeOut(u), x = lerp(sx - dir * 430, sx, e), y = lerp(150, sy - 20, e), sc = lerp(0.42, 0.06, e);
  const up = Math.floor(t * 5) % 2 === 1, im = img(up ? "fx.stork_2" : "fx.stork_1");
  const l = F.fighters[fat.l], fr = frameOf(l.cid, "hurt");
  ctx.save(); ctx.translate(x, y + Math.sin(t * 6) * 4 * sc); ctx.scale(dir * sc, sc);
  ctx.globalAlpha = 0.95 * (1 - clamp((u - 0.85) / 0.15, 0, 1));
  if (fr) ctx.drawImage(silhouette(fr.image, "#2a0c22"), -fr.ax, 40);
  if (im) ctx.drawImage(silhouette(im, "#2a0c22"), -(up ? 150 : 140), 50 - im.naturalHeight);
  ctx.restore();
}
function drawStork(x, y, dir, t) {
  const up = Math.floor(t * 6) % 2 === 1;
  const im = img(up ? "fx.stork_2" : "fx.stork_1");
  ctx.save(); ctx.translate(x, y); if (dir < 0) ctx.scale(-1, 1);
  if (im) ctx.drawImage(im, -(up ? 150 : 140), 50 - im.naturalHeight);      // claws over the victim's head
  else {
    const pg = img(Math.floor(t * 8) % 2 ? "fx.pigeon_2" : "fx.pigeon_1");
    if (pg) { ctx.globalAlpha = 1; ctx.drawImage(pg, -120, -230, 240, 300); ctx.globalAlpha = 0.45; ctx.drawImage(silhouette(pg, "#e8e4dc"), -120, -230, 240, 300); }
  }
  ctx.restore();
}
function drawDora(x, y, dir, t) {
  const swing = t >= 0.8;
  const im = img(swing ? "fx.dora_swing" : "fx.dora_run");
  ctx.save(); ctx.translate(x, y); if (dir < 0) ctx.scale(-1, 1);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(0, 4, 60, 10, 0, 0, Math.PI * 2); ctx.fill();
  if (im) {
    if (swing) ctx.rotate(0.16 * clamp((t - 0.85) / 0.2, 0, 1));                     // leans into the hit
    ctx.drawImage(im, -(swing ? 155 : 227), -im.naturalHeight);
  } else {
    // stand-in until the art arrives: a pink-tinted Maybe with Noize's guitar
    const fr = frameOf("maybe", swing ? "heavy" : (Math.floor(t * 8) % 2 ? "walk_1" : "walk_3"));
    if (fr) { ctx.drawImage(fr.image, -fr.ax, -fr.ay); ctx.globalAlpha = 0.55; ctx.drawImage(silhouette(fr.image, "#ff7ac8"), -fr.ax, -fr.ay); ctx.globalAlpha = 1; }
    const gim = img("fx.guitar");
    if (gim) {
      const k = clamp((t - 0.8) / 0.3, 0, 1);
      const ang = swing ? (-150 + 170 * k) * Math.PI / 180 : -2.4;
      ctx.save(); ctx.translate(20, -190); ctx.rotate(ang);
      const gw = 175, gh = gw * gim.naturalHeight / gim.naturalWidth;
      ctx.drawImage(gim, -0.8 * gw, -0.12 * gh, gw, gh); ctx.restore();
    }
  }
  ctx.restore();
}
function drawBigRose(x, y, rot, sc) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  drawRose({ x: 0, y: 0, rot });
  ctx.restore();
}

function drawIceBlock(x, y, w, h, k, crack) {
  const hh = h * k, top = y + 6 - hh;
  ctx.save();
  const im = img("fx.ice_block");
  if (im) {                                   // the block grows from the floor up: draw only its lower part
    ctx.globalAlpha = 0.6;
    const sh = im.height * k;
    ctx.drawImage(im, 0, im.height - sh, im.width, sh, x - w / 2 - 10, top - 10, w + 20, hh + 14);
    ctx.globalAlpha = 1;
  } else {
  ctx.fillStyle = "rgba(170,225,255,0.33)";
  ctx.fillRect(x - w / 2, top, w, hh);
  const g = ctx.createLinearGradient(x - w / 2, top, x + w / 2, y);
  g.addColorStop(0, "rgba(255,255,255,0.35)"); g.addColorStop(0.5, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(120,190,240,0.3)");
  ctx.fillStyle = g; ctx.fillRect(x - w / 2, top, w, hh);
  ctx.strokeStyle = "rgba(235,250,255,0.9)"; ctx.lineWidth = 4;
  ctx.strokeRect(x - w / 2, top, w, hh);
  ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(x - w / 2 + 14, top + 40); ctx.lineTo(x - w / 2 + 44, top + 10); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - w / 2 + 14, top + 70); ctx.lineTo(x - w / 2 + 70, top + 14); ctx.stroke();
  }
  if (crack > 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 2;
    const cx = x, cy = top + hh * 0.45;
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.3, len = (40 + (i % 3) * 30) * Math.min(1, crack);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * len * 0.5 + 6, cy + Math.sin(a) * len * 0.5); ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); ctx.stroke();
    }
  }
  ctx.restore();
}
function drawIceChunk(x, y, s, r) {
  ctx.save(); ctx.translate(x, y - s * 0.4); ctx.rotate(r);
  const im = img("fx.ice_shard_" + (1 + Math.floor(Math.abs(r) * 7) % 6));
  if (im) { const d = s * 2.6, sc = d / Math.max(im.width, im.height); ctx.drawImage(im, -im.width * sc / 2, -im.height * sc / 2, im.width * sc, im.height * sc); ctx.restore(); return; }
  ctx.fillStyle = "rgba(190,232,255,0.85)"; ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-s, s * 0.4); ctx.lineTo(-s * 0.4, -s * 0.6); ctx.lineTo(s * 0.7, -s * 0.3); ctx.lineTo(s, s * 0.4); ctx.closePath();
  ctx.fill(); ctx.stroke(); ctx.restore();
}

// old CRT television: body, screen (static + cracks when smashed), antennas
// where the head is on a pose: top of the sprite and the middle of its top rows, relative to the feet anchor (cached)
const headCache = new Map();
function headOf(cid, pose) {
  const key = cid + "." + pose;
  if (headCache.has(key)) return headCache.get(key);
  const fr = frameOf(cid, pose); if (!fr) return { x: 0, y: -230 };
  const im = fr.image, c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
  const g = c.getContext("2d"); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, im.width, im.height).data;
  let top = -1, sx = 0, n = 0;
  for (let y = 0; y < im.height && (top < 0 || y < top + 34); y++) for (let x = 0; x < im.width; x++) {
    if (d[(y * im.width + x) * 4 + 3] > 128) { if (top < 0) top = y; sx += x; n++; }
  }
  const r = { x: n ? sx / n - fr.ax : 0, y: (top < 0 ? 0 : top) - fr.ay };
  headCache.set(key, r); return r;
}
function drawTV(x, y, w, h, rot, cracked, on, face) {
  const tim = img("fx.tv");
  if (tim) {
    const tw = w * 1.05, th = tw * tim.naturalHeight / tim.naturalWidth;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.drawImage(tim, -tw / 2, -th * 0.6, tw, th);
    const sx = -tw / 2 + tw * 0.09, sy = -th * 0.6 + th * 0.37, sw = tw * 0.52, sh = th * 0.46;   // the screen
    if (face) {                          // live broadcast: the victim's own face, with scanlines and a flicker
      ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
      ctx.fillStyle = "#1b2a3a"; ctx.fillRect(sx, sy, sw, sh);
      const s2 = Math.max(sw, sh) * 1.05, jx = Math.random() < 0.15 ? rand(-4, 4) : 0;
      ctx.globalAlpha = 0.85 + 0.15 * Math.sin(G.time * 40);
      ctx.drawImage(face, sx + (sw - s2) / 2 + jx, sy + (sh - s2) * 0.3, s2, s2);
      ctx.globalAlpha = 1; ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (let yy = sy; yy < sy + sh; yy += 3) ctx.fillRect(sx, yy, sw, 1);
      ctx.fillStyle = "rgba(140,200,255,0.12)"; ctx.fillRect(sx, sy, sw, sh);
      ctx.restore();
      on = false;
    }
    if (on) for (let i = 0; i < 70; i++) { ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.7)" : "rgba(20,20,20,0.55)"; ctx.fillRect(sx + Math.random() * (sw - 4), sy + Math.random() * (sh - 3), 4, 3); }
    if (cracked) {
      ctx.fillStyle = `rgba(10,12,16,${0.55 * Math.min(1, cracked)})`; ctx.fillRect(sx, sy, sw, sh);   // dead screen
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 2;
      const cx = sx + sw * 0.45, cy = sy + sh * 0.45;
      for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * sw * 0.3 + 4, cy + Math.sin(a) * sh * 0.25); ctx.lineTo(cx + Math.cos(a) * sw * 0.5, cy + Math.sin(a) * sh * 0.5); ctx.stroke(); }
    }
    ctx.restore();
    return;
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-6, -h / 2); ctx.lineTo(-w * 0.28, -h / 2 - 46); ctx.moveTo(6, -h / 2); ctx.lineTo(w * 0.24, -h / 2 - 50); ctx.stroke();
  ctx.fillStyle = "#1a1a1a"; ctx.fillRect(-w * 0.28 - 3, -h / 2 - 49, 6, 6); ctx.fillRect(w * 0.24 - 3, -h / 2 - 53, 6, 6);
  ctx.fillStyle = "#5a3418"; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = "#7a4a26"; ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, 10);
  ctx.strokeStyle = "#2b170a"; ctx.lineWidth = 4; ctx.strokeRect(-w / 2, -h / 2, w, h);
  const sx = -w / 2 + 12, sy = -h / 2 + 14, sw = w * 0.66, sh = h - 28;
  ctx.fillStyle = on ? "#556066" : "#2c3a36"; ctx.fillRect(sx, sy, sw, sh);
  if (on) {
    for (let i = 0; i < 60; i++) { ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.75)" : "rgba(20,20,20,0.6)"; ctx.fillRect(sx + Math.random() * (sw - 4), sy + Math.random() * (sh - 3), 4, 3); }
  } else { ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(sx + 8, sy + 6, sw * 0.35, 6); }
  if (cracked) {
    ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 2;
    const cx = sx + sw * 0.45, cy = sy + sh * 0.45;
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * sw * 0.3, cy + Math.sin(a) * sh * 0.45); ctx.stroke(); }
  }
  ctx.strokeStyle = "#1a1008"; ctx.lineWidth = 3; ctx.strokeRect(sx, sy, sw, sh);
  ctx.fillStyle = "#c9a35a";
  ctx.beginPath(); ctx.arc(w / 2 - 22, -h / 2 + 30, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w / 2 - 22, -h / 2 + 56, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2b170a"; for (let i = 0; i < 4; i++) ctx.fillRect(w / 2 - 32, h / 2 - 34 + i * 6, 20, 2);
  ctx.restore();
}

function drawBodyFire(x, y, h, k) {
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y - h * 0.5, 10, x, y - h * 0.5, h * 0.9);
  g.addColorStop(0, `rgba(255,150,50,${0.5 * k})`); g.addColorStop(1, "rgba(255,80,20,0)");
  ctx.fillStyle = g; ctx.fillRect(x - h, y - h * 1.5, h * 2, h * 1.6);
  ctx.restore();
  for (let i = 0; i < 11; i++) {
    const fx = x - 80 + i * 16 + Math.sin(G.time * 5 + i) * 4;
    const base = y + 4 - (i % 3) * 30;
    const fh = (h * 0.55 + h * 0.45 * Math.abs(Math.sin(G.time * 8 + i * 1.9))) * k * (1 - Math.abs(i - 5) / 9);
    const fw = 40;
    ctx.fillStyle = `rgba(255,${80 + (i % 3) * 35},20,${0.85 * k})`;
    ctx.beginPath(); ctx.moveTo(fx - fw / 2, base); ctx.quadraticCurveTo(fx - fw / 3, base - fh * 0.6, fx + Math.sin(G.time * 7 + i) * 8, base - fh);
    ctx.quadraticCurveTo(fx + fw / 3, base - fh * 0.6, fx + fw / 2, base); ctx.fill();
    ctx.fillStyle = `rgba(255,230,140,${0.75 * k})`;
    ctx.beginPath(); ctx.moveTo(fx - fw / 4, base); ctx.quadraticCurveTo(fx, base - fh * 0.5, fx + fw / 4, base); ctx.fill();
  }
}

function drawDustPile(x, y, k, t) {
  const w = 62 * k, h = 30 * k;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(x, y + 3, w + 8, 7, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(0, y - h, 0, y);
  g.addColorStop(0, "#9a928a"); g.addColorStop(1, "#4a4440");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x - w, y + 2); ctx.quadraticCurveTo(x - w * 0.5, y - h * 0.6, x, y - h); ctx.quadraticCurveTo(x + w * 0.5, y - h * 0.6, x + w, y + 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(30,26,24,0.7)";
  for (let i = 0; i < 12; i++) { const a = (i * 37) % 100 / 100; ctx.fillRect(x - w * 0.7 + a * w * 1.4, y - h * 0.15 - ((i * 13) % 10) / 10 * h * 0.6, 3, 3); }
  // thin smoke
  if (k >= 1) for (let i = 0; i < 3; i++) {
    const s = ((t * 0.5 + i / 3) % 1);
    ctx.fillStyle = `rgba(180,175,170,${0.35 * (1 - s)})`;
    ctx.beginPath(); ctx.arc(x + Math.sin(t * 2 + i * 2) * 10, y - h - s * 90, 6 + s * 12, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawDazedStars(f) {
  const fr = frameOf(f.cid, "hurt"), y = f.y - (fr ? fr.ay : 230) - 6;
  for (let i = 0; i < 4; i++) {
    const a = G.time * 3.2 + i * Math.PI / 2;
    const x = f.x + Math.cos(a) * 46, yy = y + Math.sin(a) * 10;
    text("★", x, yy, { size: 20, align: "center", color: Math.sin(a) > 0 ? "#ffe27a" : "#fff6c8", shadow: false });
  }
}

function drawFinishHim() {
  const t = F.phaseT;
  const k = easeOut(clamp(t / 0.35, 0, 1));
  const pulse = 1 + 0.05 * Math.sin(G.time * 10);
  bigText("ДОБЕЙ ЕГО!", 205, 110, ["#fff0f0", "#ff5a4a", "#a00000"], (2 - k) * pulse, Math.min(1, t * 4));
  const w = F.fighters[F.finish.w];
  if (t > 0.5 && !w.isBot && !G.botVsBot) {
    const hint = FATALITIES[w.cid] ? "УДАР — ПОБЕДА    •    СПЕЦ — ФАТАЛИТИ" : "БЕЙ!";
    text(hint, W / 2, 278, { size: 24, align: "center", color: "#fff6c8", stroke: "#000", strokeW: 5, alpha: clamp((t - 0.5) * 3, 0, 1) });
  }
  // countdown bar
  const left = clamp(1 - t / FINISH_TIME, 0, 1);
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(W / 2 - 160, 302, 320, 8);
  ctx.fillStyle = "#ff4a3d"; ctx.fillRect(W / 2 - 160, 302, 320 * left, 8);
}

// "<NAME> ПОКИНУЛ ИГРУ" — a system message like in an online lobby
function drawQuitNotice(fat) {
  const t = (F.phase === "fatality" ? fat.t : fat.dur + F.phaseT) - 1.3;
  if (t < 0) return;
  const l = F.fighters[fat.l];
  const msg = `${l.data.name} ПОКИНУЛ ИГРУ`;
  const k = easeOut(clamp(t / 0.25, 0, 1));
  const w = Math.max(420, textWidth(msg, 24, FONT_PIX) + 90), h = 58, x = W / 2 - w / 2, y = H / 2 - 70 + (1 - k) * 30;
  ctx.save(); ctx.globalAlpha = k;
  ctx.fillStyle = "rgba(10,10,14,0.88)"; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#5a5a66"; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = "#ff5a5a"; ctx.fillRect(x + 18, y + 22, 14, 14);
  ctx.restore();
  text(msg, x + 46, y + h / 2 + 1, { size: 24, font: FONT_PIX, color: "#d8d8e0", shadow: false, alpha: k });
}
function drawFatalityTitle() {
  const fat = F.fat;
  {                                      // cinema bars for every fatality
    const tt = F.phase === "fatality" ? fat.t : fat.dur + F.phaseT;
    const bh = 70 * easeOut(clamp(tt / 0.5, 0, 1));
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
  }
  if (fat.kind === "elements") {
    const tt = F.phase === "fatality" ? fat.t : fat.dur + F.phaseT;
    if (fat.cflash && tt - fat.cflash.t < 0.35) { ctx.save(); ctx.globalAlpha = 0.3 * (1 - (tt - fat.cflash.t) / 0.35); ctx.fillStyle = fat.cflash.c; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  const t = (F.phase === "fatality" ? fat.t : fat.dur + F.phaseT) - fat.titleAt;
  if (t < 0) return;
  const k = easeOut(clamp(t / 0.25, 0, 1));
  const pink = fat.kind === "rose";
  bigText(fat.title, H / 2 - 150, fat.title.length > 9 ? 100 : 120, pink ? ["#fff0f6", "#ff5fa2", "#8a0040"] : ["#ffe6e0", "#ff3a2a", "#7a0000"], 1.8 - 0.8 * k, Math.min(1, t * 5));
  if (fat.kind === "quit") drawQuitNotice(fat);
  if (t > 0.45 && fat.caption) {
    const k2 = easeOut(clamp((t - 0.45) / 0.3, 0, 1));
    text(fat.caption, W / 2, H / 2 - 50, { size: fitText(fat.caption, W - 120, 40), align: "center", gradient: ["#fff6c8", "#ffd54a", "#ff9a2e"], stroke: "#1a0830", strokeW: 7, alpha: k2 });
  }
}

function drawFight() {
  const [a, b] = F.fighters;
  const mid = (a.x + b.x) / 2 - W / 2;
  F.camX = lerp(F.camX, mid, 0.08);

  ctx.save();
  if (F.shake > 0) ctx.translate(rand(-1, 1) * F.shake, rand(-1, 1) * F.shake * 0.6);
  const push = F.fat ? fatCamPush(F.fat) : 0;
  if (push > 0) {                         // fatality push-in onto the victim
    const z = 1 + 0.16 * push, zx = clamp(F.fat.camX, 360, W - 360), zy = F.fat.camY;
    ctx.translate(zx, zy); ctx.scale(z, z); ctx.translate(-zx, -zy);
  }
  if (F.zoom > 0.002) {                  // impact zoom punch towards the hit
    const z = 1 + F.zoom, zx = clamp(F.zoomX, 300, W - 300), zy = F.zoomY;
    ctx.translate(zx, zy); ctx.scale(z, z); ctx.translate(-zx, -zy);
    F.zoom *= 0.86;
  }

  drawStage(G.stage, F.camX);
  drawAmbient();
  const sk = F.fighters.find((x) => x.cid === "smoky" && x.action && x.action.type === "special");
  if (sk && !F.fat) { const k = Math.min(1, sk.action.t / 0.3, Math.max(0, (1.25 - sk.action.t) / 0.3)); ctx.fillStyle = `rgba(10,12,24,${0.45 * k})`; ctx.fillRect(-60, -60, W + 120, H + 120); }
  if (F.phase === "finish" || F.fat) {
    const k = F.fat ? clamp(fatClock() / 0.4, 0, 1) : clamp(F.phaseT / 0.5, 0, 1) * 0.5;
    ctx.fillStyle = `rgba(14,0,4,${(F.fat ? 0.74 : 0.62) * k})`;
    ctx.fillRect(-60, -60, W + 120, H + 120);
    if (F.fat) {                          // spotlight on the two fighters, darker edges
      const [p0, p1] = F.fighters, cx = (p0.x + p1.x) / 2;
      const g = ctx.createRadialGradient(cx, FLOOR_Y - 150, 120, cx, FLOOR_Y - 150, 760);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${0.55 * k})`);
      ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120);
    }
  }

  // draw the attacking fighter on top
  const order = [a, b].sort((p, q) => (p.action ? 1 : 0) - (q.action ? 1 : 0) || (p.ko ? -1 : 0));
  for (const f of order) drawFighter(f);
  drawProjectiles();
  drawParticles();
  drawEasterFx();
  if (G.stage === "bar") drawBarCrowd(F.camX);
  ctx.restore();

  drawVignette();
  drawPeek();
  drawCadillacWarning();
  if (!F.fat) drawHUD();                                          // fatalities play in letterbox, no HUD
  drawComboBanner();
  drawQuote();
  drawFightOverlays();
  drawSuperCut();
  if (G.tutorial && !G.paused) drawTutorial();

  if (F.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${F.flash * 0.8})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (G.paused) drawPause();
}

/* HUD ---------------------------------------------------------------- */
function drawHUD() {
  const [a, b] = F.fighters;
  drawSide(a, 0);
  drawSide(b, 1);

  // Timer plate
  const tx = W / 2;
  ctx.save();
  ctx.fillStyle = "rgba(8,6,20,0.9)";
  ctx.beginPath();
  ctx.moveTo(tx - 62, 14); ctx.lineTo(tx + 62, 14); ctx.lineTo(tx + 52, 92); ctx.lineTo(tx - 52, 92);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.restore();
  const secs = Math.ceil(F.timer);
  const low = secs <= 10 && F.phase === "fight";
  text(String(secs).padStart(2, "0"), tx, 50, {
    size: 34, font: FONT_PIX, align: "center",
    color: low ? (Math.floor(G.time * 4) % 2 ? "#ff5a5a" : "#fff") : CREAM, shadowOff: 3,
  });
  text(`РАУНД ${F.round}`, tx, 80, { size: 13, font: FONT_PIX, align: "center", color: "#c9c2ff", shadow: false });
  if (G.mode === 1) text(`БОТ: ${F.diff.label}`, tx, 112, { size: 15, align: "center", color: "#d6e7ff", stroke: "#000", strokeW: 4 });
  const badges = cheatBadges();
  if (badges) text(badges, tx, G.mode === 1 ? 134 : 112, { size: 14, align: "center", color: "#ff86d8", stroke: "#000", strokeW: 4 });
}

function drawSuperMeter(f, left) {
  const sw = 300, sh = 14;
  const x = left ? 24 : W - 24 - sw, y = H - 30;
  const v = clamp((f.super || 0) / 100, 0, 1);
  const full = v >= 1;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(x - 3, y - 3, sw + 6, sh + 6);
  ctx.fillStyle = "#1a1036";
  ctx.fillRect(x, y, sw, sh);
  const g = ctx.createLinearGradient(x, 0, x + sw, 0);
  g.addColorStop(0, full ? "#fff6c8" : "#4aa8ff"); g.addColorStop(1, full ? GOLD : "#b06cff");
  ctx.fillStyle = g;
  const fw = sw * v;
  ctx.fillRect(left ? x : x + sw - fw, y, fw, sh);
  for (let i = 1; i < 4; i++) { ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x + (sw * i) / 4, y, 2, sh); }
  if (full) {
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255,230,140,${0.25 + 0.25 * Math.sin(G.time * 10)})`;
    ctx.fillRect(x, y, sw, sh);
  }
  ctx.restore();
  ctx.strokeStyle = full ? GOLD : "rgba(255,213,74,0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 1, y - 1, sw + 2, sh + 2);
  const label = full ? (f.isBot ? "ПАНЧ ГОТОВ!" : (padMode ? "ПАНЧ! ЖМИ Y" : "ПАНЧ! ЗАЖМИ ОБА УДАРА")) : "ПАНЧ";
  text(label, left ? x : x + sw, y - 12, { size: full ? 12 : 10, font: FONT_PIX, align: left ? "left" : "right",
    color: full ? GOLD : "#c9c2ff", stroke: "#000", strokeW: 4, alpha: full ? 0.75 + 0.25 * Math.sin(G.time * 10) : 1 });
}

function drawSide(f, side) {
  drawSuperMeter(f, side === 0);
  const left = side === 0;
  const pw = 78;
  const px = left ? 22 : W - 22 - pw;
  const py = 14;

  // Portrait
  ctx.save();
  ctx.fillStyle = "#0d0f26";
  ctx.fillRect(px, py, pw, pw);
  const g = ctx.createLinearGradient(px, py, px, py + pw);
  g.addColorStop(0, "#2b1b68");
  g.addColorStop(1, "#0d0f26");
  ctx.fillStyle = g;
  ctx.fillRect(px, py, pw, pw);
  const portrait = img("portrait." + f.cid);
  if (portrait) {
    ctx.save();
    if (!left) { ctx.translate(px + pw, py); ctx.scale(-1, 1); ctx.drawImage(portrait, 0, 0, pw, pw); }
    else ctx.drawImage(portrait, px, py, pw, pw);
    ctx.restore();
    if (f.twin) { ctx.fillStyle = "rgba(70,10,110,0.5)"; ctx.fillRect(px, py, pw, pw); }
    if (f.flash > 0) { ctx.fillStyle = "rgba(255,60,60,0.45)"; ctx.fillRect(px, py, pw, pw); }
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = f.isBot ? "#ff8a8a" : P_COLORS[f.slot];
  ctx.strokeRect(px + 1.5, py + 1.5, pw - 3, pw - 3);
  ctx.restore();

  // HP bar (slanted)
  const bw = 430, bh = 30;
  const bx = left ? px + pw + 14 : px - 14 - bw;
  const by = 20;
  const slant = 14;
  const shape = (x, w) => {
    ctx.beginPath();
    if (left) { ctx.moveTo(x, by); ctx.lineTo(x + w, by); ctx.lineTo(x + w - slant, by + bh); ctx.lineTo(x, by + bh); }
    else { ctx.moveTo(x, by); ctx.lineTo(x + w, by); ctx.lineTo(x + w, by + bh); ctx.lineTo(x + slant, by + bh); }
    ctx.closePath();
  };
  ctx.save();
  shape(bx - 4, bw + 8);
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fill();
  shape(bx, bw);
  ctx.clip();
  ctx.fillStyle = "#2a0d16";
  ctx.fillRect(bx, by, bw, bh);
  const trailW = bw * f.trailHp / 100;
  const hpW = bw * f.shownHp / 100;
  ctx.fillStyle = "#ff4747";
  ctx.fillRect(left ? bx : bx + bw - trailW, by, trailW, bh);
  const hg = ctx.createLinearGradient(0, by, 0, by + bh);
  const low = f.hp <= 30;
  if (low) { hg.addColorStop(0, "#ffd36b"); hg.addColorStop(1, "#ff8a1f"); }
  else { hg.addColorStop(0, "#a8ff7a"); hg.addColorStop(0.5, "#5be35b"); hg.addColorStop(1, "#2a9e3e"); }
  ctx.fillStyle = hg;
  ctx.fillRect(left ? bx : bx + bw - hpW, by, hpW, bh);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(bx, by + 3, bw, 4);
  if (low && Math.floor(G.time * 4) % 2 === 0) { ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(bx, by, bw, bh); }
  ctx.restore();
  ctx.save();
  shape(bx, bw);
  ctx.lineWidth = 3;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.restore();

  // Name + tag
  const nameX = left ? bx : bx + bw;
  text(f.data.name, nameX, by + bh + 20, { size: 24, align: left ? "left" : "right", color: "#fff", stroke: "#000", strokeW: 5 });
  const nameW = textWidth(f.data.name, 24);
  const tag = f.isBot ? "CPU" : (G.mode === 1 ? "1P" : `${f.slot + 1}P`);
  text(tag, left ? nameX + nameW + 12 : nameX - nameW - 12, by + bh + 21, {
    size: 12, font: FONT_PIX, align: left ? "left" : "right", color: f.isBot ? "#ff8a8a" : P_COLORS[f.slot], shadow: false,
  });

  // Round wins
  for (let i = 0; i < ROUNDS_TO_WIN; i++) {
    const cx = left ? bx + bw - 20 - i * 26 : bx + 20 + i * 26;
    const cy = by + bh + 20;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fillStyle = i < F.wins[f.slot] ? GOLD : "rgba(0,0,0,0.6)";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = i < F.wins[f.slot] ? "#fff6c8" : "rgba(255,255,255,0.45)";
    ctx.stroke();
  }

  // Special meter
  const mw = 220, mh = 12;
  const mx = left ? bx : bx + bw - mw;
  const my = by + bh + 42;
  const ready = f.specialCd <= 0;
  const fill = ready ? 1 : 1 - f.specialCd / f.data.specialCd;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
  const mg = ctx.createLinearGradient(mx, 0, mx + mw, 0);
  mg.addColorStop(0, ready ? "#ffe27a" : "#4e7dff");
  mg.addColorStop(1, ready ? "#ff9a3d" : "#8fd3ff");
  ctx.fillStyle = mg;
  const fw = mw * clamp(fill, 0, 1);
  ctx.fillRect(left ? mx : mx + mw - fw, my, fw, mh);
  if (ready) {
    ctx.strokeStyle = `rgba(255,213,74,${0.35 + 0.25 * Math.sin(G.time * 8)})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(mx - 3, my - 3, mw + 6, mh + 6);
    ctx.strokeStyle = "#fff6c8";
    ctx.lineWidth = 2;
    ctx.strokeRect(mx - 1, my - 1, mw + 2, mh + 2);
  }
  ctx.restore();
  let label = ready ? `${f.data.special} • ГОТОВ` : f.data.special;
  if (textWidth(label, 13, FONT_PIX) > 228) label = ready ? f.data.special + "!" : f.data.special;
  text(label, left ? mx + mw + 10 : mx - 10, my + 7, { size: 13, font: FONT_PIX, align: left ? "left" : "right", color: ready ? GOLD : "#c9d8ff", shadowOff: 2 });

  // Combo counter
  if (f.comboShow >= 2) {
    const k = clamp((1.3 - f.comboT) * 8, 0, 1);
    const x = left ? 30 + (1 - easeOut(k)) * -200 : W - 30 + (1 - easeOut(k)) * 200;
    text(`${plural(f.comboShow, "УДАР", "УДАРА", "УДАРОВ")}!`, x, 250, { size: 40, align: left ? "left" : "right", gradient: ["#fff6c8", "#ffd54a", "#ff7a3d"], stroke: "#2a0d00", strokeW: 7 });
    const n = f.comboShow;
    const rate = n >= 7 ? "ЛЕГЕНДАРНО!" : n >= 5 ? "ЖЁСТКО!" : n >= 3 ? "НЕПЛОХО" : "КОМБО";
    text(rate, x, 290, { size: n >= 5 ? 26 : 20, font: n >= 3 ? FONT_HEAD : FONT_PIX, align: left ? "left" : "right", color: n >= 7 ? "#ff7a3d" : n >= 5 ? GOLD : "#fff", stroke: "#000", strokeW: 5 });
  }
}

function drawComboBanner() {
  const cb = F.comboBanner;
  if (!cb) return;
  cb.t += 1 / 60;
  if (cb.t > 1.1) { F.comboBanner = null; return; }
  const k = cb.t < 0.12 ? cb.t / 0.12 : 1, out = clamp((cb.t - 0.85) / 0.25, 0, 1);
  const sc = 1.6 - 0.6 * easeOut(k);
  ctx.save();
  ctx.globalAlpha = 1 - out;
  ctx.translate(W / 2, 205); ctx.scale(sc, sc); ctx.rotate(-0.05);
  text("КОМБО!", 0, 0, { size: 84, align: "center", gradient: ["#fff6c8", "#ffd54a", "#ff3b2a"], stroke: "#2a0d00", strokeW: 10 });
  ctx.restore();
}

function drawQuote() {
  const q = F.quote;
  if (!q) return;
  const f = F.fighters[q.slot];
  const size = 22;
  const tw = textWidth(q.text, size);
  const bw = tw + 40;
  const bh = 48;
  const x = clamp(f.x - bw / 2, 20, W - 20 - bw);
  const y = clamp(f.y - 330, 130, H - 200);
  const alpha = Math.min(1, q.t / 0.25, (2 - q.t) / 0.15 + 0.2);
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.fillStyle = "#fffdf2";
  roundRect(x, y, bw, bh, 12);
  ctx.fill();
  const tailX = clamp(f.x, x + 20, x + bw - 20);
  ctx.beginPath();
  ctx.moveTo(tailX - 12, y + bh - 1);
  ctx.lineTo(tailX + 12, y + bh - 1);
  ctx.lineTo(tailX + (f.dir === 1 ? -4 : 4), y + bh + 22);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = f.data.color;
  roundRect(x, y, bw, bh, 12);
  ctx.stroke();
  ctx.restore();
  text(q.text, x + bw / 2, y + bh / 2 + 1, { size, align: "center", color: "#16101f", shadow: false, alpha: clamp(alpha, 0, 1) });
}

function bigText(str, y, size, gradient, scaleIn = 1, alpha = 1) {
  ctx.save();
  ctx.translate(W / 2, y);
  ctx.scale(scaleIn, scaleIn);
  text(str, 0, 0, { size, align: "center", gradient, stroke: "#12051f", strokeW: Math.round(size / 7), shadowOff: 6, alpha });
  ctx.restore();
}

// Keyboard reminder at the start of a match (desktop only): who plays with which keys
function drawControlsHint() {
  if ((isTouch && !padSeen) || G.paused || G.tutorial || G.botVsBot || !F || F.round !== 1) return;
  const left = F.hintUntil - G.time;
  if (left <= 0) return;
  const a = clamp(left / 0.8, 0, 1) * clamp((10 - left) / 0.4, 0, 1);
  const two = G.mode === 2;
  const w = two ? 1080 : 760, h = two ? 116 : 92, x = W / 2 - w / 2, y = 118;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = "rgba(8,5,22,0.82)"; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255,213,74,0.7)"; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  const t = (str, tx, ty, size, color, align = "center") => text(str, tx, ty, { size, align, color, stroke: "#000", strokeW: 4 });
  if (two) {
    t("ИГРОК 1", x + w * 0.25, y + 24, 20, P_COLORS[0]);
    t("WASD — ходьба, прыжок, присед", x + w * 0.25, y + 50, 18, "#fff");
    t("F — рука   G — нога   H — спец   R — блок", x + w * 0.25, y + 74, 18, "#fff");
    t("ИГРОК 2", x + w * 0.75, y + 24, 20, P_COLORS[1]);
    t("стрелки — ходьба, прыжок, присед", x + w * 0.75, y + 50, 18, "#fff");
    t("J — рука   K — нога   L — спец   ; — блок", x + w * 0.75, y + 74, 18, "#fff");
    ctx.fillStyle = "rgba(255,213,74,0.4)"; ctx.fillRect(W / 2 - 1, y + 12, 2, 70);
    t("ПАНЧ — рука + нога   •   бросок — вперёд + рука (вырваться — блок или рука)   •   рывок — дважды вперёд", W / 2, y + 102, 15, "#c9c2ff");
  } else {
    if (padSeen) {
      if (padSony) {
        t("□ — рука   × — нога   ○ — спец   R1 — блок", W / 2, y + 30, 19, "#fff");
        t("△ — ПАНЧ   •   L1 — бросок   •   R2 — рывок   •   Options — пауза", W / 2, y + 62, 16, "#c9c2ff");
      } else {
        t("X — рука   A — нога   B — спец   R1 — блок", W / 2, y + 30, 19, "#fff");
        t("Y — ПАНЧ   •   L1 — бросок   •   R2 — рывок   •   START — пауза", W / 2, y + 62, 16, "#c9c2ff");
      }
    } else {
      t("стрелки — ходьба, прыжок, присед   •   A — рука   S — нога   D — спец   F — блок", W / 2, y + 30, 19, "#fff");
      t("ПАНЧ — A + S (отбивается блоком)   •   бросок — вперёд + A   •   рывок — дважды вперёд", W / 2, y + 62, 16, "#c9c2ff");
    }
  }
  ctx.restore();
}

function drawFightOverlays() {
  drawControlsHint();
  if (F.phase === "intro") {
    const t = F.phaseT;
    ctx.fillStyle = `rgba(0,0,0,${0.3 * (1 - clamp((t - 1.3) / 0.4, 0, 1))})`;
    ctx.fillRect(0, 0, W, H);
    if (t < 1.05) {
      const k = easeOut(t / 0.25);
      const label = isFinalRound() ? "ФИНАЛЬНЫЙ РАУНД" : `РАУНД ${F.round}`;
      bigText(label, H / 2 - 20, 92, ["#ffffff", "#d8d0ff", "#9a8cff"], 0.6 + 0.4 * k, k);
      // light streak
      ctx.fillStyle = `rgba(255,255,255,${0.12 * k})`;
      ctx.fillRect(0, H / 2 + 40, W * k, 6);
    } else {
      const k = easeOut((t - 1.05) / 0.2);
      bigText("В БОЙ!", H / 2 - 10, 120, ["#fff6c8", "#ffd54a", "#ff7a3d"], 1.6 - 0.6 * k, Math.min(1, k * 1.5));
    }
  } else if (F.phase === "finish") {
    drawFinishHim();
  } else if (F.phase === "fatality" || F.fatDone) {
    drawFatalityTitle();
  } else if (F.phase === "ko") {
    const t = F.phaseT;
    let main = "K.O.";
    let grad = ["#fff6c8", "#ffd54a", "#ff4a3d"];
    if (F.endType === "time") main = "ВРЕМЯ!";
    if (F.winner < 0) { main = F.endType === "time" ? "НИЧЬЯ" : "ДВОЙНОЙ K.O."; grad = ["#ffffff", "#c9c2ff", "#7a6cff"]; }
    const k = easeOut(t / 0.3);
    bigText(main, H / 2 - 40, 150, grad, 2 - k, Math.min(1, t * 4));
    if (t > 0.9 && F.winner >= 0) {
      const w = F.fighters[F.winner];
      const k2 = easeOut((t - 0.9) / 0.3);
      const who = G.mode === 1 ? (F.winner === 0 ? "РАУНД ЗА ТОБОЙ" : "РАУНД ЗА БОТОМ") : `ИГРОК ${F.winner + 1}`;
      text(`${w.data.name} — ${who}`, W / 2, H / 2 + 70, { size: 34, align: "center", color: "#fff", stroke: "#000", strokeW: 6, alpha: k2 });
      if (F.perfect) bigText("ИДЕАЛЬНО!", H / 2 + 130, 54, ["#ffffff", "#8fd3ff", "#5f7aff"], 1, k2);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Menus                                                               */
/* ------------------------------------------------------------------ */
function menuBackground(dim = 0.72) {
  titleBackdrop(1.06, Math.sin(G.time * 0.2) * 12, 0);
  ctx.fillStyle = `rgba(8,5,22,${dim})`;
  ctx.fillRect(0, 0, W, H);
  // hide the baked-in "press to start" button of the title art
  const fade = ctx.createLinearGradient(0, 470, 0, 640);
  fade.addColorStop(0, "rgba(8,5,22,0)");
  fade.addColorStop(1, "rgba(8,5,22,0.92)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 470, W, H - 470);
  // moving diagonal stripes
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#b9a6ff";
  const off = (G.time * 40) % 80;
  for (let x = -H; x < W + H; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x + off, 0); ctx.lineTo(x + off + 30, 0); ctx.lineTo(x + off + 30 - H, H); ctx.lineTo(x + off - H, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // scanlines
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
}

function header(str, sub) {
  text(str, W / 2, 62, { size: 54, align: "center", gradient: ["#fff6c8", "#ffd54a", "#ff8a3d"], stroke: "#1a0830", strokeW: 8, shadowOff: 5 });
  if (sub) text(sub, W / 2, 112, { size: 20, align: "center", color: "#c9c2ff", stroke: "#000", strokeW: 4 });
}

// Keyboard hint → handheld buttons (Xbox layout: A bottom, B right, X left, Y top)
function padHint(str) {
  return str
    .replace(/\(или мышь\)\s*/g, "")
    .replace(/\s+S  СЕКРЕТЫ/g, "").replace(/\s+M  ЗВУК/g, "").replace(/\s+1-0  БЫСТРЫЙ ВЫБОР/g, "")
    .replace(/1P: A D \+ F/g, "← →  ВЫБОР    A  ОК")
    .replace(/ESC \/ ENTER/g, "B").replace(/ENTER/g, "A").replace(/ESC/g, "B");
}
function footer(str) {
  if (padMode) str = padHint(str);
  else if (isTouch) return;           // keyboard hints mean nothing on a phone
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, H - 46, W, 46);
  text(str, W / 2, H - 22, { size: 18, align: "center", color: "#c9c2ff", shadow: false });
}

// Author's Telegram channel
const TG_URL = "https://t.me/dkdanceblog";
function openTelegram() { try { window.open(TG_URL, "_blank", "noopener"); } catch (e) {} }
function tgButton(x, y) {
  const label = "TELEGRAM @DKDANCEBLOG";
  const bw = textWidth(label, 14, FONT_PIX) + 36, bh = 46;
  const hov = hover && hover.id === "tg-btn";
  ctx.fillStyle = hov ? "rgba(40,120,200,0.95)" : "rgba(10,6,28,0.8)";
  ctx.fillRect(x, y, bw, bh);
  ctx.strokeStyle = "#5fb8ff"; ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
  text(label, x + 18, y + bh / 2 + 1, { size: 14, font: FONT_PIX, color: "#cfe9ff", shadow: false });
  region("tg-btn", x, y, bw, bh, () => { confirmSfx(); openTelegram(); });
}

// Visible back button (top-left) — phones have no ESC
function backButton() {
  if (padMode) return;            // the pad has B for that
  const label = "НАЗАД";
  const bw = textWidth(label, 18, FONT_PIX) + 62, bh = 54, x = 14, y = 12;
  const hov = hover && hover.id === "back-btn";
  ctx.fillStyle = hov ? "rgba(60,40,110,0.92)" : "rgba(10,6,28,0.8)";
  ctx.fillRect(x, y, bw, bh);
  ctx.strokeStyle = "rgba(201,194,255,0.8)";
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
  ctx.fillStyle = "#e8e4ff";
  ctx.beginPath(); ctx.moveTo(x + 18, y + bh / 2); ctx.lineTo(x + 32, y + bh / 2 - 10); ctx.lineTo(x + 32, y + bh / 2 + 10); ctx.closePath(); ctx.fill();
  text(label, x + 42, y + bh / 2 + 1, { size: 18, font: FONT_PIX, color: "#e8e4ff", shadow: false });
  region("back-btn", x, y, bw, bh, () => { navQueue.push({ type: "back", player: -1 }); });
}

function confirmSfx() { playSfx("uiConfirm"); }

// Speaker button: top-right on menus, bottom-centre during a fight (the HUD owns the top)
function drawSoundButton() {
  if (G.screen === "loading" || G.screen === "vs") return;
  const fight = G.screen === "fight" && !G.paused;
  const sz = 40;
  const x = fight ? W / 2 - sz / 2 : W - sz - 12, y = fight ? H - sz - 6 : 8;
  const hov = hover && hover.id === "sound";
  ctx.save();
  ctx.fillStyle = hov ? "rgba(60,40,110,0.95)" : "rgba(10,6,28,0.75)";
  roundRect(x, y, sz, sz, 8); ctx.fill();
  ctx.strokeStyle = muted ? "rgba(255,120,120,0.8)" : "rgba(255,213,74,0.8)";
  ctx.lineWidth = 2; ctx.stroke();
  // speaker
  const cx = x + 13, cy = y + sz / 2;
  ctx.fillStyle = "#fff6c8";
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 5); ctx.lineTo(cx - 1, cy - 5); ctx.lineTo(cx + 6, cy - 11);
  ctx.lineTo(cx + 6, cy + 11); ctx.lineTo(cx - 1, cy + 5); ctx.lineTo(cx - 6, cy + 5);
  ctx.closePath(); ctx.fill();
  ctx.lineWidth = 2.5; ctx.lineCap = "round";
  if (muted) {
    ctx.strokeStyle = "#ff7a7a";
    ctx.beginPath(); ctx.moveTo(cx + 11, cy - 6); ctx.lineTo(cx + 21, cy + 6); ctx.moveTo(cx + 21, cy - 6); ctx.lineTo(cx + 11, cy + 6); ctx.stroke();
  } else {
    ctx.strokeStyle = "#fff6c8";
    ctx.beginPath(); ctx.arc(cx + 7, cy, 7, -0.8, 0.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 7, cy, 13, -0.8, 0.8); ctx.stroke();
  }
  ctx.restore();
  region("sound", x, y, sz, sz, () => { setMuted(!muted); if (!muted) confirmSfx(); });
}

/* Title */
function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  const w = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
  return n + " " + w;
}
// Backdrop shared by the title and the menus: generated art if present, else the concert stage.
function titleBackdrop(zoom, ox, oy) {
  const t = img("titlebg") || img("bg.concert");
  if (t) drawCover(t, 0, 0, W, H, zoom, ox, oy);
  else { ctx.fillStyle = "#0b0820"; ctx.fillRect(0, 0, W, H); }
}

// Fighters lined up on the title screen; reads CHAR_IDS so new fighters appear automatically.
/* ---- Title screen show: rotating lineup, little fights, fly-bys, spotlights, intro ---- */
const TITLE_SLOTS = [
  { row: 0, y: 585, scale: 0.6, dark: 0.35 }, { row: 0, y: 585, scale: 0.6, dark: 0.35 }, { row: 0, y: 585, scale: 0.6, dark: 0.35 }, { row: 0, y: 585, scale: 0.6, dark: 0.35 },
  { row: 1, y: 700, scale: 0.74, dark: 0 }, { row: 1, y: 700, scale: 0.74, dark: 0 }, { row: 1, y: 700, scale: 0.74, dark: 0 }, { row: 1, y: 700, scale: 0.74, dark: 0 }, { row: 1, y: 700, scale: 0.74, dark: 0 },
];
let TT = null;   // title state
function titleState() {
  if (TT) return TT;
  const pool = [...CHAR_IDS].sort(() => Math.random() - 0.5);
  const n = Math.min(TITLE_SLOTS.length, pool.length);
  const rowCount = [0, 0];
  const slots = [];
  for (let i = 0; i < n; i++) slots.push({ ...TITLE_SLOTS[i] });
  slots.forEach((sl) => rowCount[sl.row]++);
  const idx = [0, 0];
  slots.forEach((sl) => {
    const k = rowCount[sl.row], i = idx[sl.row]++;
    const spread = sl.row === 0 ? W - 360 : W - 160;
    sl.x = W / 2 + (k > 1 ? (i / (k - 1) - 0.5) * spread : 0);
  });
  slots.forEach((sl, i) => { sl.cid = pool[i]; sl.state = "enter"; sl.t = -(0.55 + i * 0.09); sl.act = null; });
  TT = { t: 0, last: G.time, slots, pool, nextSwap: 5, nextAct: 2.4, nextFly: 3.5, fly: null, shake: 0, lights: [0, 1, 2].map((i) => ({ x: W * (0.2 + i * 0.3), target: null, hold: 0 })), intro: true };
  return TT;
}
function titleUpdate() {
  const T = titleState();
  const dt = Math.min(0.05, Math.max(0, G.time - T.last)); T.last = G.time; T.t += dt;
  T.shake = Math.max(0, T.shake - dt * 30);
  if (T.intro && T.t > 0.55 && !T.slam) { T.slam = true; T.shake = 16; T.flash = 0.6; playSfx("koHit"); playSfx("crowdReact"); }
  T.flash = Math.max(0, (T.flash || 0) - dt * 1.6);
  for (const sl of T.slots) {
    sl.t += dt;
    if (sl.state === "enter" && sl.t >= 0.45) { sl.state = "idle"; sl.t = 0; }
    if (sl.state === "exit" && sl.t >= 0.45) {
      // swap in someone who isn't on stage
      const onStage = new Set(T.slots.map((q) => q.cid));
      const free = CHAR_IDS.filter((c) => !onStage.has(c));
      if (free.length) sl.cid = pick(free);
      sl.state = "enter"; sl.t = 0; sl.act = null;
    }
    if (sl.act) {
      const a = sl.act, t0 = a.t; a.t += dt;
      const hit = (at) => t0 < at && a.t >= at;
      if (a.kind === "brawled" && T.t > 1) {
        if (hit(0.5)) playSfx("hitLight");
        if (hit(0.78)) { playSfx("hitKick"); T.shake = Math.max(T.shake, 6); }
        if (hit(1.12)) { playSfx("bodyfall"); T.shake = Math.max(T.shake, 8); }
      }
      if (a.t >= a.dur) sl.act = null;
    }
  }
  // rotation: someone leaves, someone new jumps in
  T.nextSwap -= dt;
  if (T.nextSwap <= 0) {
    T.nextSwap = 3.2 + Math.random() * 1.6;
    if (CHAR_IDS.length > T.slots.length) {
      const c = T.slots.filter((q) => q.state === "idle" && !q.act);
      if (c.length) { const q = pick(c); q.state = "exit"; q.t = 0; }
    }
  }
  // little moments: a punch, a kick, a victory pose, or two neighbours squaring off
  T.nextAct -= dt;
  if (T.nextAct <= 0) {
    T.nextAct = 0.9 + Math.random() * 0.9;
    const c = T.slots.filter((q) => q.state === "idle" && !q.act);
    if (c.length) {
      const q = pick(c), r = Math.random();
      const busy = T.slots.some((o) => o.act && o.act.kind === "brawl");
      if (r < 0.32 && !busy) {                                   // mini-fight: walk up, combo, knockdown, he gets back up
        const nb = c.filter((o) => o !== q && o.row === q.row && Math.abs(o.x - q.x) < (q.row ? 420 : 340));
        if (nb.length) {
          const o = pick(nb), face = Math.sign(o.x - q.x), gap = Math.abs(o.x - q.x);
          q.act = { kind: "brawl", t: 0, dur: 3.0, face, go: Math.max(0, gap - 130 * q.scale / 0.74) };
          o.act = { kind: "brawled", t: 0, dur: 3.0, face: -face };
        }
      } else if (r < 0.42) {
        const nb = c.filter((o) => o !== q && o.row === q.row && Math.abs(o.x - q.x) < (q.row ? 300 : 260));
        if (nb.length) {
          const o = pick(nb), seq = [["light_0", 0.12], ["light", 0.22], ["idle", 0.2], ["heavy_0", 0.14], ["heavy", 0.25]];
          q.act = { kind: "duel", seq, t: 0, dur: 0.95, face: Math.sign(o.x - q.x) };
          o.act = { kind: "hurt", t: -0.3, dur: 1.0, face: Math.sign(q.x - o.x) };
        }
      } else if (r < 0.55) q.act = { kind: "seq", seq: [["light_0", 0.12], ["light", 0.3]], t: 0, dur: 0.42 };
      else if (r < 0.8) q.act = { kind: "seq", seq: [["heavy_0", 0.14], ["heavy", 0.34]], t: 0, dur: 0.48 };
      else q.act = { kind: "seq", seq: [["win", 1.6]], t: 0, dur: 1.6 };
    }
  }
  // fly-bys across the stage
  T.nextFly -= dt;
  if (!T.fly && T.nextFly <= 0) {
    const kinds = ["cadillac", "pigeons", "kanye", "zilla", "monkeys", "pie", "burger"].filter((k) => img(TITLE_FLY_IMG[k]));
    if (kinds.length) {
      const kind = pick(kinds.filter((k) => k !== T.lastFly) .length ? kinds.filter((k) => k !== T.lastFly) : kinds);
      T.lastFly = kind;
      T.fly = { kind, t: 0, dir: Math.random() < 0.5 ? 1 : -1 };
    }
    T.nextFly = 4.5 + Math.random() * 3;
  }
  if (T.fly) { T.fly.t += dt; if (T.fly.t > (T.fly.kind === "zilla" ? 4 : 2.6)) T.fly = null; }
  // spotlights wander between fighters, pause on one, then move on
  T.lights.forEach((L, i) => {
    L.hold -= dt;
    if (L.hold <= 0 || !L.target) {
      const c = T.slots.filter((q) => q.state === "idle" && (i !== 1 || q.row === 1));
      L.target = c.length ? pick(c) : null; L.hold = 2.2 + Math.random() * 1.8;
    }
    const tx = L.target ? L.target.x : W / 2;
    L.x += (tx - L.x) * Math.min(1, dt * 2.2);
  });
}
const TITLE_FLY_IMG = { cadillac: "fx.cadillac", pigeons: "fx.pigeon_1", kanye: "fx.kanye_fly", zilla: "fx.zilla", monkeys: "fx.monkey", pie: "fx.echpochmak", burger: "fx.burger" };
function drawTitleFly(layer) {
  const T = TT, f = T && T.fly;
  if (!f) return;
  const k = f.t / 2.6, dir = f.dir;
  const sx = (u) => dir > 0 ? -300 + u * (W + 600) : W + 300 - u * (W + 600);
  ctx.save();
  if (f.kind === "zilla" && layer === "back") {
    const im = img("fx.zilla"); const r = f.t < 0.8 ? f.t / 0.8 : f.t > 3.2 ? Math.max(0, (4 - f.t) / 0.8) : 1;
    const hgt = 430, sc = hgt / im.height, x = dir > 0 ? 170 : W - 170;
    ctx.globalAlpha = 0.85; ctx.translate(x, 560 + (1 - r) * 460); if (dir < 0) ctx.scale(-1, 1); ctx.scale(sc, sc);
    ctx.filter = "brightness(0.55)"; ctx.drawImage(im, -im.width / 2, -im.height);
  } else if (f.kind === "cadillac" && layer === "mid") {
    const im = img("fx.cadillac"); ctx.translate(sx(k), 640); if (dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(im, -220, -150, 440, 152);
  } else if (f.kind === "monkeys" && layer === "mid") {
    const im = img("fx.monkey");
    for (let i = 0; i < 5; i++) { const u = k * 1.15 - i * 0.06; ctx.save(); ctx.translate(sx(u), 650 - Math.abs(Math.sin(f.t * 15 + i)) * 12); if (dir < 0) ctx.scale(-1, 1); ctx.scale(0.8, 0.8); ctx.drawImage(im, -im.width / 2, -im.height); ctx.restore(); }
  } else if (f.kind === "pigeons" && layer === "front") {
    for (let i = 0; i < 9; i++) { const u = k - (i % 3) * 0.05; drawPigeon(sx(u) + Math.sin(i * 7) * 60, 470 + Math.sin(i * 3.1) * 50 + Math.sin(f.t * 8 + i) * 8, dir, f.t * 26 + i, 0.8); }
  } else if ((f.kind === "kanye" || f.kind === "pie" || f.kind === "burger") && layer === "front") {
    const im = img(TITLE_FLY_IMG[f.kind]); const x = sx(k), y = 520 - Math.sin(k * Math.PI) * 300;
    ctx.translate(x, y); ctx.rotate(f.t * 6 * dir); const sc = f.kind === "kanye" ? 0.8 : 0.9; ctx.scale(sc, sc); ctx.drawImage(im, -im.width / 2, -im.height / 2);
  }
  ctx.restore();
}
function drawTitleRow(row) {
  const T = TT;
  for (const sl of T.slots) {
    if (sl.row !== row) continue;
    let y = sl.y, alpha = 1, pose = "idle", dir = sl.x < W / 2 ? 1 : -1, ox = 0;
    if (sl.state === "enter") { const u = clamp(sl.t / 0.45, 0, 1); if (sl.t < 0) continue; y = sl.y + (1 - u) * 260 - Math.sin(u * Math.PI) * 60; pose = "jump"; }
    if (sl.state === "exit") { const u = clamp(sl.t / 0.45, 0, 1); y = sl.y + u * 280; alpha = 1 - u; pose = "jump"; }
    const a = sl.act;
    if (a && a.t >= 0) {
      if (a.face) dir = a.face;
      if (a.kind === "hurt") { pose = a.t > 0.42 && a.t < 0.75 ? "hurt" : "block"; if (pose === "hurt") ox = -dir * 14; }
      else if (a.kind === "brawl") {                       // attacker
        const t = a.t, go = a.go, back = clamp((t - 2.35) / 0.5, 0, 1);
        const step = (k) => "walk_" + (1 + Math.floor(k * 8) % 4);
        if (t < 0.36) { pose = step(t); ox = dir * go * (t / 0.36); }
        else if (t < 2.35) { ox = dir * go; pose = t < 0.44 ? "light_0" : t < 0.6 ? "light" : t < 0.68 ? "heavy_0" : t < 0.95 ? "heavy" : t < 1.3 ? "idle" : "win"; }
        else { ox = dir * go * (1 - back); pose = back < 1 ? step(t) : "idle"; dir = back > 0 && back < 1 ? -dir : dir; }
      } else if (a.kind === "brawled") {                   // victim: block, two hits, flies back, lies, gets up
        const t = a.t, fly = clamp((t - 0.78) / 0.34, 0, 1), ret = clamp((t - 2.3) / 0.55, 0, 1);
        const away = -dir * (24 + 70 * easeOut(fly)) * (1 - ret);
        if (t < 0.48) pose = "block";
        else if (t < 0.78) { pose = "hurt"; ox = -dir * 14; }
        else if (t < 1.12) { pose = hasPose(sl.cid, "fall") ? "fall" : "hurt"; ox = away; y -= Math.sin(fly * Math.PI) * 50; }
        else if (t < 2.0) { pose = "ko"; ox = away; }
        else if (t < 2.3) { pose = hasPose(sl.cid, "getup") ? "getup" : "crouch"; ox = away; }
        else { pose = ret < 1 ? "walk_" + (1 + Math.floor(t * 8) % 4) : "idle"; ox = away; }
      }
      else { let acc = 0; for (const [nm, d] of a.seq) { acc += d; if (a.t < acc) { pose = nm; break; } } if (pose === "light" || pose === "heavy") ox = dir * 10; }
    }
    const ph = G.time * 2.2 + sl.x * 0.01;
    ctx.fillStyle = `rgba(0,0,0,${0.45 * alpha})`;
    ctx.beginPath(); ctx.ellipse(sl.x + ox, sl.y + 2, (pose === "ko" ? 110 : 70) * sl.scale, 12 * sl.scale, 0, 0, Math.PI * 2); ctx.fill();
    drawPose(sl.cid, pose, sl.x + ox, y, { dir, scale: sl.scale, sy: 1 + Math.sin(ph) * 0.012, alpha,
      tint: sl.dark ? { color: "#120a2c", a: sl.dark } : undefined });
  }
}
function drawTitleLineup() {
  drawTitleFly("back");
  if (!babUnlocked() && SPRITE_META.babangida) {             // the secret boss lurks at the back of the stage
    const fr = frameOf("babangida", "idle"), x = W / 2, y = 572, sc = 0.52;
    if (fr) {
      const pulse = 0.5 + 0.5 * Math.sin(G.time * 1.7);
      ctx.save();
      const g = ctx.createRadialGradient(x, y - 80, 10, x, y - 80, 150);
      g.addColorStop(0, `rgba(255,60,60,${0.16 + 0.1 * pulse})`); g.addColorStop(1, "rgba(255,60,60,0)");
      ctx.fillStyle = g; ctx.fillRect(x - 150, y - 230, 300, 260);
      ctx.globalAlpha = 0.82;
      ctx.translate(x, y); ctx.scale(sc, sc);
      ctx.drawImage(silhouette(fr.image, "#07040f"), -fr.ax, -fr.ay);
      ctx.restore();
      text("?", x + 2, y - fr.ay * sc * 0.55 + Math.sin(G.time * 2.4) * 3, { size: 44, align: "center", gradient: ["#ffffff", "#ff8a7a"], stroke: "#000", strokeW: 6, alpha: 0.6 + 0.4 * pulse });
    }
  }
  drawTitleRow(0);
  drawTitleFly("mid");
  drawTitleRow(1);
  drawTitleFly("front");
  // name of the fighter the centre spotlight rests on
  const L = TT.lights[1], q = L.target;
  if (q && q.row === 1 && Math.abs(L.x - q.x) < 20 && q.state === "idle") {
    const fr = SPRITE_META[q.cid].idle;
    text(CHARS[q.cid].name, q.x, q.y - (fr ? fr.ay : 240) * q.scale - 14, { size: q.row ? 20 : 16, align: "center", color: CHARS[q.cid].color, stroke: "#000", strokeW: 5 });
  }
}

function drawTitleLogo(cx, cy, scale) {
  const logo = img("logo");
  if (logo) {
    const h = logo.naturalHeight * scale;
    const w = logo.naturalWidth * scale;
    ctx.save();
    ctx.shadowColor = "rgba(255,120,30,0.55)";
    ctx.shadowBlur = 24 + Math.sin(G.time * 3) * 10;
    ctx.drawImage(logo, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.rotate(-0.035);
  // glow behind the logo
  const g = ctx.createRadialGradient(0, 10, 20, 0, 10, 520);
  g.addColorStop(0, "rgba(255,90,40,0.35)");
  g.addColorStop(1, "rgba(255,90,40,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-560, -160, 1120, 330);
  text("РУССКИЙ РЭП", 0, -40, { size: 104, align: "center", gradient: ["#ffffff", "#ffe27a", "#ff9a2e"],
    stroke: "#1a0830", strokeW: 14, shadowOff: 8 });
  // "НА ВЫЛЕТ" on a red slab
  const w2 = textWidth("НА ВЫЛЕТ", 76) + 70;
  ctx.save();
  ctx.translate(0, 62);
  ctx.transform(1, 0, -0.18, 1, 0, 0);
  ctx.fillStyle = "#1a0830";
  ctx.fillRect(-w2 / 2 - 6, -46, w2 + 12, 92);
  const rg = ctx.createLinearGradient(0, -40, 0, 40);
  rg.addColorStop(0, "#ff4a3d"); rg.addColorStop(1, "#a3101f");
  ctx.fillStyle = rg;
  ctx.fillRect(-w2 / 2, -40, w2, 80);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(-w2 / 2, -40, w2, 6);
  ctx.restore();
  text("НА ВЫЛЕТ", 0, 64, { size: 76, align: "center", color: "#fff6e8", stroke: "#1a0830", strokeW: 10, shadowOff: 5 });
  text("PIXEL FIGHTER", 0, 132, { size: 18, font: FONT_PIX, align: "center", color: "#c9c2ff", stroke: "#000", strokeW: 5 });
  ctx.restore();
}

// pressing start: the logo bursts into pieces with a flash, then the menu opens
function startTitleExit() {
  const T = titleState();
  if (T.exit) return;
  T.exit = { t: 0, pieces: Array.from({ length: 18 }, (_, i) => ({ c: i % 6, r: Math.floor(i / 6), vx: rand(-900, 900), vy: rand(-700, 200), vr: rand(-8, 8) })) };
  confirmSfx();
}
function drawTitleLogoBurst(T) {                             // soft: the logo swells a little and fades out
  const k = clamp(T.exit.t / 0.45, 0, 1);
  ctx.save(); ctx.globalAlpha = 1 - k;
  drawTitleLogo(W / 2, 160, 1 + 0.12 * easeOut(k));
  ctx.restore();
}
function drawTitle() {
  titleUpdate();
  if (TT.exit) { TT.exit.t += 1 / 60; if (TT.exit.t > 0.55) { TT.exit = null; setScreen("mode"); return; } }
  const T = TT;
  ctx.save();
  if (T.shake > 0) ctx.translate(rand(-T.shake, T.shake), rand(-T.shake, T.shake));
  titleBackdrop(1.08, Math.sin(G.time * 0.25) * 14, 0);
  // darken + colour grade
  const vg = ctx.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, "rgba(10,4,30,0.55)");
  vg.addColorStop(0.55, "rgba(30,6,40,0.35)");
  vg.addColorStop(1, "rgba(5,2,15,0.85)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  // sweeping spotlights
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  [[200, "255,120,60"], [W / 2, "255,220,140"], [W - 200, "120,140,255"]].forEach(([bx, col], i) => {
    const sway = T.lights[i].x - bx;
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, `rgba(${col},0.22)`);
    gr.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(bx - 25, -10); ctx.lineTo(bx + 25, -10);
    ctx.lineTo(bx + sway + 200, H); ctx.lineTo(bx + sway - 200, H);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
  // floating embers
  for (let i = 0; i < 26; i++) {
    const px = (i * 97 + G.time * (18 + (i % 5) * 9)) % (W + 40) - 20;
    const py = H - ((i * 53 + G.time * (40 + (i % 7) * 12)) % (H + 40));
    ctx.fillStyle = i % 3 ? "rgba(255,160,70,0.7)" : "rgba(255,240,180,0.8)";
    ctx.fillRect(Math.round(px), Math.round(py), 4, 4);
  }

  drawTitleLineup();
  {
    // intro: the logo slams down from above
    const u = clamp(T.t / 0.55, 0, 1), drop = T.intro ? (1 - u * u) * -420 : 0;
    const sc = T.intro && T.t < 0.85 && T.t > 0.55 ? 1 + 0.12 * Math.sin((T.t - 0.55) / 0.3 * Math.PI) : 1;
    if (T.exit) drawTitleLogoBurst(T);
    else drawTitleLogo(W / 2, 160 + drop + Math.sin(G.time * 1.6) * 4, sc);
  }
  if (T.exit) { const k = clamp(T.exit.t / 0.5, 0, 1); ctx.fillStyle = `rgba(11,8,32,${0.85 * k})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
  if (T.flash > 0) { ctx.fillStyle = `rgba(255,240,200,${T.flash * 0.6})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();

  // start button
  if (T.exit) return;
  const pulse = 0.5 + 0.5 * Math.sin(G.time * 4);
  const bw = 520, bh = 70, bx = W / 2 - bw / 2, by = 330;
  ctx.save();
  ctx.fillStyle = "rgba(10,6,28,0.85)";
  ctx.fillRect(bx, by, bw, bh);
  ctx.shadowColor = "#ffb347";
  ctx.shadowBlur = 16 + pulse * 22;
  ctx.strokeStyle = `rgba(255,200,90,${0.55 + pulse * 0.45})`;
  ctx.lineWidth = 4;
  ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
  ctx.restore();
  text("НАЖМИ, ЧТОБЫ НАЧАТЬ", W / 2, by + bh / 2 + 2, { size: 34, align: "center", gradient: ["#fff6c8", "#ffd54a", "#ff9a2e"], stroke: "#1a0830", strokeW: 6 });
  const ar = 10 + pulse * 6;
  text("◀", bx - ar, by + bh / 2, { size: 24, align: "right", color: "#ff5a3d" });
  text("▶", bx + bw + ar, by + bh / 2, { size: 24, align: "left", color: "#ff5a3d" });
  region("start", 0, 0, W, H, () => startTitleExit());

  text(`${plural(CHAR_IDS.length, "БОЕЦ", "БОЙЦА", "БОЙЦОВ")} • ${plural(STAGE_IDS.length, "АРЕНА", "АРЕНЫ", "АРЕН")}`, W / 2, by + bh + 26, { size: 11, font: FONT_PIX, align: "center", color: "rgba(255,255,255,0.7)", stroke: "#000", strokeW: 4 });
  {
    // big enough to hit with a thumb on a phone
    const label = `СЕКРЕТЫ ${secrets.size}/${SECRETS.length}` + (isTouch ? "" : "  [S]");
    const bw2 = textWidth(label, 18, FONT_PIX) + 40, bh2 = 54;
    const hov = hover && hover.id === "secrets";
    ctx.fillStyle = hov ? "rgba(60,40,110,0.92)" : "rgba(10,6,28,0.8)";
    ctx.fillRect(14, 12, bw2, bh2);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.strokeRect(15.5, 13.5, bw2 - 3, bh2 - 3);
    text(label, 34, 12 + bh2 / 2 + 1, { size: 18, font: FONT_PIX, color: GOLD, shadow: false });
    region("secrets", 14, 12, bw2, bh2, () => { confirmSfx(); openSecrets(); });
  }
  {   // author's logo, top-right under the sound button
    const dk = img("dklogo");
    if (dk) {
      const h = 124, w = h * dk.naturalWidth / dk.naturalHeight, x = W - w - 18;
      const hov = hover && hover.id === "tg-logo";
      ctx.save(); ctx.globalAlpha = hov ? 1 : 0.92; ctx.drawImage(dk, x, 60, w, h); ctx.restore();
      text("@DKDANCEBLOG", x + w / 2, 60 + h + 16, { size: 11, font: FONT_PIX, align: "center", color: hov ? "#cfe9ff" : "#9fd2ff", stroke: "#000", strokeW: 4 });
      region("tg-logo", x - 20, 56, w + 40, h + 34, () => { confirmSfx(); openTelegram(); });
    }
  }
  text("Неофициальная фанатская пародия. Не связана с исполнителями. Все персонажи — шаржи.", W / 2, H - 12, { size: 14, align: "center", color: "rgba(255,255,255,0.6)", stroke: "#000", strokeW: 4 });
  const badges = cheatBadges();
  if (badges) text(badges, 16, 66, { size: 16, color: "#ff86d8", stroke: "#000", strokeW: 4 });
}

/* ------------------------------------------------------------------ */
/* Tutorial                                                            */
/* ------------------------------------------------------------------ */
const TUTORIAL_STEPS = [
  { id: "walk", title: "ХОДЬБА", text: "Походи влево и вправо:  ← →", touch: "джойстик влево-вправо", pad: "Походи влево и вправо:  крестовина ← →" },
  { id: "jump", title: "ПРЫЖОК", text: "Прыгни:  ↑", touch: "джойстик вверх", pad: "Прыгни:  ↑" },
  { id: "light", title: "УДАР РУКОЙ", text: "Подойди к сопернику и ударь рукой:  A", touch: "кнопка РУКА", pad: "Подойди к сопернику и ударь рукой:  X" },
  { id: "heavy", title: "УДАР НОГОЙ", text: "Ударь ногой:  S", touch: "кнопка НОГА", pad: "Ударь ногой:  A" },
  { id: "block", title: "БЛОК", text: "Соперник атакует! Держи F (или НАЗАД от него), чтобы заблокировать 2 удара", touch: "кнопка БЛОК", pad: "Соперник атакует! Держи R1 (или НАЗАД от него), чтобы заблокировать 2 удара" },
  { id: "sweep", title: "ПОДСЕЧКА", text: "Присядь и ударь ногой:  ↓ + S  — соперник упадёт", touch: "джойстик вниз + НОГА", pad: "Присядь и ударь ногой:  ↓ + A  — соперник упадёт" },
  { id: "crouchjab", title: "УДАР В ПРИСЕДЕ", text: "Присядь и ударь рукой:  ↓ + A  — быстрый низкий удар", touch: "джойстик вниз + РУКА", pad: "Присядь и ударь рукой:  ↓ + X  — быстрый низкий удар" },
  { id: "chain", title: "СВЯЗКА", text: "Рука, рука, нога подряд:  A, A, S  — третий удар добивающий", touch: "РУКА, РУКА, НОГА", pad: "Рука, рука, нога подряд:  X, X, A  — третий удар добивающий" },
  { id: "dash", title: "РЫВОК", text: "Дважды быстро вперёд:  → →", touch: "кнопка РЫВОК", pad: "Рывок:  R2  (или дважды быстро вперёд)" },
  { id: "throw", title: "БРОСОК", text: "Подойди вплотную:  вперёд + A  — блоком не закрыться, но можно вырваться: F или A", touch: "кнопка БРОСОК", pad: "Подойди вплотную:  L1  — блоком не закрыться, вырваться: X" },
  { id: "special", title: "СПЕЦПРИЁМ", text: "Фирменный спецприём:  D", touch: "кнопка СПЕЦ", pad: "Фирменный спецприём:  B" },
  { id: "super", title: "ПАНЧ", text: "Шкала ПАНЧА полная! Зажми оба удара:  A + S", touch: "кнопка ПАНЧ", pad: "Шкала ПАНЧА полная! Жми  Y" },
];
const TOUCH_UI = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

function startTutorial() {
  G.mode = 1;
  G.twin = false;
  G.chars = [CHAR_IDS[G.charCursor ? G.charCursor[0] : 0] || "guf", "noize"];
  if (G.chars[0] === "noize") G.chars[1] = "guf";
  G.stage = "concert";
  G.difficulty = "easy";
  G.tutorial = { step: 0, wait: 0, walked: 0, lastX: null, blocks: 0, lastHit: null, done: false, doneT: 0 };
  startMatch();
}

function tutorialAdvance() {
  const T = G.tutorial;
  T.wait = 0.9;
  playSfx("menuSelect");
  popup(W / 2, 260, "ОТЛИЧНО!", "#8dff7a", 40);
}

function updateTutorial(dt) {
  const T = G.tutorial;
  if (!F || F.phase === "intro") return;
  const [p, d] = F.fighters;
  F.timer = ROUND_TIME;
  for (const f of F.fighters) if (f.hp < 60 && !(f.action && f.action.type === "super")) { f.hp = 100; f.trailHp = 100; }
  if (T.done) {
    T.doneT += dt;
    if (T.doneT > 3.2) { stopMusic(); F = null; G.tutorial = null; store.set("tutorial_done", true); setScreen("mode"); G.sel = 3; }
    return;
  }
  if (T.wait > 0) {
    T.wait -= dt;
    if (T.wait <= 0) {
      T.step++; T.lastHit = null; T.blocks = 0; T.parries = 0; T.walked = 0; T.lastX = null;
      if (T.step >= TUTORIAL_STEPS.length) { T.done = true; T.doneT = 0; playSfx("ko"); return; }
      const id = TUTORIAL_STEPS[T.step].id;
      if (id === "special") p.specialCd = 0;
      if (id === "super") p.super = 100;
      if (id === "block" || id === "parry") d.ai.t = 0.8;
    }
    return;
  }
  const step = TUTORIAL_STEPS[T.step];
  const h = T.lastHit;
  let ok = false;
  switch (step.id) {
    case "walk":
      if (T.lastX !== null && p.onGround) T.walked += Math.abs(p.x - T.lastX);
      T.lastX = p.x;
      ok = T.walked > 320; break;
    case "jump": ok = !p.onGround && p.vy < 0; break;
    case "light": ok = h && h.type === "light" && !h.finisher; break;
    case "heavy": ok = h && h.type === "heavy" && !h.sweep && !h.finisher; break;
    case "block": ok = T.blocks >= 2; break;
    case "parry": ok = (T.parries || 0) >= 1; break;
    case "sweep": ok = h && h.sweep; break;
    case "chain": ok = h && h.finisher; break;
    case "crouchjab": ok = h && h.crouchAtk; break;
    case "overhead": ok = h && h.overhead; break;
    case "launch": ok = h && h.launcher; break;
    case "juggle": ok = h && h.juggle && !h.launcher; break;
    case "dash": ok = p.dashT > 0 && Math.sign(p.dashV) === p.dir; break;
    case "throw": ok = h && h.type === "throw"; break;
    case "special": ok = p.action && p.action.type === "special"; break;
    case "super": ok = p.action && p.action.type === "super"; break;
  }
  if (step.id === "special" && p.specialCd > 0.5 && !(p.action && p.action.type === "special")) p.specialCd = 0;
  if (step.id === "super" && (p.super || 0) < 100 && !(p.action && p.action.type === "super")) p.super = 100;
  if (h && !ok) T.lastHit = null;
  if (ok) tutorialAdvance();
}

function drawTutorial() {
  const T = G.tutorial;
  if (!T || !F) return;
  if (T.done) {
    const k = 1 + 0.05 * Math.sin(G.time * 6);
    ctx.save(); ctx.translate(W / 2, 300); ctx.scale(k, k);
    text("ОБУЧЕНИЕ ПРОЙДЕНО!", 0, 0, { size: 64, align: "center", gradient: ["#fff6c8", GOLD, "#ff7a3d"], stroke: "#1a0830", strokeW: 9 });
    ctx.restore();
    text("Теперь ты знаешь все приёмы. Вперёд — в аркаду!", W / 2, 370, { size: 24, align: "center", color: "#fff6c8", stroke: "#000", strokeW: 5 });
    return;
  }
  const step = TUTORIAL_STEPS[Math.min(T.step, TUTORIAL_STEPS.length - 1)];
  const w = 760, h = 104, x = W / 2 - w / 2, y = 112;
  panel(x, y, w, h, { active: T.wait <= 0 });
  text(`ШАГ ${T.step + 1} / ${TUTORIAL_STEPS.length}`, x + 20, y + 22, { size: 12, font: FONT_PIX, color: "#9d97c9", shadow: false });
  text(step.title, x + w / 2, y + 28, { size: 30, align: "center", color: T.wait > 0 ? "#8dff7a" : GOLD, stroke: "#000", strokeW: 5 });
  const line = padMode ? step.pad : TOUCH_UI ? step.text.replace(/:\s+[^—]*?(—|$)/, ": " + step.touch + " $1").trim() : step.text;
  text(line, x + w / 2, y + 66, { size: fitText(line, w - 40, 20), align: "center", color: "#fff", stroke: "#000", strokeW: 4 });
  if (step.id === "block") text(`заблокировано: ${T.blocks} / 2`, x + w / 2, y + 92, { size: 12, font: FONT_PIX, align: "center", color: "#c9c2ff", shadow: false });
  if (step.id === "walk") text(`${Math.min(100, Math.round(T.walked / 3.2))}%`, x + w / 2, y + 92, { size: 12, font: FONT_PIX, align: "center", color: "#c9c2ff", shadow: false });
  // progress dots
  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    ctx.fillStyle = i < T.step || (i === T.step && T.wait > 0) ? "#8dff7a" : i === T.step ? GOLD : "rgba(255,255,255,0.2)";
    ctx.fillRect(x + w - 20 - (TUTORIAL_STEPS.length - i) * 14, y + 16, 10, 10);
  }
  if (padMode) text("START — ПАУЗА", W - 20, H - 60, { size: 10, font: FONT_PIX, align: "right", color: "rgba(255,255,255,0.5)", shadow: false });
  else if (!isTouch) text("ESC — ВЫЙТИ", W - 20, H - 60, { size: 10, font: FONT_PIX, align: "right", color: "rgba(255,255,255,0.5)", shadow: false });
}

/* ------------------------------------------------------------------ */
/* Arcade mode                                                         */
/* ------------------------------------------------------------------ */
// Texts are drafts awaiting approval (see the texts doc)
const ARCADE_TEXT = {
  bossVs: "ФИНАЛЬНЫЙ БОСС",
  secretVs: "ГОСТЬ ИЗ ПОДПОЛЬЯ",
  secretUnlocked: "ОТКРЫТ СЕКРЕТНЫЙ БОЕЦ: БАБАНГИДА!",
  unlocked: "ОТКРЫТ НОВЫЙ БОЕЦ: ЧИПИНКОС!",
  champion: "ЧЕМПИОН!",
};
const ARCADE_ENDINGS = {
  guf: "Пьяный мастер всех обошёл.",
  noize: "Нойз МС — царь горы.",
  oxxxy: "Хитрый Окс опять всех переиграл.",
  morgen: "Алишер Иуда Моргенштерн снова трахнул игру.",
  maybe: "Мэйби Бэйби доказала, что она мать рэп игры.",
  kreed: "Егор устроил шоу-представление.",
  slava: "АНТИХАЙП ПОБЕДИЛ.",
  atl: "ATL перевернул всю эту игру.",
  korzh: "Ему реально горы по колено.",
  face: "Фэйс всех уронил.",
  chip: "Чипинкос тупо лучший.",
  ramirez: "Рэм превратил турнир в мошпит.",
  husky: "Хаски доказал, что он настоящий поэт.",
  babangida: "Бабангида снова всех урыл.",
  sqwoz: "Татарский богатырь накормил всех.",
  shilo: "Шило всех порешал.",
  krip: "Глебзилла уничтожил.",
  tito: "Титомир показал всем, как надо.",
  loki: "Локи прошёл рэп-игру.",
  smoky: "Смоки Мо всех разнёс.",
  fludd: "Флад всех разнёс, чуитс.",
};
const ARCADE_FIGHTS = 6;   // 5 opponents + the boss
function arcadeDifficulty(i) { return i < 3 ? "easy" : "normal"; }

function startArcade(cid) {
  const others = BASE_IDS.filter((c) => c !== cid);
  for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
  const stages = STAGE_IDS.filter((s2) => s2 !== "bar");
  const ladder = others.slice(0, ARCADE_FIGHTS - 1).map((o) => ({ cid: o, stage: pick(stages) }));
  ladder.push({ cid: "chip", stage: "bar", boss: true });
  G.arcade = { cid, ladder, idx: 0, retries: 0, prevDiff: G.difficulty, wins: 0, chipBefore: chipUnlocked() };
  setScreen("ladder");
}

function arcadeFight() {
  const A = G.arcade;
  const step = A.ladder[A.idx];
  confirmSfx();
  G.mode = 1;
  G.chars = [A.cid, step.cid];
  G.twin = !!step.boss && A.cid === step.cid;      // playing as Chipinkos: the boss is his evil twin
  G.arcadeBoss = !!step.boss;
  G.arcadeSecret = !!step.secret;
  G.stage = step.stage;
  G.difficulty = step.boss ? "normal" : arcadeDifficulty(A.idx);
  startVs();
}

function arcadeEndItems() {
  const A = G.arcade;
  const won = F && F.matchWinner === 0;
  const last = A.idx >= A.ladder.length - 1;
  const toMenu = ["МЕНЮ", () => { confirmSfx(); G.difficulty = A.prevDiff; G.arcade = null; G.arcadeBoss = false; setScreen("mode"); }];
  if (A.checkedIdx !== A.idx && F) { A.checkedIdx = A.idx; if (F.wins[1] > 0) A.flawless = false; }
  // first arcade win opens Chipinkos; once he is open, beating the arcade again summons the secret boss
  if (won && last && A.chipBefore && !A.secretAdded && A.cid !== "babangida" && !babUnlocked()) {
    return [["???", () => { playSfx("boss_reveal"); G.arcadeBoss = false;
      if (!chipUnlocked()) { CHAR_IDS.splice(CHAR_IDS.indexOf("babangida") >= 0 ? CHAR_IDS.indexOf("babangida") : CHAR_IDS.length, 0, "chip"); store.set("chip_unlocked", true); A.newUnlock = true; }
      A.secretAdded = true; A.ladder.push({ cid: "babangida", stage: "yard", boss: true, secret: true }); A.idx++; A.wins++; setScreen("ladder"); }], toMenu];
  }
  if (won && last) return [["ФИНАЛ", () => {
    if (A.ladder[A.idx].secret && !babUnlocked()) { CHAR_IDS.push("babangida"); store.set("bab_unlocked", true); A.newBab = true; } confirmSfx(); G.arcadeBoss = false;
    if (!chipUnlocked()) { CHAR_IDS.push("chip"); store.set("chip_unlocked", true); A.newUnlock = true; } G.difficulty = A.prevDiff; G.arcadeEndT = G.time; unlockSecret("champion"); setScreen("arcadeEnd"); }], toMenu];
  if (won) return [["СЛЕДУЮЩИЙ БОЙ", () => { confirmSfx(); A.idx++; A.wins++; G.arcadeBoss = false; setScreen("ladder"); }], ["СОХРАНИТЬ", shareResult], toMenu];
  return [["ЕЩЁ РАЗ", () => { A.retries++; arcadeFight(); }], toMenu];
}

function drawLadder() {
  const A = G.arcade;
  { const st = A.ladder[A.idx], ck = "L" + A.cid + st.cid + st.stage;
    if (G.prioChars !== ck) { G.prioChars = ck; prioritizeAssets(fightAssetKeys([A.cid, st.cid], st.stage)); } }
  menuBackground(0.8);
  header("АРКАДА", `БОЙ ${A.idx + 1} ИЗ ${A.ladder.length}`);
  const n = A.ladder.length, tile = 104, gap = 22;
  const x0 = W / 2 - (n * tile + (n - 1) * gap) / 2, y = 250;
  A.ladder.forEach((st, i) => {
    const x = x0 + i * (tile + gap);
    const done = i < A.idx, cur = i === A.idx;
    ctx.save();
    ctx.fillStyle = "#0d0f26";
    ctx.fillRect(x, y, tile, tile);
    const p = img("portrait." + st.cid);
    if (p) {
      if (st.boss) {
        ctx.drawImage(p, x, y, tile, tile);
        ctx.fillStyle = "rgba(40,0,60,0.55)"; ctx.fillRect(x, y, tile, tile);
      } else ctx.drawImage(p, x, y, tile, tile);
    }
    if (done) { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x, y, tile, tile); text("✓", x + tile / 2, y + tile / 2 + 4, { size: 54, align: "center", color: "#8dff7a", stroke: "#000", strokeW: 6 }); }
    if (i > A.idx && !st.boss) { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x, y, tile, tile); }
    ctx.lineWidth = cur ? 5 : 3;
    ctx.strokeStyle = st.boss ? "#ff5a3d" : cur ? GOLD : "rgba(255,213,74,0.4)";
    if (cur) { ctx.shadowColor = GOLD; ctx.shadowBlur = 18 + Math.sin(G.time * 6) * 6; }
    ctx.strokeRect(x + 1.5, y + 1.5, tile - 3, tile - 3);
    ctx.restore();
    const label = st.secret ? "???" : st.boss ? "БОСС" : String(i + 1);
    text(label, x + tile / 2, y + tile + 22, { size: st.boss ? 16 : 14, font: FONT_PIX, align: "center", color: st.boss ? "#ff5a3d" : cur ? GOLD : "#9d97c9" });
    if (i < n - 1) { ctx.fillStyle = "rgba(255,213,74,0.4)"; ctx.fillRect(x + tile + 4, y + tile / 2 - 2, gap - 8, 4); }
  });
  const st = A.ladder[A.idx];
  const opp = st.boss && st.cid === A.cid ? "ЗЛОЙ " + CHARS[st.cid].name : CHARS[st.cid].name;
  text(`${CHARS[A.cid].name}  VS  ${opp}`, W / 2, 450, { size: fitText(`${CHARS[A.cid].name}  VS  ${opp}`, W - 120, 40), align: "center", gradient: ["#fff6c8", GOLD], stroke: "#1a0830", strokeW: 7 });
  text(`АРЕНА: ${STAGES[st.stage].name}   •   СЛОЖНОСТЬ: ${DIFFICULTIES[st.boss ? "normal" : arcadeDifficulty(A.idx)].label}${st.boss ? " + БОСС" : ""}`, W / 2, 500,
    { size: 14, font: FONT_PIX, align: "center", color: "#c9c2ff" });
  if (A.retries) text(`ПЕРЕИГРОВОК: ${A.retries}`, W / 2, 535, { size: 12, font: FONT_PIX, align: "center", color: "#9d97c9" });
  const bw = 320, bh = 62, bx = W / 2 - bw / 2, by = 570;
  panel(bx, by, bw, bh, { active: true });
  text("В БОЙ!", W / 2, by + bh / 2 + 2, { size: 30, align: "center", color: GOLD, stroke: "#000", strokeW: 5 });
  region("ladder-go", bx, by, bw, bh, () => arcadeFight());
  footer("ENTER  В БОЙ    ESC  ВЫЙТИ ИЗ АРКАДЫ");
  backButton();
}

function drawArcadeEnd() {
  const A = G.arcade;
  const cid = A ? A.cid : "guf";
  const art = img("end." + cid);
  if (art) {
    // full-screen ending illustration, slow push-in; text sits on the darker right side
    drawCover(art, 0, 0, W, H, 1.02 + 0.03 * Math.min(1, G.screenT / 12));
    const gr = ctx.createLinearGradient(520, 0, W, 0);
    gr.addColorStop(0, "rgba(6,4,18,0)"); gr.addColorStop(0.35, "rgba(6,4,18,0.62)"); gr.addColorStop(1, "rgba(6,4,18,0.8)");
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    drawArcadeEndText(A, cid);
    return;
  }
  const bg = img("bg.bar");
  if (bg) drawCover(bg, 0, 0, W, H, 1.07);
  ctx.fillStyle = "rgba(6,4,18,0.66)";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(380, 360);
  ctx.rotate(G.time * 0.25);
  for (let i = 0; i < 14; i++) {
    ctx.rotate(Math.PI / 7);
    ctx.fillStyle = "rgba(255,213,74,0.08)";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(700, -60); ctx.lineTo(700, 60); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  drawPose(cid, "win", 380, 640, { dir: 1, scale: Math.min(1.6, 400 / ((SPRITE_META[cid].win || {}).ay || 240)), sy: 1 + 0.02 * Math.sin(G.time * 4) });
  drawArcadeEndText(A, cid);
}
function drawArcadeEndText(A, cid) {
  text(ARCADE_TEXT.champion, 860, 150, { size: 84, align: "center", gradient: ["#fff6c8", GOLD, "#ff7a3d"], stroke: "#1a0830", strokeW: 10 });
  text(CHARS[cid].name, 860, 240, { size: 40, align: "center", color: CHARS[cid].color, stroke: "#000", strokeW: 6 });
  wrapText(ARCADE_ENDINGS[cid] || "", 860, 320, 640, 34, { size: 26, align: "center", color: "#fff6c8", stroke: "#000", strokeW: 4 });
  text(`ПЕРЕИГРОВОК: ${A ? A.retries : 0}`, 860, 470, { size: 14, font: FONT_PIX, align: "center", color: "#c9c2ff" });
  if (A && (A.newUnlock || A.newBab)) {
    const k = 1 + 0.05 * Math.sin(G.time * 6);
    ctx.save(); ctx.translate(860, 548); ctx.scale(k, k);
    text(A.newBab ? ARCADE_TEXT.secretUnlocked : ARCADE_TEXT.unlocked, 0, 0, { size: 30, align: "center", gradient: ["#fff6c8", "#ff9a3d", "#ff5a3d"], stroke: "#1a0830", strokeW: 6 });
    ctx.restore();
  }
  if (A && A.retries === 0) text("БЕЗ ЕДИНОГО ПОРАЖЕНИЯ!", 860, 505, { size: 22, align: "center", color: "#8dff7a", stroke: "#000", strokeW: 4 });
  const bw = 300, bh = 58, bx = 860 - bw / 2, by = 580;
  panel(bx, by, bw, bh, { active: true });
  text("В ГЛАВНОЕ МЕНЮ", 860, by + bh / 2 + 2, { size: 24, align: "center", color: GOLD, stroke: "#000", strokeW: 5 });
  region("arc-end", bx, by, bw, bh, () => { if (G.time - G.arcadeEndT > 1) { confirmSfx(); G.arcade = null; setScreen("title"); } });
  tgButton(14, 12);
}

/* Secrets screen */
function openSecrets() { G.secretsBack = G.screen === "mode" ? "mode" : "title"; setScreen("secrets"); }
function drawSecrets() {
  menuBackground(0.8);
  header("СЕКРЕТЫ", `НАЙДЕНО ${secrets.size} ИЗ ${SECRETS.length}`);
  const cols = SECRETS.length > 12 ? 4 : 3, gx = 14, gy = 10;
  const rows = Math.ceil(SECRETS.length / cols);
  const w = Math.floor((W - 60 - gx * (cols - 1)) / cols);
  const y0 = 140;
  const h = Math.min(92, Math.floor((H - 60 - y0 - gy * (rows - 1)) / rows));
  SECRETS.forEach((sd, i) => {
    const x = 30 + (i % cols) * (w + gx);
    const y = y0 + Math.floor(i / cols) * (h + gy);
    const found = secrets.has(sd.id);
    const info = SECRET_INFO[sd.id] || {};
    panel(x, y, w, h, { border: found ? GOLD : "rgba(157,151,201,0.35)" });
    text(String(i + 1).padStart(2, "0"), x + 16, y + 22, { size: 12, font: FONT_PIX, color: found ? GOLD : "#6f6a99", shadow: false });
    text(found ? sd.name : "? ? ?", x + 56, y + 23, { size: fitText(found ? sd.name : "???", w - 96, 20, FONT_HEAD, 12), color: found ? "#fff6c8" : "#8d87b9", stroke: "#000", strokeW: 4 });
    wrapText(found ? (info.how || "") : (info.hint || ""), x + 16, y + 52, w - 32, 17,
      { size: 14, color: found ? "#c9c2ff" : "#7d77a8", shadow: false });
    if (found) text("✓", x + w - 18, y + 22, { size: 20, align: "center", color: "#8dff7a", stroke: "#000", strokeW: 4 });
  });
  region("secrets-back", 0, H - 46, W, 46, () => { confirmSfx(); setScreen(G.secretsBack || "title"); });
  footer(isTouch ? "" : "ESC / ENTER  НАЗАД");
  backButton();
}

/* Mode select */
function drawMode() {
  menuBackground();
  header("РЕЖИМ ИГРЫ");
  const opts = [
    { mode: 1, title: "1 ИГРОК", sub: "против бота", ids: ["guf", null], lines: isTouch ? ["выбери бойца и арену"] : ["стрелки + A S D, F — блок"] },
    { mode: 3, title: "АРКАДА", sub: "6 боёв подряд", ids: [null, "boss"], lines: ["в конце — финальный босс"] },
    { mode: 2, title: "2 ИГРОКА", sub: "на одной клавиатуре", ids: ["guf", "noize"], off: isTouch,
      lines: isTouch ? ["только на компьютере"] : ["1P: WASD + F G H, R — блок", "2P: стрелки + J K L, ; — блок"] },
    { mode: 4, title: "ОБУЧЕНИЕ", sub: "все приёмы по шагам", ids: ["guf", "tut"], lines: ["проиграть нельзя"] },
  ];
  const w = 292, h = 372, gap = 16;
  const x0 = W / 2 - (w * 4 + gap * 3) / 2;
  opts.forEach((o, i) => {
    const x = x0 + i * (w + gap);
    const y = 170;
    const active = G.sel === i;
    panel(x, y, w, h, { active });
    o.ids.forEach((id, k) => {
      const px = x + w / 2 - 126 + k * 132;
      const py = y + 30;
      ctx.fillStyle = "#0d0f26";
      ctx.fillRect(px, py, 120, 120);
      if (id === "tut") text("?", px + 60, py + 64, { size: 60, align: "center", color: "#8dff7a", stroke: "#000", strokeW: 6 });
      else if (id === "boss") text("БОСС", px + 60, py + 62, { size: 22, font: FONT_PIX, align: "center", color: "#ff5a3d" });
      else if (id) { const p = img("portrait." + id); if (p) ctx.drawImage(p, px, py, 120, 120); }
      else if (o.mode === 3) text("?", px + 60, py + 64, { size: 60, align: "center", color: GOLD, stroke: "#000", strokeW: 6 });
      else text("CPU", px + 60, py + 62, { size: 26, font: FONT_PIX, align: "center", color: "#ff8a8a" });
      ctx.strokeStyle = id === "boss" ? "#ff5a3d" : k === 0 ? P_COLORS[0] : (id ? P_COLORS[1] : "#ff8a8a");
      ctx.lineWidth = 3;
      ctx.strokeRect(px + 1.5, py + 1.5, 117, 117);
    });
    text("VS", x + w / 2 - 5, y + 92, { size: 30, align: "center", gradient: ["#fff", GOLD], stroke: "#000" });
    text(o.title, x + w / 2, y + 196, { size: fitText(o.title, w - 30, 40), align: "center", color: active ? GOLD : "#fff", stroke: "#000", strokeW: 6 });
    text(o.sub, x + w / 2, y + 244, { size: fitText(o.sub, w - 30, 26), align: "center", color: "#c9c2ff", stroke: "#000", strokeW: 4 });
    o.lines.forEach((ln, k) => text(ln, x + w / 2, y + 300 + k * 28, { size: fitText(ln, w - 30, 22), align: "center", color: "#9d97c9", shadow: false }));
    if (o.off) { ctx.fillStyle = "rgba(8,5,20,0.6)"; ctx.fillRect(x, y, w, h); }
    region("mode" + i, x, y, w, h, () => { if (o.off) { playSfx("block"); G.sel = i; return; } chooseMode(o.mode); }, () => { G.sel = i; });
  });
  {   // achievements are reachable from here too (on phones the title badge is easy to miss)
    const label = `СЕКРЕТЫ ${secrets.size} / ${SECRETS.length}`;
    const bw = 380, bh = 56, bx = W / 2 - bw / 2, by = 560;
    const hov = hover && hover.id === "mode-ach";
    panel(bx, by, bw, bh, { active: hov });
    text(label, W / 2, by + bh / 2 + 1, { size: 20, font: FONT_PIX, align: "center", color: GOLD, shadow: false });
    region("mode-ach", bx, by, bw, bh, () => { confirmSfx(); openSecrets(); });
  }
  footer("← →  ВЫБОР    ENTER  ОК    S  СЕКРЕТЫ    ESC  НАЗАД    M  ЗВУК");
  backButton();
}
const MODE_ORDER = [1, 3, 2, 4];
function chooseMode(m) {
  confirmSfx();
  G.arcade = null;
  G.arcadeBoss = false;
  G.tutorial = null;
  if (m === 4) { startTutorial(); return; }
  if (m === 3) {            // arcade: single player, pick a fighter, then the ladder
    G.mode = 1; G.twin = false; G.twinArmed = false; G.chars = [null, null]; G.picking = 0; G.charCursor = [0, 1];
    G.arcadePick = true;
    setScreen("character");
    return;
  }
  G.arcadePick = false;
  G.mode = m;
  G.twin = false;
  G.twinArmed = false;
  G.chars = [null, null];
  G.picking = 0;
  G.charCursor = [0, 1];
  if (m === 1) { setScreen("difficulty"); G.sel = DIFF_IDS.indexOf(G.difficulty); }
  else setScreen("character");
}

/* Difficulty */
function drawDifficulty() {
  menuBackground();
  header("СЛОЖНОСТЬ БОТА");
  const w = 340, h = 300, gap = 40;
  const x0 = W / 2 - (w * 3 + gap * 2) / 2;
  DIFF_IDS.forEach((id, i) => {
    const d = DIFFICULTIES[id];
    const x = x0 + i * (w + gap);
    const y = 180;
    const active = G.sel === i;
    panel(x, y, w, h, { active, border: active ? ["#8dff7a", GOLD, "#ff6b6b"][i] : undefined });
    for (let s = 0; s < 3; s++) {
      const on = s < d.skulls;
      drawSkull(x + w / 2 - 70 + s * 70, y + 80, on ? ["#8dff7a", GOLD, "#ff6b6b"][i] : "rgba(255,255,255,0.15)");
    }
    text(d.label, x + w / 2, y + 170, { size: 40, align: "center", color: active ? "#fff" : "#ddd", stroke: "#000", strokeW: 6 });
    wrapText(d.desc, x + w / 2, y + 222, w - 50, 20, { size: 18, align: "center", color: "#c9c2ff", shadow: false });
    region("diff" + i, x, y, w, h, () => chooseDifficulty(id), () => { G.sel = i; });
  });
  footer("← →  ВЫБОР    ENTER  ОК    ESC  НАЗАД");
  backButton();
}
function drawSkull(x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 6, 24, Math.PI, 0);
  ctx.lineTo(x + 24, y + 10);
  ctx.lineTo(x + 14, y + 10);
  ctx.lineTo(x + 14, y + 24);
  ctx.lineTo(x - 14, y + 24);
  ctx.lineTo(x - 14, y + 10);
  ctx.lineTo(x - 24, y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#120b26";
  ctx.fillRect(x - 15, y - 8, 11, 11);
  ctx.fillRect(x + 4, y - 8, 11, 11);
  ctx.fillRect(x - 2, y + 7, 4, 6);
  ctx.restore();
}
function wrapText(str, x, y, maxW, lineH, o) {
  const words = str.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (textWidth(test, o.size, o.font) > maxW && line) { text(line, x, yy, o); line = w; yy += lineH + 6; }
    else line = test;
  }
  if (line) text(line, x, yy, o);
}
function chooseDifficulty(id) {
  confirmSfx();
  G.difficulty = id;
  store.set("difficulty", id);
  setScreen("character");
}

/* Character select */
function drawCharacter() {
  menuBackground(0.78);
  const two = G.mode === 2;
  header("ВЫБЕРИ БОЙЦА", two ? `ВЫБИРАЕТ ИГРОК ${G.picking + 1}` : null);

  // Tiles: one row for a small roster, two rows otherwise
  const cols = charCols();
  const gap = cols === selectCount() ? 12 : cols > 10 ? 16 : 24;
  const tile = cols === selectCount() ? Math.min(132, Math.floor((W - 60 - gap * (cols - 1)) / cols)) : Math.min(96, Math.floor((W - 50 - gap * (cols - 1)) / cols));
  const rowH = tile + 32;
  const tilePos = (i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, selectCount() - row * cols);
    const tx0 = W / 2 - (tile * inRow + gap * (inRow - 1)) / 2;
    return [tx0 + (i % cols) * (tile + gap), 145 + row * rowH];
  };
  if (!chipUnlocked()) {
    const [lx, ly] = tilePos(CHAR_IDS.length);
    ctx.save();
    ctx.fillStyle = "#0d0f26"; ctx.fillRect(lx, ly, tile, tile);
    const p = img("portrait.chip");
    if (p) { ctx.globalAlpha = 0.9; ctx.drawImage(silhouette(p, "#05030c"), lx, ly, tile, tile); ctx.globalAlpha = 1; }
    ctx.strokeStyle = "rgba(255,90,61,0.6)"; ctx.lineWidth = 3; ctx.strokeRect(lx + 1.5, ly + 1.5, tile - 3, tile - 3);
    ctx.restore();
    text("?", lx + tile / 2, ly + tile / 2 + 4, { size: 54, align: "center", color: "#ff5a3d", stroke: "#000", strokeW: 6 });
    if (cols > 10) for (const [k, wd] of ["ПРОЙДИ", "АРКАДУ"].entries()) text(wd, lx + tile / 2, ly + tile + 12 + k * 14, { size: 12, align: "center", color: "#ff8a7a", stroke: "#000", strokeW: 4 });
    else text("ПРОЙДИ АРКАДУ", lx + tile / 2, ly + tile + 15, { size: fitText("ПРОЙДИ АРКАДУ", tile + gap - 6, 13), align: "center", color: "#ff8a7a", stroke: "#000", strokeW: 4 });
  }
  CHAR_IDS.forEach((id, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, selectCount() - row * cols);
    const tx0 = W / 2 - (tile * inRow + gap * (inRow - 1)) / 2;
    const x = tx0 + (i % cols) * (tile + gap);
    const ty = 145 + row * rowH;
    const taken = two && G.picking === 1 && G.chars[0] === id;
    const c0 = G.picking === 0 ? G.charCursor[0] === i : G.chars[0] === id;
    const c1 = two && G.picking === 1 && G.charCursor[1] === i;
    ctx.save();
    ctx.fillStyle = "#0d0f26";
    ctx.fillRect(x, ty, tile, tile);
    const g = ctx.createLinearGradient(x, ty, x, ty + tile);
    g.addColorStop(0, "#2b1b68"); g.addColorStop(1, "#0d0f26");
    ctx.fillStyle = g;
    ctx.fillRect(x, ty, tile, tile);
    const p = img("portrait." + id);
    if (p) ctx.drawImage(p, x, ty, tile, tile);
    if (taken) { ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x, ty, tile, tile); }
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,213,74,0.4)";
    ctx.strokeRect(x + 1.5, ty + 1.5, tile - 3, tile - 3);
    ctx.restore();
    const tName = CHARS[id].short || CHARS[id].name;
    text(tName, x + tile / 2, ty + tile + 15, { size: fitText(tName, tile + gap - 14, 18, FONT_HEAD, 12), align: "center", color: "#fff", stroke: "#000", strokeW: 4 });
    if (legends().includes(id)) text("★", x + tile - 14, ty + 16, { size: 22, align: "center", color: GOLD, stroke: "#000", strokeW: 4 });
    const cursor = (col, label, inset) => {
      ctx.save();
      ctx.lineWidth = 5;
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 16 + Math.sin(G.time * 8) * 6;
      ctx.strokeRect(x - inset, ty - inset, tile + inset * 2, tile + inset * 2);
      ctx.restore();
      if (cols === selectCount()) {
        text(label, x + (label === "1P" ? 4 : tile - 4), ty - inset - 12, { size: 12, font: FONT_PIX, align: label === "1P" ? "left" : "right", color: col });
      } else {
        // two rows: tag sits inside the tile so it doesn't cover the names above
        const lx = label === "1P" ? x + 3 : x + tile - 31;
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(lx, ty + 3, 28, 16);
        text(label, lx + 14, ty + 12, { size: 10, font: FONT_PIX, align: "center", color: col, shadow: false });
      }
    };
    if (c0) cursor(P_COLORS[0], "1P", 4);
    if (c1) cursor(P_COLORS[1], "2P", 10);
    region("char" + i, x, ty, tile, tile + 30, () => {
      if (isTouch && !taken && G.charCursor[G.picking] !== i) { G.charCursor[G.picking] = i; playSfx("uiMove"); return; }
      pickChar(i);
    }, () => { if (!taken) G.charCursor[G.picking] = i; });
  });

  // Previews
  const twoRowsSel = cols < selectCount();
  const p1id = G.chars[0] || CHAR_IDS[G.charCursor[0]];
  drawPreview(p1id, PREVIEW_X, 0, G.chars[0] ? "ГОТОВ" : null);
  if (two) {
    const p2id = G.picking === 1 ? (G.chars[1] || CHAR_IDS[G.charCursor[1]]) : null;
    if (p2id) drawPreview(p2id, W - PREVIEW_X, 1, G.chars[1] ? "ГОТОВ" : null);
    else drawMystery(W - PREVIEW_X, "ИГРОК 2");
  } else {
    if (G.twinArmed) drawTwinPreview(CHARS[CHAR_IDS[G.charCursor[0]]].id, W - PREVIEW_X);
    else drawMystery(W - PREVIEW_X, "СОПЕРНИК");
    const my0 = twoRowsSel ? 410 : 300;                  // never over the second row of tiles
    region("mystery", W - PREVIEW_X - 130, my0, 260, 640 - my0, () => {
      G.mysteryClicks = (G.mysteryClicks || 0) + 1;
      playSfx("block");
      if (G.mysteryClicks >= 5) { G.mysteryClicks = 0; G.twinArmed = !G.twinArmed; playSfx("ko"); }
    });
  }

  // Info for the active cursor
  const infoId = G.picking === 0 ? CHAR_IDS[G.charCursor[0]] : CHAR_IDS[G.charCursor[1]];
  const d = CHARS[infoId];
  const twoRows = cols < selectCount();
  const ix = W / 2 - 230, iy = twoRows ? 405 : 380, iw = 460, ih = twoRows ? 246 : 260;
  panel(ix, iy, iw, ih);
  const specW = textWidth(`СПЕЦ: ${d.special}`, 14, FONT_PIX);
  text(d.name, ix + 24, iy + 34, { size: fitText(d.name, iw - 72 - specW, 34), color: d.color, stroke: "#000", strokeW: 5 });
  text(`СПЕЦ: ${d.special}`, ix + iw - 24, iy + 36, { size: 14, font: FONT_PIX, align: "right", color: GOLD });
  Object.entries(d.stats).forEach(([k, v], r) => {
    const y = iy + (twoRows ? 76 : 84) + r * (twoRows ? 30 : 34);
    text(k, ix + 24, y, { size: 12, font: FONT_PIX, color: "#c9c2ff", shadow: false });
    for (let s = 0; s < 5; s++) {
      ctx.fillStyle = s < v ? (["#8dff7a", "#ff7a5a", GOLD][r]) : "rgba(255,255,255,0.12)";
      ctx.fillRect(ix + 180 + s * 50, y - 9, 42, 18);
    }
  });
  const bl = wrapText(d.blurb, ix + iw / 2, iy + (twoRows ? 170 : 192), iw - 40, 20, { size: 17, align: "center", color: "#fff", shadow: false });
  if (d.perk) {
    const ps = fitText(d.perk, iw - 36, 15, FONT_HEAD, 13);
    if (textWidth(d.perk, ps, FONT_HEAD) <= iw - 36) text(d.perk, ix + iw / 2, iy + ih - 22, { size: ps, align: "center", color: GOLD, shadow: false });
    else wrapText(d.perk, ix + iw / 2, iy + ih - 36, iw - 40, 17, { size: 13, align: "center", color: GOLD, shadow: false });   // long perk: two lines
  }

  footer(two
    ? (G.picking === 0 ? "1P: A D + F    (или мышь)    ESC  НАЗАД" : "2P: ← → + J / ENTER    ESC  НАЗАД")
    : "← → ↑ ↓  ВЫБОР    ENTER  ОК    ESC  НАЗАД    1-0  БЫСТРЫЙ ВЫБОР");
  if (isTouch) text("ТАПНИ ЕЩЁ РАЗ, ЧТОБЫ ВЫБРАТЬ", W / 2, H - 20, { size: 13, font: FONT_PIX, align: "center", color: "#c9c2ff", stroke: "#000", strokeW: 4 });
  backButton();
}

const PREVIEW_X = 205;
function drawPreview(id, x, slot, badge) {
  const y = 610;
  const sc = charCols() < selectCount() ? 0.9 : 1.25;   // two rows of tiles: keep the figure below them
  // spotlight
  const g = ctx.createRadialGradient(x, y - 120, 10, x, y - 120, 220);
  g.addColorStop(0, "rgba(160,130,255,0.35)");
  g.addColorStop(1, "rgba(160,130,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - 230, y - 360, 460, 420);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 100, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // cycle through a little showcase
  const cycle = G.time % 5;
  let pose = "idle";
  if (cycle > 2.2 && cycle < 2.6) pose = "light";
  else if (cycle > 3.3 && cycle < 3.9) pose = id === "oxxxy" ? "heavy" : "special";
  else if (cycle > 3.9 && cycle < 4.3) pose = "heavy";
  if (badge) pose = "win";
  const b = Math.sin(G.time * 3.2);
  drawPose(id, pose, x, y, {
    dir: slot === 0 ? 1 : -1, scale: sc, sy: 1 + 0.012 * b, sx: 1 - 0.006 * b,
  });
  text(slot === 0 ? (G.mode === 1 ? "ВЫ" : "1P") : "2P", x, y + 34, { size: 14, font: FONT_PIX, align: "center", color: P_COLORS[slot] });
  if (badge) text(badge, x, y - 272 * sc, { size: 30, align: "center", color: GOLD, stroke: "#000", strokeW: 6 });
}

function drawMystery(x, label) {
  const y = 610;
  ctx.save();
  ctx.globalAlpha = 0.55 + Math.sin(G.time * 3) * 0.15;
  const id = CHAR_IDS[Math.floor(G.time * 2.5) % CHAR_IDS.length];
  const fr = frameOf(id, "idle");
  if (fr) {
    const sc = charCols() < selectCount() ? 0.9 : 1.25;
    ctx.translate(x, y);
    ctx.scale(-sc, sc);
    ctx.drawImage(silhouette(fr.image, "#1a1440"), -fr.ax, -fr.ay);
  }
  ctx.restore();
  text("?", x, y - 150, { size: 110, align: "center", gradient: ["#fff", "#9a8cff"], stroke: "#000", strokeW: 8 });
  text(label, x, y + 34, { size: 14, font: FONT_PIX, align: "center", color: "#ff8a8a" });
}

function pickChar(i) {
  const id = CHAR_IDS[i];
  if (G.mode === 2 && G.picking === 1 && G.chars[0] === id) return;
  playSfx("uiPick");
  if (G.mode === 1 && G.arcadePick) { G.arcadePick = false; startArcade(id); return; }
  if (G.mode === 1) {
    G.chars[0] = id;
    G.twin = G.twinArmed || heldKeys.has("ShiftLeft") || heldKeys.has("ShiftRight");
    G.twinArmed = false;
    G.chars[1] = G.twin ? id : pick(CHAR_IDS.filter((c) => c !== id));
    if (G.twin) unlockSecret("twin");
    setScreen("stage");
    return;
  }
  G.twin = false;
  G.charCursor[G.picking] = i;
  G.chars[G.picking] = id;
  if (G.picking === 0) {
    G.picking = 1;
    let j = G.charCursor[1];
    if (CHAR_IDS[j] === id) j = (j + 1) % CHAR_IDS.length;
    G.charCursor[1] = j;
  } else {
    setScreen("stage");
  }
}

function selectCount() { return CHAR_IDS.length + (chipUnlocked() ? 0 : 1); }
function charCols() { const n = selectCount(); return n > 7 ? Math.ceil(n / 2) : n; }
// Jump to the tile above/below (wrapping between the two rows)
function moveCharRow(player, dir) {
  if (G.mode === 2 && player !== G.picking && player !== -1) return;
  const p = G.picking, n = CHAR_IDS.length, cols = charCols();
  const rows = Math.ceil(n / cols);
  const i = G.charCursor[p];
  const row = (Math.floor(i / cols) + dir + rows) % rows;
  let j = Math.min(row * cols + (i % cols), n - 1);
  if (G.mode === 2 && p === 1 && CHAR_IDS[j] === G.chars[0]) j = (j + 1) % n;
  G.charCursor[p] = j;
  playSfx("whoosh");
}
function moveCharCursor(player, delta) {
  if (G.mode === 2 && player !== G.picking && player !== -1) return;
  const p = G.picking;
  let i = G.charCursor[p];
  const n = CHAR_IDS.length;
  for (let k = 0; k < n; k++) {
    i = (i + delta + n) % n;
    if (!(G.mode === 2 && p === 1 && CHAR_IDS[i] === G.chars[0])) break;
  }
  G.charCursor[p] = i;
  playSfx("whoosh");
}

/* Stage select */
function drawStageSelect() {
  menuBackground();
  const ck = G.chars.join();
  if (G.prioChars !== ck) { G.prioChars = ck; prioritizeAssets(fightAssetKeys(G.chars, null)); }
  header("ВЫБЕРИ ЛОКАЦИЮ");
  const cols = stageCols(), rows = Math.ceil(STAGE_IDS.length / cols), gx = 20, gy = rows > 2 ? 16 : 26;
  const w = cols === 4 ? 290 : Math.floor((W - 80 - gx * (cols - 1)) / cols), h = rows > 2 ? 140 : cols === 4 ? 190 : 172;
  const y0 = rows > 2 ? 130 : 150;
  STAGE_IDS.forEach((id, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, STAGE_IDS.length - row * cols);
    const x0 = W / 2 - (inRow * w + (inRow - 1) * gx) / 2;
    const x = x0 + (i % cols) * (w + gx);
    const y = y0 + row * (h + gy);
    const active = G.sel === i;
    panel(x, y, w, h, { active });
    const bg = img("thumb." + id) || img("bg." + id);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 10, y + 10, w - 20, h - 60);
    ctx.clip();
    if (bg) drawCover(bg, x + 10, y + 10, w - 20, h - 60, active ? 1.06 + Math.sin(G.time) * 0.02 : 1);
    if (!active) { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(x, y, w, h); }
    ctx.restore();
    text(`${i + 1}`, x + 26, y + h - 26, { size: 18, font: FONT_PIX, color: "#9d97c9", shadow: false });
    text(STAGES[id].name, x + w / 2 + 10, y + h - 25, { size: fitText(STAGES[id].name, w - 90, 24), align: "center", color: active ? GOLD : "#fff", stroke: "#000", strokeW: 5 });
    region("stage" + i, x, y, w, h, () => chooseStage(id), () => { G.sel = i; });
  });
  footer("← → ↑ ↓  ВЫБОР    ENTER  В БОЙ    ESC  НАЗАД");
  backButton();
}
function stageCols() { return STAGE_IDS.length <= 8 ? 4 : 5; }
function chooseStage(id) {
  confirmSfx();
  G.stage = id;
  prioritizeAssets(fightAssetKeys(G.chars, id));
  startVs();
}

/* VS screen ------------------------------------------------------------ */
const VS_LINES = [
  "КТО-ТО СЕГОДНЯ ВЫЛЕТИТ", "БИФ СЕЗОНА", "КОМУ-ТО ПИЗД*Ц", "ГОТОВЬТЕ ПАНЧИ",
  "ЧЬЮ КАРЬЕРУ ХОРОНИМ?", "БУДЕТ МЯСО", "ПОШУМИМ, БЛ*ТЬ",
];
function startVs() {
  const [c0, c1] = G.chars;
  const key = [c0, c1].sort().join();
  let line, by = null;
  if (G.arcade && G.arcadeSecret) line = ARCADE_TEXT.secretVs;
  else if (G.arcadeBoss) line = ARCADE_TEXT.bossVs;
  else if (c0 === c1) line = G.twin ? "ЗЛОЙ ДВОЙНИК ВЫХОДИТ НА СЦЕНУ" : "КТО ИЗ ВАС ТРУШНЫЙ?";
  else line = pick(VS_LINES);   // only impersonal lines here — no quotes of real artists
  G.vs = { t0: G.time, line, by, slam: false };
  setScreen("vs");
}

function drawVs() {
  const v = G.vs;
  const t = G.time - v.t0;
  if (!deferredStarted) loadDeferred();
  const waiting = t > 3.0 || v.skip;
  if (waiting && (fightAssetsReady() || t > 25)) { startMatch(); return; }
  const [c0, c1] = G.chars;
  const d0 = CHARS[c0], d1 = G.twin && c0 === c1 ? twinData(c1) : CHARS[c1];
  // background: two coloured halves split by a diagonal
  ctx.fillStyle = "#07040f";
  ctx.fillRect(0, 0, W, H);
  const split = (side, col) => {
    const g = ctx.createLinearGradient(side ? W : 0, 0, W / 2, 0);
    g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    if (!side) { ctx.moveTo(0, 0); ctx.lineTo(W / 2 + 90, 0); ctx.lineTo(W / 2 - 90, H); ctx.lineTo(0, H); }
    else { ctx.moveTo(W, 0); ctx.lineTo(W / 2 + 90, 0); ctx.lineTo(W / 2 - 90, H); ctx.lineTo(W, H); }
    ctx.closePath();
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
  };
  split(0, d0.color);
  split(1, d1.color);
  // speed lines
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const y = (i * 29) % H;
    const x = ((t * 1800 + i * 151) % (W / 2 + 300)) - 150;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 120, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - x, y + 14); ctx.lineTo(W - x + 120, y + 14); ctx.stroke();
  }
  // fighters slide in
  const ease = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const k = ease(t / 0.45);
  const x0 = -260 + k * 560, x1 = W + 260 - k * 560;
  const bob = Math.sin(G.time * 3) * 0.01;
  drawPose(c0, "idle", x0, 640, { dir: 1, scale: 1.75, sy: 1 + bob });
  drawPose(c1, "idle", x1, 640, { dir: -1, scale: 1.75, sy: 1 - bob, tint: G.twin && c0 === c1 ? TWIN_TINT : null });
  // names
  const nk = ease((t - 0.25) / 0.35);
  text(d0.name, 40 - (1 - nk) * 400, 90, { size: fitText(d0.name, 520, 64), color: "#fff", gradient: ["#fff", d0.color], stroke: "#000", strokeW: 9 });
  text(d1.name, W - 40 + (1 - nk) * 400, 90, { size: fitText(d1.name, 520, 64), align: "right", gradient: ["#fff", d1.color], stroke: "#000", strokeW: 9 });
  text(G.mode === 1 ? "ВЫ" : "1P", 44, 140, { size: 16, font: FONT_PIX, color: P_COLORS[0], alpha: nk });
  text(G.mode === 1 ? "CPU" : "2P", W - 44, 140, { size: 16, font: FONT_PIX, align: "right", color: G.mode === 1 ? "#ff8a8a" : P_COLORS[1], alpha: nk });
  // VS slam with lightning
  if (t > 0.45) {
    if (!v.slam) { v.slam = true; playSfx("uiVs"); }
    const sk = clamp((t - 0.45) / 0.15, 0, 1);
    const sc = 2.4 - 1.4 * sk;
    ctx.save();
    ctx.translate(W / 2, 330);
    ctx.scale(sc, sc);
    // lightning
    ctx.strokeStyle = `rgba(190,220,255,${0.5 + 0.5 * Math.random()})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = "#9fd0ff"; ctx.shadowBlur = 18;
    for (let b = 0; b < 2; b++) {
      ctx.beginPath();
      let lx = -10 + b * 20, ly = -200;
      ctx.moveTo(lx, ly);
      while (ly < 200) { ly += rand(20, 40); lx += rand(-26, 26); ctx.lineTo(lx, ly); }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    text("VS", 0, 0, { size: 120, align: "center", gradient: ["#fff6c8", GOLD, "#ff5a2e"], stroke: "#1a0830", strokeW: 14, shadowOff: 8 });
    ctx.restore();
    if (t < 0.6) { ctx.fillStyle = `rgba(255,255,255,${(0.6 - t) * 4})`; ctx.fillRect(0, 0, W, H); }
  }
  // taunt
  if (t > 0.8) {
    const a = clamp((t - 0.8) / 0.25, 0, 1);
    const who = v.by === null ? "" : (v.by === 0 ? d0.name : d1.name) + ": ";
    const line = v.by === null ? v.line : `«${v.line}»`;
    ctx.fillStyle = `rgba(0,0,0,${0.6 * a})`;
    ctx.fillRect(0, 470, W, 64);
    text(who + line, W / 2, 503, { size: fitText(who + line, W - 120, 34), align: "center", color: "#fff6c8", stroke: "#000", strokeW: 6, alpha: a });
  }
  text("АРЕНА: " + STAGES[G.stage].name, W / 2, H - 24, { size: 14, font: FONT_PIX, align: "center", color: "#c9c2ff", alpha: 0.85 });
  if (waiting) text("ЗАГРУЗКА АРЕНЫ…", W / 2, H - 56, { size: 14, font: FONT_PIX, align: "center", color: GOLD, alpha: 0.5 + 0.5 * Math.sin(G.time * 6) });
  region("vs-skip", 0, 0, W, H, () => { if (G.time - v.t0 > 0.4) v.skip = true; });
}

/* Pause */
const PAUSE_ITEMS = ["ПРОДОЛЖИТЬ", "ЗВУК", "ВЫЙТИ В МЕНЮ"];
function drawPause() {
  ctx.fillStyle = "rgba(6,4,18,0.78)";
  ctx.fillRect(0, 0, W, H);
  text("ПАУЗА", W / 2, 170, { size: 70, align: "center", gradient: ["#fff6c8", GOLD], stroke: "#1a0830", strokeW: 8 });
  PAUSE_ITEMS.forEach((label, i) => {
    const w = 420, h = 66;
    const x = W / 2 - w / 2;
    const y = 250 + i * 86;
    const active = G.pauseSel === i;
    panel(x, y, w, h, { active });
    const l = i === 1 ? `ЗВУК: ${muted ? "ВЫКЛ" : "ВКЛ"}` : label;
    text(l, W / 2, y + h / 2 + 2, { size: 28, align: "center", color: active ? GOLD : "#fff", stroke: "#000", strokeW: 5 });
    region("pause" + i, x, y, w, h, () => pauseChoose(i), () => { G.pauseSel = i; });
  });
  const lines = padSeen ? ["□ рука   × нога   ○ спец   R1 блок", "△ ПАНЧ   L1 бросок   R2 рывок"]
    : isTouch ? ["джойстик: ходьба, прыжок, присед", "БЛОК — кнопка над джойстиком"] : G.mode === 1
    ? ["←→ ходьба  ↑ прыжок  ↓ присед", "A рука   S нога   D спецприём   F блок"]
    : ["1P: WASD, F/G/H, R — блок      2P: стрелки, J/K/L, ; — блок", "↓ + блок — блок в приседе"];
  lines.forEach((ln, i) => text(ln, W / 2, 540 + i * 30, { size: 19, align: "center", color: "#9d97c9", shadow: false }));
}
function pauseChoose(i) {
  confirmSfx();
  if (i === 0) { G.paused = false; startMusic(); updateTouchVisibility(); }
  if (i === 1) setMuted(!muted);
  if (i === 2) { stopMusic(); F = null; G.tutorial = null; setScreen("mode"); }
}

/* End screen */
function drawEnd() {
  const bg = img("bg." + G.stage);
  if (bg) drawCover(bg, 0, 0, W, H, 1.07);
  ctx.fillStyle = "rgba(6,4,18,0.62)";
  ctx.fillRect(0, 0, W, H);
  const mw = F.matchWinner;

  if (mw >= 0) {
    const w = F.fighters[mw];
    const l = F.fighters[1 - mw];
    // rays
    ctx.save();
    ctx.translate(820, 360);
    ctx.rotate(G.time * 0.2);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.fillStyle = "rgba(255,213,74,0.07)";
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(600, -60); ctx.lineTo(600, 60);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    drawPose(l.cid, "lose", 330, 610, { dir: 1, scale: 1.15, alpha: 0.85, tint: l.twin ? TWIN_TINT : null });
    drawPose(w.cid, "win", 820, 620, { dir: -1, scale: Math.min(1.55, 390 / ((SPRITE_META[w.cid].win || {}).ay || 240)), sy: 1 + 0.02 * Math.sin(G.time * 4), tint: w.twin ? TWIN_TINT : null });
    text(l.data.loseTitle, W / 2, 80, { size: 66, align: "center", gradient: ["#fff6c8", GOLD, "#ff7a3d"], stroke: "#1a0830", strokeW: 9 });
    let result;
    if (G.mode === 1) result = mw === 0 ? "ПОБЕДА!" : "ПОРАЖЕНИЕ";
    else result = `ПОБЕДИЛ ИГРОК ${mw + 1}`;
    text(result, W / 2, 148, { size: 34, align: "center", color: mw === 0 || G.mode === 2 ? "#8dff7a" : "#ff8a8a", stroke: "#000", strokeW: 6 });
  } else {
    drawPose(F.fighters[0].cid, "idle", 430, 610, { dir: 1, scale: 1.3 });
    drawPose(F.fighters[1].cid, "idle", 850, 610, { dir: -1, scale: 1.3 });
    text("НИЧЬЯ", W / 2, 90, { size: 80, align: "center", gradient: ["#fff", "#9a8cff"], stroke: "#1a0830", strokeW: 9 });
  }
  text(`СЧЁТ ${F.wins[0]} : ${F.wins[1]}`, W / 2, 196, { size: 18, font: FONT_PIX, align: "center", color: "#fff" });
  if (F.legend) {
    const k = 1 + Math.sin(G.time * 5) * 0.04;
    ctx.save();
    ctx.translate(W / 2, 240);
    ctx.scale(k, k);
    text("★ ЛЕГЕНДА РЭП-БАТТЛОВ ★", 0, 0, { size: 30, align: "center", gradient: ["#fff6c8", GOLD, "#ff9a3d"], stroke: "#2a0d00", strokeW: 6 });
    ctx.restore();
  }

  const items = G.arcade ? arcadeEndItems() : [
    ["РЕВАНШ", rematch],
    ["СОХРАНИТЬ", shareResult],
    ["СМЕНИТЬ БОЙЦА", () => { confirmSfx(); G.chars = [null, null]; G.picking = 0; setScreen("character"); }],
    ["МЕНЮ", () => { confirmSfx(); setScreen("mode"); }],
  ];
  const bw = 270, bh = 58, gap = 18;
  const x0 = W / 2 - (bw * items.length + gap * (items.length - 1)) / 2;
  items.forEach(([label, fn], i) => {
    const x = x0 + i * (bw + gap);
    const y = H - 92;
    const active = G.sel === i;
    panel(x, y, bw, bh, { active });
    const isShare = label === "СОХРАНИТЬ";
    if (isShare) {
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(G.time * 5);
      ctx.fillStyle = "#ff86d8";
      ctx.fillRect(x, y, bw, bh);
      ctx.restore();
    }
    text(label, x + bw / 2, y + bh / 2 + 2, { size: 24, align: "center", color: active ? GOLD : (isShare ? "#ffd1f2" : "#fff"), stroke: "#000", strokeW: 5 });
    region("end" + i, x, y, bw, bh, () => { if (G.endLock <= 0) fn(); }, () => { G.sel = i; });
  });
  G.endItems = items;
  drawSharePreview();
  tgButton(14, 12);
}
function rematch() {
  confirmSfx();
  startMatch();
}

/* Loading */
function drawLoading() {
  ctx.fillStyle = "#08060f";
  ctx.fillRect(0, 0, W, H);
  const p = total ? loaded / total : 0;
  ctx.fillStyle = "#1d1640";
  ctx.fillRect(W / 2 - 250, H / 2 + 20, 500, 18);
  ctx.fillStyle = GOLD;
  ctx.fillRect(W / 2 - 250, H / 2 + 20, 500 * p, 18);
  text("ЗАГРУЗКА", W / 2, H / 2 - 20, { size: 22, font: FONT_PIX, align: "center", color: CREAM });
}

/* ------------------------------------------------------------------ */
/* Secrets / easter eggs                                               */
/* ------------------------------------------------------------------ */
// Achievements for the result of a match: winner (human) / loser / arena
const SECRETS = [
  { id: "a_50", name: "5:0", win: "slava", lose: "oxxxy", how: "Победи Оксимирона за Славу КПСС" },
  { id: "a_guf_dead", name: "ГУФ УМЕР", lost: "guf", how: "Проиграй за Гуфа" },
  { id: "a_sleeping", name: "СПЯЩАЯ КРАСАВИЦА", win: "noize", lose: "guf", how: "Победи Гуфа за Нойза" },
  { id: "a_chepushila", name: "ЧЕПУШИЛА", win: "guf", lose: "noize", how: "Победи Нойза за Гуфа" },
  { id: "a_ded", name: "ДЕД СЪЕЛ МОРГЕНШТЕРНА", win: "oxxxy", lose: "morgen", how: "Победи Моргенштерна за Оксимирона" },
  { id: "a_trombone", name: "ГРУСТНЫЙ ТРОМБОН", win: "morgen", lose: "oxxxy", how: "Победи Оксимирона за Моргенштерна" },
  { id: "a_khabarovsk", name: "ХАБАРОВСК", win: "slava", stage: "fountains", how: "Выиграй за Славу КПСС на Мёртвых фонтанах" },
  { id: "a_show", name: "ВСЕ ХОТЯТ ОТ МЕНЯ ШОУ", win: "morgen", stage: "circus", how: "Выиграй за Моргенштерна в Цирке" },
  { id: "a_greenpark", name: "ГРИН ПАРК ЖИВ", win: "oxxxy", stage: "londograd", how: "Выиграй за Оксимирона в Лондонграде" },
  { id: "a_center", name: "СПАСИБО ЦЕНТРУ ЗА ЭТО!", win: "guf", stage: "moscow", how: "Выиграй за Гуфа в Городе дорог" },
  { id: "a_pussyboy", name: "ПУСИБОЙ", special: "kreed", how: "Используй спецприём Егора" },
  { id: "a_truegangsta", name: "ЕДИНСТВЕННЫЙ ТРУ-ГАНГСТА-РЭПЕР", lose: "chip", how: "Победи Чипинкоса" },
  { id: "a_hood", name: "МАСТЕР КАПЮШОН", lose: "babangida", how: "Победи Бабангиду" },
  { id: "a_ragequit", name: "RAGE QUIT", fat: "loki", how: "Сделай фаталити Локимина — удали соперника" },
  { id: "a_nuke", name: "ЯДЕРКА", win: "atl", stage: "wasteland", how: "Выиграй за ATL в Апокалипсисе" },
  { id: "a_mayor", name: "СЛОВО МЭРА", win: "oxxxy", stage: "gorgorod", how: "Выиграй за Оксимирона в Горгороде" },
  { id: "a_suck", name: "ПОСОСИ", win: "morgen", stage: "mansion", how: "Выиграй за Моргенштерна в его особняке" },
  { id: "a_sunset", name: "МАЛИНОВЫЙ ЗАКАТ", win: "korzh", stage: "roof", how: "Выиграй за Коржа на Закате" },
  { id: "a_piter", name: "ЭТО РАЗБОРКА ПИТЕРСКАЯ", event: "piter", how: "Сведи в бою Крип-а-Крипа и Смоки Мо" },
  { id: "a_panelka", name: "ПАНЕЛЬКА", win: "husky", stage: "yard", how: "Выиграй за Хаски у падика" },
  { id: "a_sugarman", name: "САХАРНЫЙ ЧЕЛОВЕК", fat: "fludd", how: "Сделай ФЛАДАЛИТИ" },
  { id: "a_auf", name: "АУФ", fat: "sqwoz", how: "Сделай фаталити за SQWOZ BAB" },
  { id: "a_collector", name: "КОЛЛЕКЦИОНЕР", event: "allfat", how: "Попробуй все фаталити" },
  { id: "a_rapgod", name: "RAP GOD", event: "rapgod", how: "Выиграй бой на сложном боте, не пропустив ни одного удара" },
];
const SECRET_INFO = Object.fromEntries(SECRETS.map((s) => [s.id, { how: s.how, hint: s.how }]));
// Called once per finished match
function checkMatchSecrets() {
  if (!F || G.tutorial) return;
  const mw = F.matchWinner;
  const humans = F.fighters.filter((f) => !f.isBot);
  for (const sd of SECRETS) {
    if (sd.special || sd.fat || sd.event) continue;   // unlocked where they happen
    if (sd.lost) {   // a human lost with this fighter
      if (mw >= 0 && humans.some((f) => f.slot !== mw && f.cid === sd.lost)) unlockSecret(sd.id);
      continue;
    }
    if (mw < 0) continue;
    const w = F.fighters[mw], l = F.fighters[1 - mw];
    if (w.isBot) continue;
    if (sd.win && w.cid !== sd.win) continue;
    if (sd.lose && l.cid !== sd.lose) continue;
    if (sd.stage && G.stage !== sd.stage) continue;
    unlockSecret(sd.id);
  }
}
// test link only: ?unlock opens Chipinkos and Babangida for testing (and remembers it there)
if (/[?&]unlock/.test(location.search) && (/\/test-/.test(location.pathname) || location.hostname === "localhost")) { store.set("chip_unlocked", true); store.set("bab_unlocked", true); }
if (store.get("chip_unlocked", false) && !CHAR_IDS.includes("chip")) CHAR_IDS.push("chip");
if (store.get("bab_unlocked", false) && !CHAR_IDS.includes("babangida")) CHAR_IDS.push("babangida");
const secrets = new Set(store.get("secrets", []).filter((id) => SECRETS.some((s) => s.id === id)));
G.cheats = { madness: false, tea: false };
G.banner = null;

function unlockSecret(id) {
  const def = SECRETS.find((s) => s.id === id);
  if (!def) return;
  const isNew = !secrets.has(id);
  if (isNew) {
    secrets.add(id);
    store.set("secrets", [...secrets]);
  }
  G.banner = { title: isNew ? "СЕКРЕТ ОТКРЫТ!" : "СЕКРЕТ", name: def.name, t: 3, isNew, count: secrets.size };
  if (isNew) playSfx("secret_unlock");
}

function drawBanner(dt) {
  const b = G.banner;
  if (!b) return;
  b.t -= dt;
  if (b.t <= 0) { G.banner = null; return; }
  const appear = easeOut((3 - b.t) / 0.3);
  const leave = clamp(b.t / 0.3, 0, 1);
  const y = -90 + (G.screen === "end" ? 620 : 250) * appear;
  ctx.save();
  ctx.globalAlpha = leave;
  const w = Math.max(440, textWidth(b.name, 30) + 80);
  const x = W / 2 - w / 2;
  panel(x, y - 50, w, 104, { active: true, border: "#ff86d8" });
  ctx.restore();
  text(b.title, W / 2, y - 20, { size: 15, font: FONT_PIX, align: "center", color: "#ff86d8", alpha: leave });
  text(b.name, W / 2, y + 16, { size: 30, align: "center", gradient: ["#fff6c8", GOLD], stroke: "#000", strokeW: 5, alpha: leave });
  if (b.isNew) text(`${b.count} / ${SECRETS.length}`, x + w - 16, y + 40, { size: 10, font: FONT_PIX, align: "right", color: "#c9c2ff", shadow: false, alpha: leave });
}

function cheatBadges() {
  const out = [];
  if (G.cheats.madness) out.push("БЕЗУМИЕ");
  if (G.cheats.tea) out.push("ЧАЙНЫЙ РЕЖИМ");
  return out.join(" • ");
}

// Codes typed on the title screen (none at the moment).
const CODES = [];
const codeBuf = [];
function checkCodes(code) {
  codeBuf.push(code);
  if (codeBuf.length > 12) codeBuf.shift();
  for (const c of CODES) {
    const tail = codeBuf.slice(-c.seq.length);
    if (tail.length === c.seq.length && tail.every((k, i) => k === c.seq[i])) {
      codeBuf.length = 0;
      playSfx("ko");
      c.run();
      return;
    }
  }
}

/* Evil twin */
const TWIN_TINT = { color: "#2a0645", a: 0.5 };
const ACCUSATIVE = { guf: "ГУФА", noize: "НОЙЗА", oxxxy: "ОКСИ", morgen: "МОРГЕНА", maybe: "МЭЙБИ БЭЙБИ", kreed: "ЕГОРА", slava: "СЛАВУ КПСС", atl: "ATL", korzh: "МАКСА КОРЖА", face: "FACE", chip: "ЧИПИНКОСА", ramirez: "РЭМА", husky: "ХАСКИ", babangida: "БАБАНГИДУ", sqwoz: "SQWOZ BAB", shilo: "ШИЛО", krip: "КРИП-А-КРИПА", tito: "ТИТОМИРА", loki: "ЛОКИ", smoky: "СМОКИ МО", fludd: "ФЛАДДА" };
const FEMININE = new Set(["maybe"]);
function twinData(cid) {
  const base = CHARS[cid];
  return {
    ...base,
    name: (FEMININE.has(cid) ? "ЗЛАЯ " : "ЗЛОЙ ") + base.name,
    color: "#c45cff",
    power: base.power * 1.05,
    loseTitle: "ДВОЙНИК ИСПАРИЛСЯ",
    quotes: ["Я — ЭТО ТЫ, НО ЛУЧШЕ", "ТЫ КОПИЯ, Я ОРИГИНАЛ", ...base.quotes],
  };
}
function accusative(f) {
  return (f.twin ? (FEMININE.has(f.cid) ? "ЗЛУЮ " : "ЗЛОГО ") : "") + ACCUSATIVE[f.cid];
}
function fighterTint(f) {
  if (f.buffT > 0) return { color: GOLD, a: 0.22 + 0.14 * Math.sin(G.time * 14) };
  if (f.chillT > 0) return { color: "#9fdcff", a: 0.3 + 0.25 * Math.min(1, f.chillT) };
  if (f.twin) return TWIN_TINT;
  return null;
}
function drawTwinPreview(id, x) {
  const y = 610;
  const g = ctx.createRadialGradient(x, y - 120, 10, x, y - 120, 220);
  g.addColorStop(0, "rgba(196,92,255,0.4)");
  g.addColorStop(1, "rgba(196,92,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - 230, y - 360, 460, 420);
  const b = Math.sin(G.time * 3.2);
  drawPose(id, "idle", x, y, { dir: -1, scale: charCols() < selectCount() ? 0.9 : 1.25, sy: 1 + 0.012 * b, tint: TWIN_TINT });
  text("ЗЛОЙ ДВОЙНИК", x, y + 34, { size: 14, font: FONT_PIX, align: "center", color: "#c45cff" });
}

/* Legend: beat the hard bot without losing a round */
function legends() { return store.get("legends", []); }
function checkRapGod() {
  if (G.mode === 1 && !G.tutorial && !G.botVsBot && F.matchWinner === 0 && G.difficulty === "hard" && !F.hurt0) unlockSecret("a_rapgod");
}
function checkLegend() {
  if (G.mode === 1 && F.matchWinner === 0 && G.difficulty === "hard" && F.wins[1] === 0) {
    F.legend = true;
    const l = legends();
    const cid = F.fighters[0].cid;
    if (!l.includes(cid)) { l.push(cid); store.set("legends", l); }
    unlockSecret("legend");
  }
}

/* Quote-triggered effects */
function quoteEffect(f, line) {
  if (!F) return;
  if (line.includes("ПТИЧКИ")) {
    const fromLeft = Math.random() < 0.5;
    for (let i = 0; i < 16; i++) {
      F.birds.push({
        x: fromLeft ? rand(-400, -20) : rand(W + 20, W + 400),
        y: rand(110, 380), vx: (fromLeft ? 1 : -1) * rand(260, 420), vy: rand(-20, 10),
        ph: rand(0, 6.28), s: pick([3, 4, 4, 5]),
      });
    }
    unlockSecret("birds");
  } else if (line.includes("ДЕСТРОЙ")) {
    F.flicker = 1.6;
    F.shake = Math.max(F.shake, 14);
    unlockSecret("destroy");
  } else if (line === "МНЕ ПОХ") {
    F.money = 2.6;
    unlockSecret("money");
  } else if (line.includes("ЖРИ МОЙ БУРГЕР")) {
    F.fatT = 5; F.fatSlot = 1 - f.slot;   // the opponent "ate too much"
    unlockSecret("burger");
  } else if (line.includes("НЕБО ПОМОЖЕТ")) {
    F.skyT = 1.6; F.skySlot = f.slot;   // a beam of light from the sky heals him
    if (!f.ko) { f.hp = Math.min(100, f.hp + 8); popup(f.x, f.y - 300, "+8", "#8dff7a", 30); }
    unlockSecret("sky");
  } else if (line.includes("ТАНЦУЙТЕ")) {
    F.disco = 4;   // disco: strobing coloured lights, everyone bounces
    unlockSecret("dance");
  } else if (line.startsWith("АНТИХАЙП")) {
    if (img("fx.zamay")) F.peek = { key: "zamay", t: 0, side: f.slot === 0 ? 1 : -1 };   // a face peeks in from the edge
    else F.antihype = 3.5;   // until the picture exists: the arena loses its colour
    unlockSecret("antihype");
  } else if (line.includes("ЭТУ РОЗУ")) {
    F.roses = 2.6;
    unlockSecret("rose");
  } else if (line.includes("СИЛИКОНОВЫЙ ГНОМ")) {
    F.peek = { key: "gnome", t: 0, side: f.slot === 0 ? 1 : -1 };   // a gnome's face peeks in from the edge
    unlockSecret("eggs");
  } else if (line === "АЛИК В УДАРЕ") {
    f.bigT = 5;   // Guf grows for a few seconds
    unlockSecret("alik");
  }
}

const EGG_COLORS = [["#ff9ad5", "#ffffff"], ["#8fd3ff", "#ffe27a"], ["#b6ff8f", "#ff7ad9"], ["#ffe27a", "#5fa8ff"], ["#c7a6ff", "#ffffff"]];
function updateEasterFx(dt) {
  F.flicker = Math.max(0, F.flicker - dt);
  if (F.roses > 0) {
    F.roses -= dt;
    if (Math.random() < dt * 16) {
      F.particles.push({ type: "rose", x: rand(30, W - 30), y: rand(-60, -10), vx: rand(-40, 40), vy: rand(90, 170),
        life: 4, max: 4, rot: rand(0, 6.28), spin: rand(-4, 4) });
    }
  }
  for (const p of F.particles) if (p.type === "rose") { p.rot += p.spin * 1 / 60; if (p.y > FLOOR_Y) { p.vy = 0; p.vx = 0; p.spin = 0; p.life = Math.min(p.life, 1); } }
  if (F.eggs > 0) {
    F.eggs -= dt;
    if (Math.random() < dt * 14) {
      const [c1, c2] = pick(EGG_COLORS);
      F.particles.push({ type: "egg", x: rand(40, W - 40), y: rand(-80, -20), vx: rand(-50, 50), vy: rand(60, 160), g: 1100,
        life: 3.2, max: 3.2, rot: rand(-0.4, 0.4), spin: rand(-3, 3), c1, c2, size: rand(1.2, 1.8), bounces: 0 });
    }
  }
  for (const p of F.particles) {
    if (p.type !== "egg") continue;
    p.rot += p.spin * dt;
    if (p.y > FLOOR_Y + 6 && p.vy > 0) {
      p.y = FLOOR_Y + 6;
      p.bounces++;
      p.vy = p.bounces < 3 ? -p.vy * 0.42 : 0;
      p.vx *= 0.6;
      p.spin *= 0.5;
      if (p.bounces === 1) p.life = Math.min(p.life, 1.4);
    }
  }
  if (F.money > 0) {
    F.money -= dt;
    for (let i = 0; i < 2; i++) {
      F.particles.push({ type: "bill", x: rand(0, W), y: rand(-60, -10), vx: rand(-40, 40), vy: rand(120, 220),
        life: 4, max: 4, rot: rand(0, 6.28), spin: rand(-5, 5), sway: rand(0, 6.28) });
    }
  }
  for (const b of F.birds) { b.x += b.vx * dt; b.y += b.vy * dt + Math.sin(G.time * 3 + b.ph) * 30 * dt; b.ph += dt * 14; }
  F.birds = F.birds.filter((b) => b.x > -500 && b.x < W + 500 && Math.abs(b.vx) > 0 && !(b.vx > 0 && b.x > W + 60) && !(b.vx < 0 && b.x < -60));
}

// A face peeks in from the screen edge for a moment (Maybe's gnome, Slava's Zamay)
function drawPeek() {
  const p = F.peek;
  if (!p) return;
  p.t += 1 / 60;
  const T = 1.6;
  if (p.t > T) { F.peek = null; return; }
  const k = p.t < 0.25 ? p.t / 0.25 : p.t > T - 0.3 ? (T - p.t) / 0.3 : 1;   // slide in, hold, slide out
  const e = 1 - Math.pow(1 - Math.max(0, k), 3);
  const im = img("fx." + p.key);
  const right = p.side > 0;
  ctx.save();
  if (im) {
    // the picture is drawn for the right edge (Zamay is cut off on the right and bottom); mirrored for the left
    const h = im.naturalHeight, w = im.naturalWidth;
    const flush = p.key === "zamay";
    const x = W - w * e + (flush ? 0 : 20);
    const y = H - h - (flush ? 0 : 60) + (flush ? 0 : Math.sin(p.t * 9) * 4);
    if (!right) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    ctx.drawImage(im, Math.round(x), Math.round(y), w, h);
  } else if (p.key === "gnome") {
    const size = 250;
    ctx.translate((right ? W - size * e + 30 : -size + size * e - 30) + size / 2, H - size - 70 + size / 2);
    ctx.rotate((right ? -1 : 1) * 0.18);
    if (!right) ctx.scale(-1, 1);
    drawGnomeFace(size);
  }
  ctx.restore();
}
// Pixel gnome drawn in code until a picture is added (assets/effects/gnome.png)
function drawGnomeFace(size) {
  const u = size / 32;
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round((x - 16) * u), Math.round((y - 16) * u), Math.ceil(w * u), Math.ceil(h * u)); };
  // hat
  R(13, 0, 4, 2, "#c41f2f"); R(11, 2, 8, 3, "#d8293a"); R(9, 5, 13, 3, "#d8293a"); R(7, 8, 18, 3, "#e23a4a"); R(17, 3, 2, 2, "#ff7a86");
  R(6, 11, 20, 2, "#f4f0e6");
  // face
  R(8, 13, 16, 7, "#f2c19a"); R(8, 13, 16, 1, "#e0a87e");
  R(11, 15, 3, 2, "#1a1020"); R(18, 15, 3, 2, "#1a1020"); R(12, 15, 1, 1, "#ffffff"); R(19, 15, 1, 1, "#ffffff");
  R(10, 14, 4, 1, "#8a6a52"); R(18, 14, 4, 1, "#8a6a52");
  R(14, 16, 4, 4, "#ff9a8a"); R(15, 16, 2, 1, "#ffc2b8");
  R(9, 18, 3, 2, "#ffa2a2"); R(20, 18, 3, 2, "#ffa2a2");
  // beard
  R(7, 20, 18, 4, "#f7f4ec"); R(8, 24, 16, 3, "#f7f4ec"); R(10, 27, 12, 2, "#ece6d8"); R(13, 29, 6, 2, "#e2dccd");
  R(14, 21, 4, 1, "#c27b6a");
  // outline-ish shadow
  R(7, 20, 1, 4, "#d8d0c0"); R(24, 20, 1, 4, "#d8d0c0");
}
function drawEasterFx() {
  if (F.skyT > 0) {
    F.skyT -= 1 / 60;
    const f = F.fighters[F.skySlot];
    const a = clamp(F.skyT / 0.4, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(f.x - 70, 0, f.x + 70, 0);
    g.addColorStop(0, "rgba(255,240,180,0)"); g.addColorStop(0.5, `rgba(255,240,180,${0.45 * a})`); g.addColorStop(1, "rgba(255,240,180,0)");
    ctx.fillStyle = g;
    ctx.fillRect(f.x - 70, -50, 140, f.y + 60);
    ctx.restore();
    if (Math.random() < 0.5) F.particles.push({ type: "sq", x: f.x + rand(-50, 50), y: f.y - rand(0, 240), vx: 0, vy: -rand(40, 120), life: 0.6, max: 0.6, size: 4, color: "#fff6c8" });
  }
  if (F.disco > 0) {
    F.disco -= 1 / 60;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const cols = ["rgba(255,60,200,0.16)", "rgba(60,200,255,0.16)", "rgba(255,230,60,0.16)", "rgba(120,255,120,0.16)"];
    for (let i = 0; i < 4; i++) {
      const sx = W * (0.15 + i * 0.23) + Math.sin(G.time * (2 + i)) * 120;
      ctx.fillStyle = cols[(i + Math.floor(G.time * 6)) % 4];
      ctx.beginPath(); ctx.moveTo(sx - 20, 0); ctx.lineTo(sx + 20, 0); ctx.lineTo(sx + 160, FLOOR_Y); ctx.lineTo(sx - 160, FLOOR_Y); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    if (Math.random() < 0.5) F.ambient.push({ x: rand(0, W), y: -10, vx: rand(-30, 30), vy: rand(80, 160), s: 6, life: 6, c: pick(["#ff6bd6", "#5fd8ff", "#ffd54a", "#8dff7a"]), sway: rand(0, 6), spin: rand(2, 8) });
  }
  if (F.antihype > 0) {
    F.antihype -= 1 / 60;
    ctx.save();
    ctx.globalAlpha = Math.min(1, F.antihype);
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "#808080";
    ctx.fillRect(-50, -50, W + 100, H + 100);
    ctx.restore();
  }
  // birds: tiny flapping pixel silhouettes
  ctx.fillStyle = "#14101f";
  for (const b of F.birds) {
    const s = b.s;
    const up = Math.sin(b.ph) > 0;
    const x = Math.round(b.x), y = Math.round(b.y);
    ctx.fillRect(x - 2 * s, y, 4 * s, 2 * s);                 // body
    if (up) {
      ctx.fillRect(x - 5 * s, y - 2 * s, 3 * s, s);
      ctx.fillRect(x + 2 * s, y - 2 * s, 3 * s, s);
      ctx.fillRect(x - 3 * s, y - s, 2 * s, s);
      ctx.fillRect(x + s, y - s, 2 * s, s);
    } else {
      ctx.fillRect(x - 5 * s, y + 2 * s, 3 * s, s);
      ctx.fillRect(x + 2 * s, y + 2 * s, 3 * s, s);
    }
  }
  // "ЩА УСТРОЮ ДЕСТРОЙ": stage lights go crazy
  if (F.flicker > 0) {
    const on = Math.floor(G.time * 16) % 2 === 0;
    ctx.fillStyle = on ? `rgba(255,255,255,${0.12 * F.flicker})` : `rgba(0,0,0,${0.3 * Math.min(1, F.flicker)})`;
    ctx.fillRect(-50, -50, W + 100, H + 100);
    if (on) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = pick(["rgba(255,60,180,0.12)", "rgba(60,180,255,0.12)", "rgba(255,220,60,0.12)"]);
      ctx.fillRect(-50, -50, W + 100, H + 100);
      ctx.restore();
    }
  }
}

function drawRose(p) {
  ctx.translate(Math.round(p.x), Math.round(p.y));
  ctx.rotate(p.rot);
  const im = img("fx.rose");
  if (im) { const h = 50, w = h * im.width / im.height; ctx.drawImage(im, -w / 2, -h * 0.28, w, h); return; }   // bloom at the origin
  ctx.fillStyle = "#1f6b2a";
  ctx.fillRect(-1, 4, 3, 22);
  ctx.fillRect(1, 12, 6, 3);
  ctx.fillStyle = "#1a0d14";
  ctx.fillRect(-8, -8, 16, 14);
  ctx.fillStyle = "#d81b3c";
  ctx.fillRect(-7, -7, 14, 12);
  ctx.fillStyle = "#ff4d6d";
  ctx.fillRect(-4, -5, 8, 6);
  ctx.fillStyle = "#9e0f2a";
  ctx.fillRect(-1, -3, 3, 3);
}

function drawEgg(p) {
  ctx.translate(Math.round(p.x), Math.round(p.y));
  ctx.rotate(p.rot);
  ctx.scale(p.size, p.size);
  const im = img("fx.egg");
  if (im) { const h = 36, w = h * im.width / im.height; ctx.drawImage(im, -w / 2, -h / 2, w, h); return; }
  const egg = () => { ctx.beginPath(); ctx.ellipse(0, 0, 11, 15, 0, 0, Math.PI * 2); };
  ctx.fillStyle = "#1a1030";
  ctx.beginPath(); ctx.ellipse(0, 0, 13, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.c1; egg(); ctx.fill();
  ctx.save(); egg(); ctx.clip();
  ctx.fillStyle = p.c2;
  ctx.fillRect(-12, -4, 24, 4);
  for (let i = -9; i <= 9; i += 6) ctx.fillRect(i - 1, 3, 3, 3);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(-6, -11, 4, 6);
  ctx.restore();
}

function drawBill(p) {
  ctx.translate(p.x + Math.sin(G.time * 3 + p.sway) * 14, p.y);
  ctx.rotate(p.rot + G.time * p.spin);
  ctx.scale(1, Math.abs(Math.cos(G.time * 4 + p.sway)) * 0.8 + 0.2);
  const im = img("fx.bill");
  if (im) { ctx.drawImage(im, -20, -12, 40, 24); return; }
  ctx.fillStyle = "#2e8b3e";
  ctx.fillRect(-14, -7, 28, 14);
  ctx.fillStyle = "#7be08a";
  ctx.fillRect(-12, -5, 24, 10);
  ctx.fillStyle = "#2e8b3e";
  ctx.fillRect(-4, -4, 8, 8);
}

/* ------------------------------------------------------------------ */
/* Share card                                                          */
/* ------------------------------------------------------------------ */
function fmtTime(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Always the public address, wherever the game was opened from (local file, test server, a mirror)
const GAME_URL = "https://dkdanceblog.github.io/mortalkombat/";
function gameUrl() { return GAME_URL; }

function shareTexts() {
  const mw = F.matchWinner;
  const [a, b] = F.fighters;
  const score = `${F.wins[0]}:${F.wins[1]}`;
  if (mw < 0) return { h1: "НИЧЬЯ", h2: `${a.data.name} = ${b.data.name}`, sub: `счёт ${score}` };
  const w = F.fighters[mw];
  const l = F.fighters[1 - mw];
  if (G.mode === 1) {
    if (mw === 0) return { h1: "Я УНИЧТОЖИЛ", h2: accusative(l), sub: `за ${fmtTime(F.stats.time)} • счёт ${score} • бот: ${F.diff.label.toLowerCase()}` };
    return { h1: w.data.name, h2: "МЕНЯ РАЗНЁС", sub: `счёт ${score} • отомсти за меня` };
  }
  return { h1: w.data.name, h2: "РАЗНЁС " + accusative(l), sub: `игрок ${mw + 1} победил • счёт ${score}` };
}

function fitText(str, maxW, size, font = FONT_HEAD, min = 18) {
  while (size > min && textWidth(str, size, font) > maxW) size -= (min < 18 ? 1 : 2);
  return size;
}

function makeShareCard(safe = false) {
  const CW = 1200, CH = 630;
  const c = document.createElement("canvas");
  c.width = CW;
  c.height = CH;
  const main = ctx;
  ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  try {
    shareSafe = safe ? shareSafeImgs : null;
    const bgKey = (ASSET_PATHS["bg." + G.stage] || "").split("/").pop().split(".")[0];
    const bg = safe ? shareSafeImgs.bg[bgKey] : img("bg." + G.stage);
    if (bg) drawCover(bg, 0, 0, CW, CH, 1.05);
    const shade = ctx.createLinearGradient(0, 0, CW, 0);
    shade.addColorStop(0, "rgba(8,5,22,0.92)");
    shade.addColorStop(0.55, "rgba(8,5,22,0.6)");
    shade.addColorStop(1, "rgba(8,5,22,0.15)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, CW, CH);

    const mw = F.matchWinner;
    if (mw >= 0) {
      const w = F.fighters[mw];
      const l = F.fighters[1 - mw];
      ctx.save();
      ctx.translate(930, 330);
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.fillStyle = "rgba(255,213,74,0.08)";
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(700, -70); ctx.lineTo(700, 70);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      drawPose(l.cid, "lose", 600, 600, { dir: 1, scale: 0.85, alpha: 0.9, tint: l.twin ? TWIN_TINT : null });
      drawPose(w.cid, "win", 930, 610, { dir: -1, scale: 1.6, tint: w.twin ? TWIN_TINT : null });
    } else {
      drawPose(F.fighters[0].cid, "idle", 780, 600, { dir: 1, scale: 1.3 });
      drawPose(F.fighters[1].cid, "idle", 1020, 600, { dir: -1, scale: 1.3 });
    }

    const t = shareTexts();
    text("РУССКИЙ РЭП НА ВЫЛЕТ", 56, 60, { size: 16, font: FONT_PIX, color: GOLD });
    const s1 = fitText(t.h1, 600, 72);
    const s2 = fitText(t.h2, 600, 72);
    text(t.h1, 56, 160, { size: s1, gradient: ["#ffffff", "#e6e0ff"], stroke: "#12051f", strokeW: 8 });
    text(t.h2, 56, 160 + Math.max(s1, 50) + 8, { size: s2, gradient: ["#fff6c8", GOLD, "#ff7a3d"], stroke: "#12051f", strokeW: 8 });
    text(t.sub, 56, 330, { size: fitText(t.sub, 620, 28), color: "#d8d0ff", stroke: "#000", strokeW: 5 });

    // badges
    const badges = [];
    const myCombo = G.mode === 1 ? F.stats.maxCombo[0] : F.stats.maxCombo[Math.max(0, mw)];
    if (myCombo >= 2) badges.push([`КОМБО x${myCombo}`, "#ff9a3d"]);
    if (F.perfect) badges.push(["ИДЕАЛЬНО", "#5fd8ff"]);
    if (F.legend) badges.push(["★ ЛЕГЕНДА", GOLD]);
    if (F.fighters[1].twin) badges.push(["ЗЛОЙ ДВОЙНИК", "#c45cff"]);
    if (G.cheats.madness) badges.push(["БЕЗУМИЕ", "#ff86d8"]);
    if (G.cheats.tea) badges.push(["ЧАЙ", "#8dff7a"]);
    let bx = 56;
    for (const [label, col] of badges) {
      const bw = textWidth(label, 22) + 32;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(bx, 380, bw, 44);
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.strokeRect(bx + 1.5, 381.5, bw - 3, 41);
      text(label, bx + bw / 2, 403, { size: 22, align: "center", color: col, shadow: false });
      bx += bw + 12;
    }

    const url = gameUrl();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, CH - 64, CW, 64);
    const playLine = "СЫГРАЙ САМ: " + url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    text(playLine, 56, CH - 32, { size: fitText(playLine, 760, 24), color: "#fff6c8", shadow: false });
    text("t.me/dkdanceblog", CW - 40, CH - 32, { size: 22, align: "right", color: "#9fd2ff", shadow: false });
  } finally {
    ctx = main;
  }
  shareSafe = null;
  return c;
}

function dataUrlToBlob(url) {
  const [head, data] = url.split(",");
  const mime = head.match(/:(.*?);/)[1];
  const bin = atob(data);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function copyText(str) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(str).then(() => true, () => false);
  } catch (e) {}
  return Promise.resolve(false);
}

// Must run synchronously inside a click / key handler: browsers only allow
// navigator.share() during a user gesture.
// Opened as a local file, the browser forbids exporting a canvas that drew the game's pictures,
// so the card is redrawn from copies embedded in share_assets.js (loaded only when needed).
let shareSafeImgs = null;
function loadShareAssets(cb) {
  if (shareSafeImgs) { cb(); return; }
  const go = () => {
    const A2 = window.SHARE_ASSETS; if (!A2) { cb(new Error("no assets")); return; }
    const out = { spr: {}, bg: {} }, waits = [];
    const mk = (uri) => { const im = new Image(); im.src = uri; waits.push(im.decode ? im.decode().catch(() => {}) : Promise.resolve()); return im; };
    for (const cid in A2.spr) { out.spr[cid] = {}; for (const p in A2.spr[cid]) out.spr[cid][p] = mk(A2.spr[cid][p]); }
    for (const k in A2.bg) out.bg[k] = mk(A2.bg[k]);
    Promise.all(waits).then(() => { shareSafeImgs = out; cb(); });
  };
  if (window.SHARE_ASSETS) { go(); return; }
  const sc = document.createElement("script");
  sc.src = "share_assets.js";
  sc.onload = go;
  sc.onerror = () => cb(new Error("load failed"));
  document.head.appendChild(sc);
}
function saveCard(card) {
  const blob = dataUrlToBlob(card.toDataURL("image/png"));
  G.sharePreview = { canvas: card, t: 4 };
  downloadBlob(blob, "russkiy-rap-na-vylet.png");
  toast("КАРТИНКА СОХРАНЕНА");
}
function shareResult() {
  // Just saves the result card as a picture — no system "send to…" sheet.
  if (!F || G.endLock > 0) return;
  confirmSfx();
  try { saveCard(makeShareCard()); return; } catch (e) { /* tainted: opened as a local file */ }
  toast("ГОТОВЛЮ КАРТИНКУ…");
  loadShareAssets((err) => {
    try { if (err) throw err; saveCard(makeShareCard(true)); }
    catch (e) { shareSafe = null; toast("НЕ ВЫШЛО СОХРАНИТЬ КАРТИНКУ"); }
  });
}

function drawSharePreview() {
  const p = G.sharePreview;
  if (!p) return;
  p.t -= 1 / 60;
  if (p.t <= 0) { G.sharePreview = null; return; }
  const a = clamp(Math.min(p.t / 0.3, (4 - p.t) / 0.2), 0, 1);
  const w = 600, h = 315;
  const x = W / 2 - w / 2, y = 250;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(p.canvas, x, y, w, h);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  ctx.restore();
  region("sharePreview", 0, 0, W, H, () => { G.sharePreview = null; });
}

/* ------------------------------------------------------------------ */
/* Navigation dispatcher                                               */
/* ------------------------------------------------------------------ */
function handleNav(ev) {
  const s = G.screen;
  const t = ev.type;
  if (s !== "fight" || G.paused) {
    if (t === "up" || t === "down" || t === "left" || t === "right") playSfx("uiMove");
    else if (t === "back") playSfx("uiBack");
  }
  if (s === "title") {
    if (t === "confirm" || t.startsWith("digit") || t === "pause") startTitleExit();
    return;
  }
  if (s === "vs") {
    if ((t === "confirm" || t.startsWith("digit")) && G.time - G.vs.t0 > 0.4) G.vs.skip = true;
    if (t === "back") setScreen("stage");
    return;
  }
  if (s === "secrets") {
    if (t === "confirm" || t === "back") { confirmSfx(); setScreen(G.secretsBack || "title"); }
    return;
  }
  if (s === "mode") {
    if (t === "left" || t === "up") G.sel = (G.sel + 3) % 4;
    if (t === "right" || t === "down") G.sel = (G.sel + 1) % 4;
    if (t === "digit:4") chooseMode(4);
    if (t === "digit:1") chooseMode(1);
    if (t === "digit:2") chooseMode(3);
    if (t === "digit:3") chooseMode(2);
    if (t === "confirm") chooseMode(MODE_ORDER[G.sel]);
    if (t === "back") setScreen("title");
    return;
  }
  if (s === "difficulty") {
    if (t === "left" || t === "up") G.sel = (G.sel + 2) % 3;
    if (t === "right" || t === "down") G.sel = (G.sel + 1) % 3;
    if (t.startsWith("digit")) { const n = +t.slice(6) - 1; if (n < 3) chooseDifficulty(DIFF_IDS[n]); }
    if (t === "confirm") chooseDifficulty(DIFF_IDS[G.sel]);
    if (t === "back") { setScreen("mode"); G.sel = 0; }
    return;
  }
  if (s === "character") {
    const pl = ev.player;
    if (t === "left") moveCharCursor(pl, -1);
    if (t === "right") moveCharCursor(pl, 1);
    if (t === "up" || t === "down") {
      if (charCols() === selectCount()) moveCharCursor(pl, t === "up" ? -1 : 1);
      else moveCharRow(pl, t === "up" ? -1 : 1);
    }
    if (t.startsWith("digit")) { const n = +t.slice(6) - 1; if (n < CHAR_IDS.length) pickChar(n); }
    if (t === "confirm" && (G.mode === 1 || pl === -1 || pl === G.picking)) pickChar(G.charCursor[G.picking]);
    if (t === "back") {
      if (G.mode === 2 && G.picking === 1) { G.picking = 0; G.chars = [null, null]; }
      else if (G.arcadePick) { G.arcadePick = false; setScreen("mode"); G.sel = 1; }
      else { setScreen(G.mode === 1 ? "difficulty" : "mode"); G.sel = G.mode === 1 ? DIFF_IDS.indexOf(G.difficulty) : 2; }
    }
    return;
  }
  if (s === "stage") {
    const n = STAGE_IDS.length;
    if (t === "left") G.sel = (G.sel + n - 1) % n;
    if (t === "right") G.sel = (G.sel + 1) % n;
    if (t === "up" || t === "down") { const c = stageCols(), k = G.sel + (t === "down" ? c : -c); if (k >= 0 && k < n) G.sel = k; else if (t === "down" && k >= n) G.sel = n - 1; }
    if (t.startsWith("digit")) { const sid = STAGE_IDS[+t.slice(6) - 1]; if (sid) chooseStage(sid); }
    if (t === "confirm") chooseStage(STAGE_IDS[G.sel]);
    if (t === "back") { G.chars = [null, null]; G.picking = 0; setScreen("character"); }
    return;
  }
  if (s === "fight") {
    if (t === "pause" || t === "back") {
      if (!G.paused) { G.paused = true; G.pauseSel = 0; stopMusic(); }
      else { G.paused = false; startMusic(); }
      updateTouchVisibility();
      return;
    }
    if (G.paused) {
      if (t === "up") G.pauseSel = (G.pauseSel + 2) % 3;
      if (t === "down") G.pauseSel = (G.pauseSel + 1) % 3;
      if (t === "confirm") pauseChoose(G.pauseSel);
    }
    return;
  }
  if (s === "end") {
    if (G.endLock > 0) return;
    const n = G.endItems ? G.endItems.length : 4;
    if (t === "left" || t === "up") G.sel = (G.sel + n - 1) % n;
    if (t === "right" || t === "down") G.sel = (G.sel + 1) % n;
    if (t === "confirm" && G.endItems) G.endItems[G.sel][1]();
    if (t === "back") { G.arcade = null; G.arcadeBoss = false; setScreen("mode"); }
  }
  if (s === "ladder") {
    if (t === "confirm") arcadeFight();
    if (t === "back") { G.arcade = null; setScreen("mode"); }
  }
  if (s === "arcadeEnd") {
    if (t === "confirm" || t === "back") { if (G.time - G.arcadeEndT > 1) { G.arcade = null; G.arcadeBoss = false; setScreen("title"); } }
  }
}

/* ------------------------------------------------------------------ */
/* Main loop                                                           */
/* ------------------------------------------------------------------ */
let lastTime = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
  lastTime = now;
  G.time += dt;

  buildControllers();
  if ((G.ambT = (G.ambT || 0) + dt) > 0.2) { G.ambT = 0; updateAmbience(); updateMusic(); }
  while (navQueue.length) {
    const ev = navQueue.shift();
    if (G.screen !== "loading") handleNav(ev);
  }

  if (G.screen === "loading" && loaded >= total && fontsReady) setScreen("title");
  if (G.endLock > 0) G.endLock -= dt;
  if (G.toast) { G.toast.t -= dt; if (G.toast.t <= 0) G.toast = null; }

  hitRegions = [];
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  switch (G.screen) {
    case "loading": drawLoading(); break;
    case "title": drawTitle(); break;
    case "secrets": drawSecrets(); break;
    case "mode": drawMode(); break;
    case "difficulty": drawDifficulty(); break;
    case "character": drawCharacter(); break;
    case "stage": drawStageSelect(); break;
    case "vs": drawVs(); break;
    case "ladder": drawLadder(); break;
    case "arcadeEnd": drawArcadeEnd(); break;
    case "fight": if (window.__step !== undefined) { if (window.__step > 0) { window.__step--; updateFight(1 / 60); } } else updateFight(dt); if (G.screen === "fight") drawFight(); else if (G.screen === "end") drawEnd(); break;
    case "end": drawEnd(); break;
  }

  drawSoundButton();
  if (G.screen === "fight") updateTouchHints();
  drawBanner(dt);
  if (G.toast) {
    const a = Math.min(1, G.toast.t * 3);
    text(G.toast.text, W / 2, H - 70, { size: 16, font: FONT_PIX, align: "center", color: CREAM, alpha: a, stroke: "#000" });
  }

  clearTaps();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Debug/test hook (harmless in production): lets automated checks read state.
window.__game = { G, get TT() { return TT; }, startArcade, startSpecial, arcadeEndItems, chipUnlocked, babUnlocked, makeShareCard: (s) => makeShareCard(s), regions: () => hitRegions.map((r) => ({ id: r.id, x: r.x, y: r.y, w: r.w, h: r.h })), get F() { return F; }, CHARS, startMatch, sayQuote, updateFight, shareResult, endRound,
  audio: () => ({ state: actx && actx.state, loaded: Object.values(sfxBuf).filter((b) => b.length).length, total: Object.keys(sfxBuf).length, voices }) };
