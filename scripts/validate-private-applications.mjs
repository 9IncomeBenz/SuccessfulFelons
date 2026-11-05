import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(path,'utf8').replace(/^import .*;?\s*$/gm,'').replace(/export (default )?/g,'');
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
let index=0;
const records=new Map();
const sql=async(strings,...params)=>{
 const query=strings.join('?');
 if(query.includes('SELECT id,kind,title,organization,source_url,stage,next_step,follow_up_on')&&query.includes('FROM sf_private.member_applications')){
  return [...records.values()].filter(x=>x.owner===params[0]).map(({owner,...r})=>({...r}));
 }
 if(query.includes('INSERT INTO sf_private.member_applications')){
  const [owner,kind,title,organization,source_url,stage,next_step,follow_up_on]=params;
  const id=String(++index).padStart(8,'0')+'-4444-4444-8444-444444444444';
  const item={id,owner,kind,title,organization,source_url,stage,next_step,follow_up_on};
  records.set(id,item);
  const {owner:_,...out}=item;return [out];
 }
 if(query.includes('UPDATE sf_private.member_applications')){
  const [kind,title,organization,source_url,stage,next_step,follow_up_on,id,owner]=params;
  const item=records.get(id);if(!item||item.owner!==owner)return [];
  Object.assign(item,{kind,title,organization,source_url,stage,next_step,follow_up_on});
  const {owner:_,...out}=item;return [out];
 }
 if(query.includes('DELETE FROM sf_private.member_applications WHERE id=')){
  const [id,owner]=params,item=records.get(id);
  if(!item||item.owner!==owner)return [];
  records.delete(id);return [{id}];
 }
 if(query.includes('WITH saves AS')&&query.includes('DELETE FROM sf_private.member_applications')){
  const owner=params[0];let count=0;
  for(const [id,item] of records)if(item.owner===owner){records.delete(id);count++}
  return [{deleted_saves:0,deleted_applications:count,deleted_preferences:0,deleted_submissions:0,deleted_reports:0}];
 }
 throw Error('Unexpected SQL: '+query.slice(0,120));
};
const neon=()=>sql;
const authHeaders=r=>r.setHeader('Cache-Control','no-store, private');
const requireAuthUser=async req=>{
 const value=req.headers?.authorization;
 if(value==='Bearer account-a')return A;
 if(value==='Bearer account-b')return B;
 throw Object.assign(Error('Unauthorized'),{statusCode:401});
};
const requireLiveAccount=async(_sql,owner)=>owner;
const env={DATABASE_URL:'postgresql://qa.invalid/qa',ACCOUNT_REGISTRATION_ENABLED:'true'};
function create(path,envValue=env){
 return new Function('neon','authHeaders','requireAuthUser','requireLiveAccount','process',
   source(path)+';return handler;')(neon,authHeaders,requireAuthUser,requireLiveAccount,{env:envValue});
}
const tracker=create('api/account/applications.js');
const erasure=create('api/account/erase-data.js');
async function call(handler,who,method,body){
 const req={method,body,headers:{authorization:who==='A'?'Bearer account-a':who==='B'?'Bearer account-b':''}};
 const res={statusCode:200,headers:{},setHeader(key,value){this.headers[key]=value;return this},status(code){this.statusCode=code;return this},json(data){this.body=data;return this}};
 await handler(req,res);return res;
}
const details={kind:'housing',title:'Synthetic Housing Lead',organization:'Example Housing',source_url:'https://example.com/housing',stage:'Interested',next_step:'Call provider',follow_up_on:'2026-11-15'};
let response=await call(tracker,'A','POST',details);
assert.equal(response.statusCode,201,'A creates tracked item');
const aId=response.body.application.id;
assert.equal((await call(tracker,'A','GET')).body.applications.length,1);
assert.equal((await call(tracker,'B','GET')).body.applications.length,0,'B cannot read A records');
response=await call(tracker,'B','PUT',{...details,id:aId,title:'B overwrites A'});
assert.equal(response.statusCode,404,'B cannot edit A records');
response=await call(tracker,'B','DELETE',{id:aId});
assert.equal(response.body.deleted,false,'B cannot delete A records');
assert.equal((await call(tracker,'A','GET')).body.applications[0].title,details.title);
response=await call(tracker,'B','POST',{...details,title:'B owns separate housing lead'});
assert.equal(response.statusCode,201);
const bId=response.body.application.id;
response=await call(tracker,'A','PUT',{...details,id:aId,stage:'Applied'});
assert.equal(response.statusCode,200);
assert.equal((await call(tracker,'A','GET')).body.applications[0].stage,'Applied');
assert.equal((await call(tracker,'B','GET')).body.applications[0].id,bId);
response=await call(tracker,'A','POST',{...details,source_url:'javascript:alert(1)'});
assert.equal(response.statusCode,400,'Unsafe source URL denied');
assert.equal((await call(tracker,null,'GET')).statusCode,401,'Anonymous reads denied');
assert.equal((await call(tracker,null,'POST',details)).statusCode,401,'Anonymous writes denied');
assert.equal((await call(erasure,'B','POST',{})).statusCode,400,'Erasure needs exact user confirmation');
response=await call(erasure,'B','POST',{confirmation:'DELETE MY ACCOUNT'});
assert.equal(response.statusCode,200);
assert.equal(response.body.counts.deleted_applications,1,'B erased only B records');
assert.equal((await call(tracker,'A','GET')).body.applications.length,1,'B erasure left A intact');
assert.equal((await call(tracker,'B','GET')).body.applications.length,0);
assert.equal((await call(tracker,'A','DELETE',{id:aId})).body.deleted,true,'A can delete own entry');
const closed=create('api/account/applications.js',{...env,ACCOUNT_REGISTRATION_ENABLED:'false'});
assert.equal((await call(closed,'A','GET')).statusCode,503,'Closed account gate blocks access');
console.log('PASS: Private application create/update/delete, two-owner isolation, invalid source rejection, explicit erasure, anonymous denial and launch gate.');
