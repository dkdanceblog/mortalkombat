P = 'game/game.js'
s = open(P).read()
def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (s.count(a), a[:90])
    s = s.replace(a, b)

# ---- timers ----
rep('''  f.buffT = Math.max(0, f.buffT - dt);
  if (f.comboT <= 0) f.comboShow = 0;''', '''  f.buffT = Math.max(0, f.buffT - dt);
  f.invulnT = Math.max(0, (f.invulnT || 0) - dt);
  if (f.chainBuf) { f.chainBuf.t -= dt; if (f.chainBuf.t <= 0) f.chainBuf = null; }
  if (f.comboT <= 0) f.comboShow = 0;''')

# ---- attacks: chains ----
rep('''  // Attacks (light can cancel into heavy / special once it has connected)
  const cancel = f.action && f.action.type === "light" && f.action.hitDone && f.action.t > f.action.move.startup;
  if (fighting && (free || cancel) && f.hitstun <= 0) {''', '''  // Chains: light → light → heavy (finisher). Presses during an attack are buffered
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

  // Attacks (light can cancel into heavy / special once it has connected)
  const cancel = !chained && f.action && f.action.type === "light" && f.action.hitDone && f.action.t > f.action.move.startup;
  if (!chained && fighting && (free || cancel) && f.hitstun <= 0) {''')

# ---- dash ----
rep('''  // Horizontal movement
  if (f.onGround) {
    let target = 0;
    if (canAct(f) && !f.crouch) {''', '''  // Dash / backdash: double-tap forward or back
  if (fighting && f.onGround && canAct(f)) {
    for (const k of ["left", "right"]) {
      if (!c.pressed[k]) continue;
      const d = k === "right" ? 1 : -1;
      if (f.tap && f.tap.d === d && G.time - f.tap.t < 0.27) { startDash(f, d); f.tap = null; }
      else f.tap = { d, t: G.time };
    }
  }
  if (f.dashT > 0 && (f.action || f.hitstun > 0 || f.blockstun > 0 || !f.onGround)) f.dashT = 0;

  // Horizontal movement
  if (f.onGround && f.dashT > 0) {
    f.dashT -= dt;
    f.vx = f.dashV * (f.dashT > 0.06 ? 1 : 0.5);
  } else if (f.onGround) {
    let target = 0;
    if (canAct(f) && !f.crouch) {''')
rep('''  if (f.action && (f.action.type === "heavy" || f.action.type === "special") && f.afterT <= 0) {''',
    '''  if (((f.action && (f.action.type === "heavy" || f.action.type === "special")) || f.dashT > 0) && f.afterT <= 0) {''')

# ---- meleeCheck: connected flag, launch, finisher ----
rep('''      knock: mv.knock, dir: f.dir, sfx: mv.sfx, stop: mv.stop, chip: 0, wall: mv.wall,
      sparkX: opp.x - f.dir * 20, sparkY: f.y + (mv.y0 + mv.y1) / 2,
    });
    if (res === "block") a.hitDone = true;''', '''      knock: mv.knock, dir: f.dir, sfx: mv.sfx, stop: mv.stop, chip: 0, wall: mv.wall, launch: mv.launch,
      sparkX: opp.x - f.dir * 20, sparkY: f.y + (mv.y0 + mv.y1) / 2,
    });
    if (res === "block") a.hitDone = true;
    if (res === "hit" || res === "block") a.connected = res;
    if (res === "hit" && mv.finisher) {
      popup(opp.x, opp.y - 340, FINISHERS[f.cid] || "СВЯЗКА!", GOLD, 36);
      F.shake = Math.max(F.shake, 16);
      F.flash = Math.max(F.flash, 0.08);
      F.hypeUntil = G.time + 1.4;
    }''')

# ---- applyHit: invulnerable backdash, stop dash ----
rep('''  if (def.ko) return "miss";''', '''  if (def.ko) return "miss";
  if (def.invulnT > 0) return "miss";
  def.dashT = 0;''')

# ---- Oxxxy: tentacles pull ----
rep('''        applyHit(f, opp, {
          dmg: 14, height: "mid", hitstun: 0.55, blockstun: 0.26, knock: -260, dir: f.dir,
          sfx: "hitHeavy", stop: 0.1, chip: 3, launch: -520,
          sparkX: opp.x, sparkY: opp.y - 120,
        });''', '''        // tentacles grab and drag the opponent right in front of Oxxxy — free follow-up
        const res = applyHit(f, opp, {
          dmg: 12, height: "mid", hitstun: 0.95, blockstun: 0.26, knock: 0, dir: f.dir,
          sfx: "hitHeavy", stop: 0.1, chip: 3,
          sparkX: opp.x, sparkY: opp.y - 120,
        });
        if (res === "hit") {
          opp.pull = { by: f.slot, t: 0.3, dist: 100, mode: "pull" };
          popup(opp.x, opp.y - 320, "ИДИ СЮДА!", "#c48bff", 30);
        }''')

