'use strict';
const E=globalThis.EmojinEngine, B=E.Boss;
const HOST=window.parent!==window?window.parent.EmojinAdventureHost:null;
if(HOST)document.documentElement.dataset.embedded='true';
let starting=false,startId=null;
const CONFIG={missing:0.05,blocked:0.30,encounter:0.05,mapEnemy:0.15,heart:0.06,bomb:0.08,chest:0.02,mimic:0.04,fountain:23/10000,fountainWin:0.5,fountainMistMs:3000,turnMs:650,diceHoldMs:630,betweenTurnsMs:520,encounterFlashMs:800,floorFadeMs:480,floorSlideMs:640,bossBlackoutMs:500,bossDarkHoldMs:1000,bossPortraitMs:1600,bossMessageMs:2400,bossSlotMs:300,bossHoldMs:0,bossFrameMs:200,startDarkMs:1000,startDropMs:700,startHoldMs:1000,startExitMs:450};
const MIMIC_NAMES=['ハコジロウ','ミタコトアルヤツ','ザンネンバコ','ナカミハオレ','ホボタカラバコ','タカラジャナイ'];
const TYPES=[
{hp:[1,2],emoji:['🐁','🦨','🦎','🐍','🕷️','🦂'],names:'モプ、ポヨン、プニル、モコラ、ピピン、ポムル、クルリ、プクモ、ミョロ、フワリ、ポポラ、ムニョ、コロピ、ピョム、モチル、ポルン、プクル、モフン、ピコラ、マルポ',weights:[30,0,50,0,20,0]},
{hp:[1,3],emoji:['🧚','🧟','🐅','🐆','🐎','🦠','🎃','🧫','🪬','🧿'],names:'ゴブル、トロピ、モルグ、バグル、ギモラ、ドロム、グリポ、ガルモ、ボルガ、ゾムル、グルバ、モグド、ダルゴ、ギルポ、ロゴム、バルチ、ゴロバ、ドルピ、ガモル、グルド',weights:[30,10,40,0,10,10]},
{hp:[2,4],emoji:['👻','👽','👾','🤖','🦍','🦧','🦄','🦖','🛸','☄️','🗿'],names:'ゾピ、ムグラ、ペロチ、ガピル、ノボン、テロモ、ビャク、ポギラ、チムロ、ダボチ、ルモピ、ケロバ、ボチル、メロガ、ギャポ、トムリ、パゴン、デロピ、クモチ、ラビョン',weights:[30,20,30,0,10,10]},
{hp:[8,8],emoji:['🤡','👹','👺','🧙','🧛','🥷','🧌','🫈','👤','🐦‍🔥'],names:'ガルドン、グラモス、ドルガン、バルゴン、ゴルバス、ダルゴス、ガルモス、ギルバン、ボヨキング、ドンモグ、ガバロン、ポンゴル、モジャドン、ブヨガス、ゾルメラ、ギョロス、ザビロン、モジャガ',weights:[30,22,18,10,10,10]}];
const pick=a=>a[Math.floor(Math.random()*a.length)],int=(a,b)=>a+Math.floor(Math.random()*(b-a+1)),copy=x=>JSON.parse(JSON.stringify(x));
function weighted(items,weights,rng=Math.random){let r=rng()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<items.length;i++){r-=weights[i];if(r<0)return items[i];}return items.at(-1);}
function chestReward(rng=Math.random){return rng()<CONFIG.mimic?'mimic':weighted(['fullheal',3,4,5],[20,30,30,20],rng);}
function floorItemKind(roll){let edge=0;for(const [kind,chance] of [['heart',CONFIG.heart],['bomb',CONFIG.bomb],['chest',CONFIG.chest],['enemy',CONFIG.mapEnemy],['fountain',CONFIG.fountain]]){edge+=chance;if(roll<edge)return kind;}return null;}
function fountainOutcome(rng=Math.random){return rng()<CONFIG.fountainWin;}
function body(name,emoji,hp,slots){return {id:crypto.randomUUID(),name,emoji,maxHp:hp,baseMaxHp:hp,currentHp:hp,slots,poisoned:false,cursedSlots:[],status:'active'};}
const app=document.querySelector('#app');let run=null,mode='title',epoch=0;
const lap=(floor=run?.floor??1)=>Math.floor((floor-1)/10)+1;
const localFloor=(floor=run?.floor??1)=>(floor-1)%10+1;
const mobLevel=(floor=run?.floor??1)=>localFloor(floor)<=3?1:localFloor(floor)<=7?2:3;
const isFinalFloor=(floor=run?.floor??1)=>localFloor(floor)===10;
function skillReward(rng=Math.random){const pool=E.BASIC.filter(f=>f.id!=='blank');let n=rng()*pool.reduce((s,f)=>s+f.weight,0);return (pool.find(f=>(n-=f.weight)<0)||pool.at(-1)).id;}
function experienceReward(enemy){return (enemy.boss?(localFloor()===5?3:0):(enemy.mobLevel??mobLevel()))+lap()-1;}
const SCORE_RULES=window.parent.AdventureStore.WEIGHTS;
const SCORE_VERSION=window.parent.AdventureStore.VERSION;
function scoreDigits(score,minDigits=6){return `<span class="score-number" data-score-number aria-label="${score}">${String(score).padStart(minDigits,'0').split('').map(d=>`<span class="score-digit" aria-hidden="true">${d}</span>`).join('')}</span>`;}
function scoreMarkup(){return `<div class="score-hud">スコア　${scoreDigits(run?.score??0)}</div>`;}
function addScore(event,count=1){if(!run||run.result)return;const value=SCORE_RULES[event];if(!value||count<=0)return;const weighted=count*lap();run.score+=value*weighted;run.scoreEvents[event]=(run.scoreEvents[event]||0)+weighted;app.querySelectorAll('.score-hud [data-score-number]').forEach(el=>{el.outerHTML=scoreDigits(run.score);});}

function scoreBossHearts(hp,damage,maxHp=40){const remaining=Math.max(0,Math.min(maxHp,hp)),removed=Math.max(0,Math.min(remaining,damage));if(!removed)return;const first=maxHp-remaining+1;addScore('bossHeart',removed*(2*first+removed-1)/2);}

function finishScore(clear){if(run.result)return run.result;return run.result={id:run.id,version:SCORE_VERSION,score:run.score,floor:run.floor,level:run.level,clear,events:{...run.scoreEvents},best:false,rankIn:false,rankingChecked:false,rankingRows:null,saved:false,saving:false,error:false};}
async function ranking(tab='all',highlight=null,initialRows=null){
 mode='ranking';sceneTheme();const token=++epoch;
 app.innerHTML=`<section class="screen ranking-screen"><h1>ランキング</h1><div class="ranking-tabs" role="tablist" aria-label="ランキング"><button role="tab" aria-selected="${tab==='all'}" id="rank-all">みんな</button><button role="tab" aria-selected="${tab==='mine'}" id="rank-mine">じぶん</button></div><div id="rank-content">よみこみちゅう</div><button class="text-btn" id="back">もどる</button></section>`;
 app.querySelector('#rank-all').onclick=()=>ranking('all');app.querySelector('#rank-mine').onclick=()=>ranking('mine');app.querySelector('#back').onclick=title;
 try{const rows=tab==='all'&&initialRows?initialRows:await (tab==='all'?HOST.rankings():HOST.personal());if(epoch!==token||mode!=='ranking')return;app.querySelector('#rank-content').innerHTML=`<table class="score-table"><thead><tr><th>ランク</th><th>スコア</th><th>なまえ</th><th>ステージ</th></tr></thead><tbody>${rows.slice(0,10).map((r,i)=>`<tr class="${tab==='all'&&highlight&&r.runId===highlight.runId&&r.uid===highlight.uid?'current-run':''}"><td>${i+1}</td><td>${scoreDigits(r.score,1)}</td><td>${esc(r.name)}</td><td class="ranking-stage">${Number.isSafeInteger(r.floor)&&r.floor>0?r.floor:10}<small>かい</small></td></tr>`).join('')||'<tr><td colspan="4">きろくは まだ ないよ</td></tr>'}</tbody></table>`;}catch{if(epoch===token)app.querySelector('#rank-content').textContent='よみこめませんでした。もういちど ひらいてください。';}
}

