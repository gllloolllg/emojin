'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
function harness(){
  const sheets=new Map(),receipts=new Map(),properties=new Map(),triggers=[];
  function sheet(name){
    if(!sheets.has(name))sheets.set(name,{
      rows:[],getLastRow(){return this.rows.length;},appendRow(row){this.rows.push(row);},
      getRange(row,col,n=1,m=1){return {
        getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>sheets.get(name).rows[row+i-1]?.[col+j-1]??'')),
        getValue:()=>sheets.get(name).rows[row-1]?.[col-1],
        setValue(value){sheets.get(name).rows[row-1][col-1]=value;},
        setValues(values){values.forEach((vals,i)=>vals.forEach((value,j)=>sheets.get(name).rows[row+i-1][col+j-1]=value));}
      };}
    });
    return sheets.get(name);
  }
  const book={getId:()=> 'sheet-id',getSheetByName:name=>sheets.get(name),insertSheet:name=>sheet(name)};
  const ctx={console,Math,Date,JSON,Array,Number,RegExp,Error,String,Object,
    SpreadsheetApp:{getActiveSpreadsheet:()=>book,openById:()=>book,flush:()=>{}},
    PropertiesService:{getScriptProperties:()=>({setProperty:(k,v)=>properties.set(k,v),getProperty:k=>properties.get(k)})},
    LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},
    CacheService:{getScriptCache:()=>({put:(key,value)=>receipts.set(key,value),get:key=>receipts.get(key)||null})},
    Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},
      computeDigest:(algorithm,value)=>[...crypto.createHash(algorithm).update(value).digest()],
      newBlob:value=>({getBytes:()=>[...Buffer.from(value)]})},
    ScriptApp:{getProjectTriggers:()=>triggers,deleteTrigger:()=>{},newTrigger:()=>({timeBased(){return this;},everyHours(){return this;},create(){triggers.push({getHandlerFunction:()=> 'hourlyBattle'});}})},
    ContentService:{MimeType:{JAVASCRIPT:'javascript'},createTextOutput:value=>({value,setMimeType(){return this;}})}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('gas/Engine.gs','utf8'),ctx);
  vm.runInContext(fs.readFileSync('gas/Code.gs','utf8'),ctx);
  ctx.setupEmojin();
  let seq=0;
  function call(token,op,data={},id='test-'+(++seq).toString().padStart(30,'0')){
    ctx.doPost({postData:{contents:JSON.stringify({id,actionId:id,token,op,data})}});
    const output=ctx.doGet({parameter:{id,callback:'emojin_reply_abcdef012345'}}).value;
    const packet=JSON.parse(output.slice(output.indexOf('(')+1,-2));
    if(!packet.ok)throw new Error(packet.error);
    return packet.value;
  }
  return {ctx,sheets,call};
}
test('GAS registration, draft recovery, battle log and hourly trigger',()=>{
 const {ctx,sheets,call}=harness();
 const a='a'.repeat(64),b='b'.repeat(64);
 assert.equal(call(a,'createPlayer',{name:'甲'}).name,'甲');
 assert.equal(call(b,'createPlayer',{name:'乙'}).name,'乙');
 assert.throws(()=>call('c'.repeat(64),'createPlayer',{name:'甲'}),/使われ/);
 const first=call(a,'startDraft');assert.equal(first.created,true);
 assert.equal(call(a,'startDraft').draft.id,first.draft.id);
 assert.equal(call(a,'startDraft').created,false);
 call(a,'chooseSpecial',{name:'あお',chosen:first.draft.offers[0]});
 const e=call(a,'finishDraft',{draftId:first.draft.id});
 assert.equal(e.ownerName,'甲');
 assert.equal(call(a,'finishDraft',{draftId:first.draft.id}).id,e.id);
 const second=call(b,'startDraft');call(b,'chooseSpecial',{name:'あか',chosen:second.draft.offers[0]});
 call(b,'finishDraft',{draftId:second.draft.id});
 const action='forced-'+('f'.repeat(30));
 const fight=call(a,'forceBattle',{},action);
 assert.equal(call(a,'forceBattle',{},action).battleId,fight.battleId);
 assert.equal(sheets.get('battles').rows.length,2);
 assert.equal(call(a,'getState').battles.length,1);
 const meta=JSON.parse(sheets.get('meta').rows[1][1]);meta.lastTickAt-=3600000;
 sheets.get('meta').rows[1][1]=JSON.stringify(meta);
 ctx.hourlyBattle();
 assert.ok(JSON.parse(sheets.get('meta').rows[1][1]).lastTickAt>meta.lastTickAt);
});
