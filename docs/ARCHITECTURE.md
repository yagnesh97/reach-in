# ReachIn Architecture

Engineering reference for the ReachIn Chrome Extension (Manifest V3).

---

## Executive Summary

**ReachIn** is a Chrome Extension that collects publicly visible email addresses from LinkedIn content search result pages. All processing occurs locally in the browser; no external APIs, analytics, or remote servers are used.

### Core Features

- Keyword-based LinkedIn content search navigation
- Auto-scroll and "see more" expansion on search results
- Email extraction from `mailto:` links and page text
- Keyword-based email exclusion filtering
- Cross-session unique email deduplication (optional)
- Collection history with copy and delete
- Light, dark, and system themes
- Local storage via `chrome.storage.local`

### Extension Responsibilities

| Component | Responsibility |
|-----------|----------------|
| Popup (`popup.js`) | User interface, navigation orchestration, collection lifecycle, history, settings |
| Content script (`content.js`) | LinkedIn DOM interaction, scrolling, expansion, email extraction |
| Service worker (`background.js`) | Install defaults, tab lifecycle, popup auto-open, state cleanup |
| Storage layer | Persist settings, session state, email cache, and history |

---

## High-Level Architecture

```mermaid
flowchart TB
  subgraph userLayer [User Layer]
    User[User]
    PopupUI[popup.html + popup.js]
  end

  subgraph extensionCore [Extension Core]
    SW[background.js Service Worker]
    CS[content.js Content Script]
  end

  subgraph chromeApis [Chrome APIs]
    Storage[chrome.storage.local]
    Tabs[chrome.tabs]
    Scripting[chrome.scripting]
    Runtime[chrome.runtime messaging]
    Action[chrome.action.openPopup]
  end

  subgraph external [External]
    LinkedIn[linkedin.com DOM]
  end

  User --> PopupUI
  PopupUI -->|tabs.sendMessage| CS
  PopupUI -->|runtime.sendMessage| SW
  PopupUI -->|executeScript| CS
  PopupUI --> Tabs
  PopupUI --> Storage
  SW --> Storage
  SW --> Tabs
  SW --> Action
  CS --> Storage
  CS --> LinkedIn
```

### Popup UI

Entry point: `manifest.json` → `action.default_popup` → `popup.html`.

The popup is the primary orchestrator. It reads/writes storage, queries and navigates tabs, injects the content script, and sends collection commands. It does not touch the LinkedIn DOM directly.

See [`UI_AND_UX.md`](UI_AND_UX.md) for view structure and user flows.

### Content Scripts

Registered in `manifest.json` for `https://www.linkedin.com/*`. Also re-injected via `chrome.scripting.executeScript` when collection starts (see dual injection below).

Responsibilities: scroll page, click expand buttons, extract emails, update LinkedIn search input.

See [`CONTENT_SCRIPT.md`](CONTENT_SCRIPT.md) for DOM interaction details.

### Service Worker

Single file: `assets/js/background.js`. No persistent background page.

Responsibilities:
- Initialize default settings on install
- Track pending popup auto-open requests
- Reset collection state when collection tab closes or refreshes
- Store `currentTabUrl` on tab navigation complete

### Chrome APIs

All Chrome API usage is local to the three JS modules. No network APIs are used. Full inventory in [`COVERAGE_REPORT.md`](COVERAGE_REPORT.md).

### Storage Layer

Single namespace: `chrome.storage.local`. Keys documented in [`STORAGE.md`](STORAGE.md).

### LinkedIn Interaction Layer

Content script operates exclusively on LinkedIn pages. Selectors and extraction logic are in `assets/js/content.js`. Navigation URL pattern:

```
https://www.linkedin.com/search/results/content/?keywords={processed}&origin=GLOBAL_SEARCH_HEADER&sortBy=date_posted
```

---

## Component Diagram

