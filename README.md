# Discord User Search (Static GitHub Pages)

Static client-side lookup of basic Discord user data via the `/users/{id}` REST endpoint.

## ⚠️ Important Security Notice
You MUST NOT embed or commit a bot token. Visitors could inspect it and abuse your bot. This project is only safe if each user supplies their own token locally at runtime.

## Features
- Pure static (HTML/CSS/JS) – works on GitHub Pages.
- User provides a Bot token (stored locally via localStorage).
- Animated avatar/banner hover if animated assets exist.
- Badge + creation date derivation from snowflake.
- Detailed error/status diagnostics.

## Limitations
- Requires a Bot token with basic `users.read` access (standard bot tokens can fetch public user object).
- Anyone entering a token on a public page exposes their token to that page context.
- If Discord ever restricts CORS for these endpoints, direct browser calls will fail (then use a proxy).

## Quick Start (Local)
1. Download / clone.
2. Open `index.html` in a modern browser (no build needed).
3. Expand “Bot Token” panel, paste your token (without `Bot ` prefix).
4. Enter a user ID (snowflake) and search.

## Deploy to GitHub Pages
1. Create (or use) repository. Place `index.html`, `style.css`, `script.js`, `README.md` at repo root.
2. Commit & push:
```powershell
git add index.html style.css script.js README.md
git commit -m "Add static Discord user search"
git push
```
3. In GitHub: Settings → Pages → Build and deployment:
   - Source: Deploy from a branch
   - Branch: `main` (root) → Save
4. Wait for the green Pages build. Your site URL: `https://<username>.github.io/<repo>/`
5. Open the URL, supply token, search.

## Getting a User ID
Enable Developer Mode in Discord → Right-click user → Copy User ID.

## Troubleshooting
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| 401 / 403 | Bad token | Regenerate token; remove leading `Bot ` when pasting (the page auto-strips but confirm). |
| 404 | User ID invalid / user no longer exists | Re-check snowflake. |
| 429 | Rate limited | Slow down; avoid rapid auto searches. |
| Network/CORS / no status | Browser extension / corporate proxy / Discord CORS change | Try another browser or set up a proxy. |

## Optional: Minimal Proxy (If CORS Breaks)
Deploy a Cloudflare Worker (example):
```js
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/users/')) return new Response('Not found', { status:404 });
    const id = url.pathname.split('/').pop();
    const r = await fetch('https://discord.com/api/v10/users/' + id, {
      headers: { Authorization: 'Bot ' + env.BOT_TOKEN }
    });
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: { 'Access-Control-Allow-Origin':'*', 'Content-Type': 'application/json' }
    });
  }
}
```
Then change `API_BASE` in `script.js` to your Worker URL.

## License
MIT (excluding Discord assets; those remain property of Discord).