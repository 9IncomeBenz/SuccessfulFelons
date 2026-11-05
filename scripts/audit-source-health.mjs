// Read-only daily check of publicly listed sources. Does not update verification status.
// HTTP 403/406/429 and network failures are uncertain, not proof of a dead page.
const base=(process.env.SF_PUBLIC_URL||'https://successfulfelons.vercel.app').replace(/\/$/,'');
const response=await fetch(base+'/api/opportunities',{signal:AbortSignal.timeout(15000)});
if(!response.ok)throw Error('Public opportunities API returned '+response.status);
const body=await response.json();
if(!Array.isArray(body.opportunities))throw Error('Unexpected public opportunity response');
const urls=[...new Set(body.opportunities.map(x=>x.source_url).filter(Boolean))];
if(!urls.length)throw Error('No published sources to check');
const statuses=await Promise.all(urls.map(async raw=>{
 let url;
 try{url=new URL(raw);if(url.protocol!=='https:')return {url:raw,status:'BROKEN',reason:'Non-HTTPS URL'}}catch{return {url:raw,status:'BROKEN',reason:'Invalid URL'}}
 try{
  const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(16000),headers:{
   'User-Agent':'Mozilla/5.0 (compatible; SuccessfulFelonsResourceAudit/1.0)',
   'Accept':'text/html,application/xhtml+xml'
  }});
  if(r.status>=200&&r.status<400)return {url:raw,status:'OK',code:r.status};
  if(r.status===404||r.status===410)return {url:raw,status:'BROKEN',code:r.status};
  return {url:raw,status:'REVIEW',code:r.status};
 }catch(e){return {url:raw,status:'REVIEW',reason:e?.name==='TimeoutError'?'Timeout':'Network access blocked'}}
}));
for(const item of statuses){
 const line=item.status+' '+item.url+' '+(item.code||item.reason||'');
 console.log(line);
 if(item.status==='BROKEN')console.log('::error::Published source needs review: '+item.url);
 else if(item.status==='REVIEW')console.log('::warning::Source availability uncertain: '+item.url);
}
const broken=statuses.filter(x=>x.status==='BROKEN').length;
const uncertain=statuses.filter(x=>x.status==='REVIEW').length;
console.log('Source audit: '+urls.length+' reviewed, '+broken+' broken, '+uncertain+' uncertain.');
if(broken)process.exitCode=1;
