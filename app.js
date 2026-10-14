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
    attack1: { icon: "⚔️", value: 1, name: "攻撃 1", text: "相手に1ダメージ。", color: "mint" },
    attack2: { icon: "⚔️", value: 2, name: "攻撃 2", text: "相手に2ダメージ。", color: "mint" },
    blank: { icon: "💩", name: "ハズレ", text: "なにも起きない。そんな時もある。", color: "muted" },
    heal: { icon: "🧪", name: "回復", text: "♡を1回復し、毒を解除。呪いを1スロット解除する。", color: "mint" },
    guard: { icon: "🛡️", name: "防御", text: "攻撃ダメージを1軽減。毒・吸血などのダメージは防げない。", color: "blue" },
    counter: { icon: "↩️", name: "カウンター", text: "攻撃ダメージを無効にし、同じ量のダメージを相手に与える。", color: "blue" },
    poison: { icon: "🦠", name: "毒", text: "相手を毒にする。毒はバトル開始時に1ダメージを受ける。1/3で解除。", color: "green", special: true },
    strong: { icon: "💥", value: 3, name: "強攻撃", text: "相手に3ダメージ。攻撃として扱う。", color: "amber", special: true },
    drain: { icon: "🦇", value: 2, name: "吸血", text: "相手の♡を最大2奪い、その分だけ回復する。", color: "pink", special: true },
    ram: { icon: "🦬", value: 4, name: "体当たり", text: "相手に4ダメージ自分にも2ダメージ。攻撃扱いなのでカウンターを食らうと最悪。", color: "amber", special: true },
    twin: { icon: "🎲", twin: true, name: "ツイン", text: "さらに2個抽選する。その際のツインはハズレ扱い。", color: "violet", special: true },
    fullheal: { icon: "💖", name: "全回復", text: "♡を最大まで回復する。毒と呪いは残る。", color: "pink", special: true },
    curse: { icon: "☠️", name: "呪い", text: "スロットを3つ呪う。呪われた目が出ると効果は無効、そのスロットの呪いが消える。", color: "violet", special: true }
  };
  const EMOJIS = ["🦐","🐙","🍙","🤖","👾","💩","🐸","🦖","🦕","🌷","🍄","🦆","🦀","🍋","🍞","🥑","🐌","👻","🗿","🦑","🐧","🐼","🦊","🦋","🐢","🦔","🐟","🐳","🌵","🍆","🥕","🍥","🍣","🍔","🍟","🍩","🍮","🧀","🧊","🚽","🛸","🚀","🧸","🪩","🦷","🧠","🫀","🪼","🦎","🐣","🦭","🐈","🍤","🥦","🍑","🌝","🥸","🤡","👹","👺","👽","👄","💃","🕺","🛌","🐒","🦍","🦧","🐕","🐩","🐺","🦝","🐈‍⬛","🐅","🐆","🐴","🫎","🫏","🐎","🦓","🦌","🦬","🐃","🐄","🐖","🐗","🐑","🐫","🦙","🦒","🐘","🦣","🦏","🦛","🐀","🐇","🐿️","🦫","🦇","🐨","🦥","🦦","🦨","🦘","🦡","🐓","🐤","🐦","🕊️","🦅","🦢","🦉","🦤","🪶","🦩","🦚","🦜","🪽","🐦‍⬛","🪿","🐦‍🔥","🐊","🐍","🐉","🐬","🫍","🐠","🐡","🦈","🐚","🪸","🦞","🦪","🐛","🐜","🐝","🪲","🐞","🦗","🦟","🪰","💐","🌸","🌹","🌻","🌱","🌴","🍀","🍁","🍇","🍈","🍉","🍊","🍌","🍍","🍎","🍒","🍓","🥝","🥔","🌽","🌶️","🫑","🧄","🥜","🫛","🥐","🥖","🥨","🥞","🍖","🍕","🌭","🍳","🍱","🍜","🍡","🍦","🍪","🎂","🍫","🍬","🍭","🍼","☕","🍾","🍷","🍺","🧋","🔪","🏺","🎃","🎄","🎈","🎉","🎎","🎁","⚾","🏀","🏈","🥊","⛳","⛸️","🤿","🥌","🔫","🎱","🪄","🎮","🎴","🧞‍♂️","🧟","🫈","🌍","🗾","🧭","🌋","🪵","🗼","🗽","🎡","🚂","🚃","🚑","🚒","🚓","🚚","🏍️","🛵","🛺","🚲","🛴","🛢️","⛽","🛞","🚨","🪂","🚁","🌪️","🕶️","👘","👛","⛑️","📢","🎸","💴","✒️","📌","🔨","🚬","🪬"];

  function accrueMoji(wallet, timestamp) {
    const balance = Math.max(0, Math.floor(wallet.balance));
    let updatedAt = Math.min(timestamp, wallet.updatedAt);
    if (balance >= 3000) return { balance, updatedAt: timestamp };
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
  // Shared persistence rules: browser and GAS use the same eligibility/NPC logic.
  const DORMANCY_MS = 5 * 24 * 60 * 60 * 1000;
  function ownerPresence(owner, now, accessed = false) {
    const suspended = (owner.unreadBattleIds || []).length >= 7;
    // Existing owners get their missing suspension date at the first maintenance pass.
    const suspendedAt = suspended ? Number(owner.suspendedAt || now) : 0;
    const lastAccessAt = accessed ? now : Number(owner.lastAccessAt || owner.createdAt || now);
    const dormant = !accessed && suspended && now - Math.max(suspendedAt,lastAccessAt) >= DORMANCY_MS;
    return {...owner,suspended,suspendedAt,lastAccessAt,dormant};
  }
  function participatingCount(all,meta) {
    const excluded=new Set([...(meta.suspendedOwnerUids||[]),...(meta.dormantOwnerUids||[])]);
    return all.filter(e=>e.status==='active' && (e.isNpc || e.ownerUid==='npc' || !excluded.has(e.ownerUid))).length;
  }

  function eligible(emojins, owners) {
    return emojins.filter(e => e.status === 'active' &&
      (e.isNpc || e.ownerUid === 'npc' ||
       (owners[e.ownerUid] && !owners[e.ownerUid].dormant && (owners[e.ownerUid].unreadBattleIds || []).length < 7)));
  }
  function planBattle(all, owners, meta, inputLog) {
    const log = clone(inputLog), nextMeta = {...meta};
    log.seq = Number(meta.battleSeq || 0) + 1;
    log.ownerUids = [...new Set(log.before.filter(e => !e.isNpc && e.ownerUid !== 'npc').map(e => e.ownerUid))];
    nextMeta.battleSeq = log.seq;
    const ownerUpdates = {};
    log.ownerUids.forEach(uid => {
      if (!owners[uid] || owners[uid].dormant || (owners[uid].unreadBattleIds || []).length >= 7) {
        throw Error('休止中のオーナーのエモジンはバトルに参加できません。');
      }
      const ids = [...new Set([...(owners[uid].unreadBattleIds || []), log.battleId])];
      ownerUpdates[uid] = ownerPresence({...owners[uid], unreadBattleIds: ids}, Date.now());
    });
    const suspended = new Set(meta.suspendedOwnerUids || []);
    Object.entries(ownerUpdates).forEach(([uid,p]) => { if(p.suspended)suspended.add(uid);else suspended.delete(uid); });
    nextMeta.suspendedOwnerUids = [...suspended];
    const updates = new Map(log.after.map(e => [e.id, e]));
    const world = all.map(e => updates.get(e.id) || e);
    const npcs = [];
    const missing = Math.max(0, 10 - participatingCount(world,nextMeta));
    const kana = Array.from('アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワ');
    for (let i = 0; i < missing; i++) {
      const draft = createDraft(Math.random, log.battleAt);
      npcs.push({id:draft.id, emoji:draft.emoji,
        name:Array.from({length:3}, () => kana[index(Math.random,kana.length)]).join('')+'ン',
        ownerName:'NPC', ownerUid:'npc', isNpc:true, currentHp:draft.maxHp, maxHp:draft.maxHp,
        slots:[...draft.basicSlots,'attack1'], poisoned:false, cursedSlots:[], stars:0,
        status:'active', createdAt:log.battleAt, endedAt:null});
    }
    const legends = [];
    (log.legendIds || []).forEach(id => {
      nextMeta.legendSeq = Number(nextMeta.legendSeq || 0) + 1;
      legends.push({seq:nextMeta.legendSeq, battleSeq:log.seq, at:log.battleAt,
        emojin:log.after.find(e => e.id === id)});
    });
    return {log, meta:nextMeta, owners:ownerUpdates, emojins:[...log.after,...npcs], npcs, legends};
  }

  const api = { DORMANCY_MS, ownerPresence, participatingCount, eligible, planBattle, BASIC, SPECIAL, FACES, EMOJIS, accrueMoji, clone, clamp, index, sample, id, createDraft, fromDraft, battle, forced, hourly, seeded };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EmojinEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

/* Firebase configuration is public. Paste the Web app config from Firebase here. */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB_OhdHIjV5vfE5gjZnAtBWS3bhRWeytnc",
  authDomain: "emojin-49855.firebaseapp.com",
  projectId: "emojin-49855",
  storageBucket: "emojin-49855.firebasestorage.app",
  messagingSenderId: "463527434619",
  appId: "1:463527434619:web:94a1441c0a9b490fb105de"
};
const FIREBASE_SDK_VERSION = '13.0.0';
const KEY = 'emojin.firestore.v1.' + FIREBASE_CONFIG.projectId;
const parse = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
let local = parse();
const persist = () => localStorage.setItem(KEY, JSON.stringify(local));
local.wallet ||= {balance:3500, updatedAt:Date.now()};
local.pending ||= [];
let uid = local.uid || '';
let world = {emojins:[], battles:[], legends:[], nextSeq:1, nextLegendSeq:1, suspendedOwnerUids:[],dormantOwnerUids:[]};
let writeOperation, flushing = null;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const transient = error => /unavailable|deadline-exceeded|aborted|network-request-failed|timeout|failed to fetch|error loading dynamically imported/i.test(String(error.code || '')+' '+String(error.message || ''));
function bounded(task, ms=30000) {
  let timer;
  return Promise.race([task, new Promise((_,reject) => {timer=setTimeout(() => reject(Object.assign(new Error('通信を再試行しています。'),{code:'timeout'})),ms);})]).finally(() => clearTimeout(timer));
}
async function retry(task, forever=false) {
  let tries=0;
  for (;;) {
    try {
      const result = await bounded(Promise.resolve().then(task));
      const message=document.getElementById('bootMessage');if(message)message.textContent='';
      return result;
    } catch(error) {
      if (!transient(error) || (!forever && tries >= 3)) throw error;
      const message=document.getElementById('bootMessage');
      if(message)message.textContent='接続を再試行しています…';
      await pause(Math.min(2000 * 2 ** tries++,15000));
    }
  }
}
async function hashText(text) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
function authError(error) {
  const code=String(error.code || '');
  const messages={
    'auth/email-already-in-use':'このオーナー名は使われています。',
    'auth/invalid-credential':'オーナー名またはパスワードが違います。',
    'auth/wrong-password':'オーナー名またはパスワードが違います。',
    'auth/user-not-found':'オーナー名またはパスワードが違います。',
    'auth/too-many-requests':'アクセスが集中しています。少し待ってからお試しください。',
    'auth/operation-not-allowed':'Firebaseでメール／パスワード認証を有効にしてください。',
    'permission-denied':'Firestoreのルール設定を確認してください。'
  };
  return new Error(messages[code] || error.message || '通信に失敗しました。');
}
async function flush() {
  if(flushing)return flushing;
  flushing=(async()=>{
    const npcs=[];let last={};
    while(local.pending.length) {
      const op=local.pending[0];
      try {last=await retry(()=>writeOperation(op));npcs.push(...(last.npcs || []));}
      catch(error) {
        if(/別のバトルで状態が変わりました|休止中のオーナー/.test(error.message)) {
          local.pending=local.pending.filter(x=>x.id!==op.id);persist();
        }
        throw error;
      }
      local.pending=local.pending.filter(x=>x.id!==op.id);persist();
    }
    return {...last,npcs};
  })().finally(()=>{flushing=null;});
  return flushing;
}
function enqueue(action,data,id) {
  if(!local.pending.some(op=>op.id===id))local.pending.push({action,data,id});
  persist();return flush();
}
async function createCloud() {
  const E=window.EmojinEngine;
  if(FIREBASE_CONFIG.projectId==='YOUR_PROJECT_ID' || FIREBASE_CONFIG.apiKey==='YOUR_FIREBASE_API_KEY') {
    throw Error('app.js の FIREBASE_CONFIG にFirebaseの設定を入力してください。');
  }
  const base='https://www.gstatic.com/firebasejs/'+FIREBASE_SDK_VERSION+'/';
  const [appSDK,A,F]=await retry(()=>Promise.all([
    import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')
  ]),true);
  const app=appSDK.initializeApp(FIREBASE_CONFIG);
  const auth=A.getAuth(app);
  const db=F.initializeFirestore(app,{experimentalForceLongPolling:true});
  await A.setPersistence(auth,A.browserLocalPersistence);
  await auth.authStateReady();
  const ref=(collection,id)=>F.doc(db,collection,id);
  const metaRef=ref('meta','game');
  const activeQuery=F.query(F.collection(db,'emojins'),F.where('status','==','active'));
  const defaultMeta=()=>({battleSeq:0,legendSeq:0,hour:Math.floor(Date.now()/3600000),runningHour:0,scheduledCount:0});
  const data=s=>s.exists()?s.data():null;
  const decodeLog=s=>JSON.parse(s.data().json);
  let reading=null, archiveCache=null, archiveAt=0;
  const activeDocs=()=>F.getDocsFromServer(activeQuery);
  // One live subscription per collection/doc; no full-world polling every minute.
  let watchers=null;
  const logCache=new Map();
  function startWatch() {
    if(watchers && watchers.uid===uid)return watchers.ready;
    if(watchers)watchers.stop.forEach(fn=>fn());
    const cache={uid,meta:null,owner:null,active:[],stop:[],seen:new Set()};
    watchers=cache;
    cache.ready=new Promise((resolve,reject)=>{
      function receive(kind,snapshot) {
        if(snapshot.metadata.fromCache)return;
        if(kind==='active')cache.active=snapshot.docs.map(s=>s.data());
        else cache[kind]=data(snapshot);
        cache.seen.add(kind);
        if(cache.seen.size===3)resolve();
      }
      function failed(error) {
        cache.stop.forEach(fn=>fn());
        if(watchers===cache)watchers=null;
        reject(error);
      }
      cache.stop.push(F.onSnapshot(metaRef,s=>receive('meta',s),failed));
      cache.stop.push(F.onSnapshot(ref('owners',uid),s=>receive('owner',s),failed));
      cache.stop.push(F.onSnapshot(activeQuery,s=>receive('active',s),failed));
    });
    return cache.ready;
  }

  let lastTouch=0, accessSnapshot=null;
  async function touchAccess() {
    if(lastTouch && Date.now()-lastTouch<300000)return null;
    const now=Date.now();
    const result=await F.runTransaction(db,async tx=>{
      const ownerRef=ref('owners',uid),ownerSnap=await tx.get(ownerRef);
      const old=data(ownerSnap);if(!old)return null;
      const metaSnap=await tx.get(metaRef),meta=data(metaSnap)||defaultMeta();
      const wasDormant=!!old.dormant || (meta.dormantOwnerUids||[]).includes(uid) || E.ownerPresence(old,now).dormant;
      const owner=E.ownerPresence(old,now,true);
      const dormant=(meta.dormantOwnerUids||[]).filter(id=>id!==uid);
      tx.update(ownerRef,{lastAccessAt:owner.lastAccessAt,suspendedAt:owner.suspendedAt,suspended:owner.suspended,dormant:false});
      // Only touch global metadata when waking; the usual heartbeat writes one owner doc.
      if(wasDormant)tx.set(metaRef,{...meta,dormantOwnerUids:dormant,revision:Number(meta.revision||0)+1});
      return {owner,wasDormant};
    });
    lastTouch=now;
    if(result){
      accessSnapshot=result.owner;
      if(result.wasDormant){local.revivalPending={uid};persist();}
    }
    return result;
  }

  function compose() {
    return {version:2, player:local.player || null, wallet:local.wallet, draft:local.draft || null,
      ...world,reducedMotion:localStorage.getItem('emojin.online.reducedMotion')==='true'};
  }
  if(auth.currentUser) {
    if(uid && uid!==auth.currentUser.uid) {local.wallet={balance:3500,updatedAt:Date.now()};local.draft=null;local.pending=[];}
    uid=auth.currentUser.uid;local.uid=uid;
    local.player ||= {uid,name:'',unreadBattleIds:[],seenBattleSeq:0,seenLegendSeq:0,tutorialSeen:true};
  } else {uid='';delete local.player;local.pending=[];}
  persist();
  writeOperation=async op=>{
    if(!auth.currentUser)throw Error('オーナーログインが必要です。');
    return F.runTransaction(db,async tx=>{
      // Read meta before all other transaction reads; every world change updates this doc.
      const metaSnap=await tx.get(metaRef),meta=data(metaSnap)||defaultMeta();
      if(op.action==='createEmojin') {
        const e=op.data.emojin,eRef=ref('emojins',e.id);
        const existing=await tx.get(eRef);
        if(existing.exists())return {ok:true,npcs:[]};
        tx.set(eRef,{...e,isNpc:false});
        tx.set(metaRef,{...meta,revision:Number(meta.revision||0)+1});
        return {ok:true,npcs:[]};
      }
      if(op.action!=='battle')throw Error('Unknown operation');
      const req=op.data.battleRequest,logRef=ref('battles',req.battleId);
      const existing=await tx.get(logRef);
      if(existing.exists())return {ok:true,seq:existing.data().seq,npcs:[]};
      const pairSnaps=await Promise.all(req.ids.map(id=>tx.get(ref('emojins',id))));
      const pair=pairSnaps.map(data);
      const version=e=>[e.currentHp,e.stars,e.status,e.poisoned,e.cursedSlots];
      if(pair.some((e,i)=>!e || e.status!=='active' || JSON.stringify(version(e))!==JSON.stringify(req.expected[i]))) {
        throw Error('別のバトルで状態が変わりました。画面を更新してください。');
      }
      const ownerIds=[...new Set(pair.filter(e=>!e.isNpc && e.ownerUid!=='npc').map(e=>e.ownerUid))];
      const ownerSnaps=await Promise.all(ownerIds.map(id=>tx.get(ref('owners',id))));
      const owners=Object.fromEntries(ownerIds.map((id,i)=>[id,data(ownerSnaps[i])]));
      const log=E.battle(pair[0],pair[1],E.seeded(req.seed),req.at);log.battleId=req.battleId;
      // Refresh the active pool on every transaction attempt. Metadata conflicts serialize create/battle writes.
      const freshPool=(await activeDocs()).docs.map(s=>s.data());
      const plan=E.planBattle(freshPool,owners,meta,log);
      plan.emojins.forEach(e=>tx.set(ref('emojins',e.id),e));
      tx.set(logRef,{seq:plan.log.seq,ownerUids:plan.log.ownerUids,json:JSON.stringify(plan.log)});
      Object.entries(plan.owners).forEach(([id,owner])=>tx.update(ref('owners',id),{unreadBattleIds:owner.unreadBattleIds,suspended:owner.suspended,suspendedAt:owner.suspendedAt,lastAccessAt:owner.lastAccessAt,dormant:owner.dormant}));
      plan.legends.forEach(l=>tx.set(ref('legends',String(l.seq)),{seq:l.seq,json:JSON.stringify(l)}));
      tx.set(metaRef,{...plan.meta,revision:Number(meta.revision||0)+1});
      return {ok:true,seq:plan.log.seq,log:plan.log,npcs:plan.npcs,legends:plan.legends};
    });
  };
  // Pending operations keep their IDs, so retrying a completed write cannot duplicate it.
  let retryWrites=null;
  function resumeWrites() {
    if(!local.pending.length || retryWrites)return;
    retryWrites=(async()=>{
      for(let n=0;local.pending.length;n++) {
        try{await flush();}catch(error){if(!transient(error)){console.warn(error);break;}await pause(Math.min(3000*2**n,30000));}
      }
    })().finally(()=>{retryWrites=null;});
  }
  resumeWrites();
  async function credentials(name,password) {
    const key=String(name).normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('ja');
    return {email:(await hashText(key))+'@owners.emojin.invalid',password:await hashText(password)};
  }
  async function installOwner(name,credential,registering) {
    const user=credential.user;
    if(uid && uid!==user.uid){local.wallet={balance:3500,updatedAt:Date.now()};local.draft=null;local.pending=[];}
    if(uid!==user.uid){lastTouch=0;accessSnapshot=null;delete local.revivalPending;}
    uid=user.uid;local.uid=uid;
    const owner=await retry(()=>F.runTransaction(db,async tx=>{
      const ownerRef=ref('owners',uid),snap=await tx.get(ownerRef);
      if(snap.exists())return snap.data();
      if(!registering)throw Error('オーナー情報がありません。登録から同じ名前とパスワードで再試行してください。');
      const metaSnap=await tx.get(metaRef),meta=data(metaSnap)||defaultMeta();
      const value={uid,name,createdAt:Date.now(),unreadBattleIds:[],suspended:false,suspendedAt:0,dormant:false,lastAccessAt:Date.now(),
        tutorialSeen:false,seenBattleSeq:meta.battleSeq||0,seenLegendSeq:meta.legendSeq||0};
      tx.set(ownerRef,value);return value;
    }));
    local.player=owner;persist();return {uid,name:owner.name};
  }
  return {
    get revivalPending(){return !!local.revivalPending && local.revivalPending.uid===uid;},
    completeRevival(){delete local.revivalPending;persist();},
    get canReload(){return !local.pending.length && !flushing;},
    get uid(){return uid;},get player(){return local.player||null;},get wallet(){return local.wallet;},
    setWallet(value){local.wallet=value;persist();},
    spend(cost){local.wallet=E.accrueMoji(local.wallet,Date.now());if(local.wallet.balance<cost)throw Error(`${cost}モジ必要です。`);local.wallet.balance-=cost;persist();},
    async getState(){
      if(reading)return reading;
      if(!auth.currentUser)return compose();
      reading=retry(async()=>{
        const access=await touchAccess();
        await startWatch();
        let owner=watchers.owner;
        if(access?.owner)owner=access.owner;
        // A delayed pre-access snapshot must not re-hide this owner's residents.
        if(owner && accessSnapshot && Number(owner.lastAccessAt||0)<accessSnapshot.lastAccessAt) {
          owner={...owner,lastAccessAt:accessSnapshot.lastAccessAt,suspendedAt:accessSnapshot.suspendedAt,dormant:false};
        }
        if(!owner){delete local.player;persist();return compose();}
        // Clone watcher data: local replay acknowledgements must never mutate snapshots.
        local.player=E.clone(owner);persist();
        const meta=watchers.meta||defaultMeta(),live=E.clone(watchers.active);
        const pendingIds=owner.unreadBattleIds||[];
        await Promise.all(pendingIds.filter(id=>!logCache.has(id)).map(async id=>{
          const snap=await F.getDocFromServer(ref('battles',id));
          if(snap.exists())logCache.set(id,decodeLog(snap));
        }));
        let legends=world.legends.filter(l=>l.seq>(owner.seenLegendSeq||0));
        if(Number(meta.legendSeq||0)>(world.nextLegendSeq||1)-1) {
          const snap=await F.getDocsFromServer(F.query(F.collection(db,'legends'),F.where('seq','>',owner.seenLegendSeq||0),F.orderBy('seq'),F.limit(200)));
          legends=snap.docs.map(decodeLog);
        }
        world={emojins:live,battles:pendingIds.filter(id=>logCache.has(id)).map(id=>logCache.get(id)),
          legends,nextSeq:Number(meta.battleSeq||0)+1,nextLegendSeq:Number(meta.legendSeq||0)+1,
          suspendedOwnerUids:meta.suspendedOwnerUids||[],
          dormantOwnerUids:(meta.dormantOwnerUids||[]).filter(id=>id!==uid)};
        resumeWrites();return compose();
      },true).finally(()=>{reading=null;});
      return reading;
    },
    async getArchive(){
      if(archiveCache && Date.now()-archiveAt<30000)return archiveCache;
      const [dead,legends]=await retry(()=>Promise.all([
        F.getDocsFromServer(F.query(F.collection(db,'emojins'),F.where('status','==','dead'),F.where('isNpc','==',false),F.orderBy('endedAt','desc'),F.limit(200))),
        F.getDocsFromServer(F.query(F.collection(db,'emojins'),F.where('status','==','legend'),F.orderBy('endedAt','desc'),F.limit(200)))
      ]));
      archiveCache=[...dead.docs,...legends.docs].map(s=>s.data());archiveAt=Date.now();return archiveCache;
    },
    async createOwner({name,password}){
      try{
        const creds=await credentials(name,password);
        let credential;
        try{credential=await retry(()=>A.createUserWithEmailAndPassword(auth,creds.email,creds.password));}
        catch(error){if(error.code!=='auth/email-already-in-use')throw error;
          try{credential=await retry(()=>A.signInWithEmailAndPassword(auth,creds.email,creds.password));}
          catch(error){if(transient(error))throw error;throw Object.assign(Error('このオーナー名は使われています。'),{code:'auth/email-already-in-use'});}
          const existing=await retry(()=>F.getDocFromServer(ref('owners',credential.user.uid)));
          if(existing.exists())throw Object.assign(Error('このオーナー名は使われています。ログインしてください。'),{code:'owner-name-taken'});
        }
        return await installOwner(name,credential,true);
      }catch(error){throw authError(error);}
    },
    async loginOwner({name,password}){
      try{const creds=await credentials(name,password);
        return await installOwner(name,await retry(()=>A.signInWithEmailAndPassword(auth,creds.email,creds.password)),false);
      }catch(error){throw authError(error);}
    },
    async markTutorialSeen(){
      await retry(()=>F.updateDoc(ref('owners',uid),{tutorialSeen:true}));local.player.tutorialSeen=true;persist();
    },
    async markSeen({battleSeq,legendSeq,battleIds=[]}){
      await flush();
      const owner=await retry(()=>F.runTransaction(db,async tx=>{
        const ownerRef=ref('owners',uid),snap=await tx.get(ownerRef),p=data(snap);
        const metaSnap=await tx.get(metaRef),meta=data(metaSnap)||defaultMeta();
        if(!p)throw Error('オーナー情報がありません。');
        const ids=(p.unreadBattleIds||[]).filter(id=>!battleIds.includes(id));
        const value={...E.ownerPresence({...p,unreadBattleIds:ids},Date.now(),true),
          seenBattleSeq:Math.max(p.seenBattleSeq||0,battleSeq||0),seenLegendSeq:Math.max(p.seenLegendSeq||0,legendSeq||0)};
        const suspended=new Set(meta.suspendedOwnerUids||[]);
        if(value.suspended)suspended.add(uid);else suspended.delete(uid);
        tx.set(metaRef,{...meta,suspendedOwnerUids:[...suspended],dormantOwnerUids:(meta.dormantOwnerUids||[]).filter(id=>id!==uid),revision:Number(meta.revision||0)+1});
        tx.update(ownerRef,{unreadBattleIds:value.unreadBattleIds,suspended:value.suspended,suspendedAt:value.suspendedAt,lastAccessAt:value.lastAccessAt,dormant:false,
          seenBattleSeq:value.seenBattleSeq,seenLegendSeq:value.seenLegendSeq});return value;
      }));
      Object.assign(local.player,owner);persist();
      world.suspendedOwnerUids=world.suspendedOwnerUids.filter(id=>id!==uid);
      if(owner.suspended)world.suspendedOwnerUids.push(uid);
      return owner;
    },
    startDraft(){if(!local.draft){this.spend(1200);local.draft=E.createDraft(Math.random,Date.now());persist();}return {draft:local.draft,wallet:local.wallet};},
    chooseSpecial({name,chosen}){
      if(!local.draft?.offers.includes(chosen))throw Error('特殊能力を選び直してください。');
      local.draft={...local.draft,name,chosen,stage:'reels'};persist();
      const e={...E.fromDraft(local.draft,name,local.player.name,chosen,Date.now()),ownerUid:uid,isNpc:false};
      enqueue('createEmojin',{uid,emojin:e},'create-'+e.id).catch(error=>{console.warn(error);resumeWrites();});
      return local.draft;
    },
    async finishDraft({draftId}){
      if(local.draft?.id!==draftId)throw Error('生成内容がありません。');
      const d=local.draft,e={...E.fromDraft(d,d.name,local.player.name,d.chosen,Date.now()),ownerUid:uid,isNpc:false};
      await flush();local.draft=null;persist();archiveAt=0;return e;
    },
    saveBattle(request){archiveAt=0;return enqueue('battle',{uid,battleRequest:request},'battle-'+request.battleId);}
  };
}

