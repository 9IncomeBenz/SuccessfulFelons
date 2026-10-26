import {readFileSync} from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
for(const file of ['index.html','tools.html']) {
 const html=readFileSync(file,'utf8');
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
 assert.ok(scripts.length,file+' should have scripts');
 for(const script of scripts) new vm.Script(script,{filename:file});
 console.log('PASS script syntax:',file);
}
const tools=readFileSync('tools.html','utf8');
for(const id of ['tracker-form','tracker-items','t-export','match-form','match-results','resume-form','housing-form','income-form','account-panel','account-check','resume-save-status','backup-export','backup-import','clear-device-data','clear-device-status'])assert.ok(tools.includes('id="'+id+'"'),'Missing '+id);
console.log('PASS critical tool UI identifiers');

const home=readFileSync('index.html','utf8');
for(const id of ['listing-form','listing-results','saved-items','tracked-items','tracker-form','clear-workspace','resource-checklist'])assert.ok(home.includes('id="'+id+'"'),'Missing homepage '+id);
for(const [page,html] of [['index.html',home],['tools.html',tools]]) {
 const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
 const seen=new Set();for(const id of ids){assert.ok(!seen.has(id),'Duplicate id '+id+' in '+page);seen.add(id)}
 console.log('PASS unique element IDs:',page);
}
assert.ok(home.includes("addEventListener('storage'"),'Homepage cross-tab updates missing');
assert.ok(tools.includes("addEventListener('storage'"),'Tools cross-tab updates missing');
console.log('PASS cross-tab storage listeners');
