/* Emojin: pure battle engine. No DOM, network, or timers. */
(function (root) {
  "use strict";

  const BASIC = [
    { id: "attack1", weight: 30 },
    { id: "attack2", weight: 22 },
    { id: "blank", weight: 18 },
    { id: "heal", weight: 10 },
    { id: "guard", weight: 10 },
    { id: "counter", weight: 10 }
  ];
  const SPECIAL = ["poison", "strong", "drain", "ram", "twin", "fullheal", "curse"];
  const FACES = {
    attack1: { icon: "⚔️", value: 1, name: "攻撃 1", text: "相手に1ダメージ。防御・カウンターの対象。", color: "mint" },
    attack2: { icon: "⚔️", value: 2, name: "攻撃 2", text: "相手に2ダメージ。防御・カウンターの対象。", color: "mint" },
    blank: { icon: "💩", name: "ハズレ", text: "なにも起きない。そんな日もある。", color: "muted" },
    heal: { icon: "🧪", name: "回復", text: "♡を1回復し、毒を解除。呪いがあればランダムな1スロットを解除する。", color: "mint" },
    guard: { icon: "🛡️", name: "防御", text: "このバトルの攻撃ダメージを合計1軽減。毒・吸血・体当たりの自傷は防げない。", color: "blue" },
    counter: { icon: "↩️", name: "カウンター", text: "\u653b\u6483\u30c0\u30e1\u30fc\u30b8\u3092\u53d7\u3051\u305a\u3001\u305d\u306e\u307e\u307e\u76f8\u624b\u306b\u8fd4\u3059\u3002\u6bd2\u30fb\u5438\u8840\u30fb\u81ea\u50b7\u30fb\u53cd\u6483\u306f\u5bfe\u8c61\u5916\u3002", color: "blue" },
    poison: { icon: "🦠", name: "毒", text: "相手を毒にする。次のバトル開始時に1ダメージ、その後4/6で継続。毒は重複しない。", color: "green", special: true },
    strong: { icon: "💥", value: 3, name: "強攻撃", text: "相手に3ダメージ。防御・カウンターの対象。", color: "amber", special: true },
    drain: { icon: "🦇", value: 2, name: "吸血", text: "相手の♡を最大2奪い、実際に奪った分だけ回復する。相手の♡が1なら回復も1。防御・カウンターを無視。", color: "pink", special: true },
    ram: { icon: "🦬", value: 4, name: "体当たり", text: "相手に4ダメージ、自分にも2ダメージ。相手の防御・カウンターは有効。自傷は防げない。", color: "amber", special: true },
    twin: { icon: "🎲", twin: true, name: "ツイン", text: "追加で2個振り、両方の効果を処理する。追加のツインはハズレ。呪われたツインは発動せず、その呪いだけ解除。", color: "violet", special: true },
    fullheal: { icon: "💖", name: "全回復", text: "♡を最大まで回復する。毒と呪いは残る。", color: "pink", special: true },
    curse: { icon: "☠️", name: "呪い", text: "ランダムな3スロットを呪う。呪われた目が出ると効果は無効、そのスロットの呪いが消える。重ね掛けの重複分は変化なし。", color: "violet", special: true }
  };
  const EMOJIS = ["🦐","🐙","🍙","🤖","👾","💩","🐸","🦖","🦕","🌷","🍄","🦆","🦀","🍋","🍞","🥑","🐌","👻","🗿","🦑","🐧","🐼","🦊","🦋","🐢","🦔","🐟","🐳","🌵","🍆","🥕","🍥","🍣","🍔","🍟","🍩","🍮","🧀","🧊","🚽","🛸","🚀","🧸","🪩","🦷","🧠","🫀","🪼","🦎","🐣","🦭","🐈","🍤","🥦","🍑","🌝","🥸","🤡","👹","👺","👽","👄","💃","🕺","🛌","🐒","🦍","🦧","🐕","🐩","🐺","🦝","🐈‍⬛","🐅","🐆","🐴","🫎","🫏","🐎","🦓","🦌","🦬","🐃","🐄","🐖","🐗","🐑","🐫","🦙","🦒","🐘","🦣","🦏","🦛","🐀","🐇","🐿️","🦫","🦇","🐨","🦥","🦦","🦨","🦘","🦡","🐓","🐤","🐦","🕊️","🦅","🦢","🦉","🦤","🪶","🦩","🦚","🦜","🪽","🐦‍⬛","🪿","🐦‍🔥","🐊","🐍","🐉","🐬","🫍","🐠","🐡","🦈","🐚","🪸","🦞","🦪","🐛","🐜","🐝","🪲","🐞","🦗","🦟","🪰","💐","🌸","🌹","🌻","🌱","🌴","🍀","🍁","🍇","🍈","🍉","🍊","🍌","🍍","🍎","🍒","🍓","🥝","🥔","🌽","🌶️","🫑","🧄","🥜","🫛","🥐","🥖","🥨","🥞","🍖","🍕","🌭","🍳","🍱","🍜","🍡","🍦","🍪","🎂","🍫","🍬","🍭","🍼","☕","🍾","🍷","🍺","🧋","🔪","🏺","🎃","🎄","🎈","🎉","🎎","🎁","⚾","🏀","🏈","🥊","⛳","⛸️","🤿","🥌","🔫","🎱","🪄","🎮","🎴","🧞‍♂️","🧟","🫈","🌍","🗾","🧭","🌋","🪵","🗼","🗽","🎡","🚂","🚃","🚑","🚒","🚓","🚚","🏍️","🛵","🛺","🚲","🛴","🛢️","⛽","🛞","🚨","🪂","🚁","🌪️","🕶️","👘","👛","⛑️","📢","🎸","💴","✒️","📌","🔨","🚬","🪬"];

  function accrueMoji(wallet, timestamp) {
    const balance = Math.max(0, Math.min(3000, Math.floor(wallet.balance)));
    let updatedAt = Math.min(timestamp, wallet.updatedAt);
    if (balance === 3000) return { balance, updatedAt: timestamp };
    const gained = Math.max(0, Math.floor((timestamp - updatedAt) / 60000));
    const next = Math.min(3000, balance + gained);
    updatedAt = next === 3000 ? timestamp : updatedAt + gained * 60000;
    return { balance: next, updatedAt };
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function clamp(x, low, high) { return Math.max(low, Math.min(high, x)); }
  function index(rng, n) { return Math.min(n - 1, Math.floor(rng() * n)); }
  function sample(array, n, rng) {
    const result = array.slice();
    for (let i = 0; i < Math.min(n, result.length); i++) {
      const j = i + index(rng, result.length - i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result.slice(0, n);
  }
  function weightedBasic(rng) {
    let n = rng() * 100;
    for (const f of BASIC) { n -= f.weight; if (n < 0) return f.id; }
    return "counter";
  }
  function id(prefix = "e") {
    if (root.crypto && typeof root.crypto.randomUUID === "function") return prefix + "-" + root.crypto.randomUUID();
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }
  function createDraft(rng = Math.random, now = Date.now()) {
    return {
      id: id("e"), emoji: EMOJIS[index(rng, EMOJIS.length)],
      maxHp: 5 + index(rng, 6),
      basicSlots: Array.from({ length: 5 }, () => weightedBasic(rng)),
      offers: sample(SPECIAL, 2, rng), createdAt: now, name: "", chosen: null, stage: "name"
    };
  }
  function fromDraft(draft, name, ownerName, chosen, now = Date.now()) {
    if (!draft.offers.includes(chosen)) throw new Error("Invalid special ability.");
    return {
      id: draft.id, emoji: draft.emoji, name, ownerName,
      currentHp: draft.maxHp, maxHp: draft.maxHp,
      slots: [...draft.basicSlots, chosen], poisoned: false, cursedSlots: [],
      stars: 0, status: "active", createdAt: now, endedAt: null
    };
  }
  function validate(e) {
    if (!e || !e.id || e.status !== "active") throw new Error("Battle participants must be active.");
    if (!Array.isArray(e.slots) || e.slots.length !== 6 || e.slots.some(s => !FACES[s])) throw new Error("Invalid die.");
    if (!Number.isInteger(e.maxHp) || e.maxHp < 1 || !Number.isFinite(e.currentHp) || e.currentHp <= 0) throw new Error("Invalid HP.");
    if (!Number.isInteger(e.stars) || e.stars < 0 || e.stars >= 50) throw new Error("Invalid stars.");
    if ((e.cursedSlots || []).some(s => !Number.isInteger(s) || s < 0 || s > 5)) throw new Error("Invalid curse.");
  }

  /*
   * Battle phases are resolved from a shared snapshot per phase.
   * A/B ordering never decides who gets to attack.
   * The returned log is authoritative; the UI MUST NOT re-roll when replaying.
   */
  function battle(inputA, inputB, rng = Math.random, now = Date.now()) {
    validate(inputA); validate(inputB);
    if (inputA.id === inputB.id) throw new Error("An emojin cannot battle itself.");
    const states = [clone(inputA), clone(inputB)];
    const before = clone(states);
    const events = [];
    const actions = [[], []];
    const stateList = () => clone(states);
    function emit(type, detail = {}) { events.push({ type, ...detail, state: stateList() }); }
    // Poison belongs to the start of battle, before the combat dice are rolled.
    const poisoned = states.map(s => s.poisoned);
    if (poisoned.some(Boolean)) {
      states.forEach((s, i) => { if (poisoned[i]) s.currentHp -= 1; });
      emit("poisonTick", { sides: [0,1].filter(i => poisoned[i]) });
      const checks = [];
      states.forEach((s, side) => {
        if (!poisoned[side]) return;
        const value = 1 + index(rng, 6);
        s.poisoned = value <= 4;
        checks.push({ side, value, continued: s.poisoned });
      });
      emit("poisonCheck", { checks });
    }
    const rolls = states.map((s, side) => {
      const slot = index(rng, 6);
      return { side, slot, face: s.slots[slot], cursed: s.cursedSlots.includes(slot) };
    });
    emit("roll", { rolls });

    // A cursed face cannot execute its ability, including Twin.
    // Identical cursed slots drawn twice by Twin clear on the first occurrence.
    function acceptRoll(side, slot, extra) {
      const s = states[side], face = s.slots[slot];
      if (s.cursedSlots.includes(slot)) {
        s.cursedSlots = s.cursedSlots.filter(v => v !== slot);
        emit("curseBlock", { side, slot, face, extra });
        return;
      }
      if (face === "twin") {
        if (extra) { emit("twinBlank", { side, slot }); return; }
        const extras = [index(rng, 6), index(rng, 6)];
        const previewCurses = new Set(s.cursedSlots);
        emit("twin", {
          side, rolls: extras.map(slot => {
            const cursed = previewCurses.has(slot);
            previewCurses.delete(slot);
            return { side, slot, face: s.slots[slot], cursed };
          })
        });
        extras.forEach(slot => acceptRoll(side, slot, true));
        return;
      }
      actions[side].push({ face, slot });
    }
    rolls.forEach(r => acceptRoll(r.side, r.slot, false));

    const count = (side, face) => actions[side].filter(a => a.face === face).length;
    const healing = [];
    states.forEach((s, side) => {
      const n = count(side, "heal"), full = count(side, "fullheal") > 0;
      if (!n && !full) return;
      const oldHp = s.currentHp, oldPoison = s.poisoned, removed = [];
      s.currentHp = full ? s.maxHp : Math.min(s.maxHp, s.currentHp + n);
      if (n) {
        s.poisoned = false;
        for (let k = 0; k < n && s.cursedSlots.length; k++) {
          const removedSlot = s.cursedSlots[index(rng, s.cursedSlots.length)];
          removed.push(removedSlot);
          s.cursedSlots = s.cursedSlots.filter(v => v !== removedSlot);
        }
      }
      healing.push({ side, amount: s.currentHp - oldHp, full, removed, clearedPoison: oldPoison && !s.poisoned });
    });
    if (healing.length) emit("heal", { healing });

    const guards = [count(0, "guard"), count(1, "guard")];
    if (guards.some(Boolean)) emit("guard", { guards });

    const attackPower = side => actions[side].reduce((sum, a) => sum + ({ attack1:1, attack2:2, strong:3, ram:4 }[a.face] || 0), 0);
    const powers = [attackPower(0), attackPower(1)];
    // Reflection intercepts incoming attacks before they can damage the defender.
    // Non-attack losses (poison, drain and ram recoil) are unaffected.
    const counterCounts = [count(0, "counter"), count(1, "counter")];
    const reflected = [0, 1].map(side => counterCounts[side] ? powers[1-side] : 0);
    const received = [0, 1].map(side => counterCounts[side] ? 0 : Math.max(0, powers[1-side] - guards[side]));
    const selfDamage = [count(0,"ram") * 2, count(1,"ram") * 2];
    const impactHp = states.map(s => s.currentHp);
    // Drain uses actual available HP at the start of this simultaneous phase.
    const drained = [
      Math.min(Math.max(0, impactHp[1]), count(0,"drain") * 2),
      Math.min(Math.max(0, impactHp[0]), count(1,"drain") * 2)
    ];
    const attacks = [];
    [0,1].forEach(side => {
      if (powers[side]) attacks.push({
        side, target: 1-side, power: powers[side], damage: received[1-side],
        blocked: reflected[1-side] ? 0 : powers[side] - received[1-side], reflected: reflected[1-side], ram: count(side,"ram") > 0,
        strong: count(side,"strong") > 0
      });
    });
    const drains = [0,1].filter(side => count(side,"drain")).map(side => ({ side, target:1-side, amount:drained[side] }));
    if (attacks.length || drains.length) {
      states.forEach((s, side) => {
        s.currentHp = Math.min(s.maxHp,
          impactHp[side] - received[side] - selfDamage[side] - drained[1-side] + drained[side]);
      });
      emit("impact", { attacks, drains, selfDamage, hpDelta: states.map((s,i) => s.currentHp-impactHp[i]) });
    }

    // Each counter returns the intercepted attack, never another counter.
    // A remaining guard budget may reduce a reflected attack once.
    const counters = [];
    const counterDamage = [0,0];
    [0,1].forEach(side => {
      const n = counterCounts[side];
      if (!n || reflected[side] <= 0) return;
      const target = 1-side;
      const power = reflected[side] * n;
      const remainingGuard = Math.max(0, guards[target] - powers[side]);
      const damage = Math.max(0, power - remainingGuard);
      counterDamage[target] += damage;
      counters.push({ side, target, power, damage, times: n });
    });
    if (counters.length) {
      states.forEach((s,i) => { s.currentHp -= counterDamage[i]; });
      emit("counter", { counters });
    } else if ([0,1].some(side => count(side,"counter"))) {
      emit("counterIdle", { sides:[0,1].filter(side => count(side,"counter")) });
    }

    const poisonAdds = [];
    [0,1].forEach(side => {
      if (count(side,"poison")) {
        const target = 1-side, already = states[target].poisoned;
        states[target].poisoned = true;
        poisonAdds.push({ side, target, already });
      }
    });
    if (poisonAdds.length) emit("poisonApply", { applications:poisonAdds });

    [0,1].forEach(side => {
      for (let k = 0; k < count(side,"curse"); k++) {
        const target = 1-side;
        const selected = sample([0,1,2,3,4,5], 3, rng);
        const added = selected.filter(s => !states[target].cursedSlots.includes(s));
        states[target].cursedSlots = [...new Set([...states[target].cursedSlots, ...selected])].sort((a,b) => a-b);
        emit("curseApply", { side, target, selected, added });
      }
    });

    const deadIds = [], legendIds = [];
    states.forEach(s => {
      s.currentHp = clamp(s.currentHp, 0, s.maxHp);
      if (s.currentHp === 0) {
        s.status = "dead"; s.endedAt = now; deadIds.push(s.id);
      } else {
        s.stars += 1;
        if (s.stars >= 50) { s.stars = 50; s.status = "legend"; s.endedAt = now; legendIds.push(s.id); }
      }
    });
    emit("finish", { deadIds, legendIds });
    return {
      rulesVersion: 3, battleId: id("b"), battleAt: now, emojinAId: inputA.id, emojinBId: inputB.id,
      ownerNames: [...new Set([inputA.ownerName,inputB.ownerName])],
      before, after: stateList(), rolls, events, deadIds, legendIds
    };
  }

  function forced(emojins, rng = Math.random, now = Date.now()) {
    const active = emojins.filter(e => e.status === "active");
    if (active.length < 2) return { emojins: emojins.map(clone), battles: [] };
    const pair = sample(active, 2, rng);
    const log = battle(pair[0], pair[1], rng, now);
    const updates = new Map(log.after.map(e => [e.id,e]));
    return { emojins: emojins.map(e => updates.get(e.id) || clone(e)), battles: [log] };
  }

  // One regular battle, then fresh random pairs until population <= 30.
  function hourly(emojins, rng = Math.random, now = Date.now()) {
    let world = emojins.map(clone);
    const logs = [];
    let active = world.filter(e => e.status === "active");
    if (active.length < 2) return { emojins: world, battles: logs };
    const safetyLimit = active.length * 51;
    do {
      const pair = sample(active, 2, rng);
      const log = battle(pair[0], pair[1], rng, now);
      const updates = new Map(log.after.map(e => [e.id,e]));
      world = world.map(e => updates.get(e.id) || e);
      logs.push(log);
      active = world.filter(e => e.status === "active");
      if (logs.length > safetyLimit) throw new Error("Unexpected population loop.");
    } while (active.length > 30);
    return { emojins:world, battles:logs };
  }
  function seeded(seed) {
    return function () {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const api = { BASIC, SPECIAL, FACES, EMOJIS, accrueMoji, clone, clamp, index, sample, id, createDraft, fromDraft, battle, forced, hourly, seeded };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EmojinEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
