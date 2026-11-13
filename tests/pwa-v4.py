"""Real service-worker cache/update check on an isolated in-memory local website."""
import asyncio, http.server, threading
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
INLINE=(ROOT/'index.html').read_text().split('<script>')[-1].split('</script>')[0]
SW=(ROOT/'sw.js').read_text()
STATE={'version':1,'engineFail':False,'legacy':False}
class Handler(http.server.BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  file=self.path.split('?')[0].strip('/') or 'index.html'
  if file=='index.html':
   body='<html><head><link rel="stylesheet" href="./style.css"></head><body><script src="./slot-engine.js"></script><script src="./app.js"></script><script>'+INLINE+'</script></body></html>';mime='text/html'

  elif file=='adventure/index.html':
   body='<html><head><link rel="stylesheet" href="./style.css"></head><body><script src="./engine.js"></script><script src="./game.js"></script></body></html>';mime='text/html'
  elif file=='adventure/engine.js':body=f'window.frameEngineVersion={STATE["version"]};';mime='application/javascript'
  elif file=='adventure/game.js':body=f'window.frameGameVersion={STATE["version"]};if(frameGameVersion!==frameEngineVersion)throw Error("Mixed adventure shell");';mime='application/javascript'
  elif file=='adventure/style.css':body='body{background:#000}';mime='text/css'
  elif file=='slot-engine.js':
   if STATE['engineFail']:
    self.send_response(503);self.end_headers();return
   body=f'window.slotEngineVersion={STATE["version"]};';mime='application/javascript'
  elif file=='app.js':
   body=f'window.shellVersion={STATE["version"]};window.busy=true;if(slotEngineVersion!==shellVersion)throw Error("Mixed shell");'+r'''
   window.EmojinCanReload=()=>!window.busy;
   window.EmojinPrepareReload=()=>{if(window.busy)return false;window.busy=true;return true;};
   window.EmojinCancelReload=()=>{window.busy=false;};''';mime='application/javascript'

  elif file=='sw.js':
   worker=SW.replace("'adventure-store.js', ", '').replace(", 'adventure/index.html', 'adventure/engine.js', 'adventure/game.js', 'adventure/style.css'", '').replace('emojin-shell-v3-','emojin-shell-v2-') if STATE['legacy'] else SW
   body=worker+'\nself.testWorkerVersion='+str(STATE['version'])+';';mime='application/javascript'
  elif file=='style.css':body='body{color:rgb('+str(STATE['version'])+',0,0)}';mime='text/css'
  else:body='{}';mime='application/json'
  self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body.encode())
