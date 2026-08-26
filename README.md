# Discord API Search v1.2

Unofficial static Discord snowflake lookup for public user and guild data. The browser talks to a lightweight Cloudflare Worker proxy, and the Worker talks to Discord REST API v10 so the bot token never ships to clients.

## What's New In v1.2

- Added an occasional Cloudflare Turnstile verification workflow backed by mandatory Worker-side Siteverify validation and short-lived signed lookup sessions.
- Visible interactive and data surfaces now gain a Windows-style proximity glow near the pointer, including result cards, segmented controls, pills, fields, badges, and information cards.
- Proximity glow targets are limited to visible, intentional surfaces; hidden settings and large nested wrapper containers no longer reveal their layout boxes.
- The static Help, Settings, and CAPTCHA areas are excluded from proximity lighting, while user and guild result lighting inherits the returned profile or banner accent color.
- Share Lookup now copies a stable permalink instead of invoking browser-native share sheets that can crash some Chromium shells.
- Share Lookup buttons show a clear animated checkmark and "Copied" confirmation after the permalink reaches the clipboard.
- Light mode now uses contrast-safe semantic colors, visible surface fills, and a frosted identity backing for names displayed over banners.
- Avatar-decoration API fields now copy the displayed SKU ID rather than the separate decoration asset hash.
- User cards render forwarded Profile Effects and experimental Profile Frames as full-card visual layers, with dedicated cosmetic status cards and raw field details.
- Animated avatars, banners, and guild media now play by default. Reduced Motion switches them to static media until hover or keyboard focus.
- User cards can render activity and presence whenever the proxy forwards Discord Gateway presence data, with an honest unavailable state for REST-only results.
- Nitro-unknown results now explain that subscribers are not required to use animated avatars or custom banners, so missing cosmetics never means "no Nitro."
- Profile-picture proximity shaking now scales continuously with cursor distance, smoothly blending speed, strength, rotation, and retreat instead of jumping between three stages.
- Bot accounts are always treated as ineligible for Nitro, even when malformed or forwarded data contains premium signals.
- Verified Bot and Bot account badges now use distinct verified-check and bot-head icons.
- Successful lookups now have shareable URLs, and shared links reopen the correct user or guild automatically.
- Up to five recent successful lookups are saved locally for quick reuse, with a one-click history clear action.
- Search now provides inline feedback for raw IDs, mentions, and profile links, plus clearer loading, disabled, and error states.
- Added a skip link, improved result focus behavior, safer settings focus handling, forced-colors support, and larger touch targets.
- Refined spacing, contrast, surfaces, responsive behavior, and reduced-motion handling for a cleaner and sharper interface.
- Added a dedicated v1.2 social preview card for clearer, more polished shared links.
- The guild/server example now uses `1263989148092469259`.
- Nitro detection now prioritizes explicit premium fields and forwarded Nitro badges, then uses a custom profile banner or animated avatar as strong Nitro-only public evidence.
- Missing premium data is shown as unknown instead of incorrectly claiming that the user has no Nitro. Discord restricts exact `premium_type` access to approved apps with the `identify.premium` OAuth scope.
- Nitro results now explain the evidence used, distinguishing confirmed data from a public-profile inference.

## What's New In v1.1

- A unified, deduplicated profile badge row now includes Discord public flags, forwarded profile badges, explicit Nitro status, bot/system markers, and the user's primary server tag.
- Server-tag badges use Discord's tag artwork and resolve the server name when the proxy bot can access that guild.
- Nitro badges in v1.1 appeared only when Discord or the proxy returned an explicit premium signal.
- Badge labels are hidden by default; hovering or focusing a badge reveals an animated detail card, with an accessibility setting to keep labels visible.
- The avatar and decoration now have an arrival bounce, click reaction, and three cursor-proximity stress stages. Reduced motion disables every one of these effects.
- Copyable IDs, metadata, and raw JSON are now copied by clicking the whole field, while ID search controls remain separate actions.
- Accent colors now visibly shape the user card, media edge, metadata, and field styling instead of appearing as only a faint glow.
- Removed the visible status-toast pills while retaining screen-reader announcements.
- Reworked phone and tablet layouts with denser metrics, touch-friendly actions, safe-area spacing, and a cleaner mobile header/profile card.

## What's New In v1

- Current Discord REST API v10 references and Worker example.
- Adaptive Discord CDN resources for avatars, banners, guild icons, avatar decorations, guild tag badges, and public badge icons.
- Current official `public_flags` badge support from Discord's User object docs.
- API-provided profile accent colors tint user cards, and guild banner colors tint guild cards when Discord returns them.
- The header logo now plays a clean click animation instead of navigating.
- Settings uses the local `resources/1722-gear.svg` asset.
- Fresh responsive interface with working user/guild tabs, retry, clear, examples, settings, copy actions, raw JSON, theme, reduced motion, auto search, and badge label controls.
- Guild feature inspection, member/presence counts, moderation metadata, vanity links, and bot invite guidance.
- Encoding cleanup for previously corrupted UI text.