const wait=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label={attack1:'こうげき1',attack2:'こうげき2',blank:'ハズレ',heal:'かいふく',guard:'ぼうぎょ',counter:'カウンター',poison:'どく',strong:'きょうげき',drain:'きゅうけつ',ram:'たいあたり',twin:'ツイン',fullheal:'ぜんかいふく',curse:'のろい',devil:'ひっさつわざ'};
const SLOT_ORDER={attack2:1,attack1:2,counter:3,guard:4,heal:5,blank:6};
function slotEntries(f,isEnemy=false){const entries=f.slots.map((face,index)=>({face,index}));return entries.sort((a,b)=>isEnemy?(SLOT_ORDER[a.face]??0)-(SLOT_ORDER[b.face]??0):Number(!E.SPECIAL.includes(a.face))-Number(!E.SPECIAL.includes(b.face)));}
function abilityIcon(face,blocked=false,effect=null){const value={attack2:2,strong:3,ram:4}[face];return `<span class="ability-glyph">${face==='devil'?B.icon(effect):`<span>${E.FACES[face].icon}</span>${value?`<span class="ability-value">${value}</span>`:''}`}${blocked?'<span class="ability-curse" aria-label="のろい">☠️</span>':''}</span>`;}
function slots(f,selected,isEnemy=false){return `<div class="slots">${slotEntries(f,isEnemy).map(({face:s,index:i})=>`<div data-slot="${i}" class="slot ${selected===i?'selected':''} ${f.cursedSlots.includes(i)?'cursed':''}" aria-label="${label[s]}" title="${esc((s==='devil'?B.FACE:E.FACES[s]).text)}">${abilityIcon(s,f.cursedSlots.includes(i),s==='devil'?f.bossEffect:null)}</div>`).join('')}</div>`;}
function hearts(f,extra=''){const base=f.baseMaxHp??f.maxHp;return `<div class="hearts ${extra}" role="img" aria-label="HP ${f.currentHp} / ${f.maxHp}">${Array.from({length:f.maxHp},(_,i)=>`<span class="heart ${i>=base?'gold':''} ${i>=f.currentHp?'lost':''}" aria-hidden="true">♥</span>`).join('')}</div>`;}
function sceneTheme(floor=null){const cycle=lap(floor??run?.floor??1),stage=localFloor(floor??1),ratio=(10-stage)/9;const palette=cycle===1?[[52,31,19],[114,77,49],[38,38,38],[167,119,77],[105,105,105]]:cycle===2?[[16,32,24],[49,84,60],[19,34,24],[86,128,99],[57,80,63]]:[[32,16,40],[83,53,104],[29,20,37],[130,94,153],[79,59,92]];const color=(a,b)=>`rgb(${a.map((v,i)=>Math.round(b[i]+(v-b[i])*ratio)).join(',')})`;const bg=floor===null?'#000':color(palette[0],[0,0,0]),tile=floor===null?'#353535':color(palette[1],palette[2]),light=floor===null?'#737373':color(palette[3],palette[4]);const root=document.documentElement;root.dataset.adventureAura=cycle===1?'none':cycle===2?'green':'purple';root.style.setProperty('--enemy-aura',cycle===2?'#61db7e':'#a455db');root.style.setProperty('--enemy-aura-low',cycle===2?'#328a4d':'#632680');root.style.setProperty('--scene-bg',bg);root.style.setProperty('--tile',tile);root.style.setProperty('--reachable',light);document.body.style.backgroundColor=bg;app.style.backgroundColor=bg;}
function treasureChest(){return '<svg class="treasure-chest" viewBox="0 0 48 38" role="img" aria-label="たからばこ" shape-rendering="crispEdges"><g class="chest-body"><path d="M5 14h38v20H5z" fill="#794720" stroke="#23160c" stroke-width="3"/><path d="M10 14h5v19h-5zm23 0h5v19h-5z" fill="#d6a343"/><path d="M5 14h38v5H5z" fill="#d6a343"/></g><g class="chest-lid"><path d="M5 15V7h4V3h30v4h4v8z" fill="#98602c" stroke="#23160c" stroke-width="3"/><path d="M10 4h5v10h-5zm23 0h5v10h-5z" fill="#d6a343"/><path d="M5 13h38v4H5z" fill="#d6a343"/><path d="M21 12h7v11h-7z" fill="#efc868" stroke="#38240e" stroke-width="2"/><path d="M24 15h2v4h-2z" fill="#38240e"/></g></svg>';}
function mimicArt(){return '<svg class="mimic-art" viewBox="0 0 48 48" role="img" aria-label="ミミック" shape-rendering="crispEdges"><path d="M4 16V8h4V4h32v4h4v8z" fill="#98602c" stroke="#23160c" stroke-width="3"/><path d="M9 5h5v10H9zm25 0h5v10h-5z" fill="#d6a343"/><path d="M14 9h7v4h-7zm13 0h7v4h-7z" fill="#ed5252"/><path d="M4 17h40v18H4z" fill="#180d16" stroke="#23160c" stroke-width="3"/><path d="M7 17h6v7h-3v-3H7zm11 0h6v7h-3v-3h-3zm11 0h6v7h-3v-3h-3zm10 0h4v7h-3v-3h-1zM8 34v-7h3v3h3v4zm22 0v-7h3v3h3v4z" fill="#fff4d7"/><path d="M20 28h7v10h-3v3h-7v-4h3z" fill="#bc497a"/><path d="M5 35h38v9H5z" fill="#794720" stroke="#23160c" stroke-width="3"/><path d="M9 35h5v8H9zm25 0h5v8h-5z" fill="#d6a343"/></svg>';}
function staircase(){return '<svg class="stairs" viewBox="0 0 32 32" role="img" aria-label="くだりかいだん" shape-rendering="crispEdges"><path fill="#737d73" d="M0 0h32v32H0z"/><path fill="#030603" d="M2 2h28v28H2z"/><path fill="#414d3c" d="M2 2h28v3h-5v4h-6v5h-6v5H7v4H2z"/><path fill="#222d1d" d="M2 2h4v5H2zM6 7h5v5H6zM11 12h5v4h-5zM16 16h3v3h-3z"/><path fill="#52604b" d="M10 2h20v3H25v4h-6v4h-4V8h-5z"/><path fill="#333f2c" d="M6 2h4v5H6zM10 7h5v5h-5zM15 12h4v4h-4z"/><path fill="#737e70" d="M7 23h6v6H7z"/><path fill="#939d8c" d="M15 17h6v12h-6z"/><path fill="#adb6a4" d="M23 9h6v20h-6z"/><path fill="#626d5d" d="M7 23h2v6H7zM15 17h2v12h-2zM23 9h2v20h-2z"/><path fill="#515e4c" d="M2 29h28v1H2z"/></svg>';}
function animateNode(node,frames,duration=300,options={}){if(!node)return Promise.resolve();const animation=node.animate(frames,{duration,easing:'ease-out',...options});return animation.finished.catch(()=>{});}
function center(rect){return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};}
async function flyIcon(icon,fromRect,toRect,duration=480,bend=35){if(!fromRect||!toRect)return;const from=center(fromRect),to=center(toRect),node=document.createElement('span');node.className='flying-pickup';node.textContent=icon;node.style.left=from.x+'px';node.style.top=from.y+'px';document.body.append(node);await animateNode(node,[{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${(to.x-from.x)*.5}px),calc(-50% + ${(to.y-from.y)*.5-bend}px)) scale(1.3)`,opacity:1,offset:.5},{transform:`translate(calc(-50% + ${to.x-from.x}px),calc(-50% + ${to.y-from.y}px)) scale(.65)`,opacity:1}],duration,{easing:'linear'});node.remove();}
async function slideHero(hero,target){const from=center(hero.getBoundingClientRect()),to=center(target.getBoundingClientRect()),node=document.createElement('span');node.className='moving-hero';node.textContent=run.player.emoji;Object.assign(node.style,{left:from.x+'px',top:from.y+'px',fontSize:getComputedStyle(hero).fontSize});hero.style.visibility='hidden';document.body.append(node);await animateNode(node,[{transform:'translate(-50%,-50%)'},{transform:`translate(calc(-50% + ${to.x-from.x}px),calc(-50% + ${to.y-from.y}px))`}],190,{easing:'linear'});node.remove();}
function title(){epoch++;run=null;mode='title';sceneTheme();app.innerHTML=`<section class="screen title-screen"><h1>エモジン<small>の</small>ぼうけん</h1><div class="sword">🗡️</div><nav class="menu"><button id="start" disabled>はじめる</button><button id="help">あそびかた</button><button id="ranking">ランキング</button><button id="exit">おわる</button></nav><div class="play-price">1PLAY 100モジ</div><p id="start-error" role="status"></p></section>`;document.querySelector('#start').onclick=start;document.querySelector('#help').onclick=help;document.querySelector('#ranking').onclick=()=>ranking();document.querySelector('#exit').onclick=()=>HOST?.exit();refreshStartButton();}

function help(page=0){
 if(typeof page!=='number')page=0;
 mode='help';sceneTheme();
 const pages=[
 {art:'<span class="help-emoji">🗡️</span>',text:'エモジンが ゆめを みるころ<br>ひみつの ぼうけんが はじまる。<br>さあ ゆめの ダンジョンへ。'},
 {art:helpDungeon(),text:'かいだんを みつけて<br>ちかへ ちかへと すすもう。<br>よりみちには おたからも きけんも。'},
 {art:'<span class="help-emoji help-vampire">😈</span>',text:'ちか じゅっかいで まつ ラスボス。<br>くらやみの おくの つよいてきを<br>きみの エモジンは たおせるか。'},
 {art:'<span class="help-emoji">💣</span>',text:'ひとつめの ヒント<br>ばくだんを たくさん あつめよう。<br>ボスとの たたかいで たすけになる。'},
 {art:'<span class="help-gold-heart">♥</span>',text:'ふたつめの ヒント<br>てきを たおして レベルアップ。<br>きんの ハートが ふえていく。'}
 ];
 const entry=pages[page];
 app.innerHTML=`<section class="screen help-book" aria-label="あそびかた"><div class="help-picture" aria-hidden="true">${entry.art}</div><div class="help-dialog" aria-live="polite">${entry.text}</div><nav class="help-navigation"><button class="help-arrow" id="help-prev" aria-label="まえへ" ${page===0?'disabled':''}>◀</button><button class="text-btn" id="back">もどる</button><button class="help-arrow" id="help-next" aria-label="つぎへ" ${page===pages.length-1?'disabled':''}>▶</button></nav></section>`;
 document.querySelector('#help-prev').onclick=()=>help(page-1);
 document.querySelector('#help-next').onclick=()=>help(page+1);
 document.querySelector('#back').onclick=title;
 const screen=app.querySelector('.help-book');
 screen.onkeydown=e=>{if(e.key==='ArrowLeft'&&page>0){e.preventDefault();help(page-1);}if(e.key==='ArrowRight'&&page<pages.length-1){e.preventDefault();help(page+1);}};
 let touchX=null;screen.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX;},{passive:true});screen.addEventListener('touchend',e=>{if(touchX===null)return;const distance=e.changedTouches[0].clientX-touchX;if(Math.abs(distance)>60){if(distance<0&&page<pages.length-1)help(page+1);if(distance>0&&page>0)help(page-1);}touchX=null;},{passive:true});
}
function helpDungeon(){const cells=Array.from({length:25},(_,i)=>`<span class="help-cell ${[4,10,20].includes(i)?'missing':''} ${i===18?'help-stair-cell':''}">${i===6?'🐱':i===8?'💣':i===16?'❤️':i===18?staircase():''}</span>`).join('');return `<div class="help-dungeon">${cells}</div>`;}

function modal(heading,message,done,button='とじる'){const el=document.createElement('div');el.className='modal';el.innerHTML=`<div class="panel"><h2>${heading}</h2><p>${message}</p><button class="primary">${button}</button></div>`;app.append(el);el.querySelector('button').onclick=()=>{el.remove();if(done)done();};}
function enemy(type,floor=run?.floor??1){const t=TYPES[type],hp=int(...t.hp)+(lap(floor)-1)*(type===3?2:1),s=Array.from({length:type===3?5:6},()=>weighted(E.BASIC.map(f=>f.id),t.weights));if(type===3)s.push(pick(E.SPECIAL));return body(pick(t.names.split('、')),pick(t.emoji),hp,s);}
function mimic(){return {...enemy(2),name:pick(MIMIC_NAMES),emoji:mimicArt(),mobLevel:3,mimic:true};}
function adjacent(i){const a=[];if(i%5)a.push(i-1);if(i%5<4)a.push(i+1);if(i>=5)a.push(i-5);if(i<20)a.push(i+5);return a;}
const key=(a,b)=>a<b?`${a}-${b}`:`${b}-${a}`;
function reachable(cells,edges,start){const found=new Set([start]),queue=[start];for(let i=0;i<queue.length;i++)for(const n of adjacent(queue[i]))if(cells[n]&&edges.has(key(n,queue[i]))&&!found.has(n)){found.add(n);queue.push(n);}return found;}
function generateFloor(floor,start){const cells=Array.from({length:25},(_,i)=>i===start||Math.random()>=CONFIG.missing),edges=new Set();for(let i=0;i<25;i++)if(cells[i])for(const n of adjacent(i))if(n>i&&cells[n]&&Math.random()>=CONFIG.blocked)edges.add(key(i,n));let found=reachable(cells,edges,start);if(found.size<2){const n=pick(adjacent(start));cells[n]=true;edges.add(key(start,n));found=reachable(cells,edges,start);}let goals=[...found].filter(x=>x!==start&&!adjacent(start).includes(x));if(!goals.length){const first=pick(adjacent(start)),second=pick(adjacent(first).filter(x=>x!==start&&!adjacent(start).includes(x)));cells[first]=cells[second]=true;edges.add(key(start,first));edges.add(key(first,second));found=reachable(cells,edges,start);goals=[...found].filter(x=>x!==start&&!adjacent(start).includes(x));}const goal=pick(goals);const items={};for(let i=0;i<25;i++)if(cells[i]&&i!==start&&i!==goal){const kind=floorItemKind(Math.random());if(kind)items[i]=kind==='enemy'?{kind,enemy:enemy(mobLevel(floor)-1,floor)}:kind==='bomb'?{kind,amount:1}:{kind};}return {floor,cells,edges,goal,items,boss:localFloor(floor)===5?enemy(3,floor):isFinalFloor(floor)?{...B.prepare(run.legend?copy(run.legend):{...enemy(3,floor),maxHp:40,baseMaxHp:40,currentHp:40}),bossN:lap(floor)}:null};}
function refreshStartButton(){if(mode!=='title'||starting)return;const status=HOST?.status();const b=app.querySelector('#start');if(b)b.disabled=!status||status.balance<100||!status.hasPlayer;}
setInterval(refreshStartButton,1000);
function createRun(record){epoch++;const player=copy(record.player);run={id:record.runId,score:0,scoreEvents:{},result:null,player,bombs:0,level:1,xp:0,floor:1,pos:int(0,24),steps:0,busy:false,visited:[],message:'',started:Date.now(),battles:0,legend:record.legend};run.map=generateFloor(1,run.pos);run.visited=[`1:${run.pos}`];}
async function start(){
 if(starting||!HOST||mode!=='title')return;starting=true;app.querySelector('#start').disabled=true;app.querySelector('#exit').disabled=true;app.querySelector('#help').disabled=true;app.querySelector('#ranking').disabled=true;
 const key='emojin.adventure.start.'+HOST.status().uid;
 try{if(!startId){try{startId=sessionStorage.getItem(key);}catch{}startId||='adventure-'+crypto.randomUUID();try{sessionStorage.setItem(key,startId);}catch{}}
 const record=await HOST.start(startId);createRun(record);startId=null;try{sessionStorage.removeItem(key);}catch{}await startIntroduction(epoch);
 }catch(error){const message=app.querySelector('#start-error');if(message)message.textContent=error.message||'つうしんを かくにんしてください。';}
 finally{starting=false;app.querySelectorAll('.menu button').forEach(b=>b.disabled=false);refreshStartButton();}
}
async function startIntroduction(token){mode='game-intro';run.busy=true;sceneTheme();app.innerHTML='<section class="screen game-intro" data-phase="dark"></section>';await wait(CONFIG.startDarkMs);if(epoch!==token)return;const screen=app.querySelector('.game-intro'),hero=document.createElement('span');hero.className='start-hero';hero.textContent=run.player.emoji;screen.append(hero);screen.dataset.phase='drop';await animateNode(hero,[{transform:'translate(-50%,-50%) translateY(-80vh)'},{transform:'translate(-50%,-50%) translateY(0)'}],CONFIG.startDropMs,{fill:'forwards',easing:'ease-in'});if(epoch!==token)return;screen.dataset.phase='hold';await wait(CONFIG.startHoldMs);if(epoch!==token)return;screen.dataset.phase='exit';await animateNode(hero,[{transform:'translate(-50%,-50%) translateX(0)'},{transform:'translate(-50%,-50%) translateX(-90vw)'}],CONFIG.startExitMs,{fill:'forwards',easing:'linear'});if(epoch!==token)return;drawMap();run.busy=false;}
function xpNeeded(level=run.level){return level+1;}
function gainExperience(amount=1){let levels=0;run.xp+=amount;while(run.xp>=xpNeeded()){run.xp-=xpNeeded();run.level++;run.player.maxHp++;levels++;addScore('level',run.level);}return levels;}
function experienceMarkup(){const needed=xpNeeded();return `<div class="experience"><span>レベル ${run.level}</span><div class="xp-track" role="progressbar" aria-label="けいけんち" aria-valuemin="0" aria-valuemax="${needed}" aria-valuenow="${run.xp}"><span style="width:${run.xp/needed*100}%"></span></div><span class="xp-reward-heart" role="img" aria-label="つぎの レベルで きんの ハート">♥</span></div>`;}
function itemIcon(item){return !item?'':item.kind==='heart'?'♥':item.kind==='bomb'?'💣':item.kind==='enemy'?item.enemy.emoji:item.kind==='fountain'?'<span class="fountain-glyph">⛲️<i class="fountain-haze" aria-hidden="true"></i></span>':treasureChest();}
let mapResizeObserver=null;
function fitDungeon(screen){
 if(!screen?.isConnected||mode!=='map')return;
 const area=screen.querySelector('.dungeon-area'),board=screen.querySelector('.board');
 const style=getComputedStyle(area),gap=parseFloat(style.columnGap)||0,rail=screen.querySelector('.depth-meter').getBoundingClientRect().width;
 const size=Math.max(1,Math.min(area.clientWidth-rail-gap,area.clientHeight));
 board.style.width=size+'px';board.style.height=size+'px';
 const cell=(size-4*(parseFloat(getComputedStyle(board).gap)||0))/5;
 screen.style.setProperty('--map-cell-size',Math.max(1,cell)+'px');
 const floor=Math.max(4,Math.min(20,(area.clientHeight-90)/10));
 screen.style.setProperty('--depth-floor-height',floor+'px');
 screen.style.setProperty('--depth-step',(floor+2)+'px');
}
function watchDungeon(){
 mapResizeObserver?.disconnect();const screen=app.querySelector('.map-screen');fitDungeon(screen);
 if(typeof ResizeObserver!=='undefined'){mapResizeObserver=new ResizeObserver(()=>fitDungeon(screen));mapResizeObserver.observe(screen.querySelector('.dungeon-area'));}
}
window.addEventListener('resize',()=>fitDungeon(app.querySelector('.map-screen')));
function drawMap(){if(!run)return;mode='map';sceneTheme(run.floor);const {player:p,map:m,pos}=run;app.innerHTML=`<section class="screen map-screen">${scoreMarkup()}<div class="dungeon-area"><div class="depth-meter"><div class="depth-label">ちか${run.floor}</div><div class="tower" role="img" aria-label="げんざい ちか${run.floor}かい"><div class="tower-marker" style="--floor:${localFloor()}"></div>${Array.from({length:10},(_,i)=>`<div class="floor ${i+1===localFloor()?'active':i+1<localFloor()?'past':''}"></div>`).join('')}</div></div><div class="board">${m.cells.map((exists,i)=>{const item=m.items[i],isGoal=i===m.goal,can=adjacent(pos).includes(i)&&m.edges.has(key(pos,i)),content=isGoal?(m.boss?(isFinalFloor()?'😈':m.boss.emoji):staircase()):itemIcon(item);return `<button class="cell ${!exists?'empty':''} ${can?'reachable':''} ${i===pos?'current':''} ${item?.kind==='enemy'?'enemy-cell':''} ${item?.kind==='fountain'?'fountain-cell':''} ${isGoal&&m.boss?'boss-cell':''} ${i%5<4&&m.edges.has(key(i,i+1))?'east':''} ${i%5<4&&m.edges.has(key(i,i+1))&&(i===pos||i+1===pos)?'east-active':''} ${i<20&&m.edges.has(key(i,i+5))?'south':''} ${i<20&&m.edges.has(key(i,i+5))&&(i===pos||i+5===pos)?'south-active':''}" data-cell="${i}" ${!exists||!can?'disabled':''} aria-label="${i===pos?'げんざいち':isGoal?(m.boss?'ボス':'かいだん'):item?.kind==='heart'?'かいふく':item?.kind==='bomb'?'ばくだん':item?.kind==='chest'?'たからばこ':item?.kind==='enemy'?'てき':item?.kind==='fountain'?'ネガイノイズミ':'マス'} ${i+1}">${i===pos?`<span class="hero">${p.emoji}</span>${content?`<span class="under">${content}</span>`:''}`:`<span class="cell-content">${content}</span>`}</button>`;}).join('')}</div></div><section class="status"><div class="profile"><span class="avatar">${p.emoji}</span><div class="name">${p.name}</div><div class="bomb-stock">💣×${run.bombs}</div></div>${hearts(p,'status-hearts')}${experienceMarkup()}${slots(p)}</section><footer class="bottom"><button class="text-btn" id="flee">にげる</button></footer></section>`;app.querySelectorAll('[data-cell]').forEach(b=>b.onclick=()=>move(Number(b.dataset.cell)));document.querySelector('#flee').onclick=title;watchDungeon();}
async function move(to){if(!run||run.busy||mode!=='map'||!adjacent(run.pos).includes(to)||!run.map.edges.has(key(run.pos,to)))return;const token=epoch;run.busy=true;const hero=app.querySelector('.hero'),target=app.querySelector(`[data-cell="${to}"]`);if(hero&&target)await slideHero(hero,target);if(epoch!==token)return;run.pos=to;run.steps++;const visit=`${run.floor}:${to}`;if(!run.visited.includes(visit)){run.visited.push(visit);}run.message='';const m=run.map;
 if(to===m.goal){drawMap();if(m.boss)await encounter(m.boss,true);else await nextFloor();return;}
 const item=m.items[to];if(item?.kind==='fountain'){delete m.items[to];drawMap();await openFountain();if(epoch!==token)return;run.busy=false;drawMap();return;}drawMap();
 if(item?.kind==='enemy'){await encounter(item.enemy,false,to);return;}
 if(item?.kind==='heart'){if(run.player.currentHp<run.player.maxHp){const from=app.querySelector(`[data-cell="${to}"]`).getBoundingClientRect(),dest=app.querySelector('.status-hearts .heart.lost')?.getBoundingClientRect();delete m.items[to];drawMap();await flyIcon('♥',from,dest,240);if(epoch!==token)return;run.player.currentHp++;addScore('heart');run.message='HPが 1 かいふくした';drawMap();animateNode(app.querySelector('.status-hearts'),[{transform:'scale(1)'},{transform:'scale(1.1)',offset:.45},{transform:'scale(1)'}],240);}else run.message='HPは まんたん！ ハートは のこしておこう';}
 if(item?.kind==='bomb'){const from=app.querySelector(`[data-cell="${to}"]`).getBoundingClientRect(),dest=app.querySelector('.bomb-stock').getBoundingClientRect();delete m.items[to];drawMap();await flyIcon('💣',from,dest,175);if(epoch!==token)return;run.bombs+=item.amount;addScore('bomb',item.amount);run.message=`💣 ばくだんを ${item.amount}こ ひろった`;}
 drawMap();if(item?.kind==='chest'){const foe=await openChest();if(epoch!==token)return;if(foe){drawMap();await encounter(foe,false,to);return;}}
 if(Math.random()<CONFIG.encounter){const lv=mobLevel()-1;await encounter(enemy(lv),false);}else {run.busy=false;drawMap();}}
function openChest(){const token=epoch;return new Promise(resolve=>{
 const overlay=document.createElement('div');overlay.className='chest-overlay';overlay.tabIndex=0;overlay.setAttribute('role','button');overlay.setAttribute('aria-label','たからばこを あける');overlay.dataset.phase='closed';overlay.innerHTML=`<span class="chest-art">${treasureChest()}</span>`;app.append(overlay);let opened=false,opening=false;
 async function tap(){
  if(epoch!==token){overlay.remove();resolve();return;}if(opening)return;if(opened){overlay.remove();resolve();return;}
  opening=true;overlay.dataset.phase='opening';overlay.classList.add('opening');overlay.querySelector('.chest-lid').remove();await wait(250);if(epoch!==token){overlay.remove();resolve();return;}
  const reward=chestReward();overlay.querySelector('.chest-art').remove();
  if(reward==='mimic'){
   const foe=mimic();run.map.items[run.pos]={kind:'enemy',enemy:foe};overlay.dataset.phase='mimic';overlay.setAttribute('aria-label',foe.name+'が あらわれた');
   const portrait=document.createElement('span');portrait.className='chest-mimic';portrait.innerHTML=foe.emoji;overlay.append(portrait);
   await animateNode(portrait,[{transform:'translateY(15px) scale(.8)',opacity:0},{transform:'translateY(-10px) scale(1.12)',opacity:1,offset:.4},{transform:'translateY(0) scale(1)',opacity:1}],450,{easing:'steps(6,end)',fill:'forwards'});
   await wait(500);overlay.remove();resolve(epoch===token?foe:undefined);return;
  }
  delete run.map.items[run.pos];addScore('chest');if(reward==='fullheal'){run.player.currentHp=run.player.maxHp;addScore('fullheal');}else{run.bombs+=reward;addScore('bomb',reward);}
  overlay.dataset.phase='reward';overlay.setAttribute('aria-label','ダンジョンに もどる');const item=document.createElement('span');item.className='chest-reward';item.innerHTML=reward==='fullheal'?'💖':`<span class="chest-bomb">💣<span class="chest-amount">${reward}</span></span>`;overlay.append(item);animateNode(item,[{transform:'translate(-50%,calc(-50% + 18px))',opacity:0},{transform:'translate(-50%,-50%)',opacity:1}],400,{fill:'forwards'});opened=true;opening=false;
 }
 overlay.onclick=tap;overlay.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tap();}};overlay.focus();
});}
async function fountainFlight(amount,from,to,returning=false){
 const icon=document.createElement('span');icon.className='fountain-bomb';icon.innerHTML=`💣${amount>1?`<small>×${amount}</small>`:''}`;Object.assign(icon.style,{left:from.x+'px',top:from.y+'px'});document.body.append(icon);const dx=to.x-from.x,dy=to.y-from.y;
 try{if(returning){await animateNode(icon,[{transform:'translate(-50%,-50%) scale(.15)',opacity:0},{transform:'translate(-50%,calc(-50% - 90px)) scale(1)',opacity:1}],750,{fill:'forwards'});await wait(500);await animateNode(icon,[{transform:'translate(-50%,calc(-50% - 90px)) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.35)`,opacity:1}],850,{fill:'forwards'});}else await animateNode(icon,[{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${dx*.5}px),calc(-50% + ${dy*.5-65}px)) scale(.95)`,opacity:1,offset:.55},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.2)`,opacity:0}],850,{fill:'forwards'});}finally{icon.remove();}
}
function fountainMist(canvas,token){const ctx=canvas.getContext('2d'),start=performance.now();return new Promise(resolve=>{
 function frame(now){if(epoch!==token||!canvas.isConnected){resolve();return;}const elapsed=now-start,t=elapsed/1000,fade=Math.min(1,elapsed/350);ctx.clearRect(0,0,120,100);
  for(let i=0;i<10;i++){const x=60+Math.sin(i*2.4+t*.9)*35,y=59+Math.sin(i*1.7-t*.65)*14-i*.9,w=19+(i%3)*7,h=9+(i%4)*2;ctx.globalAlpha=(.14+(i%3)*.045)*fade;ctx.fillStyle=['#bff7ff','#73d8e8','#428fae'][i%3];for(let row=-2;row<=2;row++){const inset=Math.abs(row)*4;ctx.fillRect(Math.round((x-w/2+inset)/2)*2,Math.round((y+row*h/3)/2)*2,w-inset*2,h/2+3);}}
  ctx.globalAlpha=1;if(elapsed<CONFIG.fountainMistMs)requestAnimationFrame(frame);else resolve();
 }requestAnimationFrame(frame);
});}
async function openFountain(){
 const token=epoch,under=app.querySelector('.map-screen'),overlay=document.createElement('section');mode='fountain';run.busy=true;if(under)under.inert=true;
 overlay.className='fountain-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','ネガイノイズミ');overlay.innerHTML='<div class="fountain-scene"><span class="fountain-portrait" role="img" aria-label="ネガイノイズミ">⛲️</span><canvas class="fountain-fog" width="120" height="100" aria-hidden="true"></canvas></div><div class="fountain-dialog"></div><div class="fountain-stock" aria-live="polite"></div>';app.append(overlay);
 const dialog=overlay.querySelector('.fountain-dialog'),portrait=overlay.querySelector('.fountain-portrait'),fog=overlay.querySelector('canvas'),stock=overlay.querySelector('.fountain-stock');
 const update=()=>{stock.textContent='💣×'+run.bombs;};const water=()=>{const r=portrait.getBoundingClientRect();return {x:r.left+r.width*.5,y:r.top+r.height*.72};};
 const splash=()=>{const scene=overlay.querySelector('.fountain-scene'),r=scene.getBoundingClientRect(),at=water();for(let i=0;i<12;i++){const dot=document.createElement('i');dot.className='fountain-drop';Object.assign(dot.style,{left:(at.x-r.left)+'px',top:(at.y-r.top)+'px'});scene.append(dot);const dx=(i-5.5)*10,dy=-35-(i%4)*12;animateNode(dot,[{transform:'translate(0,0)',opacity:0},{transform:`translate(${dx*.5}px,${dy}px)`,opacity:1,offset:.45},{transform:`translate(${dx}px,20px)`,opacity:0}],600,{delay:(i%3)*30}).then(()=>dot.remove());}};
 const message=(text,phase)=>{overlay.dataset.phase=phase;dialog.innerHTML='<button class="fountain-message" type="button"><span></span><i aria-hidden="true">▼</i></button>';const b=dialog.querySelector('button');b.querySelector('span').textContent=text;b.focus({preventScroll:true});return new Promise(resolve=>b.addEventListener('click',resolve,{once:true}));};
 try{
  update();await message('これは ネガイノイズミ。\nねがいを こめて\nばくだんを なげこもう。','intro');if(epoch!==token)return;
  overlay.dataset.phase='choose';dialog.innerHTML='<div class="fountain-picker"><span class="fountain-quantity">💣×<span>0</span></span><div class="fountain-arrows"><button type="button" aria-label="ばくだんを ふやす">▲</button><button type="button" aria-label="ばくだんを へらす">▼</button></div></div><button type="button" class="fountain-throw"></button>';
  const [up,down]=dialog.querySelectorAll('.fountain-arrows button'),send=dialog.querySelector('.fountain-throw');let amount=0;
  const render=()=>{dialog.querySelector('.fountain-quantity>span').textContent=amount;send.textContent=`ばくだんを ${amount}こ なげこむ`;up.disabled=amount>=run.bombs;down.disabled=amount===0;};
  up.onclick=()=>{amount=Math.min(run.bombs,amount+1);render();};down.onclick=()=>{amount=Math.max(0,amount-1);render();};render();send.focus({preventScroll:true});
  const wager=await new Promise(resolve=>send.addEventListener('click',()=>{dialog.querySelectorAll('button').forEach(b=>b.disabled=true);resolve(Math.min(run.bombs,amount));},{once:true}));if(epoch!==token||wager===0)return;
  const success=fountainOutcome(),source=center(dialog.querySelector('.fountain-quantity').getBoundingClientRect());run.bombs-=wager;update();overlay.dataset.phase='throw';await fountainFlight(wager,source,water());if(epoch!==token)return;
  dialog.innerHTML='';splash();overlay.dataset.phase='mist';await fountainMist(fog,token);if(epoch!==token)return;overlay.dataset.phase='clearing';await animateNode(fog,[{opacity:1},{opacity:0}],500);fog.getContext('2d').clearRect(0,0,120,100);if(epoch!==token)return;
  if(success){overlay.dataset.phase='return';splash();await fountainFlight(wager*2,water(),center(stock.getBoundingClientRect()),true);if(epoch!==token)return;run.bombs+=wager*2;addScore('bomb',wager*2);update();await animateNode(stock,[{transform:'scale(1)'},{transform:'scale(1.17)',offset:.45},{transform:'scale(1)'}],300);if(epoch!==token)return;await message('ばくだんが ふえて\nもどってきた！','success');}
  else await message('なにも おこらなかった。','failure');
 }finally{overlay.remove();if(under)under.inert=false;}
}
async function nextFloor(){const token=epoch;run.busy=true;if(isFinalFloor(run.floor+1)&&run.floor+1>10){try{const legend=await HOST.legend();if(epoch!==token)return;run.legend=legend;}catch(error){if(epoch!==token)return;modal('つうしんエラー','レジェンドを よみこめませんでした。',()=>nextFloor(),'さいしこう');return;}}const screen=app.querySelector('.map-screen'),board=app.querySelector('.board');if(screen)screen.dataset.transition='fade-out';let heroMarker=null;
 try{if(board){const hero=board.querySelector('.hero');if(hero){const r=hero.getBoundingClientRect();heroMarker=document.createElement('span');heroMarker.className='floor-hero';heroMarker.textContent=run.player.emoji;Object.assign(heroMarker.style,{left:(r.left+r.width/2)+'px',top:(r.top+r.height/2)+'px',fontSize:getComputedStyle(hero).fontSize});document.body.append(heroMarker);hero.style.visibility='hidden';}board.classList.add('fade-out');}await wait(CONFIG.floorFadeMs);if(epoch!==token)return;
 if(screen)screen.dataset.transition='tower';const marker=app.querySelector('.tower-marker'),floors=app.querySelectorAll('.tower .floor');const step=floors.length>1?Math.abs(floors[0].getBoundingClientRect().top-floors[1].getBoundingClientRect().top):22;await animateNode(marker,[{transform:'translateY(0)'},{transform:`translateY(${step}px)`}],CONFIG.floorSlideMs,{fill:'forwards',easing:'ease-in-out'});if(epoch!==token)return;
 run.floor++;addScore('floor',run.floor);run.visited.push(`${run.floor}:${run.pos}`);run.map=generateFloor(run.floor,run.pos);run.message='';drawMap();const nextScreen=app.querySelector('.map-screen'),next=app.querySelector('.board');nextScreen.dataset.transition='fade-in';next.classList.add('fade-out');const hero=next.querySelector('.hero');if(heroMarker&&hero)hero.style.visibility='hidden';await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{next.classList.remove('fade-out');resolve();})));await wait(CONFIG.floorFadeMs);if(epoch!==token)return;if(hero)hero.style.visibility='';nextScreen.removeAttribute('data-transition');run.busy=false;
 }finally{heroMarker?.remove();}}
