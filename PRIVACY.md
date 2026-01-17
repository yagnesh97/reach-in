# Privacy Policy

_Last updated: January 2026_

## Overview

ReachIn is a Chrome extension designed to collect **publicly visible email addresses** from LinkedIn search result pages.  
User privacy and data transparency are core principles of the project.

---

## Data Collection

ReachIn does **not** collect or transmit any personal data to external servers.

The extension may process the following data **locally in the user’s browser**:

- Publicly visible email addresses found on LinkedIn pages
- Search keywords entered by the user
- Extension settings (theme, scroll speed, preferences)
- Optional local history of collected emails

---

## Data Storage

All data is stored using Chrome’s local storage API:

- `chrome.storage.local`
- Data remains on the user’s device
- Data can be cleared at any time from the extension settings

No cloud storage or remote databases are used.

---

## Data Sharing

ReachIn does **not**:

- Sell data
- Share data with third parties
- Transmit data over the network
- Use analytics or tracking services
- Use advertising or marketing SDKs

---

## User Control

Users have full control over their data:

- Collection only starts after explicit user action
- Stored data can be viewed, copied, or deleted at any time
- All local data can be cleared with one click from settings

---

## Permissions Justification

ReachIn requests only the minimum permissions required for functionality:

- **storage** – to save settings and local history
- **activeTab** – to access the currently active LinkedIn tab
- **scripting** – to inject scripts when the user initiates collection

The extension does not run background scraping or monitor browsing behavior.

---

## Third-Party Websites

ReachIn operates on LinkedIn pages but is **not affiliated with or endorsed by LinkedIn**.  
Users are responsible for complying with LinkedIn’s terms of service.

---

## Changes to This Policy

Any changes to this privacy policy will be reflected in this file with an updated revision date.

---

## Contact

If you have questions or concerns about privacy, please contact the project maintainer via the repository.
