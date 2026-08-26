const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const workerUrl = pathToFileURL(path.resolve(__dirname, '..', 'worker.js')).href;
  const { default: worker } = await import(workerUrl);
  const origin = 'https://discord-id-hub.info';
  const configuredEnv = {
    BOT_TOKEN: 'discord-bot-token',
    TURNSTILE_SITE_KEY: 'public-site-key',
    TURNSTILE_SECRET_KEY: 'private-secret-key',
    CAPTCHA_SESSION_SECRET: '12345678901234567890123456789012'
  };

  const missingConfigResponse = await worker.fetch(new Request('https://worker.example/api/users/397241335050141698', {
    headers: { Origin: origin }
  }), {});
  assert.equal(missingConfigResponse.status, 503);

  const challengeResponse = await worker.fetch(new Request('https://worker.example/api/users/397241335050141698', {
    headers: { Origin: origin }
  }), configuredEnv);
  assert.equal(challengeResponse.status, 403);
  assert.equal((await challengeResponse.json()).captcha_required, true);

  const oversizedTokenResponse = await worker.fetch(new Request('https://worker.example/api/captcha/verify', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'x'.repeat(2049) })
  }), configuredEnv);
  assert.equal(oversizedTokenResponse.status, 400);

  const configResponse = await worker.fetch(new Request('https://worker.example/api/captcha/config', {
    headers: { Origin: origin }
  }), configuredEnv);
  const config = await configResponse.json();
  assert.equal(config.enabled, true);
  assert.equal(config.site_key, 'public-site-key');
  assert.equal(JSON.stringify(config).includes('private-secret-key'), false);

  const originalFetch = global.fetch;
  let siteverifyResult = {
    success: true,
    action: 'discord_lookup',
    hostname: 'discord-id-hub.info'
  };
  global.fetch = async input => {
    const url = String(input);
    if (url.includes('/turnstile/v0/siteverify')) {
      return new Response(JSON.stringify(siteverifyResult), { headers: { 'Content-Type': 'application/json' } });
    }
    if (url.includes('discord.com/api/v10/users/')) {
      return new Response(JSON.stringify({ id: '397241335050141698', username: 'test-user' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const clientHeaders = {
      Origin: origin,
      'User-Agent': 'worker-security-test',
      'CF-Connecting-IP': '203.0.113.10'
    };

    siteverifyResult = { success: true, action: 'discord_lookup' };
    const missingHostnameResponse = await worker.fetch(new Request('https://worker.example/api/captcha/verify', {
      method: 'POST',
      headers: { ...clientHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'hostname-less-token' })
    }), configuredEnv);
    assert.equal(missingHostnameResponse.status, 403);

    siteverifyResult = {
      success: true,
      action: 'discord_lookup',
      hostname: 'discord-id-hub.info'
    };
    const verificationResponse = await worker.fetch(new Request('https://worker.example/api/captcha/verify', {
      method: 'POST',
      headers: { ...clientHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'single-use-turnstile-token' })
    }), configuredEnv);
    assert.equal(verificationResponse.status, 200);
    const verification = await verificationResponse.json();
    assert.ok(verification.session_token);
    assert.ok(verification.expires_at > Date.now());

    const protectedLookup = await worker.fetch(new Request('https://worker.example/api/users/397241335050141698', {
      headers: { ...clientHeaders, 'X-Captcha-Session': verification.session_token }
    }), configuredEnv);
    assert.equal(protectedLookup.status, 200);
    assert.equal((await protectedLookup.json()).username, 'test-user');
  } finally {
    global.fetch = originalFetch;
  }

  const rejectedOrigin = await worker.fetch(new Request('https://worker.example/api/ping', {
    headers: { Origin: 'https://malicious.example' }
  }), configuredEnv);
  assert.equal(rejectedOrigin.status, 403);

  console.log('Worker security tests passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
