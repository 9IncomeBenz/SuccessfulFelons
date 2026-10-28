import { createRemoteJWKSet, jwtVerify } from 'jose';

let cachedJWKS;
let cachedUrl;

export function accountBackendConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.NEON_AUTH_BASE_URL);
}

export async function requireAuthUser(req) {
  if (!accountBackendConfigured()) {
    const error = new Error('Account backend is not configured');
    error.statusCode = 503;
    throw error;
  }

  const base = new URL(process.env.NEON_AUTH_BASE_URL);
  if (base.protocol !== 'https:') throw Object.assign(new Error('Invalid auth configuration'), { statusCode: 503 });

  const header = req.headers.authorization;
  const match = typeof header === 'string' && header.match(/^Bearer\s+([^\s]{20,8192})$/i);
  if (!match) throw Object.assign(new Error('Authentication required'), { statusCode: 401 });

  // Managed Neon Auth publishes the JWKS under its base URL. An explicit
  // NEON_AUTH_JWKS_URL may override it for environments that provide one.
  const jwksURL = new URL(process.env.NEON_AUTH_JWKS_URL ||
    base.href.replace(/\/$/, '') + '/.well-known/jwks.json');
  if (jwksURL.protocol !== 'https:' || jwksURL.origin !== base.origin) {
    throw Object.assign(new Error('Invalid auth key configuration'), { statusCode: 503 });
  }
  if (!cachedJWKS || cachedUrl !== jwksURL.href) {
    cachedUrl = jwksURL.href;
    cachedJWKS = createRemoteJWKSet(jwksURL);
  }
  let payload;
  try {
    ({ payload } = await jwtVerify(match[1], cachedJWKS, {
      issuer: base.origin,
      algorithms: ['EdDSA']
    }));
  } catch {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  if (typeof payload.sub !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(payload.sub)) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return payload.sub;
}

export function authHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Vary', 'Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}
