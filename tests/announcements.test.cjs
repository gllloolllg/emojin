const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),plain=v=>JSON.parse(JSON.stringify(v));
test('announcement query reads only published messages, sorts every valid timestamp descending and returns body only',async()=>{
 const records=Array.from({length:250},(_,i)=>({body:'Message '+i,publishedAt:{toMillis:()=>i},published:true}));
 records.push({body:'draft',published:false,publishedAt:{toMillis:()=>999}},
  {body:'invalid date',published:true,publishedAt:'today'},{body:'   ',published:true,publishedAt:{toMillis:()=>999}});
 let reads=0;
 const c={auth:{currentUser:{}},db:{},retry:fn=>fn(),F:{collection:(_db,name)=>name,where:(...args)=>args,
  query:(...args)=>args,getDocsFromServer:async q=>{
   reads++;assert.deepEqual(plain(q),['announcements',['published','==',true]]);return {docs:records.map(value=>({data:()=>value}))};
  }}};vm.createContext(c);
 const method=source.slice(source.indexOf('    async getAnnouncements(){'),source.indexOf('    async getGeneratedEmojis(){'));
 vm.runInContext('globalThis.api={'+method+'};',c);
 const result=await c.api.getAnnouncements();assert.equal(result.length,250);assert.equal(result[0].body,'Message 249');
 assert.deepEqual(Object.keys(result[0]),['body','publishedAt']);assert.equal(result.at(-1).publishedAt,0);
 c.auth.currentUser=null;await assert.rejects(c.api.getAnnouncements(),/ログイン/);assert.equal(reads,1);
});
function ui({stored='5000',items=[{body:'New',publishedAt:8000},{body:'Boundary',publishedAt:5000},{body:'Old',publishedAt:1000}]}={}){
 const values=new Map(),key='emojin.announcements.openedAt.test';if(stored!==null)values.set(key,stored);
 const classes=new Set(),button={classList:{toggle:(name,value)=>value?classes.add(name):classes.delete(name)},setAttribute:()=>{}},content={innerHTML:'',isConnected:true};
 let now=10000,reads=0,opens=0;
 const c={FIREBASE_CONFIG:{projectId:'test'},store:{player:{}},busy:false,playback:null,modalKind:null,modalClosing:false,modalRevision:0,
  console:{warn:()=>{}},Date:{now:()=>now},localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)},
  cloud:{getAnnouncements:async()=>{reads++;return items;}},$:id=>id==='announcementsButton'?button:{querySelector:()=>content},
  openModal:()=>{opens++;c.modalKind='お知らせ';c.modalRevision++;content.innerHTML='loading';}};
 vm.createContext(c);
 vm.runInContext(source.slice(source.indexOf('const esc = '),source.indexOf('const segmenter = ')),c);
 const a=source.indexOf('/* Announcement read state'),b=source.indexOf('function active()',a);
 vm.runInContext(source.slice(a,b)+'\nglobalThis.state=()=>({announcementReadAt,announcementItems});',c);
 return {c,values,key,classes,button,content,reads:()=>reads,opens:()=>opens,now:value=>{now=value;},close:()=>{c.modalKind=null;c.modalRevision++;}};
}
test('background fetch never opens a modal or marks read; opening preserves unread emphasis and saves one local time',async()=>{
 const r=ui();await r.c.refreshAnnouncements();assert.equal(r.opens(),0);assert.equal(r.values.get(r.key),'5000');
 assert.ok(r.classes.has('has-unread'));
 await r.c.showAnnouncements();assert.equal(r.values.get(r.key),'10000');assert.equal(r.values.size,1);
 assert.equal((r.content.innerHTML.match(/is-unread/g)||[]).length,2);assert.ok(!r.classes.has('has-unread'));
 assert.equal(r.c.state().announcementReadAt,10000);
 r.close();r.now(11000);await r.c.showAnnouncements();assert.ok(!r.content.innerHTML.includes('is-unread'));
});
test('empty announcements dim the bell and opening uses an empty state',async()=>{
 const r=ui({items:[],stored:null});await r.c.refreshAnnouncements();assert.ok(!r.classes.has('has-unread'));
 await r.c.showAnnouncements();assert.match(r.content.innerHTML,/お知らせはありません/);
});
test('a message published at or after the opening timestamp remains unread for the next opening',async()=>{
 const r=ui({items:[{body:'Arrived after opening',publishedAt:10001}]});await r.c.showAnnouncements();
 assert.equal(r.values.get(r.key),'10000');assert.ok(r.classes.has('has-unread'));assert.match(r.content.innerHTML,/is-unread/);
});
test('read failures and panels closed during loading never move the read timestamp',async()=>{
 const r=ui();r.c.cloud.getAnnouncements=async()=>{throw Error('offline');};await r.c.showAnnouncements();
 assert.equal(r.values.get(r.key),'5000');assert.match(r.content.innerHTML,/読み込めませんでした/);
 r.close();let release;r.c.cloud.getAnnouncements=()=>new Promise(resolve=>{release=resolve;});
 const pending=r.c.showAnnouncements();r.close();release([{body:'Late',publishedAt:6000}]);await pending;
 assert.equal(r.values.get(r.key),'5000');assert.equal(r.content.innerHTML,'loading');
});
test('opening waits for a background request and then fetches a fresh snapshot instead of losing intervening messages',async()=>{
 const r=ui();let release,calls=0;
 r.c.cloud.getAnnouncements=()=>++calls===1?new Promise(resolve=>{release=resolve;}):Promise.resolve([{body:'Intervening',publishedAt:9000}]);
 const background=r.c.refreshAnnouncements(),opening=r.c.showAnnouncements();
 release([{body:'Old snapshot',publishedAt:4000}]);await background;await opening;
 assert.equal(calls,2);assert.match(r.content.innerHTML,/Intervening/);assert.ok(!r.content.innerHTML.includes('Old snapshot'));
});
test('a slower window cannot overwrite a newer read time saved by another window',async()=>{
 const r=ui();let release;r.c.cloud.getAnnouncements=()=>new Promise(resolve=>{release=resolve;});
 const opening=r.c.showAnnouncements();r.values.set(r.key,'12000');release([{body:'Message',publishedAt:8000}]);await opening;
 assert.equal(r.values.get(r.key),'12000');assert.equal(r.c.state().announcementReadAt,12000);
});
test('plain text is escaped, invalid saved times are ignored, and blocked localStorage never crashes the modal',async()=>{
 for(const stored of ['NaN','Infinity','-4']){
  const r=ui({stored});assert.equal(r.c.state().announcementReadAt,0);
 }
 const r=ui({items:[{body:'<img src=x onerror=alert(1)>\nSecond line',publishedAt:9000}]});
 r.c.localStorage.setItem=()=>{throw Error('storage blocked');};await r.c.showAnnouncements();
 assert.match(r.content.innerHTML,/&lt;img/);assert.ok(!r.content.innerHTML.includes('<img'));
 assert.equal(r.c.state().announcementReadAt,10000);assert.ok(!r.classes.has('has-unread'));
});
test('background refresh reuses the in-flight result and caches for a minute; busy or logged-out views cannot open',async()=>{
 const r=ui();await Promise.all([r.c.refreshAnnouncements(),r.c.refreshAnnouncements()]);assert.equal(r.reads(),1);
 r.now(20000);await r.c.refreshAnnouncements();assert.equal(r.reads(),1);
 r.now(71000);await r.c.refreshAnnouncements();assert.equal(r.reads(),2);
 r.c.busy=true;await r.c.showAnnouncements();assert.equal(r.opens(),0);
 r.c.busy=false;r.c.store.player=null;await r.c.showAnnouncements();assert.equal(r.opens(),0);
});
