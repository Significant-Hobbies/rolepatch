# RolePatch Chrome Extension

Manifest V3 Chrome extension. Adds a toolbar button that scrapes the job
description from the active tab and sends it to RolePatch.

## Build

```bash
corepack pnpm install
corepack pnpm --filter @rolepatch/extension build
```

Output lands in `extension/dist/` (manifest, bundled JS, popup, icons).

## Dev (watch mode)

```bash
corepack pnpm --filter @rolepatch/extension dev
```

## Load unpacked in Chrome

1. Open `chrome://extensions`
2. Toggle **Developer mode** on (top right)
3. Click **Load unpacked**
4. Select `extension/dist/`

The RolePatch icon appears in the toolbar. Click it on any job page and hit
**Tailor with RolePatch**.

## API base

The popup has an **API base** field (bottom). Defaults to
`http://localhost:3000`. Change it to the prod URL (e.g.
`https://rolepatch.com`) when using against production.

## Auth

The service worker reads your RolePatch NextAuth session cookie
(`next-auth.session-token` or `__Secure-next-auth.session-token`) via
`chrome.cookies.get` and forwards it both as a normal cookie (via
`credentials: 'include'`) and via an `x-rolepatch-session` header for cases
where cross-origin cookie propagation is blocked. You must be signed in to
RolePatch in the same browser profile.

## How scraping works

`src/content.ts` tries site-specific selectors first for Greenhouse, Lever,
LinkedIn, and Workday. If none match, it falls back to `document.body.innerText`.
Works on any page via `activeTab` + on-demand injection — no permanent
content scripts registered.

## Files

```
extension/
├── manifest.json           # MV3 manifest (copied to dist/)
├── src/
│   ├── background.ts       # Service worker: POSTs to RolePatch
│   ├── content.ts          # Scrapes JD from the active page
│   ├── popup.html          # Toolbar popup UI
│   ├── popup.ts            # Popup logic
│   ├── config.ts           # API base storage
│   └── types.ts            # Shared message types
├── icons/                  # 16/48/128 PNG placeholders
├── scripts/
│   └── copy-static.mjs     # Copies manifest/popup/icons into dist/
└── tsconfig.json
```