createCloud().then(cloud=>{
  window.EmojinCloud=cloud;
/* Emojin online UI: shared Firestore world, local wallet and animations. */
(function () {
"use strict";
const E = window.EmojinEngine;
const $ = id => document.getElementById(id);
const cloud = window.EmojinCloud;
const HOUR = 3600000;
const MOJI_CAP = 3000, EGG_COST = 1200, BATTLE_COST = 100;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("ja", {granularity:"grapheme"}) : null;
const chars = s => segmenter ? [...segmenter.segment(s)].map(v => v.segment) : Array.from(s);
const normalName = s => String(s).normalize("NFC").trim().replace(/\s+/g," ");
const nameKey = s => normalName(s).toLocaleLowerCase("ja");
const isReducedSystem = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let store, modalKind = null, modalReturn = null, toastTimer, busy = false, revealReady = false;
let playback = null, currentBattle = null, battleStates = null;
let replaySpeed = 1;

try {
  const saved = Number(localStorage.getItem("emojin.battleSpeed"));
  if ([1, 2, 4].includes(saved)) replaySpeed = saved;
} catch {}
let legendResolve = null, revealResolve = null, revealAutoTimer = null;
let wander = new Map(), canvasW = 0, canvasH = 0, worldFrame = 0, priorFrame = 0;
let saveWarning = false;
let oldFocus = null;
let modalRevision=0, modalClosing=false, modalOptions={}, popoverRevision=0, popoverClosing=false, popoverFocus=null;
const rng = Math.random;
const F = E.FACES;
const paletteStyle = getComputedStyle(document.documentElement);
const color = name => paletteStyle.getPropertyValue("--" + name).trim();
const PAL = Object.fromEntries(["bg","panel","panel-light","surface","text","muted","subtle","line","accent","rose","rose-light","special","poison","poison-dark","city-bg","city-road","city-block","city-block-alt","city-block-third","city-detail","city-line","city-pink","city-purple","neon-green","neon-sky","neon-pink","yellow"].map(name => [name,color(name)]));
// Reading time is independent of reduced-motion preferences.
const BATTLE_TIMING = Object.freeze({entrance:1500, beforeRoll:500, roll:1000, diceHold:1450, phaseGap:500, effect:1250, impactTravel:400, resultHold:1200});
let battleContinueResolve = null;
function advanceBattle() {
  if (!battleContinueResolve) return;
  const resolve = battleContinueResolve; battleContinueResolve = null;
  $("battleScreen").classList.remove("awaiting-next");
  $("battleNext").disabled = true; $("battleNext").classList.add("hidden");
  resolve();
}
async function waitForBattleContinue(last) {
  if (playback && playback.skip) throw new Error("SKIP");
  $("battleNext").setAttribute("aria-label", last ? "\u8857\u3078" : "\u6b21\u306e\u30d0\u30c8\u30eb");
  $("battleScreen").classList.add("awaiting-next");
  $("battleNext").classList.remove("hidden"); $("battleNext").disabled = false;
  await new Promise(resolve => { battleContinueResolve = resolve; });
  if (playback && playback.skip) throw new Error("SKIP");
}

function now() { return Date.now(); }
function dayKey(ts = now()) {
  const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(ts);
  const get = t => parts.find(p => p.type===t).value;
  return get("year")+"-"+get("month")+"-"+get("day");
}
function dateText(ts) {
  return new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",month:"numeric",day:"numeric"}).format(ts);
}
function reduced() {
  return false;
}
function updateMoji(timestamp=Date.now()) {
  if(!store?.player || !store.wallet)return 0;
  store.wallet=E.accrueMoji(store.wallet,timestamp);cloud.setWallet(store.wallet);
  return store.wallet.balance;
}
function save() {
  try{localStorage.setItem('emojin.online.reducedMotion',String(store.reducedMotion));}
  catch(error){console.warn('Preference could not be saved',error);}
}
async function syncWorld({play=false}={}) {
  if(busy||playback||modalKind||!$("tutorial").classList.contains("hidden"))return;
  const fresh=await cloud.getState();
  if(busy||playback||modalKind||!$("tutorial").classList.contains("hidden"))return;
  store=fresh;renderCity();refreshNav();
  await showRevival();
  if(play && store.player)await playUpdates();
}
function reportError(error) {
  console.error(error);
  toast(error.message || '通信に失敗しました。もう一度お試しください。',5000);
}
function active() { return store.emojins.filter(e=>e.status==="active" && !(store.dormantOwnerUids||[]).includes(e.ownerUid)); }
function battlePool() { return active().filter(e=>e.isNpc || !(store.suspendedOwnerUids||[]).includes(e.ownerUid)); }
function playerName() { return store.player ? store.player.name : ""; }
function my(e) { return e.ownerUid===cloud.uid; }
function findEmojin(id) { return store.emojins.find(e=>e.id===id); }
function toast(text, duration=2900) {
  clearTimeout(toastTimer);
  $("toast").textContent=text;$("toast").classList.remove("hidden");
  toastTimer=setTimeout(()=>$("toast").classList.add("hidden"),duration);
}
function animate(el, frames, duration=500, options={}) {
  if (!el || !el.animate) return null;
  return el.animate(frames,{duration:reduced()?1:duration,easing:"cubic-bezier(.18,.77,.22,1)",fill:"both",...options});
}
function delay(ms) { return new Promise(resolve=>setTimeout(resolve,reduced()?Math.min(ms,55):ms)); }
async function battleWait(ms) {
  const wait = ms / replaySpeed;
  const start=performance.now();
  while(performance.now()-start<wait) {
    if(playback && playback.skip) throw new Error("SKIP");
    await new Promise(resolve=>setTimeout(resolve,Math.min(35,wait)));
  }
  if(playback && playback.skip) throw new Error("SKIP");
}
function star(n, legend=false) {
  return `<span class="star-badge ${legend?"legend":""}" role="img" aria-label="${n}戦生存"><svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,6 62,35 94,38 69,59 77,91 50,74 23,91 31,59 6,38 38,35"></polygon><text x="50" y="61">${Number(n)}</text></svg></span>`;
}
const HEART_PATH = "M12 21S3 15.8 3 8.8C3 3.7 9.5 2.6 12 7c2.5-4.4 9-3.3 9 1.8 0 7-9 12.2-9 12.2z";
function heartSvg(className="heart filled") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true"><path d="${HEART_PATH}"/></svg>`;
}
function closeSvg() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg>'; }
function nextSvg() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>'; }
function hearts(e, cl="") {
  const hp=E.clamp(e.currentHp,0,e.maxHp);
  return `<div class="hearts ${cl}" role="img" aria-label="HP ${hp} / ${e.maxHp}">${Array.from({length:e.maxHp},(_,i)=>heartSvg(`heart ${i<hp?"filled":""}`)).join("")}</div>`;
}
function faceGlyph(face) {
  const f=F[face]||F.blank;
  return f.twin ? '<span class="twin-icon" aria-hidden="true"><span>🎲</span><span>🎲</span></span>' : f.icon;
}
function icon(face) {
  const f=F[face]||F.blank;
  return `<span class="slot-icon">${faceGlyph(face)}</span>${f.value?`<span class="slot-value">${f.value}</span>`:""}`;
}
function curseMark() { return `<span class="curse-small" aria-hidden="true">${F.curse.icon}</span>`; }
function slot(face, pos, cursed=false, click=true) {
  const f=F[face]||F.blank, tag=click?"button":"div";
  return `<${tag} class="slot ${f.special?"special":""} ${cursed?"cursed":""}" data-slot="${pos}" ${click?`type="button" data-face="${face}" aria-label="スロット${pos+1}：${esc(f.name)}${cursed?"、呪い":""}"`:""}>${icon(face)}${cursed?curseMark():""}</${tag}>`;
}
// Presentation order only. Original indices always identify curse/roll targets.
function displaySlots(e) {
  return e.slots.map((face,i)=>({face,i})).sort((a,b)=>Number(!!F[b.face].special)-Number(!!F[a.face].special));
}
function slotRow(e, clickable=true) {
  return displaySlots(e).map(({face,i})=>slot(face,i,e.cursedSlots.includes(i),clickable)).join("");
}
function statusMarks(e) {
  return `${e.poisoned?'<span class="poison-cluster" aria-hidden="true"><i></i><i></i><i></i><i></i></span>':""}${e.cursedSlots.length?`<span class="curse-token" aria-hidden="true">${F.curse.icon}</span>`:""}`;
}
function emojiVisual(e) {
  return `<div class="emoji-visual ${e.poisoned?"poisoned":""} ${e.cursedSlots.length?"cursed":""}"><span class="emoji-glyph">${e.emoji}</span><span class="status-marks">${statusMarks(e)}</span></div>`;
}
async function hideLayer(host, panel=null) {
  if(!host || host.classList.contains("hidden"))return;
  const node=panel||host;
  const anim=animate(node,[{opacity:1,transform:"scale(1) translateY(0)"},{opacity:0,transform:"scale(.94) translateY(18px)"}],260);
  const backdrop=panel&&host.querySelector(".modal-backdrop");
  const fade=backdrop&&animate(backdrop,[{opacity:1},{opacity:0}],240);
  await Promise.all([anim,fade].filter(Boolean).map(x=>x.finished.catch(()=>{})));
}

function openModal(html, kind, {closable=true,panelClass="",focus=null,tapToClose=false,hideClose=false}={}) {
  closePopover(true);
  if(modalKind===null)oldFocus=document.activeElement;
  modalRevision++;modalClosing=false;modalOptions={closable,tapToClose};modalKind=kind;
  const host=$("modalHost");host.classList.remove("is-closing");
  host.innerHTML=`<div class="modal-backdrop" ${closable?'data-close-modal="true"':""}></div><section class="modal-panel ${panelClass}" tabindex="-1" role="dialog" aria-modal="true" aria-label="${esc(kind)}">${closable&&!tapToClose&&!hideClose?`<button class="modal-close" data-close-modal="true" aria-label="閉じる">${closeSvg()}</button>`:""}${html}</section>`;
  host.classList.remove("hidden");
  animate(host.querySelector(".modal-backdrop"),[{opacity:0},{opacity:1}],260);
  animate(host.querySelector(".modal-panel"),[
    {transform:"translateY(52px) scale(.76)",opacity:0},
    {transform:"translateY(-6px) scale(1.025)",opacity:1,offset:.72},
    {transform:"translateY(0) scale(1)",opacity:1}
  ],620);
  if(focus) {
    const rev=modalRevision;
    setTimeout(()=>{const el=$(focus);if(el&&rev===modalRevision)el.focus({preventScroll:true});},130);
  }else host.querySelector(".modal-close,.modal-panel").focus({preventScroll:true});
}
async function closeModal(force=false) {
  if((busy&&!force)||modalClosing||!modalKind)return;
  if(!force&&!modalOptions.closable)return;
  if(!$("detailHost").classList.contains("hidden"))await closeDetailOverlay(true);
  modalClosing=true;
  const rev=modalRevision,host=$("modalHost"),ret=modalReturn&&!force?modalReturn:null;
  host.classList.add("is-closing");
  await Promise.all([closePopover(),hideLayer(host,host.querySelector(".modal-panel"))]);
  if(rev!==modalRevision)return; // An opening modal must never be removed by an older close.
  modalClosing=false;modalReturn=null;modalKind=null;host.classList.remove("is-closing");
  host.classList.add("hidden");host.innerHTML="";
  if(ret){showArchive(ret.status,ret.filter);return;}
  if(oldFocus&&oldFocus.isConnected)oldFocus.focus({preventScroll:true});
}
async function closePopover(immediate=false) {
  const host=$("popoverHost");
  if(host.classList.contains("hidden"))return;
  if(immediate){popoverRevision++;popoverClosing=false;host.classList.add("hidden");host.innerHTML="";return;}
  if(popoverClosing)return;
  popoverClosing=true;const rev=popoverRevision;
  await hideLayer(host,host.querySelector(".slot-popover"));
  if(rev!==popoverRevision)return;
  host.classList.add("hidden");host.innerHTML="";popoverClosing=false;
  if(popoverFocus&&popoverFocus.isConnected)popoverFocus.focus({preventScroll:true});
}
function showFace(face,cursed=false) {
  const f=F[face];if(!f)return;
  popoverRevision++;popoverClosing=false;popoverFocus=document.activeElement;
  $("popoverHost").innerHTML=`<div class="modal-backdrop"></div><section class="slot-popover" tabindex="-1" role="dialog" aria-modal="true" aria-label="${esc(f.name)}">${f.special?'<span class="popover-special">✦</span>':""}<div class="popover-icon">${faceGlyph(face)}</div><h3 class="popover-title">${esc(f.name)}</h3><p class="popover-text">${esc(f.text)}</p>${cursed?'<div class="popover-curse">☠️ このスロットは呪い中。<br>出ると効果は無効になり、この呪いが消える。</div>':""}</section>`;
  $("popoverHost").classList.remove("hidden");
  animate($("popoverHost").querySelector(".modal-backdrop"),[{opacity:0},{opacity:1}],240);
  animate($("popoverHost").querySelector(".slot-popover"),[{transform:"scale(.6) rotate(-3deg)",opacity:0},{transform:"scale(1)",opacity:1}],450);
  $("popoverHost").querySelector(".slot-popover").focus({preventScroll:true});
}

let detailReturnFocus=null,detailClosing=false;
function openDetailOverlay(html) {
  closePopover(true);
  detailClosing=false;
  detailReturnFocus=document.activeElement;
  const host=$("detailHost");
  $("modalHost").inert=true;
  host.innerHTML=`<div class="modal-backdrop"></div><section class="modal-panel detail-panel" tabindex="-1" role="dialog" aria-modal="true" aria-label="エモジン">${html}</section>`;
  host.classList.remove("hidden");
  animate(host.querySelector(".modal-backdrop"),[{opacity:0},{opacity:1}],260);
  animate(host.querySelector(".modal-panel"),[{transform:"translateY(40px) scale(.88)",opacity:0},{transform:"translateY(0) scale(1)",opacity:1}],420);
  host.querySelector(".modal-panel").focus({preventScroll:true});
}
async function closeDetailOverlay(immediate=false) {
  const host=$("detailHost");if(host.classList.contains("hidden")||detailClosing)return;
  detailClosing=true;
  await closePopover(true);
  if(!immediate)await hideLayer(host,host.querySelector(".modal-panel"));
  host.classList.add("hidden");host.innerHTML="";
  $("modalHost").inert=false;
  if(!immediate&&detailReturnFocus?.isConnected)detailReturnFocus.focus({preventScroll:true});
  detailReturnFocus=null;detailClosing=false;
}
function showDetail(e, ret=null) {
  const tag=my(e)?"マイ エモジン":"";
  const when=e.status==="dead"?`🪦 ${dateText(e.endedAt)}`:e.status==="legend"?`🏆 ${dateText(e.endedAt)}`:"";
  const content=`<div class="detail-star">${star(e.stars,e.status==="legend")}</div>
    <h2 class="detail-name">${esc(e.name)}</h2><div class="my-tag">${tag}</div>
    ${emojiVisual(e)}<div class="hp-detail">${hearts(e)}</div>
    <div class="slots-row">${slotRow(e)}</div>
    <div class="owner-line detail-owner">オーナー：${esc(e.ownerName)}</div>
    ${when?`<div class="detail-date">${when}</div>`:""}`;
  if($("modalHost").querySelector(".archive-panel")){openDetailOverlay(content);return;}
  modalReturn=ret;
  openModal(content,"エモジン",{panelClass:"detail-panel",tapToClose:true});
}
async function showArchive(status="active") {
  if(busy)return;
  busy=true;
  openModal(`<div class="archive-loading"><div class="loader"></div></div>`,"エモジンを読み込み中",{panelClass:"archive-panel"});
  const loadingRevision=modalRevision;
  try {
    const archive=await cloud.getArchive();
    if(loadingRevision!==modalRevision)return;
    store.emojins=[...store.emojins.filter(e=>e.status==="active"),...archive];
  } catch(error) { reportError(error);await closeModal(true);return; }
  finally { busy=false; }
  modalReturn=null;
  const tabs=[{key:"active",name:"👤"},{key:"legend",name:"🏆"},{key:"dead",name:"🪦"}];
  const chosen=tabs.findIndex(t=>t.key===status),index=chosen<0?0:chosen;
  const panes=tabs.map(tab=>{
    const emojins=store.emojins.filter(e=>e.status===tab.key&&(tab.key!=="active"||my(e))&&(tab.key!=="dead"||!e.isNpc))
      .sort((a,b)=>tab.key==="active"?b.createdAt-a.createdAt:b.endedAt-a.endedAt);
    const entries=emojins.map(e=>`<button class="archive-entry" data-emojin-id="${e.id}" data-return-status="${tab.key}"><span class="archive-emoji">${e.emoji}</span><span><h3>${esc(e.name)}</h3><span class="owner-line">${tab.key==="active"?`HP ${e.currentHp} / ${e.maxHp}`:`オーナー：${esc(e.ownerName)}`}</span></span>${star(e.stars,tab.key==="legend")}<span class="archive-arrow">${nextSvg()}</span></button>`).join("");
    return `<div class="archive-pane" role="tabpanel" id="pane-${tab.key}"><div class="archive-list">${entries||'<div class="archive-empty">エモジンはいない</div>'}</div></div>`;
  }).join("");
  openModal(`<button class="archive-close" data-close-modal="true" aria-label="閲覧を閉じる">${closeSvg()}</button>
    <div class="archive-tabs" role="tablist">${tabs.map((t,i)=>`<button class="archive-tab ${i===index?"selected":""}" role="tab" tabindex="${i===index?0:-1}" aria-selected="${i===index}" aria-controls="pane-${t.key}" data-archive-tab="${t.key}">${t.name}</button>`).join("")}</div>
    <div class="archive-viewport"><div class="archive-track" style="transform:translateX(-${index*100}%)">${panes}</div></div>`,
    "エモジンを閲覧",{panelClass:"archive-panel",hideClose:true});
  switchArchiveTab($("modalHost").querySelector(".archive-panel"),tabs[index].key);
}

function switchArchiveTab(panel,key) {
  if(!panel)return;
  const keys=['active','legend','dead'],index=keys.indexOf(key);if(index<0)return;
  panel.dataset.activeTab=key;
  panel.querySelector('.archive-track').style.transform=`translateX(-${index*100}%)`;
  panel.querySelectorAll('.archive-tab').forEach(button=>{
    const selected=button.dataset.archiveTab===key;
    button.classList.toggle('selected',selected);button.setAttribute('aria-selected',String(selected));
    button.tabIndex=selected?0:-1;
  });
  panel.querySelectorAll('.archive-pane').forEach((pane,i)=>{
    pane.inert=i!==index;pane.setAttribute('aria-hidden',String(i!==index));
  });
}

function showAuthChoice(){
  openModal(`<div class="register-brand">エモジン</div>
    <div class="auth-actions"><button class="primary-button" id="authRegister" type="button">オーナー登録</button>
    <button class="primary-button auth-secondary" id="authLogin" type="button">オーナーログイン</button></div>`,
    "オーナー認証",{closable:false,panelClass:"register-panel"});
  $("authRegister").onclick=()=>showAuthForm('register');
  $("authLogin").onclick=()=>showAuthForm('login');
}
function showAuthLoading(){
  const screen=$("bootScreen");
  screen.getAnimations().forEach(animation=>animation.cancel());
  screen.style.opacity='1';
  screen.classList.remove('hidden');
}
function showAuthForm(mode){
  const registering=mode==='register';
  openModal(`<div class="register-brand">エモジン</div>
    <h2 class="auth-heading">${registering?'オーナー登録':'オーナーログイン'}</h2>
    <form id="authForm" class="auth-form">
      <input id="ownerNameInput" class="text-input" aria-label="オーナー名" autocomplete="username" autocapitalize="off" placeholder="オーナー名" maxlength="40" required>
      <input id="ownerPasswordInput" class="text-input" type="password" aria-label="パスワード" autocomplete="${registering?'new-password':'current-password'}" placeholder="パスワード" required>
      <div id="authError" class="input-error" role="alert"></div>
      <button class="primary-button" type="submit">${registering?'登録':'ログイン'}</button>
    </form><button class="auth-back" id="authBack" type="button">戻る</button>`,
    registering?'オーナー登録':'オーナーログイン',
    {closable:false,panelClass:'register-panel',focus:'#ownerNameInput'});
  $("authBack").onclick=showAuthChoice;
  $("authForm").addEventListener('submit',async ev=>{
    ev.preventDefault();
    const name=normalName($("ownerNameInput").value);
    const password=$("ownerPasswordInput").value;
    const errorLabel=$("authError");
    if(!name||chars(name).length>12){errorLabel.textContent='オーナー名は1〜12文字で入力してください。';return;}
    if(/[\u0000-\u001f\u007f]/.test(name)){errorLabel.textContent='このオーナー名は使えません。';return;}
    if(!password){errorLabel.textContent='パスワードを入力してください。';return;}
    errorLabel.textContent='';
    const button=$("authForm").querySelector('button[type="submit"]');button.disabled=true;
    showAuthLoading();
    try{
      if(registering)await cloud.createOwner({name,password});
      else await cloud.loginOwner({name,password});
      store=await cloud.getState();
      await closeModal(true);
      $("bootScreen").classList.add('hidden');
      renderCity();refreshNav();
      await showRevival();
      if(registering)showTutorial();
      else if(store.draft)beginGeneration();
      else playUpdates();
    }catch(error){
      $("bootScreen").classList.add('hidden');
      if(errorLabel.isConnected)errorLabel.textContent=error.message||'通信に失敗しました。';
      else reportError(error);
      button.disabled=false;
    }
  });
}

const tutorialSteps = [
  {
    target: '#cityScreen',
    lines: ['ここはエモジンランド']
  },
  {
    target: '#cityScreen',
    lines: [
      'のんびり暮らすエモジンたち。',
      'でも、バトルは命がけ。'
    ]
  },
  {
    target: '.mo-meter',
    lines: ['1分ごとに、1モジたまる。']
  },
  {
    target: '#generateButton',
    lines: [
      'たまったモジで',
      'マイエモジンを生み出そう。'
    ]
  },
  {
    target: '#cityScreen',
    lines: [
      '1時間に1回、',
      'バトルが自動で行われる。'
    ]
  },
  {
    target: '#cityScreen',
    lines: [
      '次にキミが訪れたとき、',
      '留守中のマイエモジンの',
      '戦いを観戦できる。'
    ]
  },
  {
    target: '#cityScreen',
    lines: [
      '未確認のバトルがたくさんたまると、',
      '確認するまで、バトルはお休み。'
    ]
  },
  {
    target: '#forceBattleButton',
    lines: [
      '100モジで、',
      'ランダムバトルを今すぐ開催。'
    ]
  },
  {
    target: '#cityScreen',
    lines: ['めざせ、エモジンマスター！']
  }
];

function showTutorial() {
  let index = 0;
  let finished = false;

  const host = $('tutorial');
  const bubble = $('tutorialBubble');
  const spotlight = $('tutorialSpotlight');

  host.classList.remove('hidden', 'no-target');
  bubble.style.cssText = '';
  bubble.classList.add('centered');

  const display = () => {
    const step = tutorialSteps[index];
    const target = document.querySelector(step.target);

    bubble.innerHTML = step.lines
      .map(line => `<span class="tutorial-line">${esc(line)}</span>`)
      .join('');

    host.classList.toggle(
      'whole-screen',
      step.target === '#cityScreen'
    );

    if (!target) {
      spotlight.classList.add('hidden');
      return;
    }

    const rect = target.getBoundingClientRect();
    const bounds = host.getBoundingClientRect();
    const pad = step.target === '#cityScreen' ? 0 : 6;

    const left = Math.max(bounds.left, rect.left - pad);
    const top = Math.max(bounds.top, rect.top - pad);
    const right = Math.min(bounds.right, rect.right + pad);
    const bottom = Math.min(bounds.bottom, rect.bottom + pad);

    Object.assign(spotlight.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${Math.max(0, right - left)}px`,
      height: `${Math.max(0, bottom - top)}px`
    });

    spotlight.classList.remove('hidden');
  };

  const reposition = () => display();

  const advance = async () => {
    if (finished) return;

    if (++index < tutorialSteps.length) {
      display();
      return;
    }

    finished = true;
    host.onclick = null;
    host.onkeydown = null;
    window.removeEventListener('resize', reposition);
    window.visualViewport?.removeEventListener('resize', reposition);

    host.classList.add('hidden');
    store.player.tutorialSeen = true;
    cloud.markTutorialSeen().catch(reportError);

    if (store.draft) beginGeneration();
    else playUpdates();
  };

  host.onclick = advance;
  host.onkeydown = event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      advance();
    }
  };

  window.addEventListener('resize', reposition);
  window.visualViewport?.addEventListener('resize', reposition);

  display();
  host.focus({ preventScroll: true });
}


function refreshNav() {
  const balance=updateMoji(), available=!!store.player && (!!store.draft||balance>=EGG_COST), btn=$("generateButton");
  btn.classList.toggle("available",available);
  btn.disabled=!available;
  btn.setAttribute("aria-label",store.draft?"エモジンの生成を続ける":`エモジンを生成、${EGG_COST}モジ`);
  btn.querySelector(".nav-cost").innerHTML =
  store.draft ? 'つづき' : `${EGG_COST} <small>モジ</small>`;
  $("forceBattleButton").disabled=!store.player||balance<BATTLE_COST||battlePool().length<2;
  $("moBalance").textContent=balance.toLocaleString("ja-JP");
  const height=38*Math.min(balance,MOJI_CAP)/MOJI_CAP;
  $("moFluid").setAttribute("y",String(45-height));$("moFluid").setAttribute("height",String(height));
  const unread=store.player?(store.player.unreadBattleIds||[]).length:0;
  const legends=store.player?store.legends.filter(l=>l.seq>store.player.seenLegendSeq).length:0;
  $("unreadButton").classList.toggle("hidden",!unread&&!legends);
  $("unreadButton").textContent=unread?`▶ ${unread}`:"🏆";
}
function renderCity() {
  const alive=active(), maxStars=Math.max(0,...alive.map(e=>e.stars)), old=new Map([...$("residents").children].map(el=>[el.dataset.id,el]));
  for(const e of alive) {
    let el=old.get(e.id);
    if(!el) {
      el=document.createElement("button");el.type="button";el.dataset.id=e.id;
      el.addEventListener("click",()=>{const current=findEmojin(e.id);if(current)showDetail(current);});
      $("residents").appendChild(el);
      animate(el,[{opacity:0,scale:".6"},{opacity:1,scale:"1"}],600);
    }
    const signature=JSON.stringify([e.emoji,e.name,e.stars,e.poisoned,e.cursedSlots,e.ownerName,playerName(),e.stars===maxStars]);
    if(el.dataset.signature!==signature) {
      el.dataset.signature=signature;el.className=`resident ${my(e)?"mine":""} ${e.poisoned?"poisoned":""} ${e.cursedSlots.length?"cursed":""}`;
      el.innerHTML=`<span class="resident-emoji">${e.emoji}</span><span class="status-marks">${statusMarks(e)}</span>${e.stars===maxStars?star(e.stars):""}<span class="resident-name">${esc(e.name)}</span>`;
      el.setAttribute("aria-label",`${e.name}、${e.stars}戦、オーナー ${e.ownerName}`);
      fitResidentName(el);
    }
    old.delete(e.id);
    if(!wander.has(e.id))wander.set(e.id,spawnPosition(e.id));
    positionResident(el,wander.get(e.id));
    if(cloud.revivalPending && my(e))el.style.opacity="0";
  }
  for(const [id,el] of old){el.remove();wander.delete(id);}
  $("emptyCity").classList.toggle("hidden",alive.length!==0);
  refreshNav();
}

/* Revival is separate from battle playback; OS motion preferences do not skip it. */
let revivalPlaying=false;
async function showRevival() {
  if(!cloud.revivalPending)return;
  const residents=[...$('residents').children].filter(el=>{
    const e=findEmojin(el.dataset.id);return e && my(e) && e.status==='active';
  }).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top);
  if(!residents.length){cloud.completeRevival();return;}
  const previousBusy=busy;busy=true;revivalPlaying=true;
  const overlay=document.createElement('div');overlay.className='revival-overlay';
  overlay.innerHTML='<div class="revival-message"><span>エモジンが再び</span><span>活動を始めた</span><i></i></div><div class="revival-particles"></div>';
  $('app').appendChild(overlay);
  const message=overlay.querySelector('.revival-message');
  const particlesHost=overlay.querySelector('.revival-particles');
  const timers=[],animations=[],particles=[],prepared=[];
  const run=(el,frames,options)=>{const animation=el.animate(frames,options);animations.push(animation);return animation;};
  // At most 3200ms of stagger even for owners with many residents.
  const stagger=residents.length>1?Math.min(320,3200/(residents.length-1)):0;
  function reveal(el) {
    el.style.opacity='1';
    const art=el.querySelector('.resident-emoji'),name=el.querySelector('.resident-name');
    run(art,[{opacity:0,transform:'translateY(20px) scale(.25)'},
      {opacity:1,transform:'translateY(-5px) scale(1.14)',offset:.68},
      {opacity:1,transform:'translateY(0) scale(1)'}],
      {duration:1000,easing:'cubic-bezier(.2,.7,.25,1)',fill:'both'});
    if(name)run(name,[{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:400,delay:500,fill:'both'});
    const r=art.getBoundingClientRect(),bounds=overlay.getBoundingClientRect();
    const x=r.left-bounds.left+r.width/2,y=r.top-bounds.top+r.height/2;
    const halo=document.createElement('i');halo.className='revival-halo';
    halo.style.left=x+'px';halo.style.top=y+'px';particlesHost.appendChild(halo);particles.push(halo);
    run(halo,[{transform:'translate(-50%,-50%) scale(.25)',opacity:0},{opacity:.55,offset:.25},
      {transform:'translate(-50%,-50%) scale(1.65)',opacity:0}],{duration:1200,fill:'both'});
    const count=residents.length>12?8:16;
    for(let i=0;i<count;i++){
      const particle=document.createElement('i');particle.className='revival-spark';
      particle.style.background=[PAL['neon-sky'],PAL['neon-green'],PAL['neon-pink']][i%3];
      particle.style.left=x+'px';particle.style.top=y+'px';particlesHost.appendChild(particle);particles.push(particle);
      const angle=Math.PI*2*i/count,distance=24+Math.random()*32;
      run(particle,[{transform:'translate(0,8px) scale(.3)',opacity:0},{opacity:.9,offset:.25},
        {transform:`translate(${Math.cos(angle)*distance}px,${Math.sin(angle)*distance-15}px) scale(.25)`,opacity:0}],
        {duration:1100,delay:Math.random()*120,fill:'both'});
    }
  }
  try {
    residents.forEach(el=>{
      // Cancel the normal entrance so it cannot override the revival opacity.
      el.getAnimations().forEach(a=>a.cancel());
      prepared.push([el,'']);el.style.opacity='0';
    });
    run(message,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:600,easing:'ease-out',fill:'forwards'});
    residents.forEach((el,i)=>timers.push(setTimeout(()=>reveal(el),700+i*stagger)));
    const hold=Math.max(3500,700+Math.max(0,residents.length-1)*stagger+1400);
    await new Promise(resolve=>setTimeout(resolve,hold));
    const fade=run(message,[{opacity:1},{opacity:0}],{duration:650,fill:'forwards'});
    await fade.finished.catch(()=>{});
    cloud.completeRevival();
  } finally {
    timers.forEach(clearTimeout);animations.forEach(a=>a.cancel());
    prepared.forEach(([el,opacity])=>{el.style.opacity=opacity;});
    particles.forEach(el=>el.remove());overlay.remove();busy=previousBusy;revivalPlaying=false;
    refreshNav();
  }
}

/* World artwork: hand-built rooftop blocks, alleys and neon infrastructure. */
const roadXs=[.13,.37,.65,.88],roadYs=[.17,.34,.52,.70,.85];
function worldBounds() {
  const w=canvasW||390,h=canvasH||844;
  return {xmin:44/w,xmax:1-44/w,ymin:Math.min(.22,95/h),ymax:Math.max(.45,1-152/h)};
}
function spawnPosition(id) {
  const w=canvasW||390,h=canvasH||844,b=worldBounds();
  let best={x:.5,y:.4},bestScore=-1;
  for(let n=0;n<110;n++){
    const x=b.xmin+rng()*(b.xmax-b.xmin),y=b.ymin+rng()*(b.ymax-b.ymin);
    let score=1e6;
    for(const q of wander.values())score=Math.min(score,Math.hypot((q.x-x)*w,(q.y-y)*h));
    if(score>bestScore){best={x,y};bestScore=score;}
    if(score>88&&wander.size)break;
  }
  const {x,y}=best;
  return {x,y,targetX:x,targetY:y,wait:performance.now()+6000+rng()*20000,moving:false,velocity:14+rng()*10};
}
function fitResidentName(el) {
  const label=el.querySelector('.resident-name');if(!label)return;
  label.style.fontSize='';
  const natural=label.offsetWidth,available=Math.max(40,(canvasW||390)-16);
  if(natural>available)label.style.fontSize=(parseFloat(getComputedStyle(label).fontSize)*available/natural)+'px';
  el.dataset.nameWidth=String(label.offsetWidth);
}
function positionResident(el,p) {
  el.style.left=(p.x*100)+'%';el.style.top=(p.y*100)+'%';
  const width=Number(el.dataset.nameWidth||0),w=canvasW||390,center=p.x*w;
  const shifted=E.clamp(center,width/2+8,w-width/2-8)-center;
  const label=el.querySelector('.resident-name');if(label)label.style.left=`calc(50% + ${shifted}px)`;
}
function nextTarget(p) {
  const b=worldBounds(),angle=rng()*Math.PI*2,distance=45+rng()*110;
  p.targetX=E.clamp(p.x+Math.cos(angle)*distance/(canvasW||390),b.xmin,b.xmax);
  p.targetY=E.clamp(p.y+Math.sin(angle)*distance/(canvasH||844),b.ymin,b.ymax);
  p.moving=true;
  p.travelStyle=["stroll","hop-walk","glide"][E.index(rng,3)];
  p.travelSpeed=p.velocity*(rng()<.2?1.8:1);
}

let traffic=[];
function drawCity() {
  const c=$("cityCanvas"),w=$("cityScreen").clientWidth,h=$("cityScreen").clientHeight;
  if(!w||!h)return;
  canvasW=w;canvasH=h;
  for(const el of $("residents").children)fitResidentName(el);
  const bounds=worldBounds();
  for(const p of wander.values()){
    p.x=E.clamp(p.x,bounds.xmin,bounds.xmax);p.y=E.clamp(p.y,bounds.ymin,bounds.ymax);
    p.targetX=E.clamp(p.targetX,bounds.xmin,bounds.xmax);p.targetY=E.clamp(p.targetY,bounds.ymin,bounds.ymax);
  }
  const dpr=Math.min(2,window.devicePixelRatio||1);
  c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);
  const r=E.seeded(20260926);
  traffic=Array.from({length:12},(_,i)=>({axis:i%2,pos:r(),lane:E.index(r,i%2?roadYs.length:roadXs.length),dir:i%3?-1:1,speed:.011+r()*.01,color:i%3===0?PAL["neon-green"]:i%3===1?PAL["neon-sky"]:PAL["neon-pink"]}));
  drawWorldFrame(performance.now());
}
function drawWorldFrame(time) {
  const c=$("cityCanvas"),ctx=c.getContext("2d");
  if(!c.width)return;
  const dpr=c.width/canvasW;
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(!reduced()){
    traffic.forEach(p=>{
      const pos=((p.pos+time*.000001*p.speed*70*p.dir)%1+1)%1;
      const x=p.axis?pos*canvasW:roadXs[p.lane]*canvasW+5;
      const y=p.axis?roadYs[p.lane]*canvasH+5:pos*canvasH;
      ctx.fillStyle=p.color;ctx.fillRect(x,y,p.axis?7:2,p.axis?2:7);
    });
  }
}
function worldLoop(time) {
  const dt=Math.min(.1,(time-priorFrame)/1000||0);priorFrame=time;
  const visible=!document.hidden&&!playback&&$("legendScreen").classList.contains("hidden")&&$("revealScreen").classList.contains("hidden");
  if(visible&&time-worldFrame>65){drawWorldFrame(time);worldFrame=time;}
  if(visible&&!modalKind&&!reduced()&&!revivalPlaying){
    let moving=[...wander.values()].filter(p=>p.moving).length;
    for(const el of $("residents").children){
      const p=wander.get(el.dataset.id);if(!p)continue;
      if(p.moving){
        el.classList.add(p.travelStyle||"stroll");
        const dx=p.targetX-p.x,dy=p.targetY-p.y,d=Math.hypot(dx*canvasW,dy*canvasH),step=(p.travelSpeed||p.velocity)*dt;
        if(d<=step){p.x=p.targetX;p.y=p.targetY;p.moving=false;p.wait=time+8000+rng()*25000;moving--;el.classList.remove("stroll","hop-walk","glide");}
        else{p.x+=dx/d*step;p.y+=dy/d*step;}
        positionResident(el,p);
      }else if(time>=p.wait&&moving<Math.max(2,Math.ceil(wander.size*.28))){
        p.wait=time+8000+rng()*25000;
        if(rng()<.4){
          const cl=["spin","wiggle","hop","nod","stretch","sway","float"][E.index(rng,7)];el.classList.add(cl);setTimeout(()=>el.classList.remove(cl),1550);
        }else{
          nextTarget(p);
          const occupied=[...wander.values()].some(q=>q!==p&&Math.hypot((q.x-p.targetX)*canvasW,(q.y-p.targetY)*canvasH)<60);
          if(occupied){p.moving=false;p.wait=time+3000+rng()*10000;}
          else moving++;
        }
      }
    }
  }
  requestAnimationFrame(worldLoop);
}

/* Daily generation: the draft is drawn once and persisted before animation.
   Reloading or closing the modal never re-rolls the day's offer. */
async function beginGeneration() {
  if(busy||playback)return;
  if(!store.player){showAuthChoice();return;}
  if(store.draft){
    if(store.draft.chosen){showReels(true);return;}
    if(store.draft.stage==="special"){showSpecial();return;}
    showName();return;
  }
  if(updateMoji()<EGG_COST){refreshNav();return;}
  busy=true;
  try{
    const result=cloud.startDraft();
    store.draft=result.draft;store.wallet=result.wallet;refreshNav();
  }catch(error){reportError(error);busy=false;return;}
  busy=false;
  await showReveal(store.draft.emoji);
  showName();
}
function finishReveal() {
  if(!revealReady || !revealResolve)return;
  revealReady=false;
  clearTimeout(revealAutoTimer);revealAutoTimer=null;
  const resolve=revealResolve;revealResolve=null;
  $("revealContinue").disabled=true;
  resolve();
}
async function showReveal(emoji) {
  busy=true;revealReady=false;clearTimeout(revealAutoTimer);
  const screen=$("revealScreen"),egg=$("revealEgg"),hero=$("revealEmoji");
  screen.getAnimations({subtree:true}).forEach(a=>a.cancel());
  screen.classList.remove("hidden","ready","revealed","celebrate");
  screen.dataset.hatch="wobbling";screen.dataset.wobble="0";
  hero.textContent=emoji;$("revealContinue").disabled=true;
  $("revealFx").innerHTML="";
  // Three distinct rocking beats, not an endless random shuffle.
  for(let n=0;n<3;n++) {
    screen.dataset.wobble=String(n+1);
    const angle=9+n*4;
    const rock=animate(egg,[
      {transform:"rotate(0deg) translateY(0)"},
      {transform:`rotate(${-angle}deg) translateY(-3px)`,offset:.22},
      {transform:`rotate(${angle}deg) translateY(-3px)`,offset:.5},
      {transform:`rotate(${-angle*.5}deg) translateY(-1px)`,offset:.76},
      {transform:"rotate(0deg) translateY(0)"}
    ],660,{easing:"ease-in-out"});
    if(rock)await rock.finished.catch(()=>{});else await delay(660);
    if(n<2)await delay(210);
  }
  screen.dataset.hatch="cracking";
  const crack=egg.querySelector(".egg-crack");
  animate(crack,[{opacity:0},{opacity:1}],180);
  animate(crack.querySelector("path"),[{strokeDashoffset:140},{strokeDashoffset:0}],240);
  await delay(260);
  screen.dataset.hatch="waiting";
  screen.classList.add("revealed","ready");
  animate(crack,[{opacity:1},{opacity:0}],300);
  animate(egg.querySelector(".egg-shell-top"),[
    {transform:"translate(0,0) rotate(0)",opacity:1},
    {transform:"translate(-36px,-65px) rotate(-24deg)",opacity:1,offset:.42},
    {transform:"translate(-98px,-148px) rotate(-58deg)",opacity:0}
  ],850);
  animate(egg.querySelector(".egg-shell-bottom"),[
    {transform:"translate(0,0) rotate(0)",opacity:1},
    {transform:"translate(38px,46px) rotate(19deg)",opacity:1,offset:.42},
    {transform:"translate(106px,144px) rotate(53deg)",opacity:0}
  ],850);
  animate(hero,[
    {transform:"scale(.68) rotate(-10deg)",opacity:1},
    {transform:"scale(1.26) rotate(6deg)",opacity:1,offset:.64},
    {transform:"scale(1) rotate(0)",opacity:1}
  ],800);
  const rect=screen.getBoundingClientRect();
  particles($("revealFx"),rect.width*.5,rect.height*.47,PAL["neon-sky"],22,210);
  const celebrate=setTimeout(()=>{
    screen.classList.add("celebrate");
    particles($("revealFx"),rect.width*.5,rect.height*.47,PAL["neon-pink"],18,180);
  },reduced()?30:320);
  // This timer starts when the emojin appears, not after its entrance animation.
  revealReady=true;$("revealContinue").disabled=false;
  await new Promise(resolve=>{
    revealResolve=resolve;
    revealAutoTimer=setTimeout(finishReveal,3000);
  });
  clearTimeout(celebrate);clearTimeout(revealAutoTimer);revealAutoTimer=null;
  screen.dataset.hatch="closing";
  const fade=animate(screen,[{opacity:1,transform:"scale(1)"},{opacity:0,transform:"scale(1.12)"}],330);
  if(fade)await fade.finished.catch(()=>{});else await delay(330);
  screen.classList.add("hidden");
  screen.getAnimations({subtree:true}).forEach(a=>a.cancel());
  $("revealFx").innerHTML="";busy=false;
}
function showName() {
  const d=store.draft;if(!d)return;
  busy=false;d.stage="name";save();
  openModal(`<div class="build-emoji">${d.emoji}</div>
  <form id="nameForm"><div class="field-wrap"><input id="emojinName" class="text-input" aria-label="エモジンの名前" placeholder="エモジンの名前" value="${esc(d.name||"")}" autocomplete="off" maxlength="40"><div class="input-meta"><span id="nameError" class="input-error"></span><span id="nameCount">${chars(d.name||"").length} / 8</span></div></div><button class="primary-button" type="submit" aria-label="つぎへ">${nextSvg()}</button></form>`,
  "エモジンを生成",{closable:false,panelClass:"build-panel",focus:"emojinName"});
  $("emojinName").focus({preventScroll:true});
  $("emojinName").addEventListener("input",()=>{
    $("nameCount").textContent=chars($("emojinName").value).length+" / 8";
    d.name=$("emojinName").value;save();
  });
  $("nameForm").addEventListener("submit",ev=>{
    ev.preventDefault();const name=normalName($("emojinName").value);
    if(!name||chars(name).length>8){$("nameError").textContent="1〜8文字で入力してください。";return;}
    if(/[\u0000-\u001f\u007f]/.test(name)){$("nameError").textContent="この文字は使えません。";return;}
    d.name=name;d.stage="special";save();showSpecial();
  });
}
const shortFaceText={
 poison:"次のバトルから、毒でじわじわ。",
 strong:"シンプルに、3ダメージ。",
 drain:"♡を最大2奪って、自分を回復。",
 ram:"相手に4。自分にも2。",
 twin:"もう2個振る。どちらも発動。",
 fullheal:"♡が一気に満タン。",
 curse:"相手の3スロットを呪う。"
};
function showSpecial() {
  busy=false;const d=store.draft;if(!d)return;
  d.stage="special";save();
  openModal(`<h2 class="build-title">${esc(d.name)}</h2><div class="build-emoji">${d.emoji}</div>
  <div class="offers">${d.offers.map(face=>`<button class="offer" data-offer="${face}"><span class="offer-icon">${faceGlyph(face)}</span><span class="offer-title">${esc(F[face].name)}</span><span class="offer-desc">${shortFaceText[face]}</span></button>`).join("")}</div>
  `,
  "特殊能力を選択",{closable:false,panelClass:"build-panel"});
  [...$("modalHost").querySelectorAll(".offer")].forEach((el,i)=>{
    animate(el,[{transform:`translateX(${i?100:-100}px) rotate(${i?12:-12}deg) scale(.7)`,opacity:0},{transform:"translateX(0) rotate(0) scale(1)",opacity:1}],650,{delay:110});
    el.addEventListener("click",async()=>{
      if(busy)return;busy=true;
      try {store.draft=cloud.chooseSpecial({name:d.name,chosen:el.dataset.offer});}
      catch(error){reportError(error);busy=false;return;}
      $("modalHost").querySelectorAll(".offer").forEach(other=>{
        other.disabled=true;
        animate(other,other===el?[{transform:"scale(1)",opacity:1},{transform:"scale(1.12)",opacity:1}]:[{transform:"scale(1)",opacity:1},{transform:"translateY(40px) scale(.6) rotate(12deg)",opacity:0}],330);
      });
      await delay(700);showReels();
    });
  });
}
async function showReels(resumed=false) {
  busy=true;const d=store.draft;if(!d||!d.chosen){busy=false;return;}
  openModal(`<h2 class="build-title">${esc(d.name)}</h2><div class="build-emoji" id="buildHero">${d.emoji}</div>
    <div class="slots-row build-reels" id="reelsRow">${slot(d.chosen,5,false,false)}${d.basicSlots.map((_,i)=>`<div class="slot rolling" data-reel="${i}" data-slot="${i}">${icon("blank")}</div>`).join("")}</div>
    <div class="build-hp" id="buildHp"></div>`,
    "サイコロを生成",{closable:false,panelClass:"build-panel"});
  const reels=[...$("reelsRow").querySelectorAll("[data-reel]")];
  const start=performance.now(),locked=new Set(),total=reduced()?80:6400;
  while(performance.now()-start<total){
    const elapsed=performance.now()-start;
    reels.forEach((el,i)=>{
      const stop=reduced()?i*10:1900+i*840;
      if(elapsed>=stop){
        if(!locked.has(i)){
          el.innerHTML=icon(d.basicSlots[i]);el.classList.remove("rolling");locked.add(i);
          animate(el,[{transform:"translateY(-10px) scale(1.22)"},{transform:"translateY(2px) scale(.96)",offset:.7},{transform:"translateY(0) scale(1)"}],300);
        }
      }else el.innerHTML=icon(E.BASIC[E.index(rng,E.BASIC.length)].id);
    });
    await delay(70);
  }
  reels.forEach((el,i)=>{el.innerHTML=icon(d.basicSlots[i]);el.classList.remove("rolling");});
  $("buildHp").innerHTML='<div class="hearts" role="img" aria-label="HP"></div>';
  const hpRow=$("buildHp").firstElementChild;
  for(let n=1;n<=d.maxHp;n++){
    const temp=document.createElement("div");temp.innerHTML=hearts({currentHp:1,maxHp:1});
    const heart=temp.querySelector(".heart");hpRow.appendChild(heart);
    hpRow.setAttribute("aria-label",`HP ${n}`);
    animate(heart,[{transform:"translateY(12px) scale(.25)",opacity:0},{transform:"translateY(-5px) scale(1.25)",opacity:1,offset:.65},{transform:"translateY(0) scale(1)",opacity:1}],340);
    await delay(260);
  }

  let e;
  try {e=await cloud.finishDraft({draftId:d.id});store.emojins.push(e);store.draft=null;}
  catch(error){reportError(error);busy=false;return;}
  busy=false;renderCity();showDetail(e);
}

async function showBattleCutin(loading=Promise.resolve()) {
  const host=$("battleCutin"),icon=host.querySelector(".cutin-icon"),ring=host.querySelector(".cutin-ring");
  host.classList.remove("hidden");
  animate(host,[{opacity:0},{opacity:1,offset:.18},{opacity:1,offset:.78},{opacity:0}],500,{easing:"linear"});
  animate(icon,[
    {transform:"scale(.35) rotate(-28deg)",opacity:0},
    {transform:"scale(1.25) rotate(9deg)",opacity:1,offset:.38},
    {transform:"scale(1) rotate(0deg)",opacity:1,offset:.7},
    {transform:"scale(1.08) rotate(0deg)",opacity:0}
  ],500);
  animate(ring,[{transform:"scale(.35)",opacity:0},{transform:"scale(1)",opacity:.85,offset:.45},{transform:"scale(1.35)",opacity:0}],500);
  const pulse=setTimeout(()=>{
    host.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
    animate(icon,[{transform:"scale(.96)",opacity:.8},{transform:"scale(1.12)",opacity:1}],700,{direction:"alternate",iterations:Infinity});
  },500);
  try {
    const [,result]=await Promise.all([new Promise(resolve=>setTimeout(resolve,500)),loading]);
    return result;
  } finally {
    clearTimeout(pulse);
    host.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
    host.classList.add("hidden");
  }
}
async function forceBattle() {
  if(busy||playback||!store.player)return;
  busy=true;
  let battleId;
  try {
    if(battlePool().length<2||updateMoji()<BATTLE_COST){refreshNav();return;}
    const fresh=await showBattleCutin(cloud.getState());
    store=fresh;renderCity();refreshNav();
    if(battlePool().length<2){toast('バトルに参加できるエモジンが2体必要です。');return;}
    if(updateMoji()<BATTLE_COST){toast('100モジ必要です。');return;}
    const pair=E.sample(battlePool(),2,Math.random);
    const seed=crypto.getRandomValues(new Uint32Array(1))[0];
    const at=Date.now();
    const log=E.battle(pair[0],pair[1],E.seeded(seed),at);
    const request={battleId:log.battleId,ids:pair.map(e=>e.id),seed,at,
      expected:log.before.map(e=>[e.currentHp,e.stars,e.status,e.poisoned,e.cursedSlots])};
    cloud.spend(BATTLE_COST);
    store.wallet=cloud.wallet;
    battleId=log.battleId;
    log.seq=store.nextSeq++;
    store.battles.push(log);
    const updates=new Map(log.after.map(e=>[e.id,e]));
    store.emojins=store.emojins.map(e=>updates.get(e.id)||e);
    for(const id of log.legendIds){
      const emojin=log.after.find(e=>e.id===id);
      store.legends.push({seq:store.nextLegendSeq++,battleSeq:log.seq,at:log.battleAt,emojin});
    }
    cloud.saveBattle(request).then(result=>{
      if(result.log){Object.assign(log,result.log);store.nextSeq=Math.max(store.nextSeq,result.seq+1);}
      for(const saved of result.legends||[]){
        const shown=store.legends.find(l=>l.emojin.id===saved.emojin.id);
        if(shown)Object.assign(shown,saved);else store.legends.push(saved);
        store.nextLegendSeq=Math.max(store.nextLegendSeq,saved.seq+1);
      }
      const known=new Set(store.emojins.map(e=>e.id));
      store.emojins.push(...(result.npcs||[]).filter(e=>!known.has(e.id)));
      renderCity();
    }).catch(reportError); // Runs while the battle is replayed.
  } catch(error){reportError(error);}
  finally {busy=false;refreshNav();}
  if(battleId)await playUpdates([battleId]);
}

/* Replay renderer. Animations only read the saved event stream. */
let visualMap=[0,1];
let deferredCurses = [new Set(), new Set()];
const fighterEl = side=>$("fighter"+visualMap[side]);
const infoEl = side=>$("info"+visualMap[side]);
const dieEl = side=>$("die"+visualMap[side]);
function localPoint(side) {
  const a=fighterEl(side).getBoundingClientRect(),b=$("battleFx").getBoundingClientRect();
  return {x:a.left-b.left+a.width*.5,y:a.top-b.top+a.height*.46};
}
function particles(host,x,y,color=PAL["accent"],count=22,spread=100) {
  if(!host||reduced())return;
  count=Math.min(40,count);
  for(let i=0;i<count;i++){
    const p=document.createElement("i");p.className="fx-particle";
    p.style.left=x+"px";p.style.top=y+"px";p.style.background=color;p.style.color=color;
    const angle=rng()*Math.PI*2,dist=spread*(.35+rng()*.65);
    host.appendChild(p);
    const a=animate(p,[
      {transform:"translate(0,0) scale(1.8)",opacity:1},
      {transform:`translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px) rotate(${rng()*300}deg) scale(.1)`,opacity:0}
    ],650+rng()*550,{easing:"cubic-bezier(.12,.65,.25,1)"});
    if(a)a.finished.then(()=>p.remove()).catch(()=>p.remove());else p.remove();
  }
}
function trail(source,target,color=PAL["accent"],reverse=false) {
  if(reduced())return;
  const a=localPoint(source),b=localPoint(target),dx=b.x-a.x,dy=b.y-a.y;
  const el=document.createElement("div");el.className="fx-trail";el.style.color=color;
  el.style.left=a.x+"px";el.style.top=a.y+"px";el.style.width=Math.hypot(dx,dy)+"px";
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  $("battleFx").appendChild(el);
  const ani=animate(el,[
    {transform:`rotate(${angle}deg) scaleX(0)`,opacity:0},
    {transform:`rotate(${angle}deg) scaleX(1)`,opacity:1,offset:.45},
    {transform:`rotate(${angle}deg) scaleX(1.05)`,opacity:0}
  ],540/replaySpeed,{easing:"cubic-bezier(.18,.7,.3,1)"});
  if(ani)ani.finished.then(()=>el.remove()).catch(()=>el.remove());
}
function heartGlyph() { return heartSvg("fx-heart"); }
function floatHearts(side, delta, color=PAL["neon-pink"], offsetY=0) {
  const count=Math.abs(Math.round(delta));if(!count)return;
  const point=localPoint(side),host=$("battleFx"),el=document.createElement("div");
  const limit=Math.min(252,host.clientWidth-24),size=Math.min(27,(limit-34)/count-3),width=30+count*(size+3);
  el.className="fx-heart-row";el.dataset.delta=String(delta);
  el.style.width=width+"px";el.style.setProperty("--heart-size",size+"px");
  el.innerHTML=`<span class="fx-sign">${delta>0?"+":"−"}</span>${Array.from({length:count},heartGlyph).join("")}`;
  el.style.left=E.clamp(point.x-width/2,12,host.clientWidth-width-12)+"px";
  const baseTop=E.clamp(point.y-77+offsetY,72,Math.max(72,host.clientHeight-150));
  const bounds=host.getBoundingClientRect(),left=parseFloat(el.style.left);
  const tiles=[...$('battleScreen').querySelectorAll('.dice-tile')].map(tile=>{
    const r=tile.getBoundingClientRect();return {left:r.left-bounds.left,right:r.right-bounds.left,top:r.top-bounds.top,bottom:r.bottom-bounds.top};
  });
  // Keep the floating heart row clear of the dice throughout its upward travel.
  const candidates=[baseTop,baseTop-75,baseTop+75,...tiles.flatMap(r=>[r.top-45,r.bottom+44])];
  const top=candidates.find(y=>y>=72 && y<=host.clientHeight-150 && !tiles.some(r=>
    left+width>r.left-8 && left<r.right+8 && y+36>r.top-8 && y-32<r.bottom+8));
  el.style.top=(top??baseTop)+'px';el.style.color=color;
  host.appendChild(el);
  const duration=1000/replaySpeed;
  if(reduced()){setTimeout(()=>el.remove(),duration);return;}
  const animation=animate(el,[
    {transform:"translateY(7px) scale(.86)",opacity:0},
    {transform:"translateY(0) scale(1.08)",opacity:1,offset:.12},
    {transform:"translateY(-4px) scale(1)",opacity:1,offset:.3},
    {transform:"translateY(-13px) scale(1)",opacity:1,offset:.77},
    {transform:"translateY(-30px) scale(.96)",opacity:0}
  ],duration,{easing:"linear"});
  if(animation)animation.finished.then(()=>el.remove()).catch(()=>el.remove());
  else setTimeout(()=>el.remove(),duration);
}
function battleEffectArea(side) {
  const host=$("battleFx"),key=String(visualMap[side]);
  let area=host.querySelector(`[data-effect-side="${key}"]`);
  if(!area){area=document.createElement('div');area.className='battle-effect-area';area.dataset.effectSide=key;host.appendChild(area);}
  const r=fighterEl(side).getBoundingClientRect(),b=host.getBoundingClientRect();
  Object.assign(area.style,{left:(r.left-b.left)+'px',top:(r.top-b.top)+'px',width:r.width+'px',height:r.height+'px'});
  return area;
}
function healLight(side) {
  const host=battleEffectArea(side),el=document.createElement("div");
  el.className="fx-heal-light";host.appendChild(el);
  if(reduced()){el.style.opacity=".22";setTimeout(()=>el.remove(),1000/replaySpeed);return;}
  const anim=animate(el,[{opacity:0},{opacity:.2,offset:.3},{opacity:.11,offset:.65},{opacity:0}],1250/replaySpeed,{easing:"ease-in-out"});
  if(anim)anim.finished.then(()=>el.remove()).catch(()=>el.remove());
  else el.remove();
}
function flyEffect(source,target,{kind="curse",count=1}={}) {
  const from=localPoint(source),to=localPoint(target);
  for(let i=0;i<count;i++){
    const el=document.createElement("span");el.className=kind==="heart"?"fx-transfer-heart":"fx-flying-icon";
    el.innerHTML=kind==="heart"?heartGlyph():F.curse.icon;
    el.style.left=(from.x-19)+"px";el.style.top=(from.y-19)+"px";
    $("battleFx").appendChild(el);
    const dx=to.x-from.x,dy=to.y-from.y,bend=kind==="heart"?(i?34:-30):0;
    if(reduced()){
      el.style.left=(to.x-19)+"px";el.style.top=(to.y-19)+"px";
      setTimeout(()=>el.remove(),800/replaySpeed);continue;
    }
    const anim=animate(el,[
      {transform:"translate(0,0) scale(.55)",opacity:0},
      {transform:`translate(${dx*.12}px,${dy*.12-12}px) scale(1.1)`,opacity:1,offset:.16},
      {transform:`translate(${dx*.5+bend}px,${dy*.5-25}px) scale(1.05)`,opacity:1,offset:.5},
      {transform:`translate(${dx}px,${dy}px) scale(.85)`,opacity:1,offset:.89},
      {transform:`translate(${dx}px,${dy}px) scale(.5)`,opacity:0}
    ],920/replaySpeed,{delay:i*110/replaySpeed,easing:"linear"});
    if(anim)anim.finished.then(()=>el.remove()).catch(()=>el.remove());
    else el.remove();
  }
}

function hit(side,strong=false) {
  const el=fighterEl(side).querySelector(".fighter-art");
  animate(el,[{transform:"translateX(0)"},{transform:`translateX(${strong?-18:-10}px) rotate(-9deg)`,offset:.2},{transform:"translateX(12px) rotate(6deg)",offset:.43},{transform:"translateX(-5px)",offset:.7},{transform:"translateX(0) rotate(0)"}],500/replaySpeed);
}
function defenseReaction(side, kind, amount=null) {
  focusBattleSlots(side,[kind]);
  const host=battleEffectArea(side);
  host.querySelectorAll(".fx-reaction,.fx-shield").forEach(el=>el.remove());
  const el=document.createElement("div");el.className="fx-reaction "+kind;
  el.dataset.reaction=kind;
  el.innerHTML=`<span class="fx-reaction-icon">${kind==="guard"?F.guard.icon:F.counter.icon}</span>`;
  host.appendChild(el);
  if(reduced()){setTimeout(()=>el.remove(),1350/replaySpeed);return;}
  const a=animate(el,[
    {transform:"translate(-50%,-50%) scale(.5)",opacity:0},
    {transform:"translate(-50%,-50%) scale(1.08)",opacity:1,offset:.2},
    {transform:"translate(-50%,-50%) scale(1)",opacity:1,offset:.82},
    {transform:"translate(-50%,-50%) scale(.92)",opacity:0}
  ],1350/replaySpeed,{easing:"linear"});
  if(a)a.finished.then(()=>el.remove()).catch(()=>el.remove());
  else setTimeout(()=>el.remove(),1350/replaySpeed);
}
function clearBattleSlotFocus() {
  [0,1].forEach(side=>{
    dieEl(side).classList.remove('processing');
    dieEl(side).querySelectorAll('.executing').forEach(tile=>tile.classList.remove('executing'));
  });
  $('battleScreen').classList.remove('slots-processing');
}
function focusBattleSlots(side,faces,slot=null) {
  const dice=dieEl(side);
  const tiles=[...dice.querySelectorAll('.dice-tile')].filter(tile=>
    (slot===null ? faces.includes(tile.dataset.face) && !tile.classList.contains('cursed') && !tile.dataset.blocked
      : Number(tile.dataset.slot)===slot));
  if(!tiles.length)return;
  $('battleScreen').classList.add('slots-processing');dice.classList.add('processing');
  tiles.forEach(tile=>tile.classList.add('executing'));
}
async function playEvent(ev) {
  clearBattleSlotFocus();
  if(ev.type==='heal')ev.healing.forEach(h=>focusBattleSlots(h.side,['heal','fullheal']));
  if(ev.type==='twin')focusBattleSlots(ev.side,['twin']);
  if(ev.type==='curseBlock' || ev.type==='twinBlank')focusBattleSlots(ev.side,[],ev.slot);
  if(ev.type==='impact'){
    ev.attacks.forEach(a=>focusBattleSlots(a.side,['attack1','attack2','strong','ram']));
    ev.drains.forEach(d=>focusBattleSlots(d.side,['drain']));
  }
  if(ev.type==='counter')ev.counters.forEach(c=>focusBattleSlots(c.side,['counter']));
  if(ev.type==='poisonApply')ev.applications.forEach(a=>focusBattleSlots(a.side,['poison']));
  if(ev.type==='curseApply')focusBattleSlots(ev.side,['curse']);
  try {await renderBattleEvent(ev);} finally {clearBattleSlotFocus();}
}
function setCaption(text) { $("battleCaption").textContent=text; }
function setCaptionRich(lines) {
  // All names passed by callers are escaped; SVG is generated locally.
  $("battleCaption").innerHTML=(Array.isArray(lines)?lines:[lines]).map(line=>`<span class="caption-line">${line}</span>`).join("");
}
function captionHearts(n, sign="") {
  const count=Math.max(0,Math.round(n));
  return `<span class="caption-heart-group" role="img" aria-label="${esc(sign)}${count} HP">${esc(sign)}${Array.from({length:count},()=>heartSvg()).join("")}</span>`;
}
function displayBattleState(e,side) {
  return {...e,cursedSlots:[...new Set([...e.cursedSlots,...deferredCurses[side]])]};
}
function paintBattle(states) {
  battleStates=E.clone(states);
  states.forEach((e,side)=>{
    const shown=displayBattleState(e,side);
    const art=fighterEl(side).querySelector(".fighter-art");
    art.textContent=e.emoji;
    const status=fighterEl(side).querySelector(".fighter-status");
    const signature=JSON.stringify([shown.poisoned,shown.cursedSlots]);
    if(status.dataset.signature!==signature){status.innerHTML=statusMarks(shown);status.dataset.signature=signature;}
    fighterEl(side).classList.toggle("poisoned",e.poisoned);
    fighterEl(side).classList.toggle("cursed",shown.cursedSlots.length>0);
    fighterEl(side).classList.toggle("dead",e.status==="dead");
    const info=infoEl(side);
    info.innerHTML=`<div class="battle-info-head"><h2 class="${my(e) ? "battle-my-name" : ""}">${esc(e.name)}</h2>${star(e.stars,e.status==="legend")}</div>${hearts(e)}`;
  });
}
function queueCurseRecovery(side,slots) {
  slots.forEach(pos=>deferredCurses[side].add(pos));
}
async function finishCurseAnimations() {
  const targets=[];
  [0,1].forEach(side=>deferredCurses[side].forEach(pos=>{
    // A curse reapplied later in the same battle must remain visible.
    if(!battleStates[side].cursedSlots.includes(pos))targets.push({side,pos});
  }));
  if(!targets.length){deferredCurses=[new Set(),new Set()];paintBattle(battleStates);return;}
  $("battleScreen").dataset.phase="curseRecovery";
  setCaption("\u2620\ufe0f \u546a\u3044\u304c\u6d88\u3048\u305f");
  const badges=[];
  targets.forEach(({side,pos})=>{
    const dice=[...dieEl(side).querySelectorAll(`[data-slot="${pos}"][data-blocked]`)];
    dice.forEach(node=>{
      const badge=node.querySelector(".curse-small");
      if(badge){badges.push(badge);animate(badge,[
        {transform:"scale(1)",opacity:1},
        {transform:"translateY(-7px) scale(1.45)",opacity:1,offset:.35},
        {transform:"translateY(-26px) scale(.3)",opacity:0}
      ],720/replaySpeed,{easing:"ease-out"});}
    });
  });
  await battleWait(750);
  badges.forEach(el=>el.remove());
  deferredCurses=[new Set(),new Set()];paintBattle(battleStates);
  targets.forEach(({side,pos})=>{
    const dice=[...dieEl(side).querySelectorAll(`[data-slot="${pos}"][data-blocked]`)];
    dice.forEach(node=>{
      node.classList.remove("cursed","blocked");node.classList.add("restored");
      animate(node,[{transform:"scale(.94)"},{transform:"scale(1.1)",offset:.4},{transform:"scale(1)"}],650/replaySpeed);
    });
  });
  await battleWait(1000);
  document.querySelectorAll(".dice-tile.restored").forEach(el=>el.classList.remove("restored"));
}
function dieContent(roll) { return icon(roll.face)+(roll.cursed?curseMark():""); }
function dieTile(roll) {
  return `<div class="dice-tile ${F[roll.face].special?"special":""} ${roll.cursed?"cursed":""}" data-slot="${roll.slot}" data-face="${roll.face}">${dieContent(roll)}</div>`;
}

async function rollDice(rolls,twinSide=null) {
  if(twinSide===null){
    rolls.forEach(r=>{const d=dieEl(r.side);d.classList.remove("twin");d.innerHTML=dieTile(r);});
  }else{
    const d=dieEl(twinSide);d.classList.add("twin");d.innerHTML=rolls.map(dieTile).join("");
  }
  const boxes=twinSide===null?rolls.map(r=>dieEl(r.side).firstElementChild):[...dieEl(twinSide).children];
  boxes.forEach((box,i)=>{
    animate(box,[
      {transform:`translate(${i?90:-90}px,${i?-70:70}px) scale(.3) rotate(${i?110:-110}deg)`,opacity:0},
      {transform:`translate(0,-16px) scale(1.3) rotate(${i?-22:22}deg)`,opacity:1,offset:.6},
      {transform:`translate(0,0) scale(1) rotate(${i?5:-5}deg)`,opacity:1}
    ],1000/replaySpeed);
  });
  const start=performance.now(),duration=reduced()?40:BATTLE_TIMING.roll/replaySpeed;
  while(performance.now()-start<duration) {
    boxes.forEach((box,i)=>box.innerHTML=icon(E.BASIC[E.index(rng,E.BASIC.length)].id)+(rolls[i].cursed?curseMark():""));
    await battleWait(55);
  }
  boxes.forEach((box,i)=>{
    box.innerHTML=dieContent(rolls[i]);box.dataset.face=rolls[i].face;
    const rect=box.getBoundingClientRect(),p=$("battleFx").getBoundingClientRect();
    particles($("battleFx"),rect.left-p.left+rect.width/2,rect.top-p.top+rect.height/2,F[rolls[i].face].special?PAL["rose-light"]:PAL["accent"],10,55);
  });
  paintBattle(battleStates);
  await battleWait(BATTLE_TIMING.diceHold);
}
async function renderBattleEvent(ev) {
  // 防御の事前演出と、攻撃が来なかったカウンター演出を省く
  if (ev.type === "guard" || ev.type === "counterIdle") return;
  const old=battleStates;
  $("battleScreen").dataset.phase=ev.type;
  if(ev.type==="roll"){
    setCaption("");
    await rollDice(ev.rolls);
    ev.rolls.filter(r=>r.face==="blank"&&!r.cursed).forEach(r=>animate(dieEl(r.side).firstElementChild,[{transform:"rotate(-5deg)"},{transform:"translateY(14px) rotate(10deg)",opacity:.7}],450/replaySpeed));
    return;
  }
  if(ev.type==="twin"){
    setCaption(`${old[ev.side].name} \u306e\u30c4\u30a4\u30f3`);
    particles($("battleFx"),localPoint(ev.side).x,localPoint(ev.side).y,PAL.accent,18,100);
    await battleWait(600);clearBattleSlotFocus();await rollDice(ev.rolls,ev.side);paintBattle(ev.state);return;
  }
  if(ev.type==="curseBlock"){
    queueCurseRecovery(ev.side,[ev.slot]);
    setCaption(`\u2620\ufe0f ${old[ev.side].name}\uff1a\u3053\u306e\u51fa\u76ee\u306f\u7121\u52b9`);
    const box=dieEl(ev.side).querySelector(`[data-slot="${ev.slot}"]:not([data-blocked])`);
    if(box){
      box.dataset.blocked="1";box.classList.add("blocked");
      animate(box,[{transform:"scale(1)"},{transform:"scale(.91)",offset:.5},{transform:"scale(1)"}],450/replaySpeed);
    }
    paintBattle(ev.state);await battleWait(BATTLE_TIMING.effect);return;
  }

  if(ev.type==="twinBlank"){
    setCaption("\ud83d\udca9 \u8ffd\u52a0\u306e\u30c4\u30a4\u30f3\u306f\u30cf\u30ba\u30ec");
    const box=dieEl(ev.side).querySelector(`[data-slot="${ev.slot}"]`);if(box)box.style.opacity=".4";
    await battleWait(BATTLE_TIMING.effect);return;
  }
  if(ev.type==="poisonTick"){
    setCaptionRich(`\ud83e\udda0 \u6bd2\u3067 ${captionHearts(1,"\u2212")}`);
    ev.sides.forEach(side=>{const p=localPoint(side);particles($("battleFx"),p.x,p.y,PAL.poison,17,82);floatHearts(side,-1,PAL.poison);hit(side);});
    paintBattle(ev.state);await battleWait(BATTLE_TIMING.effect);return;
  }
  if(ev.type==="poisonCheck"){
    setCaption("\ud83e\udda0 \u6bd2\u306e\u5224\u5b9a");
    const wheels=[];
    ev.checks.forEach(c=>{
      const el=document.createElement("div");el.className="status-die poison-wheel";
      el.innerHTML='<svg viewBox="0 0 100 100" aria-hidden="true"><path class="wheel-green" d="M50 50V5A45 45 0 1 1 11 72.5Z"/><path class="wheel-clear" d="M50 50 11 72.5A45 45 0 0 1 50 5Z"/><circle class="wheel-rim" cx="50" cy="50" r="45"/></svg><span class="wheel-pointer"></span>';
      battleEffectArea(c.side).appendChild(el);wheels.push(el);
      animate(el.querySelector("svg"),[
        {transform:"rotate(0deg)"},
        {transform:`rotate(${c.continued?1320:1500}deg)`}
      ],2000/replaySpeed,{easing:"cubic-bezier(.13,.65,.22,1)",fill:"forwards"});
    });
    await battleWait(2000);
    wheels.forEach(el=>el.classList.add("is-stopped"));
    paintBattle(ev.state);
    setCaption(ev.checks.map(c=>`${old[c.side].name}\uff1a${c.continued?"\u6bd2\u304c\u3064\u3065\u304f":"\u6bd2\u304c\u6d88\u3048\u305f"}`).join("\n"));
    ev.checks.filter(c=>!c.continued).forEach(c=>{
      const gone=document.createElement("span");gone.className="poison-gone";gone.textContent=F.poison.icon;
      const host=battleEffectArea(c.side);host.appendChild(gone);
      const anim=animate(gone,[
        {transform:"translate(-50%,-50%) scale(.65)",opacity:0},
        {transform:"translate(-50%,-50%) scale(1.15)",opacity:1,offset:.26},
        {transform:"translate(-50%,-110%) scale(.65)",opacity:0}
      ],850/replaySpeed);
      if(anim)anim.finished.then(()=>gone.remove()).catch(()=>gone.remove());
      else setTimeout(()=>gone.remove(),850/replaySpeed);
    });
    await battleWait(950);wheels.forEach(el=>el.remove());return;
  }
  if(ev.type==="heal"){
    ev.healing.forEach(h=>queueCurseRecovery(h.side,h.removed||[]));
    setCaption(ev.healing.map(h=>`${h.full?"\ud83d\udc96":"\ud83e\uddea"} ${old[h.side].name} ${h.full?"\u5168\u56de\u5fa9":h.clearedPoison?"\u56de\u5fa9\u30fb\u30c7\u30d0\u30d5\u89e3\u9664":"\u56de\u5fa9"}`).join("\n"));
    ev.healing.forEach(h=>{
      healLight(h.side);
      if(h.amount>0)floatHearts(h.side,h.amount,PAL["neon-pink"]);
    });

    paintBattle(ev.state);await battleWait(BATTLE_TIMING.effect);return;
  }
  if(ev.type==="guard"){
    const names=[];
    ev.guards.forEach((n,side)=>{
      if(!n)return;names.push(old[side].name);
      const el=document.createElement("div");el.className="fx-shield";fighterEl(side).querySelector(".fighter-hit-area").appendChild(el);
      animate(el,[{transform:"scale(.3)",opacity:0},{transform:"scale(1.04)",opacity:.32,offset:.7},{transform:"scale(1)",opacity:.18}],650/replaySpeed);
    });
    setCaption(`\ud83d\udee1\ufe0f ${names.join("\u30fb")} \u306e\u9632\u5fa1`);await battleWait(1000);return;
  }
  if(ev.type==="impact"){
    const lines=[];
    const counterSides=new Set((currentBattle.events.find(e=>e.type==="counter")?.counters||[]).map(c=>c.side));
    ev.attacks.forEach(a=>{
      trail(a.side,a.target,a.strong||a.ram?PAL["neon-pink"]:PAL["neon-sky"]);
      if(a.reflected||counterSides.has(a.target))defenseReaction(a.target,"counter");
      if(a.ram){
        const from=localPoint(a.side),to=localPoint(a.target);
        animate(fighterEl(a.side).querySelector(".fighter-art"),[
          {transform:"translate(0,0) rotate(0)"},
          {transform:`translate(${(to.x-from.x)*.62}px,${(to.y-from.y)*.62}px) rotate(22deg) scale(1.25)`,offset:.45},
          {transform:"translate(0,0) rotate(0)"}
        ],800/replaySpeed);
      }
    });
    ev.drains.forEach(d=>{if(d.amount)flyEffect(d.target,d.side,{kind:"heart",count:d.amount});});
    await battleWait(counterSides.size?500:ev.drains.length?1060:BATTLE_TIMING.impactTravel);
    ev.attacks.forEach(a=>{
      const p=localPoint(a.target),countering=!!a.reflected||counterSides.has(a.target);
      if(countering){
        lines.push(`\u21a9\ufe0f ${esc(old[a.target].name)} \u304c\u53d7\u3051\u6b62\u3081\u305f`);
      }else if(a.blocked>0){
        defenseReaction(a.target,"guard");
        lines.push(a.damage===0?`\ud83d\udee1\ufe0f ${esc(old[a.target].name)} \u9632\u5fa1\u6210\u529f`:`\ud83d\udee1\ufe0f ${esc(old[a.target].name)}\uff1a\u8efd\u6e1b\u3057\u3066 ${captionHearts(a.damage,"\u2212")}`);
      }else{
        if(a.damage)hit(a.target,a.ram||a.strong);
        particles($("battleFx"),p.x,p.y,a.strong||a.ram?PAL["neon-pink"]:PAL["neon-sky"],a.ram?30:20,a.ram?150:105);
        lines.push(`${a.ram?F.ram.icon:a.strong?F.strong.icon:F.attack1.icon} ${esc(old[a.target].name)} \u306b ${captionHearts(a.damage,"\u2212")}`);
      }
    });
    ev.drains.forEach(d=>{
      if(d.amount)healLight(d.side);
      lines.push(`${F.drain.icon} ${esc(old[d.side].name)} \u304c ${d.amount?captionHearts(d.amount):"0"} \u3092\u5438\u8840`);
    });
    // Show losses and healing separately when both occur in this simultaneous phase.
    [0,1].forEach(side=>{
      const incoming=ev.attacks.filter(x=>x.target===side).reduce((n,x)=>n+x.damage,0)
        +(ev.selfDamage?.[side]||0)+ev.drains.filter(x=>x.target===side).reduce((n,x)=>n+x.amount,0);
      const restored=Math.max(0,ev.state[side].currentHp-(old[side].currentHp-incoming));
      if(incoming)floatHearts(side,-incoming,PAL["neon-pink"],restored?-22:0);
      if(restored)floatHearts(side,restored,PAL["neon-pink"],incoming?18:0);
    });
    setCaptionRich(lines);paintBattle(ev.state);
    if(!counterSides.size)await battleWait(2100);
    return;
  }

  if(ev.type==="counter"){
    ev.counters.forEach(c=>trail(c.side,c.target,PAL.accent,true));
    await battleWait(BATTLE_TIMING.impactTravel);
    ev.counters.forEach(c=>{
      if(c.damage<c.power)defenseReaction(c.target,"guard",c.power-c.damage);
      else if(c.damage)hit(c.target,true);
      if(c.damage){const p=localPoint(c.target);particles($("battleFx"),p.x,p.y,PAL.accent,22,110);floatHearts(c.target,-c.damage,PAL["neon-pink"]);}
    });
    setCaptionRich(ev.counters.map(c=>`\u21a9\ufe0f ${esc(old[c.side].name)} \u304c ${c.damage?captionHearts(c.damage):"0"} \u8fd4\u3057\u305f`));
    paintBattle(ev.state);await battleWait(1450);return;
  }
  if(ev.type==="counterIdle"){
    setCaption("\u21a9\ufe0f \u653b\u6483\u306f\u6765\u306a\u304b\u3063\u305f");await battleWait(BATTLE_TIMING.effect);return;
  }
  if(ev.type==="poisonApply"){
    ev.applications.forEach(a=>{trail(a.side,a.target,PAL.poison);const p=localPoint(a.target);particles($("battleFx"),p.x,p.y,PAL.poison,25,80);});
    setCaption(ev.applications.map(a=>`\ud83e\udda0 ${old[a.target].name} ${a.already?"\u306f\u3059\u3067\u306b\u6bd2\u3060\u3063\u305f":"\u304c\u6bd2\u306b\u306a\u3063\u305f"}`).join("\n"));
    paintBattle(ev.state);await battleWait(BATTLE_TIMING.effect);return;
  }
  if(ev.type==="curseApply"){
    setCaption(`☠️ ${old[ev.side].name} の呪い`);
    flyEffect(ev.side,ev.target,{kind:"curse"});
    await battleWait(1000);
    paintBattle(ev.state);
    setCaption(ev.added.length?`\u2620\ufe0f ${old[ev.target].name} \u306e ${ev.added.length}\u30b9\u30ed\u30c3\u30c8\u306b\u546a\u3044`:"\u2620\ufe0f \u3059\u3067\u306b\u546a\u308f\u308c\u3066\u3044\u305f");
    await battleWait(1550);return;
  }

  if(ev.type==="finish"){
    paintBattle(ev.state);
    ev.state.forEach((e,side)=>{
      if(e.status==="dead"){const p=localPoint(side);particles($("battleFx"),p.x,p.y,PAL.subtle,17,100);}
      else animate(infoEl(side).querySelector(".star-badge"),[{transform:"scale(1.85)"},{transform:"scale(1)"}],800/replaySpeed);
    });
    const dead=ev.state.filter(e=>e.status==="dead");
    if(dead.length===2)setCaption("\ud83e\udea6 \u3075\u305f\u308a\u3068\u3082\u3001\u3053\u3053\u307e\u3067\u3002");
    else if(dead.length)setCaption(`\ud83e\udea6 ${dead[0].name} \u306f\u529b\u5c3d\u304d\u305f\u3002`);
    else if(ev.legendIds.length)setCaption("\ud83c\udfc6 50\u6226\u3001\u751f\u304d\u629c\u3044\u305f\u3002");
    else setCaption("\u3075\u305f\u308a\u3068\u3082\u3001\u751f\u304d\u306e\u3073\u305f\u3002");
    await battleWait(BATTLE_TIMING.resultHold);
  }
}
async function playBattle(log,i,total) {
  clearBattleSlotFocus();
  currentBattle=log;
  deferredCurses=[new Set(),new Set()];
  $("battleScreen").classList.remove("awaiting-next");
  $("battleScreen").dataset.phase="entrance";
  $("battleNext").classList.add("hidden");$("battleNext").disabled=true;
  visualMap=log.before[1].ownerName===playerName()&&log.before[0].ownerName!==playerName()?[1,0]:[0,1];
  $("battleFx").innerHTML="";
  [0,1].forEach(side=>{
    const el=fighterEl(side);
    el.getAnimations({subtree:true}).forEach(a=>a.cancel());
    el.querySelector(".fighter-hit-area").innerHTML="";
    el.querySelectorAll(".status-die").forEach(d=>d.remove());
    infoEl(side).getAnimations({subtree:true}).forEach(a=>a.cancel());
    infoEl(side).innerHTML="";
    dieEl(side).innerHTML="";dieEl(side).classList.remove("twin");
  });
  $("battleScreen").classList.remove("hidden");
  $("battleCount").textContent=`バトル  ${i+1} / ${total}`;
  $("battleProgress").style.setProperty("--progress",((i/total)*100)+"%");
  setCaption("");
  paintBattle(log.before);
  [0,1].forEach(side=>{
    const visual=visualMap[side];
    animate(fighterEl(side),[
      {transform:`translate(${visual?100:-100}px,${visual?-40:40}px) scale(.65)`,opacity:0},
      {transform:"translate(0,0) scale(1)",opacity:1}
    ],900/replaySpeed);
    animate(infoEl(side),[{transform:`translateX(${visual?-45:45}px)`,opacity:0},{transform:"translateX(0)",opacity:1}],700/replaySpeed,{delay:300});
  });
  await battleWait(BATTLE_TIMING.entrance+BATTLE_TIMING.beforeRoll);
  for(let n=0;n<log.events.length;n++){
    if(log.events[n].type==="finish" && deferredCurses.some(set=>set.size)) {
      await finishCurseAnimations();
      await battleWait(BATTLE_TIMING.phaseGap);
    }
    await playEvent(log.events[n]);
    if(n<log.events.length-1 && !(log.events[n].type==="impact"&&log.events[n+1].type==="counter"))await battleWait(BATTLE_TIMING.phaseGap);
  }
  $("battleProgress").style.setProperty("--progress",(((i+1)/total)*100)+"%");
  await waitForBattleContinue(i===total-1);
}
async function playUpdates(extraIds=[]) {
  if(!store.player||busy||playback)return;
  const maxBattle=store.nextSeq-1,maxLegend=store.nextLegendSeq-1;
  const queue=store.battles.filter(b=>(store.player.unreadBattleIds||[]).includes(b.battleId)||extraIds.includes(b.battleId)).sort((a,b)=>a.seq-b.seq);
  const newLegends=store.legends.filter(l=>l.seq>store.player.seenLegendSeq&&l.seq<=maxLegend).sort((a,b)=>a.seq-b.seq);
  if(!queue.length&&!newLegends.length){
    if(maxBattle>store.player.seenBattleSeq){
      store.player.seenBattleSeq=maxBattle;
      try{await cloud.markSeen({battleSeq:maxBattle,legendSeq:store.player.seenLegendSeq});}catch(error){reportError(error);}
    }
    refreshNav();return;
  }
  await closeModal(true);
  playback={skip:false};$("speedButton").textContent=replaySpeed+"×";
  let replayCompleted=true;
  try{
    for(let i=0;i<queue.length;i++){
      await playBattle(queue[i],i,queue.length);
      store.player.seenBattleSeq=Math.max(store.player.seenBattleSeq,queue[i].seq);
      try{await cloud.markSeen({battleSeq:store.player.seenBattleSeq,legendSeq:store.player.seenLegendSeq,battleIds:[queue[i].battleId]});}
      catch(error){reportError(error);}
    }
  }catch(err){
    if(err.message!=="SKIP"){replayCompleted=false;console.error("Replay failed.",err);toast("再生を中断しました。次回もう一度再生します。",4500);}
  }
  if(replayCompleted)store.player.seenBattleSeq=Math.max(store.player.seenBattleSeq,maxBattle);
  advanceBattle();await hideLayer($("battleScreen"));$("battleScreen").classList.add("hidden");
  $("battleScreen").getAnimations().forEach(x=>x.cancel());
  clearBattleSlotFocus();
  $("battleFx").innerHTML="";playback=null;currentBattle=null;
  for(const l of newLegends){
    await showLegend(l.emojin);
    store.player.seenLegendSeq=l.seq;
  }
  store.player.seenLegendSeq=Math.max(store.player.seenLegendSeq,maxLegend);
  try{await cloud.markSeen({battleSeq:store.player.seenBattleSeq,legendSeq:store.player.seenLegendSeq,battleIds:replayCompleted?queue.map(b=>b.battleId):[]});}
  catch(error){reportError(error);}
  store.player=cloud.player;
  store.suspendedOwnerUids=(store.suspendedOwnerUids||[]).filter(id=>id!==cloud.uid);
  if(store.player.suspended)store.suspendedOwnerUids.push(cloud.uid);
  renderCity();refreshNav();
}
async function showLegend(e) {
  if(!e)return;busy=true;
  $("legendHero").textContent=e.emoji;$("legendName").textContent=e.name;
  $("legendStar").innerHTML=star(50,true);
  $("legendSlots").innerHTML=slotRow(e,false);
  $("legendOwner").textContent="オーナー："+e.ownerName;
  $("legendContinue").disabled=true;$("legendScreen").classList.remove("hidden");
  const rect=$("legendScreen").getBoundingClientRect();
  animate($("legendHero"),[
    {transform:"translateY(80px) scale(.15) rotate(-20deg)",opacity:0},
    {transform:"translateY(-9px) scale(1.23) rotate(5deg)",opacity:1,offset:.7},
    {transform:"translateY(0) scale(1) rotate(0)",opacity:1}
  ],980);
  animate($("legendName"),[{transform:"translateY(30px)",opacity:0},{transform:"translateY(0)",opacity:1}],650,{delay:330});
  animate($("legendSlots"),[{transform:"translateY(35px) scale(.8)",opacity:0},{transform:"translateY(0) scale(1)",opacity:1}],750,{delay:650});
  particles($("legendFx"),rect.width*.5,rect.height*.43,PAL["rose-light"],40,Math.min(270,rect.width*.6));
  await delay(1050);$("legendContinue").disabled=false;
  $("legendContinue").focus({preventScroll:true});
  await new Promise(resolve=>legendResolve=resolve);
  animate($("legendScreen"),[{opacity:1},{opacity:0}],400);
  await delay(400);$("legendScreen").classList.add("hidden");
  $("legendScreen").getAnimations().forEach(a=>a.cancel());
  $("legendFx").innerHTML="";busy=false;
}

function wireEvents() {
  $("generateButton").onclick=beginGeneration;
  $("forceBattleButton").onclick=forceBattle;
  $("browseButton").onclick=()=>{if(!busy&&!playback&&store.player)showArchive("active");};
  $("unreadButton").onclick=()=>playUpdates();
  $("revealContinue").onclick=finishReveal;
  $("legendContinue").onclick=()=>{
    if(!legendResolve)return;const fn=legendResolve;legendResolve=null;fn();
  };
  $("revealScreen").addEventListener("click",finishReveal);
  $("legendScreen").addEventListener("click",()=>{
    if(!legendResolve)return;const fn=legendResolve;legendResolve=null;fn();
  });
  $("skipButton").onclick=ev=>{
    ev.stopPropagation();if(playback){playback.skip=true;advanceBattle();}
  };
  $("battleNext").onclick=ev=>{ev.stopPropagation();advanceBattle();};
  $("battleScreen").addEventListener("click",ev=>{
    if(ev.target.closest(".battle-controls") || ev.target.closest("#battleNext"))return;
    advanceBattle();
  });
  $("speedButton").onclick = () => {
    replaySpeed = replaySpeed === 1 ? 2 : replaySpeed === 2 ? 4 : 1;
    $("speedButton").textContent = replaySpeed + "×";

    try {
      localStorage.setItem("emojin.battleSpeed", String(replaySpeed));
    } catch {}
  };
  $("modalHost").addEventListener("click",ev=>{
    if(modalClosing)return;
    const close=ev.target.closest("[data-close-modal]");
    if(close){closeModal();return;}
    const face=ev.target.closest("[data-face]");
    if(face&&!busy){showFace(face.dataset.face,face.classList.contains("cursed"));return;}
    const entry=ev.target.closest("[data-emojin-id]");
    if(entry){
      const e=findEmojin(entry.dataset.emojinId);
      if(e)showDetail(e,entry.dataset.returnStatus?{status:entry.dataset.returnStatus,filter:entry.dataset.returnFilter}:null);
      return;
    }
    const tab=ev.target.closest("[data-archive-tab]");
    if(tab){
      switchArchiveTab($("modalHost").querySelector(".archive-panel"),tab.dataset.archiveTab);
      return;
    }
    if(modalOptions.tapToClose&&!busy)closeModal();
  });
  $("detailHost").addEventListener("click",ev=>{
    const face=ev.target.closest("[data-face]");
    if(face){showFace(face.dataset.face,face.classList.contains("cursed"));return;}
    closeDetailOverlay();
  });
  $("modalHost").addEventListener("keydown",ev=>{
    if(ev.key!=="ArrowLeft"&&ev.key!=="ArrowRight")return;
    const tab=ev.target.closest("[data-archive-tab]");if(!tab)return;
    ev.preventDefault();const tabs=[...$("modalHost").querySelectorAll(".archive-tab")];
    const next=tabs[(tabs.indexOf(tab)+(ev.key==="ArrowRight"?1:tabs.length-1))%tabs.length];
    next.click();next.focus({preventScroll:true});
  });
  let archiveGesture=null,suppressArchiveClickUntil=0;
  $('modalHost').addEventListener('pointerdown',ev=>{
    const viewport=ev.target.closest('.archive-viewport');
    if(!viewport || !ev.isPrimary || (ev.pointerType==='mouse' && ev.button!==0))return;
    archiveGesture={id:ev.pointerId,x:ev.clientX,y:ev.clientY,time:performance.now(),panel:viewport.closest('.archive-panel')};
  });
  $('modalHost').addEventListener('pointerup',ev=>{
    const g=archiveGesture;if(!g || g.id!==ev.pointerId)return;archiveGesture=null;
    const dx=ev.clientX-g.x,dy=ev.clientY-g.y;
    if(!g.panel.isConnected || Math.abs(dx)<45 || Math.abs(dx)<Math.abs(dy)*1.35 || performance.now()-g.time>1200)return;
    suppressArchiveClickUntil=performance.now()+400;
    const keys=['active','legend','dead'],index=keys.indexOf(g.panel.dataset.activeTab);
    switchArchiveTab(g.panel,keys[E.clamp(index+(dx<0?1:-1),0,2)]);
  });
  $('modalHost').addEventListener('pointercancel',()=>{archiveGesture=null;});
  $('modalHost').addEventListener('click',ev=>{
    if(performance.now()<suppressArchiveClickUntil && ev.target.closest('.archive-viewport')){
      ev.preventDefault();ev.stopImmediatePropagation();
    }
  },true);
  $("popoverHost").addEventListener("click",()=>closePopover());
  document.addEventListener("keydown",ev=>{
    if(!$("popoverHost").classList.contains("hidden")&&(ev.key==="Enter"||ev.key===" ")&&!ev.repeat){ev.preventDefault();closePopover();return;}
    if(!$("detailHost").classList.contains("hidden")&&(ev.key==="Enter"||ev.key===" ")&&!ev.repeat&&!document.activeElement?.closest("button")){ev.preventDefault();closeDetailOverlay();return;}
    if(modalOptions.tapToClose&&modalKind&&(ev.key==="Enter"||ev.key===" ")&&!ev.repeat&&!document.activeElement?.closest("button")){ev.preventDefault();closeModal();return;}
    if(battleContinueResolve&&(ev.key==="Enter"||ev.key===" ")&&!ev.repeat&&!(document.activeElement&&document.activeElement.closest(".battle-controls"))){ev.preventDefault();advanceBattle();return;}
    if(ev.key==="Escape"){
      if(!$("popoverHost").classList.contains("hidden"))closePopover();
      else if(!$("detailHost").classList.contains("hidden"))closeDetailOverlay();
      else if(modalKind&&$("modalHost").querySelector("[data-close-modal]"))closeModal();
    }
    if(ev.key==="Tab"){
      const host=!$("popoverHost").classList.contains("hidden")?$("popoverHost"):
        !$("detailHost").classList.contains("hidden")?$("detailHost"):
        !$("legendScreen").classList.contains("hidden")?$("legendScreen"):
        !$("revealScreen").classList.contains("hidden")?$("revealScreen"):
        !$("battleScreen").classList.contains("hidden")?$("battleScreen"):
        !$("modalHost").classList.contains("hidden")?$("modalHost"):null;
      if(!host)return;
      const items=[...host.querySelectorAll("button:not(:disabled), input:not(:disabled)")].filter(el=>el.offsetParent!==null);
      if(!items.length){ev.preventDefault();return;}
      if(ev.shiftKey&&document.activeElement===items[0]){ev.preventDefault();items.at(-1).focus();}
      else if(!ev.shiftKey&&document.activeElement===items.at(-1)){ev.preventDefault();items[0].focus();}
    }
  });
  let resizeTimer;
  window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(drawCity,70);});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)syncWorld({play:true}).catch(reportError);});
  setInterval(refreshNav,5000);
  setInterval(()=>{if(!document.hidden)syncWorld({play:true}).catch(reportError);},60000);
}
async function init() {
  store=cloud.player?await cloud.getState():{
    version:1,player:null,wallet:cloud.wallet,draft:null,
    emojins:[],battles:[],legends:[],nextSeq:1,nextLegendSeq:1,
    reducedMotion:localStorage.getItem('emojin.online.reducedMotion')==='true'
  };
  document.body.classList.toggle("reduce-motion",store.reducedMotion);
  wireEvents();drawCity();renderCity();requestAnimationFrame(worldLoop);
  await delay(680);
  animate($("bootScreen"),[{opacity:1},{opacity:0}],350);
  await delay(350);$("bootScreen").classList.add("hidden");
  if(!store.player){showAuthChoice();return;}
  await showRevival();
  if(!store.player.tutorialSeen){showTutorial();return;}
  if(store.draft){beginGeneration();return;}
  await playUpdates();
}
// Updating is deferred until local writes finish and the owner is back in town.
window.EmojinCanReload=()=>!!store && !busy && !playback && (!modalKind || modalKind==='オーナー認証') && !modalClosing
  && !revivalPlaying && !store.draft && cloud.canReload
  && !document.activeElement?.matches('input,textarea,[contenteditable="true"]')
  && ['bootScreen','battleScreen','battleCutin','tutorial','revealScreen','legendScreen','popoverHost','detailHost']
    .every(id=>$(id).classList.contains('hidden'));
window.EmojinPrepareReload=()=>{if(!window.EmojinCanReload())return false;busy=true;return true;};
window.EmojinCancelReload=()=>{busy=false;refreshNav();};
init().catch(err=>{
  console.error(err);
  $("bootMessage").textContent=err.message||"接続できませんでした。";
  $("bootRetry").classList.remove("hidden");
  $("bootRetry").onclick=()=>location.reload();
});
})();

}).catch(error=>{
  console.error('初期化に失敗しました',error);
  document.getElementById('bootMessage').textContent=error.message||'接続できませんでした。';
  const button=document.getElementById('bootRetry');button.classList.remove('hidden');button.onclick=()=>location.reload();
});