function battleInfo(f,side){return `<section class="battle-info info-${side===1?'upper':'lower'}" data-info="${side}">${side===0?hearts(f):''}<h2>${esc(f.name)}</h2>${slots(f,null,side===1)}${side===1?hearts(f):''}<div class="status-marks">${f.poisoned?'🦠':''}${f.cursedSlots.length?'☠️':''}</div></section>`;}
function battleTurnLimit(enemy){return enemy.boss?(isFinalFloor()?30:20):10;}
function battleDraw(enemy,turn,phase,log='',rolls=[]){mode='battle';sceneTheme();const p=run.player;app.innerHTML=`<section class="screen battle-screen ${enemy.boss?'boss-battle':''}" data-phase="${phase}"><header class="battle-header">${scoreMarkup()}<span id="turn">${Math.max(1,turn)}/${battleTurnLimit(enemy)}</span></header><div class="fighter fighter-upper" data-fighter="1"><span class="fighter-art enemy-avatar">${enemy.emoji}</span></div>${battleInfo(enemy,1)}<div class="battle-dice die-upper" data-die="1"></div><div class="fighter fighter-lower" data-fighter="0"><span class="fighter-art">${p.emoji}</span></div>${battleInfo(p,0)}<div class="battle-dice die-lower" data-die="0"></div><div class="battle-fx"></div><section class="battle-caption-wrap"><div class="battle-log" aria-live="polite">${esc(log)}</div><div class="battle-stock">💣×${run.bombs}</div><div class="battle-experience">${experienceMarkup()}</div></section>${phase==='select'&&enemy.boss?`<section class="battle-selection"><div class="bomb-picker"><span class="bomb-count">💣×<span id="quantity">${isFinalFloor()?run.bombs:0}</span></span>${isFinalFloor()?'':`<div class="arrows"><button id="up" aria-label="ばくだんをふやす">▲</button><button id="down" aria-label="ばくだんをへらす">▼</button></div>`}</div><button class="primary" id="throw">なげる</button></section>`:''}</section>`;}
function paintBattle(states){art(1)?.classList.toggle('boss-charged',!!states[1]?.bossCharged);states.forEach((f,side)=>{const info=app.querySelector(`[data-info="${side}"]`);if(!info)return;const selected=[...info.querySelectorAll(".slot.selected")].map(el=>el.dataset.slot);info.outerHTML=battleInfo(f,side);selected.forEach(index=>app.querySelector(`[data-info="${side}"] [data-slot="${index}"]`)?.classList.add("selected"));});}
function caption(text){const el=app.querySelector('.battle-log');if(el)el.textContent=text;}
function art(side){return app.querySelector(`[data-fighter="${side}"] .fighter-art`);}
let battleVisual=[],battleRolls=[[],[]];
function focusSlots(side,faces,index=null){const effect=battleVisual[side]?.bossEffect;if(index===null&&effect&&({attack:['attack1','attack2','strong','ram'],heal:['heal','fullheal'],curse:['curse']}[effect.kind]||[]).some(face=>faces.includes(face)))faces=[...faces,'devil'];const indices=new Set(index===null?battleRolls[side].filter(r=>faces.includes(r.face)&&!r.cursed).map(r=>r.slot):Array.isArray(index)?index:[index]);app.querySelectorAll(`[data-info="${side}"] .slot`).forEach(tile=>tile.classList.toggle('selected',indices.has(Number(tile.dataset.slot))));}
function clearFocus(){app.querySelectorAll('.slot.selected').forEach(el=>el.classList.remove('selected'));}
function hit(side,strong=false){return animateNode(art(side),[{transform:'translateX(0)'},{transform:`translateX(${strong?-18:-10}px) rotate(-9deg)`,offset:.2},{transform:'translateX(12px) rotate(6deg)',offset:.43},{transform:'translateX(-5px)',offset:.7},{transform:'translateX(0) rotate(0)'}],450);}
function localPoint(side){const host=app.querySelector('.battle-fx').getBoundingClientRect(),p=center(art(side).getBoundingClientRect());return {x:p.x-host.left,y:p.y-host.top};}
function fxIcon(side,icon,kind='reaction'){const host=app.querySelector('.battle-fx'),at=localPoint(side),el=document.createElement('span');el.className='battle-effect '+kind;el.textContent=icon;el.style.left=at.x+'px';el.style.top=at.y+'px';host.append(el);animateNode(el,[{transform:'translate(-50%,-50%) scale(.4)',opacity:0},{transform:'translate(-50%,-50%) scale(1.15)',opacity:1,offset:.2},{transform:'translate(-50%,-65%) scale(1)',opacity:1,offset:.75},{transform:'translate(-50%,-90%) scale(.8)',opacity:0}],600).then(()=>el.remove());}
function floatHearts(side,delta){if(!delta)return;const host=app.querySelector('.battle-fx'),at=localPoint(side),el=document.createElement('div');el.className='floating-hearts';el.style.fontSize=Math.min(24,260/(Math.abs(delta)+1))+'px';el.textContent=(delta>0?'+':'−')+'♥'.repeat(Math.abs(delta));el.style.left=at.x+'px';el.style.top=(at.y-50)+'px';host.append(el);animateNode(el,[{transform:'translate(-50%,7px) scale(.86)',opacity:0},{transform:'translate(-50%,0) scale(1.08)',opacity:1,offset:.12},{transform:'translate(-50%,-13px) scale(1)',opacity:1,offset:.77},{transform:'translate(-50%,-30px) scale(.96)',opacity:0}],700,{easing:'linear'}).then(()=>el.remove());}
function trail(source,target){const host=app.querySelector('.battle-fx'),a=localPoint(source),b=localPoint(target),el=document.createElement('i');el.className='attack-trail';Object.assign(el.style,{left:a.x+'px',top:a.y+'px',width:Math.hypot(b.x-a.x,b.y-a.y)+'px'});host.append(el);const angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;animateNode(el,[{transform:`rotate(${angle}deg) scaleX(0)`,opacity:0},{transform:`rotate(${angle}deg) scaleX(1)`,opacity:1,offset:.45},{transform:`rotate(${angle}deg) scaleX(1.05)`,opacity:0}],360).then(()=>el.remove());}
async function rollDice(rolls,token,twinSide=null){if(twinSide===null)battleRolls=[[],[]];rolls.forEach(r=>battleRolls[r.side].push({...r}));const boxes=[];if(twinSide!==null)app.querySelector(`[data-die="${twinSide}"]`).innerHTML='';for(const r of rolls){const host=app.querySelector(`[data-die="${r.side}"]`);if(twinSide===null)host.innerHTML='';const tile=document.createElement('div');tile.className='dice-tile';host.append(tile);boxes.push({tile,roll:r});animateNode(tile,[{transform:`translate(${r.side?90:-90}px,${r.side?-70:70}px) scale(.3) rotate(${r.side?110:-110}deg)`,opacity:0},{transform:`translate(0,-12px) scale(1.2) rotate(${r.side?-22:22}deg)`,opacity:1,offset:.6},{transform:`translate(0,0) scale(1) rotate(${r.side?5:-5}deg)`,opacity:1}],420);}
 const duration=CONFIG.turnMs===1?1:420,start=performance.now();let cycle=0;while(performance.now()-start<duration){if(epoch!==token)return;boxes.forEach(({tile,roll:r})=>{const fighter=battleVisual[r.side],entry=slotEntries(fighter,r.side===1)[cycle%6];tile.innerHTML=abilityIcon(entry.face,fighter.cursedSlots.includes(entry.index));});cycle++;await wait(CONFIG.turnMs===1?1:55);}if(epoch!==token)return;for(const {tile,roll:r} of boxes){tile.innerHTML=abilityIcon(r.face,r.cursed);tile.dataset.face=r.face;if(r.face==='blank'&&!r.cursed)animateNode(tile,[{transform:'rotate(-5deg)'},{transform:'translateY(14px) rotate(10deg)',opacity:.7}],300);}[...new Set(rolls.map(r=>r.side))].forEach(side=>focusSlots(side,[],rolls.filter(r=>r.side===side).map(r=>r.slot)));await wait(CONFIG.turnMs===1?1:CONFIG.diceHoldMs);}
