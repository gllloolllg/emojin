/* A complete shell is staged first and selected only when the UI can reload. */
const BASE = new URL('./', self.location.href);
const PREFIX = 'emojin-auto-' + encodeURIComponent(BASE.pathname) + '-';
const META = PREFIX + 'meta';
const CORE = ['index.html', 'app.js', 'style.css'];
const EXTRAS = ['city-background.png', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const key = name => new URL(name, BASE).href;
let installingShell, operation = Promise.resolve();
function exclusive(task) {
  const next = operation.catch(() => {}).then(task); operation = next; return next;
}
async function pointer(name, value) {
  const cache = await caches.open(META), url = key('__' + name);
  if (value !== undefined) await cache.put(url, new Response(value));
  const response = await cache.match(url); return response ? response.text() : null;
}
async function fresh(name) {
  const url = new URL(name, BASE); url.searchParams.set('_emojin_check', Date.now() + '-' + Math.random());
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url.href, {cache:'no-store', signal:controller.signal});
    if (!response.ok) throw Error('Shell unavailable: ' + name);
    return response;
  } finally { clearTimeout(timer); }
}
async function snapshot() {
  const responses = await Promise.all(CORE.map(fresh));
  const parts = await Promise.all(responses.map(r => r.clone().text()));
  const bytes = new TextEncoder().encode(JSON.stringify(parts));
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2,'0')).join('');
  return {name:PREFIX + hash, responses};
}
async function stage(shell, initial=false) {
  const target = await caches.open(shell.name);
  await Promise.all(CORE.map((file,i) => target.put(key(file),shell.responses[i].clone())));
  const oldName = await pointer('active'), old = oldName ? await caches.open(oldName) : null;
  await Promise.all(EXTRAS.map(async file => {
    let response = old && await old.match(key(file));
    if (!response) { try {response = await fresh(file);} catch(error) {if(initial)throw error;} }
    if(response)await target.put(key(file),response);
  }));
}
async function clean(active) {
  const names = await caches.keys();
  await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== META && name !== PREFIX+'sdk' && name !== active).map(name => caches.delete(name)));
}
self.addEventListener('install', event => event.waitUntil((async () => {
  const shell = await snapshot(); await stage(shell,true);
  installingShell = shell.name; await pointer('installed',shell.name); await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const name = installingShell || await pointer('installed');
  await pointer('active',name); await clean(name); await self.clients.claim();
})()));
self.addEventListener('message', event => {
  const port = event.ports[0]; if(!port)return;
  event.waitUntil(exclusive(async () => {
    try {
      const active = await pointer('active');
      if(event.data.type === 'SHELL_STATE') {port.postMessage({name:active});return;}
      if(event.data.type === 'CHECK_SHELL') {
        const shell = await snapshot();
        if(shell.name !== active)await stage(shell);
        port.postMessage({name:shell.name,changed:shell.name !== event.data.current});return;
      }
      if(event.data.type === 'APPLY_SHELL') {
        const name = event.data.name;
        if(!name || !name.startsWith(PREFIX) || name === META)throw Error('Invalid shell');
        const cache = await caches.open(name);
        for(const file of CORE)if(!await cache.match(key(file)))throw Error('Incomplete shell');
        await pointer('active',name); await clean(name);port.postMessage({ok:true});
      }
    } catch(error) {port.postMessage({error:error.message});}
  }));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if(request.method === 'GET' && url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    event.respondWith((async () => {
      const cache = await caches.open(PREFIX+'sdk'), stored = await cache.match(request);
      if(stored)return stored;
      try {const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}
      catch(error) {const previous=await caches.match(request);if(previous)return previous;throw error;}
    })());return;
  }
  if(request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname))return;
  const path = url.pathname.slice(BASE.pathname.length);
  const file = path === '' ? 'index.html' : path;
  if(CORE.includes(file) || EXTRAS.includes(file)) {
    event.respondWith((async () => {
      const active = await pointer('active');
      const cache = active && await caches.open(active);
      const cached = cache && await cache.match(key(file));
      if(cached && CORE.includes(file)) {
        const headers=new Headers(cached.headers);headers.set('Cache-Control','no-store');
        headers.delete('Content-Length');headers.delete('ETag');
        let body=await cached.text();
        if(file==='index.html')body=body.replace(/((?:src|href)=["']\.\/(?:app\.js|style\.css))(["'])/g,
          (_,path,quote)=>path+'?_emojin_shell='+encodeURIComponent(active)+quote);
        return new Response(body,{status:cached.status,statusText:cached.statusText,headers});
      }
      if(cached)return cached;
      return fetch(request,{cache:'no-store'});
    })());
  }
});
