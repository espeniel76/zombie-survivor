// 한 번 받은 게임 파일을 휴대폰(브라우저)에 저장해 두는 서비스 워커.
// - 첫 화면(index.html): 인터넷이 되면 항상 새로 받는다 → 새 버전이 바로 보인다. 안 되면 저장본으로 켠다.
// - 게임 파일(assets/…): 이름에 버전 해시가 붙어 있으니 저장본이 있으면 그대로 쓴다.
// - 새 첫 화면을 받으면, 거기서 더 이상 쓰지 않는 옛 게임 파일은 지운다.
const CACHE = 'zombie-survivor-v1';

// 처음 설치될 때 첫 화면과 거기서 쓰는 게임 파일을 한꺼번에 받아 둔다(첫 방문 뒤 바로 인터넷 없이도 켜진다)
async function precache() {
  const cache = await caches.open(CACHE);
  const root = new URL('./', self.registration.scope).href;
  const res = await fetch(root, { cache: 'no-cache' });
  if (!res.ok) return;
  const html = await res.clone().text();
  await cache.put(root, res);
  const files = [...new Set([...html.matchAll(/(?:assets\/[\w.-]+|icon-\d+\.png|manifest\.webmanifest)/g)].map(m => new URL(m[0], root).href))];
  await Promise.all(files.map(async url => {
    if (await cache.match(url, { ignoreVary: true })) return;
    const r = await fetch(url);
    if (r.ok) await cache.put(url, r);
  }));
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(precache().catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function pruneAssets(html, base) {
  const used = new Set([...html.matchAll(/assets\/[\w.-]+/g)].map(m => new URL(m[0], base).href));
  const cache = await caches.open(CACHE);
  for (const req of await cache.keys()) {
    if (req.url.includes('/assets/') && !used.has(req.url)) await cache.delete(req);
  }
}

async function page(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) {
      const copy = res.clone();
      cache.put(req, res.clone());
      copy.text().then(html => pruneAssets(html, req.url)).catch(() => {});
    }
    return res;
  } catch {
    return (await cache.match(req, { ignoreSearch: true, ignoreVary: true })) || (await cache.match(new URL('./', self.registration.scope).href)) || Response.error();
  }
}

async function asset(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function other(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreVary: true });
  const fresh = fetch(req)
    .then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fresh;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') e.respondWith(page(req));
  else if (req.url.includes('/assets/')) e.respondWith(asset(req));
  else e.respondWith(other(req));
});