async function playBattleEvent(ev,token){if(epoch!==token)return;clearFocus();const delay=CONFIG.turnMs===1?1:400;app.querySelector('.battle-screen').dataset.phase=ev.type;
 if(ev.type==='bossDraw'){await playBossDraw(ev,token);return;}
 if(ev.type==='bossUltra'){await playBossUltra(ev,token);return;}
 if(ev.type==='roll'){await rollDice(ev.rolls,token);return;}
 if(ev.type==='twin'){focusSlots(ev.side,['twin']);caption('🎲 ツイン！');await rollDice(ev.rolls,token,ev.side);return;}
 if(ev.type==='guard'||ev.type==='counterIdle')return;
 const before=battleVisual;
 if(ev.type==='poisonTick'){caption('どくの ダメージ');ev.sides.forEach(side=>{hit(side);floatHearts(side,-1);});}
 if(ev.type==='poisonCheck'){caption('どくの はんてい');const wheels=ev.checks.map(c=>{const at=localPoint(c.side),el=document.createElement('div');el.className='poison-wheel';el.style.left=at.x+'px';el.style.top=at.y+'px';el.innerHTML='<svg viewBox="0 0 100 100"><path class="wheel-fill" d="M50 50V5A45 45 0 1 1 11 72.5Z"/><path class="wheel-clear" d="M50 50 11 72.5A45 45 0 0 1 50 5Z"/><circle cx="50" cy="50" r="45"/></svg>';app.querySelector('.battle-fx').append(el);animateNode(el.querySelector('svg'),[{transform:'rotate(0deg)'},{transform:`rotate(${c.continued?1320:1500}deg)`}],CONFIG.turnMs===1?1:700,{fill:'forwards',easing:'cubic-bezier(.13,.65,.22,1)'});return el;});await wait(CONFIG.turnMs===1?1:750);if(epoch!==token){wheels.forEach(w=>w.remove());return;}caption(ev.checks.map(c=>c.continued?'どくが つづく':'どくが きえた').join(' ／ '));wheels.forEach(w=>w.remove());}
 if(ev.type==='curseBlock'){focusSlots(ev.side,[],ev.slot);fxIcon(ev.side,'☠️');caption('のろいで のうりょくが つかえない');}
 if(ev.type==='twinBlank'){caption('ツインの ツインは ハズレ');}
 if(ev.type==='heal'){ev.healing.forEach(h=>{focusSlots(h.side,['heal','fullheal']);fxIcon(h.side,h.full?'💖':'🧪');floatHearts(h.side,h.amount);});caption('HPが かいふくした');}
 if(ev.type==='impact'){ev.attacks.forEach(a=>{focusSlots(a.side,['attack1','attack2','strong','ram']);trail(a.side,a.target);if(a.reflected){focusSlots(a.target,['counter']);fxIcon(a.target,'↩️');}else if(a.blocked){focusSlots(a.target,['guard']);fxIcon(a.target,'🛡️');}if(a.ram){const from=localPoint(a.side),to=localPoint(a.target);animateNode(art(a.side),[{transform:'translate(0,0)'},{transform:`translate(${(to.x-from.x)*.62}px,${(to.y-from.y)*.62}px) rotate(22deg) scale(1.25)`,offset:.45},{transform:'translate(0,0)'}],600);}});ev.drains.forEach(d=>{focusSlots(d.side,['drain']);flyIcon('♥',art(d.target).getBoundingClientRect(),art(d.side).getBoundingClientRect(),500);});await wait(CONFIG.turnMs===1?1:260);if(epoch!==token)return;ev.attacks.filter(a=>a.damage).forEach(a=>hit(a.target,a.strong||a.ram));caption(ev.drains.length?'きゅうけつ！':'こうげき！');}
 if(ev.type==='counter'){ev.counters.forEach(c=>{focusSlots(c.side,['counter']);trail(c.side,c.target);if(c.damage)hit(c.target,true);});caption('カウンター！');}
 if(ev.type==='poisonApply'){ev.applications.forEach(a=>{focusSlots(a.side,['poison']);trail(a.side,a.target);fxIcon(a.target,'🦠');});caption('どくに なった');}
 if(ev.type==='curseApply'){focusSlots(ev.side,['curse']);flyIcon('☠️',art(ev.side).getBoundingClientRect(),art(ev.target).getBoundingClientRect(),450);caption('スロットが のろわれた');}
 if(ev.type==='impact'||ev.type==='counter')ev.state.forEach((f,side)=>{const delta=f.currentHp-before[side].currentHp;if(delta)floatHearts(side,delta);});
 if(isFinalFloor()&&before[1].boss){const available=Math.max(0,before[1].currentHp);const damage=ev.type==='impact'?ev.attacks.filter(a=>a.side===0).reduce((n,a)=>n+a.damage,0)+ev.drains.filter(d=>d.side===0).reduce((n,d)=>n+d.amount,0):ev.type==='counter'?ev.counters.filter(c=>c.target===1).reduce((n,c)=>n+c.damage,0):ev.type==='poisonTick'&&ev.sides.includes(1)?1:0;scoreBossHearts(available,damage,before[1].maxHp);}
 battleVisual=copy(ev.state);paintBattle(ev.state);await wait(delay);}
 async function playBossCardDraw({screen,portrait,effect,isCurrent,fast=false,animate,wait,onReturn}){
  const document=screen.ownerDocument,overlay=document.createElement('div');
  overlay.className='boss-special';overlay.dataset.phase='lightning';overlay.setAttribute('aria-label','ひっさつわざの ちゅうせん');
  overlay.innerHTML='<div class="boss-special-portrait" aria-hidden="true"></div><div class="boss-special-cards"></div><canvas class="boss-special-flames" aria-hidden="true"></canvas><div class="boss-special-whiteout" aria-hidden="true"></div>';
  screen.append(overlay);
  const boss=overlay.querySelector('.boss-special-portrait'),row=overlay.querySelector('.boss-special-cards'),canvas=overlay.querySelector('canvas'),flash=overlay.querySelector('.boss-special-whiteout'),ctx=canvas.getContext('2d');
  boss.textContent=portrait;boss.classList.toggle('boss-charged',effect.wasCharged);
  const cardKinds=['attack','heal','curse',effect.wasCharged?'ultra':'charge'];
  row.innerHTML=cardKinds.map(kind=>`<div class="boss-special-card"><span class="ability-glyph">${B.icon({kind,n:effect.n})}</span><span class="boss-special-label">${{attack:'こうげき',heal:'かいふく',curse:'のろい',charge:'チャージ',ultra:'ちょう<br>ひっさつ'}[kind]}</span></div>`).join('');
  const cards=[...row.children],valid=()=>isCurrent()&&overlay.isConnected,duration=ms=>fast?1:ms;
  const pause=ms=>wait(duration(ms)),motion=(el,frames,ms,options={})=>animate(el,frames,duration(ms),{fill:'forwards',...options});
  const sizeCanvas=()=>{canvas.width=Math.ceil(overlay.clientWidth/4);canvas.height=Math.ceil(overlay.clientHeight/4);};
  function drawLightning(progress){
   const rect=overlay.getBoundingClientRect(),target=screen.querySelector('[data-die="1"]').getBoundingClientRect(),w=canvas.width,h=canvas.height;
   const tx=(target.left+target.width/2-rect.left)/4,ty=(target.top+target.height/2-rect.top)/4;
   const paths=[[[w*.52,0],[w*.48,ty*.16],[w*.61,ty*.16],[w*.53,ty*.35],[w*.69,ty*.35],[w*.57,ty*.57],[w*.74,ty*.57],[tx-5,ty*.8],[tx+4,ty*.8],[tx,ty]],[[w*.12,0],[w*.23,ty*.2],[w*.14,ty*.2],[w*.36,ty*.45],[w*.28,ty*.45],[w*.51,ty*.72],[w*.44,ty*.72],[tx,ty]],[[w*.94,0],[w*.79,ty*.22],[w*.88,ty*.22],[w*.7,ty*.49],[w*.81,ty*.49],[tx-3,ty*.76],[tx+6,ty*.76],[tx,ty]],[[w*.53,ty*.35],[w*.4,ty*.42],[w*.45,ty*.56],[w*.22,ty*.7]]];
   ctx.clearRect(0,0,w,h);ctx.save();ctx.beginPath();ctx.rect(0,0,w,Math.ceil((ty+22)*progress+1));ctx.clip();
   for(const [width,color] of [[10,'#7130c9'],[5,'#d4a5ff'],[2,'#fff']]){
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='miter';
    for(const points of paths){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.stroke();}
    if(progress>.8)for(let i=0;i<10;i++){const a=i*Math.PI/5;ctx.beginPath();ctx.moveTo(Math.round(tx+Math.cos(a)*5),Math.round(ty+Math.sin(a)*5));ctx.lineTo(Math.round(tx+Math.cos(a)*21),Math.round(ty+Math.sin(a)*21));ctx.stroke();}
   }
   ctx.restore();
  }
  function lightning(){return new Promise(resolve=>{
   const start=performance.now();
   function frame(now){if(!valid()){resolve();return;}const p=Math.min(1,(now-start)/duration(85));drawLightning(p);if(p<1)requestAnimationFrame(frame);else resolve();}
   requestAnimationFrame(frame);
  });}
  function breathe(){return new Promise(resolve=>{
   sizeCanvas();
   const rect=overlay.getBoundingClientRect(),cardRect=row.getBoundingClientRect(),bossRect=boss.getBoundingClientRect(),w=canvas.width,h=canvas.height;
   const sourceX=w*.5,sourceY=(bossRect.bottom-rect.top-bossRect.height*.26)/4,cardTop=(cardRect.top-rect.top)/4,baseY=(cardRect.bottom-rect.top+20)/4;
   const halfAtCards=(cardRect.width*.5+20)/4,start=performance.now();let uncovered=false;
   function frame(now){
    if(!valid()){resolve();return;}
    const elapsed=now-start,fade=Math.max(0,(elapsed-duration(2000))/duration(950)),tick=Math.floor(elapsed/65);
    if(elapsed>=duration(2000)&&!uncovered){uncovered=true;overlay.dataset.phase='clearing';cards.forEach((card,i)=>{if(i!==effect.card){card.getAnimations().forEach(a=>a.cancel());card.style.opacity='0';}});}
    ctx.clearRect(0,0,w,h);if(fade>=1){resolve();return;}
    for(let y=Math.floor(sourceY);y<=Math.ceil(baseY);y++){
     const depth=(y-sourceY)/Math.max(1,cardTop-sourceY-3),half=3+Math.max(0,depth)*halfAtCards,flutter=Math.sin(y*.34-elapsed*.024)*1.2;
     const left=Math.floor(sourceX-half+flutter),right=Math.ceil(sourceX+half+flutter);
     ctx.fillStyle='#ce3439';ctx.fillRect(left,y,right-left,1);
     ctx.fillStyle='#ef6030';ctx.fillRect(Math.ceil(sourceX-half*.86+flutter),y,Math.ceil(half*1.72),1);
     ctx.fillStyle='#ff9a39';ctx.fillRect(Math.ceil(sourceX-half*.58+flutter),y,Math.ceil(half*1.16),1);
    }
    for(let y=Math.floor(sourceY);y<baseY;y+=3){
     const half=3+Math.max(0,(y-sourceY)/Math.max(1,cardTop-sourceY-3))*halfAtCards;
     for(let x=Math.max(0,Math.ceil(sourceX-half+3));x<Math.min(w,sourceX+half-3);x+=3){const value=((x*17+y*29-tick*13)%41+41)%41;if(value<8){ctx.fillStyle=value<3?'#ffe19a':'#ef6030';ctx.fillRect(x,y,2,value<3?1:3);}}
    }
    if(fade>0){ctx.globalCompositeOperation='destination-out';for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=3)if(((x*37+y*61+x*y*7)%101)/100<fade)ctx.fillRect(x,y,3,3);ctx.globalCompositeOperation='source-over';}
    requestAnimationFrame(frame);
   }
   frame(start);
  });}
  try{
   sizeCanvas();await lightning();if(!valid())return false;
   await pause(25);await motion(flash,[{opacity:0},{opacity:1}],55);if(!valid())return false;
   ctx.clearRect(0,0,canvas.width,canvas.height);overlay.style.background='#000';await pause(40);
   overlay.dataset.phase='cards';await motion(flash,[{opacity:1},{opacity:0}],180);if(!valid())return false;
   for(let i=0;i<cards.length;i++){await motion(cards[i],[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],220,{easing:'steps(5,end)'});if(!valid())return false;if(i<cards.length-1)await pause(170);}
   overlay.dataset.phase='cards-hold';await motion(boss,[{opacity:0,transform:'translateX(-50%) scale(.88)'},{opacity:1,transform:'translateX(-50%) scale(1)'}],650);await pause(350);if(!valid())return false;
   overlay.dataset.phase='fire';await breathe();if(!valid())return false;
   overlay.dataset.phase='result';await motion(cards[effect.card],[{transform:'scale(1)'},{transform:'scale(1.08)',offset:.5},{transform:'scale(1)'}],400);
   if(effect.kind==='charge'){
    await pause(450);if(!valid())return false;
    const card=cards[3];overlay.dataset.phase='charging';
    await motion(card,[{boxShadow:'0 0 0 #ffb34d',borderColor:'#fff'},{boxShadow:'0 0 28px #ffb34d',borderColor:'#ffe1a0'}],450);
    await motion(card.firstElementChild,[{opacity:1,filter:'brightness(1)',transform:'scale(1)'},{opacity:0,filter:'brightness(3)',transform:'scale(.6)'}],220);if(!valid())return false;
    card.firstElementChild.innerHTML=B.ultimateIcon(true);card.querySelector('.boss-special-label').innerHTML='ちょう<br>ひっさつ';boss.classList.add('boss-charged');overlay.dataset.phase='charged';
    await Promise.all([motion(card.firstElementChild,[{opacity:0,filter:'brightness(2.5)',transform:'scale(.6)'},{opacity:1,filter:'brightness(1.5)',transform:'scale(1.18)',offset:.55},{opacity:1,filter:'brightness(1)',transform:'scale(1)'}],500),motion(card,[{boxShadow:'0 0 28px #ffb34d',borderColor:'#ffe1a0'},{boxShadow:'0 0 22px #f14768',borderColor:'#fff'}],500)]);
    await pause(650);
   }else await pause(900);
   if(!valid())return false;
   onReturn();overlay.dataset.phase='return';await motion(overlay,[{opacity:1},{opacity:0}],220);
   return valid();
  }finally{overlay.remove();}
 }
