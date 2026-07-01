# FlatMap

FlatMap is a Chrome extension that adds a small React interface to OLX Ukraine
listing pages. This initial version only verifies that the extension and React
content script work; map and geocoding features will be added later.

## Requirements

- Node.js 22 or newer
- pnpm 10 or newer
- Google Chrome

## Setup

```powershell
corepack enable
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env.local` and add your MapTiler key:

```powershell
Copy-Item .env.example .env.local
```

```env
VITE_MAPTILER_API_KEY=your_maptiler_key
```

The extension uses this key to geocode listing locations and render the map.

## Commands

```powershell
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm format
pnpm format:check
```

## Load In Chrome

1. Run `pnpm build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the generated `dist` directory.
5. Open an OLX Ukraine listing page.
6. Click the **FlatMap** button in the bottom-right corner. It should change to
   **React працює!**.

The content script is limited to OLX listing URLs and requests no additional
Chrome permissions.
