"""Main-game + real adventure iframe UI. Mock Firebase only; never writes production."""
import asyncio,functools,http.server,importlib.util,threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('fixture',ROOT/'tests/slot-any-bonus.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
MOCK=base.MOCK+r'''
window.own={id:'own',name:'ほんもののマイエモジン',emoji:'🐙',maxHp:7,currentHp:7,slots:['attack1','attack2','guard','heal','blank','curse'],status:'active',ownerUid:'me',isNpc:false,stars:0,defeats:0,cursedSlots:[],poisoned:false,ownerName:'me',createdAt:Date.now(),rulesVersion:4,recordVersion:0};
window.legend={id:'legend',name:'みんなのレジェンド',emoji:'🐢',maxHp:40,baseMaxHp:40,currentHp:40,slots:['strong','attack2','counter','guard','heal','blank'],status:'active',cursedSlots:[],poisoned:false};
const priorState=mockCloud.getState;mockCloud.getState=async()=>({...await priorState(),emojins:[own]});
window.starts=[];window.savedResults=[];window.failStart=false;window.failResult=false;
mockCloud.startAdventure=async id=>{starts.push(id);if(failStart)throw Error('つうしんエラー');const key='test.'+id;if(localStorage.getItem(key))return JSON.parse(localStorage.getItem(key));if(mockCloud.wallet.balance<100)throw Error('ざんだか ぶそく');mockCloud.wallet.balance-=100;const record={runId:id,player:AdventureStore.snapshot(own),legend};localStorage.setItem(key,JSON.stringify(record));return record;};
mockCloud.saveAdventureResult=async result=>{savedResults.push(result);if(failResult)throw Error('つうしんエラー');AdventureStore.validateResult(result);return {best:true,score:result.score}};
mockCloud.adventurePersonal=async()=>[{score:123456,name:'me'}];mockCloud.adventureRankings=async()=>[{score:999999,name:'<img src=x>'},{score:123456,name:'me'}];
'''
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(base.Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   for w,h in [(390,844),(320,568)]:
    ctx=await browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,service_workers='block');await ctx.add_init_script(MOCK);await ctx.route('https://**/*',lambda r:r.abort())
    source=base.SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{')
    await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');
    try: await page.wait_for_selector('#bootScreen',state='hidden',timeout=10000)
    except: print('BOOT',await page.locator('#bootMessage').inner_text(),errors);raise
    tops=[await page.locator('#'+id).evaluate('(el)=>el.getBoundingClientRect().top') for id in ['adventureButton','mojiSpinButton','dailyBingoButton']];assert tops[0]<tops[1]<tops[2]
    await page.evaluate('mockCloud.wallet.balance=99');await page.locator('#adventureButton').tap();frame=page.frame_locator('#adventureFrame');await frame.locator('#start').wait_for();assert await frame.locator('#start').is_disabled();assert await frame.locator('.play-price').inner_text()=='1PLAY 100モジ';assert not await page.evaluate('EmojinCanReload()')
    await frame.locator('#exit').tap();await page.wait_for_selector('#adventureFrame',state='detached');assert await page.evaluate('starts.length')==0
    await page.evaluate('mockCloud.wallet.balance=200;failStart=true');await page.locator('#adventureButton').tap();await frame.locator('#start:enabled').wait_for();await frame.locator('#start').tap();await frame.locator('#start-error').filter(has_text='つうしん').wait_for()
    await page.evaluate('failStart=false');await frame.locator('#start').tap();await frame.locator('.map-screen').wait_for(timeout=10000);assert await page.evaluate('starts[0]===starts[1]');assert await page.evaluate('mockCloud.wallet.balance')==100
    state=await frame.locator('body').evaluate('()=>({name:Adventure.state.player.name,hp:Adventure.state.player.currentHp,legend:Adventure.state.legend.name})');assert state=={'name':'ほんもののマイエモジン','hp':7,'legend':'みんなのレジェンド'}
    await page.screenshot(path=f'/tmp/emojin-adventure-integrated-{w}.png')
    await frame.locator('body').evaluate('()=>{run.player.currentHp=1;run.floor=10;const map=generateFloor(10,run.pos);if(map.boss.name!=="みんなのレジェンド"||map.boss.maxHp!==40)throw Error("legend mismatch");addScore("heart");window.parent.failResult=true;gameover(false)}');await frame.locator('.footnote').filter(has_text='さいしこう').wait_for();assert await page.evaluate('own.currentHp')==7
    await page.evaluate('failResult=false');await frame.locator('.gameover').tap();await frame.locator('.result-score').filter(has_text='ベストスコア').wait_for();await frame.locator('.gameover').tap();await frame.locator('#ranking').tap();await frame.locator('.score-table').wait_for();assert await frame.locator('.score-table img').count()==0;assert '<img src=x>' in await frame.locator('.score-table').inner_text();await frame.locator('#rank-mine').tap();await frame.locator('.score-table').filter(has_text='123456').wait_for();await frame.locator('#back').tap();await frame.locator('#exit').tap();await page.wait_for_selector('#adventureFrame',state='detached');assert not errors,errors;await ctx.close()
   await browser.close();print('PASS integrated UI 390/320: icon order, price, 99/100 gate, payment retry same ID, owned emojin + legend copy, no main HP mutation, PWA reload guard, score retry, escaped names, leaderboard tabs, exit to town')
 finally:server.shutdown()
asyncio.run(main())
