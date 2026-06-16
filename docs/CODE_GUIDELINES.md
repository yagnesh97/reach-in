# ReachIn Code Guidelines

Engineering standards for extending and maintaining ReachIn.

---

## JavaScript Standards

### Module Pattern

Each JS file uses a distinct pattern appropriate to its execution context:

| File | Pattern | Rationale |
|------|---------|-----------|
| `content.js` | IIFE with init guard | Prevent double initialization on re-inject |
| `popup.js` | `DOMContentLoaded` listener | Popup lifecycle binding |
| `background.js` | Top-level listeners | Service worker event registration |

**When adding new content script code**, wrap in the existing IIFE and respect the init guard:

```javascript
(function () {
  if (window.__linkedinEmailCollectorInitialized) return;
  window.__linkedinEmailCollectorInitialized = true;
  // new code here
})();
```

### Variable Declarations

- Use `const` for values that don't change
- Use `let` for reassignable variables
- Avoid `var` (not used in current codebase)

### Function Style

- Named function declarations for module-level functions
- Arrow functions for callbacks and event handlers
- Keep functions focused on a single responsibility

### No External Dependencies

ReachIn uses vanilla JavaScript only. Do not add npm packages or CDN scripts without explicit architectural decision.

---

## DOM Manipulation Standards

### Content Script (LinkedIn DOM)

- Use `document.querySelector` / `querySelectorAll` for element selection
- Prefer specific selectors over broad queries
- Mark interacted elements (e.g., `data-clicked="true"`) to prevent duplicate actions
- Do not inject styles into LinkedIn pages
- Do not modify LinkedIn DOM outside of user-initiated actions

**When adding selectors**, document them in [`CONTENT_SCRIPT.md`](CONTENT_SCRIPT.md).

### Popup DOM

- Use `getElementById` for static elements defined in `popup.html`
- Use `textContent` for user-generated text (safe rendering)
- Avoid `innerHTML` with unsanitized user input
- Toggle visibility via `.hidden` class, not inline styles

**Known issue:** History keywords use `innerHTML` template literals. New code should use `textContent` or sanitize input.

---

## Chrome API Usage Standards

### Storage

- Use `chrome.storage.local` only (not `sync`)
- Use consistent key names (see [`STORAGE.md`](STORAGE.md))
- Always provide keys array to `.get()` for clarity
- Check for errors in callbacks when setting critical state

```javascript
// Preferred pattern
chrome.storage.local.get(["theme", "scrollSpeed"], (data) => {
  const theme = data.theme || "system";
  // use theme
});
```

### Message Passing

- Use descriptive `action` strings in message payloads
- Return `true` from listener for async responses
- Always call `sendResponse` exactly once
- Check `chrome.runtime.lastError` after `sendMessage` in popup

```javascript
// Content script listener pattern
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "myAction") {
    doAsyncWork().then((result) => sendResponse(result));
    return true; // async
  }
});
```

**When adding new message actions**, update:
1. Sender code
2. Receiver listener
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) message registry
4. [`COVERAGE_REPORT.md`](COVERAGE_REPORT.md)

### Tabs

- Always query active tab before operations: `chrome.tabs.query({ active: true, currentWindow: true })`
- Remove `onUpdated` listeners after use (popup uses 15s timeout cleanup)
- Store tab ID for collection state tracking

### Scripting

- Re-inject content script before sending messages if injection may have failed
- Check `chrome.runtime.lastError` after `executeScript`

---

## Message Passing Standards

### Action Naming

Use camelCase action strings: `collectEmails`, `updateSearchInput`, `openPopupOnTabReady`.

### Payload Structure

```javascript
// Request
{ action: "collectEmails", scrollCount: 20, scrollSpeed: 2000, excludeKeywords: [], includeUnique: true }

// Response
{ emails: ["a@b.com", "c@d.com"] }
// or
{ success: true }
// or
{ success: false }
```

### Boundaries

| From → To | Allowed |
|-----------|---------|
| popup → content | Yes (via tabs.sendMessage) |
| popup → background | Yes (via runtime.sendMessage) |
| content → popup | Response only (via sendResponse) |
| content → background | Not used |
| background → content | Not used |
| background → popup | Not used (storage sync instead) |

---

## Storage Standards

### Adding New Keys

1. Choose descriptive camelCase name
2. Document in [`STORAGE.md`](STORAGE.md)
3. Set default in `background.js` `onInstalled` if needed
4. Add to Clear All Data behavior (automatic via `.clear()`)

### Key Categories

| Category | Examples | Lifecycle |
|----------|----------|-----------|
| Settings | `theme`, `scrollSpeed` | Persistent |
| Session | `collectionState`, `activeCollectionTabId` | Transient |
| Cache | `cachedEmails` | Persistent, user-clearable |
| History | `history` | Persistent, capped |

---

## Error Handling Standards

### Chrome API Errors

Check `chrome.runtime.lastError` after operations that may fail:

```javascript
chrome.tabs.sendMessage(tabId, message, (response) => {
  if (chrome.runtime.lastError) {
    updateStatus("Communication error: " + chrome.runtime.lastError.message);
    return;
  }
  // handle response
});
```

### Content Script Errors

Wrap DOM operations in try/catch where elements may not exist:

```javascript
try {
  const searchInput = document.querySelector(".search-global-typeahead__input");
  if (!searchInput) return false;
  // ...
} catch (error) {
  console.error("Error updating search:", error);
  return false;
}
```

### User-Facing Errors

Display via `updateStatus()` in popup. Keep messages concise and actionable.

---

## Logging Standards

| Context | Method | Usage |
|---------|--------|-------|
| background.js | `console.log` | Install, popup open failures, state changes |
| content.js | `console.log`, `console.error` | Search failures, errors |
| popup.js | None currently | Use `updateStatus()` for user feedback |

Avoid logging email addresses or user keywords in production. Current code does not log sensitive data.

Remove debug logs before release or gate behind a debug flag.

---

## Security Standards

- No external network requests
- No `eval()` or dynamic code execution
- Validate email format before storing
- Confirm destructive actions (Clear All Data uses `confirm()`)
- Sanitize user input before DOM insertion
- Request minimum permissions in manifest
- Document new permissions in [`MANIFEST.md`](MANIFEST.md) and store listing

---

## Documentation Standards

When changing code, update impacted documentation as part of Definition of Done:

| Change Type | Update |
|-------------|--------|
| New storage key | `STORAGE.md`, `COVERAGE_REPORT.md` |
| New message action | `ARCHITECTURE.md`, `COVERAGE_REPORT.md` |
| New selector | `CONTENT_SCRIPT.md` |
| New permission | `MANIFEST.md`, `PRIVACY_AND_SECURITY.md` |
| New UI view/flow | `UI_AND_UX.md` |
| Behavior change | `BUSINESS_LOGIC.md`, `README.md` |
| Bug/limitation found | `TECHNICAL_DEBT.md` |

---

## Related Documentation

- [Architecture](ARCHITECTURE.md)
- [Technical Debt](TECHNICAL_DEBT.md)
- [Documentation Index](README.md)
