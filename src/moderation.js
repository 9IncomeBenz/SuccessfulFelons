import {createSuccessfulFelonsAccountClient} from './account-sync.js';
const find=id=>document.getElementById(id);
const make=(tag,label,parent)=>{const n=document.createElement(tag);if(label!=null)n.textContent=label;parent.append(n);return n};
let token='';
async function authorize(){
 const data=await fetch('/api/account-status',{cache:'no-store'}).then(r=>r.json());
 if(!data.accountsAvailable||!data.authUrl)throw Error('Accounts are unavailable');
 const c=createSuccessfulFelonsAccountClient(data.authUrl);
 const session=await c.getSession();
 if(!(session?.data?.user||session?.user))throw Error('Sign in to your moderator account first');
 const t=await c.auth.token();if(!t?.data?.token)throw Error('Session expired');
 token=t.data.token;
}
async function api(method,payload){
 if(!token)await authorize();
 const r=await fetch('/api/admin/opportunities',{
  method,cache:'no-store',headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},
  body:payload?JSON.stringify(payload):undefined
 });
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(d.error||'Review service unavailable');
 return d;
}
async function act(payload){
 find('review-status').textContent='Updating moderation queue…';
 try{await api('POST',payload);await load()}catch(e){find('review-status').textContent='Not updated: '+e.message}
}
function card(parent,title,description){
 const art=make('article',null,parent);make('h3',title,art);make('p',description,art);return art;
}
function note(art){
 const label=make('label','Review note (required, minimum 12 characters)',art);
 const field=make('textarea',null,label);field.maxLength=500;field.required=true;
 return field;
}
function action(art,text,fn){
 const b=make('button',text,art);b.type='button';b.addEventListener('click',fn);return b;
}
function showSubmission(s){
 const art=card(find('moderation-list'),s.title,s.organization_name+' · '+s.kind+' · '+s.listing_type+' · '+(s.city||'Statewide')+' · '+(s.county||'Ohio'));
 make('p',s.description,art);
 try{const u=new URL(s.source_url);if(u.protocol==='https:'){const a=make('a','Examine public source',art);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer'}}catch{}
 const n=note(art);
 const label=make('label',null,art),check=make('input',null,label);check.type='checkbox';
 label.append(' I independently checked the official source or confirmed the opening directly with the provider.');
 action(art,'Publish verified listing',async()=>{
  if(!check.checked||n.value.trim().length<12){find('review-status').textContent='Check the evidence box and enter a detailed review note.';return}
  const flags=s.listing_type==='directory'?{official_source_confirmed:true}:{provider_confirmed:true};
  await act({action:'publish',id:s.id,listing_type:s.listing_type,note:n.value.trim(),...flags});
 });
 action(art,'Reject submission',async()=>{
  if(n.value.trim().length<12){find('review-status').textContent='Enter a review note before rejection.';return}
  await act({action:'reject',id:s.id,note:n.value.trim()});
 });
}
function showReport(r){
 const art=card(find('reports-list'),r.opportunity_title||'Opportunity',r.reason+' — '+(r.details||'No additional details'));
 const n=note(art);
 action(art,'Mark investigated',()=>n.value.trim().length>=12?act({action:'resolve',id:r.id,note:n.value.trim()}):find('review-status').textContent='Enter an investigation note.');
 action(art,'Expire listing',()=>n.value.trim().length>=12?act({action:'expire',id:r.opportunity_id,note:n.value.trim()}):find('review-status').textContent='Enter a reason before expiring a listing.');
}
async function load(){
 find('review-status').textContent='Loading private review queue…';
 try{
  const data=await api('GET');
  find('moderation-list').replaceChildren();find('reports-list').replaceChildren();
  for(const s of data.submissions||[])showSubmission(s);
  for(const r of data.reports||[])showReport(r);
  find('review-status').textContent=(data.submissions||[]).length+' pending suggestions and '+(data.reports||[]).length+' listing reports.';
 }catch(e){find('review-status').textContent='Review queue not available: '+e.message}
}
find('refresh-review').addEventListener('click',()=>void load());
void load();
