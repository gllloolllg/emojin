"""Variable BET UI and saved-round recovery against a local mocked cloud."""
import asyncio,functools,http.server,importlib.util,threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('slot_base',ROOT/'tests/slot-any-bonus.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(base.Quiet,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   for width,height in [(390,844),(320,568)]:
    ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,service_workers='block',reduced_motion='reduce')
    await ctx.add_init_script(base.MOCK)
    await ctx.route('https://**/*',lambda r:r.abort())
    source=base.SOURCE.replace('createCloud().then(cloud=>{','Promise.resolve(window.mockCloud).then(cloud=>{')
    source=source.replace('function chooseSlotCue(center,rng=Math.random){','function chooseSlotCue(center,rng=Math.random){return null;')
    source=source.replace('reduced()?Math.min(ms,55):ms','Math.min(ms,10)')
    # Fixed RNG gives a paid cherry win, using the real round generator and BET.
    source=source.replace('SLOT.createRound(undefined,selectedSlotBet)','SLOT.createRound(()=>.7,selectedSlotBet)')
    await ctx.route('**/app.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=source))
    page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/')
    await page.wait_for_selector('#bootScreen',state='hidden');await page.locator('#mojiSpinButton').click();await base.idle(page)
    await page.evaluate('mockCloud.wallet.balance=8;window.dispatchEvent(new Event("emojin-wallet"))')
    await page.locator('#slotBetButton').click()
    assert await page.locator('.slot-bet-down').is_disabled()
    for selector in ['.slot-bet-up','.slot-bet-set']:
     await page.locator(selector).focus()
     assert await page.locator(selector).evaluate('(el)=>{const s=getComputedStyle(el);return s.outlineStyle==="none"&&s.textDecorationLine==="none"}')
    for _ in range(49):await page.locator('.slot-bet-up').click()
    assert await page.locator('.slot-bet-value').text_content()=='400'
    assert await page.locator('.slot-bet-up').is_disabled()
    assert await page.locator('#slotSpinButton').is_disabled()
    await page.screenshot(path=f'/tmp/emojin-bet-{width}.png')
    for _ in range(45):await page.locator('.slot-bet-down').click()
    assert await page.locator('.slot-bet-value').text_content()=='40'
    assert await page.locator('.slot-bet-dialog .slot-bet-close').count()==0
    await page.locator('.slot-bet-set').click()
    assert await page.locator('#slotBetButton').evaluate('(el)=>getComputedStyle(el).outlineStyle')=='none'
    assert await page.locator('#slotBetButton').evaluate('(el)=>getComputedStyle(el).textDecorationLine')=='none'
    await page.locator('#slotOddsButton').click()
    assert await page.locator('.spin-odds-item strong').first.text_content()=='1,280'
    await page.locator('.spin-odds-close').click()
    await page.evaluate('mockCloud.wallet.balance=40;window.dispatchEvent(new Event("emojin-wallet"));window.holdSave=true')
    await base.idle(page);await page.locator('#slotSpinButton').click()
    await page.wait_for_function('!!window.releaseSave')
    assert await page.locator('#spinWallet').text_content()=='0'
    assert await page.locator('#slotBetButton').is_disabled()
    await page.evaluate('window.holdFinish=true;window.releaseSave()')
    await page.wait_for_function('!!window.releaseFinish')
    assert await page.locator('#slotSpinButton').is_disabled()
    assert await page.evaluate('mockCloud.active.round.bet')==40
    assert await page.evaluate('mockCloud.active.round.total')==20080
    await page.evaluate('window.releaseFinish()');await base.idle(page)
    assert await page.locator('#spinWallet').text_content()=='20,080'
    assert await page.locator('#spinBet').text_content()=='40'
    # An interrupted 80 BET result retains its saved BET, not the current selection.
    await page.evaluate('''()=>{const round=MojiSpinEngine.createRound(()=>.7,80);mockCloud.active={round,balanceBefore:80,balanceAfter:round.total};mockCloud.wallet.balance=round.total;window.holdFinish=true;window.releaseFinish=null;}''')
    await page.locator('.moji-spin-panel .modal-close').click();await page.wait_for_selector('.moji-spin-panel',state='detached')
    await page.locator('#mojiSpinButton').click();await page.wait_for_function('!!window.releaseFinish')
    await page.evaluate('window.releaseFinish()');await base.idle(page)
    assert await page.locator('#spinWallet').text_content()=='40,160'
    assert await page.evaluate('audit.saves.length')==1
    await page.reload();await page.wait_for_selector('#bootScreen',state='hidden');await page.locator('#mojiSpinButton').click();await base.idle(page)
    assert await page.locator('#spinBet').text_content()=='8'
    assert not errors,errors
    print(f'PASS {width}: BET bounds, low balance, scaled odds/payout, save/finish locks, saved 80 BET recovery, reload default')
    await ctx.close()
   await browser.close()
 finally:server.shutdown()
asyncio.run(main())
