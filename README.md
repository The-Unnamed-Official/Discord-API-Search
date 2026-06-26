# Discord API Search v0.7

Unofficial static Discord snowflake lookup for public user and guild data. The browser talks to a lightweight Cloudflare Worker proxy, and the Worker talks to Discord REST API v10 so the bot token never ships to clients.

## What's New In v0.7

- Current Discord REST API v10 references and Worker example.
- Adaptive Discord CDN resources for avatars, banners, guild icons, avatar decorations, guild tag badges, and public badge icons.
- Current official `public_flags` badge support from Discord's User object docs.
- Fresh responsive interface with working user/guild tabs, retry, clear, examples, settings, copy actions, raw JSON, theme, reduced motion, auto search, and badge label controls.
- Guild feature inspection, member/presence counts, moderation metadata, vanity links, and bot invite guidance.
- Encoding cleanup for previously corrupted UI text.

## Features

- User lookup by Discord snowflake ID.
- Guild/server lookup by Discord snowflake ID with `with_counts=true`.
- Avatar, banner, icon, splash, decoration, and badge rendering through Discord CDN resources.
- Public badges from `public_flags`, plus forwarded badge arrays if Discord or the proxy returns actual badge entries.
- Nitro, avatar decorations, nameplates, banners, collectibles, and primary guild tags are shown as API profile fields instead of being treated as badges.
- Owner ID quick-search from guild results.
- Snowflake creation dates and account/server age.
- Copy buttons for IDs, metadata, and raw JSON.
- Detailed error handling for 404, 429, network, and upstream/proxy failures.
- Local settings for light theme, reduced motion, auto search, and badge labels.

## Architecture

```text
GitHub Pages static app
  -> Cloudflare Worker proxy
  -> Discord REST API v10
```

The frontend `API_BASE` lives in `script.js`:

```js
const API_BASE = 'https://discord-api-search.bbrraaggee.workers.dev/api';
```

## Quick Start

Open `index.html` in a modern browser. There is no build step.

## Worker Example

```js
const DISCORD_API_VERSION = 10;
const PROJECT_URL = 'https://github.com/The-Unnamed-Official/Discord-API-Search';
const APP_VERSION = '0.7';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    if (url.pathname === '/api/ping') {
      return json({ ok: true, api_version: DISCORD_API_VERSION, app_version: APP_VERSION, ts: Date.now() });
    }

    const userMatch = url.pathname.match(/^\/api\/users\/(\d{5,30})$/);
    const guildMatch = url.pathname.match(/^\/api\/guilds\/(\d{5,30})$/);
    if (!userMatch && !guildMatch) return json({ error: 'Not found' }, 404);
    if (!env.BOT_TOKEN) return json({ error: 'Server missing BOT_TOKEN' }, 500);

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

      const text = await upstream.text();
      const headers = {
        ...cors(),
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        'Cache-Control': upstream.ok ? 'public, max-age=60' : 'no-store'
      };

      const retryAfter = upstream.headers.get('Retry-After');
      if (retryAfter) headers['Retry-After'] = retryAfter;

      return new Response(text, { status: upstream.status, headers });
    } catch {
      return json({ error: 'Upstream fetch failed' }, 502);
    }
  }
};

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Expose-Headers': 'Retry-After'
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors(), 'Content-Type': 'application/json' }
  });
}
```

## Notes

- Discord API v10 is the current available REST API version in Discord's official API versioning table.
- Guild lookups require the Worker bot to be in the target guild. A `10004 Unknown Guild` response usually means the bot needs to be invited.
- Discord IDs are snowflakes. The app derives creation time locally from the snowflake timestamp.

## License

MIT for this app's code. Discord assets, resources, and branding belong to Discord Inc.
