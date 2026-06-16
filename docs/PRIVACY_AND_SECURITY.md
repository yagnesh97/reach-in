# ReachIn Privacy and Security

Privacy guarantees, security analysis, and Chrome Web Store compliance review.

For user-facing privacy policy, see [`PRIVACY.md`](../PRIVACY.md).

---

## Data Collection Scope

### What ReachIn Collects

| Data Type | Source | When | Stored |
|-----------|--------|------|--------|
| Email addresses | LinkedIn page DOM (publicly visible) | User-initiated collection | Yes, locally |
| Search keywords | User input in popup | User enters keywords | Yes, locally |
| Collection history | Derived from collections | After successful collection | Yes, locally |
| Extension settings | User preferences | Settings changes | Yes, locally |
| Cached email list | Derived from collections | Unique email mode | Yes, locally |
| Tab URLs | Active tab detection | Popup open, tab navigation | Yes, locally (`currentTabUrl`) |

### What ReachIn Does NOT Collect

Verified by full codebase analysis — no instances of:

- Network requests (`fetch`, `XMLHttpRequest`, `WebSocket`)
- Analytics or tracking SDKs
- External server communication
- Cookie access
- Browsing history beyond active tab URL
- LinkedIn credentials or authentication tokens
- Data from non-LinkedIn pages
- Background tab monitoring

---

## Data Storage

### Storage Mechanism

All data stored in `chrome.storage.local`:

- Encrypted at rest by Chrome (OS-level encryption)
- Scoped to extension origin
- Not synced across devices
- Not accessible to websites
- Not accessible to other extensions

### Data Location

Data remains on the user's device only. No cloud backup, no remote database, no CDN.

### Data Access

| Actor | Access |
|-------|--------|
| ReachIn extension code | Read/write via Chrome Storage API |
| User | View via popup UI; clear via Settings |
| LinkedIn | No access to extension storage |
| Other extensions | No access |
| Remote servers | No access (no transmission) |

---

## Data Retention

| Data | Retention Policy | User Control |
|------|-----------------|--------------|
| Settings | Until cleared or extension uninstalled | Settings UI |
| History | Max 50 entries; until cleared | Delete individual entries or Clear All |
| Cached emails | Until cleared | Clear All Data |
| Session state | Transient; cleared on tab close | Automatic |
| Collection results | Until new collection or tab switch | Automatic |

**Clear All Data** (`popup.js:167`) removes everything immediately.

**Extension uninstall** removes all storage permanently.

---

## Permission Review

### Declared Permissions

| Permission | Justification | Least Privilege Assessment |
|------------|--------------|---------------------------|
| `storage` | Save settings, history, cache locally | Required; no alternative for persistence |
| `activeTab` | Access active LinkedIn tab on user action | Minimal tab access scope |
| `scripting` | Inject content script on collection | Required for programmatic injection |

### Implicit Access

| Access | Mechanism | Scope |
|--------|-----------|-------|
| LinkedIn pages | Content script match pattern | `https://www.linkedin.com/*` only |

### Permissions NOT Requested

| Permission | Why Not Needed |
|------------|---------------|
| `tabs` | Tab APIs work without it (limited metadata) |
| `cookies` | No cookie access required |
| `webRequest` | No network interception |
| `history` | No browsing history access |
| `downloads` | No file downloads |
| `notifications` | Not implemented (despite setting) |
| `<all_urls>` host | LinkedIn only |

---

## Privacy Guarantees

Based on code analysis, ReachIn provides these guarantees:

1. **Local-only processing** — All email extraction occurs in the content script on the user's machine
2. **No network transmission** — Zero outbound connections in the codebase
3. **User-initiated collection** — No automatic or background scraping
4. **No tracking** — No analytics, telemetry, or fingerprinting
5. **User data control** — View, copy, delete, and clear all data from the UI
6. **No third-party services** — No external libraries or CDN dependencies
7. **Transparent permissions** — Three permissions, each with clear purpose