```mermaid
flowchart LR
  subgraph popup [Popup Module]
    init[init]
    handleCollect[handleCollect]
    startCollection[startEmailCollection]
    history[saveToHistory / loadHistory]
    settings[loadSettings / applyTheme]
  end

  subgraph content [Content Script Module]
    scrollExtract[scrollAndExtract]
    extract[extractEmails]
    updateSearch[updateLinkedInSearch]
  end

  subgraph background [Service Worker Module]
    onInstalled[onInstalled defaults]
    popupReady[openPopupOnTabReady]
    tabLifecycle[tabs.onUpdated / onRemoved]
  end

  handleCollect --> startCollection
  startCollection -->|executeScript + sendMessage| scrollExtract
  handleCollect -->|sendMessage| updateSearch
  scrollExtract --> extract
  startCollection --> history
  popupReady --> onInstalled
```

---

## Extension Lifecycle

### Installation

```mermaid
sequenceDiagram
  participant Chrome
  participant SW as background.js
  participant Storage as chrome.storage.local

  Chrome->>SW: runtime.onInstalled
  SW->>Storage: get theme scrollSpeed autoNavigate preferredMailClient includeUnique
  alt Missing defaults
    SW->>Storage: set defaults including preferredMailClient gmail includeUnique true
  end
```

Triggered by `chrome.runtime.onInstalled` in `background.js:4-25`.

### Activation (Popup Open)

```mermaid
sequenceDiagram
  participant User
  participant Popup as popup.js
  participant Storage as chrome.storage.local
  participant Tabs as chrome.tabs

  User->>Popup: Open extension popup
  Popup->>Popup: DOMContentLoaded → init
  Popup->>Storage: loadSettings
  Popup->>Storage: resetStateOnOpen
  Popup->>Tabs: checkCurrentTab
  Popup->>Popup: startPlaceholderRotation
  Popup->>Popup: setupEventListeners
```

`resetStateOnOpen()` verifies the active collection tab still exists; resets state if closed.

### Collection Flow

```mermaid
sequenceDiagram
  participant User
  participant Popup as popup.js
  participant Tabs as chrome.tabs
  participant CS as content.js
  participant Storage as chrome.storage.local

  User->>Popup: Click Collect button
  Popup->>Popup: handleCollect navigation decision
  alt On correct search page
    Popup->>Storage: set collectionState collecting
    Popup->>Tabs: scripting.executeScript content.js
    Popup->>CS: sendMessage collectEmails
    CS->>CS: scrollAndExtract
    CS->>CS: finishExtraction extractEmails
    CS-->>Popup: emails array
    Popup->>Storage: set collectedEmails collectionState completed
    Popup->>Popup: displayEmails saveToHistory
  end
```

Full navigation decision tree in [`BUSINESS_LOGIC.md`](BUSINESS_LOGIC.md).

### Data Persistence

- **Settings**: Written on change; loaded on popup open
- **Session state**: `collectionState`, `collectedEmails`, `activeCollectionTabId` during collection
- **History**: Appended on successful collection; capped at 50 entries
- **Email cache**: Updated in content script when `includeUnique` is enabled

### History Management

`saveToHistory()` prepends a new entry with `id`, `date`, `keywords`, `emails`, and `count`. Entries beyond 50 are truncated. Individual entries can be deleted from the History view.

---

## Message Passing Architecture

### Overview

ReachIn uses two messaging channels:

1. **Popup → Content** via `chrome.tabs.sendMessage` (tab-scoped)
2. **Popup → Background** via `chrome.runtime.sendMessage` (extension-scoped)

The content script listens via `chrome.runtime.onMessage`. The background listens via `chrome.runtime.onMessage`.

### Message Registry

| Action | Sender | Receiver | Async | Payload | Response |
|--------|--------|----------|-------|---------|----------|
| `collectEmails` | popup | content | Yes (`return true`) | `{ scrollCount, scrollSpeed, excludeKeywords, includeUnique }` | `{ emails: string[] }` |
| `updateSearchInput` | popup | content | Yes | `{ keywords: string }` | `{ success: boolean }` |
| `clearCache` | — | content | No | — | `{ success: true }` (unused) |
| `openPopupOnTabReady` | popup | background | Yes | `{ tabId: number }` | `{ success: true }` |
| `updateState` | — | background | Yes | `{ data: object }` | `{ success: true }` (unused) |
| `getState` | — | background | Yes | `{ keys?: string[] }` | storage data (unused) |

