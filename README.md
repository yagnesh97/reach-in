# ReachIn

ReachIn is a Chrome extension that collects **publicly visible email addresses** from LinkedIn search result pages.  
It is designed for job seekers, recruiters, and professionals who want a faster way to identify contact information already available on public profiles and posts.

All data processing happens locally in the browser. ReachIn does not send or store data on external servers.

---

## ✨ Features

- Collect publicly visible email addresses from LinkedIn search results
- Auto-scroll and expand content to find more emails
- Optional unique email collection across sessions
- Keyword-based email exclusion
- Built-in history of previous collections
- One-click copy to clipboard
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

## 🛠️ Installation (Local Development)

1. Clone the repository
   ```bash
   git clone https://github.com/your-username/reachin.git
   ```
2. Open Chrome and go to:
   ```
   chrome://extensions
   ```
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the project directory

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

MIT License

---

## 📬 Support

For issues, feature requests, or questions, please open an issue in the repository.