---

## Security Risks

### Identified Risks

| Risk | Severity | Description | Mitigation |
|------|----------|-------------|------------|
| Regex false positives | Low | Email regex may match non-email strings | Basic validation filter; user reviews results |
| DOM scraping scope | Medium | Extracts all visible text from page body | Limited to user-initiated collection on search pages |
| LinkedIn DOM injection | Low | Content script modifies search input | Only on user request; no persistent DOM changes |
| Storage data exposure | Low | History contains email addresses | Local-only; user can clear |
| Clipboard exposure | Low | Emails copied to system clipboard | Standard clipboard behavior; user-initiated |
| No input sanitization in history UI | Low | Keywords displayed via `innerHTML` in history | Keywords from user input; potential XSS if rendered unsafely |

### History XSS Note

History items use `innerHTML` for structure but set email text via `.textContent`:

```693:694:assets/js/popup.js
    div.querySelector(".history-emails-list").textContent =
      item.emails.join("\n");
```

However, keywords are inserted via template literal in `innerHTML`:

```675:675:assets/js/popup.js
          <div class="history-keywords">${item.keywords}</div>
```

Keywords come from user input. Malicious keywords with HTML characters could theoretically render in the popup context. Risk is self-contained (user attacking their own popup).

---

## Chrome Web Store Compliance Review

### Single Purpose

**Purpose:** Collect publicly visible email addresses from LinkedIn search results.

All functionality serves this purpose. No unrelated features.

### Permission Justification (Store Listing)

| Permission | Store Justification Text |
|------------|------------------------|
| `storage` | Store user preferences, collection history, and cached emails locally on the device |
| `activeTab` | Access the LinkedIn tab the user is viewing to extract publicly visible emails when they click Collect |
| `scripting` | Inject the collection script into the active LinkedIn tab when the user initiates email collection |

### Data Use Disclosure

- ReachIn handles email addresses and user-entered keywords
- Data is stored locally only
- No data is sold, shared, or transmitted
- Privacy policy: [`PRIVACY.md`](../PRIVACY.md)

### Store Submission Checklist

- [ ] Icon assets present (16, 32, 48, 128 PNG)
- [ ] Privacy policy hosted at public URL
- [ ] Single purpose description matches functionality
- [ ] Permission justifications in store listing
- [ ] Screenshots of popup UI
- [ ] No misleading claims about data access
- [ ] Usage notice about LinkedIn ToS compliance

### LinkedIn Terms of Service

ReachIn operates on LinkedIn pages but is not affiliated with LinkedIn. README includes usage notice:

> ReachIn only collects information that is already publicly visible on LinkedIn pages. Users are responsible for ensuring their usage complies with LinkedIn's terms of service and applicable local laws.

This is a user responsibility disclaimer, not a legal compliance guarantee.

---

## Recommended Security Improvements

| Priority | Improvement | Rationale |
|----------|-------------|-----------|
| High | Sanitize keywords before `innerHTML` insertion | Prevent self-XSS in history view |
| Medium | Add clipboard error handling | Graceful failure on permission denial |
| ~~Medium~~ | ~~Implement or remove `showNotifications`~~ | Resolved in Phase 1.5 (removed; toasts used instead) |
| Medium | Remove dead message handlers | Reduce attack surface |
| Low | Use `textContent` for all dynamic content | Consistent safe rendering |
| Low | Add Content Security Policy to manifest | Defense in depth |
| ~~Low~~ | ~~Persist `includeUnique` preference~~ | Resolved in Phase 1.5 |

See [`TECHNICAL_DEBT.md`](TECHNICAL_DEBT.md) for full prioritized list.

---

## Related Documentation

- [Privacy Policy (user-facing)](../PRIVACY.md)
- [Manifest Reference](MANIFEST.md)
- [Storage Design](STORAGE.md)
- [Technical Debt](TECHNICAL_DEBT.md)
