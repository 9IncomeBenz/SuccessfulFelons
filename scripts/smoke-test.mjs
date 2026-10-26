// Run with: node scripts/smoke-test.mjs [base-url]
// No credentials or user data are required.
const base = (process.argv[2] || 'https://successfulfelons.vercel.app').replace(/\/$/, '');
const checks = [
  { path: '/', validate: async r => (await r.text()).includes('SUCCESSFUL') },
  { path: '/tools.html', validate: async r => { const html = await r.text(); return html.includes('tracker-form') && html.includes('resume-form') && html.includes('backup-import'); } },
  { path: '/api/account-status', validate: async r => { const data = await r.json(); return data.accountsAvailable === false && data.localSavingAvailable === true; } },
  { path: '/api/database-status', validate: async r => { const j = await r.json(); return j.healthy === true && j.organizations_exists === true && j.opportunities_exists === true; } },
  { path: '/api/opportunities', validate: async r => Array.isArray((await r.json()).opportunities) },
  { path: '/api/opportunities?kind=invalid', expectedStatus: 400, validate: async r => Boolean((await r.json()).error) },
];
let failures = 0;
for (const check of checks) {
  const url = base + check.path;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: 'follow' });
    const ok = response.status === (check.expectedStatus || 200) && await check.validate(response);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${check.path} (HTTP ${response.status})`);
    if (!ok) failures++;
  } catch (error) {
    console.error(`FAIL ${check.path}: ${error.message}`);
    failures++;
  }
}
process.exitCode = failures ? 1 : 0;
