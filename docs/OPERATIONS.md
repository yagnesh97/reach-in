# ReachIn Operations

Troubleshooting, maintenance, and recovery procedures.

---

## Common Issues

### "Communication error: Could not establish connection"

**Symptom:** Status shows communication error after clicking Collect.

**Cause:** Content script is not loaded in the active tab.

**Resolution:**
1. Ensure you are on a `linkedin.com` page
2. Reload the LinkedIn tab after extension reload
3. Verify content script in page DevTools → Sources → Content scripts
4. Check `chrome://extensions` for extension errors

The popup attempts re-injection via `chrome.scripting.executeScript` before messaging, but this requires the tab to be on a LinkedIn URL.

### "No emails found on this page"

**Symptom:** Collection completes but returns zero emails.

**Possible causes:**
- No publicly visible emails on current search results
- LinkedIn DOM changes broke selectors
- Scroll count too low to reach content with emails
- All emails filtered by exclude keywords
- All emails already in cache (unique mode enabled)

**Resolution:**
1. Manually scroll the LinkedIn page and look for visible emails
2. Increase scroll count
3. Disable unique email filter temporarily
4. Clear exclude keywords
5. Check content script selectors (see [LinkedIn DOM Changes](#linkedin-dom-changes))

### Popup Does Not Auto-Open After New Tab

**Symptom:** Opening LinkedIn in new tab does not reopen popup.

**Cause:** `chrome.action.openPopup()` requires user gesture context and may fail silently.

**Details:** Background attempts up to 3 times within 15 seconds (`background.js:64-82`). Failures are logged to service worker console.

**Resolution:**
1. Manually click the ReachIn icon after new tab loads
2. Check service worker console for "Could not auto-open popup" messages
3. This is a known Chrome API limitation, not a bug

### "Collecting..." Button Stuck

**Symptom:** Button shows "Collecting..." and remains disabled.

**Cause:** Collection state not reset after error or tab close.

**Resolution:**
1. Close and reopen the popup
2. If persists, check storage: `collectionState` should be `"idle"`
3. Clear state manually in DevTools: `chrome.storage.local.set({ collectionState: 'idle', activeCollectionTabId: null })`

### Results Disappear When Switching Tabs

**Symptom:** Collected emails hidden after switching browser tabs.

**Expected behavior:** Results are tab-scoped. They only display when the active tab matches `activeCollectionTabId`.

**Resolution:** Switch back to the tab where collection occurred.

---

## Troubleshooting

### Diagnostic Checklist

1. **Extension loaded?** Check `chrome://extensions` — no errors on ReachIn card
2. **On LinkedIn?** URL must contain `linkedin.com`
3. **On search page?** URL must contain `linkedin.com/search/results/content`
4. **Content script active?** Check page DevTools Sources panel
5. **Storage state?** Inspect `chrome.storage.local` in popup DevTools
6. **Service worker running?** Click "Service worker" link on extension card

### Inspecting Storage State

In popup DevTools console:

```javascript
chrome.storage.local.get(null, console.log)
```

Key values to check:

| Key | Expected During Collection |
|-----|---------------------------|
| `collectionState` | `"collecting"` |
| `activeCollectionTabId` | Current tab ID number |
| `collectedEmails` | Array of emails (after completion) |

### Inspecting Message Flow

1. Add breakpoint in `content.js` message listener (line 19)
2. Add breakpoint in `popup.js` `startEmailCollection` (line 516)
3. Trigger collection and step through

---

## LinkedIn DOM Changes

ReachIn depends on LinkedIn's DOM structure. LinkedIn frequently updates their UI, which can break selectors.

### Affected Selectors

| Selector | File | Function | Impact if Broken |
|----------|------|----------|-----------------|
| `.search-global-typeahead__input` | content.js:47 | `updateLinkedInSearch` | Search update fails; falls back to URL navigation |
| `.search-global-typeahead__overlay` | content.js:106 | `updateLinkedInSearch` | Dropdown may remain visible (cosmetic) |
| `button.see-more` | content.js:139 | `scrollAndExtract` | Truncated content not expanded |
| `button[aria-label*="see more"]` | content.js:148 | `scrollAndExtract` | Fallback expand |
| `button[aria-label*="Show more"]` | content.js:148 | `scrollAndExtract` | Fallback expand |
| `a[href^="mailto:"]` | content.js:202 | `extractEmails` | mailto emails missed |
| `document.body.innerText` | content.js:214 | `extractEmails` | Text-based emails missed |

### Update Playbook

1. Open LinkedIn search results in Chrome
2. Open DevTools → Elements
3. Identify new selectors for affected elements
4. Update selectors in `assets/js/content.js`
5. Reload extension and test
6. Update [`CONTENT_SCRIPT.md`](CONTENT_SCRIPT.md) selector table
7. Document change in commit message

### Monitoring

Signs of DOM breakage:
- Zero emails on pages that previously had results
- Search update always falls back to URL navigation
- Console log: "Search input not found"

---

## Permission Problems

### Extension Cannot Access Tab

**Symptom:** Script injection fails with permission error.

**Cause:** Tab is not on LinkedIn or user has not interacted with extension.

**Resolution:**
- Navigate to LinkedIn manually
- Click the ReachIn icon before collecting (establishes user gesture for `activeTab`)

### Scripting Permission Denied

**Symptom:** `chrome.scripting.executeScript` fails.

**Cause:** Missing `scripting` permission or invalid tab target.

**Resolution:**
- Verify `scripting` in manifest permissions
- Reload extension after manifest changes

### Missing Tabs Permission

ReachIn uses `chrome.tabs.*` APIs without explicit `tabs` permission. This works in current Chrome versions but provides limited tab metadata. If tab access issues arise, consider adding `"tabs"` permission to manifest and updating store listing justification.

---

## Storage Problems

### Storage Quota Exceeded

**Symptom:** `chrome.storage.local.set` fails silently or with error.

**Cause:** Chrome local storage limit (~10 MB per extension).

**Resolution:**
1. Open Settings → Clear All Data
2. Or manually delete large keys:
   ```javascript
   chrome.storage.local.remove(['history', 'cachedEmails'])
   ```

### Corrupted State

**Symptom:** Unexpected behavior, stale collection state.

**Resolution:**
```javascript
chrome.storage.local.clear(() => console.log('Storage cleared'))
```

Then reload extension to re-apply install defaults.

### Storage Usage Monitoring

Settings view displays usage via `chrome.storage.local.getBytesInUse()`. Typical usage:
- Settings: < 1 KB
- History (50 entries): varies by email count, typically < 100 KB
- Cached emails: ~50 bytes per email

---

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Google Chrome | Supported | Primary target, MV3 |
| Chromium (Edge, Brave, etc.) | Likely compatible | Untested; MV3 APIs should work |
| Firefox | Not supported | Different extension API (WebExtensions with differences) |
| Safari | Not supported | Different extension platform |

Minimum Chrome version: supports Manifest V3 (Chrome 88+).

---

## Recovery Procedures

### Full Reset

1. Go to Settings → Clear All Data (confirm dialog)
2. Go to `chrome://extensions` → reload ReachIn
3. Refresh LinkedIn tabs
4. Reconfigure settings (theme, scroll speed, etc.)

### Reinstall

1. Remove extension from `chrome://extensions`
2. Load unpacked again from project directory
3. All storage is cleared on uninstall

### Collection State Reset

If stuck in "collecting" state:

```javascript
// In popup or service worker DevTools console
chrome.storage.local.set({
  collectionState: 'idle',
  activeCollectionTabId: null,
  collectedEmails: []
})
```

### Clear Email Cache Only

```javascript
chrome.storage.local.remove(['cachedEmails'])
```

Note: The `clearCache` message handler in content script is unused. Clearing via storage is the current method.

---

## Related Documentation

- [Local Development](LOCAL_DEVELOPMENT.md)
- [Content Script](CONTENT_SCRIPT.md)
- [Storage Design](STORAGE.md)
- [Technical Debt](TECHNICAL_DEBT.md)
