# ReachIn Business Logic

Reference for collection rules, filtering, deduplication, and user decision flows.

---

## Email Collection Workflow

End-to-end flow from user action to stored results:

```mermaid
flowchart TD
  A[User clicks Collect] --> B{Keywords provided?}
  B -->|No| C[Status: Please enter search keywords]
  B -->|Yes| D[processKeywords AND join]
  D --> E[Popup sends startSmartCollect]
  E --> F[CollectionFlowManager detectContext]
  F --> G[Navigate or collect immediately]
  G --> H[Set collectionFlowState COLLECTING]
  H --> I[sendMessage collectEmails]
  I --> J[Content: scroll expand extract]
  J --> K{Emails found?}
  K -->|Yes| L[complete: storage + history]
  L --> M[Popup displays via storage.onChanged]
  K -->|No| N[collectionNoEmails flag]
  K -->|Error| O[fail: collectionError]
```

---

## Keyword Processing

Function: `processKeywords(input)` in `collection-utils.js`

**Input:** Comma-separated string (e.g., `"python, mumbai, hiring"`)

**Processing:**
1. Split by comma
2. Trim whitespace
3. Filter empty strings
4. Wrap each keyword in double quotes
5. Join with `" AND "`

**Output:** `"python" AND "mumbai" AND "hiring"`

**Example:**

| Input | Output |
|-------|--------|
| `python, mumbai` | `"python" AND "mumbai"` |
| `  react , frontend  ` | `"react" AND "frontend"` |
| `` (empty) | `""` (triggers validation error) |

Processed keywords are URL-encoded into the search URL:

```
https://www.linkedin.com/search/results/content/?keywords=%22python%22%20AND%20%22mumbai%22&origin=GLOBAL_SEARCH_HEADER&sortBy=date_posted
```

### Keyword Matching

When on an existing search page, popup compares current URL keywords with processed keywords via `getCurrentSearchKeywords()`:

```291:299:assets/js/popup.js
  function getCurrentSearchKeywords(url) {
    try {
      const urlObj = new URL(url);
      const keywords = urlObj.searchParams.get("keywords");
      return keywords ? decodeURIComponent(keywords) : "";
    } catch (e) {
      return "";
    }
  }
```

Exact string match determines if re-navigation is needed.

---

## Smart Collect Scenarios

Entry: `CollectionFlowManager.startSmartCollect()` in `collection-flow-manager.js`

`detectCollectionContext(url, processedKeywords)` returns one of four scenarios:

```mermaid
flowchart TD
  Start[startSmartCollect] --> Case1{On linkedin.com?}
  Case1 -->|No| OffLI[offLinkedIn: tabs.create]
  Case1 -->|Yes| Case2{On search results page?}
  Case2 -->|Yes| Case3{Keywords match URL?}
  Case3 -->|No| Mismatch[searchMismatch: updateSearchInput or URL nav]
  Case3 -->|Yes| Ready[searchReady: startCollection immediately]
  Case2 -->|No| Other[linkedInOther: tabs.update to search URL]
  OffLI --> Wait[onTabUpdated waits for page ready]
  Mismatch --> Wait
  Other --> Wait
  Wait --> Collect[startCollection]
  Ready --> Collect
```

### Scenario: Not on LinkedIn (`offLinkedIn`)

**Condition:** `!url.includes("linkedin.com")`

**Action:**
- `collectionFlowState` → `OPENING_LINKEDIN` → `WAITING_FOR_PAGE`
- `chrome.tabs.create({ url: searchUrl, active: true })`
- Best-effort popup reopen on tab ready
- Auto-start collection when search page loads

### Scenario: On Search Page, Keywords Don't Match (`searchMismatch`)

**Condition:** On search results URL but keywords differ

**Action:**
1. `collectionFlowState` → `WAITING_FOR_PAGE`
2. Try `updateSearchInput` message to content script
3. If failed → fallback to `chrome.tabs.update` with new search URL
4. On page ready → `startCollection`

### Scenario: On LinkedIn, Not on Search Page (`linkedInOther`)

**Condition:** On LinkedIn but not content search results

**Action:**
- `collectionFlowState` → `NAVIGATING_TO_SEARCH` → `WAITING_FOR_PAGE`
- `chrome.tabs.update({ url: searchUrl })`
- Auto-start collection when search page loads

### Scenario: On Correct Search Page (`searchReady`)

**Condition:** On search results with matching keywords

**Action:** `startCollection(tabId)` immediately (`PREPARING_COLLECTION` → `COLLECTING`)

### Flow States

| State | Meaning |
|-------|---------|
| `IDLE` | No active flow |
| `OPENING_LINKEDIN` | Creating new LinkedIn tab |
| `NAVIGATING_TO_SEARCH` | Updating tab to search URL |
| `WAITING_FOR_PAGE` | Waiting for search page to load |
| `PREPARING_COLLECTION` | Brief transition before collect |
| `COLLECTING` | Content script running |
| `COMPLETED` | Emails stored; history saved |
| `ERROR` | Flow failed; `collectionError` set |

### Timeouts and Errors

| Condition | `collectionError` |
|-----------|-------------------|
| Tab create/update fails | `Unable to open LinkedIn` |
| Search page never ready | `Unable to load search results` |
| `sendMessage` fails | `Collection could not start` |
| 30s navigation timeout | `LinkedIn took too long to respond` |

