import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const code = readFileSync('assets/saved-leads.js', 'utf8');
const pages = ['employment.html', 'ohio.html', 'saved.html'];
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  assert.match(html, /assets\/saved-leads\.js/, page+' must load the shared workspace module');
  assert.match(html, /SFLeads\./, page+' must actually use the workspace module');
}
const home = readFileSync('index.html', 'utf8');
assert.match(home, /sf_workspace_v1/, 'Homepage and library must share the same local workspace');
assert.match(home, /href="\/saved\.html"/, 'Homepage must link to saved leads');
const store = new Map();
const events = [];
const window = {
  localStorage: {getItem: key => store.has(key) ? store.get(key) : null,setItem: (key,value) => store.set(key,String(value))},
  dispatchEvent: event => events.push(event.type),
  CustomEvent: class {constructor(type){this.type=type}}
};
runInNewContext(code, {window,URL});
assert.ok(window.SFLeads,'Shared workspace module not exported');
assert.equal(window.SFLeads.key,'sf_workspace_v1');
const first = window.SFLeads.save({id:'research:example',title:'Entry-level warehouse',organization:'Example organization',url:'https://example.com/jobs'});
assert.equal(first.ok,true);
assert.equal(first.added,true);
assert.equal(window.SFLeads.list().length,1);
assert.equal(window.SFLeads.has('research:example'),true);
assert.equal(window.SFLeads.save({id:'research:example',title:'Entry-level warehouse'}).added,false,'Saving twice must not duplicate');
assert.equal(window.SFLeads.save({id:'x',title:'Malicious',url:'javascript:alert(1)'}).ok,false,'Unsafe URL must not be stored');
assert.equal(window.SFLeads.save({id:'',title:'Unknown'}).ok,false,'Blank IDs should be rejected');
assert.equal(window.SFLeads.save({id:'missing-title',title:''}).ok,false,'Blank titles should be rejected');
const current = JSON.parse(store.get(window.SFLeads.key));
current.tracked=[{title:'Existing application',stage:'Applied'}];
store.set(window.SFLeads.key,JSON.stringify(current));
assert.equal(window.SFLeads.save({id:'research:second',title:'Another employer'}).ok,true);
assert.equal(JSON.parse(store.get(window.SFLeads.key)).tracked[0].title,'Existing application','Save must preserve homepage tracker');
const removed = window.SFLeads.remove('research:example');
assert.equal(removed.ok,true);
assert.equal(window.SFLeads.has('research:example'),false);
assert.equal(JSON.parse(store.get(window.SFLeads.key)).tracked.length,1,'Removal must preserve application tracker');
for(let i=0;i<120;i++) assert.equal(window.SFLeads.save({id:'test:'+i,title:'Test lead '+i}).ok,true);
assert.equal(window.SFLeads.list().length,100,'Workspace must cap saved leads at 100');
assert.ok(events.includes('sf:saved-changed'),'Other local views should be notified after saving');
window.localStorage.setItem = () => {throw Error('Storage unavailable')};
assert.equal(window.SFLeads.save({id:'blocked',title:'Storage failed'}).ok,false,'Storage error must not appear as a success');
console.log('PASS: shared saved leads protect tracker data, URLs, duplicate IDs, maximum size and unavailable storage.');
