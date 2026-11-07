# Discord ID Hub v1.5

A lightweight, unofficial lookup for public Discord users and servers. The static website uses a Cloudflare Worker so the Discord bot token stays on the server. This release skips v1.3 and v1.4.

## v1.5

- Reworked layout, typography, and surfaces for desktop, tablets, and phones, including narrow screens, landscape layouts, safe areas, and zoom.
- Dark is the default theme on first visit. A saved light-theme choice is respected. Profile cards use Discord-inspired neutral surfaces, banner/avatar overlap, compact badges, and presence indicators only when presence data is available.
- One event-driven animation scheduler keeps the pointer glow aligned with moving elements, avatar reactions, scroll, and layout changes, even when the pointer is still.
- A small canvas around the pointer replaces the full-screen canvas. Static geometry is cached, decorative rendering is capped at 60fps, and there is no continuous frame loop when the page is idle.
- The paint budget stays consistent on high-refresh displays. Interrupted avatar animations and animations finishing during verification or page suspension clear their state correctly.
- Effects reset on touch, keyboard navigation, window blur, hidden pages, and verification dialogs. Touch users receive readable badge labels without needing hover.
- Offscreen media pauses; hidden pages, reduced motion, and Data Saver use static media. Turnstile loads only when verification is needed.
- Bounded lookup caches, request deadlines, smaller avatar previews, and a single raw JSON representation reduce memory, network, and DOM work.
- Cancellation propagates through verification and lookup requests, including upstream requests when the Worker receives the client's disconnect signal. Retried verification ignores superseded responses.
- Keyboard controls, native avatar/badge buttons, visible focus rings, accessible verification focus handling, and a separate pointer-effects setting.
- Organized assets and source modules, with no test files or build dependencies.

## Files

```text
index.html           Page structure and metadata
assets/css/app.css   Themes, components, responsive layouts
assets/js/app.js     Lookup, rendering, settings, keyboard controls
assets/js/effects.js Pointer glow and avatar animation scheduler
assets/js/media.js   Media visibility and playback lifecycle
assets/images/       Icons and branding used by the page
worker.js            Discord proxy and Turnstile verification
wrangler.toml        Cloudflare Worker deployment configuration
```

## Local development

Serve the repository over HTTP using a static server and open `index.html`. There is no install or frontend build step. JavaScript modules and Turnstile require HTTP rather than `file://`.

The frontend `API_BASE` is in `assets/js/app.js`. For local Worker development, copy `.dev.vars.example` to `.dev.vars`, replace its placeholders, and run `npx wrangler dev`. Point the local frontend at that Worker's `/api` URL. Add the local frontend origin to `ALLOWED_ORIGINS` and its hostname to the Turnstile widget. Restore the production `API_BASE` before deployment.

With Node 22 or newer, `npm run check` checks the JavaScript syntax. The same check runs in GitHub Actions on Linux and Windows. No test files are retained in the repository.

## Keyboard

| Key | Action |
| --- | --- |
| `/`, `Ctrl K`, `⌘ K` | Focus and select the search field |
| `←`, `→`, `Home`, `End` on lookup tabs | Select user or server lookup |
| `Enter` | Submit a lookup or activate a focused control |
| `Space` | Activate a focused button or switch |
| `T` | Change theme |
| `R` | Toggle reduced motion |
| `H` | Show or hide help |
| `S` | Open or close settings |
| `Esc` | Close verification, settings, or expanded badge details |

Single-letter shortcuts are inactive while typing. Standard Tab and Shift Tab navigation work throughout the page. Verification keeps focus in its dialog and restores it on close. System reduced-motion preferences are respected.

## Worker setup

The Worker uses Discord REST API v10, validates Turnstile on the server, and issues signed browser-session tokens. Configure:

| Value | Purpose |
| --- | --- |
| `BOT_TOKEN` | Secret Discord bot token |
| `TURNSTILE_SITE_KEY` | Public Turnstile widget key |
| `TURNSTILE_SECRET_KEY` | Secret Turnstile validation key |
| `CAPTCHA_SESSION_SECRET` | Random signing secret, at least 32 characters |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins |
| `TURNSTILE_ALLOWED_HOSTNAMES` | Comma-separated widget hostnames |
| `CAPTCHA_SESSION_MINUTES` | Session lifetime, 5–30 minutes; default 15 |

Create a Managed Turnstile widget for `discord-id-hub.info`. Set production values without committing credentials:

```powershell
npx wrangler secret put BOT_TOKEN
npx wrangler secret put TURNSTILE_SITE_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put CAPTCHA_SESSION_SECRET
npx wrangler deploy
```

`wrangler.toml` retains the `discord-api-search` Worker and production origin. Publish `index.html`, `assets/`, and `CNAME` through the existing GitHub Pages configuration. After deploying both parts, `/api/ping` should report `app_version: "1.5"` and `captcha_enabled: true`. Verify both example lookups, verification, and shared URLs on the production origin.

## Data availability

Guild lookups require the bot to be in the server. REST lookups do not normally include activity/presence or every equipped cosmetic; the UI renders forwarded data when available and explains missing data. Exact Nitro status can be unavailable, and missing cosmetics do not establish that someone lacks Nitro. Lookup history and preferences stay on the device.

## License

MIT for this app's code. Discord assets and branding belong to Discord Inc.
