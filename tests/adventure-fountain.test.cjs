const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{randomUUID}=require('node:crypto');
const root=path.join(__dirname,'..');
function context(){const c={crypto:{randomUUID},document:{querySelector:()=>({querySelectorAll:()=>[]})},setInterval(){},window:{parent:{},addEventListener(){}}};vm.createContext(c);for(const f of ['adventure-store.js','adventure/engine.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);c.window.parent.AdventureStore=c.AdventureStore;vm.runInContext(fs.readFileSync(path.join(root,'adventure/game.js'),'utf8').replace(/title\(\);\s*$/,''),c);return c;}
test('fountain consumes only 0.23 percent of empty cells and preserves existing placement probabilities',()=>{
 const c=context(),counts={};for(let i=0;i<10000;i++){const kind=vm.runInContext(`floorItemKind(${(i+.5)/10000})`,c)??'empty';counts[kind]=(counts[kind]||0)+1;}
 assert.deepEqual(counts,{heart:600,bomb:800,chest:200,enemy:1500,fountain:23,empty:6877});
 assert.equal(vm.runInContext('CONFIG.fountain',c),.0023);assert.equal(vm.runInContext('CONFIG.fountainMistMs',c),3000);
});
test('real fountain outcomes split evenly with one RNG draw, independent of presentation',()=>{
 const c=context();for(const [roll,win] of [[0,true],[.499999,true],[.5,false],[.999999,false]]){
  const r=vm.runInContext(`(()=>{let calls=0;const win=fountainOutcome(()=>{calls++;return ${roll}});return {calls,win}})()`,c);assert.equal(r.win,win);assert.equal(r.calls,1);
 }
});
test('generated fountains are actual items and never replace start or goal',()=>{
 const c=context();vm.runInContext("run={floor:1,legend:null};Math.random=E.seeded(8127)",c);let fountains=0;
 for(let i=0;i<800;i++){const m=vm.runInContext('generateFloor(1,12)',c);assert(!m.items[12]);assert(!m.items[m.goal]);for(const [cell,item] of Object.entries(m.items)){assert(m.cells[cell]);if(item.kind==='fountain'){fountains++;assert.deepEqual(Object.keys(item),['kind']);}}}
 assert(fountains>20&&fountains<70,fountains);
});
test('fountain glyph is the fountain emoji and the map haze is cyan',()=>{
 const c=context(),markup=vm.runInContext("itemIcon({kind:'fountain'})",c);assert(markup.includes('⛲️'));assert(markup.includes('fountain-haze'));
 const css=fs.readFileSync(path.join(root,'adventure/style.css'),'utf8');assert(css.includes('@keyframes fountain-map-mist'));assert(css.includes('--fountain-ink:#a5eef6'));
});