async function playBossDraw(ev,token){
 const screen=app.querySelector('.battle-screen');caption('');
 await playBossCardDraw({screen,portrait:ev.state[1].emoji,effect:ev.effect,isCurrent:()=>epoch===token&&screen.isConnected,fast:CONFIG.turnMs===1,animate:animateNode,wait,onReturn(){
  battleVisual=copy(ev.state);paintBattle(ev.state);
  const die=screen.querySelector('[data-die="1"]');die.innerHTML=`<div class="dice-tile" data-face="devil">${abilityIcon('devil',false,ev.effect)}</div>`;
  focusSlots(1,[],ev.effect.slot);
 }});
 if(epoch===token&&ev.effect.kind==='charge')caption('まりょくを ためている…');
}
async function playBossUltra(ev,token){
 focusSlots(1,[],ev.effect.slot);caption('ちょうひっさつ！');
 const screen=app.querySelector('.battle-screen');
 const flash=document.createElement('div');flash.className='boss-ultra-flash';screen.append(flash);
 const effect=document.createElement('span');effect.className='boss-ultra-hit';effect.innerHTML=B.ultimateIcon(true);const at=localPoint(0);effect.style.left=at.x+'px';effect.style.top=at.y+'px';screen.querySelector('.battle-fx').append(effect);
 const duration=CONFIG.turnMs===1?1:650;
 await Promise.all([hit(0,true),animateNode(flash,[{opacity:0},{opacity:.65,offset:.15},{opacity:0}],duration),animateNode(effect,[{transform:'translate(-50%,-50%) scale(.3)',opacity:0},{transform:'translate(-50%,-50%) scale(1.5)',opacity:1,offset:.25},{transform:'translate(-50%,-50%) scale(2)',opacity:0}],duration)]);
 flash.remove();effect.remove();if(epoch!==token)return;
 floatHearts(0,-ev.damage);battleVisual=copy(ev.state);paintBattle(ev.state);await wait(CONFIG.turnMs===1?1:400);
}
function waitBossIntroTap(screen,token){screen.dataset.phase='ready';screen.tabIndex=0;screen.focus({preventScroll:true});return new Promise(resolve=>{const done=()=>{screen.removeEventListener('click',done);screen.removeEventListener('keydown',key);resolve(epoch===token);};const key=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();done();}};screen.addEventListener('click',done);screen.addEventListener('keydown',key);});}
async function showBossAppearance(enemy,token){mode='boss-intro';const blackout=document.createElement('div');blackout.className='boss-blackout';blackout.setAttribute('aria-hidden','true');app.append(blackout);try{await animateNode(blackout,[{opacity:0},{opacity:1}],CONFIG.bossBlackoutMs,{easing:'linear',fill:'forwards'});if(epoch!==token)return false;await wait(CONFIG.bossDarkHoldMs);}finally{blackout.remove();}if(epoch!==token)return false;sceneTheme();
 app.innerHTML=`<section class="screen boss-intro" data-phase="portrait"><div class="boss-intro-window"><div class="boss-intro-art">${enemy.emoji}</div><div class="boss-intro-message" role="status"></div><div class="boss-intro-abilities">${slots(enemy,null,true)}</div></div></section>`;await animateNode(app.querySelector('.boss-intro-art'),[{opacity:0},{opacity:1}],CONFIG.bossPortraitMs,{fill:'forwards',easing:'linear'});if(epoch!==token)return false;
 const screen=app.querySelector('.boss-intro');screen.dataset.phase='frame';await wait(CONFIG.bossFrameMs);if(epoch!==token)return;const message=screen.querySelector('.boss-intro-message'),text=`${isFinalFloor()?'ラスボス':'ボス'}　${enemy.name}があらわれた`,characters=Array.from(text),start=performance.now();screen.dataset.phase='message';for(let i=0;i<characters.length;i++){const due=start+(i+1)*CONFIG.bossMessageMs/characters.length;await wait(Math.max(0,due-performance.now()));if(epoch!==token)return false;message.textContent=characters.slice(0,i+1).join('');}
 screen.dataset.phase='slots';for(const slot of screen.querySelectorAll('.slot')){slot.classList.add('revealed');await wait(CONFIG.bossSlotMs);if(epoch!==token)return false;}return waitBossIntroTap(screen,token);}
