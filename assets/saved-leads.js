(function (global) {
  'use strict';
  const KEY = 'sf_workspace_v1';
  const MAX = 100;
  function clean(v, max) {
    return String(v == null ? '' : v).trim().slice(0, max);
  }
  function read() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(KEY) || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('Invalid workspace');
      return {
        saved: Array.isArray(parsed.saved) ? parsed.saved.filter(x => x && typeof x === 'object').slice(0, MAX) : [],
        tracked: Array.isArray(parsed.tracked) ? parsed.tracked : []
      };
    } catch {
      return {saved: [], tracked: []};
    }
  }
  function normalize(lead) {
    if (!lead || typeof lead !== 'object') return null;
    const id = clean(lead.id, 120);
    const title = clean(lead.title, 180);
    const organization = clean(lead.organization || lead.organization_name, 180);
    const rawUrl = clean(lead.url || lead.application_url, 1800);
    if (!id || !title) return null;
    let url = '';
    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        if (!['https:', 'http:'].includes(parsed.protocol)) return null;
        url = parsed.href;
      } catch { return null; }
    }
    return {id, title, organization, url};
  }
  function has(id) {
    const key = clean(id, 120);
    return !!key && read().saved.some(item => item.id === key);
  }
  function save(lead) {
    const normalized = normalize(lead);
    if (!normalized) return {ok:false, reason:'Invalid opportunity or website link.'};
    const workspace = read();
    if (workspace.saved.some(item => item.id === normalized.id)) return {ok:true, added:false};
    workspace.saved.unshift(normalized);
    workspace.saved = workspace.saved.slice(0, MAX);
    try {
      global.localStorage.setItem(KEY, JSON.stringify(workspace));
      notify();
      return {ok:true, added:true};
    } catch {return {ok:false, reason:'Unable to save on this device. Browser storage may be disabled or full.'};}
  }
  function remove(id) {
    const workspace = read();
    const original = workspace.saved.length;
    workspace.saved = workspace.saved.filter(item => item.id !== clean(id,120));
    if (workspace.saved.length === original) return {ok:true, removed:false};
    try {
      global.localStorage.setItem(KEY, JSON.stringify(workspace));
      notify();
      return {ok:true, removed:true};
    } catch {return {ok:false, reason:'Unable to update this device.'};}
  }
  function notify() {
    try { global.dispatchEvent(new global.CustomEvent('sf:saved-changed')); } catch {}
  }
  global.SFLeads = Object.freeze({key:KEY, list:()=>read().saved.slice(), has, save, remove});
})(window);
