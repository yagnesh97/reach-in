![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow)
![Privacy Friendly](https://img.shields.io/badge/Privacy-Local%20Only-success)
![No Tracking](https://img.shields.io/badge/Tracking-None-brightgreen)

# ReachIn

ReachIn is a Chrome extension that collects **publicly visible email addresses** from LinkedIn search result pages.  
It is designed for job seekers, recruiters, and professionals who want a faster way to identify contact information already available on public profiles and posts.

All data processing happens locally in the browser. ReachIn does not send or store data on external servers.

**[Install from Chrome Web Store](https://chromewebstore.google.com/detail/reachin/nacijapnefpmnkpooemppnkejcobdhhl)**

---

## ✨ Features

- Collect publicly visible email addresses from LinkedIn search results
- Auto-scroll and expand content to find more emails
- Optional unique email collection across sessions
- Keyword-based email exclusion
- Built-in history of previous collections
- One-click copy to clipboard
- Outreach generator with templates and multi-client draft composer (Gmail, Outlook, mailto — local-only, no APIs)
- One-click smart collection: enter keywords, click Collect once — navigation and collection run in background
- Light, dark, and system themes
- Fully local data storage (no external APIs)

---

## 🔒 Privacy & Data Handling

- No user data is transmitted externally
- No analytics, tracking, or third-party services
- All collected data is stored locally using `chrome.storage.local`
- Data is processed only when explicitly initiated by the user

For full details, see [`PRIVACY.md`](./PRIVACY.md).

---

## 🧠 How It Works

1. You enter search keywords in the extension popup
2. ReachIn navigates (or updates) the LinkedIn search page
3. The extension scrolls through results and expands visible content
4. Publicly visible email addresses are extracted from the page
5. Results are shown in the popup and can be copied or saved to history

---

## 📚 Documentation

Engineering documentation and knowledge base: [`docs/README.md`](./docs/README.md)

Covers architecture, storage design, content script behavior, business logic, local development, operations, privacy/security review, and Chrome Web Store preparation.

---

## 🛠️ Installation

### Chrome Web Store

Install the latest release from the [Chrome Web Store](https://chromewebstore.google.com/detail/reachin/nacijapnefpmnkpooemppnkejcobdhhl).

### Local Development

1. Clone the repository
   ```bash
   git clone https://github.com/your-username/reachin.git
   ```
2. Ensure icon assets exist under `assets/icons/` (required for Chrome Web Store; see [`docs/TECHNICAL_DEBT.md`](./docs/TECHNICAL_DEBT.md))
3. Open Chrome and go to:
   ```
   chrome://extensions
   ```
4. Enable **Developer mode**
5. Click **Load unpacked**
6. Select the project directory

See [`docs/LOCAL_DEVELOPMENT.md`](./docs/LOCAL_DEVELOPMENT.md) for debugging and testing workflows.

---

## 📦 Permissions Explained

| Permission     | Reason |
|----------------|--------|
| `storage`      | Store user settings, history, and cached emails locally |
| `activeTab`    | Access the currently active LinkedIn tab |
| `scripting`    | Inject the content script when collection starts |

ReachIn does **not** access background tabs or monitor browsing activity.

---

## ⚠️ Usage Notice

ReachIn only collects information that is **already publicly visible** on LinkedIn pages.  
Users are responsible for ensuring their usage complies with LinkedIn’s terms of service and applicable local laws.

---

## 🧩 Tech Stack

- Chrome Extension (Manifest V3)
- JavaScript (Vanilla)
- HTML / CSS
- Chrome Storage API

---

## 📄 License

[MIT LICENSE](./LICENSE)

---

## 📬 Support

For issues, feature requests, or questions, please open an issue in the repository.
