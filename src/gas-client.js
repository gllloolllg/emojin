import './engine.js';
const E=window.EmojinEngine;

const ENDPOINT='https://script.google.com/macros/s/AKfycbzJHwzgGZGBDwEwANQJoADfoqBkFfwlEDRby9aLEdPnuih7QU4en2FwphIH6u_8b2VqMA/exec';
const TOKEN_KEY='emojin.gas.deviceToken.v1';
const WALLET_PREFIX='emojin.gas.wallet.v1.';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const randomId=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
function deviceToken(){
  let token=localStorage.getItem(TOKEN_KEY);
  if(!token){token=randomId();localStorage.setItem(TOKEN_KEY,token);}
  return token;
}
function wallet(uid){
  const key=WALLET_PREFIX+uid,raw=localStorage.getItem(key);
  if(raw){try{
    const value=JSON.parse(raw);
    if(Number.isFinite(value.balance)&&Number.isFinite(value.updatedAt))return value;
  }catch(error){console.warn('モジ残高を読み込めません',error);}}
  const initial={balance:3000,updatedAt:Date.now()};
  localStorage.setItem(key,JSON.stringify(initial));return initial;
}
function spend(uid,cost){
  const key=WALLET_PREFIX+uid,next=E.accrueMoji(wallet(uid),Date.now());
  // A second tab may have spent points while the GAS request was running.
  next.balance=Math.max(0,next.balance-cost);
  localStorage.setItem(key,JSON.stringify(next));return next;
}
function requireBalance(uid,cost){
  if(E.accrueMoji(wallet(uid),Date.now()).balance<cost)throw new Error(`${cost}モジ必要です。`);
}
function jsonp(receipt){
  return new Promise((resolve,reject)=>{
    const callback='emojin_reply_'+randomId().slice(0,20),script=document.createElement('script');
    let done=false;
    const cleanup=()=>{if(done)return;done=true;clearTimeout(timer);delete window[callback];script.remove();};
    const timer=setTimeout(()=>{cleanup();reject(new Error('GASからの応答がありません。'));},12000);
    window[callback]=data=>{cleanup();resolve(data);};
    script.onerror=()=>{cleanup();reject(new Error('GASとの通信に失敗しました。'));};
    script.src=`${ENDPOINT}?id=${encodeURIComponent(receipt)}&callback=${callback}&t=${Date.now()}`;
    document.head.appendChild(script);
  });
}
async function request(op,token,data={}){
  const id=randomId(),body=JSON.stringify({id,actionId:id,token,op,data});
  // text/plain is a simple cross-origin POST; the Apps Script response itself is opaque.
  // A short-lived, read-only JSONP receipt carries the result without sending the device token in the URL.
  for(let attempt=0;attempt<2;attempt++){
    try{await fetch(ENDPOINT,{method:'POST',mode:'no-cors',credentials:'omit',
      headers:{'Content-Type':'text/plain'},body});}
    catch(error){if(attempt===1)throw error;await pause(1000);continue;}
    for(let n=0;n<12;n++){
      const packet=await jsonp(id);
      if(packet.ready){if(packet.ok)return packet.value;throw new Error(packet.error||'GASで処理に失敗しました。');}
      await pause(750);
    }
  }
  throw new Error('結果を確認できませんでした。少し待って再読み込みしてください。');
}
export async function createCloud(){
  if(ENDPOINT.includes('REPLACE_WITH_')||!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(ENDPOINT))
    throw new Error('src/gas-client.js にGASの /exec URLを設定してください。');
  const token=deviceToken();
  const cloud={uid:null};
  cloud.wallet=()=>cloud.uid?wallet(cloud.uid):null;
  async function call(op,data){return request(op,token,data);}
  cloud.getState=async()=>{
    const state=await call('getState');
    cloud.uid=state.uid;
    return {...state,wallet:state.player?wallet(state.uid):null,
      reducedMotion:localStorage.getItem('emojin.online.reducedMotion')==='true'};
  };
  cloud.createPlayer=data=>call('createPlayer',data);
  cloud.startDraft=async()=>{
    requireBalance(cloud.uid,1400);
    const result=await call('startDraft');
    if(result.created)result.wallet=spend(cloud.uid,1400);
    else result.wallet=wallet(cloud.uid);
    return result;
  };
  cloud.chooseSpecial=data=>call('chooseSpecial',data);
  cloud.finishDraft=data=>call('finishDraft',data);
  cloud.forceBattle=async()=>{
    requireBalance(cloud.uid,100);
    const result=await call('forceBattle');
    spend(cloud.uid,100);
    return result;
  };
  cloud.markSeen=data=>call('markSeen',data);
  cloud.markTutorialSeen=()=>call('markTutorialSeen');
  return cloud;
}
