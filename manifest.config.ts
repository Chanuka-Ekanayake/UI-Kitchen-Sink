import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'UI Validator',
  version: '1.0.0',
  description: 'UI Validation extension for Audi UI Kits on any web page',

  icons: {
    '16':  'icons/Logo-sm.png',
    '32':  'icons/Logo-md.png',
    '48':  'icons/Logo-lg.png',
    '128': 'icons/Logo.png',
  },

  // ── Action: icon-only, NO default_popup ────────────────────────────────────
  // Having a default_popup prevents chrome.action.onClicked from firing,
  // which would break our manual sidePanel.open() call on Edge/Arc.
  action: {
    default_icon: {
      '16':  'icons/Logo-sm.png',
      '32':  'icons/Logo-md.png',
      '48':  'icons/Logo-lg.png',
      '128': 'icons/Logo.png',
    },
    default_title: 'UI Validator',
    // default_popup is intentionally omitted.
  },

  // ── Side panel registration ─────────────────────────────────────────────────
  // Must be a sibling of "action" at the manifest root.
  side_panel: {
    default_path: 'sidepanel.html',
  },

  // ── Permissions ────────────────────────────────────────────────────────────
  // "sidePanel" and "tabs" must both be present for Edge/Arc compatibility.
  permissions: ['sidePanel', 'storage', 'activeTab', 'scripting', 'tabs'],
  host_permissions: ['<all_urls>'],

  // ── Background service worker ───────────────────────────────────────────────
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },

  // ── Content scripts ─────────────────────────────────────────────────────────
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
    },
  ],
})
