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
pnpm install --frozen-lockfile
```

For future MapTiler integration, copy `.env.example` to `.env.local` and add your
key. The current version does not read the key or call MapTiler.

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