### Collection Sequence Diagram

```mermaid
sequenceDiagram
  participant Popup as popup.js
  participant Scripting as chrome.scripting
  participant CS as content.js
  participant DOM as LinkedIn DOM

  Popup->>Scripting: executeScript content.js
  Scripting->>CS: Inject script
  Note over Popup,CS: 800ms delay
  Popup->>CS: collectEmails
  loop scrollCount times every scrollSpeed ms
    CS->>DOM: main scrollBy innerHeight
    CS->>DOM: click see-more buttons
  end
  CS->>DOM: final see-more pass
  Note over CS: 2000ms wait
  CS->>DOM: query mailto links + innerText regex
  CS-->>Popup: emails
```

### Dual Content Script Injection

The content script is injected two ways:

1. **Manifest registration** — auto-injected on every LinkedIn page load
2. **Programmatic injection** — `chrome.scripting.executeScript` in `startEmailCollection()` at `popup.js:528-532`

The IIFE guard prevents double initialization:

```javascript
if (window.__linkedinEmailCollectorInitialized) {
  return;
}
window.__linkedinEmailCollectorInitialized = true;
```

Programmatic re-injection ensures the script is present even if the manifest injection failed or the page was loaded before extension install.

---

## Data Flow

```mermaid
flowchart TD
  Input[User enters keywords scroll count exclusions]
  Input --> Process[processKeywords AND join]
  Process --> Navigate[Navigation decision 4 cases]
  Navigate --> Scroll[Content script scroll + expand]
  Scroll --> Extract[extractEmails mailto + regex]
  Extract --> Filter[shouldExclude + cachedEmails dedup]
  Filter --> Display[displayEmails in popup]
  Display --> Persist[storage.local collectedEmails]
  Display --> History[saveToHistory max 50]
  Display --> Copy[navigator.clipboard optional]
  Display --> Outreach[Outreach section visible]
  Outreach --> AutoFill[applySelectedTemplate from storage]
  AutoFill --> MailDraft[openMailDraft via buildMailDraftUrl]
  Display --> Progress[scrollProgress in storage]
  Progress --> PopupBar[popup progress bar]
```

### Outreach Flow (Popup Only)

Outreach is implemented entirely in the popup. No content script or service worker involvement.

```mermaid
sequenceDiagram
  participant User
  participant Popup as popup.js
  participant Templates as outreach-templates.js
  participant Storage as chrome.storage.local
  participant Mail as mail-clients.js
  participant Client as Gmail / Outlook / mailto

  User->>Popup: Select template
  Popup->>Storage: get outreachTemplates preferredMailClient
  Storage-->>Popup: template subject body mail client
  Popup->>Popup: applySelectedTemplate
  User->>Popup: Click Open Draft
  Popup->>Mail: buildMailDraftUrl
  Mail-->>Popup: compose URL
  Popup->>Client: chrome.tabs.create
```

Mail compose URL formats (`assets/js/mail-clients.js`):

| Client | URL pattern |
|--------|-------------|
| Gmail | `https://mail.google.com/mail/?view=cm&bcc=&su=&body=` |
| Outlook | `https://outlook.office.com/mail/deeplink/compose?bcc=&subject=&body=` |
| mailto | `mailto:?bcc=&subject=&body=` |

All parameters are `encodeURIComponent`-encoded. No Gmail API, OAuth, or external servers.

---

## Module Breakdown

### `assets/js/popup.js`

**Purpose:** Popup UI controller and collection orchestrator.

**Dependencies:** `popup.html` DOM, Chrome tabs/storage/scripting/runtime APIs, `navigator.clipboard`.

**Consumers:** User via popup UI.

**Public interfaces:** None exported; all functions are internal to the `DOMContentLoaded` closure.

