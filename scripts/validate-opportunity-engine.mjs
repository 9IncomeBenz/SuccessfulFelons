import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const syntax=path=>new Function(read(path).replace(/^import .*;?\s*$/gm,'').replace(/export (default )?/g,''));
for(const path of ['api/opportunities.js','api/opportunity-submissions.js','api/opportunity-reports.js','api/admin/opportunities.js','api/account/preferences.js','api/account/applications.js','api/account/erase-data.js','src/opportunity-engine.js','src/moderation.js','src/application-tracker.js','src/account-sync.js']){
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
assert.match(read('account.html'),/id="pref-form"/,'Member preferences form missing');
assert.match(read('src/account-page.js'),/preferencesRequest\('PUT'/,'Preferences must save through authenticated account');
assert.match(read('api/account/preferences.js'),/await requireAuthUser/,'Preferences require verified member session');
assert.match(read('neon/migrations/0005_member_preferences.sql'),/sf_private\.member_preferences/);

const tracking=read('api/account/applications.js');
assert.match(tracking,/await requireAuthUser\(req\)/,'Application records require verified token');
assert.match(tracking,/await requireLiveAccount\(sql,owner\)/,'Inactive accounts must be denied');
assert.match(tracking,/WHERE owner_user_id=\$\{owner\}/,'Reading applications must use token-derived owner ID');
assert.match(tracking,/WHERE id=\$\{id\}::uuid AND owner_user_id=\$\{owner\}/,'Writes and deletions must scope to authenticated owner');
assert.match(read('neon/migrations/0006_member_applications.sql'),/enforce_member_applications_quota/,'Per-account 100 record quota required');
assert.match(read('neon/migrations/0006_member_applications.sql'),/REVOKE ALL ON TABLE sf_private\.member_applications FROM PUBLIC/,'Application rows must be private');
assert.match(read('tracker.html'),/id="application-form"/,'Cloud tracker form missing');
assert.match(read('tracker.html'),/id="application-list"/,'Cloud tracker list missing');
assert.match(read('src/opportunity-engine.js'),/Track application/,'Reviewed listings must link to application tracker');
const erasure=read('api/account/erase-data.js');
assert.match(erasure,/await requireAuthUser\(req\)/,'Account erasure requires signed identity');
assert.match(erasure,/await requireLiveAccount\(sql,owner\)/,'Account erasure rejects deleted identities');
for(const relation of ['saved_leads','member_applications','member_preferences','opportunity_submissions','opportunity_reports']){
 assert.ok(erasure.includes('sf_private.'+relation+' WHERE owner_user_id='),'Erasure must scope '+relation+' to its account owner');
}
assert.match(erasure,/DELETE MY ACCOUNT/,'Data erasure requires explicit confirmation');
const accountFlow=read('src/account-page.js');
assert.ok(accountFlow.includes('client.listApplications()'),'Deletion flow must back up application records');
assert.ok(accountFlow.indexOf('client.eraseAccountData()')<accountFlow.indexOf('client.auth.deleteUser({password})'),
 'Private data must be erased before identity removal');
console.log('PASS: Opportunity evidence, freshness, moderator permissions, review queues, source directories and responsive UI contracts.');
