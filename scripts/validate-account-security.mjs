import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function source(path) {
  return readFileSync(path, 'utf8').replace(/^import .*;?\s*$/gm, '').replace(/export (default )?/g, '');
}
for (const file of ['api/_lib/auth.js','api/account/saved.js','api/account-status.js']) {
  assert.doesNotThrow(() => new Function(source(file)), 'Invalid JS syntax in ' + file);
}
const authSource = source('api/_lib/auth.js');
const env = {DATABASE_URL:'postgresql://test.invalid/database',NEON_AUTH_BASE_URL:'https://auth.example.com/neondb/auth'};
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
  const handler = new Function('neon','authHeaders','requireAuthUser',
    source('api/account/saved.js')+';return handler;')(
      neon,
      res=>{res.setHeader('Cache-Control','no-store');},
      async ()=> 'trusted-user-from-token'
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
  const blockedHandler=new Function('neon','authHeaders','requireAuthUser',
    source('api/account/saved.js')+';return handler;')(
      ()=>{throw Error('Database should never be accessed')},
      ()=>{},
      async ()=>{throw Object.assign(Error('Unauthenticated'),{statusCode:401})});
  const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this},json(x){this.body=x;return this}};
  await blockedHandler({method:'GET',headers:{}},res);
  assert.equal(res.statusCode,401);
  assert.match(readFileSync('migrations/002_private_saved_leads.sql','utf8'),/REVOKE ALL ON SCHEMA sf_private FROM PUBLIC/);
  assert.match(readFileSync('api/account-status.js','utf8'),/accountsAvailable:\s*false/);
  console.log('PASS: JWT required, invalid inputs rejected, owner-scoped SQL, no public account launch.');
}
await testAuth();
await testAccountAPI();
