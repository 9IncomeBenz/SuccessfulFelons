// Staged account client. Not shipped to the website until managed Neon Auth
// trusted origins, email verification, schema and cross-device tests pass.
import { createAuthClient } from '@neondatabase/auth';

export function createSuccessfulFelonsAccountClient(neonAuthUrl) {
  if (typeof neonAuthUrl !== 'string') throw Error('Invalid Neon Auth URL');
  const base = new URL(neonAuthUrl);
  if (base.protocol !== 'https:') throw Error('HTTPS Neon Auth URL required');
  const auth = createAuthClient(base.href.replace(/\/$/, ''));

  async function authToken() {
    const response = await auth.token();
    const token = response?.data?.token;
    if (response?.error || !token || typeof token !== 'string') {
      throw Error('Sign in again to access your private account');
    }
    return token; // Never write this token to localStorage or logs.
  }

  async function request(method, body) {
    const response = await fetch('/api/account/saved', {
      method,
      cache:'no-store',
      credentials:'same-origin',
      headers:{Authorization:'Bearer ' + await authToken(), ...(body ? {'Content-Type':'application/json'} : {})},
      body:body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw Error(data.error || 'Account storage unavailable');
    return data;
  }
  return {
    auth,
    async getSession() { return auth.getSession(); },
    async signUp(email,password,name) { return auth.signUp.email({email,password,name}); },
    async signIn(email,password) { return auth.signIn.email({email,password}); },
    async signOut() { return auth.signOut(); },
    async list() { return (await request('GET')).leads; },
    async save(item) { return request('PUT',{item}); },
    async remove(id) { return request('DELETE',{id}); },
    async clear() { const response=await fetch('/api/account/clear',{method:'POST',cache:'no-store',credentials:'same-origin',headers:{Authorization:'Bearer '+await authToken(),'Content-Type':'application/json'},body:JSON.stringify({confirmation:'DELETE CLOUD SAVES'})});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Cloud deletion unavailable');return data; },
    async importLocalWithConsent(localLeads) {
      if (!Array.isArray(localLeads) || localLeads.length > 100) throw Error('Invalid local backup');
      const uploaded=[];
      for (const item of localLeads) {
        // Must be invoked only after user explicitly approves cloud upload.
        uploaded.push(await request('PUT',{item}));
      }
      return uploaded;
    }
  };
}
