const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'app.js'),'utf8');
const start=source.indexOf('/* Daily Battle: public schedule'),end=source.indexOf('/* End Daily Battle engine. */',start);
if(start<0||end<0)throw Error('Daily Battle engine markers missing');
const engine=source.slice(start,end+'/* End Daily Battle engine. */'.length)+'\n',target=path.join(root,'gas/DailyBattleEngine.gs');
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==engine)throw Error('Run node scripts/sync-daily-battle.cjs');}
else fs.writeFileSync(target,engine);
