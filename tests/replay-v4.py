"""Local, mocked-cloud Chromium replay regression; requires Python Playwright + Chromium.
Runs no Firebase writes. Only response copies get shorter animation waits and audit hooks.
"""
import asyncio, functools, http.server, json, os, subprocess, threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
SOURCE=(ROOT/'app.js').read_text()
WIDTH=int(os.environ.get('EMOJIN_TEST_WIDTH','390'))
HEIGHT=int(os.environ.get('EMOJIN_TEST_HEIGHT','844'))
FIXTURES=r'''
const fs=require('fs'),vm=require('vm'),old=require('./tests/fixtures/rules-v3-engine.cjs');
const source=fs.readFileSync('app.js','utf8'),c={};vm.createContext(c);vm.runInContext(source.slice(0,source.indexOf('/* MOJI SPIN:')),c);const E=c.EmojinEngine;
const e=(id,face='blank',extra={})=>({id,name:id,emoji:'🐸',ownerUid:id,ownerName:id,isNpc:false,maxHp:8,currentHp:8,stars:0,defeats:0,rulesVersion:4,recordVersion:0,status:'active',poisoned:false,cursedSlots:[],slots:Array(6).fill(face),createdAt:1,endedAt:null,...extra});
const a=E.battle(e('skip-a','strong'),e('skip-b'),E.seeded(1),1000,'skip');
const legacy=old.battle(e('old-a','attack1'),e('old-b'),old.seeded(1),1001);legacy.battleId='old';
const draw=E.battle(e('draw-a'),e('draw-b'),E.seeded(1),1002,'draw');
const award=E.battle(e('award-a','strong',{stars:49}),e('award-b','blank',{defeats:2}),E.seeded(1),1003,'award');
const logs=[a,legacy,draw,award].map((l,i)=>({...l,seq:i+1}));
console.log(JSON.stringify({logs,residents:logs.flatMap(l=>l.after),legends:[{seq:1,battleSeq:4,at:1003,emojin:award.after[0]}]}));
'''
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

