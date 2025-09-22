# Discord User Search (Beta)

> First public **Beta** release. Core goal (look up a Discord user by ID and show public profile info) works end‑to‑end. Interface, proxy approach, and structure are **subject to change** while the project stabilizes.

## Overview
A static GitHub Pages front‑end + a lightweight Cloudflare Worker proxy that fetches public Discord user and guild data (`/users/{id}`, `/guilds/{id}`) safely without exposing a bot token in the browser.

## Why a Proxy Now?
Direct browser calls with a bot token were unreliable (CORS / security) and unsafe (token exposure). The Worker holds the secret token; the site calls the Worker’s `/api/users/<id>` endpoint. This keeps the repo public and the token private.

## Features (Beta)
- Discord‑inspired, animated UI with accessible reduced‑motion fallbacks.
- User lookup by numeric snowflake ID.
- Guild / server lookup by numeric snowflake ID with member counts, features, and metadata.
- Avatar (static / animated) & banner (static / animated) preview with hover switching.
- Derived account creation date from snowflake.
- Public flag (badge) display (HypeSquad subset for now).
- Skeleton shimmer loading + detailed error states (404, 429, generic HTTP, network).
- Caching (session runtime) to avoid repeat fetches.
- Worker proxy with CORS and simple path validation.

## Planned / Subject to Change
- Additional public flags/badges.
- Improved rate limit backoff.
- Optional light theme & theme persistence.
- More robust error surface (retry‑after countdown).
- Expanded documentation & test automation.

## Architecture
```
GitHub Pages (static: index.html, style.css, script.js)
           |
           | HTTPS (no secrets)
           v
Cloudflare Worker (holds BOT_TOKEN)
           |
           v
Discord REST API (https://discord.com/api/v10/users/{id})
```

## Quick Start (Local Clone)
1. Clone repository.
2. Open `index.html` in a modern browser – no build step.
3. (Already configured) Ensure `API_BASE` in `script.js` points to your Worker if you fork.

## Deploy (Your Own Fork)
1. Create your Cloudflare Worker; add secret `BOT_TOKEN`.
2. Use the Worker script from this repo (or copy README snippet below).
3. Set `API_BASE` in `script.js` to your Worker base (without trailing slash).
4. Commit & push.
5. In GitHub repo: Settings → Pages → Deploy from `main` (root).
6. Visit `https://<username>.github.io/<repo>/` and test a user or guild ID.

## Worker Example
```js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }
    if (url.pathname === '/api/ping') {
      return json({ ok: true, ts: Date.now() });
    }

    const userMatch = url.pathname.match(/^\/api\/users\/(\d{5,30})$/);
    const guildMatch = url.pathname.match(/^\/api\/guilds\/(\d{5,30})$/);
    if (!userMatch && !guildMatch) {
      return json({ error: 'Not found' }, 404);
    }

    if (!env.BOT_TOKEN) return json({ error: 'Server missing BOT_TOKEN' }, 500);

    const id = (userMatch || guildMatch)[1];
    const route = userMatch ? `users/${id}` : `guilds/${id}`;
    const query = guildMatch ? '?with_counts=true' : '';
    try {
      const upstream = await fetch(`https://discord.com/api/v10/${route}${query}`, {
        headers: { Authorization: `Bot ${env.BOT_TOKEN}` }
      });
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { ...cors(), 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
      });
    } catch {
      return json({ error: 'Upstream fetch failed' }, 502);
    }
  }
};
function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  };
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors(), 'Content-Type': 'application/json' } });
}
```

## Usage
1. Get a user’s ID: Discord → Settings → Advanced → enable Developer Mode → Right‑click user → Copy ID.
2. Paste the ID into the search field.
3. View avatar, banner, badges, creation date.

## Error Reference
| Code | Meaning | Action |
|------|---------|--------|
| 404  | User not found | Verify ID |
| 429  | Rate limited | Pause & retry later |
| 5xx  | Upstream / proxy issue | Retry; check Worker logs |
| Other | Generic HTTP code | Inspect details panel / console |

## Security Notes
- Bot token never shipped to clients; only the Worker sees it.
- Do not add query features that echo internal headers without sanitizing.
- Regenerate your bot token immediately if it leaks.

## Contributing
Issues & PRs welcome (UI polish, additional badges, error improvements). Expect breaking changes while in Beta.

## License
MIT (excluding Discord assets & trademarks). Discord branding belongs to Discord Inc.

---

Beta Status: APIs and UI structure may shift; pin a commit if you rely on current behavior.