import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const targets=['index.html','ohio.html','employment.html','housing.html','neon/seeds/0001_official_ohio_directories.sql','docs/EXECUTION_ROADMAP.md','data/ohio-counties.json'];
const legacy='ohiomeansjobs.ohio.gov';
for(const file of targets){
 assert.ok(!read(file).includes(legacy),'Legacy OhioMeansJobs URLs must not appear in public source: '+file);
}
const seed=read('neon/seeds/0001_official_ohio_directories.sql');
const matches=[...seed.matchAll(/'directory','(https:\/\/[^']+)'/g)].map(x=>x[1]);
assert.equal(matches.length,6,'Must seed 6 official reviewed resource directories');
assert.equal(new Set(matches).size,6,'Duplicate published source URLs in seed');
for(const value of matches){
 const url=new URL(value);
 assert.equal(url.protocol,'https:','Resources must use HTTPS');
 assert.ok(!url.username&&!url.password,'No credentials embedded in resource URLs');
}
const required=[
'https://jobs.ohiomeansjobs.applygovt.com/Search.aspx',
'https://cloudfront.careeronestop.org/LocalHelp/AmericanJobCenters/american-job-centers.aspx',
'https://bonds4jobs.com/our-services/get-your-bond-today',
'https://www.ohiohousinglocator.org/',
'https://www.ohiohome.org/renters.aspx',
'https://ohio211.org/how-to-find-help/'
];
for(const path of required)assert.ok(matches.includes(path),'Missing a validated employment/housing directory: '+path);
const countyData=JSON.parse(read('data/ohio-counties.json'));
assert.equal(countyData.source,required[1],'Ohio county index should refer to working center locator');
assert.match(read('ohio.html'),/JusticeImpacted\/Help\/ReEntry\/reentry-intro\.aspx/,'Justice-impact guide missing');
assert.match(read('ohio.html'),/GetInterviewReady\/your-conviction\.aspx/,'Working conviction interview guidance missing');
console.log('PASS: Six unique source-backed HTTPS directories, no legacy 404 links in public pages or seed, and reentry guidance links.');
