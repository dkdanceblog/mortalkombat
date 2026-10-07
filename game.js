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
      const v = localStorage.getItem("gvn_" + key);
      return v === null ? def : JSON.parse(v);
    } catch (e) { return def; }
  },
  set(key, val) {
    try { localStorage.setItem("gvn_" + key, JSON.stringify(val)); } catch (e) {}
  },
};

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */
const CHARS = {
  guf: {
    id: "guf", name: "ГУФ", special: "ЧАЙ", color: "#f0e3b0",
    speed: 295, power: 1.0, specialCd: 2.6, tough: 1.0, jump: 1.0, weight: 1.0, dash: 1.0,
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
      // swings the guitar by the neck — long reach, hits crouching opponents too
      heavy: { frame: "light", startup: 0.16, active: 0.11, recovery: 0.3, dmg: 10, reach: 158, guitar: true,
        y0: -230, y1: -90, hitstun: 0.48, blockstun: 0.22, knock: 430, height: "mid", sfx: "hitHeavy", stop: 0.1 },
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
    id: "kreed", name: "ЕГОР КРИД", special: "СИНЯК", color: "#7aa8e8",
    speed: 305, power: 1.06, specialCd: 5.0, tough: 1.0, jump: 1.0, weight: 1.0, dash: 1.0,
    stats: { "СКОРОСТЬ": 3, "СИЛА": 3, "ЗДОРОВЬЕ": 3 },
    perk: "ФИШКА: на последнем здоровье бьёт сильнее",
    blurb: "Главный холостяк страны.",
    loseTitle: "КРИД ОТКРИДИЛСЯ",
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
    speed: 345, power: 1.02, specialCd: 5.5, tough: 0.92, jump: 1.0, weight: 0.9, dash: 1.2,
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
const BASE_IDS = ["guf", "noize", "oxxxy", "morgen", "maybe", "kreed", "slava", "atl", "korzh", "face"];
// Chipinkos is the arcade boss; he joins the roster once he has been beaten in the arcade
const CHAR_IDS = [...BASE_IDS];
function chipUnlocked() { return CHAR_IDS.includes("chip"); }
const CLOSE_SPECIAL = new Set(["oxxxy", "maybe"]); // specials that hit at mid range, not projectiles

const STAGES = {
  moscow: { id: "moscow", name: "ГОРОД ДОРОГ", ambient: "snow" },
  thailand: { id: "thailand", name: "ТАИЛАНД", ambient: "motes" },
  concert: { id: "concert", name: "КОНЦЕРТ", ambient: "confetti" },
  londograd: { id: "londograd", name: "ЛОНДОНГРАД", ambient: "rain" },
  bar: { id: "bar", name: "БАР 1703", ambient: "motes" },
  circus: { id: "circus", name: "ЦИРК", ambient: "confetti" },
  yard: { id: "yard", name: "ПАДИК", ambient: "leaves" },
  fountains: { id: "fountains", name: "МЁРТВЫЕ ФОНТАНЫ", ambient: "motes" },
};
const STAGE_IDS = ["moscow", "thailand", "concert", "londograd", "bar", "circus", "yard", "fountains"];
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
  maybe: { startup: 0.21, active: 0.14, total: 0.7, sfx: "special_maybe" },
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
  if (key.startsWith("bg.") || key.startsWith("yard.") || key.startsWith("bar.")) return true;
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
  if (stage === "yard" || stage === "bar") keys.push(...Object.keys(ASSET_PATHS).filter((k) => k.startsWith(stage + ".")));
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
  hitLight: 0.7, hitHeavy: 0.8, hitBody: 0.8, hitCrit: 0.9, block: 0.65, koHit: 1.0, superStart: 0.8, crowdReact: 0.5, hitKick: 0.75, whooshLight: 0.3, whooshHeavy: 0.35, bodyfall: 0.7, parry: 0.55, counter: 0.7, throw: 0.8, sweep: 0.8, wallHit: 0.85, jump: 0.35, land: 0.4, landHeavy: 0.6, dash: 0.45, comboFinisher: 0.85, launch: 0.7, superReady: 0.5, superHit: 0.8, sway: 0.8, armor: 0.75, money: 0.8, special_kreed_hit: 0.85, atl_boom: 0.5, atl_bolt: 0.45, special_face_hit: 0.85, special_morgen_hit: 0.85, special_guf_hit: 0.8, special_noize_hit: 0.8, react_yard: 0.28, react_circus: 0.3, react_concert: 0.45, uiMove: 0.12, uiBack: 0.18, uiPick: 0.35, uiVs: 0.55, uiUnlock: 0.8, uiTimer: 0.5, voice_a_attack: 0.65, voice_a_hurt: 0.65, voice_a_ko: 0.8, voice_b_attack: 0.65, voice_b_hurt: 0.65, voice_b_ko: 0.8, voice_v_attack: 0.65, voice_v_ko: 0.8, voice_g_hurt: 0.65, voice_g_attack: 0.7, react_fountains: 0.5, uiConfirm: 0.25, whoosh: 0.35, ko: 0.9, roundStart: 0.4,
  menuSelect: 0.3, special_guf: 0.45, special_noize: 0.4, special_oxxxy: 0.7, special_morgen: 0.7, special_maybe: 0.75, special_kreed: 0.7, special_slava: 0.75, special_atl: 0.3, special_korzh: 0.9, special_face: 0.8, special_chip: 0.8,
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
  } catch (e) {}
}