async def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   ctx=await browser.new_context();url='http://127.0.0.1:'+str(server.server_address[1])+'/'
   first=await ctx.new_page();await first.goto(url);await first.wait_for_function('!!navigator.serviceWorker.controller')
   second=await ctx.new_page();await second.goto(url);await second.wait_for_function('!!navigator.serviceWorker.controller')
   STATE['engineFail']=True
   failed=await first.evaluate('''()=>new Promise(resolve=>{
    const channel=new MessageChannel();channel.port1.onmessage=e=>resolve(e.data);
    navigator.serviceWorker.controller.postMessage({type:'CHECK_SHELL',current:'old'},[channel.port2]);
   })''')
   assert 'error' in failed
   assert await first.evaluate('shellVersion')==1 and await second.evaluate('slotEngineVersion')==1
   STATE['engineFail']=False
   STATE['version']=2
   await first.evaluate('async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();}')
   await first.wait_for_function('async()=>!!(await navigator.serviceWorker.getRegistration()).waiting')
   await first.evaluate("async()=>{const r=await navigator.serviceWorker.getRegistration();r.active.postMessage({type:'CHECK_SHELL',current:'old'},[new MessageChannel().port2]);}")
   await first.wait_for_timeout(1200)
   assert await first.evaluate('shellVersion')==1 and await second.evaluate('shellVersion')==1
   await first.evaluate('busy=false')
   # Trigger the existing check path so the normal safe shell application can run.
   await first.evaluate("window.dispatchEvent(new Event('online'))")
   await first.wait_for_function('window.shellVersion===2',timeout=12000)
   assert await first.evaluate('slotEngineVersion')==2
   assert await second.evaluate('shellVersion')==1 and await second.evaluate('slotEngineVersion')==1 and await second.evaluate('busy')==True
   assert await first.evaluate('async()=>!!(await navigator.serviceWorker.getRegistration()).waiting')
   await second.close();await first.close()
   fresh=await ctx.new_page();await fresh.goto(url);await fresh.wait_for_function('!!navigator.serviceWorker.controller')
   assert await fresh.evaluate('shellVersion')==2 and await fresh.evaluate('slotEngineVersion')==2
   assert '_emojin_shell=' in await fresh.locator('script[src*="slot-engine.js"]').get_attribute('src')
   await ctx.set_offline(True);await fresh.reload()
   assert await fresh.evaluate('shellVersion')==2 and await fresh.evaluate('slotEngineVersion')==2
   await fresh.evaluate("()=>{const f=document.createElement('iframe');f.src='./adventure/index.html';f.id='adventure';document.body.append(f)}")
   frame=fresh.frame_locator('#adventure');await frame.locator('body').wait_for()
   await fresh.wait_for_function("document.querySelector('#adventure').contentWindow.frameGameVersion===2")
   assert await frame.locator('script[src*="game.js"]').get_attribute('src') is not None
   assert '_emojin_shell=' in await frame.locator('script[src*="engine.js"]').get_attribute('src')
   await ctx.close()
   # Upgrade an installed four-file worker while another old tab stays busy.
   STATE.update(version=1,legacy=True)
   legacy=await browser.new_context()
   old=await legacy.new_page();await old.goto(url);await old.wait_for_function('!!navigator.serviceWorker.controller')
   busy=await legacy.new_page();await busy.goto(url);await busy.wait_for_function('!!navigator.serviceWorker.controller')
   assert await busy.evaluate('slotEngineVersion')==1
   STATE.update(version=2,legacy=False)
   await old.evaluate('async()=>{await (await navigator.serviceWorker.getRegistration()).update()}')
   await old.wait_for_function('async()=>!!(await navigator.serviceWorker.getRegistration()).waiting')
   await old.evaluate("async()=>{const c=new MessageChannel();navigator.serviceWorker.controller.postMessage({type:'CHECK_SHELL',current:'old'},[c.port2]);}")
   await old.wait_for_timeout(1200);assert await old.evaluate('shellVersion')==1
   await old.evaluate("busy=false;window.dispatchEvent(new Event('online'))")
   await old.wait_for_function('shellVersion===2',timeout=12000)
   assert await old.evaluate('slotEngineVersion')==2
   assert await busy.evaluate('shellVersion')==1 and await busy.evaluate('busy')==True
   upgraded=None
   for worker in legacy.service_workers:
    if await worker.evaluate('self.testWorkerVersion')==2:upgraded=worker
   assert upgraded is not None
   await old.close();await busy.close()
   await upgraded.evaluate('''()=>new Promise(resolve=>{
    if(!self.registration.waiting)resolve();else self.addEventListener('activate',()=>resolve(),{once:true});
   })''')
   migrated=await legacy.new_page();await migrated.goto(url);await migrated.wait_for_function('!!navigator.serviceWorker.controller')
   await legacy.set_offline(True);await migrated.reload()
   assert await migrated.evaluate('shellVersion')==2 and await migrated.evaluate('slotEngineVersion')==2
   await legacy.close()
   await browser.close()
   print('PASS real PWA: busy tabs keep old shell; idle tab safely updates; new worker waits for old clients; fresh/offline pages receive complete adventure shell, including offline iframe assets; failed engine download cannot apply a partial shell')
 finally:server.shutdown()
asyncio.run(main())
