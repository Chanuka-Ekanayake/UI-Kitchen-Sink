import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Vite React Chrome Extension',
  version: '1.0.0',
  description: 'High-performance Chrome Extension with React 19 and Tailwind CSS v4',
  side_panel: {
    default_path: 'sidepanel.html'
  },
  permissions: ['sidePanel', 'storage', 'activeTab', 'scripting', 'tabs'],
  host_permissions: ['http://localhost/*', 'http://127.0.0.1/*', 'https://*/*'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module'
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts']
    }
  ],
  action: {
    default_title: 'Click to open side panel'
  }
})