---

## Filtering Rules

### Exclusion Logic

Function: `shouldExclude(email, excludeKeywords)` in `content.js:246-255`

**Input:** Lowercase email string, array of exclude keyword strings

**Rule:** Email is excluded if it **contains** any non-empty trimmed keyword as a substring.

```javascript
return excludeKeywords.some((keyword) => {
  const trimmedKeyword = keyword.trim();
  return trimmedKeyword && email.includes(trimmedKeyword);
});
```

**Examples:**

| Email | Exclude Keywords | Result |
|-------|-----------------|--------|
| `john@gmail.com` | `gmail.com` | Excluded |
| `john@company.com` | `competitor.com` | Included |
| `john@gmail.com` | `` (empty) | Included |
| `john@gmail.com` | `john, gmail` | Excluded (matches `gmail`) |

Exclude keywords are parsed in popup before sending to content script:

```551:554:assets/js/popup.js
                excludeKeywords: excludeKeywords
                  .split(",")
                  .map((k) => k.trim())
                  .filter(Boolean),
```

### Validation Logic

Function: `isValidEmail(email)` in `content.js:241-244`

```javascript
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
```

Basic format check: local@domain.tld. Does not validate domain existence or RFC 5322 compliance.

---

## Deduplication Logic

Two levels of deduplication:

### Level 1: Within-Page Dedup

Uses JavaScript `Set` in `extractEmails()`. Same email found via mailto link and text regex appears once.

### Level 2: Cross-Session Dedup (Optional)

Controlled by `#includeUnique` checkbox in Settings → Collection (default: checked, persisted).

When enabled:
1. Content script loads `cachedEmails` from storage on init
2. After extraction, filters out emails already in cache
3. Adds newly found emails to in-memory `Set`
4. Persists updated cache to `chrome.storage.local`

```228:235:assets/js/content.js
    let resultEmails = [...foundEmails];
    if (includeUnique) {
      resultEmails = resultEmails.filter((email) => !cachedEmails.has(email));

      resultEmails.forEach((email) => cachedEmails.add(email));
    }
```

When disabled, all found emails on the page are returned regardless of cache.

**Note:** `includeUnique` is persisted in Settings → Collection (`chrome.storage.local`).

---

## Mail Draft Logic (Phase 1.5)

Function: `openMailDraft()` in `popup.js` → `buildMailDraftUrl()` in `mail-clients.js`.

**Inputs:** `preferredMailClient` from storage, collected emails as BCC, subject and body from outreach fields.

**Validation:** Requires collected emails and non-empty subject/body.

**Output:** `chrome.tabs.create({ url })` — no external APIs.

### Dirty-State Template Saving

Settings template editor tracks baseline on load/select. Save button enables only when name, subject, or body differ from baseline. Success shows toast and resets baseline.

---

## History Logic

### Save

Function: `saveToHistory()` in `collection-flow-manager.js` → `complete()`

Triggered after successful collection (emails found). Popup is not required.

**Entry structure:**
```javascript
{
  id: Date.now(),
  date: new Date().toISOString(),
  keywords: keywords,    // raw input, not processed
  emails: emails,
  count: emails.length
}
```

**Retention:** Prepended to array. Maximum 50 entries. Oldest removed via `history.splice(50)`.

### Load

Function: `loadHistory()` — reads all entries, renders chronologically (newest first).

### Delete

Function: `deleteHistoryItem(id)` — filters out entry by `id`, saves updated array.

No edit functionality. No export to file (clipboard only).

---

## Search Workflow

Complete search-to-results workflow:

```mermaid
sequenceDiagram
  participant User
  participant Popup
  participant SW as background.js
  participant CFM as CollectionFlowManager
  participant Tabs
  participant CS as Content Script
  participant LI as LinkedIn

  User->>Popup: Enter keywords click Collect
  Popup->>SW: startSmartCollect
  SW->>CFM: startSmartCollect
  CFM->>CFM: processKeywords detectContext
  alt Not on LinkedIn
    CFM->>Tabs: create searchUrl
    Tabs->>LI: Load search page
    CFM->>CFM: onTabUpdated onSearchPageReady
  else Wrong page or keywords
    CFM->>Tabs: update URL or sendMessage updateSearchInput
    Tabs->>LI: Navigate or update search
    CFM->>CFM: onTabUpdated onSearchPageReady
  else Ready to collect
    CFM->>CS: collectEmails
    CS->>LI: Scroll expand extract
    CS-->>CFM: emails
    CFM->>CFM: complete history save
    CFM-->>Popup: storage.onChanged
    Popup->>User: Display results
  end
```

---

## User Decision Flows

### Unique Emails Setting

| Setting | User Experience |
|---------|----------------|
| Enabled (default) | Only new emails (not seen in prior collections) returned; preference persisted |
| Disabled | All visible emails on page returned, including repeats |

### Clear All Data

User confirms → all storage cleared → settings reset to empty → must reconfigure theme/preferences.

---

## Sort Order

Extracted emails are sorted alphabetically before return:

```238:238:assets/js/content.js
    return resultEmails.sort();
```

---

## Related Documentation

- [Content Script](CONTENT_SCRIPT.md)
- [Storage Design](STORAGE.md)
- [UI and UX](UI_AND_UX.md)
