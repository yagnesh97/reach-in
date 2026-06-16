# ReachIn Documentation Coverage Report

Generated from full repository analysis. All behavior documented is verified against source code only.

---

## Files Analyzed

| File | Type | Lines | Status |
|------|------|-------|--------|
| `manifest.json` | Manifest V3 | 31 | Analyzed |
| `popup.html` | HTML (popup UI) | ~190 | Analyzed |
| `assets/js/popup.js` | JavaScript (popup logic) | ~870 | Analyzed |
| `assets/js/outreach-templates.js` | JavaScript (outreach templates) | ~55 | Analyzed |
| `assets/js/content.js` | JavaScript (content script) | 257 | Analyzed |
| `assets/js/background.js` | JavaScript (service worker) | ~200 | Analyzed |
| `assets/js/collection-utils.js` | JavaScript (shared helpers) | ~80 | Analyzed |
| `assets/js/collection-flow-manager.js` | JavaScript (flow orchestrator) | ~400 | Analyzed |
| `assets/css/popup.css` | CSS (theming/layout) | 591 | Analyzed |
| `PRIVACY.md` | Privacy policy | 87 | Analyzed |
| `README.md` | User documentation | 103 | Analyzed |
| `.gitignore` | Git ignore | 44 | Analyzed |
| `LICENSE` | MIT license | — | Noted |

### Referenced but Missing

| Path | Referenced In | Impact |
|------|---------------|--------|
| `assets/icons/icon-16.png` | `manifest.json` | Chrome Web Store packaging |
| `assets/icons/icon-32.png` | `manifest.json` | Chrome Web Store packaging |
| `assets/icons/icon-48.png` | `manifest.json` | Chrome Web Store packaging |
| `assets/icons/icon-128.png` | `manifest.json` | Chrome Web Store packaging |

---

## Permissions Discovered

| Permission | Declared In | Used By |
|------------|-------------|---------|
| `storage` | `manifest.json:6` | All JS modules (`chrome.storage.local`) |
| `activeTab` | `manifest.json:6` | Implicit tab access on user gesture |
| `scripting` | `manifest.json:6` | Declared; not used on smart collect path |

### Implicit Host Access

| Pattern | Mechanism | File |
|---------|-----------|------|
| `https://www.linkedin.com/*` | Content script `matches` | `manifest.json:27` |

No explicit `host_permissions` declared. No `tabs` permission declared despite extensive `chrome.tabs.*` usage.

---

## Chrome APIs Discovered

| API | Module(s) | Purpose |
|-----|-----------|---------|
| `chrome.runtime.onInstalled` | background | Default settings on install |
| `chrome.runtime.onMessage` | background, content | Message routing |
| `chrome.runtime.sendMessage` | popup, background | Popup → background smart collect |
| `chrome.runtime.lastError` | popup, background | Error checking after API calls |
| `chrome.storage.local.get` | all JS | Read persisted state |
| `chrome.storage.local.set` | all JS | Write persisted state |
| `chrome.storage.local.remove` | content | Clear `cachedEmails` |
| `chrome.storage.local.clear` | popup | Clear all data (settings) |
| `chrome.storage.local.getBytesInUse` | popup | Storage usage display |
| `chrome.storage.onChanged` | background, popup | Flow state; scroll progress UI |
| `chrome.tabs.sendMessage` | background | Background → content messaging |
| `chrome.tabs.query` | popup, background | Active tab detection |
| `chrome.tabs.get` | popup, background | Verify collection tab exists |
| `chrome.tabs.create` | background | Open LinkedIn search tab; open mail draft |
| `chrome.tabs.update` | background | Navigate to search URL |
| `chrome.tabs.onUpdated` | background | Flow manager page-ready detection |
| `chrome.tabs.onRemoved` | background | Collection tab cleanup |
| `chrome.tabs.onActivated` | popup | Tab switch state reload |
| `chrome.action.openPopup` | background | Best-effort popup reopen during flow |

### Browser APIs (Non-Chrome)

| API | Module | Purpose |
|-----|--------|---------|
| `navigator.clipboard.writeText` | popup | Copy emails to clipboard |
| `window.matchMedia` | popup | System theme detection |
| DOM APIs | content, popup | UI rendering, LinkedIn interaction |

### APIs Not Used

No `fetch`, `XMLHttpRequest`, WebSocket, or external network calls exist anywhere in the codebase.