async def main():
 fixtures=json.loads(subprocess.check_output(['node','-e',FIXTURES],cwd=ROOT,text=True))
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   ctx=await browser.new_context(viewport={'width':WIDTH,'height':HEIGHT},is_mobile=True,has_touch=True,service_workers='block')
   mock='window.fixture='+json.dumps(fixtures)+r''';
   localStorage.setItem('emojin.battleSpeed','4');
   window.audit={paint:[],seen:[],saved:0};
   const player={uid:'me',name:'me',tutorialSeen:true,seenBattleSeq:0,seenLegendSeq:0,unreadBattleIds:fixture.logs.map(l=>l.battleId)};
   window.mockCloud={uid:'me',player,wallet:{balance:2000,updatedAt:Date.now()},hatch:0,hatchPending:0,canReload:true,
    getState:async()=>({player,wallet:mockCloud.wallet,draft:null,emojins:fixture.residents,battles:fixture.logs,legends:fixture.legends,
     nextSeq:5,nextLegendSeq:2,suspendedOwnerUids:[],dormantOwnerUids:[]}),
    markSeen:async({battleIds=[]})=>{audit.seen.push(...battleIds);player.unreadBattleIds=player.unreadBattleIds.filter(id=>!battleIds.includes(id));},
    saveDraft:()=>{},saveBattle:()=>{audit.saved++;throw Error('Replay must never save a match');}};
   '''
   await ctx.add_init_script(mock)
   await ctx.route('https://**/*',lambda r:r.abort())
   served=SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{')
   served=served.replace('const wait = ms / replaySpeed;','const wait = Math.min(ms / replaySpeed, 12);')
   served=served.replace('function paintBattle(states) {',r'''function paintBattle(states) {
    window.audit.paint.push({id:currentBattle?.battleId,turn:document.querySelector('#battleTurn').textContent,
     states:JSON.parse(JSON.stringify(states)),rewards:document.querySelectorAll('.battle-record-reward').length});''')
   await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=served))
   page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/')
   await page.wait_for_function("document.querySelector('#battleCount').textContent.includes('1 / 4')")
   await page.locator('#skipButton').click()
   await page.wait_for_function("!document.querySelector('#battleNext').disabled")
   assert '1 / 4' in await page.locator('#battleCount').text_content()
   assert await page.locator('#battleTurn').text_content()==str(fixtures['logs'][0]['result']['turns'])+' / 10'
   assert sorted(await page.locator('.battle-record-reward').all_text_contents())==sorted(['☆＋3','💀＋1'])
   assert await page.locator('.dice-tile').count()==2
   await page.wait_for_timeout(1100)
   assert '1 / 4' in await page.locator('#battleCount').text_content()
   assert await page.locator('.battle-record-reward').count()==2
   assert 'skip' not in await page.evaluate('audit.seen')
   assert await page.locator('#skipButton').is_disabled()
   await page.locator('#battleNext').click()
   await page.wait_for_function("document.querySelector('#battleCount').textContent.includes('2 / 4')")
   assert await page.locator('#battleScreen').is_visible()
   await page.wait_for_function("!document.querySelector('#battleNext').disabled")
   await page.locator('#battleNext').click()
   await page.wait_for_function("document.querySelector('#battleCount').textContent.includes('3 / 4')")
   await page.wait_for_function("document.querySelector('#battleTurn').textContent==='10 / 10'",timeout=20000)
   await page.wait_for_function("document.querySelectorAll('.battle-record-reward').length===2")
   # Skip during the acquisition animation must also stop at the result.
   await page.locator('#skipButton').click()
   await page.wait_for_function("!document.querySelector('#battleNext').disabled")
   assert await page.locator('.battle-record-reward').all_text_contents()==['☆＋1','☆＋1']
   await page.wait_for_timeout(700)
   assert '3 / 4' in await page.locator('#battleCount').text_content()
   await page.locator('#battleScreen').click(position={'x':WIDTH//2,'y':int(HEIGHT*.85)})
   await page.wait_for_function("document.querySelector('#battleCount').textContent.includes('4 / 4')")
   await page.wait_for_function("!document.querySelector('#battleNext').disabled")
   assert sorted(await page.locator('.battle-record-reward').all_text_contents())==sorted(['☆＋3','💀＋1'])
   await page.wait_for_timeout(1100)
   assert await page.locator('.battle-record-reward').count()==2
   reward_layout=await page.locator('.battle-record-reward').evaluate_all('els=>els.every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=65&&r.bottom<=innerHeight;})')
   assert reward_layout
   await page.screenshot(path='/tmp/emojin-v4-result-'+str(WIDTH)+'.png')
   layout=await page.locator('.battle-info').evaluate_all('''els=>els.map(el=>{
    const r=el.getBoundingClientRect(),record=el.querySelector('.record-badge').getBoundingClientRect(),hp=el.querySelector('.hearts').getBoundingClientRect();
    return {inside:r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight,separated:record.bottom<=hp.top};})''')
   assert all(r['inside'] and r['separated'] for r in layout),layout
   skulls=page.locator('.battle-info .defeat-skull')
   assert await skulls.count()==6
   await page.locator('#battleNext').click()
   await page.wait_for_function("!document.querySelector('#legendScreen').classList.contains('hidden')")
   await page.wait_for_function("!document.querySelector('#legendContinue').disabled")
   await page.locator('#legendContinue').click()
   await page.wait_for_function("document.querySelector('#legendScreen').classList.contains('hidden')")
   assert await page.locator('#residents .defeat-record').count()==0
   assert await page.locator('.battle-record-reward').count()==0
   star_fit=await page.evaluate("""()=>{
    const sample=document.querySelector('.star-badge svg').cloneNode(true);
    sample.style.cssText='position:fixed;opacity:0;pointer-events:none;width:100px;height:100px';document.body.appendChild(sample);
    const points=[...sample.querySelector('polygon').points].map(p=>[p.x,p.y]);
    function inside(x,y){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
     const a=points[i],b=points[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
    const text=sample.querySelector('text'),results=[];
    for(const n of [0,1,9,10,39,49,50]){text.textContent=n;const b=text.getBBox();results.push({n,fit:[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].every(p=>inside(...p))});}
    sample.remove();return results;
   }""")
   assert all(s['fit'] for s in star_fit),star_fit
   await page.locator('#battleMenuToggle').click()
   assert await page.locator('#battleMenu').is_visible()
   await page.wait_for_timeout(300)
   menu_layout=await page.evaluate("""()=>{
    const toggle=document.querySelector('#battleMenuToggle').getBoundingClientRect(),nav=document.querySelector('.bottom-nav').getBoundingClientRect(),menu=document.querySelector('#battleMenu').getBoundingClientRect();
    return {integrated:toggle.top>=nav.top&&toggle.bottom<=nav.bottom,touch:toggle.width>=44&&toggle.height>=44,inView:menu.left>=0&&menu.right<=innerWidth&&menu.top>=0};
   }""")
   assert all(menu_layout.values()),menu_layout
   await page.screenshot(path='/tmp/emojin-v4-menu-'+str(WIDTH)+'.png')
   await page.locator('#battleMenuToggle').click()
   assert await page.locator('#battleMenu').is_hidden()
   audit=await page.evaluate('audit')
   assert set(audit['seen'])=={'skip','old','draw','award'} and audit['saved']==0
   award=[p for p in audit['paint'] if p['id']=='award']
   stars=[s['stars'] for p in award for s in p['states'] if s['id']=='award-a']
   assert stars[0]==49 and stars[-1]==50 and max(stars)==50
   assert any(p['rewards']>0 and p['states'][0]['stars']==50 for p in award)
   defeats=[s['defeats'] for p in award for s in p['states'] if s['id']=='award-b']
   assert defeats[0]==2 and defeats[-1]==3 and max(defeats)==3
   assert any(p['id']=='old' for p in audit['paint'])
   assert await page.evaluate("localStorage.getItem('emojin.battleSpeed')")=='4'
   assert not errors,errors
   print(f'PASS {WIDTH}x{HEIGHT}: old log, ten turns, skip waits for tap with final dice/rewards, persistent rewards, reward before/final states, third skull, legend, speed persistence, no replay writes, no skulls in town, separated record/HP, larger numbers inside star, integrated touch menu')
   await browser.close()
 finally:server.shutdown()
asyncio.run(main())
