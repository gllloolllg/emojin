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
    poison: { icon: "🦠", name: "毒", text: "相手を毒にする。次のターン開始時に1ダメージ。1/3で解除。", color: "green", special: true },
    strong: { icon: "💥", value: 3, name: "強攻撃", text: "相手に3ダメージ。攻撃として扱う。", color: "amber", special: true },
    drain: { icon: "🦇", value: 2, name: "吸血", text: "相手の♡を最大2奪い、その分だけ回復する。", color: "pink", special: true },
    ram: { icon: "🦬", value: 4, name: "体当たり", text: "相手に4ダメージ自分にも2ダメージ。攻撃扱いなのでカウンターを食らうと最悪。", color: "amber", special: true },
    twin: { icon: "🎲", twin: true, name: "ツイン", text: "さらに2個抽選する。その際のツインはハズレ扱い。", color: "violet", special: true },
    fullheal: { icon: "💖", name: "全回復", text: "♡を最大まで回復する。毒と呪いは残る。", color: "pink", special: true },
    curse: { icon: "☠️", name: "呪い", text: "スロットを3つ呪う。呪われた目が出ると効果は無効、そのスロットの呪いが消える。", color: "violet", special: true }
  };
  const EMOJIS = ["🦐","🐙","🍙","🤖","👾","💩","🐸","🦖","🦕","🌷","🍄","🦆","🦀","🍋","🍞","🥑","🐌","👻","🗿","🦑","🐧","🐼","🦊","🦋","🐢","🦔","🐟","🐳","🌵","🍆","🥕","🍥","🍣","🍔","🍟","🍩","🍮","🧀","🧊","🚽","🛸","🚀","🧸","🪩","🦷","🧠","🫀","🪼","🦎","🐣","🦭","🐈","🍤","🥦","🍑","🌝","🥸","🤡","👹","👺","👽","👄","💃","🕺","🛌","🐒","🦍","🦧","🐕","🐩","🐺","🦝","🐈‍⬛","🐅","🐆","🐴","🫎","🫏","🐎","🦓","🦌","🦬","🐃","🐄","🐖","🐗","🐑","🐫","🦙","🦒","🐘","🦣","🦏","🦛","🐀","🐇","🐿️","🦫","🦇","🐨","🦥","🦦","🦨","🦘","🦡","🐓","🐤","🐦","🕊️","🦅","🦢","🦉","🦤","🪶","🦩","🦚","🦜","🪽","🐦‍⬛","🪿","🐦‍🔥","🐊","🐍","🐉","🐬","🫍","🐠","🐡","🦈","🐚","🪸","🦞","🦪","🐛","🐜","🐝","🪲","🐞","🦗","🦟","🪰","💐","🌸","🌹","🌻","🌱","🌴","🍀","🍁","🍇","🍈","🍉","🍊","🍌","🍍","🍎","🍒","🍓","🥝","🥔","🌽","🌶️","🫑","🧄","🥜","🫛","🥐","🥖","🥨","🥞","🍖","🍕","🌭","🍳","🍱","🍜","🍡","🍦","🍪","🎂","🍫","🍬","🍭","🍼","☕","🍾","🍷","🍺","🧋","🔪","🏺","🎃","🎄","🎈","🎉","🎎","🎁","⚾","🏀","🏈","🥊","⛳","⛸️","🤿","🥌","🔫","🎱","🪄","🎮","🎴","🧞‍♂️","🧟","🫈","🌍","🗾","🧭","🌋","🪵","🗼","🗽","🎡","🚂","🚃","🚑","🚒","🚓","🚚","🏍️","🛵","🛺","🚲","🛴","🛢️","⛽","🛞","🚨","🪂","🚁","🌪️","🕶️","👘","👛","⛑️","📢","🎸","💴","✒️","📌","🔨","🚬","🪬"];

  const RULES_VERSION = 4, MAX_TURNS = 10, DEFEAT_LIMIT = 5;
  // Existing active residents keep 5..9 skulls until their next loss.
  const LEGACY_DEFEAT_LIMIT = 10;
  const INITIAL_MOJI = 2000;
  const GENERATION_COSTS = Object.freeze([100,200,400,800,1000,1200]);
  function generationCost(emojins,ownerUid) {
    const count=emojins.filter(e=>e.status==='active' && !e.isNpc && e.ownerUid===ownerUid).length;
    return GENERATION_COSTS[Math.min(count,GENERATION_COSTS.length-1)];
  }
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
      rulesVersion: RULES_VERSION,
      maxHp: 5 + index(rng, 4),
      basicSlots: Array.from({ length: 5 }, () => weightedBasic(rng)),
      offers: sample(SPECIAL, 2, rng), createdAt: now, name: "", chosen: null, stage: "name"
    };
  }
  function fromDraft(draft, name, ownerName, chosen, now = Date.now()) {
    draft=normalizeDraft(draft);
    if (!draft.offers.includes(chosen)) throw new Error("Invalid special ability.");
    return {
      id: draft.id, emoji: draft.emoji, name, ownerName,
      currentHp: clamp(draft.maxHp,5,8), maxHp: clamp(draft.maxHp,5,8),
      slots: [...draft.basicSlots, chosen], poisoned: false, cursedSlots: [],
      stars: 0, defeats: 0, rulesVersion: RULES_VERSION, recordVersion: 0, status: "active", createdAt: now, endedAt: null
    };
  }
  function validate(e) {
    if (!e || !e.id || e.status !== "active") throw new Error("Battle participants must be active.");
    if (!Array.isArray(e.slots) || e.slots.length !== 6 || e.slots.some(s => !FACES[s])) throw new Error("Invalid die.");
    if (!Number.isInteger(e.maxHp) || e.maxHp < 1 || !Number.isFinite(e.currentHp) || e.currentHp <= 0) throw new Error("Invalid HP.");
    if (!Number.isInteger(e.stars) || e.stars < 0 || e.stars >= 50) throw new Error("Invalid stars.");
    if ((e.cursedSlots || []).some(s => !Number.isInteger(s) || s < 0 || s > 5)) throw new Error("Invalid curse.");
    if(e.rulesVersion===RULES_VERSION && (!Number.isInteger(e.defeats)||e.defeats<0||e.defeats>=LEGACY_DEFEAT_LIMIT||e.maxHp<5||e.maxHp>8))throw Error('Invalid match record.');
  }

  /*
   * Battle phases are resolved from a shared snapshot per phase.
   * A/B ordering never decides who gets to attack.
   * The returned log is authoritative; the UI MUST NOT re-roll when replaying.
   */
  // This phase resolver preserves the v3 turn order and skill arithmetic.
  // It never awards records, retires a resident, refills NPCs or writes data.
  function resolveTurn(inputA, inputB, rng = Math.random) {
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

    states.forEach(s => { s.currentHp = clamp(s.currentHp, 0, s.maxHp); });
    return {before,after:stateList(),rolls,events};
  }

  function migrateActive(e) {
    if(e.status !== 'active' || e.rulesVersion === RULES_VERSION)return clone(e);
    if(Number(e.rulesVersion||3)>RULES_VERSION)throw Error('Future rules version');
    if(!Number.isInteger(e.maxHp)||e.maxHp<5||e.maxHp>10)throw Error('Unsupported legacy maximum HP');
    const maxHp=clamp(e.maxHp,5,8);
    return {...clone(e),maxHp,currentHp:maxHp,poisoned:false,cursedSlots:[],
      defeats:Number(e.defeats||0),rulesVersion:RULES_VERSION,recordVersion:Number(e.recordVersion||0)};
  }
  function normalizeDraft(draft) {
    if(draft && Number(draft.rulesVersion||3)>RULES_VERSION)throw Error('Future draft rules version');
    if(draft && (!Number.isInteger(draft.maxHp)||draft.maxHp<5||draft.maxHp>10))throw Error('Invalid draft maximum HP');
    return draft ? {...clone(draft),maxHp:clamp(draft.maxHp,5,8),rulesVersion:RULES_VERSION} : null;
  }
  function recordVersion(e) {
    return [e.currentHp,e.stars,e.status,e.poisoned,e.cursedSlots,e.defeats||0,e.rulesVersion||3,e.recordVersion||0];
  }
  function battleDocument(log) {
    return {rulesVersion:RULES_VERSION,defeatLimit:log.defeatLimit,seq:log.seq,ownerUids:log.ownerUids,
      emojinIds:log.before.map(e=>e.id),after:log.after,json:JSON.stringify(log)};
  }
  function battle(inputA,inputB,rng=Math.random,now=Date.now(),battleId=id('b')) {
    let states=[inputA,inputB].map(migrateActive);
    states.forEach(validate);
    if(states[0].id===states[1].id)throw Error('An emojin cannot battle itself.');
    states=states.map(e=>({...e,currentHp:e.maxHp,poisoned:false,cursedSlots:[]}));
    const before=clone(states),events=[],turns=[];
    for(let turn=1;turn<=MAX_TURNS;turn++) {
      events.push({type:'turnStart',turn,state:clone(states)});
      const phase=resolveTurn(states[0],states[1],rng);
      events.push(...phase.events.map(event=>({...event,turn})));
      states=phase.after;
      turns.push({turn,rolls:phase.rolls,after:clone(states)});
      events.push({type:'turnEnd',turn,state:clone(states)});
      if(states.some(e=>e.currentHp===0))break;
    }
    const hp=states.map(e=>e.currentHp),zero=hp.map(n=>n===0);
    const kind=zero.every(Boolean)?'double-knockout':zero.some(Boolean)?'knockout':hp[0]===hp[1]?'draw':'hp';
    const winner=kind==='draw'||kind==='double-knockout'?null:(hp[0]>hp[1]?0:1);
    const result={kind,winner,remainingHp:hp,turns:turns.length};
    const awards=states.map((e,side)=>({side,stars:kind==='draw'?1:winner===side?(kind==='knockout'?3:2):0,
      defeats:kind==='double-knockout'||(winner!==null && winner!==side)?1:0}));
    const deadIds=[],legendIds=[];
    states.forEach((e,side)=>{
      e.stars=Math.min(50,e.stars+awards[side].stars);
      e.defeats=Number(e.defeats||0)+awards[side].defeats;
      if(awards[side].defeats>0 && e.defeats>=DEFEAT_LIMIT){e.status='dead';e.endedAt=now;deadIds.push(e.id);}
      else if(e.stars>=50){e.status='legend';e.endedAt=now;legendIds.push(e.id);}
      e.rulesVersion=RULES_VERSION;e.recordVersion=Number(e.recordVersion||0)+1;e.lastBattleId=battleId;
    });
    // The final combat state retains KO HP; only persisted residents reset between matches.
    const finalState=clone(states);
    const after=states.map(e=>({...e,currentHp:e.maxHp,poisoned:false,cursedSlots:[]}));
    events.push({type:'finish',turn:turns.length,state:finalState,awards,result,deadIds,legendIds});
    return {rulesVersion:RULES_VERSION,defeatLimit:DEFEAT_LIMIT,battleId,battleAt:now,emojinAId:inputA.id,emojinBId:inputB.id,
      ownerNames:[...new Set([inputA.ownerName,inputB.ownerName])],before,after,finalState,turns,events,awards,result,deadIds,legendIds};
  }

  function forced(emojins, rng = Math.random, now = Date.now()) {
    const active = emojins.filter(e => e.status === "active");
    const pair = selectBattlePair(active,'forced',null,active,rng);
    if (pair.length < 2) return { emojins: emojins.map(clone), battles: [] };
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
      const pair = selectBattlePair(active,'forced',null,active,rng);
      if(pair.length<2)break;
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
  const BATTLE_MODES = Object.freeze({
    forced:Object.freeze({cost:100,hatch:1}),
    challenge:Object.freeze({cost:200,hatch:2}),
    mine:Object.freeze({cost:200,hatch:2})
  });
  function battleMode(mode='forced') {
    if(!Object.hasOwn(BATTLE_MODES,mode))throw Error('バトルの種類が不正です。');
    return BATTLE_MODES[mode];
  }
  function battleAnchors(pool,mode,ownerUid,residents=pool) {
    battleMode(mode);
    if(mode==='forced')return pool;
    if(mode==='mine')return pool.filter(e=>!e.isNpc && e.ownerUid===ownerUid);
    // Use the same leaders as the town's star badges, including ties at zero.
    const maxStars=Math.max(0,...residents.map(e=>e.stars));
    return pool.filter(e=>e.stars===maxStars);
  }
  function canBattle(a,b) {
    return !!a && !!b && a.id!==b.id && (a.isNpc || b.isNpc || a.ownerUid==='npc' || b.ownerUid==='npc'
      || !a.ownerUid || a.ownerUid!==b.ownerUid);
  }
  function selectBattlePair(pool,mode,ownerUid,residents=pool,rng=Math.random) {
    const anchors=battleAnchors(pool,mode,ownerUid,residents);
    if(pool.length<2 || !anchors.length)return [];
    const ownerCounts=new Map();
    for(const e of pool)if(!e.isNpc && e.ownerUid!=='npc' && e.ownerUid)ownerCounts.set(e.ownerUid,(ownerCounts.get(e.ownerUid)||0)+1);
    const candidates=anchors.map(e=>({e,count:pool.length-(e.isNpc||e.ownerUid==='npc'||!e.ownerUid?1:ownerCounts.get(e.ownerUid))}))
      .filter(candidate=>candidate.count>0);
    if(!candidates.length)return [];
    let first;
    if(mode==='forced') {
      // Weight the first resident by its opponents so all valid ordered pairs are equally likely.
      let choice=index(rng,candidates.reduce((sum,c)=>sum+c.count,0));
      for(const candidate of candidates){choice-=candidate.count;if(choice<0){first=candidate.e;break;}}
    }else first=candidates[index(rng,candidates.length)].e;
    const others=pool.filter(e=>canBattle(first,e));
    return others.length?[first,others[index(rng,others.length)]]:[];
  }
  function planBattle(all, owners, meta, inputLog, rng = Math.random) {
    const log = clone(inputLog), nextMeta = {...meta};
    if(log.before.length && (log.before.length!==2 || !canBattle(...log.before)))throw Error('同じオーナーのエモジン同士はバトルできません。');
    log.seq = Number(meta.battleSeq || 0) + 1;
    log.ownerUids = [...new Set(log.before.filter(e => !e.isNpc && e.ownerUid !== 'npc').map(e => e.ownerUid))];
    nextMeta.battleSeq = log.seq;
    const ownerUpdates = {};
    log.ownerUids.forEach(uid => {
      if (!owners[uid] || owners[uid].dormant || (owners[uid].unreadBattleIds || []).length >= 7) {
        throw Error('休止中のオーナーのエモジンはバトルに参加できません。');
      }
      const ids = [...new Set([...(owners[uid].unreadBattleIds || []), log.battleId])];
      ownerUpdates[uid] = ownerPresence({...owners[uid], unreadBattleIds: ids}, log.battleAt);
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
      const draft = createDraft(rng, log.battleAt);
      npcs.push({id:log.battleId+'-npc-'+i, emoji:draft.emoji,
        name:Array.from({length:3}, () => kana[index(rng,kana.length)]).join('')+'ン',
        ownerName:'NPC', ownerUid:'npc', isNpc:true, currentHp:draft.maxHp, maxHp:draft.maxHp,
        slots:[...draft.basicSlots,'attack1'], poisoned:false, cursedSlots:[], stars:0,
        defeats:0,rulesVersion:RULES_VERSION,recordVersion:0,lastBattleId:log.battleId,status:'active', createdAt:log.battleAt, endedAt:null});
    }
    const legends = [];
    (log.legendIds || []).forEach(id => {
      nextMeta.legendSeq = Number(nextMeta.legendSeq || 0) + 1;
      legends.push({seq:nextMeta.legendSeq, battleSeq:log.seq, at:log.battleAt,
        emojin:log.after.find(e => e.id === id)});
    });
    return {log, meta:nextMeta, owners:ownerUpdates, emojins:[...log.after,...npcs], npcs, legends};
  }

  const api = { RULES_VERSION, MAX_TURNS, DEFEAT_LIMIT, LEGACY_DEFEAT_LIMIT, resolveTurn, migrateActive, normalizeDraft, recordVersion, battleDocument, INITIAL_MOJI, GENERATION_COSTS, generationCost, DORMANCY_MS, ownerPresence, participatingCount, eligible, BATTLE_MODES, battleMode, battleAnchors, canBattle, selectBattlePair, planBattle, BASIC, SPECIAL, FACES, EMOJIS, accrueMoji, clone, clamp, index, sample, id, createDraft, fromDraft, battle, forced, hourly, seeded };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EmojinEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

/* MOJI SPIN: probabilities and payouts are intentionally fixed, not RTP-adjusted. */
(function(root){
'use strict';
const CONFIG=Object.freeze({
  version:2,
  lineBet:1,
  symbols:Object.freeze([
    {id:'wild',emoji:'🤡',weight:3,payout:256,name:'ワイルド'},
    {id:'smile',emoji:'😄',weight:4,payout:128,name:'7'},
    {id:'gift',emoji:'🎁',weight:6,payout:64,name:'BAR'},
    {id:'bell',emoji:'🔔',weight:9,payout:32,name:'ベル'},
    {id:'melon',emoji:'🍉',weight:11,payout:16,name:'スイカ'},
    {id:'berry',emoji:'🍇',weight:13,payout:8,name:'グレープ'},
    {id:'orange',emoji:'🍊',weight:15,payout:4,name:'オレンジ'},
    {id:'cherry',emoji:'🍒',weight:18,payout:2,name:'チェリー'},
    {id:'blank',emoji:'',weight:21,payout:0,name:'ブランク'}
  ].map(Object.freeze)),
  anyBonus:Object.freeze(Object.fromEntries(Object.entries({
    cherry:{4:4,5:8,6:40,7:160,8:800,9:4000},
    orange:{4:4,5:8,6:60,7:240,8:1200,9:6000},
    berry:{4:4,5:16,6:80,7:320,8:1600,9:8000},
    melon:{4:8,5:24,6:120,7:480,8:2400,9:12000},
    bell:{3:4,4:8,5:32,6:160,7:640,8:3200,9:16000},
    gift:{3:4,4:12,5:60,6:240,7:960,8:4800,9:24000},
    smile:{3:4,4:16,5:80,6:320,7:1280,8:8000,9:32000}
  }).map(([id,payouts])=>[id,Object.freeze(payouts)]))),
  lines:Object.freeze([[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].map(Object.freeze)),
  freeCounts:Object.freeze([{count:4,weight:40},{count:5,weight:30},{count:7,weight:20},{count:10,weight:8},{count:20,weight:2}].map(Object.freeze))
});
const byId=Object.freeze(Object.fromEntries(CONFIG.symbols.map(s=>[s.id,s])));
// Historical payouts are used only for already-drawn v1 rounds, including offline operations.
const LEGACY_PAYOUTS=Object.freeze({wild:400,smile:160,gift:80,bell:50,melon:30,berry:20,orange:14,cherry:10,blank:0});
const legacySymbols=CONFIG.symbols.map(s=>({...s,payout:LEGACY_PAYOUTS[s.id]}));
const BET=CONFIG.lineBet*CONFIG.lines.length;
const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
function weighted(items,rng){let value=rng()*100;for(const item of items){value-=item.weight;if(value<0)return item;}return items[items.length-1];}
function checkCells(cells){
  if(!Array.isArray(cells)||cells.length!==9||Array.from(cells).some(id=>!Object.hasOwn(byId,id)))throw Error('Invalid slot symbols');
}
function evaluateAnyBonus(cells){
  checkCells(cells);
  const wins=[],wildCount=cells.filter(id=>id==='wild').length;
  for(const [symbol,payouts] of Object.entries(CONFIG.anyBonus)){
    const indices=cells.flatMap((id,i)=>id===symbol||id==='wild'?[i]:[]);
    const count=indices.length,payout=payouts[count]||0;
    if(payout)wins.push({symbol,count,naturalCount:count-wildCount,wildCount,indices,payout});
  }
  return {wins,payout:wins.reduce((sum,w)=>sum+w.payout,0),winningCells:[...new Set(wins.flatMap(w=>w.indices))].sort((a,b)=>a-b)};
}
function evaluate(cells,version=CONFIG.version){
  checkCells(cells);
  if(version!==1&&version!==CONFIG.version)throw Error('Unsupported slot rules');
  const wins=[];
  CONFIG.lines.forEach((indices,line)=>{
    const symbols=indices.map(i=>cells[i]);
    if(symbols.includes('blank'))return;
    const match=(version===1?legacySymbols:CONFIG.symbols).filter(s=>s.payout>0&&symbols.every(id=>id==='wild'||id===s.id)).sort((a,b)=>b.payout-a.payout)[0];
    if(match)wins.push({line,indices:[...indices],symbol:match.id,payout:match.payout*CONFIG.lineBet});
  });
  const linePayout=wins.reduce((sum,w)=>sum+w.payout,0);
  if(version===1)return {cells:[...cells],wins,payout:linePayout};
  const any=evaluateAnyBonus(cells);
  const winningCells=[...new Set([...wins.flatMap(w=>w.indices),...any.winningCells])].sort((a,b)=>a-b);
  return {cells:[...cells],wins,linePayout,anyWins:any.wins,anyPayout:any.payout,winningCells,payout:linePayout+any.payout};
}
function roll(free=false,rng=random){
  return {...evaluate(Array.from({length:9},(_,i)=>free&&i===4?'wild':weighted(CONFIG.symbols,rng).id)),free};
}
function createRound(rng=random){
  const first=roll(false,rng);
  const freeCount=first.cells[4]==='wild'?weighted(CONFIG.freeCounts,rng).count:0;
  const spins=[first];for(let i=0;i<freeCount;i++)spins.push(roll(true,rng));
  return {id:'slot-'+crypto.randomUUID(),version:CONFIG.version,bet:BET,freeCount,spins,total:spins.reduce((sum,s)=>sum+s.payout,0),createdAt:Date.now()};
}
function sameResult(expected,actual){
  if(Array.isArray(expected))return Array.isArray(actual)&&expected.length===actual.length&&expected.every((value,i)=>sameResult(value,actual[i]));
  if(expected&&typeof expected==='object'){
    const keys=Object.keys(expected);
    return !!actual&&typeof actual==='object'&&!Array.isArray(actual)&&keys.length===Object.keys(actual).length
      && keys.every(key=>Object.hasOwn(actual,key)&&sameResult(expected[key],actual[key]));
  }
  return expected===actual;
}
function validateRound(round){
  if(!round||![1,CONFIG.version].includes(round.version)||round.bet!==BET||!/^slot-[\w-]+$/.test(round.id)||!Array.isArray(round.spins))throw Error('スロットの抽選データが不正です。');
  if(round.spins.length!==round.freeCount+1||!([0,...CONFIG.freeCounts.map(x=>x.count)].includes(round.freeCount)))throw Error('フリースピン回数が不正です。');
  let total=0;
  round.spins.forEach((spin,i)=>{
    const result=evaluate(spin.cells,round.version);
    if(result.payout!==spin.payout||!sameResult(result.wins,spin.wins)||spin.free!==(i>0)||(i>0&&spin.cells[4]!=='wild'))throw Error('スロットの配当データが不正です。');
    if(round.version===CONFIG.version && ['linePayout','anyPayout','anyWins','winningCells'].some(key=>!sameResult(result[key],spin[key])))throw Error('エニーボーナスの配当データが不正です。');
    total+=result.payout;
  });
  if((round.spins[0].cells[4]==='wild')!==(round.freeCount>0)||total!==round.total)throw Error('スロットの合計が不正です。');
  return round;
}
root.MojiSpinEngine=Object.freeze({CONFIG,BET,byId,weighted,evaluateAnyBonus,evaluate,roll,createRound,validateRound});
})(globalThis);

/* Daily Moji Draw: frontend draw helpers. No storage or presentation. */
(function(root){
  'use strict';
  const CONFIG=Object.freeze({version:1,normalHatchChance:.3,normalMojiMin:30,normalMojiMax:150,rareMojiMin:400,rareMojiMax:600});
  function dayKey(now=Date.now()){return new Date(now+9*3600000).toISOString().slice(0,10);}
  function validateDay(day){
    if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T00:00:00Z'))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)throw Error('くじの日付が正しくありません。');
    return day;
  }
  const integer=(low,high,rng)=>low+Math.min(high-low,Math.floor(rng()*(high-low+1)));
  function createRound(day=dayKey(),rng=Math.random){
    validateDay(day);
    const rewards=Array.from({length:2},()=>rng()<CONFIG.normalHatchChance?{kind:'hatch',amount:1,rare:false}:
      {kind:'moji',amount:integer(CONFIG.normalMojiMin,CONFIG.normalMojiMax,rng),rare:false});
    rewards.push({kind:'moji',amount:integer(CONFIG.rareMojiMin,CONFIG.rareMojiMax,rng),rare:true});
    for(let i=2;i>0;i--){const j=integer(0,i,rng);[rewards[i],rewards[j]]=[rewards[j],rewards[i]];}
    return {version:CONFIG.version,day,rewards};
  }
  function validateRound(round){
    if(!round||round.version!==CONFIG.version||!Array.isArray(round.rewards)||round.rewards.length!==3)throw Error('くじの内容が正しくありません。');
    validateDay(round.day);
    if(round.rewards.filter(r=>r?.rare===true).length!==1)throw Error('レア特典の数が正しくありません。');
    for(const r of round.rewards){
      if(!r||typeof r.rare!=='boolean'||!Number.isInteger(r.amount))throw Error('特典が正しくありません。');
      if(r.rare){if(r.kind!=='moji'||r.amount<CONFIG.rareMojiMin||r.amount>CONFIG.rareMojiMax)throw Error('レア特典が正しくありません。');}
      else if(r.kind==='hatch'){if(r.amount!==1)throw Error('孵化ポイントが正しくありません。');}
      else if(r.kind!=='moji'||r.amount<CONFIG.normalMojiMin||r.amount>CONFIG.normalMojiMax)throw Error('通常特典が正しくありません。');
    }
    return {version:CONFIG.version,day:round.day,rewards:round.rewards.map(({kind,amount,rare})=>({kind,amount,rare}))};
  }
  function validateRecord(record,day){
    if(record?.kind!=='dailyDraw'||!Number.isInteger(record.choice)||record.choice<0||record.choice>2)throw Error('保存済みのくじを確認できませんでした。');
    const round=validateRound(record.round),reward=round.rewards[record.choice];
    if(round.day!==day||record.reward?.kind!==reward.kind||record.reward.amount!==reward.amount||record.reward.rare!==reward.rare
      ||record.moji!==(reward.kind==='moji'?reward.amount:0)||!Number.isInteger(record.hatch)||record.hatch<0||record.hatch>(reward.kind==='hatch'?1:0))throw Error('保存済みの特典が正しくありません。');
    return {...record,round,reward};
  }
  root.DailyMojiDraw=Object.freeze({CONFIG,dayKey,validateDay,createRound,validateRound,validateRecord});
})(globalThis);

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
local.wallet ||= {balance:window.EmojinEngine.INITIAL_MOJI, updatedAt:Date.now()};
local.pending ||= [];
local.hatch = Math.max(0,Math.min(10,Number(local.hatch)||0));
local.hatchPending = Math.max(0,Math.min(local.hatch,Number(local.hatchPending)||0));
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
    const npcs=[],results={};let last={};
    while(local.pending.length) {
      const op=local.pending[0];
      try {last=await retry(()=>writeOperation(op));results[op.id]=last;npcs.push(...(last.npcs || []));}
      catch(error) {
        if(!transient(error) && error.code!=='rules-transition') {
          local.pending=local.pending.filter(x=>x.id!==op.id);persist();
        }
        throw error;
      }
      local.pending=local.pending.filter(x=>x.id!==op.id);persist();
      window.dispatchEvent(new Event('emojin-wallet'));
    }
    return {...last,npcs,results};
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
  const walletRef=()=>ref('wallets',uid);
  const receiptRef=id=>F.doc(db,'wallets',uid,'operations',id);
  const activeQuery=F.query(F.collection(db,'emojins'),F.where('status','==','active'));
  const defaultMeta=()=>({battleSeq:0,legendSeq:0,hour:Math.floor(Date.now()/3600000),runningHour:0,scheduledCount:0});
  const data=s=>s.exists()?s.data():null;
  const decodeLog=s=>JSON.parse(s.data().json);
  let reading=null, archiveCache=null, archiveAt=0, zukanCache=null, zukanAt=0;
  const activeDocs=()=>F.getDocsFromServer(activeQuery);
  async function requireMatchRules(tx) {
    const snap=await tx.get(ref('config','battle')),gate=snap.exists()?snap.data():{};
    if(gate.rulesVersion!==E.RULES_VERSION || gate.defeatLimit!==E.DEFEAT_LIMIT || gate.maintenance!==false) {
      throw Object.assign(Error('バトル方式の切り替え中です。しばらくしてから開き直してください。'),{code:'rules-transition'});
    }
  }
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
    return {version:2, player:local.player || null, wallet:displayedWallet(), draft:local.draft || null,
      ...world,reducedMotion:localStorage.getItem('emojin.online.reducedMotion')==='true'};
  }
  if(auth.currentUser) {
    if(local.uid && local.uid!==auth.currentUser.uid) {delete local.account;local.wallet={balance:E.INITIAL_MOJI,updatedAt:Date.now()};local.draft=null;local.pending=[];local.hatch=0;local.hatchPending=0;}
    uid=auth.currentUser.uid;local.uid=uid;
    local.player ||= {uid,name:'',unreadBattleIds:[],seenBattleSeq:0,seenLegendSeq:0,tutorialSeen:true};
  } else {uid='';delete local.player;local.pending=[];}
  persist();
  let walletReady=null,walletStop=null,walletUid='';
  function applyAccount(value,initial=false) {
    if(!value || value.uid!==uid)return;
    if(!initial && local.account?.uid===uid && Number(value.revision)<Number(local.account.revision))return;
    const prior=local.account?.uid===uid?local.account.hatch:value.hatch;
    local.account=E.clone(value);
    if(value.draft && local.draft?.id===value.draft.id) {
      local.draft={...local.draft,maxHp:value.draft.maxHp,rulesVersion:value.draft.rulesVersion};
    }
    local.hatch=value.hatch||0;
    if(!initial && local.hatch>prior)local.hatchPending=Math.min(local.hatch,(local.hatchPending||0)+local.hatch-prior);
    local.hatchPending=Math.min(local.hatch,local.hatchPending||0);
    persist();window.dispatchEvent(new Event('emojin-wallet'));
  }
  function displayedWallet() {
    let wallet=E.accrueMoji(local.account?.uid===uid?local.account.wallet:local.wallet,Date.now());
    const applied=local.account?.recentOperations||[];
    for(const op of local.pending)if(op.data.uid===uid && op.action==='walletReward' && !applied.includes(op.id)) {
      wallet={...wallet,balance:wallet.balance+Math.max(0,Math.min(op.data.amount,3000-wallet.balance))};
    }
    local.wallet=wallet;return wallet;
  }
  function nextAccount(account,patch={},operationId=null) {
    return {...account,...patch,revision:Number(account.revision||0)+1,
      recentOperations:operationId?[...(account.recentOperations||[]).filter(id=>id!==operationId),operationId].slice(-64):(account.recentOperations||[])};
  }
  function ensureWallet() {
    if(walletReady && walletUid===uid)return walletReady;
    walletUid=uid;
    const ownerUid=uid,accountRef=walletRef();
    walletReady=retry(()=>F.runTransaction(db,async tx=>{
      const snap=await tx.get(accountRef);
      if(snap.exists())return snap.data();
      await requireMatchRules(tx);
      // Import only once, and only from the device that already belongs to this owner.
      const migrate=local.uid===ownerUid;
      const value={uid:ownerUid,wallet:migrate?local.wallet:{balance:E.INITIAL_MOJI,updatedAt:Date.now()},
        hatch:migrate?local.hatch:0,draft:migrate&&local.draft?{...local.draft,paid:true}:null,
        revision:1,recentOperations:[]};
      tx.set(accountRef,value);return value;
    }),true).then(value=>{
      if(uid!==ownerUid)return;
      applyAccount(value,true);
      if(value.draft && local.draft?.id!==value.draft.id)local.draft=E.clone(value.draft);
      else if(value.draft)local.draft={...local.draft,maxHp:value.draft.maxHp,rulesVersion:value.draft.rulesVersion};
      if(!value.draft && !local.draft?.chosen)local.draft=null;
      persist();
      if(walletStop)walletStop();
      walletStop=F.onSnapshot(accountRef,snap=>{
        if(uid===ownerUid && !snap.metadata.fromCache && snap.exists())applyAccount(snap.data());
      },error=>console.warn('Wallet subscription',error));
      return value;
    }).catch(error=>{walletReady=null;throw error;});
    return walletReady;
  }
  writeOperation=async op=>{
    if(!auth.currentUser || op.data.uid!==uid)throw Error('オーナーログインが必要です。');
    await ensureWallet();
    const result=await F.runTransaction(db,async tx=>{
      const accountRef=walletRef(),accountSnap=await tx.get(accountRef),account=accountSnap.data();
      if(op.action==='slotSpin') {
        const receipt=receiptRef(op.id),existing=await tx.get(receipt);
        if(existing.exists()) {
          const record=existing.data();
          if(record.redirect){const original=await tx.get(receiptRef(record.redirect));return {ok:true,record:original.data(),account};}
          return {ok:true,record,account};
        }
        if(account.slotRound) {
          const active=await tx.get(receiptRef(account.slotRound));
          if(!active.exists())throw Error('保存済みのスピンが見つかりません。');
          tx.set(receipt,{redirect:account.slotRound,at:Date.now()});
          return {ok:true,record:active.data(),account};
        }
        await requireMatchRules(tx);
        const round=window.MojiSpinEngine.validateRound(op.data.round);
        const wallet=E.accrueMoji(account.wallet,Date.now());
        if(wallet.balance<round.bet)throw Error(`${round.bet}モジ必要です。`);
        const balanceBefore=wallet.balance;
        // Payouts are never clipped by the passive recovery cap.
        wallet.balance=wallet.balance-round.bet+round.total;
        const record={round,balanceBefore,balanceAfter:wallet.balance,at:Date.now()};
        const next=nextAccount(account,{wallet,slotRound:round.id},op.id);
        tx.set(accountRef,next);tx.set(receipt,record);
        return {ok:true,record,account:next};
      }
      if(op.action==='dailyDraw') {
        const receipt=receiptRef(op.id),existing=await tx.get(receipt);
        if(existing.exists()) {
          const record=existing.data();if(record.kind!=='dailyDraw')throw Error('くじの保存内容を確認してください。');
          return {ok:true,record,account};
        }
        await requireMatchRules(tx);
        const round=window.DailyMojiDraw.validateRound(op.data.round),choice=op.data.choice;
        if(op.id!=='daily-'+round.day || !Number.isInteger(choice) || choice<0 || choice>2)throw Error('くじの選択が正しくありません。');
        const reward=round.rewards[choice],wallet=E.accrueMoji(account.wallet,Date.now());
        const moji=reward.kind==='moji'?reward.amount:0,hatch=reward.kind==='hatch'?Math.max(0,Math.min(1,10-account.hatch)):0;
        wallet.balance+=moji;
        const next=nextAccount(account,{wallet,hatch:account.hatch+hatch},op.id);
        const record={kind:'dailyDraw',round,choice,reward,moji,hatch,at:Date.now()};
        tx.set(accountRef,next);tx.set(receipt,record);
        return {ok:true,record,account:next};
      }
      if(op.action==='walletReward') {
        const receipt=receiptRef(op.id),existing=await tx.get(receipt);
        if(existing.exists())return {...existing.data(),account};
        await requireMatchRules(tx);
        const wallet=E.accrueMoji(account.wallet,Date.now());
        const reward=Math.max(0,Math.min(op.data.amount,3000-wallet.balance));
        wallet.balance+=reward;
        const next=nextAccount(account,{wallet},op.id);
        tx.set(accountRef,next);tx.set(receipt,{reward,at:Date.now()});
        return {ok:true,reward,account:next};
      }
      // The wallet and the world change are committed together.
      const metaSnap=await tx.get(metaRef),meta=data(metaSnap)||defaultMeta();
      if(op.action==='createEmojin') {
        const candidate=op.data.emojin,eRef=ref('emojins',candidate.id),existing=await tx.get(eRef);
        if(existing.exists())return {ok:true,emojin:existing.data(),account,npcs:[]};
        await requireMatchRules(tx);
        const draft=account.draft;
        if(!draft || draft.id!==candidate.id)throw Error('生成内容が更新されています。アプリを開き直してください。');
        if(!draft.offers.includes(op.data.chosen || candidate.slots[5]))throw Error('特殊能力を選び直してください。');
        const chosen=op.data.chosen || candidate.slots[5];
        const e={...E.fromDraft(draft,candidate.name,candidate.ownerName,chosen,candidate.createdAt),ownerUid:uid,isNpc:false};
        const next=nextAccount(account,{draft:null,hatch:draft.payment==='hatch'?0:account.hatch},op.id);
        tx.set(eRef,e);tx.set(accountRef,next);
        tx.set(metaRef,{...meta,revision:Number(meta.revision||0)+1});
        return {ok:true,emojin:e,account:next,npcs:[]};
      }
      if(op.action!=='battle')throw Error('Unknown operation');
      const req=op.data.battleRequest,logRef=ref('battles',req.battleId);
      const existing=await tx.get(logRef);
      if(existing.exists())return {ok:true,seq:existing.data().seq,log:JSON.parse(existing.data().json),account,npcs:[]};
      await requireMatchRules(tx);
      if(req.rulesVersion!==E.RULES_VERSION || req.defeatLimit!==E.DEFEAT_LIMIT) {
        return {ok:true,cancelled:true,account,npcs:[]};
      }
      const mode=req.mode||'forced',rules=E.battleMode(mode);
      if(mode!=='forced' && op.data.walletVersion!==2)throw Error('バトルの支払い情報が不正です。');
      const wallet=E.accrueMoji(account.wallet,Date.now());
      if(req.ids.length!==2 || req.ids[0]===req.ids[1])throw Error('異なる2体のエモジンが必要です。');
      const pairSnaps=await Promise.all(req.ids.map(id=>tx.get(ref('emojins',id))));
      const pair=pairSnaps.map(data);
      if(pair.length===2 && pair.every(Boolean) && !E.canBattle(...pair)) {
        return {ok:true,cancelled:true,cancelReason:'同じオーナー同士の未保存バトルは未課金で取り消しました。',account,npcs:[]};
      }
      if(op.data.walletVersion===2 && wallet.balance<rules.cost)throw Error(`${rules.cost}モジ必要です。`);
      const version=E.recordVersion;
      if(pair.some((e,i)=>!e || e.status!=='active' || JSON.stringify(version(e))!==JSON.stringify(req.expected[i]))) {
        throw Error('別のバトルで状態が変わりました。画面を更新してください。');
      }
      if(pair.some(e=>e.rulesVersion!==E.RULES_VERSION))throw Error('エモジンの移行が完了していません。');
      const ownerIds=[...new Set(pair.filter(e=>!e.isNpc && e.ownerUid!=='npc').map(e=>e.ownerUid))];
      const ownerSnaps=await Promise.all(ownerIds.map(id=>tx.get(ref('owners',id))));
      const owners=Object.fromEntries(ownerIds.map((id,i)=>[id,data(ownerSnaps[i])]));
      const freshPool=(await activeDocs()).docs.map(s=>s.data());
      if(mode!=='forced') {
        const dormant=new Set(meta.dormantOwnerUids||[]);
        const excluded=new Set([...(meta.suspendedOwnerUids||[]),...dormant]);
        const residents=freshPool.filter(e=>e.isNpc || !dormant.has(e.ownerUid));
        const pool=residents.filter(e=>e.isNpc || !excluded.has(e.ownerUid));
        if(!pool.some(e=>e.id===pair[1].id) || !E.battleAnchors(pool,mode,uid,residents).some(e=>e.id===pair[0].id)) {
          throw Error(mode==='challenge'?'チャンピオンが変わったか、バトルに参加できません。もう一度お試しください。':'マイエモジンがバトルに参加できません。');
        }
      }
      const log=E.battle(pair[0],pair[1],E.seeded(req.seed),req.at,req.battleId);
      log.seed=req.seed;log.source=req.mode||'forced';
      const plan=E.planBattle(freshPool,owners,meta,log,E.seeded(req.seed^0x4e5043));
      if(op.data.walletVersion===2)wallet.balance-=rules.cost;
      const next=nextAccount(account,{wallet,hatch:op.data.hatchReward?Math.min(10,account.hatch+rules.hatch):account.hatch},op.id);
      plan.emojins.forEach(e=>tx.set(ref('emojins',e.id),e));
      tx.set(logRef,E.battleDocument(plan.log));
      Object.entries(plan.owners).forEach(([id,owner])=>tx.update(ref('owners',id),{unreadBattleIds:owner.unreadBattleIds,suspended:owner.suspended,suspendedAt:owner.suspendedAt,lastAccessAt:owner.lastAccessAt,dormant:owner.dormant}));
      plan.legends.forEach(l=>tx.set(ref('legends',String(l.seq)),{seq:l.seq,json:JSON.stringify(l)}));
      tx.set(metaRef,{...plan.meta,revision:Number(meta.revision||0)+1});tx.set(accountRef,next);
      return {ok:true,seq:plan.log.seq,log:plan.log,npcs:plan.npcs,legends:plan.legends,account:next};
    });
    applyAccount(result.account);
    if(result.cancelled) {
      local.upgradeNotice=result.cancelReason||'旧方式の未保存バトルは未課金で取り消しました。';
      local.cancelledOperations=[...(local.cancelledOperations||[]).filter(item=>item.id!==op.id),{...op,reason:local.upgradeNotice}].slice(-64);
      persist();window.dispatchEvent(new Event('emojin-operation-cancelled'));
    }
    return result;
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
  if(auth.currentUser)ensureWallet().then(resumeWrites).catch(console.warn);
  async function credentials(name,password) {
    const key=String(name).normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('ja');
    return {email:(await hashText(key))+'@owners.emojin.invalid',password:await hashText(password)};
  }
  async function installOwner(name,credential,registering) {
    const user=credential.user;
    if(local.uid && local.uid!==user.uid){delete local.account;local.wallet={balance:E.INITIAL_MOJI,updatedAt:Date.now()};local.draft=null;local.pending=[];local.hatch=0;local.hatchPending=0;}
    if(uid!==user.uid){lastTouch=0;accessSnapshot=null;delete local.revivalPending;}
    uid=user.uid;local.uid=uid;
    const owner=await retry(()=>F.runTransaction(db,async tx=>{
      const ownerRef=ref('owners',uid),snap=await tx.get(ownerRef);
      if(snap.exists())return snap.data();
      if(!registering)throw Error('オーナー情報がありません。登録から同じ名前とパスワードで再試行してください。');
      await requireMatchRules(tx);
      const accountRef=walletRef(),accountSnap=await tx.get(accountRef);
      const metaSnap=await tx.get(metaRef),meta=data(metaSnap)||defaultMeta();
      const value={uid,name,createdAt:Date.now(),unreadBattleIds:[],suspended:false,suspendedAt:0,dormant:false,lastAccessAt:Date.now(),
        tutorialSeen:false,seenBattleSeq:meta.battleSeq||0,seenLegendSeq:meta.legendSeq||0};
      tx.set(ownerRef,value);
      // New owners start with the current grant, never a stale pre-login wallet.
      if(!accountSnap.exists())tx.set(accountRef,{uid,wallet:{balance:E.INITIAL_MOJI,updatedAt:Date.now()},hatch:0,draft:null,revision:1,recentOperations:[]});
      return value;
    }));
    local.player=owner;persist();await ensureWallet();return {uid,name:owner.name};
  }
  return {
    takeUpgradeNotice(){const message=local.upgradeNotice;delete local.upgradeNotice;persist();return message;},
    get revivalPending(){return !!local.revivalPending && local.revivalPending.uid===uid;},
    completeRevival(){delete local.revivalPending;persist();},
    get canReload(){return !local.pending.length && !flushing;},
    get uid(){return uid;},get player(){return local.player||null;},get wallet(){return displayedWallet();},
    get hatch(){return local.hatch;},
    get hatchPending(){return local.hatchPending;},
    revealHatch(){local.hatchPending=Math.max(0,local.hatchPending-1);persist();},
    saveDraft(value){if(value?.id===local.draft?.id){local.draft=E.clone(value);persist();}},
    addLoot(amount,id){const task=enqueue('walletReward',{uid,amount},id);task.catch(()=>resumeWrites());return task;},
    get slotPending(){return !!local.account?.slotRound || local.pending.some(op=>op.action==='slotSpin'&&op.data.uid===uid);},
    async getDailyDraw(day){
      window.DailyMojiDraw.validateDay(day);
      await ensureWallet();await flush();
      const snap=await F.getDocFromServer(receiptRef('daily-'+day));
      if(!snap.exists())return null;
      const record=snap.data();if(record.kind!=='dailyDraw')throw Error('くじの保存内容を確認してください。');
      return record;
    },
    async claimDailyDraw(round,choice){
      window.DailyMojiDraw.validateRound(round);
      const id='daily-'+round.day,data={uid,round,choice};
      const result=await enqueue('dailyDraw',data,id);
      const saved=result.results?.[id] || await retry(()=>writeOperation({action:'dailyDraw',data,id}));
      if(!saved.record)throw Error('くじの保存結果を確認できませんでした。');
      return saved.record;
    },
    async getSlotRound(){
      await ensureWallet();await flush();
      const snap=await F.getDocFromServer(walletRef());applyAccount(snap.data());
      const id=snap.data().slotRound;if(!id)return null;
      const saved=await F.getDocFromServer(receiptRef(id));
      if(!saved.exists())throw Error('保存済みのスピンが見つかりません。');
      return saved.data();
    },
    async spinSlot(round){
      window.MojiSpinEngine.validateRound(round);
      const result=await enqueue('slotSpin',{uid,round},round.id);
      // The committed transaction already contains the authoritative round.
      // Never re-read the wallet to discover a result we have just saved.
      const saved=result.results?.[round.id] || await retry(()=>writeOperation({action:'slotSpin',data:{uid,round},id:round.id}));
      if(!saved.record?.round)throw Error('スピン結果を確認できませんでした。');
      return saved.record;
    },
    async finishSlot(id){
      const account=await retry(()=>F.runTransaction(db,async tx=>{
        const accountRef=walletRef(),snap=await tx.get(accountRef),old=snap.data();
        if(old.slotRound!==id)return old;
        await requireMatchRules(tx);
        const next=nextAccount(old,{slotRound:null});tx.set(accountRef,next);return next;
      }));
      applyAccount(account);
    },
    async getState(){
      if(reading)return reading;
      if(!auth.currentUser)return compose();
      reading=retry(async()=>{
        await ensureWallet();
        const canonicalDraft=local.account?.draft;
        if(canonicalDraft && canonicalDraft.id!==local.draft?.id)local.draft=E.clone(canonicalDraft);
        else if(canonicalDraft)local.draft={...local.draft,maxHp:canonicalDraft.maxHp,rulesVersion:canonicalDraft.rulesVersion};
        else if(!canonicalDraft && !local.draft?.chosen)local.draft=null;
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
    async getAnnouncements(){
      if(!auth.currentUser)throw Error('オーナーログインが必要です。');
      const snap=await retry(()=>F.getDocsFromServer(F.query(F.collection(db,'announcements'),F.where('published','==',true))));
      return snap.docs.map(doc=>{
        const value=doc.data(),publishedAt=value.publishedAt?.toMillis?.();
        return {body:typeof value.body==='string'?value.body.trim():'',publishedAt,published:value.published};
      }).filter(item=>item.published===true && item.body && Number.isFinite(item.publishedAt) && item.publishedAt>=0)
        .sort((a,b)=>b.publishedAt-a.publishedAt).map(({body,publishedAt})=>({body,publishedAt}));
    },
    async getGeneratedEmojis(){
      return [...new Set((await this.getGeneratedEmojins()).map(e=>e.emoji))];
    },
    async getGeneratedEmojins(){
      const ownerUid=uid;
      if(!auth.currentUser || !ownerUid)throw Error('オーナーログインが必要です。');
      if(zukanCache?.uid===ownerUid && Date.now()-zukanAt<30000)return E.clone(zukanCache.emojins);
      // Query every owned record, including graves and legends beyond the archive's 200-item limit.
      const snap=await retry(()=>F.getDocsFromServer(F.query(F.collection(db,'emojins'),F.where('ownerUid','==',ownerUid))));
      if(uid!==ownerUid)throw Error('オーナーが変更されました。開き直してください。');
      const known=new Set(E.EMOJIS);
      const emojins=snap.docs.map(s=>s.data()).filter(e=>e.ownerUid===ownerUid && !e.isNpc && known.has(e.emoji));
      zukanCache={uid:ownerUid,emojins};zukanAt=Date.now();return E.clone(emojins);
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
    async startDraft(){
      await ensureWallet();await flush();
      const candidate=E.createDraft(Math.random,Date.now());
      const account=await retry(()=>F.runTransaction(db,async tx=>{
        const accountRef=walletRef(),snap=await tx.get(accountRef),old=snap.data();
        await requireMatchRules(tx);
        if(old.draft)return old;
        const wallet=E.accrueMoji(old.wallet,Date.now()),free=old.hatch>=10;
        let cost=0;
        if(!free) {
          // Creation and battles update meta; reading it makes population changes retry this reservation.
          await tx.get(metaRef);
          const emojins=(await activeDocs()).docs.map(s=>s.data());
          cost=E.generationCost(emojins,uid);
          if(wallet.balance<cost)throw Error(`${cost}モジ必要です。`);
          wallet.balance-=cost;
        }
        const value=nextAccount(old,{wallet,draft:{...candidate,payment:free?'hatch':'moji',cost,paid:true}});
        tx.set(accountRef,value);return value;
      }));
      applyAccount(account);local.draft=E.clone(account.draft);persist();
      return {draft:local.draft,wallet:displayedWallet()};
    },
    chooseSpecial({name,chosen}){
      if(!local.draft?.offers.includes(chosen))throw Error('特殊能力を選び直してください。');
      local.draft={...local.draft,name,chosen,stage:'reels'};persist();
      const e={...E.fromDraft(local.draft,name,local.player.name,chosen,Date.now()),ownerUid:uid,isNpc:false};
      enqueue('createEmojin',{uid,emojin:e,chosen},'create-'+e.id).catch(error=>{console.warn(error);resumeWrites();});
      return local.draft;
    },
    async finishDraft({draftId}){
      if(local.draft?.id!==draftId)throw Error('生成内容がありません。');
      const d=local.draft,e={...E.fromDraft(d,d.name,local.player.name,d.chosen,Date.now()),ownerUid:uid,isNpc:false};
      const result=await enqueue('createEmojin',{uid,emojin:e,chosen:d.chosen},'create-'+e.id);
      const saved=await F.getDocFromServer(ref('emojins',e.id));
      if(!saved.exists())throw Error('生成の保存を再試行してください。');
      local.draft=null;persist();archiveAt=0;zukanCache=null;return saved.data();
    },
    saveBattle(request){archiveAt=0;return enqueue('battle',{uid,battleRequest:request,hatchReward:true,walletVersion:2},'battle-'+request.battleId);}

  };
}

createCloud().then(cloud=>{
  window.EmojinCloud=cloud;
/* Emojin online UI: shared Firestore world and wallet, local animations. */
(function () {
"use strict";
const E = window.EmojinEngine;
const $ = id => document.getElementById(id);
const cloud = window.EmojinCloud;
const HOUR = 3600000;
const MOJI_CAP = 3000, BATTLE_COST = E.BATTLE_MODES.forced.cost;
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
let wander = new Map(), canvasW = 0, canvasH = 0, priorFrame = 0;
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
  $("skipButton").disabled = true;
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
  store.wallet=cloud.wallet;
  return store.wallet.balance;
}
function save() {
  cloud.saveDraft(store.draft);
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
/* Announcement read state is one local timestamp, never a per-message/owner database write. */
const ANNOUNCEMENTS_READ_KEY='emojin.announcements.openedAt.'+FIREBASE_CONFIG.projectId;
let announcementItems=[],announcementReadAt=readAnnouncementTime(),announcementRequest=null,announcementCheckedAt=0;
function readAnnouncementTime() {
  try {const value=Number(localStorage.getItem(ANNOUNCEMENTS_READ_KEY));return Number.isFinite(value)&&value>=0?value:0;}
  catch{return 0;}
}
function renderAnnouncementButton() {
  const button=$('announcementsButton');
  const unread=announcementItems.some(item=>item.publishedAt>=announcementReadAt);
  button.classList.toggle('has-unread',unread);
  button.setAttribute('aria-label',unread?'お知らせ（未読あり）':'お知らせ');
  button.disabled=!store?.player || busy || !!playback;
}
async function refreshAnnouncements(force=false) {
  if(!store?.player)return [];
  if(announcementRequest) {
    if(!force)return announcementRequest;
    // Opening must not reuse a snapshot taken before the recorded opening time.
    while(announcementRequest)await announcementRequest.catch(()=>{});
  }
  if(!force && announcementCheckedAt && Date.now()-announcementCheckedAt<60000)return announcementItems;
  announcementCheckedAt=Date.now();
  const request=cloud.getAnnouncements().then(items=>{
    announcementItems=items;renderAnnouncementButton();return items;
  });
  announcementRequest=request;
  try{return await request;}finally{if(announcementRequest===request)announcementRequest=null;}
}
async function showAnnouncements() {
  if(busy || playback || modalKind || !store?.player)return;
  const openedAt=Date.now(),previousReadAt=announcementReadAt;
  openModal('<h2 class="announcements-heading">お知らせ</h2><div class="announcements-content"><div class="announcement-status" role="status">読み込み中…</div></div>',
    'お知らせ',{panelClass:'announcements-panel'});
  const revision=modalRevision;
  const content=$('modalHost').querySelector('.announcements-content');
  try {
    const items=await refreshAnnouncements(true);
    if(revision!==modalRevision || modalClosing || !content.isConnected)return;
    content.innerHTML=items.length?`<ul class="announcement-list">${items.map(item=>`<li class="announcement-item${item.publishedAt>=previousReadAt?' is-unread':''}"><p>${esc(item.body)}</p></li>`).join('')}</ul>`
      :'<p class="announcement-status">お知らせはありません。</p>';
    // Keep this opening's unread emphasis; only future openings use the saved timestamp.
    announcementReadAt=Math.max(openedAt,announcementReadAt,readAnnouncementTime());
    try{localStorage.setItem(ANNOUNCEMENTS_READ_KEY,String(announcementReadAt));}catch(error){console.warn('Announcement read time',error);}
    renderAnnouncementButton();
  } catch(error) {
    if(revision!==modalRevision || modalClosing || !content.isConnected)return;
    content.innerHTML='<p class="announcement-status" role="status">お知らせを読み込めませんでした。<br>閉じて、もう一度お試しください。</p>';
    console.warn('Announcements',error);
  }
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
  return `<span class="star-badge ${legend?"legend":""}" role="img" aria-label="星 ${n}"><svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,5 66,31 95,37 76,59 79,91 50,77 21,91 24,59 5,37 34,31"></polygon><text x="50" y="63">${Number(n)}</text></svg></span>`;
}
function recordBadge(e) {
  const defeats=Math.max(0,Number(e.defeats||0));
  return `<span class="record-badge">${star(e.stars,e.status==='legend')}<span class="defeat-record" role="img" aria-label="敗北 ${defeats} 回"><span class="defeat-skull" aria-hidden="true">💀</span><span aria-hidden="true">×${defeats}</span></span></span>`;
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
  closeBattleMenu();
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
  if(modalKind==='MOJI SPIN'){slotSession=null;document.body.classList.remove('moji-spin-open');}
  modalClosing=true;
  const rev=modalRevision,host=$("modalHost"),ret=modalReturn&&!force?modalReturn:null;
  host.classList.add("is-closing");
  await Promise.all([closePopover(),hideLayer(host,host.querySelector(".modal-panel"))]);
  if(rev!==modalRevision)return; // An opening modal must never be removed by an older close.
  modalClosing=false;modalReturn=null;modalKind=null;host.classList.remove("is-closing");
  host.classList.add("hidden");host.innerHTML="";
  if(ret){showArchive(ret.status,ret.filter);return;}
  if(oldFocus&&oldFocus.isConnected)oldFocus.focus({preventScroll:true});
  if(!force)maybeDailyDraw().catch(error=>console.warn('Daily draw',error));
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
function openDetailOverlay(html,legend=false) {
  closePopover(true);
  detailClosing=false;
  detailReturnFocus=document.activeElement;
  const host=$("detailHost");
  $("modalHost").inert=true;
  host.innerHTML=`<div class="modal-backdrop"></div><section class="modal-panel detail-panel${legend?' legend-detail-panel':''}" tabindex="-1" role="dialog" aria-modal="true" aria-label="エモジン">${html}</section>`;
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
function detailContent(e) {
  const tag=my(e)?"マイ エモジン":"";
  const when=e.status==="dead"?`🪦 ${dateText(e.endedAt)}`:e.status==="legend"?`🏆 ${dateText(e.endedAt)}`:"";
  return `<div class="detail-star">${recordBadge(e)}</div>
    <h2 class="detail-name">${esc(e.name)}</h2><div class="my-tag">${tag}</div>
    ${emojiVisual(e)}<div class="hp-detail">${hearts(e)}</div>
    <div class="slots-row">${slotRow(e)}</div>
    <div class="owner-line detail-owner">オーナー：${esc(e.ownerName)}</div>
    ${when?`<div class="detail-date">${when}</div>`:""}`;
}
function showDetail(e, ret=null) {
  const content=detailContent(e);
  if($("modalHost").querySelector(".archive-panel")){openDetailOverlay(content,e.status==='legend');return;}
  modalReturn=ret;
  openModal(content,"エモジン",{panelClass:e.status==='legend'?"detail-panel legend-detail-panel":"detail-panel",tapToClose:true});
}
function archiveAtmosphere() {
  const gold=Array.from({length:12},(_,i)=>`<i class="archive-gold-piece" style="--x:${4+(i*31)%91}%;--drift:${(i%2?1:-1)*(10+i%4*4)}px;--fall:${8+i%5}s;--delay:-${i*1.3}s;--twirl:${2+i%3*.7}s"></i>`).join('');
  const spirits=['👻','🦇','👻','🦇'].map((emoji,i)=>`<span class="archive-spirit" style="--x:${[12,72,28,82][i]}%;--y:${[16,37,62,82][i]}%;--float:${8+i*1.7}s;--delay:-${i*2.7}s">${emoji}</span>`).join('');
  return `<div class="archive-atmosphere" aria-hidden="true"><div class="archive-gold">${gold}</div><div class="archive-haunt">${spirits}</div></div>`;
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
  const tabs=[{key:"active",name:"👤"},{key:"legend",name:"🏆"},{key:"dead",name:"🪦"},{key:"zukan",name:"📕"}];
  const chosen=tabs.findIndex(t=>t.key===status),index=chosen<0?0:chosen;
  const panes=tabs.map(tab=>{
    if(tab.key==='zukan')return '<div class="archive-pane" role="tabpanel" id="pane-zukan"><div class="archive-loading"><div class="loader"></div></div></div>';
    const emojins=store.emojins.filter(e=>e.status===tab.key&&(tab.key!=="active"||my(e))&&(tab.key!=="dead"||!e.isNpc))
      .sort((a,b)=>tab.key==="active"?b.createdAt-a.createdAt:b.endedAt-a.endedAt);
    const entries=emojins.map(e=>`<button class="archive-entry" data-emojin-id="${e.id}" data-return-status="${tab.key}"><span class="archive-emoji">${e.emoji}</span><span><h3>${esc(e.name)}</h3><span class="owner-line">${tab.key==="active"?`HP ${e.currentHp} / ${e.maxHp}`:`オーナー：${esc(e.ownerName)}`}</span></span>${recordBadge(e)}<span class="archive-arrow">${nextSvg()}</span></button>`).join("");
    return `<div class="archive-pane" role="tabpanel" id="pane-${tab.key}"><div class="archive-list">${entries||'<div class="archive-empty">エモジンはいない</div>'}</div></div>`;
  }).join("");
  openModal(`${archiveAtmosphere()}<button class="archive-close" data-close-modal="true" aria-label="閲覧を閉じる">${closeSvg()}</button>
    <h2 class="archive-heading" aria-live="polite"></h2>
    <div class="archive-tabs" role="tablist">${tabs.map((t,i)=>`<button class="archive-tab ${i===index?"selected":""}" role="tab" tabindex="${i===index?0:-1}" aria-selected="${i===index}" aria-controls="pane-${t.key}" data-archive-tab="${t.key}" aria-label="${t.key==='zukan'?'ズカン':t.name}">${t.name}</button>`).join("")}</div>
    <div class="archive-viewport"><div class="archive-track" style="transform:translateX(-${index*100}%)">${panes}</div></div>`,
    "エモジンを閲覧",{panelClass:"archive-panel",hideClose:true});
  switchArchiveTab($("modalHost").querySelector(".archive-panel"),tabs[index].key);
}

async function loadZukan(panel) {
  const pane=panel.querySelector('#pane-zukan');
  if(!pane || ['loading','loaded'].includes(pane.dataset.zukanState))return;
  pane.dataset.zukanState='loading';
  pane.innerHTML='<div class="archive-loading"><div class="loader"></div></div>';
  try {
    const emojins=await cloud.getGeneratedEmojins(),generated=new Set(emojins.map(e=>e.emoji));
    if(!panel.isConnected)return;
    pane.zukanEmojins=emojins;
    pane.innerHTML=`<div class="zukan-grid" role="list" aria-label="生成した絵文字">${E.EMOJIS.map(emoji=>{
      const unlocked=generated.has(emoji);
      return `<span class="zukan-cell${unlocked?'':' is-locked'}" role="listitem" aria-label="${unlocked?esc(emoji):'未生成'}">${unlocked?`<button type="button" data-zukan-emoji="${esc(emoji)}" aria-label="${esc(emoji)}のエモジンを見る" aria-haspopup="dialog">${emoji}</button>`:'🥚'}</span>`;
    }).join('')}</div>`;
    pane.dataset.zukanState='loaded';
  } catch(error) {
    if(!panel.isConnected)return;
    pane.dataset.zukanState='error';pane.innerHTML='<div class="archive-empty">ズカンを読み込めませんでした。</div>';
    console.warn('Zukan',error);
  }
}
function showZukanDetail(button) {
  const pane=button.closest('#pane-zukan');
  const emojins=(pane?.zukanEmojins||[]).filter(e=>e.emoji===button.dataset.zukanEmoji && my(e) && !e.isNpc)
    .sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)||String(a.id).localeCompare(String(b.id)));
  if(!emojins.length)return;
  let index=0;
  function render(first=false,focus=null) {
    const e=emojins[index];
    if(first)showDetail(e);
    const panel=$('detailHost').querySelector('.detail-panel');
    if(!panel)return;
    if(!first){panel.innerHTML=detailContent(e);panel.classList.toggle('legend-detail-panel',e.status==='legend');panel.scrollTop=0;}
    if(emojins.length<2)return;
    panel.insertAdjacentHTML('beforeend',`<button type="button" class="zukan-detail-nav zukan-detail-prev" aria-label="前のエモジン" ${index===0?'disabled':''}>◀</button><button type="button" class="zukan-detail-nav zukan-detail-next" aria-label="次のエモジン" ${index===emojins.length-1?'disabled':''}>▶</button>`);
    for(const [selector,step] of [['.zukan-detail-prev',-1],['.zukan-detail-next',1]]){
      panel.querySelector(selector).onclick=event=>{event.stopPropagation();index=E.clamp(index+step,0,emojins.length-1);render(false,selector);};
    }
    if(focus){const target=panel.querySelector(focus);(target.disabled?panel.querySelector('.zukan-detail-nav:not(:disabled)'):target).focus({preventScroll:true});}
  }
  render(true);
}
function switchArchiveTab(panel,key) {
  if(!panel)return;
  const keys=['active','legend','dead','zukan'],index=keys.indexOf(key);if(index<0)return;
  panel.dataset.activeTab=key;
  panel.querySelector('.archive-heading').textContent={active:'マイエモジン',legend:'レジェンド',dead:'ボチ',zukan:'ズカン'}[key];
  panel.querySelector('.archive-track').style.transform=`translateX(-${index*100}%)`;
  panel.querySelectorAll('.archive-tab').forEach(button=>{
    const selected=button.dataset.archiveTab===key;
    button.classList.toggle('selected',selected);button.setAttribute('aria-selected',String(selected));
    button.tabIndex=selected?0:-1;
  });
  panel.querySelectorAll('.archive-pane').forEach((pane,i)=>{
    pane.inert=i!==index;pane.setAttribute('aria-hidden',String(i!==index));
  });
  if(key==='zukan')loadZukan(panel);
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
      renderCity();refreshNav();refreshAnnouncements(true).catch(error=>console.warn('Announcements',error));
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
      'バトルは最大10ターン。',
      '💀が3つになるとボチへ。'
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
    dailyTutorialDoneUid=cloud.uid;
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


/* Daily entry event. Date checks and presentation are frontend-only; receipts settle once. */
const DAILY=window.DailyMojiDraw;
let dailyChecking=false,dailyAttemptedDay='',dailyFailedAt=0,dailyVesselSerial=0,dailyTutorialDoneUid='';
function dailyStorageKey(){return 'emojin.dailyMoji.'+FIREBASE_CONFIG.projectId+'.'+cloud.uid;}
function readDailyState(day){
  try {
    const state=JSON.parse(localStorage.getItem(dailyStorageKey())||'null');
    if(state?.day!==day)return null;
    if(state.phase==='done')return {day,phase:'done'};
    state.round=DAILY.validateRound(state.round);
    if(state.round.day!==day || (state.choice!==null && (!Number.isInteger(state.choice)||state.choice<0||state.choice>2)))return null;
    return state;
  }catch{return null;}
}
function saveDailyState(state){
  let previous=null;
  try{previous=JSON.parse(localStorage.getItem(dailyStorageKey())||'null');if(previous)DAILY.validateDay(previous.day);}catch{previous=null;}
  if(previous && (previous.day>state.day || (previous.day===state.day && previous.phase==='done' && state.phase!=='done')))return;
  try{localStorage.setItem(dailyStorageKey(),JSON.stringify(state));}catch(error){console.warn('Daily draw state',error);}
}
function dailyCanShow(){
  return !!store?.player && (store.player.tutorialSeen || dailyTutorialDoneUid===cloud.uid) && !document.hidden && !busy && !playback && !modalKind && !modalClosing && !revivalPlaying
    && !store.draft && !hatchAnimating && !lootFlights && $('battleMenu').classList.contains('hidden')
    && !(store.battles||[]).some(b=>(store.player.unreadBattleIds||[]).includes(b.battleId))
    && !(store.legends||[]).some(l=>l.seq>(store.player.seenLegendSeq||0))
    && ['bootScreen','battleScreen','battleCutin','tutorial','revealScreen','legendScreen','detailHost','popoverHost'].every(id=>$(id).classList.contains('hidden'));
}
async function maybeDailyDraw(){
  const day=DAILY.dayKey(),state=readDailyState(day);
  if(dailyChecking || dailyAttemptedDay===day || state?.phase==='done' || !dailyCanShow() || (dailyFailedAt && Date.now()-dailyFailedAt<30000))return;
  dailyChecking=true;
  try {
    const saved=await cloud.getDailyDraw(day);
    if(!dailyCanShow() || DAILY.dayKey()!==day)return;
    const fresh=await cloud.getState();
    if(!dailyCanShow() || DAILY.dayKey()!==day)return;
    store=fresh;renderCity();refreshNav();
    if(!store.player)return;
    if((store.battles||[]).some(b=>(store.player.unreadBattleIds||[]).includes(b.battleId))
      || (store.legends||[]).some(l=>l.seq>(store.player.seenLegendSeq||0)))await playUpdates();
    if(!dailyCanShow() || DAILY.dayKey()!==day)return;
    const pending=readDailyState(day)||state;
    if(pending?.phase==='done')return;
    let record=saved?DAILY.validateRecord(saved,day):null;
    if(record && !Number.isInteger(pending?.choice)){saveDailyState({day,phase:'done'});dailyAttemptedDay=day;return;}
    const entry=pending||{day,round:DAILY.createRound(day),choice:null,phase:'choose',awardShown:false};
    if(record){entry.round=record.round;entry.choice=record.choice;}
    saveDailyState(entry);dailyAttemptedDay=day;
    await showDailyDraw(entry,record);
  }catch(error){dailyFailedAt=Date.now();console.warn('Daily draw',error);}
  finally{dailyChecking=false;}
}
function dailyRewardMarkup(reward){
  if(reward.kind==='hatch')return '<span class="daily-reward daily-hatch"><span class="daily-hatch-orb"></span><strong><span>孵化ポイント</span><span>＋1</span></strong></span>';
  const svg=document.querySelector('.mo-vessel svg').cloneNode(true),clip='daily-beaker-'+(++dailyVesselSerial);
  svg.querySelector('clipPath').id=clip;
  const fluid=svg.querySelector('rect');fluid.removeAttribute('id');fluid.setAttribute('clip-path','url(#'+clip+')');fluid.setAttribute('y','25');fluid.setAttribute('height','25');
  return `<span class="daily-reward daily-moji">${svg.outerHTML}<strong>${reward.amount}モジ</strong></span>`;
}
function dailyConfetti(host,count=42){
  const colors=['#ffe9a0','#f7bd40','#ff9bd5','#a9f1d0','#fff8dc'];
  for(let i=0;i<count;i++){
    const piece=document.createElement('i');piece.className='daily-confetti';piece.style.background=colors[i%colors.length];
    piece.style.left=(10+Math.random()*80)+'%';host.appendChild(piece);
    piece.animate([{transform:'translateY(-30px) rotate(0deg)',opacity:1},
      {transform:`translate(${(Math.random()-.5)*200}px,${host.clientHeight+80}px) rotate(${360+Math.random()*720}deg)`,opacity:0}],
      {duration:1300+Math.random()*900,easing:'ease-out'}).finished.then(()=>piece.remove()).catch(()=>piece.remove());
  }
}
async function dailyAwardFlight(record,icon){
  const target=record.reward.kind==='hatch'?$('hatchGauge'):document.querySelector('.mo-vessel svg');
  const from=icon.getBoundingClientRect(),to=target.getBoundingClientRect(),x=from.left+from.width/2,y=from.top+from.height/2;
  const dx=to.left+to.width/2-x,dy=to.top+to.height/2-y;
  const flight=document.createElement('div');flight.className='daily-award-flight';flight.setAttribute('aria-hidden','true');
  flight.style.left=x+'px';flight.style.top=y+'px';flight.innerHTML=dailyRewardMarkup(record.reward);document.body.appendChild(flight);
  try {
    await flight.animate([{transform:'translate(-50%,-50%) scale(.8)',opacity:1},
      {transform:`translate(calc(-50% + ${dx*.45}px),calc(-50% + ${dy*.4-65}px)) scale(1.15)`,opacity:1,offset:.5},
      {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.16)`,opacity:0}],
      {duration:1100,easing:'ease-in-out',fill:'forwards'}).finished;
    if(record.hatch>0 && cloud.hatchPending>0)cloud.revealHatch();
    refreshNav();
    await target.animate([{filter:'brightness(3)',boxShadow:'0 0 28px #ffe383'},{filter:'brightness(1)',boxShadow:'0 0 0 transparent'}],{duration:500}).finished;
  }finally{flight.getAnimations({subtree:true}).forEach(a=>a.cancel());flight.remove();}
}
async function showDailyDraw(state,saved=null){
  busy=true;refreshNav();
  openModal(`<h2 class="daily-title">きょうのモジくじ</h2><p class="daily-instruction">ひとつ選んでタップ</p>
    <div class="daily-stage"><div class="daily-rays" aria-hidden="true"></div><div class="daily-gifts" role="group" aria-label="3つのプレゼント">
    ${[0,1,2].map(i=>`<button class="daily-gift-button" type="button" aria-label="${i+1}番のプレゼント" disabled><span class="daily-gift-symbol">🎁</span></button>`).join('')}
    </div><div class="daily-result hidden" aria-live="polite"></div><div class="daily-fx" aria-hidden="true"></div></div>
    <div class="daily-help" role="status"></div>`,'きょうのモジくじ',{closable:false,hideClose:true,panelClass:'daily-draw-panel'});
  const host=$('modalHost'),panel=host.querySelector('.daily-draw-panel'),stage=panel.querySelector('.daily-stage'),gifts=panel.querySelector('.daily-gifts');
  const buttons=[...gifts.children],result=panel.querySelector('.daily-result'),hint=panel.querySelector('.daily-instruction'),help=panel.querySelector('.daily-help'),fx=panel.querySelector('.daily-fx');
  host.classList.add('daily-draw-host');document.body.classList.add('daily-draw-open');
  let locked=true,phase='choose',record=saved,finish;
  const finished=new Promise(resolve=>{finish=resolve;});
  function restoreGifts(){buttons.forEach(button=>{button.getAnimations().forEach(a=>a.cancel());});gifts.classList.remove('is-hidden','is-summary');stage.querySelector('.daily-picked')?.remove();}
  async function leave(complete){
    if(locked)return;locked=true;
    if(complete)saveDailyState({day:state.day,phase:'done'});
    await closeModal(true);finish();
  }
  async function showAll(){
    if(locked)return;locked=true;phase='all';state.phase='all';saveDailyState(state);
    result.classList.add('hidden');restoreGifts();gifts.classList.add('is-summary');stage.classList.add('is-revealed');
    buttons.forEach((button,i)=>{button.innerHTML=dailyRewardMarkup(state.round.rewards[i]);button.disabled=true;button.classList.toggle('is-chosen',i===state.choice);});
    hint.textContent='3つの特典はこちら！';help.textContent='タップして街へ';dailyConfetti(fx,36);
    await Promise.all(buttons.map((button,i)=>button.animate([{transform:'translateY(50px) scale(.4) rotate(-12deg)',opacity:0},
      {transform:'translateY(-12px) scale(1.12) rotate(5deg)',opacity:1,offset:.7},{transform:'translateY(0) scale(1) rotate(0)',opacity:1}],
      {duration:700,delay:i*100,easing:'ease-out',fill:'backwards'}).finished));locked=false;
  }
  async function revealAward(){
    stage.querySelector('.daily-picked')?.remove();gifts.classList.add('is-hidden');stage.classList.add('has-award');
    result.innerHTML=dailyRewardMarkup(record.reward);result.classList.remove('hidden');
    hint.textContent=record.reward.kind==='hatch'?'孵化ポイントを獲得！':record.reward.amount+'モジを獲得！';
    help.textContent=record.reward.kind==='hatch' && record.hatch===0?'ゲージ満タンのため追加されません。':'';
    dailyConfetti(fx,64);
    await result.animate([{transform:'translate(-50%,-50%) scale(.1) rotate(-25deg)',opacity:0},
      {transform:'translate(-50%,-50%) scale(1.25) rotate(8deg)',opacity:1,offset:.65},{transform:'translate(-50%,-50%) scale(1) rotate(0)',opacity:1}],
      {duration:950,easing:'cubic-bezier(.18,.8,.25,1)'}).finished;
    if(!state.awardShown){await dailyAwardFlight(record,result);state.awardShown=true;saveDailyState(state);}
    phase='award';state.phase='result';saveDailyState(state);locked=false;
  }
  async function select(choice){
    if(locked && phase!=='recover')return;locked=true;phase='opening';state.choice=choice;state.phase='pending';saveDailyState(state);help.innerHTML='';
    buttons.forEach(button=>{button.disabled=true;});restoreGifts();gifts.classList.remove('is-ready');result.classList.add('hidden');
    const start=buttons[choice].getBoundingClientRect(),bounds=stage.getBoundingClientRect(),dx=start.left+start.width/2-bounds.left-bounds.width/2,dy=start.top+start.height/2-bounds.top-bounds.height/2;
    const picked=document.createElement('div');picked.className='daily-picked';picked.innerHTML='<span class="daily-gift-bottom">🎁</span><span class="daily-gift-lid">🎁</span>';stage.appendChild(picked);
    buttons.forEach(button=>button.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.3) translateY(60px)'}],{duration:450,fill:'forwards'}));
    const opening=(async()=>{
      await picked.animate([{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.5)`},
        {transform:'translate(-50%,-50%) scale(1.12)',offset:.75},{transform:'translate(-50%,-50%) scale(1)'}],{duration:750,easing:'ease-out'}).finished;
      picked.classList.add('is-opening');await delay(800);
    })();
    hint.textContent='なにが出るかな…';
    try {
      const [receipt]=await Promise.all([record?Promise.resolve(record):cloud.claimDailyDraw(state.round,choice),opening]);
      record=DAILY.validateRecord(receipt,state.day);state.round=record.round;state.choice=record.choice;saveDailyState(state);
      picked.classList.remove('is-opening');dailyConfetti(fx,45);
      await Promise.all([
        picked.querySelector('.daily-gift-lid').animate([{transform:'translateY(0) rotate(0)',opacity:1},{transform:'translate(-45px,-150px) rotate(-35deg)',opacity:0}],{duration:600,fill:'forwards'}).finished,
        picked.querySelector('.daily-gift-bottom').animate([{transform:'scale(1)',opacity:1},{transform:'translateY(80px) scale(1.4)',opacity:0}],{duration:600,fill:'forwards'}).finished
      ]);
      await revealAward();
    } catch(error) {
      console.warn('Daily draw settlement',error);picked.classList.remove('is-opening');picked.getAnimations({subtree:true}).forEach(a=>a.cancel());
      hint.textContent='通信を確認して、もう一度お試しください。';
      help.innerHTML='<button type="button" class="daily-retry">再試行</button><button type="button" class="daily-later">あとで</button>';
      phase='error';locked=false;
      help.querySelector('.daily-retry').onclick=event=>{event.stopPropagation();phase='recover';select(state.choice);};
      help.querySelector('.daily-later').onclick=event=>{event.stopPropagation();leave(false);};
    }
  }
  const advance=()=>{if(locked)return;if(phase==='award')showAll().catch(error=>{console.warn(error);locked=false;});else if(phase==='all')leave(true);};
  panel.addEventListener('click',advance);
  panel.addEventListener('keydown',event=>{
    if(event.key==='Tab'&&!panel.querySelector('button:not(:disabled)')){event.preventDefault();panel.focus({preventScroll:true});}
    if((event.key==='Enter'||event.key===' ')&&!event.target.closest('button')){event.preventDefault();advance();}
  });
  buttons.forEach((button,i)=>{button.onclick=event=>{event.stopPropagation();panel.focus({preventScroll:true});select(i);};});
  try {
    if(record){
      state.choice=record.choice;state.round=record.round;
      if(state.phase==='all'){locked=false;await showAll();}else await revealAward();
    }else if(Number.isInteger(state.choice)){phase='recover';await select(state.choice);}
    else {
      dailyConfetti(fx,30);
      await Promise.all(buttons.map((button,i)=>button.animate([{transform:`translateY(${-innerHeight}px) rotate(${-30+i*30}deg) scale(.4)`,opacity:0},
        {transform:'translateY(18px) rotate(10deg) scale(1.1)',opacity:1,offset:.72},{transform:'translateY(-10px) rotate(-5deg)',opacity:1,offset:.86},
        {transform:'translateY(0) rotate(0) scale(1)',opacity:1}],{duration:1100,delay:i*190,easing:'ease-out',fill:'backwards'}).finished));
      buttons.forEach(button=>{button.disabled=false;});gifts.classList.add('is-ready');locked=false;
    }
    await finished;
  }finally{
    panel.getAnimations({subtree:true}).forEach(a=>a.cancel());
    if(panel.isConnected)await closeModal(true);
    host.classList.remove('daily-draw-host');document.body.classList.remove('daily-draw-open');busy=false;refreshNav();
  }
}

/* Loot rewards are queued locally and committed to the owner wallet in Firestore. */
const LOOT = Object.freeze({interval:10000, chance:1/6, limit:3, lifetime:120000,
  items:[
    {name:'たばこ',emoji:'🚬',moji:1,weight:60},
    {name:'あめ',emoji:'🍬',moji:5,weight:25},
    {name:'コイン',emoji:'🪙',moji:10,weight:10},
    {name:'プレゼント',emoji:'🎁',moji:30,weight:4},
    {name:'宝石',emoji:'💎',moji:100,weight:1}
  ]});
const streetLoot=new Map();
let lootLayer,lootElapsed=0,lootSerial=0,lootFlights=0,lootPending=0;
function lootCanPlay() {
  return !!store?.player && !document.hidden && !busy && !playback && !modalKind
    && $('battleMenu').classList.contains('hidden')
    && !modalClosing && !revivalPlaying && !store.draft
    && ['bootScreen','battleScreen','battleCutin','tutorial','revealScreen','legendScreen','detailHost','popoverHost']
      .every(id=>$(id).classList.contains('hidden'));
}
function lootItem(random=rng) {
  let value=random()*LOOT.items.reduce((sum,item)=>sum+item.weight,0);
  for(const item of LOOT.items){value-=item.weight;if(value<0)return item;}
  return LOOT.items[LOOT.items.length-1];
}
function lootPosition() {
  const screen=$('cityScreen').getBoundingClientRect();
  if(screen.width<80 || screen.height<160)return null;
  const forbidden=[...$('residents').children,...$('residents').querySelectorAll('.resident-name'),$('forceBattleButton').closest('nav'),document.querySelector('.city-header'),document.querySelector('.mo-meter'),
    ...[...streetLoot.values()].map(drop=>drop.el)].filter(Boolean).map(el=>el.getBoundingClientRect());
  for(let attempt=0;attempt<80;attempt++){
    const x=28+rng()*(screen.width-56),y=70+rng()*Math.max(0,screen.height-180);
    const left=screen.left+x,top=screen.top+y;
    if(forbidden.some(r=>left+30>r.left-10 && left-30<r.right+10 && top+30>r.top-10 && top-30<r.bottom+10))continue;
    return {x:x/screen.width,y:y/screen.height};
  }
  return null;
}
function removeLoot(drop) {streetLoot.delete(drop.id);drop.el.remove();}
function spawnLoot(item=lootItem(),timestamp=Date.now()) {
  if(streetLoot.size>=LOOT.limit)return null;
  const position=lootPosition();if(!position)return null;
  if(!lootLayer){lootLayer=document.createElement('div');lootLayer.className='street-loot';$('cityScreen').appendChild(lootLayer);}
  const el=document.createElement('button');el.type='button';el.className='street-loot-item';
  const glyph=document.createElement('span');glyph.textContent=item.emoji;glyph.style.transform=`rotate(${Math.round(rng()*360)}deg)`;el.appendChild(glyph);el.setAttribute('aria-label',`${item.name}、${item.moji}モジを拾う`);
  el.style.left=position.x*100+'%';el.style.top=position.y*100+'%';
  const drop={id:++lootSerial,item,el,expires:timestamp+LOOT.lifetime,picked:false};
  el.addEventListener('click',()=>{collectLoot(drop).catch(reportError);});
  streetLoot.set(drop.id,drop);lootLayer.appendChild(el);
  // The wrapper owns positioning, while scale/translate supply a tiny entrance.
  const entrance=el.animate([{opacity:0,scale:'.72',translate:'0 4px'},
    {opacity:1,scale:'1.06',translate:'0 -2px',offset:.7},{opacity:1,scale:'1',translate:'0 0'}],
    {duration:360,easing:'ease-out'});
  entrance.finished.catch(()=>{});return drop;
}
function tickLoot(dt,timestamp=Date.now(),random=rng) {
  for(const drop of streetLoot.values())if(timestamp>=drop.expires)removeLoot(drop);
  if(!lootCanPlay())return;
  lootElapsed+=dt*1000;
  if(lootElapsed<LOOT.interval)return;
  // Never replay missed background intervals or produce a catch-up burst.
  lootElapsed=0;
  if(streetLoot.size<LOOT.limit && random()<LOOT.chance)spawnLoot(lootItem(random),timestamp);
}
async function collectLoot(drop) {
  if(!lootCanPlay() || drop.picked || !streetLoot.has(drop.id))return;
  if(Date.now()>=drop.expires){removeLoot(drop);return;}
  drop.picked=true;drop.el.disabled=true;
  const start=drop.el.getBoundingClientRect();removeLoot(drop);
  const balance=updateMoji(),reward=Math.max(0,Math.min(drop.item.moji,MOJI_CAP-balance));
  // Persist an operation ID before the flight; retries cannot grant it twice.
  cloud.addLoot(drop.item.moji,'loot-'+crypto.randomUUID()).catch(reportError);
  store.wallet=cloud.wallet;
  lootPending+=reward;lootFlights++;
  const overlay=document.createElement('div');overlay.className='loot-flight-layer';$('app').appendChild(overlay);
  const flight=document.createElement('span');flight.className='loot-flying';flight.textContent=drop.item.emoji;overlay.appendChild(flight);
  const bounds=overlay.getBoundingClientRect(),target=document.querySelector('.mo-vessel svg').getBoundingClientRect();
  const x=start.left+start.width/2-bounds.left,y=start.top+start.height/2-bounds.top;
  const dx=target.left+target.width/2-bounds.left-x,dy=target.top+target.height/2-bounds.top-y;
  flight.style.left=x+'px';flight.style.top=y+'px';
  let revealed=false;
  try {
    const flying=flight.animate([
      {transform:'translate(-50%,-50%) scale(1)',opacity:1},
      {transform:`translate(calc(-50% + ${dx*.3}px),calc(-50% + ${dy*.3-28}px)) scale(1.1)`,opacity:1,offset:.35},
      {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.22)`,opacity:0}
    ],{duration:720,easing:'cubic-bezier(.4,0,.65,1)',fill:'forwards'});
    await flying.finished.catch(()=>{});flight.remove();
    lootPending-=reward;revealed=true;refreshNav();
    const vessel=document.querySelector('.mo-vessel svg');
    const glow=vessel.animate([{filter:'drop-shadow(0 0 0px #B8E69B)',scale:'1'},
      {filter:'drop-shadow(0 0 12px #B8E69B) brightness(1.65)',scale:'1.08',offset:.35},
      {filter:'drop-shadow(0 0 0px #B8E69B)',scale:'1'}],{duration:600});
    glow.finished.catch(()=>{});
    const label=document.createElement('span');label.className='loot-reward';
    label.textContent=reward?'+'+reward:'MAX';
    label.style.left=(target.left+target.width/2-bounds.left)+'px';
    label.style.top=(target.top+target.height/2-bounds.top)+'px';overlay.appendChild(label);
    const rising=label.animate([{transform:'translate(-50%,0)',opacity:0},
      {transform:'translate(-50%,-10px)',opacity:1,offset:.2},{transform:'translate(-50%,-38px)',opacity:0}],
      {duration:900,easing:'ease-out',fill:'forwards'});
    await rising.finished.catch(()=>{});
  } finally {
    if(!revealed)lootPending-=reward;
    lootFlights--;overlay.remove();refreshNav();
  }
}

/* MOJI SPIN presentation. Every result comes from the saved, pre-drawn round. */
let slotSession=null;
const SLOT=window.MojiSpinEngine;
// Presentation only. These draws never enter the saved round or the game RNG.
const SLOT_CUES=Object.freeze({
  weights:Object.freeze({
    blank:Object.freeze([{type:'A',weight:10.5},{type:'B',weight:4},{type:'C',weight:.5},{type:'D',weight:0},{type:null,weight:85}].map(Object.freeze)),
    wild:Object.freeze([{type:'A',weight:35},{type:'B',weight:30},{type:'C',weight:10},{type:'D',weight:5},{type:null,weight:20}].map(Object.freeze))
  }),
  shake:3000,blankHold:2000,flyIn:2200,flyHold:1000,flyOut:900,
  slow:6000,step:70,allSpin:6000,blackHold:2000,drop:450,landHold:2000,fade:1000
});
function chooseSlotCue(center,rng=Math.random){
  const choices=SLOT_CUES.weights[center];if(!choices)return null;
  let value=rng()*100;
  for(const choice of choices){value-=choice.weight;if(value<0)return choice.type;}
  return null;
}
function resetSlotCueVisuals(session){
  if(session.cueReel){cancelAnimationFrame(session.cueReel.frame);session.cueReel.track.remove();session.cueReel=null;}
  if(session.cueAnimation){session.cueAnimation.cancel();session.cueAnimation=null;}
  if(session.cueLayer){session.cueLayer.getAnimations({subtree:true}).forEach(a=>a.cancel());session.cueLayer.remove();session.cueLayer=null;}
  session.panel.querySelectorAll('.cue-special,.cue-shaking').forEach(el=>{
    el.classList.remove('cue-special','cue-shaking');el.style.removeProperty('--slot-cue-height');
  });
}
function paintSpecialSlotReel(state,phase){
  const height=state.cell.clientHeight;
  state.cell.style.setProperty('--slot-cue-height',height+'px');
  state.track.style.transform=`translateY(${-((phase%5+5)%5)*height}px)`;
}
function startSpecialSlotReel(session,cell){
  const track=document.createElement('div');track.className='slot-cue-track';track.setAttribute('aria-hidden','true');
  track.style.fontSize=getComputedStyle(cell.querySelector('.spin-glyph')).fontSize;
  track.innerHTML=Array.from({length:10},(_,i)=>`<div class="slot-cue-face ${i%5===4?'cue-blank':''}">${i%5===4?'':'🤡'}</div>`).join('');
  cell.classList.add('cue-special');cell.appendChild(track);
  const state={cell,track,started:performance.now(),frame:null};session.cueReel=state;
  function frame(now){paintSpecialSlotReel(state,(now-state.started)/SLOT_CUES.step);state.frame=requestAnimationFrame(frame);}
  frame(state.started);
}
async function slotCueA(session){
  const cell=slotCells()[4];cell.classList.add('cue-shaking');
  const animation=cell.animate([
    {transform:'translate(0,0)'},{transform:'translate(-8px,6px)'},{transform:'translate(7px,-7px)'},
    {transform:'translate(-6px,-4px)'},{transform:'translate(8px,5px)'},{transform:'translate(0,0)'}
  ],{duration:100,iterations:SLOT_CUES.shake/100});session.cueAnimation=animation;
  try {await animation.finished;}finally{animation.cancel();session.cueAnimation=null;cell.classList.remove('cue-shaking');}
}
function slotCueOffscreen(size,rng=Math.random){
  const side=Math.floor(rng()*4),margin=size*2+80;
  if(side===0)return {x:rng()*innerWidth,y:-margin};
  if(side===1)return {x:innerWidth+margin,y:rng()*innerHeight};
  if(side===2)return {x:rng()*innerWidth,y:innerHeight+margin};
  return {x:-margin,y:rng()*innerHeight};
}
function slotCueFlightFrames(from,to){
  return Array.from({length:13},(_,i)=>{
    const t=i/12,wobble=Math.sin(t*Math.PI*6)*22*Math.sin(t*Math.PI);
    const x=from.x+(to.x-from.x)*t+wobble,y=from.y+(to.y-from.y)*t-wobble*.6;
    return {transform:`translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) rotate(${Math.sin(t*Math.PI*4)*12}deg)`};
  });
}
async function slotCueB(session,spin){
  await delay(SLOT_CUES.blankHold);
  const cell=slotCells()[4],rect=cell.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
  const size=parseFloat(getComputedStyle(cell.querySelector('.spin-glyph')).fontSize);
  const layer=document.createElement('div');layer.className='slot-cue-flight-layer';layer.setAttribute('aria-hidden','true');
  const clown=document.createElement('span');clown.className='slot-cue-clown';clown.textContent='🤡';
  clown.style.cssText=`left:${x}px;top:${y}px;font-size:${size}px`;
  layer.appendChild(clown);document.body.appendChild(layer);session.cueLayer=layer;
  try {
    const start=slotCueOffscreen(size),arrive=clown.animate(slotCueFlightFrames({x:start.x-x,y:start.y-y},{x:0,y:0}),
      {duration:SLOT_CUES.flyIn,easing:'ease-in-out',fill:'forwards'});
    await arrive.finished;arrive.cancel();
    await delay(SLOT_CUES.flyHold);
    if(spin.cells[4]==='wild')paintSlotCell(cell,'wild');
    else {
      const end=slotCueOffscreen(size);
      await clown.animate(slotCueFlightFrames({x:0,y:0},{x:end.x-x,y:end.y-y}),
        {duration:SLOT_CUES.flyOut,easing:'ease-in',fill:'forwards'}).finished;
    }
  }finally{layer.getAnimations({subtree:true}).forEach(a=>a.cancel());layer.remove();session.cueLayer=null;}
}
async function slotCueC(session,spin){
  const state=session.cueReel;cancelAnimationFrame(state.frame);
  const started=performance.now(),phase=((started-state.started)/SLOT_CUES.step)%5;
  const velocity=SLOT_CUES.slow/SLOT_CUES.step,target=spin.cells[4]==='blank'?4:0;
  const end=Math.ceil((phase+velocity/3-target)/5)*5+target,distance=end-phase;
  await new Promise(resolve=>{
    function frame(now){
      const t=Math.max(0,Math.min(1,(now-started)/SLOT_CUES.slow));
      // Cubic Hermite motion: keep the incoming speed, then continuously slow to zero.
      const travel=(t*t*t-2*t*t+t)*velocity+(-2*t*t*t+3*t*t)*distance;
      paintSpecialSlotReel(state,phase+travel);
      if(t<1)state.frame=requestAnimationFrame(frame);else resolve();
    }
    frame(started);
  });
}
function slotCueConfetti(layer){
  const colors=['#f9df91','#ff72c7','#a5f3df','#fff','#bda2ff'];
  for(let i=0;i<85;i++){
    const p=document.createElement('i');p.className='slot-cue-confetti';p.style.left=(Math.random()*100)+'%';
    p.style.background=colors[i%colors.length];layer.appendChild(p);
    p.animate([{transform:'translateY(0) rotate(0deg)',opacity:1},
      {transform:`translate(${(Math.random()-.5)*innerWidth*.7}px,${innerHeight+90}px) rotate(${360+Math.random()*720}deg)`,opacity:0}],
      {duration:2400+Math.random()*700,easing:'cubic-bezier(.25,.3,.65,1)'}).finished.then(()=>p.remove()).catch(()=>p.remove());
  }
}
async function slotCueD(session,spin){
  await delay(Math.max(0,SLOT_CUES.allSpin-(performance.now()-session.reelStarted)));
  const layer=document.createElement('div');layer.className='slot-cue-blackout';layer.setAttribute('aria-hidden','true');
  document.body.appendChild(layer);session.cueLayer=layer;
  try {
    stopSlotReels(session);slotCells().forEach((cell,i)=>paintSlotCell(cell,spin.cells[i]));
    await delay(SLOT_CUES.blackHold);
    const giant=document.createElement('span');giant.className='slot-cue-giant';giant.textContent='🤡';layer.appendChild(giant);
    await giant.animate([{transform:`translate(-50%,calc(-50% - ${innerHeight}px))`},{transform:'translate(-50%,-50%)'}],
      {duration:SLOT_CUES.drop,easing:'cubic-bezier(.65,.02,.95,.7)'}).finished;
    slotCueConfetti(layer);
    giant.animate([{transform:'translate(-50%,-50%) scale(1)'},{transform:'translate(-50%,-50%) scale(1.12,.88)',offset:.3},
      {transform:'translate(-50%,-50%) scale(1)'}],{duration:260});
    await delay(SLOT_CUES.landHold);
    await Promise.all([
      layer.animate([{backgroundColor:'#000'},{backgroundColor:'#0000'}],{duration:SLOT_CUES.fade,fill:'forwards'}).finished,
      giant.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:'translate(-50%,-50%) scale(.12)',opacity:0}],
        {duration:SLOT_CUES.fade,fill:'forwards',easing:'ease-in'}).finished
    ]);
  }finally{layer.getAnimations({subtree:true}).forEach(a=>a.cancel());layer.remove();session.cueLayer=null;}
}
function installSlotButton(){
  if(!$('mojiSpinButton')){
    const button=document.createElement('button');button.id='mojiSpinButton';button.className='moji-spin-launch';
    button.type='button';button.textContent='🎰';button.setAttribute('aria-label','MOJI SPINで遊ぶ');
    document.querySelector('.mo-meter').appendChild(button);button.onclick=showMojiSpin;
  }
  if(!$('mojiSpinFonts')){
    const link=document.createElement('link');link.id='mojiSpinFonts';link.rel='stylesheet';
    link.href='https://fonts.googleapis.com/css2?family=Aldrich&family=Skranji:wght@700&display=swap';document.head.appendChild(link);
  }
}
function refreshSlotUI(){
  const launch=$('mojiSpinButton');
  if(launch){launch.disabled=!store?.player;launch.classList.toggle('has-round',!!cloud.slotPending);}
  const session=slotSession;if(!session||!session.panel.isConnected)return;
  if(!session.running && !session.record && !session.failed)session.balance=cloud.wallet.balance;
  $('spinWallet').textContent=Math.max(0,session.balance).toLocaleString('en-US');
  $('spinWin').textContent=session.win.toLocaleString('en-US');
  $('spinWin').classList.toggle('long-win',session.win>=10000);
  const wallet=$('spinWallet');wallet.style.fontSize='';
  if(wallet.clientWidth && wallet.scrollWidth>wallet.clientWidth){
    const size=parseFloat(getComputedStyle(wallet).fontSize)*wallet.clientWidth/wallet.scrollWidth;
    wallet.style.fontSize=(Math.floor(size*10)/10)+'px';
  }
  const button=$('slotSpinButton');
  button.disabled=session.loading||session.running||session.failed||(!session.record&&!cloud.slotPending&&cloud.wallet.balance<SLOT.BET);
  button.textContent='SPIN';
  const odds=$('slotOddsButton');if(odds)odds.disabled=session.running||session.loading;
  const close=session.panel.querySelector('.modal-close');if(close)close.disabled=session.running;
}
async function showMojiSpin(){
  if(busy||playback||!store.player)return;
  document.body.classList.add('moji-spin-open');
  const preview=['cherry','bell','gift','berry','wild','smile','melon','orange','cherry'];
  openModal(`<div class="spin-marquee" aria-hidden="true"></div>
    <header class="spin-heading"><span class="spin-ornament" aria-hidden="true">✦</span><h2>MOJI SPIN</h2><span class="spin-ornament" aria-hidden="true">✦</span></header>
    <div id="spinPhase" class="spin-phase" hidden></div>
    <div class="spin-tools"><button id="slotOddsButton" class="spin-odds-button" type="button">遊び方</button></div>
    <div class="spin-machine"><div id="spinBoard" class="spin-board" role="group" aria-label="3行3列のスロット">
      ${preview.map(id=>`<div class="spin-cell" data-symbol="${id}" aria-label="${SLOT.byId[id].name}"><span class="spin-glyph">${SLOT.byId[id].emoji}</span></div>`).join('')}
      <svg id="spinLines" class="spin-lines" viewBox="0 0 300 300" aria-hidden="true"></svg>
    </div><div id="spinWinBanner" class="spin-win-banner" aria-live="polite"></div></div>
    <div class="spin-dashboard"><dl class="spin-stats"><div><dt>BET</dt><dd id="spinBet">${SLOT.BET}</dd></div><div><dt id="spinWinLabel">WIN</dt><dd id="spinWin">0</dd></div></dl>
      <div class="spin-wallet"><small>MOJI</small><strong id="spinWallet">${cloud.wallet.balance.toLocaleString('en-US')}</strong></div></div>
    <button id="slotSpinButton" class="slot-spin-button" type="button" disabled>SPIN</button>
    <div id="spinFx" class="spin-fx" aria-hidden="true"></div><div id="spinOverlay" class="spin-overlay hidden"></div>`,
    'MOJI SPIN',{panelClass:'moji-spin-panel'});
  const session={panel:$('modalHost').querySelector('.moji-spin-panel'),loading:true,running:false,record:null,completed:false,balance:cloud.wallet.balance,win:0,timer:null};
  slotSession=session;
  $('slotSpinButton').onclick=()=>runSlotSession(session);
  $('slotOddsButton').onclick=showSlotOdds;
  refreshSlotUI();
  try{
    const record=await cloud.getSlotRound();
    if(slotSession!==session||!session.panel.isConnected)return;
    session.record=record;
    if(record){session.balance=record.balanceBefore-record.round.bet;$('spinPhase').textContent='8 LINES';}
  }catch(error){session.failed=true;if(session.panel.isConnected)reportError(error);}
  finally {session.loading=false;refreshSlotUI();}
  // Interrupted rounds resume automatically, never on the next SPIN press.
  if(session.record && slotSession===session && session.panel.isConnected)await runSlotSession(session,true);
}
function showSlotOdds(){
  if(!slotSession || slotSession.running || slotSession.loading || document.querySelector('.spin-odds-dialog'))return;
  const dialog=document.createElement('dialog');dialog.className='spin-odds-dialog';
  dialog.setAttribute('aria-labelledby','slotOddsTitle');
  const symbols=SLOT.CONFIG.symbols.filter(symbol=>symbol.payout>0);
  const anySymbols=Object.keys(SLOT.CONFIG.anyBonus).map(id=>SLOT.byId[id]);
  const counts=[...new Set(Object.values(SLOT.CONFIG.anyBonus).flatMap(payouts=>Object.keys(payouts).map(Number)))].sort((a,b)=>a-b);
  const titles=['LINE BONUS','ANY BONUS','FREE SPIN'];
  dialog.innerHTML=`<button class="spin-odds-close" type="button" aria-label="遊び方を閉じる">×</button>
    <h3 id="slotOddsTitle">${titles[0]}</h3>
    <div class="spin-odds-pages">
      <section class="spin-odds-page" aria-labelledby="slotOddsTitle">
        <div class="spin-odds-grid">${symbols.map(symbol=>`<div class="spin-odds-item"><span class="spin-odds-symbol"><span>${symbol.emoji}</span>${symbol.id==='wild'?'<small>WILD</small>':''}</span><strong>${symbol.payout}</strong></div>`).join('')}</div>
        <p class="spin-odds-note">横3本・縦3本・斜め2本の計8ライン。<br>同じ絵柄が3つ揃うと当選します。<br>WILDは他の絵柄の代わりになります。</p>
      </section>
      <section class="spin-odds-page" aria-labelledby="slotOddsTitle" hidden>
        <div class="spin-odds-scroll" role="region" aria-label="エニーボーナス配当表、左右にスクロールできます" tabindex="0"><table><caption>個数ごとの獲得モジ</caption><thead><tr><th scope="col">個数</th>${anySymbols.map(symbol=>`<th scope="col" aria-label="${symbol.name}">${symbol.emoji}</th>`).join('')}</tr></thead><tbody>${counts.map(count=>`<tr><th scope="row">${count}</th>${anySymbols.map(symbol=>`<td>${SLOT.CONFIG.anyBonus[symbol.id][count]?.toLocaleString('en-US')||'—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="spin-odds-note">出現した絵柄の個数で当選。<br>WILDはすべての絵柄に同時に代用されます。<br>表は左右にスクロールできます。</p>
      </section>
      <section class="spin-odds-page spin-odds-page-free" aria-labelledby="slotOddsTitle" hidden>
        <div class="spin-odds-trigger" role="img" aria-label="3行3列の中央にワイルド">${Array.from({length:9},(_,i)=>`<span>${i===4?'🤡':''}</span>`).join('')}</div>
        <p class="spin-odds-note">通常スピンで中央に🤡が止まると突入。<br>${SLOT.CONFIG.freeCounts.map(x=>x.count).join('・')}回の無料スピンを獲得します。</p>
      </section>
    </div>
    <nav class="spin-odds-nav" aria-label="遊び方のページ"><button class="spin-odds-prev" type="button" aria-label="前のページ" disabled>◀</button><span class="spin-odds-page-count" role="status" aria-live="polite">1 / 3</span><button class="spin-odds-next" type="button" aria-label="次のページ">▶</button></nav>`;
  const pages=[...dialog.querySelectorAll('.spin-odds-page')];
  const prev=dialog.querySelector('.spin-odds-prev'),next=dialog.querySelector('.spin-odds-next');
  let page=0;
  function showPage(index){
    page=Math.max(0,Math.min(pages.length-1,index));
    pages.forEach((el,i)=>{el.hidden=i!==page;});
    dialog.querySelector('#slotOddsTitle').textContent=titles[page];
    dialog.querySelector('.spin-odds-page-count').textContent=`${page+1} / ${pages.length}`;
    prev.disabled=page===0;next.disabled=page===pages.length-1;
  }
  prev.onclick=()=>showPage(page-1);next.onclick=()=>showPage(page+1);
  dialog.querySelector('.spin-odds-close').onclick=()=>dialog.close();
  dialog.addEventListener('click',event=>{
    event.stopPropagation();
    if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}
  });
  dialog.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();showPage(page+(event.key==='ArrowRight'?1:-1));
    }
  });
  dialog.addEventListener('close',()=>{dialog.remove();$('slotOddsButton')?.focus({preventScroll:true});},{once:true});
  document.body.appendChild(dialog);dialog.showModal();
}
function slotCells(){return [...$('spinBoard').querySelectorAll('.spin-cell')];}
function paintSlotCell(el,id){
  const symbol=SLOT.byId[id];el.dataset.symbol=id;el.setAttribute('aria-label',symbol.name);
  el.querySelector('.spin-glyph').textContent=symbol.emoji;
  el.classList.toggle('blank',id==='blank');
}
function stopSlotReels(session){
  clearInterval(session.timer);session.timer=null;
  session.panel.querySelectorAll('.spin-cell').forEach(el=>el.classList.remove('spinning'));
}
function startSlotReels(session,free){
  resetSlotCueVisuals(session);
  stopSlotReels(session);
  session.reelStarted=performance.now();
  $('spinLines').innerHTML='';$('spinWinBanner').className='spin-win-banner';$('spinWinBanner').textContent='';
  const cells=slotCells();cells.forEach((el,i)=>{
    el.classList.remove('winning');el.classList.toggle('locked',free&&i===4);
    if(free&&i===4)paintSlotCell(el,'wild');else el.classList.add('spinning');
  });
  if(!free&&session.cue==='C')startSpecialSlotReel(session,cells[4]);
  let tick=0;
  session.timer=setInterval(()=>{
    cells.forEach((el,i)=>{if(el.classList.contains('spinning')&&!(i===4&&session.cueReel))paintSlotCell(el,SLOT.CONFIG.symbols[(tick+i*3)%SLOT.CONFIG.symbols.length].id);});tick++;
  },70);
}
async function animateSlotSpin(session,spin){
  if(!session.timer)startSlotReels(session,spin.free);
  const cue=spin.free?null:session.cue;
  try {
  if(cue==='D'){await slotCueD(session,spin);return;}
  await delay(Math.max(0,1000-(performance.now()-session.reelStarted)));
  for(const index of [0,1,2,5,8,7,6,3,4]){
    if(index===4&&cue==='A')await slotCueA(session);
    if(index===4&&cue==='C')await slotCueC(session,spin);
    const cell=slotCells()[index];cell.classList.remove('spinning');paintSlotCell(cell,index===4&&cue==='B'?'blank':spin.cells[index]);
    if(!(spin.free&&index===4)){
      cell.querySelector('.spin-glyph').animate([{transform:'translateY(-7px) scale(.94)'},{transform:'translateY(3px) scale(1.04)',offset:.65},{transform:'translateY(0) scale(1)'}],{duration:260,easing:'ease-out'});
    }
    if(index!==4)await delay(100);
  }
  stopSlotReels(session);
  if(cue==='B')await slotCueB(session,spin);
  }finally{resetSlotCueVisuals(session);session.cue=null;}
}
function slotConfetti(count=36){
  const host=$('spinFx');if(!host)return;
  const colors=['#f9df91','#ff72c7','#a5f3df','#ffffff','#bda2ff'];
  for(let i=0;i<count;i++){
    const p=document.createElement('i');p.style.background=colors[i%colors.length];
    p.style.left=(20+Math.random()*60)+'%';p.style.top='37%';host.appendChild(p);
    p.animate([{transform:'translate(0,0) rotate(0deg)',opacity:1},
      {transform:`translate(${(Math.random()-.5)*350}px,${-100-Math.random()*100}px) rotate(${Math.random()*360}deg)`,opacity:1,offset:.4},
      {transform:`translate(${(Math.random()-.5)*450}px,${250+Math.random()*150}px) rotate(${500+Math.random()*500}deg)`,opacity:0}
    ],{duration:1400+Math.random()*900,easing:'cubic-bezier(.2,.5,.4,1)'}).finished.then(()=>p.remove()).catch(()=>p.remove());
  }
}
async function animateSlotWin(session,spin,total){
  await delay(500);
  // Assign the sum of saved spins; replaying an animation cannot add it twice.
  session.win=total;refreshSlotUI();
  if(!spin.payout){if(spin.free)await delay(1000);return;}
  const cells=slotCells(),svg=$('spinLines'),board=$('spinBoard');
  svg.setAttribute('viewBox',`0 0 ${board.clientWidth} ${board.clientHeight}`);
  const colors=['#ffe397','#ff8bd4','#b9fff0','#c9adff'];
  const winningCells=spin.winningCells||[...new Set(spin.wins.flatMap(win=>win.indices))];
  winningCells.forEach(i=>cells[i].classList.add('winning'));
  for(const win of spin.wins){
    // Layout offsets are stable even while the reel glyph is animating.
    const first=cells[win.indices[0]],last=cells[win.indices[2]];
    let x1=first.offsetLeft+first.offsetWidth/2,y1=first.offsetTop+first.offsetHeight/2;
    let x2=last.offsetLeft+last.offsetWidth/2,y2=last.offsetTop+last.offsetHeight/2;
    const dx=x2-x1,dy=y2-y1;
    const edge=(cell)=>Math.min(dx?cell.offsetWidth/2/Math.abs(dx):Infinity,dy?cell.offsetHeight/2/Math.abs(dy):Infinity);
    const a=edge(first),b=edge(last);
    x1-=dx*a;y1-=dy*a;x2+=dx*b;y2+=dy*b;
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    for(const [key,value] of Object.entries({x1,y1,x2,y2}))line.setAttribute(key,value);
    line.style.stroke=colors[win.line%colors.length];svg.appendChild(line);

  }
  const banner=$('spinWinBanner'),big=spin.payout>=160;
  banner.textContent=(spin.anyPayout&&!spin.linePayout?'ANY BONUS  ':spin.payout>=400?'MEGA WIN  ':big?'BIG WIN  ':'+')+spin.payout.toLocaleString('en-US');
  banner.setAttribute('aria-label',`ライン ${spin.linePayout??spin.payout}、エニーボーナス ${spin.anyPayout||0}、合計 ${spin.payout}モジ`);
  banner.classList.add('visible');if(big)banner.classList.add('big');
  slotConfetti(big?60:22);
  session.panel.animate([{boxShadow:'0 0 55px #ffd884aa'},{boxShadow:'0 0 45px #ed5acb88'},{boxShadow:'0 20px 80px #0009'}],{duration:1100});
  await delay(spin.free?1000:(big?1700:1050));
}
function setSlotFreeRemaining(count){
  let badge=$('spinRemaining');
  if(!badge){badge=document.createElement('span');badge.id='spinRemaining';badge.className='spin-remaining';badge.setAttribute('aria-live','polite');slotCells()[4].appendChild(badge);}
  badge.textContent=count;badge.setAttribute('aria-label',`フリースピン残り${count}回`);
  return badge;
}
async function highlightSlotWild(){
  const cell=slotCells()[4];cell.classList.add('bonus-trigger');
  try {await delay(1000);}finally{cell.classList.remove('bonus-trigger');}
}
async function animateSlotRoulette(wheel,index){
  const sectors=[...wheel.querySelectorAll('[data-wheel-sector]')];
  const numbers=[...wheel.querySelectorAll('[data-wheel-count]')];
  const duration=3000,steps=sectors.length*6+index,started=performance.now();
  let lastStep=-1;
  await new Promise(resolve=>{
    function frame(now){
      const progress=Math.max(0,Math.min(1,(now-started)/duration));
      const step=Math.floor(steps*(1-(1-progress)**2));
      if(step!==lastStep){
        const active=step%sectors.length;
        sectors.forEach((el,i)=>el.classList.toggle('is-lit',i===active));
        numbers.forEach((el,i)=>el.classList.toggle('is-lit',i===active));
        lastStep=step;
      }
      if(progress<1)requestAnimationFrame(frame);
      else {wheel.classList.add('is-stopped');resolve();}
    }
    frame(started);
  });
}
async function slotFreeRoulette(count){
  const overlay=$('spinOverlay');overlay.classList.remove('hidden');
  const choices=SLOT.CONFIG.freeCounts.map(x=>x.count);
  overlay.innerHTML=`<div class="spin-bonus-intro"><span class="spin-bonus-kicker">BONUS</span><h3>FREE SPINS</h3><button type="button" class="spin-wheel-wrap" aria-label="タップしてフリースピンのルーレットを回す"><span class="spin-wheel"><svg class="spin-wheel-lights" viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="spinWheelLight"><stop stop-color="#fff7be" stop-opacity=".9"/><stop offset="1" stop-color="#ffd665" stop-opacity=".65"/></radialGradient></defs>${choices.map((_,i)=>{const point=a=>[100+100*Math.sin(a*Math.PI/180),100-100*Math.cos(a*Math.PI/180)];const a=point(i*72-36),b=point(i*72+36);return `<path data-wheel-sector="${i}" d="M100 100L${a.join(' ')}A100 100 0 0 1 ${b.join(' ')}Z"/>`;}).join('')}</svg>${choices.map((n,i)=>`<span data-wheel-count="${i}" style="--angle:${i*72}deg">${n}</span>`).join('')}</span></button><small class="spin-wheel-hint">TAP TO SPIN</small></div>`;
  const trigger=overlay.querySelector('.spin-wheel-wrap'),wheel=overlay.querySelector('.spin-wheel');
  trigger.focus({preventScroll:true});
  await new Promise(resolve=>trigger.addEventListener('click',resolve,{once:true}));
  trigger.disabled=true;overlay.querySelector('.spin-wheel-hint').style.visibility='hidden';
  const index=choices.indexOf(count);
  await animateSlotRoulette(wheel,index);
  trigger.setAttribute('aria-label',`フリースピン ${count}回`);
  await delay(500);
  const badge=setSlotFreeRemaining(count);badge.style.visibility='hidden';
  const number=document.createElement('span');number.className='spin-count-flight';number.textContent=count;number.setAttribute('aria-hidden','true');
  const bounds=overlay.getBoundingClientRect();
  number.style.left=(bounds.left+bounds.width/2)+'px';number.style.top=(bounds.top+bounds.height/2)+'px';document.body.appendChild(number);
  try{
    await number.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:0},{transform:'translate(-50%,-50%) scale(1.1)',opacity:1,offset:.75},{transform:'translate(-50%,-50%) scale(1)',opacity:1}],{duration:400,easing:'ease-out'}).finished;
    slotConfetti(50);await delay(500);
    overlay.classList.add('hidden');overlay.innerHTML='';
    const from=number.getBoundingClientRect(),to=badge.getBoundingClientRect();
    const dx=to.left+to.width/2-from.left-from.width/2,dy=to.top+to.height/2-from.top-from.height/2;
    await number.animate([{transform:'translate(-50%,-50%) scale(1)'},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(${20/72})`}],{duration:700,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}).finished;
  }finally{number.remove();badge.style.visibility='';}
}
async function showSlotTotal(total){
  const overlay=$('spinOverlay');overlay.classList.remove('hidden');
  overlay.innerHTML=`<button class="spin-total" type="button" aria-label="合計${total}モジ、タップして閉じる"><span class="spin-total-stars" aria-hidden="true">✦ ✧ ✦</span><span class="spin-bonus-kicker">FREE SPINS COMPLETE</span><strong>TOTAL WIN</strong><b>${total.toLocaleString('en-US')}</b><span class="spin-total-unit">MOJI</span><small>TAP TO CONTINUE</small></button>`;
  const button=overlay.firstElementChild;button.focus({preventScroll:true});slotConfetti(85);
  button.querySelector('b').animate([{transform:'scale(.2)',opacity:0},{transform:'scale(1.12)',opacity:1,offset:.7},{transform:'scale(1)'}],{duration:700,easing:'ease-out'});
  await new Promise(resolve=>button.addEventListener('click',resolve,{once:true}));
  overlay.classList.add('hidden');overlay.innerHTML='';
}
async function runSlotSession(session,recover=false){
  if(slotSession!==session||session.running||session.loading||session.failed||!session.panel.isConnected)return;
  if(!recover && (session.record||cloud.slotPending||cloud.wallet.balance<SLOT.BET))return;
  // Draw the complete paid game and every free spin exactly once, on this click.
  const candidate=recover?null:SLOT.createRound();
  const cueRound=session.record?.round||candidate;
  session.cue=chooseSlotCue(cueRound.spins[0].cells[4]);
  const previous=slotCells().map(el=>el.dataset.symbol);
  session.running=true;busy=true;session.win=0;
  $('spinWinLabel').textContent='WIN';$('spinWinLabel').classList.remove('is-total');
  if(candidate)session.balance=cloud.wallet.balance-SLOT.BET;
  refreshSlotUI();
  try{
    $('spinPhase').textContent='GOOD LUCK';$('spinBet').textContent=SLOT.BET;
    startSlotReels(session,false);
    const record=session.record || await cloud.spinSlot(candidate);
    if(!record?.round)throw Error('スピン結果を確認できませんでした。');
    session.record=record;session.balance=record.balanceBefore-record.round.bet;refreshSlotUI();
    const round=SLOT.validateRound(record.round);
    if(round.id!==cueRound.id||round.spins[0].cells[4]!==cueRound.spins[0].cells[4]){
      session.cue=null;resetSlotCueVisuals(session);
    }
    const totals=round.spins.map((_,i)=>round.spins.slice(0,i+1).reduce((sum,spin)=>sum+spin.payout,0));
    await animateSlotSpin(session,round.spins[0]);await animateSlotWin(session,round.spins[0],totals[0]);
    if(round.freeCount){
      $('spinWinLabel').textContent='TOTAL WIN';$('spinWinLabel').classList.add('is-total');
      refreshSlotUI();
      await highlightSlotWild();
      await slotFreeRoulette(round.freeCount);
      for(let i=1;i<round.spins.length;i++){
        $('spinPhase').textContent='FREE SPINS';setSlotFreeRemaining(round.freeCount-i);$('spinBet').textContent='0';
        startSlotReels(session,true);await animateSlotSpin(session,round.spins[i]);await animateSlotWin(session,round.spins[i],totals[i]);
      }
      await showSlotTotal(round.total);
      $('spinRemaining')?.remove();
    }
    // Publish winnings to the visible balance only after the entire presentation.
    session.win=round.total;session.balance=record.balanceBefore-round.bet+round.total;
    session.completed=true;refreshSlotUI();
    $('spinPhase').textContent='保存中…';
    await cloud.finishSlot(round.id);
    session.record=null;session.completed=false;
    $('spinBet').textContent=SLOT.BET;$('spinPhase').textContent='8 LINES';
    slotCells().forEach(el=>el.classList.remove('locked'));
  }catch(error){
    // Keep the presentation balance isolated from the already-settled DB balance.
    session.failed=true;
    if(!session.record){slotCells().forEach((el,i)=>paintSlotCell(el,previous[i]));}
    reportError(error);$('spinPhase').textContent='通信を確認して開き直してください';
  }
  finally {stopSlotReels(session);resetSlotCueVisuals(session);session.cue=null;session.running=false;busy=false;refreshNav();refreshSlotUI();}
}

let hatchAnimating=false;
function renderHatch() {
  const button=$('generateButton');
  let gauge=$('hatchGauge');
  if(!gauge){
    gauge=document.createElement('span');gauge.id='hatchGauge';gauge.className='hatch-gauge';
    gauge.setAttribute('role','progressbar');gauge.setAttribute('aria-label','孵化ゲージ');
    gauge.setAttribute('aria-valuemin','0');gauge.setAttribute('aria-valuemax','10');
    gauge.innerHTML='<span class="hatch-fill"></span>';button.querySelector('.nav-icon-wrap').appendChild(gauge);
  }
  const value=Math.max(0,(cloud.hatch||0)-(cloud.hatchPending||0));
  gauge.firstElementChild.style.height=value*10+'%';gauge.setAttribute('aria-valuenow',value);
  gauge.classList.toggle('full',value>=10);
  button.classList.toggle('hatch-ready',(cloud.hatch||0)>=10);
}
async function animateHatchReward() {
  if(hatchAnimating || !(cloud.hatchPending>0) || !lootCanPlay())return;
  hatchAnimating=true;busy=true;refreshNav();
  const orb=document.createElement('span');orb.className='hatch-orb';$('app').appendChild(orb);
  try {
    const a=$('app').getBoundingClientRect(),g=$('hatchGauge').getBoundingClientRect();
    const x=a.width/2,y=a.height/2,dx=g.left+g.width/2-a.left-x,dy=g.top+g.height/2-a.top-y;
    orb.style.left=x+'px';orb.style.top=y+'px';
    await orb.animate([
      {transform:'translate(-50%,-50%) scale(.5)',opacity:0},
      {transform:'translate(-50%,-50%) scale(1)',opacity:.85,offset:.2},
      {transform:`translate(calc(-50% + ${dx*.65}px),calc(-50% + ${dy*.35}px)) scale(.8)`,opacity:.8,offset:.65},
      {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.2)`,opacity:0}
    ],{duration:750,easing:'ease-in-out',fill:'forwards'}).finished;
    orb.remove();
    cloud.revealHatch();refreshNav();
    await $('hatchGauge').animate([{filter:'brightness(2.3)',boxShadow:'0 0 18px #e6ed9b'}, {filter:'brightness(1)',boxShadow:'0 0 0 transparent'}],{duration:450}).finished;
  } catch(error){console.warn(error);}
  finally {orb.remove();hatchAnimating=false;busy=false;refreshNav();}
}
function refreshNav() {
  renderAnnouncementButton();
  renderHatch();
  refreshSlotUI();
  const cost=E.generationCost(store.emojins,cloud.uid);
  const balance=Math.max(0,updateMoji()-lootPending), available=!!store.player && (!!store.draft||cloud.hatch>=10||balance>=cost), btn=$("generateButton");
  btn.classList.toggle("available",available);
  btn.disabled=!available;
  btn.setAttribute("aria-label",store.draft?"エモジンの生成を続ける":(cloud.hatch>=10?"エモジンを生成、孵化ゲージを使用":`エモジンを生成、${cost}モジ`));
  btn.querySelector(".nav-cost").innerHTML =
  store.draft ? 'つづき' : `${cost} <small>モジ</small>`;
  $("forceBattleButton").disabled=!store.player||balance<BATTLE_COST||battlePool().length<2;
  const menuBlocked=!canOpenBattleMenu();
  // Overlays already cover this control. Do not leave it disabled after they close.
  $('battleMenuToggle').disabled=!store.player;
  if(menuBlocked)closeBattleMenu();
  for(const [mode,id] of [['challenge','challengeBattleButton'],['mine','myBattleButton']]) {
    $(id).disabled=menuBlocked||balance<E.battleMode(mode).cost;
  }
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
      el.setAttribute("aria-label",`${e.name}、星 ${e.stars}、オーナー ${e.ownerName}`);
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

function drawCity() {
  const c=$('cityCanvas'),w=$('cityScreen').clientWidth,h=$('cityScreen').clientHeight;
  if(!w||!h)return;
  canvasW=w;canvasH=h;
  // Keep the coordinate system for residents, but draw no foreground neon lines.
  c.width=w;c.height=h;c.getContext('2d').clearRect(0,0,w,h);
  for(const el of $('residents').children)fitResidentName(el);
  const bounds=worldBounds();
  for(const p of wander.values()){
    p.x=E.clamp(p.x,bounds.xmin,bounds.xmax);p.y=E.clamp(p.y,bounds.ymin,bounds.ymax);
    p.targetX=E.clamp(p.targetX,bounds.xmin,bounds.xmax);p.targetY=E.clamp(p.targetY,bounds.ymin,bounds.ymax);
  }
}
function worldLoop(time) {
  const dt=Math.min(.1,(time-priorFrame)/1000||0);priorFrame=time;
  tickLoot(dt);
  animateHatchReward();
  const visible=!document.hidden&&!playback&&$("legendScreen").classList.contains("hidden")&&$("revealScreen").classList.contains("hidden");
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

/* Generation reserves one shared draft while the egg animation plays. */
async function beginGeneration() {
  if(busy||playback)return;
  if(!store.player){showAuthChoice();return;}
  if(store.draft){
    if(store.draft.chosen){showReels(true);return;}
    if(store.draft.stage==="special"){showSpecial();return;}
    showName();return;
  }
  if(cloud.hatch<10 && updateMoji()<E.generationCost(store.emojins,cloud.uid)){refreshNav();return;}
  busy=true;
  const reservation=cloud.startDraft().then(result=>({result}),error=>({error}));
  try {await showReveal('',reservation);}
  catch(error){reportError(error);busy=false;refreshNav();return;}

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
async function showReveal(emoji,reservation=null) {
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
  if(reservation){
    const waiting=egg.animate([{transform:'rotate(-4deg)'},{transform:'rotate(4deg)'}],{duration:550,iterations:Infinity,direction:'alternate'});
    const outcome=await reservation;waiting.cancel();
    if(outcome.error){screen.classList.add('hidden');throw outcome.error;}
    store.draft=outcome.result.draft;store.wallet=cloud.wallet;hero.textContent=store.draft.emoji;refreshNav();
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
      }else el.innerHTML=icon(E.BASIC[(Math.floor((performance.now()-start)/55)+i)%E.BASIC.length].id);
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
function canOpenBattleMenu() {
  return !!store?.player && !playback && !modalKind && !modalClosing
    && ['bootScreen','battleScreen','battleCutin','tutorial','revealScreen','legendScreen','detailHost','popoverHost']
      .every(id=>$(id).classList.contains('hidden'));
}
function battleUnavailableReason(mode,{participants=true,operation=true}={}) {
  if(store.draft)return 'エモジンの生成を完了してから、バトルを開始してください。';
  if(operation && (busy||revivalPlaying))return '演出や保存が終わってから、もう一度タップしてください。';
  if(Math.max(0,updateMoji()-lootPending)<E.battleMode(mode).cost)return `${E.battleMode(mode).cost}モジ必要です。`;
  if(!participants)return '';
  if(battlePool().length<2)return 'バトルに参加できるエモジンが2体必要です。';
  if(!E.battleAnchors(battlePool(),mode,cloud.uid,active()).length)return mode==='challenge'
    ?'現在のチャンピオンは休止中のため、バトルに参加できません。'
    :'バトルに参加できるマイエモジンがいません。';
  if(!E.battleAnchors(battlePool(),mode,cloud.uid,active()).some(a=>battlePool().some(b=>E.canBattle(a,b))))return '別のオーナーのエモジンかNPCが参加できるまでお待ちください。';
  return '';
}
function closeBattleMenu(restoreFocus=false) {
  const menu=$('battleMenu'),toggle=$('battleMenuToggle');
  if(menu.classList.contains('hidden'))return;
  menu.classList.add('hidden');
  toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','バトルメニューを開く');
  if(restoreFocus)toggle.focus({preventScroll:true});
}
function toggleBattleMenu() {
  if(!$('battleMenu').classList.contains('hidden')){closeBattleMenu();return;}
  if(!canOpenBattleMenu())return;
  refreshNav();
  $('battleMenu').classList.remove('hidden');
  $('battleMenuToggle').setAttribute('aria-expanded','true');
  $('battleMenuToggle').setAttribute('aria-label','バトルメニューを閉じる');
  animate($('battleMenu'),[{transform:'translateY(10px) scale(.96)',opacity:0},{transform:'translateY(0) scale(1)',opacity:1}],180);
}
async function forceBattle(mode='forced') {
  if(!canOpenBattleMenu())return;
  const reason=battleUnavailableReason(mode,{participants:false});
  if(reason){toast(reason,4200);refreshNav();return;}
  closeBattleMenu();
  busy=true;
  let battleId;
  try {
    const {fresh,saved,log}=await showBattleCutin((async()=>{
      const fresh=await cloud.getState();
      store=fresh;renderCity();refreshNav();
      const reason=battleUnavailableReason(mode,{operation:false});
      if(reason)throw Error(reason);
      const pair=E.selectBattlePair(battlePool(),mode,cloud.uid,active());
      if(pair.length!==2)throw Error(mode==='challenge'?'チャンピオンがバトルに参加できません。':'マイエモジンがバトルに参加できません。');
      const seed=crypto.getRandomValues(new Uint32Array(1))[0],at=Date.now();
      const preview=E.battle(pair[0],pair[1],E.seeded(seed),at);
      const request={battleId:preview.battleId,rulesVersion:E.RULES_VERSION,defeatLimit:E.DEFEAT_LIMIT,mode,ids:pair.map(e=>e.id),seed,at,
        expected:pair.map(E.recordVersion)};
      const saved=await cloud.saveBattle(request);
      return {fresh,saved,log:saved.log||preview};
    })());
    store=fresh;store.wallet=cloud.wallet;battleId=log.battleId;
    log.seq=saved.seq||store.nextSeq;
    store.nextSeq=Math.max(store.nextSeq,log.seq+1);
    if(!store.battles.some(b=>b.battleId===battleId))store.battles.push(log);
    const updates=new Map(log.after.map(e=>[e.id,e]));
    store.emojins=store.emojins.map(e=>updates.get(e.id)||e);
    const known=new Set(store.emojins.map(e=>e.id));
    store.emojins.push(...(saved.npcs||[]).filter(e=>!known.has(e.id)));
    for(const l of saved.legends||[]){
      if(!store.legends.some(old=>old.emojin.id===l.emojin.id))store.legends.push(l);
      store.nextLegendSeq=Math.max(store.nextLegendSeq,l.seq+1);
    }
  } catch(error){reportError(error);}
  finally {busy=false;renderCity();refreshNav();}
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
    info.innerHTML=`<div class="battle-info-head"><h2 class="${my(e) ? "battle-my-name" : ""}">${esc(e.name)}</h2>${recordBadge(e)}</div>${hearts(e)}`;
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
    boxes.forEach((box,i)=>box.innerHTML=icon(E.BASIC[(Math.floor((performance.now()-start)/55)+i)%E.BASIC.length].id)+(rolls[i].cursed?curseMark():""));
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
function matchCaption(ev) {
  if(ev.result.kind==='double-knockout')return '相打ち · 両者 💀＋1';
  if(ev.result.kind==='draw')return '引き分け · 両者 ☆＋1';
  const side=ev.result.winner;
  return `${ev.state[side].name} の${ev.result.kind==='hp'?'判定勝ち':'勝利'} · ☆＋${ev.awards[side].stars}`;
}
function showMatchRewards(ev,animated) {
  const host=$('battleRecordFx');
  host.getAnimations({subtree:true}).forEach(a=>a.cancel());host.innerHTML='';
  ev.awards.forEach(award=>{
    const badge=infoEl(award.side).querySelector('.record-badge').getBoundingClientRect(),bounds=host.getBoundingClientRect();
    const label=document.createElement('span');label.className='battle-record-reward'+(award.defeats?' skull':'');
    label.textContent=award.stars?`☆＋${award.stars}`:'💀＋1';
    label.style.left=(badge.left-bounds.left+badge.width/2)+'px';label.style.top=(badge.top-bounds.top-10)+'px';
    host.appendChild(label);
    if(animated)animate(label,[{transform:'translate(-50%,0) scale(.4)',opacity:0},{transform:'translate(-50%,-20px) scale(1.15)',opacity:1,offset:.3},{transform:'translate(-50%,-27px) scale(1)',opacity:1}],650/replaySpeed);
  });
}
function setMatchEndingCaption(ev) {
  if(ev.deadIds.length)setCaption('💀 '+(currentBattle.defeatLimit||3)+(currentBattle.defeatLimit===5?'個以上 · ':'個 · ')+ev.state.filter(e=>ev.deadIds.includes(e.id)).map(e=>e.name).join('・')+' はボチへ');
  else if(ev.legendIds.length)setCaption('☆ 50到達 · レジェンドへ');
}
async function showMatchResult(ev,instant=false) {
  $('battleScreen').dataset.phase='finish';
  if(ev.turn)$('battleTurn').textContent=ev.turn+' / '+E.MAX_TURNS;
  const before=ev.state.map((e,side)=>({...e,stars:currentBattle.before[side].stars,
    defeats:currentBattle.before[side].defeats||0,status:'active'}));
  paintBattle(instant?ev.state:before);setCaption(matchCaption(ev));showMatchRewards(ev,!instant);
  if(instant){setMatchEndingCaption(ev);return;}
  await battleWait(700);
  // Assign the saved final records, never increment the database or a displayed final value.
  paintBattle(ev.state.map(e=>({...e,status:'active'})));
  ev.awards.forEach(award=>{
    const target=award.stars?infoEl(award.side).querySelector('.star-badge'):
      infoEl(award.side).querySelector('.defeat-record');
    if(target)animate(target,[{transform:'scale(1)'},{transform:'scale(1.65)',offset:.35},{transform:'scale(1)'}],650/replaySpeed);
  });
  await battleWait(700);paintBattle(ev.state);
  ev.state.forEach((e,side)=>{
    if(e.status==='dead')animate(fighterEl(side).querySelector('.fighter-art'),
      [{filter:'grayscale(0)',opacity:1},{filter:'grayscale(1)',opacity:.38,transform:'translateY(15px) rotate(-12deg)'}],650/replaySpeed);
  });
  setMatchEndingCaption(ev);
  await battleWait(BATTLE_TIMING.resultHold);
}
function paintFinalBattleDice(log) {
  // Read only saved rolls; replaying or skipping never draws another result.
  for(const event of log.events) {
    if(event.type==='roll')event.rolls.forEach(r=>{
      dieEl(r.side).classList.remove('twin');dieEl(r.side).innerHTML=dieTile(r);
    });
    else if(event.type==='twin'){
      dieEl(event.side).classList.add('twin');dieEl(event.side).innerHTML=event.rolls.map(dieTile).join('');
    }
  }
}
async function renderBattleEvent(ev) {
  if(ev.type==='turnStart') {
    if(deferredCurses.some(set=>set.size))await finishCurseAnimations();
    $('battleTurn').textContent=ev.turn+' / '+E.MAX_TURNS;
    deferredCurses=[new Set(),new Set()];paintBattle(ev.state);setCaption('');return;
  }
  if(ev.type==='turnEnd'){paintBattle(ev.state);return;}
  if(ev.type==='finish' && ev.awards){await showMatchResult(ev);return;}
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
    const counterSides=new Set((currentBattle.events.find(e=>e.type==="counter" && e.turn===ev.turn)?.counters||[]).map(c=>c.side));
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
  $("battleFx").innerHTML="";$("battleRecordFx").innerHTML="";
  $("skipButton").disabled=false;
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
  $("battleTurn").textContent=log.rulesVersion===4?"1 / 10":"";
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
  try {
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
  } catch(error) {
    if(error.message!=='SKIP')throw error;
    playback.skip=false;advanceBattle();
    $('battleScreen').getAnimations({subtree:true}).forEach(a=>a.cancel());
    $('battleFx').innerHTML='';clearBattleSlotFocus();deferredCurses=[new Set(),new Set()];
    paintFinalBattleDice(log);
    const finish=log.events.find(e=>e.type==='finish');
    if(finish?.awards)await showMatchResult(finish,true);
    else {paintBattle(finish?.state||log.after);setCaption('バトル結果');}
    $("battleProgress").style.setProperty("--progress",(((i+1)/total)*100)+"%");
    await waitForBattleContinue(i===total-1);
  }

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
    refreshNav();await maybeDailyDraw();return;
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
  $("battleFx").innerHTML="";$("battleRecordFx").innerHTML="";playback=null;currentBattle=null;
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
  renderCity();refreshNav();await maybeDailyDraw();
}
async function showLegend(e) {
  if(!e)return;busy=true;
  $("legendHero").textContent=e.emoji;$("legendName").textContent=e.name;
  $("legendStar").innerHTML=recordBadge(e);
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
  $('announcementsButton').onclick=showAnnouncements;
  window.addEventListener('storage',event=>{
    if(event.key===ANNOUNCEMENTS_READ_KEY || event.key===null){announcementReadAt=readAnnouncementTime();renderAnnouncementButton();}
  });
  $("generateButton").onclick=beginGeneration;
  $("forceBattleButton").onclick=()=>forceBattle();
  $('battleMenuToggle').onclick=toggleBattleMenu;
  $('challengeBattleButton').onclick=()=>forceBattle('challenge');
  $('myBattleButton').onclick=()=>forceBattle('mine');
  document.addEventListener('pointerdown',ev=>{
    if(!ev.target.closest('.nav-battle'))closeBattleMenu();
  });
  document.addEventListener('focusin',ev=>{
    if(!ev.target.closest('.nav-battle'))closeBattleMenu();
  });
  document.querySelector('.nav-battle').addEventListener('keydown',ev=>{
    if(!['ArrowUp','ArrowDown','Home','End'].includes(ev.key))return;
    if($('battleMenuToggle').disabled)return;
    ev.preventDefault();
    if($('battleMenu').classList.contains('hidden'))toggleBattleMenu();
    const items=[...$('battleMenu').querySelectorAll('button:not(:disabled)')];
    if(!items.length)return;
    const current=items.indexOf(document.activeElement);
    const next=ev.key==='Home'?0:ev.key==='End'?items.length-1:current<0?(ev.key==='ArrowUp'?items.length-1:0):(current+(ev.key==='ArrowUp'?-1:1)+items.length)%items.length;
    items[next].focus({preventScroll:true});
  });
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
    ev.stopPropagation();if(playback&&!battleContinueResolve){playback.skip=true;advanceBattle();}
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
    const zukan=ev.target.closest('[data-zukan-emoji]');
    if(zukan){showZukanDetail(zukan);return;}
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
    if(ev.target.closest('.zukan-detail-nav'))return;
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
    const keys=['active','legend','dead','zukan'],index=keys.indexOf(g.panel.dataset.activeTab);
    switchArchiveTab(g.panel,keys[E.clamp(index+(dx<0?1:-1),0,keys.length-1)]);
  });
  $('modalHost').addEventListener('pointercancel',()=>{archiveGesture=null;});
  $('modalHost').addEventListener('click',ev=>{
    if(performance.now()<suppressArchiveClickUntil && ev.target.closest('.archive-viewport')){
      ev.preventDefault();ev.stopImmediatePropagation();
    }
  },true);
  $("popoverHost").addEventListener("click",()=>closePopover());
  document.addEventListener("keydown",ev=>{
    if(ev.key==='Escape'&&!$('battleMenu').classList.contains('hidden')){ev.preventDefault();closeBattleMenu(true);return;}
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
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){syncWorld({play:true}).catch(reportError);refreshAnnouncements().catch(error=>console.warn('Announcements',error));}});
  setInterval(()=>{refreshNav();maybeDailyDraw().catch(error=>console.warn('Daily draw',error));},5000);
  setInterval(()=>{if(!document.hidden){syncWorld({play:true}).catch(reportError);refreshAnnouncements().catch(error=>console.warn('Announcements',error));}},60000);
}
async function init() {
  store=cloud.player?await cloud.getState():{
    version:1,player:null,wallet:cloud.wallet,draft:null,
    emojins:[],battles:[],legends:[],nextSeq:1,nextLegendSeq:1,
    reducedMotion:localStorage.getItem('emojin.online.reducedMotion')==='true'
  };
  document.body.classList.toggle("reduce-motion",store.reducedMotion);
  window.addEventListener('emojin-wallet',()=>{if(store){store.wallet=cloud.wallet;refreshNav();}});
  window.addEventListener('emojin-operation-cancelled',()=>{const message=cloud.takeUpgradeNotice?.();if(message)toast(message,5000);});
  installSlotButton();wireEvents();drawCity();renderCity();requestAnimationFrame(worldLoop);
  if(store.player)refreshAnnouncements().catch(error=>console.warn('Announcements',error));
  await delay(680);
  animate($("bootScreen"),[{opacity:1},{opacity:0}],350);
  await delay(350);$("bootScreen").classList.add("hidden");
  const upgradeNotice=cloud.takeUpgradeNotice?.();if(upgradeNotice)toast(upgradeNotice,5000);
  if(!store.player){showAuthChoice();return;}
  await showRevival();
  if(!store.player.tutorialSeen){showTutorial();return;}
  if(store.draft){beginGeneration();return;}
  await playUpdates();
}
// Updating is deferred until local writes finish and the owner is back in town.
window.EmojinCanReload=()=>!!store && !busy && !playback && $('battleMenu').classList.contains('hidden') && (!modalKind || modalKind==='オーナー認証') && !modalClosing
  && !revivalPlaying && !store.draft && !lootFlights && !hatchAnimating && cloud.canReload
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
