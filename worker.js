const DISCORD_API_VERSION = 10;
const APP_VERSION = '1.2';
const PROJECT_URL = 'https://github.com/The-Unnamed-Official/Discord-API-Search';
const DEFAULT_ORIGIN = 'https://discord-id-hub.info';
const TURNSTILE_ACTION = 'discord_lookup';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (!isAllowedBrowserOrigin(request, env)) {
      return json(request, env, { error: 'Origin not allowed.' }, 403);
    }

    if (url.pathname === '/api/ping') {
      return json(request, env, {
        ok: true,
        api_version: DISCORD_API_VERSION,
        app_version: APP_VERSION,
        captcha_enabled: captchaConfigured(env),
        ts: Date.now()
      });
    }

    if (url.pathname === '/api/captcha/config') {
      if (request.method !== 'GET') return json(request, env, { error: 'Method not allowed.' }, 405);
      const enabled = captchaConfigured(env);
      return json(request, env, {
        enabled,
        site_key: enabled ? env.TURNSTILE_SITE_KEY : '',
        message: enabled ? '' : 'Turnstile is not fully configured on the API Worker.'
      });
    }

    if (url.pathname === '/api/captcha/verify') {
      if (request.method !== 'POST') return json(request, env, { error: 'Method not allowed.' }, 405);
      return verifyCaptcha(request, env);
    }

    const userMatch = url.pathname.match(/^\/api\/users\/(\d{5,30})$/);
    const guildMatch = url.pathname.match(/^\/api\/guilds\/(\d{5,30})$/);
    if (!userMatch && !guildMatch) return json(request, env, { error: 'Not found.' }, 404);
    if (request.method !== 'GET') return json(request, env, { error: 'Method not allowed.' }, 405);
    if (!captchaConfigured(env)) {
      return json(request, env, { error: 'Human verification is not configured.' }, 503);
    }

    const sessionToken = request.headers.get('X-Captcha-Session') || '';
    if (!await verifyCaptchaSession(sessionToken, request, env)) {
      return json(request, env, {
        error: 'Human verification required.',
        captcha_required: true
      }, 403);
    }

    if (!env.BOT_TOKEN) return json(request, env, { error: 'Server missing BOT_TOKEN.' }, 500);

    const id = (userMatch || guildMatch)[1];
    const route = userMatch ? `users/${id}` : `guilds/${id}`;
    const query = guildMatch ? '?with_counts=true' : '';

    try {
      const upstream = await fetch(`https://discord.com/api/v${DISCORD_API_VERSION}/${route}${query}`, {
        headers: {
          Authorization: `Bot ${env.BOT_TOKEN}`,
          'User-Agent': `DiscordBot (${PROJECT_URL}, ${APP_VERSION})`
        }
      });
      const body = await upstream.text();
      const headers = new Headers(corsHeaders(request, env));
      headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
      headers.set('Cache-Control', upstream.ok ? 'private, max-age=60' : 'no-store');
      const retryAfter = upstream.headers.get('Retry-After');
      if (retryAfter) headers.set('Retry-After', retryAfter);
      return new Response(body, { status: upstream.status, headers });
    } catch {
      return json(request, env, { error: 'Discord upstream request failed.' }, 502);
    }
  }
};

async function verifyCaptcha(request, env) {
  if (!captchaConfigured(env)) {
    return json(request, env, { message: 'Turnstile is not fully configured.' }, 503);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json(request, env, { message: 'Invalid verification request.' }, 400);
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token || token.length > 2048) {
    return json(request, env, { message: 'A valid Turnstile response is required.' }, 400);
  }

  const form = new FormData();
  form.set('secret', env.TURNSTILE_SECRET_KEY);
  form.set('response', token);
  const clientIp = request.headers.get('CF-Connecting-IP');
  if (clientIp) form.set('remoteip', clientIp);

  let validation;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form
    });
    validation = await response.json();
  } catch {
    return json(request, env, { message: 'Verification service is temporarily unavailable.' }, 502);
  }

  const allowedHostnames = getAllowedTurnstileHostnames(env);
  const hostnameAllowed = typeof validation.hostname === 'string' &&
    allowedHostnames.includes(validation.hostname.toLowerCase());
  if (!validation.success || validation.action !== TURNSTILE_ACTION || !hostnameAllowed) {
    return json(request, env, {
      message: 'Verification was not accepted. Please try again.',
      error_codes: validation['error-codes'] || []
    }, 403);
  }

  const ttlMs = getCaptchaSessionTtlMs(env);
  const expiresAt = Date.now() + ttlMs;
  const sessionToken = await createCaptchaSession(request, env, expiresAt);
  return json(request, env, {
    ok: true,
    session_token: sessionToken,
    expires_at: expiresAt
  });
}

function captchaConfigured(env) {
  return Boolean(
    env.TURNSTILE_SITE_KEY &&
    env.TURNSTILE_SECRET_KEY &&
    typeof env.CAPTCHA_SESSION_SECRET === 'string' &&
    env.CAPTCHA_SESSION_SECRET.length >= 32
  );
}

function getCaptchaSessionTtlMs(env) {
  const requestedMinutes = Number(env.CAPTCHA_SESSION_MINUTES || 15);
  const minutes = Math.max(5, Math.min(30, Number.isFinite(requestedMinutes) ? requestedMinutes : 15));
  return minutes * 60 * 1000;
}

async function createCaptchaSession(request, env, expiresAt) {
  const payload = {
    version: 1,
    expires_at: expiresAt,
    fingerprint: await clientFingerprint(request)
  };
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await signValue(encodedPayload, env.CAPTCHA_SESSION_SECRET);
  return `${encodedPayload}.${signature}`;
}

async function verifyCaptchaSession(token, request, env) {
  if (!token || !captchaConfigured(env)) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  try {
    const [encodedPayload, encodedSignature] = parts;
    const validSignature = await verifyValue(encodedPayload, encodedSignature, env.CAPTCHA_SESSION_SECRET);
    if (!validSignature) return false;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload)));
    if (payload.version !== 1 || Number(payload.expires_at) <= Date.now()) return false;
    return payload.fingerprint === await clientFingerprint(request);
  } catch {
    return false;
  }
}

async function clientFingerprint(request) {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const userAgent = (request.headers.get('User-Agent') || '').slice(0, 512);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}|${userAgent}`));
  return bytesToBase64Url(new Uint8Array(digest)).slice(0, 24);
}

async function getHmacKey(secret, usages) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages
  );
}

async function signValue(value, secret) {
  const key = await getHmacKey(secret, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verifyValue(value, signature, secret) {
  const key = await getHmacKey(secret, ['verify']);
  return crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlToBytes(signature),
    new TextEncoder().encode(value)
  );
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function getAllowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || DEFAULT_ORIGIN)
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function getAllowedTurnstileHostnames(env) {
  return String(env.TURNSTILE_ALLOWED_HOSTNAMES || 'discord-id-hub.info')
    .split(',')
    .map(hostname => hostname.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedBrowserOrigin(request, env) {
  const origin = request.headers.get('Origin');
  return !origin || getAllowedOrigins(env).includes(origin);
}

function corsHeaders(request, env) {
  const requestOrigin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Captcha-Session',
    'Access-Control-Expose-Headers': 'Retry-After',
    'Cache-Control': 'no-store',
    'Vary': 'Origin'
  };
}

function json(request, env, value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...corsHeaders(request, env),
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}