---

## Content Scripts Discovered

| Script | Injection Method | Match Pattern |
|--------|------------------|---------------|
| `assets/js/content.js` | Manifest auto-inject | `https://www.linkedin.com/*` |

Guarded by `window.__linkedinEmailCollectorInitialized` in `content.js`.

---

## Service Workers Discovered

| Script | Role |
|--------|------|
| `assets/js/background.js` | MV3 service worker — install defaults, tab lifecycle, popup auto-open |

No separate background page. No offscreen documents.

---

## Popup Pages Discovered

| Page | Entry Point | Views |
|------|-------------|-------|
| `popup.html` | `manifest.json` → `action.default_popup` | Main, History, Settings |

No dedicated options page.

---

## Storage Keys Discovered

| Key | Type | Default | Written By | Read By |
|-----|------|---------|------------|---------|
| `theme` | `"system"\|"light"\|"dark"` | `"system"` | popup, background | popup |
| `scrollSpeed` | `"1000"\|"2000"\|"3000"` | `"2000"` | popup, background | popup → content |
| `autoNavigate` | boolean | `true` | — | **Removed** (always smart collect) |
| `includeUnique` | boolean | `true` | popup, background | popup → background |
| `preferredMailClient` | `"gmail"\|"outlook"\|"mailto"` | `"gmail"` | popup, background | popup |
| `collectionFlowState` | string | `IDLE` | background | popup |
| `collectionIntent` | object | — | background | background |
| `collectionError` | string | — | background | popup |
| `collectionState` | `"idle"\|"collecting"\|"completed"` | `"idle"` | background | popup (legacy) |
| `keywords` | string | — | popup | popup |
| `scrollCount` | string/number | `"20"` (HTML default) | popup | popup |
| `excludeKeywords` | string | — | popup | popup |
| `collectedEmails` | `string[]` | `[]` | background | popup |
| `activeCollectionTabId` | number \| null | `null` | background | popup, background |
| `currentTabUrl` | string | — | popup, background | background |
| `history` | `HistoryItem[]` | `[]` | background | popup |
| `statusText` | string | — | popup (write only) | never read |
| `outreachTemplate` | string | `"jobApplication"` | popup, background | popup |
| `outreachTemplates` | `TemplateItem[]` | seeded | popup, background | popup |
| `generatedSubject` | string | `""` | popup | popup |
| `generatedBody` | string | `""` | popup | popup |
| `scrollProgress` | object | — | content | popup |

---

## Outreach UI Components

| Element ID | Type | Purpose |
|------------|------|---------|
| `#outreachContainer` | panel | Outreach section wrapper |
| `#outreachTemplate` | select | Template picker |
| `#outreachSubject` | input | Email subject |
| `#outreachBody` | textarea | Email body |
| `#openDraftButton` | button | Open mail compose draft (Gmail/Outlook/mailto) |
| `#preferredMailClient` | select | Default mail client setting |
| `#defaultTemplateSelect` | select | Default outreach template |
| `#unsavedIndicator` | indicator | Template editor dirty state |
| `#toastContainer` | container | Toast notification stack |
| `#appTitle` | button | Navigate to main view |
| `#collectionFlowProgress` | stepper | 4-step smart collect progress |
| `#scrollProgressContainer` | panel | Scroll progress wrapper |
| `#scrollProgressFill` | div | Progress bar fill |
| `#scrollProgressText` | div | Progress label |
| `#templateManageSelect` | select | Settings template picker |
| `#templateNameInput` | input | Template name editor |
| `#templateSubjectInput` | input | Template subject editor |
| `#templateBodyInput` | textarea | Template body editor |
| `#saveTemplateButton` | button | Save template |
| `#addTemplateButton` | button | Add new template |
| `#deleteTemplateButton` | button | Delete custom template |
| `#resetTemplateButton` | button | Reset built-in template |

---

## Message Channels Discovered

