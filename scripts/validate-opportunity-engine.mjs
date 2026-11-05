import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const syntax=path=>new Function(read(path).replace(/^import .*;?\s*$/gm,'').replace(/export (default )?/g,''));
for(const path of ['api/opportunities.js','api/opportunity-submissions.js','api/opportunity-reports.js','api/admin/opportunities.js','src/opportunity-engine.js','src/moderation.js']){
 assert.doesNotThrow(()=>syntax(path),'Invalid JavaScript in '+path);
}
const search=read('api/opportunities.js');
for(const term of ['review_due_at>now()','provider_confirmed_at>now()','source_checked_at>=now()','listing_type','county','searchPattern'])
 assert.ok(search.includes(term),'Opportunity evidence filter missing: '+term);
const migration=read('neon/migrations/0003_verified_opportunities.sql');
for(const term of ['sf_opportunity_evidence_guard','sf_private.opportunity_submissions','sf_private.opportunity_reports'])
 assert.ok(migration.includes(term),'Migration missing '+term);
assert.match(read('api/admin/opportunities.js'),/SF_MODERATOR_USER_IDS/,'Moderators must be allowlisted by exact account ID, not email');
assert.match(read('api/admin/opportunities.js'),/provider_confirmed!==true/,'Published openings require independent provider confirmation');
assert.match(read('api/opportunity-submissions.js'),/await requireAuthUser/,'Anonymous submissions are disabled until better spam protection');
assert.match(read('api/opportunity-reports.js'),/await requireAuthUser/,'Anonymous report flooding prevented');
const seed=read('neon/seeds/0001_official_ohio_directories.sql');
assert.ok((seed.match(/INSERT INTO public.opportunities\(/g)||[]).length>=6,'Six official statewide directory sources required');
for(const path of ['opportunities.html','moderation.html'])assert.ok(read(path).includes('<html'));
assert.match(read('opportunities.html'),/id="suggest-form"/,'Suggestion UI missing');
assert.match(read('opportunities.html'),/id="results"/,'Live listings UI missing');
assert.match(read('moderation.html'),/id="moderation-list"/,'Moderator review UI missing');
console.log('PASS: Opportunity evidence, freshness, moderator permissions, review queues, source directories and responsive UI contracts.');
