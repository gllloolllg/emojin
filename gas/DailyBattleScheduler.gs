/** Called by the existing minute trigger. No additional trigger, migration or world writes. */
function dailyBattleTick_(store,at=Date.now()) {
  const D=DailyBattle,day=D.currentDay(at),generated=D.create(day);
  return store.transaction(tx=>{
    const gate=tx.get('config/battle');
    if(gate?.maintenance!==false)return {writes:[],value:{paused:true}};
    const marker=tx.get('meta/dailyBattle'),days=[...new Set([marker?.day,day].filter(Boolean))];
    const rows=days.map(id=>({id,secret:tx.get('dailyBattleSecrets/'+id),battle:tx.get('dailyBattles/'+id),names:[0,1].map(side=>tx.get('dailyBattleNames/'+id+'/fighters/'+side))}));
    const writes=[];
    for(const row of rows){
      let secret=row.secret,battle=row.battle;
      if(!secret && row.id===day && at>=generated.openAt){secret=generated;battle=D.publicBattle(secret);writes.push(tx.write('dailyBattleSecrets/'+day,secret));}
      if(!secret)continue;
      if(at>=secret.closeAt && battle?.status!=='finished'){battle=D.settle({...secret,fighters:secret.fighters.map((e,i)=>row.names[i]?{...e,name:row.names[i].name}:e)});writes.push(tx.write('dailyBattles/'+row.id,battle));}
      else if(!row.battle)writes.push(tx.write('dailyBattles/'+row.id,battle));
    }
    if(marker?.day!==day)writes.push(tx.write('meta/dailyBattle',{day}));
    return {writes,value:{day,writes:writes.length}};
  });
}

/** Read-only readiness check. Does not expose hidden slots, seed, or user votes. */
function checkDailyBattle() {
  const day=DailyBattle.currentDay(),battle=firestore_().get('dailyBattles/'+day);
  const report={day,exists:!!battle,status:battle?.status||'not-created',
    openAtJST:battle?new Date(battle.openAt+9*3600000).toISOString().slice(0,19):null,
    closeAtJST:battle?new Date(battle.closeAt+9*3600000).toISOString().slice(0,19):null,
    publicSlotCounts:battle?battle.fighters.map(e=>e.slots.length):[]};
  console.log(JSON.stringify(report));return report;
}