## Features

- User lookup by Discord snowflake ID.
- Guild/server lookup by Discord snowflake ID with `with_counts=true`.
- Avatar, banner, icon, splash, decoration, Profile Effect, Profile Frame, and badge rendering through Discord CDN resources when Discord returns a usable asset URL.
- Public badges from `public_flags`, plus forwarded badge arrays if Discord or the proxy returns actual badge entries.
- Nitro and primary guild tags join public profile badges when Discord exposes them. Custom profile banners and animated avatars also provide a clearly labeled Nitro inference; avatar decorations, nameplates, and other collectibles are not treated as proof because they can be acquired separately.
- Owner ID quick-search from guild results.
- Snowflake creation dates and account/server age.
- Click-to-copy fields for IDs, metadata, and raw JSON.
- Shareable lookup links and device-local recent searches.
- Conditional Discord activity/presence rendering when Gateway data is forwarded by the proxy.
- Server-verified Turnstile protection with short-lived browser-session access.
- Detailed error handling for 404, 429, network, and upstream/proxy failures.
- Local settings for light theme, reduced motion, auto search, and badge labels.

## Architecture

```text
GitHub Pages static app
  -> Cloudflare Worker proxy
     -> Cloudflare Turnstile Siteverify
  -> Discord REST API v10
```

The frontend `API_BASE` lives in `script.js`:

```js
const API_BASE = 'https://discord-api-search.bbrraaggee.workers.dev/api';
```

## Quick Start

Serve the directory over local HTTP and open it in a modern browser. Turnstile does not support `file://` pages. For local CAPTCHA testing, add the local origin to `ALLOWED_ORIGINS` and the local hostname to the Turnstile widget configuration. There is no frontend build step.

## Secure Worker Setup

The deployable Worker implementation lives in `worker.js`. It validates every Turnstile response on the server, checks the expected action and hostname, and returns a signed session token that expires after 15 minutes by default. The Turnstile secret and signing secret never enter browser code.

Configure these Worker values before deployment:

- Secret `BOT_TOKEN`: Discord bot token.
- Variable `TURNSTILE_SITE_KEY`: public Turnstile widget site key.
- Secret `TURNSTILE_SECRET_KEY`: Turnstile server validation secret.
- Secret `CAPTCHA_SESSION_SECRET`: random signing secret of at least 32 characters.
- Variable `ALLOWED_ORIGINS`: comma-separated browser origins; defaults to `https://discord-id-hub.info`.
- Variable `TURNSTILE_ALLOWED_HOSTNAMES`: comma-separated widget hostnames; defaults to `discord-id-hub.info`.
- Optional variable `CAPTCHA_SESSION_MINUTES`: between 5 and 30 minutes; defaults to 15.

Create a Cloudflare Turnstile widget in Managed mode for `discord-id-hub.info`, then add its keys and the Worker secrets without committing them:

```powershell
npx wrangler secret put BOT_TOKEN
npx wrangler secret put TURNSTILE_SITE_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put CAPTCHA_SESSION_SECRET
npx wrangler deploy
```

The included `wrangler.toml` deploys to the existing `discord-api-search` Worker name and configures the production origin, allowed Turnstile hostname, and 15-minute verification session. The Worker deliberately fails closed when Turnstile is incomplete. A client-side widget by itself is not security. Add Cloudflare rate limiting to the lookup routes as a second abuse-control layer.

## Notes

- Discord API v10 is the current available REST API version in Discord's official API versioning table.
- Exact Nitro status is not generally available to bot-token lookups. `premium_type` requires the `identify.premium` OAuth scope, so absent premium data remains unknown. Nitro users do not have to use a banner or animated avatar; cosmetics can support an inference, but their absence proves nothing.
- Activity is a Discord Gateway presence field, not part of the standard Get User REST result. The UI renders `activities`, `presence.activities`, and presence status when an approved Gateway service forwards them. `GUILD_PRESENCES` is a privileged intent for verified apps.
- Discord's documented User object currently exposes avatar decorations and nameplates but not equipped Profile Effects or the experimental Profile Frame field. The UI supports common forwarded field shapes and Discord-hosted asset URLs, and clearly says when the public lookup omits them instead of guessing an equipped cosmetic.
- Guild lookups require the Worker bot to be in the target guild. A `10004 Unknown Guild` response usually means the bot needs to be invited.
- Discord IDs are snowflakes. The app derives creation time locally from the snowflake timestamp.

## License

MIT for this app's code. Discord assets, resources, and branding belong to Discord Inc.