| Function | Purpose |
|----------|---------|
| `init()` | Bootstrap popup on open |
| `resetStateOnOpen()` | Validate/clean collection state |
| `loadSettings()` / `applyTheme()` | Settings and theme |
| `loadState()` | Restore form fields and results |
| `checkCurrentTab()` | Detect active tab URL |
| `updateButtonBasedOnUrl()` | Set collect button label |
| `processKeywords()` | Transform comma-separated → AND query |
| `handleCollect()` | Main collection entry — 4 navigation cases |
| `startEmailCollection()` | Inject script, send collectEmails message |
| `handleCopy()` | Clipboard copy |
| `applySelectedTemplate()` | Auto-fill subject/body on template change |
| `openMailDraft()` | Open compose draft via `buildMailDraftUrl()` |
| `showToast()` | Transient action feedback (via `ui/toast.js`) |
| `saveOutreachEdits()` | Persist outreach field edits |
| `loadOutreachTemplatesAndRefreshUI()` | Load templates; refresh dropdowns |
| `saveTemplate()` / `addNewTemplate()` / `deleteTemplate()` / `resetTemplateToDefault()` | Settings template CRUD |
| `updateScrollProgress()` / `showScrollProgress()` / `hideScrollProgress()` | Collection progress UI |
| `hideResults()` | Hide results and outreach panels |
| `saveToHistory()` / `loadHistory()` / `deleteHistoryItem()` | History CRUD |
| `switchView()` | Main / History / Settings navigation |
| `displayEmails()` / `updateStatus()` | UI updates |

### `assets/js/ui/icons.js`

**Purpose:** Centralized SVG icon library (Lucide-style stroke icons).

**Exports:** `Icons`, `renderIcon()`, `createIconButton()`, `setButtonIcon()`, `flashButtonSuccess()`.

### `assets/js/ui/toast.js`

**Purpose:** Toast notification system.

**Exports:** `showToast(message, type)`.

### `assets/js/mail-clients.js`

**Purpose:** Mail client URL builders for compose drafts.

**Exports:** `MAIL_CLIENTS`, `buildMailDraftUrl()`, `getMailClientDraftLabel()`.

### `assets/js/outreach-templates.js`

**Purpose:** Default outreach template seed data.

**Consumers:** `background.js` (install seed), `popup.js` (reset to default).

**Public interfaces:** Top-level `DEFAULT_OUTREACH_TEMPLATES` array.

Runtime templates are stored in `chrome.storage.local` → `outreachTemplates`.

### `assets/js/content.js`

**Purpose:** LinkedIn page interaction and email extraction.

**Dependencies:** Chrome storage/runtime APIs, LinkedIn DOM.

**Consumers:** Popup via `chrome.tabs.sendMessage`.

**Public interfaces:** Message actions `collectEmails`, `updateSearchInput`, `clearCache`.

| Function | Purpose |
|----------|---------|
| `updateLinkedInSearch()` | Set LinkedIn search input and submit |
| `scrollAndExtract()` | Scroll loop with see-more clicks |
| `finishExtraction()` | Final expand pass + extract callback |
| `extractEmails()` | mailto + regex extraction, dedup, sort |
| `isValidEmail()` | Basic regex validation |
| `shouldExclude()` | Keyword substring exclusion |

### `assets/js/background.js`

**Purpose:** Service worker for lifecycle and tab event handling.

**Dependencies:** Chrome storage/tabs/action/runtime APIs.

**Consumers:** Popup via `chrome.runtime.sendMessage`; Chrome via lifecycle events.

**Public interfaces:** Message actions `openPopupOnTabReady`, `updateState`, `getState`.

| Listener | Purpose |
|----------|---------|
| `runtime.onInstalled` | Default settings |
| `runtime.onMessage` | Popup messages |
| `tabs.onUpdated` | Popup auto-open, collection state reset, URL tracking |
| `tabs.onRemoved` | Collection tab cleanup |
| `storage.onChanged` | Log collection state changes |
| `setInterval(30s)` | Clean stale pending popup tabs |

---

## Related Documentation

- [Project Structure](PROJECT_STRUCTURE.md)
- [Storage Design](STORAGE.md)
- [Content Script](CONTENT_SCRIPT.md)
- [Business Logic](BUSINESS_LOGIC.md)
- [Manifest Reference](MANIFEST.md)
