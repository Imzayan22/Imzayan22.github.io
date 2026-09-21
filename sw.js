/* World Dominion service worker: offline app shell + local map assets (assets/) with /cdn fallback. Bump VERSION on each release. */
const VERSION='wd-v6';
const SHELL=['/','/index.html','/manifest.json','/favicon.png','/icon_192.png','/icon_384.png','/icon_maskable_512.png'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{
  const c=await caches.open(VERSION);
  await Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})));
  try{const m=await (await fetch('/assets/manifest.json',{cache:'no-store'})).json();      // precache every local asset
    const list=(m.files||[]);for(let i=0;i<list.length;i+=20)await Promise.all(list.slice(i,i+20).map(f=>c.add('/'+f).catch(()=>{})))}catch(_){}
  await self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function cacheFirst(r,fallbackUrl){
  const hit=await caches.match(r);if(hit)return hit;
  try{let x=await fetch(r);if(!x.ok&&fallbackUrl)x=await fetch(fallbackUrl);
    if(x&&x.ok){const c=x.clone();caches.open(VERSION).then(k=>k.put(r,c))}return x}
  catch(err){if(fallbackUrl)try{return await fetch(fallbackUrl)}catch(_){}throw err}}
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin)return;
  if(u.pathname.startsWith('/sb/'))return;                       // never cache API/auth
  if(r.mode==='navigate'){                                       // page: network first, fall back to cache
    e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(VERSION).then(k=>k.put('/index.html',c));return x}).catch(()=>caches.match('/index.html')));return}
  if(u.pathname.startsWith('/assets/flags/')){const n=u.pathname.split('/').pop();e.respondWith(cacheFirst(r,'/cdn/flags/w80/'+n));return}
  if(u.pathname.startsWith('/assets/')||u.pathname.startsWith('/cdn/')||SHELL.includes(u.pathname)){e.respondWith(cacheFirst(r))}
});
