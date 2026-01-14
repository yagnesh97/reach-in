// background.js - Service worker for maintaining state

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("LinkedIn Email Collector installed");

  // Initialize default settings
  chrome.storage.local.get(
    ["theme", "scrollSpeed", "autoNavigate", "showNotifications"],
    (data) => {
      if (!data.theme) {
        chrome.storage.local.set({ theme: "system" });
      }
      if (!data.scrollSpeed) {
        chrome.storage.local.set({ scrollSpeed: "2000" });
      }
      if (data.autoNavigate === undefined) {
        chrome.storage.local.set({ autoNavigate: true });
      }
      if (data.showNotifications === undefined) {
        chrome.storage.local.set({ showNotifications: true });
      }
    }
  );
});

// Track tabs that need popup to open
let pendingPopupTabs = {};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openPopupOnTabReady") {
    pendingPopupTabs[request.tabId] = {
      timestamp: Date.now(),
      attempts: 0,
    };
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "updateState") {
    chrome.storage.local.set(request.data, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === "getState") {
    chrome.storage.local.get(request.keys || null, (data) => {
      sendResponse(data);
    });
    return true;
  }
});

// Listen for tab updates to auto-open popup
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    // Check if this tab needs popup to open
    if (pendingPopupTabs[tabId]) {
      const pending = pendingPopupTabs[tabId];
      const now = Date.now();

      // Only try if within 15 seconds and less than 3 attempts
      if (now - pending.timestamp < 15000 && pending.attempts < 3) {
        pending.attempts++;

        // Wait a moment for the page to fully render
        setTimeout(() => {
          chrome.action.openPopup().catch((error) => {
            console.log("Could not auto-open popup:", error);

            // If failed, try again after a delay
            if (pending.attempts < 3) {
              setTimeout(() => {
                chrome.action.openPopup().catch(() => {
                  console.log("Retry failed");
                });
              }, 1000);
            }
          });
        }, 1000);

        // Clean up after 3 attempts or timeout
        if (pending.attempts >= 3 || now - pending.timestamp > 10000) {
          delete pendingPopupTabs[tabId];
        }
      } else {
        delete pendingPopupTabs[tabId];
      }
    }

    // Store the current tab URL and check collection state
    chrome.storage.local.get(
      ["collectionState", "activeCollectionTabId"],
      (data) => {
        if (
          data.collectionState === "collecting" &&
          data.activeCollectionTabId !== tabId
        ) {
          // Different tab completed loading while collection was active on another tab
          // Keep the collection state for the active collection tab
        } else if (
          data.collectionState === "collecting" &&
          data.activeCollectionTabId === tabId
        ) {
          // The collecting tab completed navigation (maybe user refreshed)
          // Reset collection state
          chrome.storage.local.set({
            collectionState: "idle",
            activeCollectionTabId: null,
          });
        }

        chrome.storage.local.set({ currentTabUrl: tab.url });
      }
    );
  }
});

// Clean up pending popup tabs when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (pendingPopupTabs[tabId]) {
    delete pendingPopupTabs[tabId];
  }

  // Check if the closed tab was the active collection tab
  chrome.storage.local.get(
    ["activeCollectionTabId", "collectionState"],
    (data) => {
      if (
        data.activeCollectionTabId === tabId &&
        data.collectionState === "collecting"
      ) {
        // Reset state since the collection tab was closed
        chrome.storage.local.set({
          collectionState: "idle",
          activeCollectionTabId: null,
        });
      }
    }
  );
});

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
  console.log("Connection established");

  port.onDisconnect.addListener(() => {
    console.log("Connection disconnected");
  });
});

// Maintain state across extension lifecycle
let keepAliveInterval;

function keepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }

  keepAliveInterval = setInterval(() => {
    chrome.storage.local.get(["collectionState"], (data) => {
      // Just accessing storage keeps the service worker alive
      if (data.collectionState === "collecting") {
        console.log("Collection in progress...");
      }
    });
  }, 20000); // Every 20 seconds
}

keepAlive();

// Listen for storage changes to sync state
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    if (changes.collectionState) {
      console.log(
        "Collection state changed:",
        changes.collectionState.newValue
      );
    }
  }
});

// Clean up old pending popup tabs periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(pendingPopupTabs).forEach((tabId) => {
    if (now - pendingPopupTabs[tabId].timestamp > 20000) {
      delete pendingPopupTabs[tabId];
    }
  });
}, 30000);
