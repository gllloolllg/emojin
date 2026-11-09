/** Daily Battle is retired. Keep these no-ops for the existing minute trigger and manual callers. */
function dailyBattleTick_() {
  return {retired:true,writes:0};
}

/** Read-only status. No Firestore access, hidden-slot access, or migrations. */
function checkDailyBattle() {
  const report={retired:true,status:'retired'};
  console.log(JSON.stringify(report));return report;
}
