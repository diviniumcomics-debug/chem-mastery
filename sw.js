const V='chem-mastery-v2';
const SHELL=['./','index.html','style.css','app.js','ui.js','drills.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','data/curriculum.json','data/abilities.json','data/drills.json'];
const BOOKS=['safety','cts','pchem','klein','wade','eliel','carey','kurti','zweifel','silverstein','skoog','fogler','towler'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL.concat(BOOKS.map(b=>'data/q/'+b+'.json')))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// stale-while-revalidate: instant + offline, picks up new questions on next open
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 e.respondWith(caches.open(V).then(c=>c.match(r,{ignoreSearch:true}).then(hit=>{const net=fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res}).catch(()=>hit);return hit||net})))});
