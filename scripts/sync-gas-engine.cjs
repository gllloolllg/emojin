// Keep the single-file browser structure and generate an identical GAS engine.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'app.js'),'utf8');
const engine=source.slice(0,source.indexOf('/* MOJI SPIN:'));
const target=path.join(root,'gas','Engine.gs');
if(process.argv.includes('--check')) {
  if(fs.readFileSync(target,'utf8')!==engine)throw Error('Run node scripts/sync-gas-engine.cjs');
} else fs.writeFileSync(target,engine);
