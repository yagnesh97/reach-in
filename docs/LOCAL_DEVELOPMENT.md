# ReachIn Local Development

Guide for setting up, running, and debugging ReachIn during development.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Google Chrome | Latest stable | Manifest V3 support required |
| Git | Any recent | Clone repository |
| Node.js | Not required | No build step |
| npm/yarn | Not required | No dependencies |

---

## Chrome Setup

1. Install [Google Chrome](https://www.google.com/chrome/) (latest stable)
2. Sign in to a LinkedIn account in Chrome (required for search results testing)
3. Navigate to `chrome://extensions`

---

## Loading Unpacked Extension

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd linkedin
   ```

2. Open `chrome://extensions` in Chrome

3. Enable **Developer mode** (toggle in top-right corner)

4. Click **Load unpacked**

5. Select the project root directory (contains `manifest.json`)

6. Verify ReachIn appears in the extensions list with version 1.0.0

**Note:** Icon files under `assets/icons/` are referenced in the manifest but may be missing from the repository. Chrome will show a default puzzle piece icon if icons are absent.

---

## Debugging Popup Scripts

1. Click the ReachIn extension icon to open the popup
2. **Right-click** anywhere inside the popup window
3. Select **Inspect**
4. DevTools opens for the popup context

**Useful DevTools panels:**
- **Console** — view `console.log` output, test expressions
- **Elements** — inspect popup DOM, verify theme attributes
- **Application → Storage → Extension Storage** — inspect `chrome.storage.local`

**Important:** The popup closes when you click outside it. DevTools keeps it open while inspecting.

### Debugging Tips

- Set breakpoints in `popup.js` via Sources panel
- Monitor storage changes: Application → Storage → Local
- Test theme: `$('body').getAttribute('data-theme')` in console

---

## Debugging Content Scripts

1. Navigate to a LinkedIn page (e.g., search results)
2. Open DevTools on the LinkedIn page (F12 or Cmd+Option+I)
3. Go to **Sources** panel
4. Find `content.js` under **Content scripts** section in the file tree

Alternatively:
1. Go to `chrome://extensions`
2. Find ReachIn → click **Details**
3. Under "Inspect views", content scripts appear when active on a page

### Debugging Tips

- Content script console logs appear in the **page's** DevTools console
- Test selectors: `document.querySelector('.search-global-typeahead__input')`
- Verify init guard: `window.__linkedinEmailCollectorInitialized`
- Check cached emails: `chrome.storage.local.get(['cachedEmails'], console.log)`

---

## Debugging Service Workers

1. Go to `chrome://extensions`
2. Find ReachIn
3. Click **Service worker** link (or "Inspect views: service worker")
4. DevTools opens for the background context

### Debugging Tips

- Service worker may be inactive; click the link to wake it
- Monitor `pendingPopupTabs` by adding breakpoints in `background.js`
- Check install defaults: clear extension storage, reload extension, inspect storage

**Note:** Service workers are terminated by Chrome when idle. Breakpoints persist but the worker must be re-awakened.

---

## Reload Workflow

After code changes, reload the extension and affected pages:

| Changed File | Reload Steps |
|-------------|-------------|
| `manifest.json` | Click reload on `chrome://extensions` |
| `popup.js`, `popup.html`, `popup.css` | Close and reopen popup |
| `content.js` | Reload extension + **refresh LinkedIn tab** |
| `background.js` | Click reload on `chrome://extensions` |

### Quick Reload

1. Go to `chrome://extensions`
2. Click the **reload icon** on ReachIn card
3. Refresh any open LinkedIn tabs

Content script changes require both extension reload and page refresh because the script is injected at page load.

---

## Local Testing Workflow

### Manual Test Checklist

#### Navigation Cases

| # | Starting State | Expected Behavior |
|---|---------------|-------------------|
| 1 | Non-LinkedIn tab | Opens LinkedIn search in new tab; popup may auto-reopen |
| 2 | LinkedIn search, wrong keywords | Updates search input or navigates; may auto-collect |
| 3 | LinkedIn, not search page | Navigates to content search; prompts to click Collect |
| 4 | LinkedIn search, matching keywords | Starts collection immediately |

#### Collection

- [ ] Enter keywords, set scroll count, click Collect
- [ ] Verify scrolling occurs on LinkedIn page
- [ ] Verify "see more" buttons are clicked
- [ ] Verify emails appear in popup results
- [ ] Verify email count is accurate

#### Filtering

- [ ] Set exclude keywords (e.g., `gmail.com`)
- [ ] Verify excluded emails do not appear in results

#### Unique Emails

- [ ] Enable "Collect Only Unique Emails"
- [ ] Collect twice on same page — second collection should show fewer/no emails
- [ ] Clear storage — collection should show all emails again

#### History

- [ ] Successful collection creates history entry
- [ ] Expand/collapse email list works
- [ ] Copy All from history copies to clipboard
- [ ] Delete removes entry
- [ ] History capped at 50 entries

#### Settings

- [ ] Theme switch (light/dark/system) applies immediately
- [ ] Scroll speed change affects collection timing
- [ ] Auto-navigate toggle changes navigation behavior
- [ ] Clear All Data removes all storage
- [ ] Storage usage displays KB value

#### Clipboard

- [ ] Copy All from results copies comma-separated emails
- [ ] Copy All from history copies comma-separated emails

#### Error Cases

- [ ] Empty keywords shows validation message
- [ ] Collection on page with no emails shows "No emails found"
- [ ] Close collection tab during collection resets state

---

## Development Environment Notes

- No hot reload — manual reload required after every change
- No linter or formatter configured in the project
- No test runner — all testing is manual
- LinkedIn DOM may differ based on account type, locale, and A/B tests

---

## Related Documentation

- [Operations — Troubleshooting](OPERATIONS.md)
- [Architecture](ARCHITECTURE.md)
- [Testing Cursor Rule](../.cursor/rules/testing.mdc)
