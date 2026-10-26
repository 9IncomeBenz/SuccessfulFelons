import {readFileSync} from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
for(const file of ['index.html','tools.html']) {
 const html=readFileSync(file,'utf8');
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
 assert.ok(scripts.length,file+' should have scripts');
 for(const script of scripts) new vm.Script(script,{filename:file});
 console.log('PASS script syntax:',file);
}
const tools=readFileSync('tools.html','utf8');
for(const id of ['tracker-form','tracker-items','t-export','match-form','match-results','resume-form','housing-form','income-form','account-panel','account-check','resume-save-status','backup-export','backup-import'])assert.ok(tools.includes('id="'+id+'"'),'Missing '+id);
console.log('PASS critical tool UI identifiers');