// Music follows the screen: menu → select → arena track (boss in the arcade final) → win / lose jingle.
// Tracks load only when first needed, so they don't slow down the start.
const MUSIC = {
  menu: "menu", select: "select", bar: "bar", yard: "yard", circus: "circus", fountains: ["fountains", "fountains_2"], concert: "concert",
  londograd: "londograd", moscow: "moscow", thailand: "thailand", boss: "boss", tutorial: "select",
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
const REACT = { bar: "crowdReact", yard: "react_yard", circus: "react_circus", concert: "react_concert", fountains: "react_fountains" };
const REACT_CD = { bar: 4, yard: 14, circus: 16, concert: 6, fountains: 6 };   // seconds between crowd reactions
// Fighter voices (grunts): voice set per fighter; only sets with files are used
const VOICE = { guf: "a", korzh: "a", atl: "a", chip: "a", noize: "b", oxxxy: "b", face: "b", kreed: "v", slava: "v", morgen: "v", maybe: "g" };
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
const ACTIONS = ["left", "right", "up", "down", "light", "heavy", "special"];
const heldKeys = new Set();
const tappedKeys = new Set();
const touchHeld = new Set();
const touchTapped = new Set();
const navQueue = [];

const KEYMAP_1P = {
  left: ["ArrowLeft"], right: ["ArrowRight"], up: ["ArrowUp", "Space"], down: ["ArrowDown"],
  light: ["KeyA", "KeyJ", "KeyZ"], heavy: ["KeyS", "KeyK", "KeyX"], special: ["KeyD", "KeyL", "KeyC"],
};
const KEYMAP_2P = [
  { left: ["KeyA"], right: ["KeyD"], up: ["KeyW"], down: ["KeyS"],
    light: ["KeyF"], heavy: ["KeyG"], special: ["KeyH"] },
  { left: ["ArrowLeft"], right: ["ArrowRight"], up: ["ArrowUp"], down: ["ArrowDown"],
    light: ["KeyJ", "Numpad1"], heavy: ["KeyK", "Numpad2"], special: ["KeyL", "Numpad3"] },
];

function blankCtrl() {
  const c = { held: {}, pressed: {} };
  for (const a of ACTIONS) { c.held[a] = false; c.pressed[a] = false; }
  return c;
}
const ctrls = [blankCtrl(), blankCtrl()];
const padPrev = [{}, {}];

function readPad(i) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = pads && pads[i];
  if (!pad) return null;
  const b = (n) => !!(pad.buttons[n] && pad.buttons[n].pressed);
  const ax = pad.axes[0] || 0;
  const ay = pad.axes[1] || 0;
  return {
    left: b(14) || ax < -0.5, right: b(15) || ax > 0.5,
    up: b(12) || ay < -0.6, down: b(13) || ay > 0.6,
    light: b(0), heavy: b(1), special: b(2) || b(3),
    start: b(9), back: b(8),
  };
}

