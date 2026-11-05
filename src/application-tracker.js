import {createSuccessfulFelonsAccountClient} from './account-sync.js';

const el=id=>document.getElementById(id);
const append=(parent,tag,value)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value);parent.append(n);return n};
let client=null,applications=[];
const datePart=d=>typeof d==='string'?d.slice(0,10):'';
function todayLocal(){
 const d=new Date(),yy=d.getFullYear(),mm=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');
 return yy+'-'+mm+'-'+dd;
}
function readableDate(d){
 const p=datePart(d);
 if(!p)return '';
 const val=new Date(p+'T12:00:00');
 return Number.isFinite(val.valueOf())?val.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):p;
}
function validLink(raw){
 try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}
}
async function request(method,details){
 if(!client)throw Error('Sign in to use your private tracker.');
 const token=await client.auth.token();
 if(token?.error||!token?.data?.token)throw Error('Session expired. Sign in again.');
 const response=await fetch('/api/account/applications',{
  method,credentials:'same-origin',cache:'no-store',
  headers:{Authorization:'Bearer '+token.data.token,...(details?{'Content-Type':'application/json'}:{})},
  body:details?JSON.stringify(details):undefined
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Tracker temporarily unavailable.');
 return data;
}
function edit(item){
 for(const [name,value] of Object.entries({
  id:item.id,kind:item.kind,title:item.title,organization:item.organization||'',source_url:item.source_url||'',
  stage:item.stage,next_step:item.next_step||'',follow_up_on:datePart(item.follow_up_on)
 })){
  const control=el('application-form').elements.namedItem(name);if(control)control.value=value??'';
 }
 el('cancel-edit').hidden=false;
 el('editor-title').textContent='Update an application';
 el('save-application').textContent='Update application';
 el('editor-status').textContent='Editing '+item.title;
 el('tracker-workspace').scrollIntoView({behavior:'smooth',block:'start'});
 el('entry-title').focus({preventScroll:true});
}
function resetEditor(){
 el('application-form').reset();
 el('entry-id').value='';
 el('cancel-edit').hidden=true;
 el('editor-title').textContent='Track a job or housing opportunity';
 el('save-application').textContent='Save to my account';
}
async function erase(item){
 if(!confirm('Delete this tracked application from your private cloud account? This does not remove local saved leads.'))return;
 el('list-status').textContent='Deleting selected application…';
 try{
  await request('DELETE',{id:item.id});
  await refresh();
  el('list-status').textContent='The application was deleted from your account.';
 }catch(e){el('list-status').textContent='Deletion failed: '+e.message}
}
function draw(){
 const list=el('application-list');list.replaceChildren();
 const chosen=el('filter-kind').value;
 const filtered=chosen?applications.filter(x=>x.kind===chosen):applications;
 el('list-status').textContent=filtered.length+' application'+(filtered.length===1?'':'s')+' shown of '+applications.length+' saved.';
 el('total-count').textContent=applications.length;
 el('applied-count').textContent=applications.filter(x=>x.stage==='Applied'||x.stage==='Interview'||x.stage==='Offer').length;
 el('housing-count').textContent=applications.filter(x=>x.kind==='housing').length;
 const now=todayLocal();
 el('follow-up-count').textContent=applications.filter(x=>datePart(x.follow_up_on)&&datePart(x.follow_up_on)<=now&&x.stage!=='Closed').length;
 if(!filtered.length){
  const p=append(list,'p','No applications match this filter yet. Use the form above or the Opportunity Finder to add one.');
  p.className='muted';return;
 }
 for(const item of filtered){
  const card=append(list,'article');card.className='record';
  append(card,'h3',item.title);
  append(card,'p',(item.kind==='housing'?'Housing':'Employment')+' · '+item.stage);
  if(item.organization)append(card,'p',item.organization);
  const due=datePart(item.follow_up_on);
  if(due){
   const row=append(card,'p','Follow up: '+readableDate(due));
   if(due<=now&&item.stage!=='Closed')row.className='overdue';
  }
  if(item.next_step)append(card,'p','Next: '+item.next_step);
  const actions=append(card,'div');actions.className='actions';
  const link=validLink(item.source_url||'');
  if(link){const a=append(actions,'a','Open source');a.href=link;a.target='_blank';a.rel='noopener noreferrer';a.className='button secondary';}
  const modify=append(actions,'button','Edit');modify.type='button';modify.className='secondary';modify.addEventListener('click',()=>edit(item));
  const remove=append(actions,'button','Delete');remove.type='button';remove.className='secondary';remove.addEventListener('click',()=>void erase(item));
 }
}
async function refresh(){
 el('list-status').textContent='Loading your private application records…';
 try{
  const data=await request('GET');
  if(!Array.isArray(data.applications))throw Error('Unexpected server response');
  applications=data.applications;
  draw();
 }catch(e){el('list-status').textContent='Unable to load applications: '+e.message;throw e}
}
async function initialize(){
 try{
  const statusRes=await fetch('/api/account-status',{cache:'no-store'});
  if(!statusRes.ok)throw Error('Account service is unavailable');
  const status=await statusRes.json();
  if(!status.accountsAvailable||!status.authUrl)throw Error('Online accounts are temporarily unavailable');
  client=createSuccessfulFelonsAccountClient(status.authUrl);
  const session=await client.getSession();
  if(session?.error)throw Error('Could not check your sign-in');
  const user=session?.data?.user||session?.user;
  if(!user)throw Error('Sign in first. Your records are private to your account.');
  el('tracker-workspace').hidden=false;el('tracker-summary').hidden=false;
  el('tracker-status').textContent='Your private tracker is connected. No automatic emails or notifications are sent.';
  const params=new URLSearchParams(location.search);
  for(const [key,limit] of [['title',180],['organization',180],['kind',12],['source_url',1800]]){
   const value=params.get(key);
   if(!value||value.length>limit)continue;
   const control=el('application-form').elements.namedItem(key);
   if(control&&(key!=='kind'||['housing','employment'].includes(value))){
    if(key!=='source_url'||validLink(value))control.value=value;
   }
  }
  await refresh();
 }catch(e){
  el('tracker-status').textContent=e.message;
  el('signin-link').hidden=false;
 }
}
el('application-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const button=el('save-application');button.disabled=true;
 el('editor-status').textContent='Saving your application…';
 try{
  const data=new FormData(event.currentTarget);
  const body={};
  for(const key of ['kind','title','organization','source_url','stage','next_step','follow_up_on'])body[key]=String(data.get(key)||'').trim();
  const id=String(data.get('id')||'').trim();
  if(id)body.id=id;
  await request(id?'PUT':'POST',body);
  resetEditor();
  await refresh();
  el('editor-status').textContent='Saved securely to your account.';
 }catch(e){el('editor-status').textContent='Not saved: '+e.message}
 finally{button.disabled=false}
});
el('cancel-edit').addEventListener('click',()=>{resetEditor();el('editor-status').textContent='Edit canceled.'});
el('filter-kind').addEventListener('change',draw);
el('refresh-applications').addEventListener('click',()=>void refresh().catch(()=>{}));
void initialize();
