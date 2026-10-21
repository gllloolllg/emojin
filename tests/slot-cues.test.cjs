const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const a=source.indexOf('const SLOT_CUES='),b=source.indexOf('function installSlotButton()',a);
function runtime(extra={}){
 const ctx={Math,innerWidth:390,innerHeight:844,...extra};vm.createContext(ctx);
 vm.runInContext(source.slice(a,b)+'\nglobalThis.cues=SLOT_CUES;',ctx);return ctx;
}
const plain=x=>JSON.parse(JSON.stringify(x));
test('exact visual probabilities, one draw for BLANK/WILD and none for other symbols',()=>{
 const c=runtime();
 assert.deepEqual(plain(c.cues.weights.blank.map(x=>x.weight)),[10.5,4,.5,0,85]);
 assert.deepEqual(plain(c.cues.weights.wild.map(x=>x.weight)),[35,30,10,5,20]);
 for(const symbol of ['blank','wild']){
  let start=0;
  for(const row of c.cues.weights[symbol]){
   if(row.weight)for(const value of [start+1e-7,start+row.weight/2,start+row.weight-1e-7]){
    let draws=0;assert.equal(c.chooseSlotCue(symbol,()=>{draws++;return value/100;}),row.type);assert.equal(draws,1);
   }
   start+=row.weight;
  }
  assert.equal(start,100);
 }
 for(const symbol of ['cherry','smile','gift','berry','orange','melon','bell'])
  assert.equal(c.chooseSlotCue(symbol,()=>{throw Error('Must not draw for other symbols');}),null);
 assert.ok(Object.isFrozen(c.cues.weights.blank));
});
test('flight begins fully outside each viewport edge; wobble lands at exact center',()=>{
 const c=runtime();
 for(let side=0;side<4;side++){
  let draw=0;const p=c.slotCueOffscreen(48,()=>draw++===0?(side+.5)/4:.5);
  assert.ok(p.x<-48||p.x>438||p.y<-48||p.y>892);
 }
 const frames=c.slotCueFlightFrames({x:-500,y:200},{x:0,y:0});
 assert.match(frames[0].transform,/-500px/);assert.match(frames.at(-1).transform,/0px.*0px/);
 assert.notEqual(frames[4].transform,frames[8].transform);
});
test('C uses 4 WILD + 1 BLANK cyclically and smoothly decelerates for 6000 ms to either saved face',async()=>{
 for(const target of ['wild','blank']){
  let now=1307;const queue=[],positions=[];
  const ctx=runtime({performance:{now:()=>now},requestAnimationFrame:f=>{queue.push(f);return queue.length;},cancelAnimationFrame:()=>{}});
  ctx.paintSpecialSlotReel=(_state,phase)=>positions.push({t:now,phase});
  const session={cueReel:{started:0,frame:1}},done=ctx.slotCueC(session,{cells:Array.from({length:9},(_,i)=>i===4?target:'blank')});
  while(queue.length){now+=10;queue.shift()(now);assert.ok(now<=7317);}
  await done;assert.equal(now-1307,6000);
  const final=positions.at(-1).phase%5;assert.ok(Math.abs(final-(target==='blank'?4:0))<1e-8);
  const speed=positions.slice(1).map((p,i)=>p.phase-positions[i].phase);
  assert.ok(speed.every(x=>x>=-1e-8));
  assert.ok(speed.slice(-10).every(x=>x<speed[0]/20));
  assert.ok(speed.every((x,i)=>i===0||x<=speed[i-1]+1e-8));
 }
 const c=runtime();let track;
 const cell={querySelector:()=>({}),classList:{add:()=>{}},appendChild:el=>{track=el;},clientHeight:80,style:{setProperty:()=>{}}};
 c.document={createElement:()=>({style:{},setAttribute:()=>{}})};c.getComputedStyle=()=>({fontSize:'35px'});
 c.performance={now:()=>0};c.requestAnimationFrame=()=>1;
 c.startSpecialSlotReel({},cell);
 assert.equal((track.innerHTML.match(/🤡/gu)||[]).length,8);assert.equal((track.innerHTML.match(/cue-blank/g)||[]).length,2);
 assert.equal(track.style.fontSize,'35px');
});
test('A shakes continuously for 3000ms, then cancels its transform',async()=>{
 let options,cancelled=false,removed=false;
 const animation={finished:Promise.resolve(),cancel:()=>{cancelled=true;}};
 const cell={classList:{add:()=>{},remove:()=>{removed=true;}},animate:(_frames,opts)=>{options=opts;return animation;}};
 const c=runtime({slotCells:()=>Array(9).fill(cell)}),session={};
 await c.slotCueA(session);assert.equal(options.duration*options.iterations,3000);
 assert.ok(cancelled&&removed);assert.equal(session.cueAnimation,null);
});
test('cleanup cancels all transient animation state without touching the round',()=>{
 const done=[];const session={round:{total:999,cells:['wild']},
  cueReel:{frame:4,track:{remove:()=>done.push('track')}},cueAnimation:{cancel:()=>done.push('shake')},
  cueLayer:{getAnimations:()=>[{cancel:()=>done.push('layer-animation')}],remove:()=>done.push('layer')},
  panel:{querySelectorAll:()=>[{classList:{remove:()=>done.push('classes')},style:{removeProperty:()=>done.push('height')}}]}};
 const before=JSON.stringify(session.round),c=runtime({cancelAnimationFrame:id=>done.push(id)});
 c.resetSlotCueVisuals(session);assert.equal(JSON.stringify(session.round),before);
 assert.equal(session.cueReel,null);assert.equal(session.cueLayer,null);assert.equal(session.cueAnimation,null);
 assert.deepEqual(done,[4,'track','shake','layer-animation','layer','classes','height']);
});
