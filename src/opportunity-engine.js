import { createSuccessfulFelonsAccountClient } from './account-sync.js';

const el=id=>document.getElementById(id);
const make=(tag,text,parent)=>{const node=document.createElement(tag);if(text!=null)node.textContent=String(text);parent?.append(node);return node;};
const readableDate=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'Not listed'};
const url=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}};
let reportId=null;

async function bearer(){
 const status=await fetch('/api/account-status',{cache:'no-store'}).then(r=>r.json());
 if(!status.accountsAvailable||!status.authUrl)throw Error('Account access is unavailable');
 const client=createSuccessfulFelonsAccountClient(status.authUrl);
 const session=await client.getSession();
 const user=session?.data?.user||session?.user;
 if(!user)throw Error('Sign in at My account before sending a suggestion or report.');
 const answer=await client.auth.token();
 const token=answer?.data?.token;
 if(answer?.error||!token)throw Error('Your session expired. Sign in again.');
 return token;
}
async function authenticatedPost(path,body){
 const token=await bearer();
 const response=await fetch(path,{
   method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify(body)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Request could not be completed');
 return data;
}
function card(item,list){
 const article=make('article',null,list);article.className='card';
 const type=item.listing_type==='vacancy'?'Provider-confirmed opening':item.listing_type==='program'?'Reviewed program':'Official source directory';
 const label=make('span',type,article);label.className='tag';
 make('h3',item.title||'Opportunity',article);
 const organization=make('p',item.organization_name||'Provider',article);organization.style.fontWeight='700';
 make('p',item.description||'See official source for details.',article);
 const meta=make('div',null,article);meta.className='metadata';
 make('span','Category: '+(item.kind==='housing'?'Housing':'Employment')+' · '+(item.city||'Ohio'),meta);
 if(item.county)make('span','County: '+item.county,meta);
 make('span','Source checked: '+readableDate(item.source_checked_at),meta);
 make('span','Review by: '+readableDate(item.review_due_at),meta);
 if(item.listing_type==='vacancy')make('span','Provider confirmation: '+readableDate(item.provider_confirmed_at),meta);
 else make('span','This is not a confirmed open job or rental.',meta);
 if(item.screening_policy==='not_confirmed')make('span','Record-related screening policy: not confirmed.',meta);
 const actions=make('div',null,article);actions.className='actions';
 const link=url(item.application_url)||url(item.source_url);
 if(link){const a=make('a','View official source',actions);a.href=link;a.target='_blank';a.rel='noopener noreferrer';a.className='button smallbtn';}
 if(link){
  const params=new URLSearchParams({
   title:String(item.title||'').slice(0,180),
   organization:String(item.organization_name||'').slice(0,180),
   kind:item.kind==='housing'?'housing':'employment',
   source_url:link
  });
  const tracker=make('a','Track application',actions);
  tracker.href='/tracker.html?'+params.toString();
  tracker.className='button secondary smallbtn';
 }
 const save=make('button','Save to my leads',actions);save.type='button';save.className='secondary smallbtn';
 save.addEventListener('click',()=>{
  if(!link){el('finder-status').textContent='This source cannot be saved without a valid HTTPS link.';return;}
  const result=window.SFLeads?.save({id:String(item.id),title:String(item.title||'Opportunity'),organization:String(item.organization_name||'Provider'),url:link});
  el('finder-status').textContent=result?.ok?(result.added?'Saved on this device.':'Already saved on this device.'):(result?.reason||'Device saving is unavailable.');
 });
 const flag=make('button','Report a problem',actions);flag.type='button';flag.className='secondary smallbtn';
 flag.addEventListener('click',()=>{reportId=item.id;el('report-status').textContent='';el('report-dialog').showModal()});
}
async function refresh(){
 el('finder-status').textContent='Searching reviewed sources…';
 const form=new FormData(el('filters')),params=new URLSearchParams();
 for(const key of ['q','kind','city','county','listing_type']){const value=String(form.get(key)||'').trim();if(value)params.set(key,value);}
 try{
  const response=await fetch('/api/opportunities?'+params.toString(),{cache:'no-store'});
  const result=await response.json();
  if(!response.ok||!Array.isArray(result.opportunities))throw Error(result.error||'Search unavailable');
  const list=el('results');list.replaceChildren();
  for(const entry of result.opportunities)card(entry,list);
  el('finder-status').textContent=result.opportunities.length+' reviewed result'+(result.opportunities.length===1?'':'s')+'.';
  if(!result.opportunities.length){
    const empty=make('article',null,list);empty.className='card';
    make('h3','No reviewed matches right now',empty);
    make('p','Try all counties or official source directories. We do not display unverified vacancies as confirmed openings.',empty);
    const a=make('a','Explore all 88 Ohio counties',empty);a.href='/ohio.html';
  }
 }catch(e){el('finder-status').textContent='Cannot load reviewed listings: '+e.message;}
}
el('filters').addEventListener('submit',event=>{event.preventDefault();void refresh()});
el('suggest-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const button=el('suggest-submit');button.disabled=true;
 el('submission-status').textContent='Submitting for review…';
 try{
  const form=new FormData(event.currentTarget),item={};
  for(const key of ['kind','listing_type','title','organization_name','city','county','source_url','description'])item[key]=String(form.get(key)||'').trim();
  const result=await authenticatedPost('/api/opportunity-submissions',item);
  el('submission-status').textContent=result.message||'Submitted for review.';
  event.currentTarget.reset();
 }catch(e){el('submission-status').textContent='Unable to submit: '+e.message}
 finally{button.disabled=false}
});
el('cancel-report').addEventListener('click',()=>el('report-dialog').close());
el('report-form').addEventListener('submit',async event=>{
 event.preventDefault();
 el('report-status').textContent='Sending report…';
 try{
  const form=new FormData(event.currentTarget);
  const result=await authenticatedPost('/api/opportunity-reports',{
   opportunity_id:reportId,reason:String(form.get('reason')||''),details:String(form.get('details')||'').trim()
  });
  el('report-dialog').close();el('finder-status').textContent=result.message||'Report received.';
  event.currentTarget.reset();
 }catch(e){el('report-status').textContent='Report not sent: '+e.message}
});
(async()=>{
 try{
  const data=await fetch('/data/ohio-counties.json',{cache:'force-cache'}).then(r=>r.json());
  if(Array.isArray(data.counties))for(const county of data.counties){
   const name=String(county.name||'').trim();if(name){const opt=make('option',name,el('county'));opt.value=name;}
  }
 }catch{}
 const requested=new URLSearchParams(location.search);
 for(const key of ['q','kind','city','county','listing_type']){
  const value=requested.get(key);
  const field=el('filters').elements.namedItem(key);
  if(value&&field)field.value=value;
 }
 await refresh();
})();
