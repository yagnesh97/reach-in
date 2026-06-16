# ReachIn Technical Debt

Prioritized engineering debt, risks, and recommended improvements.

---

## Critical

### Missing Icon Assets

**Issue:** `manifest.json` references four PNG icons under `assets/icons/` that do not exist in the repository.

**Impact:** Chrome Web Store submission will fail. Extension displays default puzzle piece icon.

**Files:** `manifest.json:7-11, 15-19`

**Recommendation:** Create or add icon-16, icon-32, icon-48, icon-128 PNG files before any store submission.

---

## High

### LinkedIn DOM Selector Fragility

**Issue:** All LinkedIn interaction depends on hardcoded CSS selectors that LinkedIn can change without notice.

**Impact:** Silent failure — zero emails collected, search update fails, no user-visible error explaining DOM breakage.

**Files:** `assets/js/content.js` (all selectors)

**Recommendation:**
- Centralize selectors as named constants at top of `content.js`
- Add detection logging when expected elements are not found
- Document selector update process in [`OPERATIONS.md`](OPERATIONS.md)

### ~~Unimplemented `showNotifications` Setting~~ (Resolved in Phase 1.5)

**Resolution:** Setting removed from UI and install defaults. Toast notifications (`showToast`) provide action feedback instead.

### ~~`includeUnique` Checkbox Not Persisted~~ (Resolved in Phase 1.5)

**Resolution:** `includeUnique` is now persisted in `chrome.storage.local`, loaded in `loadSettings()` / `loadState()`, and controlled from Settings → Collection.

## Medium

### Dead Message Handlers

**Issue:** Three message actions are implemented but never called:

| Action | Handler Location | Purpose |
|--------|-----------------|---------|
| `updateState` | `background.js:41-46` | Generic storage write |
| `getState` | `background.js:48-53` | Generic storage read |
| `clearCache` | `content.js:33-36` | Clear cached emails |

**Impact:** Code confusion, maintenance burden, larger attack surface.

**Recommendation:** Remove unused handlers or wire them up if planned for future use.

### Duplicate Content Script Injection

**Issue:** Content script is registered in manifest (auto-inject) AND programmatically injected via `chrome.scripting.executeScript` on every collection.

**Impact:** Unnecessary API call; init guard prevents actual double-execution but adds complexity.

**Files:** `manifest.json:25-29`, `popup.js:528-532`, `content.js:4-7`

**Recommendation:** Rely on manifest injection alone if reliable; keep programmatic injection as fallback with clear comment explaining why.

### `statusText` Storage Key Unused

**Issue:** `resetStateOnOpen()` writes `statusText: ""` to storage but no code reads it back. Status is managed purely via DOM.

**Impact:** Dead storage write; confusing for developers reading storage keys.

**Files:** `popup.js:79`, `popup.js:758-760`

**Recommendation:** Remove storage write; keep DOM-only status management.

### History Keywords XSS Vector (Mitigated in Phase 1.5)

**Issue:** History item keywords were inserted via `innerHTML` without sanitization.

**Resolution:** Keywords now use `escapeHtml()` before insertion in `createHistoryItem()`.

---

## Low

### No Clipboard Error Handling

**Issue:** `navigator.clipboard.writeText()` calls have no `.catch()` handler.

**Impact:** Silent failure if clipboard permission denied.

**Files:** `popup.js:606-611`, `popup.js:711-714`

**Recommendation:** Add error handling with user-facing status message.

### No Automated Tests

**Issue:** No unit tests, integration tests, or E2E tests exist.

**Impact:** Regressions detected only through manual testing.

**Recommendation:** Add at minimum:
- Unit tests for `processKeywords`, `isValidEmail`, `shouldExclude`
- Manual test checklist (documented in [`LOCAL_DEVELOPMENT.md`](LOCAL_DEVELOPMENT.md))

### README Clone URL Placeholder

**Issue:** README contains `https://github.com/your-username/reachin.git`.

**Impact:** Broken clone instructions for new contributors.

**Files:** `README.md:54`

**Recommendation:** Update with actual repository URL.

### No System Theme Change Listener

**Issue:** When theme is set to "system", popup does not update if OS theme changes while popup is open.

**Impact:** Minor UX inconsistency.

**Files:** `popup.js:127-134`

**Recommendation:** Add `matchMedia` change listener if popup stays open long enough to matter.

### Tab Listener Timeout Pattern

**Issue:** Multiple places register `tabs.onUpdated` listeners with 15-second `setTimeout` cleanup. Potential for orphaned listeners if timing differs.

**Impact:** Minor memory leak in popup context (destroyed on popup close anyway).

**Files:** `popup.js:390-417, 426-459, 475-502`

**Recommendation:** Extract shared helper for tab-load-wait pattern.

---

## Chrome Web Store Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Missing icons | Critical | Add icon assets |
| LinkedIn scraping concern | High | Document public-data-only scope in listing |
| Permission justification | Medium | Document in store listing (see [`PRIVACY_AND_SECURITY.md`](PRIVACY_AND_SECURITY.md)) |
| No hosted privacy policy | Medium | Host `PRIVACY.md` at public URL |

---

## LinkedIn DOM Dependency Risks

| Risk | Impact | Detection |
|------|--------|-----------|
| Search input class rename | Search update fails | "Search input not found" in console |
| See-more button changes | Truncated content not expanded | Fewer emails found |
| Page structure redesign | Email regex still works but fewer sources | Reduced collection yield |
| LinkedIn bot detection | Account restrictions | Out of extension scope |

---

## Scalability Concerns

| Concern | Current Limit | Notes |
|---------|--------------|-------|
| Storage quota | ~10 MB | History + cache could grow with heavy use |
| History entries | 50 max | Hardcoded in `saveToHistory()` |
| Scroll count | 200 max (HTML) | 200 × 3s = 10 minutes max scroll |
| Cached emails | Unbounded | Grows with unique collection enabled |

---

## Reliability Concerns

| Concern | Description |
|---------|-------------|
| Popup auto-open | `chrome.action.openPopup()` frequently fails without user gesture |
| Collection state race | Tab refresh during collection resets state in background but popup may show stale UI |
| Async message timing | 800ms delay before sendMessage after executeScript is arbitrary |
| Content expansion wait | Fixed 2000ms may be insufficient on slow connections |

---

## Related Documentation

- [Operations](OPERATIONS.md)
- [Privacy and Security](PRIVACY_AND_SECURITY.md)
- [Code Guidelines](CODE_GUIDELINES.md)
