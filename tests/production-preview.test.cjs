const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function encode(value){
 if(value===null)return {nullValue:null};if(typeof value==='number')return {integerValue:String(value)};
 if(typeof value==='boolean')return {booleanValue:value};if(typeof value==='string')return {stringValue:value};
 if(Array.isArray(value))return {arrayValue:{values:value.map(encode)}};
 return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encode(v)]))}};
}
function run(data){
 const calls=[],logs=[],c={ScriptApp:{getOAuthToken:()=> 'mock-only'},Utilities:{formatDate:()=> '2026-10-19 18:00:00'},console:{log:x=>logs.push(JSON.parse(x))},UrlFetchApp:{fetch:(url,options)=>{
  assert.equal(url,'https://firestore.googleapis.com/v1/projects/emojin-49855/databases/(default)/documents:runQuery');
  assert.equal(options.method,'post');const q=JSON.parse(options.payload).structuredQuery,name=q.from[0].collectionId;
  assert.ok(['emojins','wallets'].includes(name));calls.push(name);
  const rows=Object.entries(data).filter(([path,value])=>path.startsWith(name+'/')&&(!q.where||value.status==='active')).map(([path,value])=>({document:{name:'projects/test/databases/(default)/documents/'+path,fields:encode(value).mapValue.fields}}));
  return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(rows)};
 }}};vm.createContext(c);vm.runInContext(fs.readFileSync('scripts/production-preview.gs','utf8'),c);
 return {report:JSON.parse(JSON.stringify(c.previewProductionV4())),calls,logs};
}
test('production preview only runs two read queries and reports active/draft changes without altering records',()=>{
 const data={'emojins/a':{id:'a',status:'active',maxHp:10,currentHp:1,stars:49},'emojins/b':{id:'b',status:'active',maxHp:5,stars:1},
 'emojins/c':{id:'c',status:'active',rulesVersion:4,maxHp:8,currentHp:8,stars:3,defeats:2,poisoned:false,cursedSlots:[]},
 'emojins/dead':{id:'dead',status:'dead',maxHp:10},'wallets/u':{draft:{id:'draft',maxHp:9},wallet:{balance:9999}}};
 const original=JSON.stringify(data),r=run(data);assert.equal(JSON.stringify(data),original);
 assert.deepEqual(r.calls,['emojins','wallets']);assert.equal(r.report.activeCount,3);assert.equal(r.report.emojinCount,2);
 assert.equal(r.report.hpReducedCount,1);assert.equal(r.report.draftCount,1);assert.equal(r.report.invalidCount,0);
 assert.equal(r.report.emojins[0].stars,49);assert.equal(r.report.emojins[0].toMaxHp,8);
 assert.equal(r.logs[0].type,'summary');assert.equal(r.logs[1].type,'emojins');assert.equal(r.logs[2].type,'draftWallets');
});
test('production preview reports unsupported/future data instead of declaring it migratable',()=>{
 const r=run({'emojins/bad':{id:'bad',status:'active',maxHp:99,stars:0},'wallets/u':{draft:{id:'future',maxHp:8,rulesVersion:5}},'emojins/string':{id:'string',status:'active',maxHp:8,stars:0,rulesVersion:'4'}});
 assert.equal(r.report.invalidCount,3);assert.equal(r.report.emojinCount,0);assert.equal(r.report.draftCount,0);
});