async function encounter(raw,boss,mapCell=null){const token=epoch;run.busy=true;run.battles++;const enemy=copy(raw);enemy.boss=boss;enemy.mapCell=mapCell;enemy.poisoned=false;enemy.cursedSlots=[];if(!boss)addScore(mapCell===null?'randomEncounter':'mapEncounter',enemy.mobLevel??mobLevel());if(boss){if(!await showBossAppearance(enemy,token))return;}else{app.querySelector('.dungeon-area')?.classList.add('flash');await wait(CONFIG.encounterFlashMs);if(epoch!==token)return;}battleDraw(enemy,0,'intro',boss?'':'てきが あらわれた！');battleVisual=copy([run.player,enemy]);battleRolls=[[],[]];[0,1].forEach(side=>animateNode(art(side),[{transform:`translate(${side?100:-100}px,${side?-40:40}px) scale(.65)`,opacity:0},{transform:'translate(0,0) scale(1)',opacity:1}],600));await wait(1000);if(epoch!==token)return;if(!boss){battleDraw(enemy,0,'run','バトル スタート！');await fight(enemy,token);return;}battleDraw(enemy,0,'select');const finalBoss=isFinalFloor();let n=finalBoss?run.bombs:0;const update=()=>{document.querySelector('#quantity').textContent=n;const up=document.querySelector('#up'),down=document.querySelector('#down');if(up)up.disabled=n>=run.bombs;if(down)down.disabled=n<=0;};if(!finalBoss){document.querySelector('#up').onclick=()=>{n=Math.min(run.bombs,n+1);update();};document.querySelector('#down').onclick=()=>{n=Math.max(0,n-1);update();};}update();document.querySelector('#throw').onclick=async()=>{document.querySelector('#throw').disabled=true;run.bombs-=n;battleDraw(enemy,0,'run',n?`💣 ${n} ダメージ！`:'バトル スタート！');if(n){await flyIcon('💣',app.querySelector('.battle-stock').getBoundingClientRect(),art(1).getBoundingClientRect(),400);if(epoch!==token)return;if(finalBoss)scoreBossHearts(enemy.currentHp,n,enemy.maxHp);enemy.currentHp=Math.max(0,enemy.currentHp-n);hit(1,true);floatHearts(1,-Math.min(n,raw.currentHp));paintBattle([run.player,enemy]);}await wait(350);if(epoch!==token)return;if(enemy.currentHp===0){await finishBattle(enemy,false);return;}await fight(enemy,token);};}
async function fight(enemy,token){const max=battleTurnLimit(enemy);let foe=enemy;for(let turn=1;turn<=max;turn++){if(epoch!==token)return;app.querySelector('#turn').textContent=turn+'/'+max;const phase=foe.bossSpecial?B.resolveTurn(run.player,foe):E.resolveTurn(run.player,foe);battleVisual=copy(phase.before);if(foe.bossSpecial)paintBattle(phase.before);for(const ev of phase.events){await playBattleEvent(ev,token);if(epoch!==token)return;}run.player=phase.after[0];foe={...phase.after[1],boss:enemy.boss,mapCell:enemy.mapCell};paintBattle([run.player,foe]);await wait(CONFIG.turnMs===1?1:CONFIG.betweenTurnsMs);if(epoch!==token)return;if(run.player.currentHp<=0){caption('HPが なくなった');if(await waitBattleTap(token))gameover(false);return;}if(foe.currentHp<=0){await finishBattle(foe,false);return;}if(turn===max){if(foe.boss&&isFinalFloor())await meteorGameOver(token);else await finishBattle(foe,true);return;}}}
async function meteorGameOver(token){if(epoch!==token)return;const screen=app.querySelector('.battle-screen');screen.dataset.phase='meteors';screen.classList.add('meteor-shaking');caption('');clearFocus();const sky=document.createElement('div');sky.className='meteor-sky';screen.append(sky);await Promise.all(Array.from({length:28},(_,i)=>{const meteor=document.createElement('span');meteor.className='falling-meteor';meteor.textContent='☄️';Object.assign(meteor.style,{left:((i*37+13)%125)+'%',fontSize:(28+(i%5)*8)+'px'});sky.append(meteor);return animateNode(meteor,[{transform:'translate(0,-20vh)',opacity:0},{transform:'translate(-10vw,25vh)',opacity:1,offset:.3},{transform:'translate(-35vw,125vh)',opacity:1}],900,{delay:i*65,easing:'linear',fill:'forwards'});}));if(epoch!==token)return;await wait(250);if(epoch!==token)return;run.player.currentHp=0;gameover(false,'ダンジョンがくずれた');}
async function experienceParticles(token){const host=app.querySelector('.battle-fx'),gauge=app.querySelector('.battle-experience .xp-track');if(!host||!gauge)return false;const from=localPoint(1),bounds=host.getBoundingClientRect(),target=center(gauge.getBoundingClientRect()),to={x:target.x-bounds.left,y:target.y-bounds.top};const offsets=[[-22,-12],[-8,-24],[12,-20],[24,-3],[10,16],[-15,13]];
 app.querySelector('.battle-screen').dataset.phase='experience';
 await Promise.all(offsets.map(async([dx,dy],i)=>{const dot=document.createElement('i');dot.className='xp-particle';Object.assign(dot.style,{left:from.x+'px',top:from.y+'px'});host.append(dot);await animateNode(dot,[{transform:'translate(0,0)',opacity:0},{transform:`translate(${dx}px,${dy}px)`,opacity:1}],180,{easing:'steps(4)',fill:'forwards'});if(epoch!==token){dot.remove();return;}await wait(120+i*25);if(epoch!==token){dot.remove();return;}await animateNode(dot,[{transform:`translate(${dx}px,${dy}px)`,opacity:1},{transform:`translate(${to.x-from.x}px,${to.y-from.y}px)`,opacity:1}],420,{easing:'linear',fill:'forwards'});dot.remove();}));return epoch===token;}
