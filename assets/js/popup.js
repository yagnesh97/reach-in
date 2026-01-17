// popup.js
document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const collectButton = document.getElementById("collectButton");
  const copyButton = document.getElementById("copyButton");
  const historyButton = document.getElementById("historyButton");
  const settingsButton = document.getElementById("settingsButton");
  const backFromHistory = document.getElementById("backFromHistory");
  const backFromSettings = document.getElementById("backFromSettings");

  const keywordsInput = document.getElementById("keywords");
  const scrollCountInput = document.getElementById("scrollCount");
  const excludeKeywordsInput = document.getElementById("excludeKeywords");
  const includeUniqueCheckbox = document.getElementById("includeUnique");

  const resultContainer = document.getElementById("resultContainer");
  const emailList = document.getElementById("emailList");
  const emailCount = document.getElementById("emailCount");
  const statusText = document.getElementById("statusText");

  const mainView = document.getElementById("mainView");
  const historyView = document.getElementById("historyView");
  const settingsView = document.getElementById("settingsView");
  const historyList = document.getElementById("historyList");
  const emptyHistory = document.getElementById("emptyHistory");

  // Settings elements
  const themeSelect = document.getElementById("themeSelect");
  const scrollSpeedSelect = document.getElementById("scrollSpeedSelect");
  const autoNavigate = document.getElementById("autoNavigate");
  const showNotifications = document.getElementById("showNotifications");
  const storageUsage = document.getElementById("storageUsage");
  const clearStorageButton = document.getElementById("clearStorageButton");

  let collectedEmails = [];
  let currentTabUrl = "";
  let currentTabId = null;
  let placeholderIndex = 0;

  // Placeholder examples for keywords
  const placeholders = [
    "python, mumbai, hiring",
    "data scientist, remote, USA",
    "frontend developer, react, startup",
    "marketing manager, B2B, enterprise",
    "product manager, AI, San Francisco",
    "sales executive, SaaS, New York",
    "designer, UX, portfolio",
    "engineer, machine learning, PhD",
  ];

  // Initialize
  init();

  function init() {
    loadSettings();
    resetStateOnOpen();
    checkCurrentTab();
    startPlaceholderRotation();
    setupEventListeners();
  }

  /* =============== RESET STATE =============== */
  function resetStateOnOpen() {
    // Reset collection state when popup opens
    chrome.storage.local.get(
      ["collectionState", "activeCollectionTabId"],
      (data) => {
        // If there was an active collection, check if that tab still exists
        if (
          data.collectionState === "collecting" &&
          data.activeCollectionTabId
        ) {
          chrome.tabs.get(data.activeCollectionTabId, (tab) => {
            if (chrome.runtime.lastError || !tab) {
              // Tab was closed, reset state
              chrome.storage.local.set({
                collectionState: "idle",
                statusText: "",
                activeCollectionTabId: null,
              });
              updateStatus("");
            }
          });
        } else {
          // No active collection, ensure clean state
          chrome.storage.local.set({
            collectionState: "idle",
            activeCollectionTabId: null,
          });
        }
      }
    );

    loadState();
  }

  /* =============== PLACEHOLDER ROTATION =============== */
  function startPlaceholderRotation() {
    setInterval(() => {
      if (document.activeElement !== keywordsInput && !keywordsInput.value) {
        placeholderIndex = (placeholderIndex + 1) % placeholders.length;
        keywordsInput.placeholder = placeholders[placeholderIndex];
      }
    }, 3000);
  }

  /* =============== SETTINGS =============== */
  function loadSettings() {
    chrome.storage.local.get(
      ["theme", "scrollSpeed", "autoNavigate", "showNotifications"],
      (data) => {
        const theme = data.theme || "system";
        const scrollSpeed = data.scrollSpeed || "2000";

        themeSelect.value = theme;
        scrollSpeedSelect.value = scrollSpeed;
        autoNavigate.checked = data.autoNavigate !== false;
        showNotifications.checked = data.showNotifications !== false;

        applyTheme(theme);
        calculateStorageUsage();
      }
    );
  }

  function applyTheme(theme) {
    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    } else {
      document.body.setAttribute("data-theme", theme);
    }
  }

  function calculateStorageUsage() {
    chrome.storage.local.getBytesInUse(null, (bytes) => {
      const kb = (bytes / 1024).toFixed(2);
      storageUsage.textContent = `${kb} KB used`;
    });
  }

  themeSelect.addEventListener("change", (e) => {
    const theme = e.target.value;
    chrome.storage.local.set({ theme });
    applyTheme(theme);
  });

  scrollSpeedSelect.addEventListener("change", (e) => {
    chrome.storage.local.set({ scrollSpeed: e.target.value });
  });

  autoNavigate.addEventListener("change", (e) => {
    chrome.storage.local.set({ autoNavigate: e.target.checked });
  });

  showNotifications.addEventListener("change", (e) => {
    chrome.storage.local.set({ showNotifications: e.target.checked });
  });

  clearStorageButton.addEventListener("click", () => {
    if (
      confirm(
        "This will clear all data including history and cached emails. Continue?"
      )
    ) {
      chrome.storage.local.clear(() => {
        updateStatus("All data cleared!");
        calculateStorageUsage();
        loadHistory();
      });
    }
  });

  /* =============== STATE MANAGEMENT =============== */
  function loadState() {
    chrome.storage.local.get(
      [
        "keywords",
        "scrollCount",
        "excludeKeywords",
        "collectionState",
        "collectedEmails",
        "activeCollectionTabId",
      ],
      (data) => {
        if (data.keywords) keywordsInput.value = data.keywords;
        if (data.scrollCount) scrollCountInput.value = data.scrollCount;
        if (data.excludeKeywords)
          excludeKeywordsInput.value = data.excludeKeywords;

        // Only show collected emails if we're on the same tab where collection happened
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs?.[0];
          if (
            activeTab &&
            data.collectedEmails?.length &&
            data.activeCollectionTabId === activeTab.id
          ) {
            collectedEmails = data.collectedEmails;
            displayEmails(collectedEmails);
          } else {
            // Different tab, hide results
            resultContainer.classList.add("hidden");
            collectedEmails = [];
          }

          if (
            data.collectionState === "collecting" &&
            data.activeCollectionTabId === activeTab?.id
          ) {
            setButtonState("collecting");
            updateStatus("Collection in progress...");
          } else {
            setButtonState("idle");
          }
        });
      }
    );
  }

  function checkCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0];
      if (!tab) return;

      currentTabUrl = tab.url || "";
      currentTabId = tab.id;
      chrome.storage.local.set({ currentTabUrl });

      // Reset status when switching tabs
      chrome.storage.local.get(
        ["activeCollectionTabId", "collectionState"],
        (data) => {
          if (
            data.activeCollectionTabId !== currentTabId ||
            data.collectionState !== "collecting"
          ) {
            updateStatus("");
          }
        }
      );

      updateButtonBasedOnUrl(currentTabUrl);
    });
  }

  function updateButtonBasedOnUrl(url) {
    if (!url.includes("linkedin.com")) {
      collectButton.textContent = "Open LinkedIn";
      collectButton.disabled = false;
    } else if (url.includes("linkedin.com/search/results/content")) {
      collectButton.textContent = "Collect Emails";
      collectButton.disabled = false;
    } else {
      collectButton.textContent = "Navigate to Search";
      collectButton.disabled = false;
    }
  }

  function setButtonState(state) {
    switch (state) {
      case "collecting":
        collectButton.textContent = "Collecting...";
        collectButton.disabled = true;
        break;
      case "completed":
        updateButtonBasedOnUrl(currentTabUrl);
        collectButton.disabled = false;
        break;
      case "idle":
      default:
        updateButtonBasedOnUrl(currentTabUrl);
        collectButton.disabled = false;
        break;
    }
  }

  /* =============== KEYWORD PROCESSING =============== */
  function processKeywords(input) {
    const keywords = input
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywords.length === 0) return "";

    return keywords.map((k) => `"${k}"`).join(" AND ");
  }

  function getCurrentSearchKeywords(url) {
    try {
      const urlObj = new URL(url);
      const keywords = urlObj.searchParams.get("keywords");
      return keywords ? decodeURIComponent(keywords) : "";
    } catch (e) {
      return "";
    }
  }

  /* =============== EVENT LISTENERS =============== */
  function setupEventListeners() {
    collectButton.addEventListener("click", handleCollect);
    copyButton.addEventListener("click", handleCopy);
    historyButton.addEventListener("click", () => switchView("history"));
    settingsButton.addEventListener("click", () => switchView("settings"));
    backFromHistory.addEventListener("click", () => switchView("main"));
    backFromSettings.addEventListener("click", () => switchView("main"));
  }

  /* =============== COLLECT EMAILS =============== */
  function handleCollect() {
    const keywords = keywordsInput.value.trim();
    const scrollCount = parseInt(scrollCountInput.value || "20");
    const excludeKeywords = excludeKeywordsInput.value.trim();

    if (!keywords) {
      updateStatus("Please enter search keywords!");
      return;
    }

    // Hide/reset previous results when starting new collection
    resultContainer.classList.add("hidden");
    collectedEmails = [];
    chrome.storage.local.set({ collectedEmails: [] });

    const processedKeywords = processKeywords(keywords);

    chrome.storage.local.set({
      keywords,
      scrollCount,
      excludeKeywords,
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs?.[0];
      const url = currentTab?.url || "";

      chrome.storage.local.get(["autoNavigate"], (data) => {
        const shouldAutoNavigate = data.autoNavigate !== false;
        const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(
          processedKeywords
        )}&origin=GLOBAL_SEARCH_HEADER&sortBy=date_posted`;

        const currentSearchKeywords = getCurrentSearchKeywords(url);
        const isOnLinkedInSearch = url.includes(
          "linkedin.com/search/results/content"
        );
        const keywordsMatch = currentSearchKeywords === processedKeywords;

        // Case 1: Not on LinkedIn at all - open in new tab
        if (!url.includes("linkedin.com")) {
          if (shouldAutoNavigate) {
            chrome.tabs.create({ url: searchUrl, active: true }, (newTab) => {
              // Signal background script to open popup when ready
              chrome.runtime.sendMessage({
                action: "openPopupOnTabReady",
                tabId: newTab.id,
              });
            });
            updateStatus("Opening LinkedIn in new tab...");
          } else {
            updateStatus("Please navigate to LinkedIn manually.");
          }
          return;
        }

        // Case 2: On LinkedIn search but keywords don't match - try using search input first
        if (isOnLinkedInSearch && !keywordsMatch) {
          if (shouldAutoNavigate) {
            updateStatus("Updating search...");

            // Try to use LinkedIn's search input
            chrome.tabs.sendMessage(
              currentTab.id,
              {
                action: "updateSearchInput",
                keywords: processedKeywords,
              },
              (response) => {
                if (
                  chrome.runtime.lastError ||
                  !response ||
                  !response.success
                ) {
                  // Fallback to URL navigation
                  updateStatus("Navigating to new search page...");

                  chrome.tabs.update(currentTab.id, { url: searchUrl }, () => {
                    const listener = (tabId, changeInfo) => {
                      if (
                        tabId === currentTab.id &&
                        changeInfo.status === "complete"
                      ) {
                        chrome.tabs.onUpdated.removeListener(listener);
                        updateStatus(
                          "Search page loaded. Click 'Collect Emails' to start."
                        );

                        setTimeout(() => {
                          chrome.tabs.query(
                            { active: true, currentWindow: true },
                            (newTabs) => {
                              if (newTabs[0]) {
                                currentTabUrl = newTabs[0].url;
                                updateButtonBasedOnUrl(currentTabUrl);
                              }
                            }
                          );
                        }, 500);
                      }
                    };
                    chrome.tabs.onUpdated.addListener(listener);

                    setTimeout(() => {
                      chrome.tabs.onUpdated.removeListener(listener);
                    }, 15000);
                  });
                } else {
                  // Search input method succeeded - wait for page to update and auto-collect
                  updateStatus(
                    "Search updated. Waiting for results to load..."
                  );

                  // Wait for the search to complete
                  const listener = (tabId, changeInfo) => {
                    if (
                      tabId === currentTab.id &&
                      changeInfo.status === "complete"
                    ) {
                      chrome.tabs.onUpdated.removeListener(listener);

                      // Wait a bit more for content to render, then auto-start collection
                      setTimeout(() => {
                        chrome.tabs.query(
                          { active: true, currentWindow: true },
                          (newTabs) => {
                            if (newTabs[0]) {
                              currentTabUrl = newTabs[0].url;
                              updateButtonBasedOnUrl(currentTabUrl);

                              // Auto-start collection
                              updateStatus("Starting email collection...");
                              startEmailCollection(
                                newTabs[0].id,
                                scrollCount,
                                excludeKeywords
                              );
                            }
                          }
                        );
                      }, 1500);
                    }
                  };
                  chrome.tabs.onUpdated.addListener(listener);

                  setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(listener);
                  }, 15000);
                }
              }
            );
          } else {
            updateStatus("Please navigate to new search manually.");
          }
          return;
        }

        // Case 3: Not on search page - navigate to search
        if (!isOnLinkedInSearch) {
          if (shouldAutoNavigate) {
            updateStatus("Navigating to search page...");

            chrome.tabs.update(currentTab.id, { url: searchUrl }, () => {
              const listener = (tabId, changeInfo) => {
                if (
                  tabId === currentTab.id &&
                  changeInfo.status === "complete"
                ) {
                  chrome.tabs.onUpdated.removeListener(listener);
                  updateStatus(
                    "Search page loaded. Click 'Collect Emails' to start."
                  );

                  setTimeout(() => {
                    chrome.tabs.query(
                      { active: true, currentWindow: true },
                      (newTabs) => {
                        if (newTabs[0]) {
                          currentTabUrl = newTabs[0].url;
                          updateButtonBasedOnUrl(currentTabUrl);
                        }
                      }
                    );
                  }, 500);
                }
              };
              chrome.tabs.onUpdated.addListener(listener);

              setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
              }, 15000);
            });
          } else {
            updateStatus("Please navigate to search manually.");
          }
          return;
        }

        // Case 4: On correct search page with matching keywords - start collection
        startEmailCollection(currentTab.id, scrollCount, excludeKeywords);
      });
    });
  }

  function startEmailCollection(tabId, scrollCount, excludeKeywords) {
    setButtonState("collecting");
    updateStatus("Starting email collection...");

    chrome.storage.local.set({
      collectionState: "collecting",
      activeCollectionTabId: tabId,
    });

    chrome.storage.local.get(["scrollSpeed"], (speedData) => {
      const scrollSpeed = parseInt(speedData.scrollSpeed || "2000");

      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          files: ["assets/js/content.js"],
        },
        (injectionResults) => {
          if (chrome.runtime.lastError) {
            updateStatus("Error: " + chrome.runtime.lastError.message);
            setButtonState("idle");
            chrome.storage.local.set({
              collectionState: "idle",
              activeCollectionTabId: null,
            });
            return;
          }

          setTimeout(() => {
            chrome.tabs.sendMessage(
              tabId,
              {
                action: "collectEmails",
                scrollCount,
                scrollSpeed,
                excludeKeywords: excludeKeywords
                  .split(",")
                  .map((k) => k.trim())
                  .filter(Boolean),
                includeUnique: includeUniqueCheckbox.checked,
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  updateStatus(
                    "Communication error: " + chrome.runtime.lastError.message
                  );
                  setButtonState("idle");
                  chrome.storage.local.set({
                    collectionState: "idle",
                    activeCollectionTabId: null,
                  });
                  return;
                }

                if (response && response.emails && response.emails.length > 0) {
                  collectedEmails = response.emails;

                  chrome.storage.local.set({
                    collectedEmails,
                    collectionState: "completed",
                    activeCollectionTabId: tabId,
                  });

                  displayEmails(collectedEmails);
                  updateStatus(
                    `Successfully collected ${collectedEmails.length} emails!`
                  );

                  saveToHistory(keywordsInput.value.trim(), collectedEmails);
                } else {
                  updateStatus("No emails found on this page.");
                  chrome.storage.local.set({
                    collectionState: "idle",
                    activeCollectionTabId: null,
                  });
                }

                setButtonState("completed");
              }
            );
          }, 800);
        }
      );
    });
  }

  /* =============== COPY EMAILS =============== */
  function handleCopy() {
    if (!collectedEmails.length) return;

    navigator.clipboard.writeText(collectedEmails.join(", ")).then(() => {
      updateStatus("✓ Emails copied to clipboard!");
      setTimeout(() => {
        updateStatus("");
      }, 2000);
    });
  }

  /* =============== HISTORY =============== */
  function saveToHistory(keywords, emails) {
    const historyItem = {
      id: Date.now(),
      date: new Date().toISOString(),
      keywords: keywords,
      emails: emails,
      count: emails.length,
    };

    chrome.storage.local.get(["history"], (data) => {
      const history = data.history || [];
      history.unshift(historyItem);

      if (history.length > 50) {
        history.splice(50);
      }

      chrome.storage.local.set({ history });
    });
  }

  function loadHistory() {
    chrome.storage.local.get(["history"], (data) => {
      const history = data.history || [];

      if (history.length === 0) {
        historyList.innerHTML = "";
        emptyHistory.classList.remove("hidden");
        return;
      }

      emptyHistory.classList.add("hidden");
      historyList.innerHTML = "";

      history.forEach((item) => {
        const historyItem = createHistoryItem(item);
        historyList.appendChild(historyItem);
      });
    });
  }

  function createHistoryItem(item) {
    const div = document.createElement("div");
    div.className = "history-item";

    const date = new Date(item.date);
    const formattedDate = date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailsListId = `emails-list-${item.id}`;

    div.innerHTML = `
      <div class="history-header">
        <div class="history-info">
          <div class="history-date">${formattedDate}</div>
          <div class="history-keywords">${item.keywords}</div>
          <div class="history-count">${item.count} emails collected</div>
        </div>
        <button class="history-toggle-btn" data-id="${item.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
      <div class="history-emails-container hidden" id="${emailsListId}">
        <div class="history-emails-list"></div>
        <div class="history-emails-actions">
          <button class="history-copy-btn" data-id="${item.id}">Copy All</button>
          <button class="history-delete-btn" data-id="${item.id}">Delete</button>
        </div>
      </div>
    `;

    div.querySelector(".history-emails-list").textContent =
      item.emails.join("\n");

    div.querySelector(".history-toggle-btn").addEventListener("click", (e) => {
      const emailsContainer = document.getElementById(emailsListId);
      const toggleBtn = e.currentTarget;
      const isHidden = emailsContainer.classList.contains("hidden");

      if (isHidden) {
        emailsContainer.classList.remove("hidden");
        toggleBtn.classList.add("active");
      } else {
        emailsContainer.classList.add("hidden");
        toggleBtn.classList.remove("active");
      }
    });

    div.querySelector(".history-copy-btn").addEventListener("click", () => {
      navigator.clipboard.writeText(item.emails.join(", ")).then(() => {
        updateStatus("✓ Emails copied from history!");
        setTimeout(() => updateStatus(""), 2000);
      });
    });

    div.querySelector(".history-delete-btn").addEventListener("click", () => {
      deleteHistoryItem(item.id);
    });

    return div;
  }

  function deleteHistoryItem(id) {
    chrome.storage.local.get(["history"], (data) => {
      let history = data.history || [];
      history = history.filter((item) => item.id !== id);
      chrome.storage.local.set({ history }, () => {
        loadHistory();
      });
    });
  }

  /* =============== VIEW SWITCHING =============== */
  function switchView(view) {
    mainView.classList.add("hidden");
    historyView.classList.add("hidden");
    settingsView.classList.add("hidden");

    switch (view) {
      case "history":
        historyView.classList.remove("hidden");
        loadHistory();
        break;
      case "settings":
        settingsView.classList.remove("hidden");
        calculateStorageUsage();
        break;
      case "main":
      default:
        mainView.classList.remove("hidden");
        checkCurrentTab();
        break;
    }
  }

  /* =============== HELPERS =============== */
  function updateStatus(text) {
    statusText.textContent = text;
  }

  function displayEmails(emails) {
    resultContainer.classList.remove("hidden");
    emailCount.textContent = `Found ${emails.length} email${
      emails.length === 1 ? "" : "s"
    }`;
    emailList.textContent = emails.join("\n");
  }

  // Listen for tab updates to update button state
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id === tabId) {
          currentTabUrl = tab.url;
          currentTabId = tab.id;
          chrome.storage.local.set({ currentTabUrl });
          updateButtonBasedOnUrl(tab.url);

          // Check if this tab has active collection
          chrome.storage.local.get(
            ["activeCollectionTabId", "collectionState"],
            (data) => {
              if (
                data.activeCollectionTabId !== tabId ||
                data.collectionState !== "collecting"
              ) {
                updateStatus("");
              }
            }
          );
        }
      });
    }
  });

  // Listen for tab switches
  chrome.tabs.onActivated.addListener(() => {
    checkCurrentTab();
    loadState();
  });
});