| Action | Direction | Payload | Response | Status |
|--------|-----------|---------|----------|--------|
| `openPopupOnTabReady` | popup → background | `{ tabId }` | `{ success }` | Legacy (flow manager handles reopen) |
| `startSmartCollect` | popup → background | `{ keywords, scrollCount, excludeKeywords, includeUnique }` | `{ success, error? }` | Active |
| `getCollectionFlow` | popup → background | — | flow state snapshot | Active |
| `updateState` | popup → background | `{ data: object }` | `{ success: true }` | **Unused** |
| `getState` | popup → background | `{ keys?: string[] }` | storage data | **Unused** |
| `collectEmails` | background → content | `{ scrollCount, scrollSpeed, excludeKeywords, includeUnique }` | `{ emails: string[] }` | Active |
| `updateSearchInput` | background → content | `{ keywords: string }` | `{ success: boolean }` | Active |
| `clearCache` | any → content | — | `{ success: true }` | **Unused** |

---

## LinkedIn Selectors Discovered

| Selector | Purpose | File |
|----------|---------|------|
| `.search-global-typeahead__input` | LinkedIn global search input | `content.js:47-48` |
| `.search-global-typeahead__overlay` | Search suggestions overlay | `content.js:106-107` |
| `button.see-more` | Expand truncated content | `content.js:139, 167` |
| `button[aria-label*="see more"]` | Expand truncated content | `content.js:148, 175` |
| `button[aria-label*="Show more"]` | Expand truncated content | `content.js:148, 175` |
| `a[href^="mailto:"]` | Email extraction from links | `content.js:202` |
| `document.body.innerText` + regex | Email extraction from text | `content.js:214-216` |

---

## Documentation Generated

| Document | Path |
|----------|------|
| Documentation Index | `docs/README.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| Project Structure | `docs/PROJECT_STRUCTURE.md` |
| Local Development | `docs/LOCAL_DEVELOPMENT.md` |
| Manifest Reference | `docs/MANIFEST.md` |
| Storage Design | `docs/STORAGE.md` |
| Content Script | `docs/CONTENT_SCRIPT.md` |
| UI and UX | `docs/UI_AND_UX.md` |
| Privacy and Security | `docs/PRIVACY_AND_SECURITY.md` |
| Operations | `docs/OPERATIONS.md` |
| Business Logic | `docs/BUSINESS_LOGIC.md` |
| Code Guidelines | `docs/CODE_GUIDELINES.md` |
| Technical Debt | `docs/TECHNICAL_DEBT.md` |
| Coverage Report | `docs/COVERAGE_REPORT.md` |

## Cursor Rules Generated

| Rule | Path |
|------|------|
| Chrome Extension Architecture | `.cursor/rules/chrome-extension-architecture.mdc` |
| JavaScript Standards | `.cursor/rules/javascript-standards.mdc` |
| Chrome API Usage | `.cursor/rules/chrome-api-usage.mdc` |
| Content Script | `.cursor/rules/content-script.mdc` |
| Security | `.cursor/rules/security.mdc` |
| Privacy | `.cursor/rules/privacy.mdc` |
| Testing | `.cursor/rules/testing.mdc` |

---

## UI Modules (Phase 1.5 + Smart Collect)

| File | Purpose |
|------|---------|
| `assets/js/ui/icons.js` | Centralized SVG icon library (`Icons`, `renderIcon`, `createIconButton`) |
| `assets/js/collection-utils.js` | Shared keyword/URL helpers + flow state constants |
| `assets/js/collection-flow-manager.js` | Background collection orchestrator |
| `assets/js/ui/toast.js` | Toast notifications (`showToast`) |
| `assets/js/mail-clients.js` | Mail draft URL builders (`buildMailDraftUrl`) |

---

## Knowledge Gaps Requiring Human Clarification

1. **Icon assets** — `manifest.json` references four PNG icons under `assets/icons/` that are not present in the repository. Are they stored elsewhere, gitignored intentionally, or pending creation?

2. **Chrome Web Store listing assets** — No store listing metadata, screenshots, support email, or hosted privacy policy URL in the repository.

3. **LinkedIn Terms of Service** — README includes a usage notice but no formal legal review for Chrome Web Store submission.

4. **`tabs` permission** — Extension uses `chrome.tabs.query`, `chrome.tabs.get`, `chrome.tabs.create`, `chrome.tabs.update`, and tab event listeners without declaring the `tabs` permission. Confirm this is intentional and sufficient for target Chrome versions.

5. **README clone URL** — `README.md` contains placeholder `https://github.com/your-username/reachin.git`.

6. **Dead message handlers** — `updateState`, `getState` (background) and `clearCache` (content) exist but have no callers. Intentional for future use or should be removed?