async function levelHeartFlight(token){const source=app.querySelector('.battle-experience .xp-reward-heart'),hp=app.querySelector('[data-info="0"] .hearts');if(!source||!hp)return false;const placeholder=document.createElement('span');placeholder.className='heart gold lost pending-heart';placeholder.textContent='♥';placeholder.style.visibility='hidden';hp.append(placeholder);const from=source.getBoundingClientRect(),to=placeholder.getBoundingClientRect();source.style.visibility='hidden';const dot=document.createElement('span');dot.className='flying-gold-heart';dot.textContent='♥';const a=center(from),b=center(to);Object.assign(dot.style,{left:a.x+'px',top:a.y+'px'});document.body.append(dot);app.querySelector('.battle-screen').dataset.phase='level-heart';await animateNode(dot,[{transform:'translate(-50%,-50%)'},{transform:`translate(calc(-50% + ${b.x-a.x}px),calc(-50% + ${b.y-a.y}px))`}],1100,{easing:'ease-in-out'});dot.remove();placeholder.remove();return epoch===token;}
function waitBattleTap(token){if(epoch!==token)return Promise.resolve(false);const screen=app.querySelector('.battle-screen');if(!screen)return Promise.resolve(false);screen.dataset.phase='awaiting-tap';screen.tabIndex=0;screen.focus({preventScroll:true});return new Promise(resolve=>{const done=()=>{screen.removeEventListener('click',done);screen.removeEventListener('keydown',key);screen.removeAttribute('tabindex');resolve(epoch===token);};const key=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();done();}};screen.addEventListener('click',done);screen.addEventListener('keydown',key);});}
async function finishBattle(enemy,fled){const token=epoch;run.player.poisoned=false;run.player.cursedSlots=[];if(!enemy.boss&&enemy.mapCell!==null&&enemy.mapCell!==undefined)delete run.map.items[enemy.mapCell];let levels=0;const reward=experienceReward(enemy);
 caption(fled?'てきは にげだした！':'てきを たおした！');clearFocus();paintBattle([run.player,enemy]);if(fled){art(1).classList.add('escape');await wait(800);}else {if(enemy.boss){if(localFloor()===5)addScore('midboss');}else addScore('mobHp',enemy.maxHp);app.querySelector('.battle-screen').dataset.phase='defeat';await animateNode(art(1),[{transform:'scale(1)',opacity:1},{transform:'translateY(15px) scale(.65)',opacity:0}],450,{fill:'forwards'});if(epoch!==token)return;art(1).style.visibility='hidden';app.querySelector('[data-die="1"]').innerHTML='';
 if(reward){if(!await experienceParticles(token))return;const oldRatio=run.xp/xpNeeded(),willLevel=run.xp+reward>=xpNeeded();if(willLevel){const track=app.querySelector('.battle-experience .xp-track');track.classList.add('full');const fill=track.firstElementChild;await animateNode(fill,[{width:(oldRatio*100)+'%'},{width:'100%'}],200,{fill:'forwards'});if(epoch!==token)return;await wait(250);if(epoch!==token)return;if(!await levelHeartFlight(token))return;}levels=gainExperience(reward);const experience=app.querySelector('.battle-experience');experience.innerHTML=experienceMarkup();if(!levels)animateNode(experience.querySelector('.xp-track>span'),[{width:(oldRatio*100)+'%'},{width:(run.xp/xpNeeded()*100)+'%'}],220);else animateNode(experience,[{transform:'scale(1)'},{transform:'scale(1.08)',offset:.5},{transform:'scale(1)'}],450);paintBattle([run.player,enemy]);caption(levels?`レベル ${run.level}！ さいだいHPが ${levels} ふえた`:`けいけんち ＋${reward}`);await wait(levels?1200:650);}else await wait(350);}
 if(epoch!==token)return;if(!await waitBattleTap(token))return;if(enemy.boss){run.map.boss=null;if(isFinalFloor()){await completeLap(token);return;}drawMap();await wait(350);if(epoch!==token)return;await nextFloor();}else {run.busy=false;run.message=fled?'てきは にげていった':levels?`レベル ${run.level}！ さいだいHPが ${levels} ふえた`:`てきを たおした！ けいけんち ＋${reward}`;drawMap();}}
