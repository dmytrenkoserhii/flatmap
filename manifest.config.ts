import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'FlatMap',
  version: '0.2.0',
  content_scripts: [
    {
      matches: [
        'https://www.olx.ua/d/obyavlenie/*',
        'https://www.olx.ua/d/*/obyavlenie/*',
      ],
      js: ['src/main.tsx'],
      run_at: 'document_idle',
    },
  ],
})
