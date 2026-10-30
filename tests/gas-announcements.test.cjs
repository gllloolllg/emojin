const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../gas/Announcements.gs'),'utf8');
const plain=v=>JSON.parse(JSON.stringify(v));
function runtime({retry=false,responseLost=false,failure=null}={}) {
 const records=new Map(),writes=[],logs=[];let calls=0,uuids=0;
 const c={console:{log:value=>logs.push(value)},Utilities:{getUuid:()=> 'uuid-'+(++uuids)},firestore_:()=>{
  calls++;return {transaction:callback=>{
   const tx={get:key=>records.has(key)?plain(records.get(key)):null,write:(key,data)=>({update:{name:key,fields:plain(data)}})};
   if(failure)throw failure;
   if(retry)callback(tx);
   const commit=result=>{for(const write of result.writes){writes.push(plain(write));records.set(write.update.name,plain(write.update.fields));}};
   let result=callback(tx);commit(result);
   if(responseLost){result=callback(tx);commit(result);}
   return result.value;
  }};
 }};
 vm.createContext(c);vm.runInContext(source,c);
 return {c,records,writes,logs,get calls(){return calls;},get uuids(){return uuids;}};
}
test('default and blank announcements never connect or publish anything',()=>{
 const r=runtime();assert.throws(()=>r.c.postAnnouncement(),/本文/);
 for(const body of ['', ' \n\t ',null,123])assert.throws(()=>r.c.publishAnnouncement_(body),/本文/);
 assert.equal(r.calls,0);assert.equal(r.uuids,0);assert.equal(r.records.size,0);assert.equal(r.logs.length,0);
});
test('manual posting keeps plain text and newlines and sets a Firestore server timestamp',()=>{
 const r=runtime(),body='  お知らせ！\n「引用」や🤡、<b>文字</b>もそのまま。\n ';
 const result=r.c.publishAnnouncement_(body);assert.equal(result.id,'a-uuid-1');assert.equal(result.published,true);
 assert.deepEqual(r.writes,[{update:{name:'announcements/a-uuid-1',fields:{body:body.trim(),published:true}},updateTransforms:[{fieldPath:'publishedAt',setToServerValue:'REQUEST_TIME'}]}]);
 assert.equal(r.logs.length,1);assert.match(r.logs[0],/公開しました/);
});
test('transaction retry and committed-but-lost response reuse the ID and publish once',()=>{
 for(const options of [{retry:true},{responseLost:true}]){
  const r=runtime(options),result=r.c.publishAnnouncement_('一件だけ公開');
  assert.equal(result.id,'a-uuid-1');assert.equal(r.uuids,1);assert.equal(r.records.size,1);assert.equal(r.writes.length,1);
 }
});
test('separate manual executions create separate announcements without changing existing ones',()=>{
 const r=runtime();r.c.publishAnnouncement_('一つ目');r.c.publishAnnouncement_('二つ目');
 assert.equal(r.records.size,2);assert.equal(r.records.get('announcements/a-uuid-1').body,'一つ目');assert.equal(r.records.get('announcements/a-uuid-2').body,'二つ目');
});
test('permission/network errors are reported without a false success message',()=>{
 const r=runtime({failure:Error('PERMISSION_DENIED')});assert.throws(()=>r.c.publishAnnouncement_('本文'),/PERMISSION_DENIED/);
 assert.equal(r.records.size,0);assert.equal(r.logs.length,0);
});
