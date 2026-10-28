import { createSuccessfulFelonsAccountClient } from './account-sync.js';

const get=id=>document.getElementById(id);
const on=(id,event,fn)=>{const el=get(id);if(el)el.addEventListener(event,fn)};
const msg=s=>{if(get('account-msg'))get('account-msg').textContent=s};
const out=s=>{if(get('cloud-status'))get('cloud-status').textContent=s};
let client=null,user=null,cloud=[];
let configured=false;
function resultData(response,label){
  if(response?.error)throw Error(response.error.message||response.error.statusText||label||'Request failed');
  return response?.data??response;
}
async function ensureEnabled(){
  const r=await fetch('/api/account-status',{cache:'no-store'});
  if(!r.ok)throw Error('Account service is unavailable');
  const data=await r.json();
  if(!data.accountsAvailable||!data.onlineSyncAvailable||!data.authUrl)return false;
  client=createSuccessfulFelonsAccountClient(data.authUrl);
  configured=true;return true;
}
function showMode(mode){
  for(const name of ['signin','register','verify'])if(get(name))get(name).hidden=name!==mode;
  msg('');
}
function signedIn(session){
  user=session?.data?.user||null;
  if(get('auth-forms'))get('auth-forms').hidden=Boolean(user);
  if(get('signed-in'))get('signed-in').hidden=!user;
  if(get('signed-name'))get('signed-name').textContent=user?'Signed in as '+(user.email||'your account'):'';
  if(get('account-state'))get('account-state').textContent=user?'Your session is active. Cloud-saved leads stay separate from local device data.':'Sign in to synchronize saved lead links across your devices.';
  if(!user){cloud=[];if(get('cloud-list'))get('cloud-list').replaceChildren();}
}
async function refreshSession(){
  const session=resultData(await client.getSession(),'Could not verify your session');
  signedIn({data:session});
  if(user)await refreshCloud();
}
function element(tag,text,parent){const node=document.createElement(tag);if(text!=null)node.textContent=text;parent.append(node);return node}
function cleanUrl(url){try{const p=new URL(url);return p.protocol==='https:'?p.href:null}catch{return null}}
function saveJson(filename,obj){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');
  a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function renderCloud(){
  if(!get('cloud-list'))return;
  const list=get('cloud-list');list.replaceChildren();
  for(const item of cloud){
    const li=element('li',null,list);
    element('strong',(item.title||'Saved lead')+' — '+(item.organization||'Organization'),li);
    const href=cleanUrl(item.url);
    if(href){li.append(' ');const a=element('a','View source',li);a.href=href;a.target='_blank';a.rel='noopener noreferrer'}
    li.append(' ');
    const remove=element('button','Remove cloud copy',li);remove.type='button';remove.className='secondary';
    remove.addEventListener('click',async()=>{try{await client.remove(item.id);await refreshCloud()}catch(error){msg('Unable to delete cloud copy: '+error.message)}});
  }
  out(cloud.length+' saved link'+(cloud.length===1?'':'s')+' in your private online account.');
}
async function refreshCloud(){
  if(!user)return;
  try{cloud=await client.list();if(!Array.isArray(cloud))throw Error('Invalid cloud response');renderCloud()}
  catch(error){cloud=[];if(get('cloud-list'))get('cloud-list').replaceChildren();out('Unable to load cloud leads: '+error.message)}
}
async function guarded(fn){
  if(!configured)return;
  msg('Working…');
  try{await fn();if(get('account-msg')?.textContent==='Working…')msg('')}catch(error){msg(error?.message||'Request unsuccessful. Try again.')}
}
on('show-signin','click',()=>showMode('signin'));
on('show-register','click',()=>showMode('register'));
on('show-verify','click',()=>showMode('verify'));
on('signin','submit',ev=>{ev.preventDefault();guarded(async()=>{
  const f=new FormData(ev.currentTarget);resultData(await client.signIn(String(f.get('email')).trim(),String(f.get('password'))),'Sign-in failed');
  await refreshSession();
  if(!user)throw Error('Sign-in did not establish a session. Verify your email if requested.');
})});
on('register','submit',ev=>{ev.preventDefault();guarded(async()=>{
  const f=new FormData(ev.currentTarget);
  resultData(await client.signUp(String(f.get('email')).trim(),String(f.get('password')),String(f.get('name')).trim()),'Registration failed');
  showMode('verify');get('verify').elements.email.value=String(f.get('email')).trim();
  msg('Registration submitted. Verify your email using the code from Neon Auth; an account may not be active until verification succeeds.');
})});
on('verify','submit',ev=>{ev.preventDefault();guarded(async()=>{
  const f=new FormData(ev.currentTarget);
  const response=await client.auth.emailOtp.verifyEmail({email:String(f.get('email')).trim(),otp:String(f.get('otp')).trim()});
  resultData(response,'Email verification failed');
  await refreshSession();
  if(!user)showMode('signin');
  msg(user?'Your email has been verified.':'Email verified. Sign in to continue.');
})});
on('send-code','click',()=>guarded(async()=>{
  const email=get('verify').elements.email.value.trim();
  if(!email)throw Error('Enter the account email first.');
  resultData(await client.auth.emailOtp.sendVerificationOtp({email,type:'email-verification'}),'Could not send email code');
  msg('If your account is eligible, Neon Auth has sent a verification code.');
}));
on('signout','click',()=>guarded(async()=>{
  resultData(await client.signOut(),'Sign-out failed');signedIn({data:null});msg('Signed out. Local device leads remain saved.');
}));
on('cloud-refresh','click',()=>guarded(refreshCloud));
on('cloud-import','click',()=>guarded(async()=>{
  if(!user)throw Error('Please sign in.');
  const items=(window.SFLeads?.list()||[]).map(x=>({...x,url:cleanUrl(x.url)||''}));
  if(!items.length)throw Error('No device-saved leads to import.');
  if(!confirm('Upload '+items.length+' device-saved lead links to your private cloud account? Only title, organization and source URL are uploaded; application tracking notes are not.'))return;
  let added=0,failed=0;
  for(const item of items){try{await client.save(item);added++}catch{failed++}}
  await refreshCloud();msg('Cloud upload complete: '+added+' updated, '+failed+' not uploaded. Local backups remain unchanged.');
}));
on('cloud-export','click',()=>guarded(async()=>{
  if(!user)throw Error('Please sign in.');
  await refreshCloud();
  saveJson('successfulfelons-cloud-links.json',{format:'successfulfelons-saved-leads-v1',exportedAt:new Date().toISOString(),saved:cloud.map(x=>({id:x.id,title:x.title,organization:x.organization,url:x.url}))});
  msg('Cloud saved-leads backup exported to this device.');
}));
on('clear-cloud','click',()=>guarded(async()=>{
  if(!user)throw Error('Please sign in.');
  if(!confirm('Permanently delete ALL cloud-saved leads in this account? Your local browser saves remain intact.'))return;
  const typed=prompt('Type DELETE CLOUD SAVES to confirm:');if(typed!=='DELETE CLOUD SAVES')throw Error('Deletion cancelled: confirmation did not match.');
  const result=await client.clear();
  await refreshCloud();msg('Deleted '+result.deleted_count+' private cloud saved leads.');
}));
on('delete-identity','click',()=>guarded(async()=>{
  if(!user)throw Error('Sign in first.');
  if(!confirm('Permanently delete your SuccessfulFelons identity and saved cloud data? Download a backup first. This cannot be undone.'))return;
  const typed=prompt('Type DELETE MY ACCOUNT to confirm:');if(typed!=='DELETE MY ACCOUNT')throw Error('Account deletion cancelled.');
  if(typeof client.auth.deleteUser!=='function')throw Error('Managed identity self-deletion is not available. Contact platform support for a verified deletion request.');
  const password=prompt('Enter your account password to confirm identity deletion (it is sent only to managed Neon Auth):');
  if(!password)throw Error('Password confirmation required; no data deleted.');
  // Delete cloud saves before identity. If identity deletion fails, report that
  // identity remains, and never claim the entire account is deleted.
  const result=await client.clear();
  const deleted=await client.auth.deleteUser({password});
  if(deleted?.error){await refreshCloud();throw Error('Cloud links deleted ('+result.deleted_count+'), but the identity could not be deleted: '+(deleted.error.message||'Managed Auth rejected deletion'))}
  signedIn({data:null});
  msg('Managed identity deletion request was accepted. Cloud saved links were cleared; browser-local files stay on this device.');
}));
async function boot(){
  try{
    const enabled=await ensureEnabled();
    if(!enabled){if(get('unavailable'))get('unavailable').hidden=false;if(get('account-state'))get('account-state').textContent='Private cloud storage is prepared. Account registration and synchronization are not yet enabled.';return;}
    if(get('auth-forms'))get('auth-forms').hidden=false;
    showMode('signin');await refreshSession();
  }catch(error){if(get('unavailable'))get('unavailable').hidden=false;msg('Account service unavailable: '+error.message)}
}
boot();
