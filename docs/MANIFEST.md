# ReachIn Manifest Reference

Complete reference for [`manifest.json`](../manifest.json).

---

## Manifest Version

```json
"manifest_version": 3
```

ReachIn uses **Manifest V3**. Key MV3 characteristics in this extension:

- Service worker replaces persistent background page (`background.service_worker`)
- Content scripts registered in manifest (not programmatic `<script>` injection except via `chrome.scripting`)
- No remotely hosted code
- Action API replaces browserAction/pageAction (`action.default_popup`)

---

## Extension Metadata

| Field | Value | Notes |
|-------|-------|-------|
| `name` | `"ReachIn"` | Display name |
| `version` | `"1.1.0"` | Semver; also shown in Settings About section |
| `description` | LinkedIn email collection from search results | Store listing description |

---

## Permissions

### `storage`

**Declared:** `manifest.json:6`

**Why it exists:** Persist user settings, collection history, session state, and cross-session email cache locally.

**Where used:**

| File | Usage |
|------|-------|
| `background.js` | Default settings on install; collection state cleanup; `currentTabUrl` |
| `popup.js` | Settings, form state, history, collection results, storage usage |
| `content.js` | `cachedEmails` for unique email deduplication |

**Security implications:** Data stays on device in Chrome's encrypted local storage. No sync to other devices (uses `local`, not `sync`). User can clear all data from Settings.

### `activeTab`

**Declared:** `manifest.json:6`

**Why it exists:** Grant temporary access to the active tab when the user invokes the extension (clicks icon or popup action).

**Where used:** Implicitly enables:
- `chrome.tabs.sendMessage` to the active LinkedIn tab
- `chrome.scripting.executeScript` on the active tab during collection
- Tab URL access via `chrome.tabs.query`

**Security implications:** Access is limited to the tab the user interacted with. Does not grant access to background tabs. Does not persist beyond the user gesture window for some operations.

**Note:** The extension also uses `chrome.tabs.create` and `chrome.tabs.update` for navigation, which operate on tabs the extension creates/navigates but may have different permission requirements than `activeTab` alone.

### `scripting`

**Declared:** `manifest.json:6`

**Why it exists:** Programmatically inject `content.js` when collection starts.

**Where used:**

```528:532:assets/js/popup.js
      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          files: ["assets/js/content.js"],
        },
```

**Security implications:** Injection only occurs on user-initiated collection. Target is a specific tab ID, not arbitrary URLs.

---

## Host Permissions

**Not explicitly declared.** Host access is granted implicitly via content script match pattern:

```json
"matches": ["https://www.linkedin.com/*"]
```

This allows the content script to run on LinkedIn pages only. The popup navigates to LinkedIn URLs via `chrome.tabs.create`/`update` without a separate `host_permissions` entry.

---

## Content Scripts

```json
"content_scripts": [
  {
    "matches": ["https://www.linkedin.com/*"],
    "js": ["assets/js/content.js"]
  }
]
```

| Property | Value | Notes |
|----------|-------|-------|
| `matches` | `https://www.linkedin.com/*` | All LinkedIn pages |
| `js` | `assets/js/content.js` | Single content script |
| `run_at` | (default: `document_idle`) | Runs after DOM is ready |
| `all_frames` | (default: `false`) | Top frame only |

No CSS injection. No `world: "MAIN"` — runs in isolated content script world.

Additionally re-injected programmatically during collection. See [Architecture — Dual Injection](ARCHITECTURE.md#dual-content-script-injection).

---

## Service Worker

```json
"background": {
  "service_worker": "assets/js/background.js"
}
```

| Property | Notes |
|----------|-------|
| Type | Event-driven service worker (MV3) |
| Persistence | Not persistent; Chrome may terminate between events |
| Module type | Classic script (not `"type": "module"`) |

No `importScripts`. No offscreen documents.

---

## Action (Popup Entry Point)

```json
"action": {
  "default_popup": "popup.html",
  "default_icon": { ... }
}
```

Clicking the extension toolbar icon opens `popup.html` in a popup window (400×600px per CSS).

---

## Icons

```json
"icons": {
  "16": "assets/icons/icon-16.png",
  "32": "assets/icons/icon-32.png",
  "48": "assets/icons/icon-48.png",
  "128": "assets/icons/icon-128.png"
}
```

**Status:** Referenced but files are missing from the repository. Required for Chrome Web Store.

---

## Web Accessible Resources

**Not declared.** ReachIn does not expose any extension resources to web pages.

---

## Extension Entry Points

| Entry Point | File | Trigger |
|-------------|------|---------|
| Popup | `popup.html` | User clicks toolbar icon |
| Service worker | `assets/js/background.js` | Extension install, messages, tab events |
| Content script | `assets/js/content.js` | LinkedIn page load (auto) or collection (programmatic) |

No options page. No devtools page. No side panel. No omnibox.

---

## Not Present in Manifest

The following MV3 features are intentionally absent:

| Feature | Status |
|---------|--------|
| `options_page` / `options_ui` | Settings in popup |
| `host_permissions` | Implicit via content_scripts |
| `web_accessible_resources` | Not needed |
| `content_security_policy` | Default MV3 CSP applies |
| `externally_connectable` | No external connections |
| `oauth2` | No authentication |
| `commands` | No keyboard shortcuts |
| `declarativeNetRequest` | No network interception |

---

## Chrome Web Store Considerations

For store submission, verify:

1. All four icon PNGs exist and meet [Chrome icon requirements](https://developer.chrome.com/docs/webstore/images/)
2. Permission justifications match store listing (see [`PRIVACY_AND_SECURITY.md`](PRIVACY_AND_SECURITY.md))
3. Single purpose: email collection from LinkedIn search results
4. Privacy policy URL points to hosted `PRIVACY.md` content

---

## Related Documentation

- [Architecture](ARCHITECTURE.md)
- [Privacy and Security](PRIVACY_AND_SECURITY.md)
- [Coverage Report](COVERAGE_REPORT.md)
