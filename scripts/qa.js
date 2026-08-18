// temp QA: exercise the running servers over HTTP
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const FE = 'http://localhost:3000';
const BE = 'http://localhost:3001';

const pages = fs.readdirSync(path.join(ROOT, 'frontend', 'public'))
  .filter((f) => f.endsWith('.html'));

function get(url, opts) {
  return fetch(url, opts).then(async (res) => {
    const text = await res.text();
    let body = text;
    try { body = JSON.parse(text); } catch (_e) { /* keep as text */ }
    return { status: res.status, type: res.headers.get('content-type') || '', body };
  }).catch((e) => ({ status: 0, error: e.message }));
}

(async () => {
  let failures = 0;

  // 1. Root serves index.html
  console.log('=== Frontend ===');
  const rootRes = await fetch(FE + '/');
  const rootOk = rootRes.status === 200;
  console.log(`GET /  -> ${rootRes.status} ${rootOk ? 'OK' : 'FAIL'}`);
  if (!rootOk) failures++;

  // 2. For every page, fetch it + every local asset over HTTP
  for (const page of pages) {
    const url = `${FE}/public/${page}`;
    const { status, body } = await get(url);
    if (status !== 200) { failures++; console.log(`PAGE [${page}] -> ${status}`); continue; }
    const refs = [...body.matchAll(/(?:src|href)=['"]([^'"]+)['"]/g)]
      .map((m) => m[1])
      .filter((h) => !/^(https?:)?\/\//.test(h) && !/^(data:|#)/.test(h));
    const missing = [];
    for (const ref of refs) {
      const assetUrl = new URL(ref, `${FE}/public/`).toString();
      const a = await get(assetUrl);
      if (a.status !== 200) missing.push(`${ref} (${a.status})`);
    }
    if (missing.length) {
      failures++;
      console.log(`PAGE [${page}] MISSING ASSETS: ${missing.join(', ')}`);
    } else {
      console.log(`PAGE [${page}] -> 200, ${refs.length} assets OK`);
    }
  }

  // 3. Backend end-to-end
  console.log('\n=== Backend ===');
  const h = await get(`${BE}/api/health`);
  if (h.status !== 200 || h.body.status !== 'ok') { failures++; console.log('health FAIL'); }
  else console.log(`GET /api/health -> ${h.status} ("${h.body.status}")`);

  await get(`${BE}/api/auth/signup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qa@omni.ai', password: 'QAPassword123', name: 'QA Bot' })
  });
  const login = await get(`${BE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qa@omni.ai', password: 'QAPassword123' })
  });
  const tok = login.body && login.body.token;
  console.log(`POST /api/auth/login -> ${login.status} token=${!!tok}`);
  if (login.status !== 200 || !tok) failures++;

  const unauth = await get(`${BE}/api/autopilot/campaigns`);
  if (unauth.status !== 401) { failures++; console.log('autopilot no-token should 401'); }
  else console.log(`GET /api/autopilot/campaigns (no token) -> 401 OK`);

  const auth = await get(`${BE}/api/autopilot/campaigns`, {
    headers: { Authorization: `Bearer ${tok}` }
  });
  if (auth.status !== 200) { failures++; console.log('autopilot authed FAIL'); }
  else console.log(`GET /api/autopilot/campaigns (auth) -> 200 (${auth.body.campaigns.length} campaigns)`);

  const pay = await get(`${BE}/api/checkout`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body: JSON.stringify({ cardNumber: '4242 4242 4242 4242', expMonth: 12, expYear: 2030, amount: 149, currency: 'USD', email: 'qa@omni.ai' })
  });
  if (pay.status !== 200 || pay.body.status !== 'succeeded') { failures++; console.log('checkout FAIL'); }
  else console.log(`POST /api/checkout -> ${pay.status} order=${pay.body.orderId}`);

  const scan = await get(`${BE}/api/scan`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://demo.test/p/x' })
  });
  if (scan.status !== 200) { failures++; console.log('scan FAIL'); }
  else console.log(`POST /api/scan -> ${scan.status} (${scan.body.recommended_hooks.length} hooks)`);

  console.log(failures ? `\n✗ ${failures} FAILURES` : '\n✅ ALL QA CHECKS PASSED');
  process.exit(failures ? 1 : 0);
})();