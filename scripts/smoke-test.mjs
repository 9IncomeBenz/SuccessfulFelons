// Run with: node scripts/smoke-test.mjs [base-url]
// No credentials or user data are required.
const base = (process.argv[2] || 'https://successfulfelons.vercel.app').replace(/\/$/, '');
const checks = [
  { path: '/', validate: async r => (await r.text()).includes('SUCCESSFUL') },
  { path: '/tools.html', validate: async r => { const html = await r.text(); return html.includes('tracker-form') && html.includes('resume-form') && html.includes('backup-import'); } },
  { path: '/api/account-status', validate: async r => { const data = await r.json(); return data.accountsAvailable === true && data.onlineSyncAvailable === true && data.localSavingAvailable === true; } },
  { path: '/api/database-status', validate: async r => { const j = await r.json(); return j.healthy === true && j.organizations_exists === true && j.opportunities_exists === true; } },
  { path: '/api/opportunities', validate: async r => { const d=await r.json();return Array.isArray(d.opportunities)&&d.opportunities.some(x=>x.listing_type==='directory'); } },
  { path: '/opportunities.html', validate: async r => (await r.text()).includes('id="finder"') },
  { path: '/tracker.html', validate: async r => {const t=await r.text();return t.includes('id="application-form"')&&t.includes('id="application-list"');} },
  { path: '/api/opportunities?kind=employment&listing_type=directory', validate: async r => {const d=await r.json();return Array.isArray(d.opportunities)&&d.opportunities.every(x=>x.kind==='employment'&&x.listing_type==='directory');} },
  { path: '/api/opportunities?kind=invalid', expectedStatus: 400, validate: async r => Boolean((await r.json()).error) },
  { path: '/api/opportunity-submissions', method: 'POST', expectedStatus: 401, body: {}, validate: async r => Boolean((await r.json()).error) },
  { path: '/api/opportunity-reports', method: 'POST', expectedStatus: 401, body: {}, validate: async r => Boolean((await r.json()).error) },
  { path: '/api/admin/opportunities', expectedStatus: 401, validate: async r => Boolean((await r.json()).error) },
  { path: '/api/account/preferences', expectedStatus: 401, validate: async r => Boolean((await r.json()).error) },
  { path: '/api/account/applications', expectedStatus: 401, validate: async r => Boolean((await r.json()).error) },
  { path: '/api/account/applications', method:'POST', body:{}, expectedStatus: 401, validate: async r => Boolean((await r.json()).error) },
];
let failures = 0;
for (const check of checks) {
  const url = base + check.path;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: 'follow', method: check.method || 'GET', ...(check.body ? {headers:{'Content-Type':'application/json'},body:JSON.stringify(check.body)} : {}) });
    const ok = response.status === (check.expectedStatus || 200) && await check.validate(response);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${check.path} (HTTP ${response.status})`);
    if (!ok) failures++;
  } catch (error) {
    console.error(`FAIL ${check.path}: ${error.message}`);
    failures++;
  }
}
process.exitCode = failures ? 1 : 0;
