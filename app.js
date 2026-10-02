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

/* Google Apps Script /exec endpoint. Small idempotent JSONP operations avoid iframe POST transport. */
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzR3m_AsL07HjUDS3S9R5-gJzYpHGhn6YnpWGrml4S0RBUdYKceTbDv2kuD_O9N-b-V/exec';
const KEY='emojin.gas.v1';
const parse=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}};
let local=parse();
const persist=()=>localStorage.setItem(KEY,JSON.stringify(local));
let uid=local.uid ||= (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`);
local.wallet ||= {balance:3000,updatedAt:Date.now()};
local.seenBattleSeq ||= 0;local.seenLegendSeq ||= 0;
persist();
let world={emojins:[],battles:[],legends:[],nextSeq:1,nextLegendSeq:1};
async function hashPassword(password){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(password));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
function read(action, args={},timeout=25000){
  if(!ENDPOINT) return Promise.reject(new Error('app.js の ENDPOINT にGASの /exec URLを設定してください。'));
  return new Promise((resolve,reject)=>{
    const callback='emojin_cb_'+Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    const timer=setTimeout(()=>finish(new Error('GASの応答がありません。')),timeout);
    function finish(err,data){clearTimeout(timer);delete window[callback];script.remove();err?reject(err):resolve(data);}
    window[callback]=payload=>payload.ok?finish(null,payload.data):finish(new Error(payload.error||'GASでエラーが発生しました。'));
    script.onerror=()=>finish(new Error('GASとの通信に失敗しました。公開設定とURLを確認してください。'));
    script.src=ENDPOINT+'?'+new URLSearchParams({action,callback,...args,nonce:String(Date.now())});
    document.head.appendChild(script);
  });
}
function write(action,data){
  return read(action,{payload:JSON.stringify(data)},45000);
}
let flushing=null;
async function flush(){
  if(flushing)return flushing;
  flushing=(async()=>{
    const npcs=[];
    while(local.pending?.length){
      const op=local.pending[0];
      try {const result=await write(op.action,op.data);npcs.push(...(result.npcs||[]));}
      catch(error){
        if(op.action==='battle'&&/別のバトルで状態が変わりました/.test(error.message)){
          local.pending=local.pending.filter(item=>item.id!==op.id);persist();
        }
        throw error;
      }
      local.pending=local.pending.filter(item=>item.id!==op.id);persist();
    }
    return {npcs};
  })().finally(()=>{flushing=null;});
  return flushing;
}
function enqueue(action,data,id){
  local.pending ||= [];
  if(!local.pending.some(op=>op.id===id))local.pending.push({action,data,id});
  persist();return flush();
}
async function createCloud(){
  const E=window.EmojinEngine;
  if(!ENDPOINT)throw new Error('app.js の ENDPOINT にGASの /exec URLを設定してください。');
  if(local.player)flush().catch(console.warn);
  return {
    get uid(){return uid;},
    get player(){return local.player||null;},get wallet(){return local.wallet;},
    setWallet(value){local.wallet=value;persist();},
    spend(cost){local.wallet=E.accrueMoji(local.wallet,Date.now());if(local.wallet.balance<cost)throw new Error(`${cost}モジ必要です。`);local.wallet.balance-=cost;persist();},
    async getState(){
      const fresh=await read('state',{uid});
      world=fresh;
      return {version:1,player:local.player||null,wallet:local.wallet,draft:local.draft||null,
        ...world,reducedMotion:localStorage.getItem('emojin.online.reducedMotion')==='true'};
    },
    async createOwner({name,password}){
      const result=await write('register',{uid,name,passwordHash:await hashPassword(password)});
      uid=result.uid;local.uid=uid;
      local.player={uid,name,seenBattleSeq:world.nextSeq-1,seenLegendSeq:world.nextLegendSeq-1,tutorialSeen:false};
      persist();return result;
    },
    async loginOwner({name,password}){
      const result=await write('login',{name,passwordHash:await hashPassword(password)});
      const changed=uid!==result.uid;
      uid=result.uid;local.uid=uid;
      if(changed){
        local.draft=null;
        local.wallet={balance:3000,updatedAt:Date.now()};
        local.pending=(local.pending||[]).filter(op=>op.action!=='register'&&op.data?.uid===uid);
      }
      local.player={uid,name:result.name,seenBattleSeq:0,seenLegendSeq:0,tutorialSeen:true};
      persist();flush().catch(console.warn);
      return result;
    },
    markTutorialSeen(){local.player.tutorialSeen=true;persist();return Promise.resolve();},
    markSeen({battleSeq,legendSeq}){local.player.seenBattleSeq=Math.max(local.player.seenBattleSeq,battleSeq);
      local.player.seenLegendSeq=Math.max(local.player.seenLegendSeq,legendSeq);persist();return Promise.resolve();},
    startDraft(){
      if(!local.draft){this.spend(800);local.draft=E.createDraft(Math.random,Date.now());persist();}
      return {draft:local.draft,wallet:local.wallet};
    },
    chooseSpecial({name,chosen}){
      if(!local.draft?.offers.includes(chosen))throw new Error('特殊能力を選び直してください。');
      local.draft={...local.draft,name,chosen,stage:'reels'};persist();
      const e={...E.fromDraft(local.draft,name,local.player.name,chosen,Date.now()),ownerUid:uid};
      enqueue('createEmojin',{uid,emojin:e},'create-'+e.id).catch(console.warn);
      return local.draft;
    },
    async finishDraft({draftId}){
      if(local.draft?.id!==draftId)throw new Error('生成内容がありません。');
      const d=local.draft,e={...E.fromDraft(d,d.name,local.player.name,d.chosen,Date.now()),ownerUid:uid};
      // Wait only if the animation ended before the write. Retry from the saved operation on reload.
      await flush();local.draft=null;persist();return e;
    },
    saveBattle(request){return enqueue('battle',{uid,battleRequest:request},'battle-'+request.battleId);}
  };
}

createCloud().then(cloud=>{
  window.EmojinCloud=cloud;
/* Emojin online UI: shared GAS world, local wallet and animations. */
(function () {
"use strict";
const E = window.EmojinEngine;
const $ = id => document.getElementById(id);
const cloud = window.EmojinCloud;
const HOUR = 3600000;
const MOJI_CAP = 3000, EGG_COST = 800, BATTLE_COST = 100;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("ja", {granularity:"grapheme"}) : null;
const chars = s => segmenter ? [...segmenter.segment(s)].map(v => v.segment) : Array.from(s);
const normalName = s => String(s).normalize("NFC").trim().replace(/\s+/g," ");
const nameKey = s => normalName(s).toLocaleLowerCase("ja");
const isReducedSystem = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let store, modalKind = null, modalReturn = null, toastTimer, busy = false, revealReady = false;
let playback = null, currentBattle = null, battleStates = null, replaySpeed = 1;
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
function reduced() { return isReducedSystem || !!(store && store.reducedMotion); }
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
  if(play && store.player)await playUpdates();
}
function reportError(error) {
  console.error(error);
  toast(error.message || '通信に失敗しました。もう一度お試しください。',5000);
}
function active() { return store.emojins.filter(e=>e.status==="active"); }
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
function showArchive(status="active") {
  modalReturn=null;
  const tabs=[{key:"active",name:"👤"},{key:"legend",name:"🏆"},{key:"dead",name:"🪦"}];
  const chosen=tabs.findIndex(t=>t.key===status),index=chosen<0?0:chosen;
  const panes=tabs.map(tab=>{
    const emojins=store.emojins.filter(e=>e.status===tab.key&&(tab.key!=="active"||my(e)))
      .sort((a,b)=>tab.key==="active"?b.createdAt-a.createdAt:b.endedAt-a.endedAt);
    const entries=emojins.map(e=>`<button class="archive-entry" data-emojin-id="${e.id}" data-return-status="${tab.key}"><span class="archive-emoji">${e.emoji}</span><span><h3>${esc(e.name)}</h3><span class="owner-line">${tab.key==="active"?`HP ${e.currentHp} / ${e.maxHp}`:`オーナー：${esc(e.ownerName)}`}</span></span>${star(e.stars,tab.key==="legend")}<span class="archive-arrow">${nextSvg()}</span></button>`).join("");
    return `<div class="archive-pane" role="tabpanel" id="pane-${tab.key}"><div class="archive-list">${entries||'<div class="archive-empty">エモジンはいない</div>'}</div></div>`;
  }).join("");
  openModal(`<button class="archive-close" data-close-modal="true" aria-label="閲覧を閉じる">${closeSvg()}</button>
    <div class="archive-tabs" role="tablist">${tabs.map((t,i)=>`<button class="archive-tab ${i===index?"selected":""}" role="tab" tabindex="${i===index?0:-1}" aria-selected="${i===index}" aria-controls="pane-${t.key}" data-archive-tab="${t.key}">${t.name}</button>`).join("")}</div>
    <div class="archive-viewport"><div class="archive-track" style="transform:translateX(-${index*100}%)">${panes}</div></div>`,
    "エモジンを閲覧",{panelClass:"archive-panel",hideClose:true});
  $("modalHost").querySelector(".archive-panel").dataset.activeTab=tabs[index].key;
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
      if(!registering)cloud.markSeen({battleSeq:store.nextSeq-1,legendSeq:store.nextLegendSeq-1});
      await closeModal(true);
      $("bootScreen").classList.add('hidden');
      renderCity();refreshNav();
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
const tutorialSteps=[
  {target:'.mo-vessel svg',text:'ポイントを貯めて',position:'below'},
  {target:'#generateButton .egg-sign',text:'エモジンを生成する',position:'above'},
  {target:'#forceBattleButton',text:'ランダムでバトルを開催',position:'above'},
  {target:null,text:'バトルは1時間に1回自動的に開催されます',position:'center'}
];
function showTutorial(){
  let index=0;
  const host=$("tutorial"),bubble=$("tutorialBubble"),spotlight=$("tutorialSpotlight");
  host.classList.remove('hidden');
  const display=()=>{
    const step=tutorialSteps[index],rect=step.target?document.querySelector(step.target).getBoundingClientRect():null;
    bubble.textContent=step.text;
    bubble.style.cssText='';
    bubble.classList.toggle('centered',!rect);
    host.classList.toggle('no-target',!rect);
    if(rect){
      const pad=step.target==='#forceBattleButton'?5:7;
      spotlight.style.left=(rect.left-pad)+'px';
      spotlight.style.top=(rect.top-pad)+'px';
      spotlight.style.width=(rect.width+pad*2)+'px';
      spotlight.style.height=(rect.height+pad*2)+'px';
      spotlight.classList.remove('hidden');

      const viewport=window.visualViewport;
      const viewTop=viewport?.offsetTop||0;
      const viewHeight=viewport?.height||innerHeight;
      const styles=getComputedStyle(host);
      const topLimit=viewTop+(parseFloat(styles.paddingTop)||0)+12;
      const bottomLimit=viewTop+viewHeight
        -(parseFloat(styles.paddingBottom)||0)-bubble.offsetHeight-12;
      const desiredTop=step.position==='below'
        ?rect.bottom+18
        :rect.top-bubble.offsetHeight-18;

      bubble.style.position='fixed';
      bubble.style.left=Math.max(
        12,
        Math.min(innerWidth-bubble.offsetWidth-12,
          rect.left+rect.width/2-bubble.offsetWidth/2)
      )+'px';
      bubble.style.top=Math.max(topLimit,Math.min(bottomLimit,desiredTop))+'px';
    }else spotlight.classList.add('hidden');
  };
  const advance=async()=>{
    if(++index<tutorialSteps.length){display();return;}
    host.onclick=null;host.onkeydown=null;
    host.classList.add('hidden');
    cloud.markTutorialSeen();store.player.tutorialSeen=true;
    if(store.draft)beginGeneration();else playUpdates();
  };
  host.onclick=advance;
  host.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();advance();}};
  display();host.focus({preventScroll:true});
}
function refreshNav() {
  const balance=updateMoji(), available=!!store.player && (!!store.draft||balance>=EGG_COST), btn=$("generateButton");
  btn.classList.toggle("available",available);
  btn.disabled=!available;
  btn.setAttribute("aria-label",store.draft?"エモジンの生成を続ける":`エモジンを生成、${EGG_COST}モジ`);
  btn.querySelector(".nav-cost").innerHTML=store.draft?'つづき':'800 <small>モジ</small>';
  $("forceBattleButton").disabled=!store.player||balance<BATTLE_COST||active().length<2;
  $("moBalance").textContent=balance.toLocaleString("ja-JP");
  const height=38*balance/MOJI_CAP;
  $("moFluid").setAttribute("y",String(45-height));$("moFluid").setAttribute("height",String(height));
  const unread=store.player?store.battles.filter(b=>b.seq>store.player.seenBattleSeq && b.ownerNames.includes(playerName())).length:0;
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
    }
    old.delete(e.id);
    if(!wander.has(e.id))wander.set(e.id,spawnPosition(e.id));
    positionResident(el,wander.get(e.id));
  }
  for(const [id,el] of old){el.remove();wander.delete(id);}
  $("emptyCity").classList.toggle("hidden",alive.length!==0);
  refreshNav();
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
function positionResident(el,p) { el.style.left=(p.x*100)+"%";el.style.top=(p.y*100)+"%"; }
function nextTarget(p) {
  const b=worldBounds(),angle=rng()*Math.PI*2,distance=45+rng()*110;
  p.targetX=E.clamp(p.x+Math.cos(angle)*distance/(canvasW||390),b.xmin,b.xmax);
  p.targetY=E.clamp(p.y+Math.sin(angle)*distance/(canvasH||844),b.ymin,b.ymax);
  p.moving=true;
}

let traffic=[];
function drawCity() {
  const c=$("cityCanvas"),w=$("cityScreen").clientWidth,h=$("cityScreen").clientHeight;
  if(!w||!h)return;
  canvasW=w;canvasH=h;
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
  if(visible&&!modalKind&&!reduced()){
    let moving=[...wander.values()].filter(p=>p.moving).length;
    for(const el of $("residents").children){
      const p=wander.get(el.dataset.id);if(!p)continue;
      if(p.moving){
        const dx=p.targetX-p.x,dy=p.targetY-p.y,d=Math.hypot(dx*canvasW,dy*canvasH),step=p.velocity*dt;
        if(d<=step){p.x=p.targetX;p.y=p.targetY;p.moving=false;p.wait=time+8000+rng()*25000;moving--;}
        else{p.x+=dx/d*step;p.y+=dy/d*step;}
        positionResident(el,p);
      }else if(time>=p.wait&&moving<Math.max(2,Math.ceil(wander.size*.28))){
        p.wait=time+8000+rng()*25000;
        if(rng()<.28){
          const cl=rng()<.4?"spin":"wiggle";el.classList.add(cl);setTimeout(()=>el.classList.remove(cl),1550);
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
    if(active().length<2||updateMoji()<BATTLE_COST){refreshNav();return;}
    const fresh=await showBattleCutin(cloud.getState());
    store=fresh;renderCity();refreshNav();
    if(active().length<2){toast('生存中のエモジンが2体必要です。');return;}
    if(updateMoji()<BATTLE_COST){toast('100モジ必要です。');return;}
    const pair=E.sample(active(),2,Math.random);
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
  el.style.top=Math.max(72,point.y-77+offsetY)+"px";el.style.color=color;
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
function healLight(side) {
  const host=fighterEl(side).querySelector(".fighter-hit-area"),el=document.createElement("div");
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
  const host=fighterEl(side).querySelector(".fighter-hit-area");
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
    info.innerHTML=`<div class="battle-info-head"><h2>${esc(e.name)}</h2>${star(e.stars,e.status==="legend")}</div>${hearts(e)}`;
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
  return `<div class="dice-tile ${F[roll.face].special?"special":""} ${roll.cursed?"cursed":""}" data-slot="${roll.slot}">${dieContent(roll)}</div>`;
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
    box.innerHTML=dieContent(rolls[i]);
    const rect=box.getBoundingClientRect(),p=$("battleFx").getBoundingClientRect();
    particles($("battleFx"),rect.left-p.left+rect.width/2,rect.top-p.top+rect.height/2,F[rolls[i].face].special?PAL["rose-light"]:PAL["accent"],10,55);
  });
  paintBattle(battleStates);
  await battleWait(BATTLE_TIMING.diceHold);
}
async function playEvent(ev) {
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
    await battleWait(600);await rollDice(ev.rolls,ev.side);paintBattle(ev.state);return;
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
      fighterEl(c.side).appendChild(el);wheels.push(el);
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
      const host=fighterEl(c.side).querySelector(".fighter-hit-area");host.appendChild(gone);
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
  const queue=store.battles.filter(b=>(b.seq>store.player.seenBattleSeq && b.ownerNames.includes(playerName()))||extraIds.includes(b.battleId)).sort((a,b)=>a.seq-b.seq);
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
      try{await cloud.markSeen({battleSeq:store.player.seenBattleSeq,legendSeq:store.player.seenLegendSeq});}
      catch(error){reportError(error);}
    }
  }catch(err){
    if(err.message!=="SKIP"){replayCompleted=false;console.error("Replay failed.",err);toast("再生を中断しました。次回もう一度再生します。",4500);}
  }
  if(replayCompleted)store.player.seenBattleSeq=Math.max(store.player.seenBattleSeq,maxBattle);
  advanceBattle();await hideLayer($("battleScreen"));$("battleScreen").classList.add("hidden");
  $("battleScreen").getAnimations().forEach(x=>x.cancel());
  $("battleFx").innerHTML="";playback=null;currentBattle=null;
  for(const l of newLegends){
    await showLegend(l.emojin);
    store.player.seenLegendSeq=l.seq;
  }
  store.player.seenLegendSeq=Math.max(store.player.seenLegendSeq,maxLegend);
  try{await cloud.markSeen({battleSeq:store.player.seenBattleSeq,legendSeq:store.player.seenLegendSeq});}
  catch(error){reportError(error);}
  renderCity();
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
  $("speedButton").onclick=()=>{replaySpeed=replaySpeed===1?2:replaySpeed===2?4:1;$("speedButton").textContent=replaySpeed+"×";};
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
      const panel=$("modalHost").querySelector(".archive-panel"),keys=["active","legend","dead"];
      panel.dataset.activeTab=tab.dataset.archiveTab;
      panel.querySelector(".archive-track").style.transform=`translateX(-${keys.indexOf(tab.dataset.archiveTab)*100}%)`;
      panel.querySelectorAll(".archive-tab").forEach(button=>{
        const selected=button===tab;button.classList.toggle("selected",selected);
        button.setAttribute("aria-selected",String(selected));button.tabIndex=selected?0:-1;
      });
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
  if(!store.player.tutorialSeen){showTutorial();return;}
  if(store.draft){beginGeneration();return;}
  await playUpdates();
}
init().catch(err=>{
  console.error(err);$("bootScreen").classList.add("hidden");
  toast("起動できませんでした。ブラウザを更新してお試しください。",10000);
});
})();

}).catch(error=>{
  console.error('初期化に失敗しました',error);
  document.getElementById('bootScreen').classList.add('hidden');
  const toast=document.getElementById('toast');
  toast.textContent=error.message || '接続できませんでした。再読み込みしてください。';
  toast.classList.remove('hidden');
});
