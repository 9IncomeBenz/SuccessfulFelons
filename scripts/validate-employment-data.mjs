import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('data/employment-research.json', 'utf8'));
const homepage = readFileSync('index.html', 'utf8');
const directory = readFileSync('employment.html', 'utf8');
const statewide = readFileSync('ohio.html', 'utf8');
const counties = JSON.parse(readFileSync('data/ohio-counties.json', 'utf8'));
assert.equal(counties.counties.length,88,'Ohio coverage must include all 88 counties');
const countyNames = counties.counties.map(c=>c.name);
assert.equal(new Set(countyNames).size,88,'Ohio county names must be unique');
assert.ok(countyNames.every(name=>typeof name==='string' && name.length>2),'Invalid Ohio county name');
assert.ok(countyNames.every((name,index)=>index===0||countyNames[index-1].localeCompare(name)<=0),'Ohio counties must be sorted');
assert.match(statewide, /ohio-counties\.json/, 'Statewide navigator must load county index');
assert.match(statewide, /employment-research\.json/, 'Statewide navigator must use shared employer research');
assert.match(statewide, /ohiohousinglocator\.org/, 'Statewide housing resource missing');
assert.match(statewide, /ohio211\.org/, 'Statewide 211 resource missing');
assert.match(statewide, /ohiomeansjobs\.ohio\.gov/, 'Statewide employment resource missing');
assert.match(homepage, /href="\/ohio\.html"/, 'Homepage needs Ohio statewide navigation');
assert.match(directory, /id="county"/, 'Employer directory needs county selector');

assert.equal(data.schema_version, 1, 'Unexpected data schema version');
assert.ok(Array.isArray(data.records) && data.records.length > 0, 'No research records');
assert.match(homepage, /fetch\('\/data\/employment-research\.json'/, 'Main search must use shared research data');
assert.match(directory, /fetch\('\/data\/employment-research\.json'/, 'Directory must use shared research data');
assert.match(homepage, /item\.opening_status==='not_employer_confirmed'/, 'Main search must exclude archived and unavailable jobs');
assert.match(directory, /id="availability"/, 'Directory must offer historical status filter');
assert.match(homepage, /employer has not confirmed the vacancy/i, 'Main search must disclose lack of employer confirmation');

const ids = new Set();
const kinds = new Set(['program', 'posting', 'timed', 'case']);
const statuses = new Set(['not_employer_confirmed', 'expired_listing', 'source_unavailable']);
const domains = new Set();

for (const item of data.records) {
  for (const field of ['id', 'employer', 'role', 'area', 'source', 'rule', 'detail', 'reviewed_on', 'date']) {
    assert.ok(typeof item[field] === 'string' && item[field].trim(), `${item.id || 'unknown'}: missing ${field}`);
  }
  assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid stable ID');
  assert.ok(!ids.has(item.id), `Duplicate employer research ID: ${item.id}`);
  ids.add(item.id);
  assert.ok(kinds.has(item.kind), `Invalid category for ${item.id}`);
  assert.ok(item.county === null || countyNames.includes(item.county), `Unknown county: ${item.id}`);
  assert.equal(item.employer_directly_confirmed,false, `Unverified employer cannot be marked contacted/confirmed: ${item.id}`);
  assert.equal(item.last_employer_verified_at,null, `Research item incorrectly marked verified by employer: ${item.id}`);
  assert.ok(statuses.has(item.opening_status), `Invalid job status for ${item.id}`);
  assert.equal(item.is_verified_vacancy, false, `Research incorrectly labeled verified vacancy: ${item.id}`);
  assert.match(item.reviewed_on, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Number.isFinite(Date.parse(item.reviewed_on)), 'Invalid review date');
  const url = new URL(item.source);
  assert.equal(url.protocol, 'https:', 'Only HTTPS source links allowed');
  domains.add(url.hostname);
  if (item.kind === 'timed') {
    assert.ok(Number.isInteger(item.years) && item.years > 0, `Invalid waiting period: ${item.id}`);
    assert.match(item.rule, new RegExp(String(item.years)), `Year restriction not in policy: ${item.id}`);
    assert.equal(item.screening_scope, 'position_or_assignment', 'Waiting period must be position-scoped');
  } else {
    assert.equal(item.years, undefined, 'Do not invent a numeric cutoff where none is documented');
  }
  if (item.opening_status !== 'not_employer_confirmed') {
    assert.ok(typeof item.status_note === 'string' && item.status_note.length > 10, 'Archive status needs explanation');
  }
}
for(const [name,html] of [['homepage',homepage],['employment directory',directory],['statewide navigator',statewide]]) {
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length>0, `${name} needs client-side logic`);
  for(const script of scripts) new Function(script[1]);
}
console.log('Statewide coverage validated: 88 unique Ohio counties; source links, three pages and filtering syntax passed.');
console.log(`Employment research validated: ${data.records.length} records, ${ids.size} unique IDs, ${domains.size} source domains. No research lead is presented as an employer-confirmed vacancy.`);
