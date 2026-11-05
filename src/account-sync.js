// Managed Neon Auth client for optional SuccessfulFelons member accounts.
// Browser credentials stay with managed Auth. Cloud requests require a signed JWT.
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
    async listApplications() {
      const response=await fetch('/api/account/applications',{
        method:'GET',cache:'no-store',credentials:'same-origin',
        headers:{Authorization:'Bearer '+await authToken()}
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!Array.isArray(data.applications))throw Error(data.error||'Application backup unavailable');
      return data.applications;
    },
    async eraseAccountData() {
      const response=await fetch('/api/account/erase-data',{
        method:'POST',cache:'no-store',credentials:'same-origin',
        headers:{Authorization:'Bearer '+await authToken(),'Content-Type':'application/json'},
        body:JSON.stringify({confirmation:'DELETE MY ACCOUNT'})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||data.app_data_deleted!==true)throw Error(data.error||'Account data could not be erased');
      return data;
    },
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
