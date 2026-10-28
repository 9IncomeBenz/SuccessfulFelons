import { createSuccessfulFelonsAccountClient } from './account-sync.js';

// Device-to-cloud upload is opt-in, scoped to a verified signed-in Neon Auth user.
// This module deliberately never uploads application tracker notes or resume data.
const prefix='sf_auto_cloud_user_';
let client,owner,known=new Set(),busy=false;
function safeLead(item) {
  if(!item || typeof item.id!=='string'||typeof item.title!=='string')return null;
  let url='';
  if(item.url){try{const u=new URL(item.url);if(u.protocol==='https:')url=u.href}catch{}}
  return {id:item.id,title:item.title,organization:item.organization||'',url};
}
async function sync(){
 if(!client||!owner||!window.SFLeads||busy)return;
 if(localStorage.getItem(prefix+owner)!=='yes')return;
 busy=true;
 try{
   const session=await client.getSession();
   if(session.error||session?.data?.user?.id!==owner)return;
   const entries=window.SFLeads.list();
   for(const raw of entries){
     const item=safeLead(raw);if(!item||known.has(item.id))continue;
     try{await client.save(item);known.add(item.id)}catch{break}
   }
 }finally{busy=false}
}
async function boot(){
 try{
  const res=await fetch('/api/account-status',{cache:'no-store'});
  if(!res.ok)return;
  const data=await res.json();
  if(!data.accountsAvailable||!data.authUrl)return;
  client=createSuccessfulFelonsAccountClient(data.authUrl);
  const session=await client.getSession();
  owner=session?.data?.user?.id||null;
  if(!owner||localStorage.getItem(prefix+owner)!=='yes')return;
  const online=await client.list();
  known=new Set(online.map(item=>item.id));
  await sync();
 }catch{} // Local saving remains usable during network or auth failures.
}
window.addEventListener('sf:saved-changed',()=>{void sync()});
window.addEventListener('sf:auto-sync-changed',()=>{void boot()});
void boot();
