"""Daily Battle naming UI with mocked wallet/name subscriptions and no production requests."""
import asyncio,functools,http.server,importlib.util,json,subprocess,threading
from datetime import datetime,timezone
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('base',ROOT/'tests/slot-any-bonus.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
FIXTURE=r'''
const fs=require('fs'),vm=require('vm'),c={};vm.createContext(c);const s=fs.readFileSync('app.js','utf8');vm.runInContext(s.slice(0,s.indexOf('/* Firebase configuration is public.')),c);console.log(JSON.stringify(c.DailyBattle.publicBattle(c.DailyBattle.create(c.DailyBattle.currentDay(),c.EmojinEngine.seeded(42)))));
'''
async def main():
 fixture=json.loads(subprocess.check_output(['node','-e',FIXTURE],cwd=ROOT,text=True))
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(base.Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   for width,height in [(390,844),(320,568)]:
    ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,service_workers='block')
    mock='window.namingFixture='+json.dumps(fixture)+';'+base.MOCK+r'''
window.naming={names:{},listeners:new Set(),attempts:[],hold:true};mockCloud.wallet.balance=100;
mockCloud.getDailyBattlePlayer=async()=>null;
mockCloud.getDailyBattle=async()=>({...structuredClone(namingFixture),fighters:namingFixture.fighters.map((f,i)=>naming.names[i]?{...f,name:naming.names[i].name,renamed:true}:f)});
mockCloud.watchDailyBattleNames=(day,fn)=>{naming.listeners.add(fn);queueMicrotask(()=>fn(structuredClone(naming.names)));return ()=>naming.listeners.delete(fn);};
mockCloud.renameDailyBattle=async(day,side,name)=>{
 naming.attempts.push({day,side,name});if(naming.hold)await new Promise(resolve=>window.releaseRename=resolve);
 if(naming.names[side])throw Object.assign(Error('このエモジンの名前は既に変更されています。'),{code:'daily-name-taken'});
 if(Date.now()>=namingFixture.closeAt)throw Error('受付終了');
 if(mockCloud.wallet.balance<100)throw Error('100モジ必要です。');
 naming.names[side]={name};mockCloud.wallet.balance-=100;
 naming.listeners.forEach(fn=>fn(structuredClone(naming.names)));window.dispatchEvent(new Event('emojin-wallet'));return {name};
};
'''
    await ctx.add_init_script(mock);await ctx.route('https://**/*',lambda r:r.abort())
    source=base.SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{').replace('function installSlotButton(){','window.openDailyTest=showDailyBattle;\nfunction installSlotButton(){')
    await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    async def open_lobby():
     await page.wait_for_selector('#bootScreen',state='hidden');await page.locator('#dailyBattleButton').click();await page.wait_for_selector('[data-daily-name="0"]')
    await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/');await open_lobby()
    assert await page.locator('.daily-name-edit').count()==2
    await page.locator('[data-daily-name="0"]').tap();await page.wait_for_selector('.daily-name-dialog')
    inp=page.locator('#dailyNameInput');submit=page.locator('#dailyNameSubmit')
    assert await page.locator('#dailyNameTitle').text_content()=='100モジでメイメイする'
    assert await page.locator('#dailyNameCost').count()==0
    assert await submit.is_disabled()
    await inp.fill('');assert await submit.is_disabled()
    await inp.fill('あいうえおかきくけ');assert await submit.is_disabled()
    assert await page.locator('#dailyNameCount').text_content()=='9 / 8'
    await page.evaluate('mockCloud.wallet.balance=99');await inp.fill('八文字の名前です');assert await submit.is_disabled()
    await page.evaluate('mockCloud.wallet.balance=100');await inp.fill('あいうえおかきく');assert await submit.is_enabled()
    await page.screenshot(path=f'/tmp/emojin-daily-name-dialog-{width}.png')
    await submit.click();await page.wait_for_function('!!window.releaseRename')
    assert await inp.is_disabled();assert await page.locator('.daily-name-close').is_disabled()
    await page.keyboard.press('Escape');assert await page.locator('.daily-name-dialog').is_visible()
    await page.evaluate('window.releaseRename()');await page.wait_for_selector('.daily-name-dialog',state='detached')
    await page.wait_for_function("document.querySelector('.daily-side-0 h3').textContent==='あいうえおかきく'")
    assert await page.locator('[data-daily-name="0"]').count()==0
    assert await page.evaluate('mockCloud.wallet.balance')==0
    assert await page.evaluate('naming.attempts.length')==1
    await page.screenshot(path=f'/tmp/emojin-daily-name-saved-{width}.png')
    await page.locator('.daily-battle-panel .modal-close').click();await page.wait_for_selector('.daily-battle-panel',state='detached')
    await page.locator('#dailyBattleButton').click();await page.wait_for_selector('[data-daily-name="1"]')
    assert await page.locator('[data-daily-name="0"]').count()==0
    await page.evaluate('mockCloud.wallet.balance=100;window.releaseRename=null')
    await page.locator('[data-daily-name="1"]').click();await inp.fill('私の新しい名前');await submit.click();await page.wait_for_function('!!window.releaseRename')
    await page.evaluate("naming.names[1]={name:'ほかの命名'};naming.listeners.forEach(fn=>fn(structuredClone(naming.names)));window.releaseRename()")
    await page.wait_for_function("document.querySelector('#dailyNameError').textContent.includes('既に')")
    assert await submit.is_disabled();assert await page.evaluate('mockCloud.wallet.balance')==100
    await page.locator('.daily-name-close').click();await page.wait_for_selector('.daily-name-dialog',state='detached')
    assert await page.locator('.daily-side-1 h3').text_content()=='ほかの命名'
    assert await page.locator('.daily-name-edit').count()==0
    # A fresh upcoming fixture: advancing past its real JST deadline disables editing.
    await page.reload();await open_lobby();await page.locator('[data-daily-name="1"]').click();await inp.fill('締切の確認')
    await page.clock.set_fixed_time(datetime.fromtimestamp((fixture['closeAt']+1000)/1000,timezone.utc))
    await inp.fill('締切後の名前');assert await submit.is_disabled()
    assert '終了' in await page.locator('#dailyNameError').text_content()
    await page.locator('.daily-name-close').click();await page.evaluate("()=>{namingFixture.status='finished';openDailyTest();}")
    await page.wait_for_selector('.daily-battle-panel');await page.wait_for_function('!document.querySelector(".daily-name-edit")')
    assert await page.evaluate('naming.attempts.length')==0
    assert not errors,errors
    print(f'PASS {width}: two edit buttons, 8-character/100-moji limits, saving lock, one-time naming, live competing rename without debit, deadline/finished lock')
    await ctx.close()
   await browser.close()
 finally:server.shutdown()
asyncio.run(main())