# ---- Maybe: whip pulls and throws over her ----
rep('''        const res = applyHit(f, opp, {
          dmg: tip ? 15 : 8, height: "mid", hitstun: tip ? 0.5 : 0.36, blockstun: 0.2,
          knock: tip ? 420 : 200, dir: f.dir, sfx: tip ? "hitHeavy" : "hitLight", stop: tip ? 0.13 : 0.06, chip: 2,
          sparkX: opp.x - f.dir * 16, sparkY: f.y - 165,
        });
        if (tip && res === "hit") popup(opp.x, opp.y - 320, "ЩЕЛЧОК!", "#9fd0ff", 32);''', '''        // the hair wraps around the opponent, yanks them in and Maybe throws them over herself
        const res = applyHit(f, opp, {
          dmg: tip ? 9 : 7, height: "mid", hitstun: 2, blockstun: 0.2,
          knock: 0, dir: f.dir, sfx: tip ? "hitHeavy" : "hitLight", stop: tip ? 0.12 : 0.07, chip: 2,
          sparkX: opp.x - f.dir * 16, sparkY: f.y - 165,
        });
        if (res === "hit") {
          opp.pull = { by: f.slot, t: 0.24, dist: 70, mode: "throw" };
          popup(opp.x, opp.y - 320, tip ? "ЩЕЛЧОК!" : "СЮДА!", "#9fd0ff", 32);
        }''')

# ---- per-frame pull / throw / no-push ----
rep('''  updateFighter(a, b, dt);
  updateFighter(b, a, dt);

  // Push boxes: grounded fighters can't overlap (you can still jump over).
  if (!a.ko && !b.ko) {''', '''  updateFighter(a, b, dt);
  updateFighter(b, a, dt);
  updatePull(a, dt);
  updatePull(b, dt);

  // Push boxes: grounded fighters can't overlap (you can still jump over).
  if (!a.ko && !b.ko && !(a.noPushT > 0) && !(b.noPushT > 0)) {''')

HELP = r'''
/* ------------------------------------------------------------------ */
/* Combat extras: dash, chain finishers, pulls and throws              */
/* ------------------------------------------------------------------ */
const FINISHERS = {
  guf: "ЦЕНТРОВОЙ!", noize: "ВЫДЫХАЙСЯ!", oxxxy: "ГОРГОРОД!", morgen: "ДОРОГО-БОГАТО!",
  maybe: "БЭЙБИ-КОМБО!", kreed: "ХОЛОСТЯК!", slava: "ГНОЙНЫЙ!", atl: "МАРАБУ!",
  korzh: "ЖИТЬ В КАЙФ!", face: "ЮМОРИСТ!",
};

function startDash(f, d) {
  const fwd = d === f.dir;
  f.dashT = fwd ? 0.2 : 0.18;
  f.dashV = d * (fwd ? 960 : 760);
  if (!fwd) f.invulnT = 0.12;            // a backdash slips through the first frames of an attack
  f.tap = null;
  spawnDust(f.x - d * 30, f.y, 0.9);
  playSfx("whoosh");
}

// Third hit of a light-light-heavy chain: stronger, launches, shows the fighter's finisher name
function makeFinisher(f) {
  const mv = f.action.move;
  f.action.move = { ...mv, dmg: mv.dmg + 5, knock: Math.max(mv.knock, 320) * 1.6, launch: -520,
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
        playSfx("whoosh");
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
    F.stats && F.fighters[by] && (F.fighters[by].combo = (F.fighters[by].combo || 0) + 1);
    popup(f.x, f.y - 240, `-${dmg}`, "#ffef7a", 30);
    spawnDust(f.x, FLOOR_Y, 1.6);
    hitSpark(f.x, FLOOR_Y - 40, 10);
    F.shake = Math.max(F.shake, 14);
    F.hypeUntil = G.time + 1.1;
    playSfx("hitHeavy");
    if (f.hp <= 0) endRound("ko", by, f.x < W / 2 ? -1 : 1);
  }
}
'''
rep('''/* ------------------------------------------------------------------ */
/* Maybe Baby: hair whip                                               */''', HELP.lstrip('\n') + '''
/* ------------------------------------------------------------------ */
/* Maybe Baby: hair whip                                               */''')

# ---- bot: chains and dashes ----
rep('''  if (ai.jump) {
    ai.jump = false;''', '''  // Chains: once a light hit connects, continue light → heavy (skill depends on difficulty)
  if (bot.action && bot.action.type === "light" && bot.action.connected && !bot.action.chainTried) {
    bot.action.chainTried = true;
    if (Math.random() < d.combo) c.pressed[(bot.action.chainStep || 1) === 1 && Math.random() < 0.7 ? "light" : "heavy"] = true;
  }
  // Dashes: close the gap from far away, backdash out of the opponent's attack
  if (canAct(bot) && bot.onGround && !ai.jump) {
    if (dist > 380 && Math.random() < dt * d.jumpIn * 6) startDash(bot, towards === "right" ? 1 : -1);
    else if (opp.action && opp.action.type !== "special" && dist < 150 && Math.random() < dt * d.block * 1.5) startDash(bot, towards === "right" ? -1 : 1);
  }

  if (ai.jump) {
    ai.jump = false;''')
open(P, 'w').write(s)
print('ok')
