import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('data/employment-research.json', 'utf8'));
const homepage = readFileSync('index.html', 'utf8');
const directory = readFileSync('employment.html', 'utf8');
const statewide = readFileSync('ohio.html', 'utf8');
const housing = readFileSync('housing.html', 'utf8');
const housingAgencies = JSON.parse(readFileSync('data/ohio-support-agencies.json', 'utf8'));
const reentryPrograms = JSON.parse(readFileSync('data/ohio-reentry-programs.json', 'utf8'));
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
assert.match(homepage, /href="\/housing\.html"/, 'Homepage must link directly to statewide housing');
assert.match(statewide, /ohio-support-agencies\.json/, 'County navigator must load local community agencies');
assert.match(statewide, /ohio-reentry-programs\.json/, 'County navigator must load local reentry services');
assert.match(housing, /ohio-counties\.json/, 'Housing must use canonical county list');
assert.match(housing, /ohio-support-agencies\.json/, 'Housing must load real community agencies');
assert.match(housing, /ohiohousinglocator\.org/, 'Housing page must include statewide rental locator');
assert.match(housing, /cohhio\.org/, 'Housing page must include homeless support directory');
assert.match(housing, /ohio211\.org/, 'Housing page must include statewide 211');
assert.equal(Object.keys(housingAgencies.counties).length,88,'There must be one agency reference for every Ohio county');
for(const county of countyNames) {
  const agency=housingAgencies.counties[county];
  assert.ok(agency, 'Missing county community action agency for '+county);
  assert.ok(typeof agency.name==='string' && agency.name.length>3, 'Missing agency name for '+county);
  assert.match(agency.phone,/^\d{3}-\d{3}-\d{4}$/, 'Missing published agency phone for '+county);
  assert.equal(new URL(agency.website).protocol,'https:', 'Agency website link must use HTTPS');
  assert.equal(agency.source,'https://oacaa.org/find-an-agency/','Unsupported agency source for '+county);
  assert.equal(agency.availability,'program_specific_check_required','Agency capacity must not be represented as verified');
}
assert.ok(Array.isArray(reentryPrograms.records) && reentryPrograms.records.length>=6,'Expected sourced local reentry programs');
const programIds=new Set();
for(const p of reentryPrograms.records){
  assert.ok(!programIds.has(p.id),'Duplicate reentry program '+p.id);programIds.add(p.id);
  assert.ok(countyNames.includes(p.county),'Unrecognized reentry program county '+p.id);
  assert.equal(p.not_vacancy,true,'Reentry programs must not be promoted as actual job openings');
  assert.equal(p.direct_contact_verified,false,'Public sources are not direct contact verification');
  assert.equal(new URL(p.url).protocol,'https:', 'Reentry program requires HTTPS source');
}


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
for(const [name,html] of [['homepage',homepage],['employment directory',directory],['statewide navigator',statewide],['housing navigator',housing]]) {
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length>0, `${name} needs client-side logic`);
  for(const script of scripts) new Function(script[1]);
}
console.log('Statewide coverage validated: 88 Ohio counties with directory-published community agencies, documented local reentry services, four site pages and script syntax passed.');
console.log(`Employment research validated: ${data.records.length} records, ${ids.size} unique IDs, ${domains.size} source domains. No research lead is presented as an employer-confirmed vacancy.`);