async function completeLap(token){
 if(epoch!==token)return;mode='lap-clear';run.busy=true;sceneTheme();
 app.innerHTML=`<section class="screen lap-clear"><div class="lap-score">${scoreMarkup()}</div><h1>GAME CLEAR</h1><div class="lap-portrait">${run.player.emoji}</div><div class="ending-dialog"></div></section>`;
 const ending=app.querySelector('.lap-clear'),dialog=ending.querySelector('.ending-dialog');let skip=false;
 const skipText=()=>{skip=true;};ending.addEventListener('click',skipText);ending.addEventListener('keydown',skipText);
 for(const ch of 'こうして ぼうけんは おわった。\nけれど ゆめは まだ つづく。\nもっと ふかい やみの むこうへ。'){if(epoch!==token)return;if(ch==='\n')dialog.append(document.createElement('br'));else dialog.append(document.createTextNode(ch));if(!skip)await wait(65);}
 ending.removeEventListener('click',skipText);ending.removeEventListener('keydown',skipText);if(!await waitBossIntroTap(ending,token))return;
 if(!await openGrandChest(token))return;
 drawMap();await nextFloor();
}
async function openGrandChest(token){
 if(epoch!==token)return false;mode='lap-reward';
 const goldChest=treasureChest().replaceAll('#794720','#9c651b').replaceAll('#98602c','#d29a36').replaceAll('#d6a343','#f5d36a').replaceAll('#efc868','#ffe8a2');
 app.innerHTML=`<section class="screen lap-reward" data-phase="chest">${scoreMarkup()}<div class="lap-reward-scene"><button class="grand-chest" aria-label="ごうかな たからばこを あける">${goldChest}</button></div><section class="status lap-reward-status" hidden></section></section>`;
 const screen=app.querySelector('.lap-reward'),chest=screen.querySelector('.grand-chest');
 await new Promise(resolve=>chest.addEventListener('click',resolve,{once:true}));if(epoch!==token)return false;
 chest.disabled=true;screen.dataset.phase='opening';chest.querySelector('.chest-lid').remove();await wait(250);if(epoch!==token)return false;
 addScore('chest');const reward=skillReward(),scene=screen.querySelector('.lap-reward-scene');
 scene.innerHTML=`<div class="lap-reward-ability">${abilityIcon(reward)}</div><div class="lap-reward-name">${label[reward].replace(/[12]$/,'')}</div>`;
 screen.dataset.phase='reveal';await animateNode(scene.querySelector('.lap-reward-ability'),[{opacity:0,transform:'translateY(18px) scale(.7)'},{opacity:1,transform:'translateY(0) scale(1)'}],600,{easing:'ease-out'});await wait(650);if(epoch!==token)return false;
 const p=run.player,status=screen.querySelector('.lap-reward-status');
 status.innerHTML=`<div class="profile"><span class="avatar">${p.emoji}</span><div class="name">${esc(p.name)}</div><div class="bomb-stock">💣×${run.bombs}</div></div>${hearts(p,'status-hearts')}${experienceMarkup()}<div class="slots">${slotEntries(p).map(({face,index})=>E.SPECIAL.includes(face)?`<div class="slot" data-slot="${index}" aria-label="${label[face]}">${abilityIcon(face)}</div>`:`<button type="button" class="slot reward-choice" data-slot="${index}" aria-label="${label[face]}を かきかえる" disabled>${abilityIcon(face)}</button>`).join('')}</div>`;
 status.hidden=false;await animateNode(status,[{opacity:0,transform:'translateY(15px)'},{opacity:1,transform:'translateY(0)'}],500);if(epoch!==token)return false;screen.dataset.phase='choose';
 const index=await new Promise(resolve=>status.querySelectorAll('.reward-choice').forEach(button=>{button.disabled=false;button.onclick=()=>{status.querySelectorAll('.reward-choice').forEach(b=>b.disabled=true);resolve(Number(button.dataset.slot));};}));if(epoch!==token)return false;
 screen.dataset.phase='replacing';const from=scene.querySelector('.lap-reward-ability'),target=status.querySelector(`[data-slot="${index}"]`),a=center(from.getBoundingClientRect()),b=center(target.getBoundingClientRect()),icon=document.createElement('span');
 icon.className='flying-reward';icon.innerHTML=abilityIcon(reward);Object.assign(icon.style,{left:a.x+'px',top:a.y+'px'});document.body.append(icon);from.style.visibility='hidden';
 try{await animateNode(icon,[{transform:'translate(-50%,-50%) scale(1)'},{transform:`translate(calc(-50% + ${b.x-a.x}px),calc(-50% + ${b.y-a.y}px)) scale(.3)`}],1050,{fill:'forwards',easing:'ease-in-out'});}finally{icon.remove();}if(epoch!==token)return false;
 p.slots[index]=reward;target.innerHTML=abilityIcon(reward);target.setAttribute('aria-label',label[reward]);target.classList.add('reward-replaced');scene.querySelector('.lap-reward-name').textContent='';screen.dataset.phase='replaced';await wait(1300);return epoch===token;
}
function gameover(clear,message=null){finishScore(clear);mode=clear?'clear':'gameover';sceneTheme();run.busy=true;renderResult(message);saveResult(message);}
function renderResult(message){const result=run.result;app.innerHTML=`<section class="screen gameover ${result.clear?'clear':''}"><h1>${result.clear?'GAME CLEAR':'GAME OVER'}</h1><div class="avatar">${run.player.emoji}</div>${result.clear?'<div class="ending-dialog">こうして ぼうけんは おわった。<br>けれど ゆめは まだ つづく。<br>また まぶたを とじる そのときまで。</div>':`<p>${esc(message??('ちか'+run.floor+'かいで ぼうけんは おわった'))}</p>`}<div class="result-score"><div>${result.rankIn?'ランクイン':result.best?'ベストスコア':'スコア'}</div><strong>${scoreDigits(result.score)}</strong></div><div class="footnote">${result.saving?'きろくちゅう':result.error?(result.saved?'ランキングを かくにんできませんでした。タップで さいしこう':'きろくできませんでした。タップで さいしこう'):result.rankIn?'タップして ランキングへ':'タップして タイトルへ'}</div></section>`;app.querySelector('.screen').onclick=()=>{if(result.saving)return;if(result.error)saveResult(message);else if(result.rankIn)ranking('all',{runId:result.id,uid:HOST.status().uid},result.rankingRows);else title();};}
async function saveResult(message){
 const result=run.result;if(result.saving||(result.saved&&result.rankingChecked))return;
 result.saving=true;result.error=false;renderResult(message);
 try{
  if(!result.saved){const record=await HOST.save({id:result.id,version:result.version,score:result.score,floor:result.floor,level:result.level,clear:result.clear,events:result.events});result.best=record.best;result.saved=true;}
  const rows=(await HOST.rankings()).slice(0,10);
  result.rankingRows=rows;result.rankIn=rows.some(r=>r.runId===result.id&&r.uid===HOST.status().uid);result.rankingChecked=true;
 }catch{result.error=true;}finally{result.saving=false;renderResult(message);}
}

// Read-only diagnostics for standalone verification and later adapter integration.
globalThis.Adventure={CONFIG,TYPES,generateFloor,reachable,enemy,slotEntries,xpNeeded,get state(){return run},get mode(){return mode}};
title();