function buildControllers() {
  const pads = [readPad(0), readPad(1)];
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
      }
      c.held[a] = held || pressed;
      c.pressed[a] = pressed;
    }
    c.dash = p === 0 && touchTapped.has("dash");
    // Gamepad → menu navigation / pause
    if (pad) {
      const edge = (k) => pad[k] && !padPrev[p][k];
      if (edge("left")) navQueue.push({ type: "left", player: p });
      if (edge("right")) navQueue.push({ type: "right", player: p });
      if (edge("up")) navQueue.push({ type: "up", player: p });
      if (edge("down")) navQueue.push({ type: "down", player: p });
      if (edge("light")) navQueue.push({ type: "confirm", player: p });
      if (edge("heavy") || edge("back")) navQueue.push({ type: "back", player: p });
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

window.addEventListener("keydown", (e) => {
  unlockAudio();
  if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
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
  const show = G.screen === "fight" && !G.paused;
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
canvas.addEventListener("pointerdown", (e) => {
  unlockAudio();
  const r = regionAt(canvasPoint(e));
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
  F = {
    fighters: [makeFighter(G.chars[0], 0), makeFighter(G.chars[1], 1)],
    projectiles: [], particles: [], popups: [], ambient: [],
    round: 1, wins: [0, 0], timer: ROUND_TIME,
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

function canAct(f) {
  return F.phase === "fight" && !f.ko && !f.action && f.hitstun <= 0 && f.blockstun <= 0;
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
  else if (type === "heavy" && f.onGround && fwd) mv = CMD_MOVES.overhead;
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
  f.invulnT = Math.max(0, (f.invulnT || 0) - dt);
  f.parryT = Math.max(0, (f.parryT || 0) - dt);
  f.parryCd = Math.max(0, (f.parryCd || 0) - dt);
  {
    const backKey = f.dir === 1 ? "left" : "right";
    if (c.pressed[backKey] && f.onGround && !f.action && f.parryCd <= 0) { f.parryT = 0.13; f.parryCd = 0.45; }
  }
  if (f.downT > 0) { f.downT -= dt; if (f.downT <= 0) { f.invulnT = 0.2; spawnDust(f.x, f.y, 0.7); } }
  if (f.chainBuf) { f.chainBuf.t -= dt; if (f.chainBuf.t <= 0) f.chainBuf = null; }
  if (f.comboT <= 0) f.comboShow = 0;

  // HP bar trailing animation
  f.shownHp = lerp(f.shownHp, f.hp, 1 - Math.pow(0.0001, dt));
  if (f.trailDelay > 0) f.trailDelay -= dt;
  else f.trailHp = Math.max(f.hp, f.trailHp - 45 * dt);

  const fighting = F.phase === "fight" && !f.ko;
  const free = canAct(f);

  // Face the opponent while grounded and not committed to an action.
  if (fighting && f.onGround && !f.action && Math.abs(opp.x - f.x) > 6) f.dir = opp.x > f.x ? 1 : -1;

  // Crouch / guard
  const back = f.dir === 1 ? c.held.left : c.held.right;
  if (fighting && f.onGround && !f.action && f.hitstun <= 0) {
    f.crouch = c.held.down;
    f.blocking = c.held.down || back;
  } else {
    f.crouch = f.onGround && f.blockstun > 0 && f.crouch;
    f.blocking = false;
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
    if (canAct(f) && !f.crouch) {
      const dirInput = (c.held.right ? 1 : 0) - (c.held.left ? 1 : 0);
      const isBack = dirInput !== 0 && dirInput !== f.dir;
      target = dirInput * f.data.speed * 1.15 * (isBack ? 0.8 : 1);
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
        const tip0 = f.x + f.dir * (WHIP_LEN - 110);
        const tip = overlap({ x0: Math.min(tip0, far), x1: Math.max(tip0, far), y0: box.y0, y1: box.y1 }, hb);
        // the hair wraps around the opponent, yanks them in and Maybe throws them over herself
        const res = applyHit(f, opp, {
          dmg: tip ? 9 : 7, height: "mid", hitstun: 2, blockstun: 0.2,
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
      x: f.dir === 1 ? -420 : W + 420, y: FLOOR_Y,
      vx: f.dir * 1100, w: 400, h: 120, dmg: 15, life: 2.2, hit: false, height: "unblockable",
    });
    F.shake = Math.max(F.shake, 6);
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

function applyHit(att, def, h) {
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
    const chip = (h.chip || 0) + (att.cid === "atl" && h.melee ? 1 : 0);
    def.hp = Math.max(1, def.hp - chip); // chip damage never kills
    def.blockstun = h.blockstun;
    def.vx = h.dir * Math.abs(h.knock) * 0.55;
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
    if (att.cid === "morgen" && G.time - (att.dashAt || -9) < 0.5) { perk = 1.3; popup(def.x, def.y - 320, "ДОРОГО!", "#ff86d8", 24); att.dashAt = -9; }
    if (att.cid === "maybe" && aa && aa.air) perk = 1.2;
    if (att.cid === "face" && (def.x < WALL_L + 130 || def.x > WALL_R - 130)) perk = att.data.wallMul || 1.25;
  }
  if (att.cid === "kreed" && att.hp <= 30 && !h.noScale) perk *= 1.15;
  let dmg = Math.max(1, Math.round(h.dmg * DMG_SCALE * att.data.power * scale * perk * (counter ? 1.25 : 1) / (def.data.tough || 1)));
  def.hp = Math.max(0, def.hp - dmg);
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

function startThrow(f, opp) {
  f.crouch = false;
  f.action = { type: "throw", move: { frame: "light", startup: 0.06, active: 0, recovery: 0.32, dmg: 0, reach: 0, y0: 0, y1: 0 },
    t: 0, total: 0.4, hitDone: true };
  const res = applyHit(f, opp, { dmg: 4, height: "unblockable", hitstun: 2, blockstun: 0, knock: 0, dir: f.dir,
    sfx: "hitLight", stop: 0.06, chip: 0, noScale: true, sparkX: opp.x - f.dir * 20, sparkY: opp.y - 150 });
  if (res === "hit") opp.pull = { by: f.slot, t: 0.16, dist: 55, mode: "throw" };
}

function superFlavor(f, opp) {
  switch (f.cid) {
    case "noize": F.flicker = 1.2; break;
    case "oxxxy":
      for (let i = 0; i < 16; i++) F.birds.push({ x: rand(-400, -20), y: rand(110, 380), vx: rand(260, 420), vy: rand(-20, 10), ph: rand(0, 6.28), s: pick([3, 4, 4, 5]) });
      break;
    case "morgen": F.money = 2.6; break;
    case "maybe": F.eggs = 2.6; break;
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
    if (reach && !opp.ko && !(opp.downT > 0) && !(opp.invulnT > 0) && opp.y > FLOOR_Y - 170) {
      a.phase = "combo"; a.t = 0; a.hits = 0; playSfx("superHit");
      opp.vx = 0; opp.vy = 0; opp.hitstun = 3; opp.action = null; opp.pull = null; opp.dashT = 0;
    } else if (a.t > 0.5 || (f.dir > 0 ? f.x >= WALL_R : f.x <= WALL_L) || F.phase !== "fight") {
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
      if (F.phase !== "fight") { a.phase = "recover"; a.t = 0; break; }
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
    const dmg = 8;
    f.hp = Math.max(0, f.hp - dmg);
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
const WHIP_LEN = 400;
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
  for (const s of strands) strokeStrand(s.pts, (u) => lerp(12, 3.5, u) + 3, HAIR.outline);
  // 2) strands, back to front: darker underneath, light on top
  const order = [...strands].sort((p, q) => q.o - p.o);
  order.forEach((s, idx) => {
    const col = [HAIR.dark, HAIR.mid, HAIR.dark, HAIR.light, HAIR.mid, HAIR.light, HAIR.mid][idx % 7];
    strokeStrand(s.pts, (u) => lerp(9, 2, u), col);
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
  if (!p.hit && F.phase === "fight" && d <= front && d >= front - 140) {
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
    if (Math.abs(target.x - p.x) < p.w / 2 && F.phase === "fight") {
      const res = applyHit(F.fighters[p.owner], target, {
        dmg: p.dmg, height: "unblockable", hitstun: 0.9, blockstun: 0.3, knock: 420, dir: target.x >= p.x ? 1 : -1,
        sfx: "hitHeavy", stop: 0.16, chip: 0, launch: -950, sparkX: target.x, sparkY: target.y - 100,
      });
      if (res === "hit") popup(target.x, target.y - 300, "ЯДЕРКА!", "#ffd54a", 38);
    } else if (F.phase === "fight") {
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
  if (p.kind === "cadillac") return { x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: FLOOR_Y - p.h, y1: FLOOR_Y };
  return { x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: p.y - p.h / 2, y1: p.y + p.h / 2 };
}

function updateProjectiles(dt) {
  for (const p of F.projectiles) {
    if (p.delay > 0) { p.delay -= dt; continue; }
    if (p.kind === "nuke") { updateNuke(p, dt); continue; }
    if (p.kind === "quake") { updateQuake(p, dt); continue; }
    p.t = (p.t || 0) + dt;
    p.x += p.vx * dt;
    p.life -= dt;
    if (p.kind === "kettle") { p.rot += 9 * dt * p.dir; p.y += Math.sin(p.t * 9) * 40 * dt; }
    if (p.kind === "guitar") {
      p.rot += 6 * dt * p.dir;
      if (Math.random() < dt * 30) F.particles.push({ type: "img", key: "fx.wave", x: p.x - p.dir * 40, y: p.y + rand(-10, 10), vx: -p.dir * 60, vy: 0, life: 0.25, max: 0.25, w: 64, h: 32, dir: p.dir });
    }
    if (p.kind === "letter") p.y += (p.vy || 0) * dt;
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
    if (p.kind === "cadillac") {
      if (Math.random() < dt * 40) spawnDust(p.x - p.dir * 220, FLOOR_Y, 0.6);
      if (Math.abs(p.x - W / 2) < W / 2 + 100) F.shake = Math.max(F.shake, 3);
    }

    if (!p.hit && F.phase === "fight" && p.kind === "letter") {
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
    if (!p.hit && F.phase === "fight") {
      const target = F.fighters[1 - p.owner];
      if (overlap(projBox(p), hurtbox(target))) {
        p.hit = true;
        const res = applyHit(F.fighters[p.owner], target, {
          dmg: p.dmg, height: p.height, hitstun: p.pierce || p.kind === "cadillac" ? 0.8 : 0.5,
          blockstun: 0.24, knock: p.kind === "burger" ? 480 : p.kind === "runner" ? 260 : p.kind === "sinyak" ? 640 : p.kind === "cadillac" ? 520 : 300, dir: p.dir,
          sfx: ({ kettle: "special_guf_hit", guitar: "special_noize_hit", cadillac: "special_morgen_hit", sinyak: "special_kreed_hit", burger: "special_face_hit" })[p.kind] || "hitHeavy",
          stop: p.kind === "runner" ? 0.06 : p.pierce || p.kind === "cadillac" ? 0.12 : 0.08, chip: p.kind === "runner" ? 1 : 3,
          launch: p.kind === "burger" ? -620 : p.kind === "sinyak" ? -820 : p.kind === "cadillac" ? -720 : p.kind === "runner" ? (p.last ? -600 : 0) : -380,
          sparkX: target.x - p.dir * 20, sparkY: p.kind === "cadillac" ? target.y - 80 : p.y,
        });
        if (p.kind !== "cadillac" && !p.pierce) p.life = 0;
        if (res === "hit" && p.kind === "burger") popup(target.x, target.y - 300, "ЖРИ!", "#ffb347", 34);
        if (res === "hit" && p.kind === "sinyak") popup(target.x, target.y - 300, "СНЕСЛО!", "#ff9a3d", 34);
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
  const rate = { snow: 40, rain: 160, confetti: 26, motes: 14, leaves: 5 }[kind];
  let n = rate * dt;
  while (n > 0) {
    if (Math.random() < n) {
      if (kind === "snow") A.push({ x: rand(-50, W), y: -10, vx: rand(10, 40), vy: rand(50, 110), s: pick([2, 3, 4]), life: 12, c: "rgba(235,240,255,0.85)", sway: rand(0, 6) });
      if (kind === "rain") A.push({ x: rand(-100, W + 100), y: -20, vx: -160, vy: rand(1100, 1400), s: 1, life: 1.2, c: "rgba(170,190,255,0.35)", rain: true });
      if (kind === "confetti") A.push({ x: rand(0, W), y: -10, vx: rand(-30, 30), vy: rand(80, 160), s: pick([4, 6]), life: 9, c: pick(["#ff6bd6", "#5fd8ff", "#ffd54a", "#8dff7a"]), sway: rand(0, 6), spin: rand(2, 8) });
      if (kind === "leaves") A.push({ x: rand(0, W + 100), y: -10, vx: rand(-50, -10), vy: rand(45, 85), s: pick([5, 6, 7]), life: 14, c: pick(["#e8a13a", "#d9782b", "#f2c94c", "#b9531f"]), sway: rand(0, 6), spin: rand(1.5, 4) });
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
  atl: { keep: 190 }, chip: { keep: 280 }, kreed: {},
};
function updateBot(bot, opp, dt) {
  const c = bot.ctrl;
  const d = F.diff;
  const ai = bot.ai;
  for (const a of ACTIONS) { c.held[a] = false; c.pressed[a] = false; }
  if (F.phase !== "fight" || bot.ko) return;

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
      if (p.kind === "runner") {
        if (pd < 600 && Math.random() < d.block + 0.1) { ai.holdBack = 1.0; ai.holdDown = 0; }
      } else if (p.kind === "sinyak") {
        if (pd < 520 && Math.random() < d.dodge) ai.holdDown = 0.6;
      } else if (p.kind === "cadillac") {
        // jump when the car's front edge is close enough
        const front = pd - p.w / 2;
        if (front < 260 && front > 40 && Math.random() < d.dodge) ai.jump = true;
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
    else if (ai.wantAttack === "heavy" && roll < 0.4 && opp.crouch) c.held[towards] = true;    // overhead vs a croucher
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
    setScreen("end");
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
  } else if (F.phase === "ko") {
    if (F.phaseT >= 2.8) { afterRound(); return; }
  }

  // Controllers
  if (G.mode === 2) { copyCtrl(ctrls[0], a.ctrl); copyCtrl(ctrls[1], b.ctrl); }
  else { copyCtrl(ctrls[0], a.ctrl); updateBot(b, a, dt); }
  if (G.botVsBot && G.mode === 1) updateBot(a, b, dt);           // test hook: CPU vs CPU
  if (F.phase !== "fight") { for (const f of F.fighters) for (const k of ACTIONS) { f.ctrl.held[k] = false; f.ctrl.pressed[k] = false; } }

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
  const foe = F && F.fighters && F.fighters[1 - f.slot];
  const guarding = f.blocking && !f.action && f.hitstun <= 0 && foe && (foe.action || F.projectiles.some((q) => q.owner !== f.slot)) &&
    Math.abs(foe.x - f.x) < 260;
  if ((f.blockstun > 0 || guarding) && f.onGround) {
    const p = f.crouch ? "crouch_block" : "block";
    if (hasPose(f.cid, p)) return p;
  }
  if (f.hitstun > 0) return (!f.onGround && (f.hurtK || 0) >= 0.9 && hasPose(f.cid, "fall")) ? "fall" : "hurt";
  if (f.action) {
    if (f.action.type === "special") return "special";
    // wind-up frame during the first part of a grounded light / heavy
    const a = f.action, mv = a.move;
    if ((a.type === "light" || a.type === "heavy") && !a.air && !mv.sweep && !mv.noWindup && a.t < mv.startup * 0.9 &&
        SPRITE_META[f.cid] && SPRITE_META[f.cid][a.type + "_0"]) return a.type + "_0";
    return mv.frame;
  }
  if (!f.onGround) return "jump";
  if (f.crouch) return "crouch";
  if (Math.abs(f.vx) > 30) return "walk_" + (1 + (Math.floor(f.walkDist / 34) % 4));
  return "idle";
}

function drawFighter(f) {
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
  for (const p of F.projectiles) {
    if (p.kind === "cadillac") {
      const car = img("fx.cadillac");
      ctx.save();
      ctx.translate(p.x, FLOOR_Y + 14);
      if (p.dir < 0) ctx.scale(-1, 1);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.ellipse(0, -6, 300, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      if (car) ctx.drawImage(car, -360, -250, 720, 250);
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
  if (bg) drawCover(bg, 0, 0, W, H, 1.07, -camX * 0.08, 0);
  else { ctx.fillStyle = "#141421"; ctx.fillRect(0, 0, W, H); }
  if (stageId === "bar") drawBarHost(camX);
  if (stageId === "circus") drawCircusFx(camX);
  if (stageId === "yard") drawYard(camX);
  if (stageId === "fountains") drawFountainsFx();

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

function drawFight() {
  const [a, b] = F.fighters;
  const mid = (a.x + b.x) / 2 - W / 2;
  F.camX = lerp(F.camX, mid, 0.08);

  ctx.save();
  if (F.shake > 0) ctx.translate(rand(-1, 1) * F.shake, rand(-1, 1) * F.shake * 0.6);
  if (F.zoom > 0.002) {                  // impact zoom punch towards the hit
    const z = 1 + F.zoom, zx = clamp(F.zoomX, 300, W - 300), zy = F.zoomY;
    ctx.translate(zx, zy); ctx.scale(z, z); ctx.translate(-zx, -zy);
    F.zoom *= 0.86;
  }

  drawStage(G.stage, F.camX);
  drawAmbient();

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
  drawHUD();
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
  const label = full ? (f.isBot ? "ПАНЧ ГОТОВ!" : "ПАНЧ! ЗАЖМИ ОБА УДАРА") : "ПАНЧ";
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

function drawFightOverlays() {
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

function footer(str) {
  if (isTouch) return;           // keyboard hints mean nothing on a phone
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, H - 46, W, 46);
  text(str, W / 2, H - 22, { size: 18, align: "center", color: "#c9c2ff", shadow: false });
}

// Visible back button (top-left) — phones have no ESC
function backButton() {
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
function drawTitleLineup() {
  const n = CHAR_IDS.length;
  const back = CHAR_IDS.filter((_, i) => i % 2 === 1);
  const front = CHAR_IDS.filter((_, i) => i % 2 === 0);
  const rows = [
    { ids: back, y: 585, scale: 0.6, dark: 0.35, spread: W - 260 },
    { ids: front, y: 700, scale: 0.74, dark: 0, spread: W - 140 },
  ];
  rows.forEach((row, r) => {
    const k = row.ids.length;
    row.ids.forEach((cid, i) => {
      const x = W / 2 + (k > 1 ? (i / (k - 1) - 0.5) * row.spread : 0) + (r === 0 ? 0 : 0);
      const dir = x < W / 2 ? 1 : -1;
      const ph = G.time * 2.2 + i * 1.3 + r * 0.7;
      const pose = (Math.floor(G.time * 0.35 + i * 0.37 + r * 0.5) % 7 === 0) ? "win" : "idle";
      // floor shadow
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.ellipse(x, row.y + 2, 70 * row.scale, 12 * row.scale, 0, 0, Math.PI * 2);
      ctx.fill();
      drawPose(cid, pose, x, row.y, { dir, scale: row.scale, sy: 1 + Math.sin(ph) * 0.012,
        tint: row.dark ? { color: "#120a2c", a: row.dark } : undefined });
    });
  });
  void n;
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

function drawTitle() {
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
  [[200, "255,120,60"], [W - 200, "120,140,255"], [W / 2, "255,220,140"]].forEach(([bx, col], i) => {
    const sway = Math.sin(G.time * (0.6 + i * 0.2) + i * 2) * 260;
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
  drawTitleLogo(W / 2, 160 + Math.sin(G.time * 1.6) * 4, 1);

  // start button
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
  region("start", 0, 0, W, H, () => { confirmSfx(); setScreen("mode"); });

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
    if (dk) { const h = 124, w = h * dk.naturalWidth / dk.naturalHeight; ctx.save(); ctx.globalAlpha = 0.92; ctx.drawImage(dk, W - w - 18, 60, w, h); ctx.restore(); }
  }
  const badges = cheatBadges();
  if (badges) text(badges, 16, 66, { size: 16, color: "#ff86d8", stroke: "#000", strokeW: 4 });
}

/* ------------------------------------------------------------------ */
/* Tutorial                                                            */
/* ------------------------------------------------------------------ */
const TUTORIAL_STEPS = [
  { id: "walk", title: "ХОДЬБА", text: "Походи влево и вправо:  ← →", touch: "джойстик влево-вправо" },
  { id: "jump", title: "ПРЫЖОК", text: "Прыгни:  ↑", touch: "джойстик вверх" },
  { id: "light", title: "УДАР РУКОЙ", text: "Подойди к сопернику и ударь рукой:  A", touch: "кнопка РУКА" },
  { id: "heavy", title: "УДАР НОГОЙ", text: "Ударь ногой:  S", touch: "кнопка НОГА" },
  { id: "block", title: "БЛОК", text: "Соперник атакует! Держи НАЗАД (от него), чтобы заблокировать 2 удара", touch: "джойстик от соперника" },
  { id: "sweep", title: "ПОДСЕЧКА", text: "Присядь и ударь ногой:  ↓ + S  — соперник упадёт", touch: "джойстик вниз + НОГА" },
  { id: "crouchjab", title: "УДАР В ПРИСЕДЕ", text: "Присядь и ударь рукой:  ↓ + A  — быстрый низкий удар", touch: "джойстик вниз + РУКА" },
  { id: "chain", title: "СВЯЗКА", text: "Рука, рука, нога подряд:  A, A, S  — третий удар добивающий", touch: "РУКА, РУКА, НОГА" },
  { id: "dash", title: "РЫВОК", text: "Дважды быстро вперёд:  → →", touch: "кнопка РЫВОК" },
  { id: "throw", title: "БРОСОК", text: "Подойди вплотную:  вперёд + A  — бросок не заблокировать", touch: "кнопка БРОСОК" },
  { id: "special", title: "СПЕЦПРИЁМ", text: "Фирменный спецприём:  D", touch: "кнопка СПЕЦ" },
  { id: "super", title: "ПАНЧ", text: "Шкала ПАНЧА полная! Зажми оба удара:  A + S", touch: "кнопка ПАНЧ" },
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
  const line = TOUCH_UI ? step.text.replace(/:\s+[^—]*?(—|$)/, ": " + step.touch + " $1").trim() : step.text;
  text(line, x + w / 2, y + 66, { size: fitText(line, w - 40, 20), align: "center", color: "#fff", stroke: "#000", strokeW: 4 });
  if (step.id === "block") text(`заблокировано: ${T.blocks} / 2`, x + w / 2, y + 92, { size: 12, font: FONT_PIX, align: "center", color: "#c9c2ff", shadow: false });
  if (step.id === "walk") text(`${Math.min(100, Math.round(T.walked / 3.2))}%`, x + w / 2, y + 92, { size: 12, font: FONT_PIX, align: "center", color: "#c9c2ff", shadow: false });
  // progress dots
  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    ctx.fillStyle = i < T.step || (i === T.step && T.wait > 0) ? "#8dff7a" : i === T.step ? GOLD : "rgba(255,255,255,0.2)";
    ctx.fillRect(x + w - 20 - (TUTORIAL_STEPS.length - i) * 14, y + 16, 10, 10);
  }
  if (!isTouch) text("ESC — ВЫЙТИ", W - 20, H - 60, { size: 10, font: FONT_PIX, align: "right", color: "rgba(255,255,255,0.5)", shadow: false });
}

/* ------------------------------------------------------------------ */
/* Arcade mode                                                         */
/* ------------------------------------------------------------------ */
// Texts are drafts awaiting approval (see the texts doc)
const ARCADE_TEXT = {
  bossVs: "ФИНАЛЬНЫЙ БОСС",
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
};
const ARCADE_FIGHTS = 6;   // 5 opponents + the boss
function arcadeDifficulty(i) { return i < 3 ? "easy" : "normal"; }

function startArcade(cid) {
  const others = BASE_IDS.filter((c) => c !== cid);
  for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
  const stages = STAGE_IDS.filter((s2) => s2 !== "bar");
  const ladder = others.slice(0, ARCADE_FIGHTS - 1).map((o) => ({ cid: o, stage: pick(stages) }));
  ladder.push({ cid: "chip", stage: "bar", boss: true });
  G.arcade = { cid, ladder, idx: 0, retries: 0, prevDiff: G.difficulty, wins: 0 };
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
  G.stage = step.stage;
  G.difficulty = step.boss ? "normal" : arcadeDifficulty(A.idx);
  startVs();
}

function arcadeEndItems() {
  const A = G.arcade;
  const won = F && F.matchWinner === 0;
  const last = A.idx >= A.ladder.length - 1;
  const toMenu = ["МЕНЮ", () => { confirmSfx(); G.difficulty = A.prevDiff; G.arcade = null; G.arcadeBoss = false; setScreen("mode"); }];
  if (won && last) return [["ФИНАЛ", () => { confirmSfx(); G.arcadeBoss = false;
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
    const label = st.boss ? "БОСС" : String(i + 1);
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
  text(ARCADE_TEXT.champion, 860, 150, { size: 84, align: "center", gradient: ["#fff6c8", GOLD, "#ff7a3d"], stroke: "#1a0830", strokeW: 10 });
  text(CHARS[cid].name, 860, 240, { size: 40, align: "center", color: CHARS[cid].color, stroke: "#000", strokeW: 6 });
  wrapText(ARCADE_ENDINGS[cid] || "", 860, 320, 640, 34, { size: 26, align: "center", color: "#fff6c8", stroke: "#000", strokeW: 4 });
  text(`ПЕРЕИГРОВОК: ${A ? A.retries : 0}`, 860, 470, { size: 14, font: FONT_PIX, align: "center", color: "#c9c2ff" });
  if (A && A.newUnlock) {
    const k = 1 + 0.05 * Math.sin(G.time * 6);
    ctx.save(); ctx.translate(860, 548); ctx.scale(k, k);
    text(ARCADE_TEXT.unlocked, 0, 0, { size: 30, align: "center", gradient: ["#fff6c8", "#ff9a3d", "#ff5a3d"], stroke: "#1a0830", strokeW: 6 });
    ctx.restore();
  }
  if (A && A.retries === 0) text("БЕЗ ЕДИНОГО ПОРАЖЕНИЯ!", 860, 505, { size: 22, align: "center", color: "#8dff7a", stroke: "#000", strokeW: 4 });
  const bw = 300, bh = 58, bx = 860 - bw / 2, by = 580;
  panel(bx, by, bw, bh, { active: true });
  text("В ГЛАВНОЕ МЕНЮ", 860, by + bh / 2 + 2, { size: 24, align: "center", color: GOLD, stroke: "#000", strokeW: 5 });
  region("arc-end", bx, by, bw, bh, () => { if (G.time - G.arcadeEndT > 1) { confirmSfx(); G.arcade = null; setScreen("title"); } });
}

/* Secrets screen */
function openSecrets() { G.secretsBack = G.screen === "mode" ? "mode" : "title"; setScreen("secrets"); }
function drawSecrets() {
  menuBackground(0.8);
  header("СЕКРЕТЫ", `НАЙДЕНО ${secrets.size} ИЗ ${SECRETS.length}`);
  const cols = 3, gx = 14, gy = 10;
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
    text(found ? sd.name : "? ? ?", x + 56, y + 23, { size: fitText(found ? sd.name : "???", w - 72, 20, FONT_HEAD, 12), color: found ? "#fff6c8" : "#8d87b9", stroke: "#000", strokeW: 4 });
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
    { mode: 1, title: "1 ИГРОК", sub: "против бота", ids: ["guf", null], lines: ["выбери бойца и арену"] },
    { mode: 3, title: "АРКАДА", sub: "6 боёв подряд", ids: [null, "boss"], lines: ["в конце — финальный босс"] },
    { mode: 2, title: "2 ИГРОКА", sub: "на одной клавиатуре", ids: ["guf", "noize"], off: isTouch,
      lines: [isTouch ? "только на компьютере" : "друг против друга"] },
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
  const gap = cols === selectCount() ? 12 : 24;
  const tile = cols === selectCount() ? Math.min(132, Math.floor((W - 60 - gap * (cols - 1)) / cols)) : 96;
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
    text("ПРОЙДИ АРКАДУ", lx + tile / 2, ly + tile + 15, { size: fitText("ПРОЙДИ АРКАДУ", tile + gap - 6, 13), align: "center", color: "#ff8a7a", stroke: "#000", strokeW: 4 });
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
    text(CHARS[id].name, x + tile / 2, ty + tile + 15, { size: fitText(CHARS[id].name, tile + gap - 14, 18, FONT_HEAD, 12), align: "center", color: "#fff", stroke: "#000", strokeW: 4 });
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
  const p1id = G.chars[0] || CHAR_IDS[G.charCursor[0]];
  drawPreview(p1id, PREVIEW_X, 0, G.chars[0] ? "ГОТОВ" : null);
  if (two) {
    const p2id = G.picking === 1 ? (G.chars[1] || CHAR_IDS[G.charCursor[1]]) : null;
    if (p2id) drawPreview(p2id, W - PREVIEW_X, 1, G.chars[1] ? "ГОТОВ" : null);
    else drawMystery(W - PREVIEW_X, "ИГРОК 2");
  } else {
    if (G.twinArmed) drawTwinPreview(CHARS[CHAR_IDS[G.charCursor[0]]].id, W - PREVIEW_X);
    else drawMystery(W - PREVIEW_X, "СОПЕРНИК");
    region("mystery", W - PREVIEW_X - 130, 300, 260, 340, () => {
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
  if (d.perk) text(d.perk, ix + iw / 2, iy + ih - 22, { size: fitText(d.perk, iw - 36, 15), align: "center", color: GOLD, shadow: false });

  footer(two
    ? (G.picking === 0 ? "1P: A D + F    (или мышь)    ESC  НАЗАД" : "2P: ← → + J / ENTER    ESC  НАЗАД")
    : "← → ↑ ↓  ВЫБОР    ENTER  ОК    ESC  НАЗАД    1-0  БЫСТРЫЙ ВЫБОР");
  if (isTouch) text("ТАПНИ ЕЩЁ РАЗ, ЧТОБЫ ВЫБРАТЬ", W / 2, H - 20, { size: 13, font: FONT_PIX, align: "center", color: "#c9c2ff", stroke: "#000", strokeW: 4 });
  backButton();
}

const PREVIEW_X = 205;
function drawPreview(id, x, slot, badge) {
  const y = 610;
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
    dir: slot === 0 ? 1 : -1, scale: 1.25, sy: 1 + 0.012 * b, sx: 1 - 0.006 * b,
  });
  text(slot === 0 ? (G.mode === 1 ? "ВЫ" : "1P") : "2P", x, y + 34, { size: 14, font: FONT_PIX, align: "center", color: P_COLORS[slot] });
  if (badge) text(badge, x, y - 340, { size: 30, align: "center", color: GOLD, stroke: "#000", strokeW: 6 });
}

function drawMystery(x, label) {
  const y = 610;
  ctx.save();
  ctx.globalAlpha = 0.55 + Math.sin(G.time * 3) * 0.15;
  const id = CHAR_IDS[Math.floor(G.time * 2.5) % CHAR_IDS.length];
  const fr = frameOf(id, "idle");
  if (fr) {
    ctx.translate(x, y);
    ctx.scale(-1.25, 1.25);
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
  const cols = 4, w = 290, h = 190, gx = 20, gy = 26;
  const y0 = 150;
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
  if (G.arcadeBoss) line = ARCADE_TEXT.bossVs;
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
  const lines = isTouch ? ["джойстик: ходьба, прыжок, присед", "джойстик от врага — блок"] : G.mode === 1
    ? ["←→ ходьба  ↑ прыжок  ↓ присед/блок", "назад от врага — блок стоя", "A рука   S нога   D спецприём"]
    : ["1P: WASD, F/G/H      2P: стрелки, J/K/L", "назад от врага — блок стоя, ↓ — блок в приседе"];
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
  { id: "a_pussyboy", name: "ПУСИБОЙ", special: "kreed", how: "Используй спецприём Егора Крида" },
  { id: "a_truegangsta", name: "ЕДИНСТВЕННЫЙ ТРУ-ГАНГСТА-РЭПЕР", lose: "chip", how: "Победи Чипинкоса" },
];
const SECRET_INFO = Object.fromEntries(SECRETS.map((s) => [s.id, { how: s.how, hint: s.how }]));
// Called once per finished match
function checkMatchSecrets() {
  if (!F || G.tutorial) return;
  const mw = F.matchWinner;
  const humans = F.fighters.filter((f) => !f.isBot);
  for (const sd of SECRETS) {
    if (sd.special) continue;   // unlocked in startSpecial
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
if (store.get("chip_unlocked", false) && !CHAR_IDS.includes("chip")) CHAR_IDS.push("chip");
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
  if (isNew) playSfx("uiUnlock");
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
const ACCUSATIVE = { guf: "ГУФА", noize: "НОЙЗА", oxxxy: "ОКСИ", morgen: "МОРГЕНА", maybe: "МЭЙБИ БЭЙБИ", kreed: "ЕГОРА КРИДА", slava: "СЛАВУ КПСС", atl: "ATL", korzh: "МАКСА КОРЖА", face: "FACE", chip: "ЧИПИНКОСА" };
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
  drawPose(id, "idle", x, y, { dir: -1, scale: 1.25, sy: 1 + 0.012 * b, tint: TWIN_TINT });
  text("ЗЛОЙ ДВОЙНИК", x, y + 34, { size: 14, font: FONT_PIX, align: "center", color: "#c45cff" });
}

/* Legend: beat the hard bot without losing a round */
function legends() { return store.get("legends", []); }
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

function gameUrl() {
  return /^https?:/.test(location.protocol) ? location.origin + location.pathname : "";
}

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
    text(url ? "СЫГРАЙ САМ: " + url.replace(/^https?:\/\//, "") : "СЫГРАЙ САМ — РУССКИЙ РЭП НА ВЫЛЕТ", 56, CH - 32, { size: fitText(url, 900, 24), color: "#fff6c8", shadow: false });
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
    if (t === "confirm" || t.startsWith("digit")) { confirmSfx(); setScreen("mode"); }
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
    if (t === "up" || t === "down") { const k = G.sel + (t === "down" ? 4 : -4); if (k >= 0 && k < n) G.sel = k; else if (t === "down" && G.sel < 4 && n > 4) G.sel = n - 1; }
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
    case "fight": updateFight(dt); if (G.screen === "fight") drawFight(); else if (G.screen === "end") drawEnd(); break;
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
window.__game = { G, regions: () => hitRegions.map((r) => ({ id: r.id, x: r.x, y: r.y, w: r.w, h: r.h })), get F() { return F; }, CHARS, startMatch, sayQuote, updateFight, shareResult, endRound,
  audio: () => ({ state: actx && actx.state, loaded: Object.values(sfxBuf).filter((b) => b.length).length, total: Object.keys(sfxBuf).length, voices }) };
