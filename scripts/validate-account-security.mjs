import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function source(path) {
  return readFileSync(path, 'utf8').replace(/^import .*;?\s*$/gm, '').replace(/export (default )?/g, '');
}
for (const file of ['api/_lib/auth.js','api/_lib/account-active.js','api/account/saved.js','api/account/clear.js','api/account-status.js']) {
  assert.doesNotThrow(() => new Function(source(file)), 'Invalid JS syntax in ' + file);
}
const authSource = source('api/_lib/auth.js');
const env = {DATABASE_URL:'postgresql://test.invalid/database',NEON_AUTH_BASE_URL:'https://auth.example.com/neondb/auth',ACCOUNT_REGISTRATION_ENABLED:'true'};
let verifyCalls=0;
const authFactory = new Function('createRemoteJWKSet','jwtVerify','URL','process',
  authSource + '; return { requireAuthUser, accountBackendConfigured };');
const auth = authFactory(() => ({}), async (jwt, keys, opts) => {
  verifyCalls++;
  assert.equal(opts.issuer,'https://auth.example.com');
  assert.deepEqual(opts.algorithms,['EdDSA']);
  if (jwt==='bad') throw Error('Invalid signature');
  return {payload:{sub:'user-one'}};
},URL,{env});
async function testAuth(){
  await assert.rejects(() => auth.requireAuthUser({headers:{}}), e => e.statusCode===401);
  const got = await auth.requireAuthUser({headers:{authorization:'Bearer '+'A'.repeat(30)}});
  assert.equal(got,'user-one');
  assert.equal(verifyCalls,1);
  const invalid = authFactory(()=>({}),async()=>({payload:{sub:'user!forged'}}),URL,{env});
  await assert.rejects(()=>invalid.requireAuthUser({headers:{authorization:'Bearer '+'A'.repeat(30)}}),e=>e.statusCode===401);
}
async function testAccountAPI(){
  const seen = [];
  function neon(){
    return async (strings,...params)=>{
      const query=strings.join('?');
      seen.push({query,params});
      if(/COUNT\(\*\)/i.test(query))return [{total:0,already_saved:false}];
      if(/INSERT INTO/i.test(query))return [{id:'saved-test',title:'Warehouse role',organization:'Test',url:'https://example.org/apply'}];
      if(/DELETE FROM/i.test(query))return [{lead_id:'saved-test'}];
      return [{id:'saved-test',title:'Warehouse role',organization:'Test',url:'https://example.org/apply'}];
    };
  }
  const handler = new Function('neon','authHeaders','requireAuthUser','requireLiveAccount','URL','process',
    source('api/account/saved.js')+';return handler;')(
      neon,
      res=>{res.setHeader('Cache-Control','no-store');},
      async ()=> 'trusted-user-from-token', async (_,owner)=>owner, URL, {env}
    );
  const send = async (method,body)=>{
    const res={headers:{},statusCode:200,
      setHeader(k,v){this.headers[k]=v},
      status(n){this.statusCode=n;return this},
      json(v){this.body=v;return this}
    };
    await handler({method,body,headers:{authorization:'Bearer valid'}},res);
    return res;
  };
  let response=await send('GET');
  assert.equal(response.statusCode,200);
  assert.equal(response.body.leads.length,1);
  response=await send('PUT',{owner_user_id:'forged',item:{id:'saved-test',title:'Warehouse role',organization:'Test',url:'https://example.org/apply'}});
  assert.equal(response.statusCode,200);
  assert.ok(seen.every(row=>!row.params.includes('forged')),'Client-supplied owner must be ignored');
  assert.ok(seen.some(row=>row.params.includes('trusted-user-from-token')),'Owner must come from verified JWT');
  const bad = await send('PUT',{item:{id:'x',title:'test',url:'javascript:alert(1)'}});
  assert.equal(bad.statusCode,400,'Unsafe URLs must fail');
  const deleted = await send('DELETE',{id:'saved-test'});
  assert.equal(deleted.statusCode,200);
  assert.ok(seen.some(row=>/WHERE owner_user_id/.test(row.query) && row.params.includes('trusted-user-from-token')),
    'Private database reads and writes must be explicitly owner-scoped');
  const blockedHandler=new Function('neon','authHeaders','requireAuthUser','requireLiveAccount','URL','process',
    source('api/account/saved.js')+';return handler;')(
      ()=>{throw Error('Database should never be accessed')},
      ()=>{},
      async ()=>{throw Object.assign(Error('Unauthenticated'),{statusCode:401})}, async()=>{throw Error('Should never check live user')}, URL, {env});
  const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this},json(x){this.body=x;return this}};
  await blockedHandler({method:'GET',headers:{}},res);
  assert.equal(res.statusCode,401);
  const gateOff={env:{...env,ACCOUNT_REGISTRATION_ENABLED:'false'}};
  const closedHandler=new Function('neon','authHeaders','requireAuthUser','requireLiveAccount','URL','process',
    source('api/account/saved.js')+';return handler;')(
      ()=>{throw Error('Do not touch database with registration disabled')},
      ()=>{},async()=>{throw Error('Do not authenticate with registration disabled')},async()=>{throw Error('Do not inspect identity with registration disabled')},URL,gateOff);
  const closedRes={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this},json(x){this.body=x;return this}};
  await closedHandler({method:'GET',headers:{}},closedRes);
  assert.equal(closedRes.statusCode,503,'Account API must stay closed when launch flag is off');
  assert.match(readFileSync('migrations/002_private_saved_leads.sql','utf8'),/REVOKE ALL ON SCHEMA sf_private FROM PUBLIC/);
  assert.match(readFileSync('api/account-status.js','utf8'),/accountsAvailable:\s*enabled/);
  assert.match(readFileSync('api/account-status.js','utf8'),/ACCOUNT_REGISTRATION_ENABLED==='true'/,'Registration must be gated until enabled');
  assert.match(readFileSync('api/account/clear.js','utf8'),/DELETE CLOUD SAVES/,'Cloud deletion requires explicit confirmation');
  console.log('PASS: JWT required, invalid inputs rejected, owner-scoped SQL, no public account launch.');
}
await testAuth();
await testAccountAPI();
async function testLiveIdentity(){
 const factory=new Function(source('api/_lib/account-active.js')+';return requireLiveAccount;');
 const live=factory();
 const goodId='11111111-1111-4111-8111-111111111111';
 assert.equal(await live(async()=>[{active:true}],goodId),goodId,'Verified active user can access private saves');
 await assert.rejects(()=>live(async()=>[{active:false}],goodId),e=>e.statusCode===401);
 await assert.rejects(()=>live(async()=>[{active:true}],'fake-identifier'),e=>e.statusCode===401);
 await assert.rejects(()=>live(async()=>{throw Error('Database down')},goodId),e=>e.statusCode===503);
}
await testLiveIdentity();
async function testCloudClear() {
  const sqlCalls=[];
  const fakeSQL=async(strings,...params)=>{sqlCalls.push({query:strings.join('?'),params});return [{lead_id:'a'}]};
  const factory=new Function('neon','authHeaders','requireAuthUser','requireLiveAccount','process',
    source('api/account/clear.js')+';return handler;');
  const valid=factory(()=>fakeSQL,()=>{},async()=> 'trusted-uuid',async()=>true,{env});
  const invoke=async(handler,body)=>{
    const res={code:200,setHeader(){},status(n){this.code=n;return this},json(data){this.body=data;return this}};
    await handler({method:'POST',body,headers:{authorization:'Bearer x'}},res);
    return res;
  };
  assert.equal((await invoke(valid,{confirmation:'wrong'})).code,400,'Cloud clear requires exact confirmation');
  const ok=await invoke(valid,{confirmation:'DELETE CLOUD SAVES'});
  assert.equal(ok.code,200);
  assert.ok(sqlCalls.some(x=>/DELETE FROM sf_private.saved_leads/.test(x.query) && x.params.includes('trusted-uuid')),
    'Cloud deletion may only use verified JWT owner');
  const denied=factory(()=>{throw Error('DB must not be called')},()=>{},async()=>{throw Object.assign(Error('No token'),{statusCode:401})},async()=>{throw Error('Must not check user')},{env});
  assert.equal((await invoke(denied,{confirmation:'DELETE CLOUD SAVES'})).code,401);
  const closed=factory(()=>{throw Error('No database access while disabled')},()=>{},
    async()=>{throw Error('No authentication while disabled')},async()=>{throw Error('No identity query while disabled')},
    {env:{...env,ACCOUNT_REGISTRATION_ENABLED:'false'}});
  assert.equal((await invoke(closed,{confirmation:'DELETE CLOUD SAVES'})).code,503,
    'Cloud delete must stay closed when account launch flag is off');
}
await testCloudClear();
assert.match(readFileSync('src/cloud-auto-sync.js','utf8'),/localStorage.getItem\(prefix\+owner\)!=='yes'/,'Cloud uploads must require consent for the active user');
assert.match(readFileSync('src/account-page.js','utf8'),/confirm\('Allow this browser to upload/,'Existing local leads must require explicit upload confirmation');
assert.match(readFileSync('account.html','utf8'),/id="delete-password" type="password"/,'Account deletion password must be masked');

