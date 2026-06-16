// Collection orchestration (service worker)
const CollectionFlowManager = (function () {
  const pendingPopupTabs = {};
  const activeWaits = new Map();

  function setFlowState(updates) {
    return new Promise((resolve) => {
      chrome.storage.local.set(updates, resolve);
    });
  }

  function getFlowData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        [
          "collectionFlowState",
          "collectionIntent",
          "collectionError",
          "scrollSpeed",
        ],
        resolve
      );
    });
  }

  function schedulePopupReopen(tabId) {
    pendingPopupTabs[tabId] = {
      timestamp: Date.now(),
      attempts: 0,
    };
  }

  function tryOpenPopup(tabId) {
    const pending = pendingPopupTabs[tabId];
    if (!pending) return;

    const now = Date.now();
    if (now - pending.timestamp > 15000 || pending.attempts >= 3) {
      delete pendingPopupTabs[tabId];
      return;
    }

    pending.attempts++;
    setTimeout(() => {
      chrome.action.openPopup().catch(() => {
        if (pending.attempts < 3) {
          setTimeout(() => {
            chrome.action.openPopup().catch(() => {});
          }, 1000);
        }
      });
    }, 1000);

    if (pending.attempts >= 3) {
      delete pendingPopupTabs[tabId];
    }
  }

  function clearPendingPopup(tabId) {
    delete pendingPopupTabs[tabId];
  }

  function checkNavigationTimeout(intent) {
    if (!intent?.startedAt) return false;
    return Date.now() - intent.startedAt > NAVIGATION_TIMEOUT_MS;
  }

  async function fail(message) {
    await setFlowState({
      collectionFlowState: COLLECTION_FLOW_STATE.ERROR,
      collectionError: message,
      collectionIntent: null,
      collectionState: "idle",
      activeCollectionTabId: null,
    });
  }

  async function saveToHistory(keywords, emails) {
    const historyItem = {
      id: Date.now(),
      date: new Date().toISOString(),
      keywords,
      emails,
      count: emails.length,
    };

    return new Promise((resolve) => {
      chrome.storage.local.get(["history"], (data) => {
        const history = data.history || [];
        history.unshift(historyItem);
        if (history.length > 50) {
          history.splice(50);
        }
        chrome.storage.local.set({ history }, resolve);
      });
    });
  }

  async function complete(tabId, emails, intent) {
    const keywords = intent?.keywords || "";

    if (emails.length > 0) {
      await saveToHistory(keywords, emails);
      await setFlowState({
        collectedEmails: emails,
        collectionFlowState: COLLECTION_FLOW_STATE.COMPLETED,
        collectionState: "completed",
        collectionIntent: null,
        collectionError: "",
        activeCollectionTabId: tabId,
        collectionCompleteToast: true,
      });
    } else {
      await setFlowState({
        collectedEmails: [],
        collectionFlowState: COLLECTION_FLOW_STATE.COMPLETED,
        collectionState: "idle",
        collectionIntent: null,
        collectionError: "",
        activeCollectionTabId: null,
        collectionNoEmails: true,
      });
    }

    chrome.storage.local.remove("scrollProgress");
    clearPendingPopup(tabId);
  }

  function sendCollectMessage(tabId, intent, scrollSpeed, retry) {
    const payload = {
      action: "collectEmails",
      scrollCount: intent.scrollCount,
      scrollSpeed,
      excludeKeywords: parseExcludeKeywords(intent.excludeKeywords || ""),
      includeUnique: intent.includeUnique !== false,
    };

    chrome.tabs.sendMessage(tabId, payload, async (response) => {
      if (chrome.runtime.lastError) {
        if (retry) {
          setTimeout(() => {
            sendCollectMessage(tabId, intent, scrollSpeed, false);
          }, COLLECTION_START_DELAY_MS);
          return;
        }
        await fail("Collection could not start");
        chrome.storage.local.remove("scrollProgress");
        return;
      }

      const emails =
        response && Array.isArray(response.emails) ? response.emails : [];

      chrome.storage.local.remove("scrollProgress");
      await complete(tabId, emails, intent);
    });
  }

  async function startCollection(tabId, intent) {
    const existing = await getFlowData();
    if (existing.collectionFlowState === COLLECTION_FLOW_STATE.COLLECTING) {
      return;
    }

    const data = await new Promise((resolve) => {
      chrome.storage.local.get(["scrollSpeed"], resolve);
    });
    const scrollSpeed = parseInt(data.scrollSpeed || "2000", 10);

    await setFlowState({
      collectionFlowState: COLLECTION_FLOW_STATE.COLLECTING,
      collectionState: "collecting",
      activeCollectionTabId: tabId,
      scrollProgress: {
        current: 0,
        total: intent.scrollCount,
        phase: "scrolling",
      },
    });

    schedulePopupReopen(tabId);

    setTimeout(() => {
      sendCollectMessage(tabId, intent, scrollSpeed, true);
    }, COLLECTION_START_DELAY_MS);
  }

  function navigateToSearch(tabId, searchUrl, flowState) {
    return new Promise((resolve, reject) => {
      const onComplete = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(onComplete);
          resolve();
        }
      };

      chrome.tabs.onUpdated.addListener(onComplete);
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onComplete);
      }, NAVIGATION_TIMEOUT_MS + 1000);

      chrome.tabs.update(tabId, { url: searchUrl }, () => {
        if (chrome.runtime.lastError) {
          chrome.tabs.onUpdated.removeListener(onComplete);
          reject(new Error(chrome.runtime.lastError.message));
        }
      });
    });
  }

  function createLinkedInTab(searchUrl) {
    return new Promise((resolve, reject) => {
      chrome.tabs.create({ url: searchUrl, active: true }, (tab) => {
        if (chrome.runtime.lastError || !tab?.id) {
          reject(new Error(chrome.runtime.lastError?.message || "Tab create failed"));
          return;
        }
        resolve(tab.id);
      });
    });
  }

  async function tryUpdateSearch(tabId, processedKeywords, searchUrl, intent) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        { action: "updateSearchInput", keywords: processedKeywords },
        async (response) => {
          if (chrome.runtime.lastError || !response?.success) {
            try {
              await navigateToSearch(tabId, searchUrl, COLLECTION_FLOW_STATE.WAITING_FOR_PAGE);
              await setFlowState({
                collectionFlowState: COLLECTION_FLOW_STATE.WAITING_FOR_PAGE,
                collectionIntent: { ...intent, targetTabId: tabId },
              });
              waitForSearchReady(tabId, { ...intent, targetTabId: tabId });
            } catch (e) {
              await fail("Unable to load search results");
            }
            resolve();
            return;
          }

          await setFlowState({
            collectionFlowState: COLLECTION_FLOW_STATE.WAITING_FOR_PAGE,
            collectionIntent: { ...intent, targetTabId: tabId },
          });
          setTimeout(() => {
            waitForSearchReady(tabId, { ...intent, targetTabId: tabId });
          }, 2500);
          resolve();
        }
      );
    });
  }

  function checkPageReadyViaContent(tabId, processedKeywords) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        { action: "checkSearchPageReady", keywords: processedKeywords },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            chrome.tabs.get(tabId, (tab) => {
              if (chrome.runtime.lastError || !tab?.url) {
                resolve(false);
                return;
              }
              resolve(
                detectCollectionContext(tab.url, processedKeywords) === "searchReady"
              );
            });
            return;
          }
          resolve(response.ready === true);
        }
      );
    });
  }

  function waitForSearchReady(tabId, intent, force) {
    if (!force && activeWaits.has(tabId)) return;
    activeWaits.set(tabId, true);

    const deadline = (intent.startedAt || Date.now()) + NAVIGATION_TIMEOUT_MS;

    const poll = async () => {
      const data = await getFlowData();
      const currentIntent = data.collectionIntent;

      if (currentIntent?.targetTabId !== tabId) {
        activeWaits.delete(tabId);
        return;
      }

      const flowState = data.collectionFlowState;
      if (
        flowState === COLLECTION_FLOW_STATE.COLLECTING ||
        flowState === COLLECTION_FLOW_STATE.COMPLETED ||
        flowState === COLLECTION_FLOW_STATE.ERROR
      ) {
        activeWaits.delete(tabId);
        return;
      }

      if (Date.now() > deadline) {
        activeWaits.delete(tabId);
        await fail("LinkedIn took too long to respond");
        return;
      }

      let tab;
      try {
        tab = await new Promise((resolve, reject) => {
          chrome.tabs.get(tabId, (t) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(t);
          });
        });
      } catch (e) {
        activeWaits.delete(tabId);
        return;
      }

      const url = tab.url || "";
      if (!isLinkedInSearchUrl(url)) {
        setTimeout(poll, PAGE_READY_POLL_INTERVAL_MS);
        return;
      }

      const context = detectCollectionContext(url, currentIntent.processedKeywords);
      if (context === "searchMismatch") {
        const readyDespiteMismatch = await checkPageReadyViaContent(
          tabId,
          currentIntent.processedKeywords
        );
        if (!readyDespiteMismatch) {
          setTimeout(poll, PAGE_READY_POLL_INTERVAL_MS);
          return;
        }
      } else if (context !== "searchReady") {
        setTimeout(poll, PAGE_READY_POLL_INTERVAL_MS);
        return;
      }

      const ready = await checkPageReadyViaContent(
        tabId,
        currentIntent.processedKeywords
      );

      if (ready) {
        activeWaits.delete(tabId);
        await handleSearchPageReady(tabId);
        return;
      }

      setTimeout(poll, PAGE_READY_POLL_INTERVAL_MS);
    };

    setTimeout(poll, PAGE_READY_INITIAL_DELAY_MS);
  }

  async function handleSearchPageReady(tabId) {
    const data = await getFlowData();
    let intent = data.collectionIntent;
    const flowState = data.collectionFlowState;

    const waitingStates = [
      COLLECTION_FLOW_STATE.WAITING_FOR_PAGE,
      COLLECTION_FLOW_STATE.OPENING_LINKEDIN,
      COLLECTION_FLOW_STATE.NAVIGATING_TO_SEARCH,
    ];

    if (!waitingStates.includes(flowState)) {
      return { handled: false };
    }

    if (!intent) {
      return { handled: false };
    }

    if (!intent.targetTabId) {
      intent = { ...intent, targetTabId: tabId };
      await setFlowState({
        collectionIntent: intent,
        activeCollectionTabId: tabId,
        collectionFlowState: COLLECTION_FLOW_STATE.WAITING_FOR_PAGE,
      });
    } else if (intent.targetTabId !== tabId) {
      return { handled: false };
    }

    if (checkNavigationTimeout(intent)) {
      await fail("LinkedIn took too long to respond");
      return { handled: false };
    }

    activeWaits.delete(tabId);
    await setFlowState({
      collectionFlowState: COLLECTION_FLOW_STATE.PREPARING_COLLECTION,
    });
    await startCollection(tabId, intent);
    return { handled: true };
  }

  async function onTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status !== "complete") return;

    if (pendingPopupTabs[tabId]) {
      tryOpenPopup(tabId);
    }

    const data = await getFlowData();
    const intent = data.collectionIntent;
    const flowState = data.collectionFlowState;

    if (!intent || intent.targetTabId !== tabId) return;
    if (!isFlowInProgress(flowState) && flowState !== COLLECTION_FLOW_STATE.ERROR) return;

    const inNavigation =
      flowState === COLLECTION_FLOW_STATE.OPENING_LINKEDIN ||
      flowState === COLLECTION_FLOW_STATE.NAVIGATING_TO_SEARCH ||
      flowState === COLLECTION_FLOW_STATE.WAITING_FOR_PAGE;

    if (inNavigation) {
      if (!isLinkedInSearchUrl(tab.url)) {
        if (checkNavigationTimeout(intent)) {
          await fail("LinkedIn took too long to respond");
        }
        return;
      }

      await setFlowState({
        collectionFlowState: COLLECTION_FLOW_STATE.WAITING_FOR_PAGE,
        collectionWatchToken: Date.now(),
      });
      waitForSearchReady(tabId, intent, true);
    }

    chrome.storage.local.set({ currentTabUrl: tab.url });
  }

  async function onTabRemoved(tabId) {
    clearPendingPopup(tabId);
    activeWaits.delete(tabId);
    const data = await getFlowData();
    if (
      data.collectionIntent?.targetTabId === tabId &&
      isFlowInProgress(data.collectionFlowState)
    ) {
      await fail("Collection interrupted");
      chrome.storage.local.remove("scrollProgress");
    }
  }

  async function findExistingLinkedInTab(windowId) {
    const query = {
      url: ["https://www.linkedin.com/*", "https://linkedin.com/*"],
    };
    if (windowId != null) {
      query.windowId = windowId;
    } else {
      query.lastFocusedWindow = true;
    }

    const tabs = await new Promise((resolve) => {
      chrome.tabs.query(query, resolve);
    });

    if (!tabs?.length) return null;

    const stored = await new Promise((resolve) => {
      chrome.storage.local.get(["activeCollectionTabId"], resolve);
    });

    if (stored.activeCollectionTabId) {
      const preferred = tabs.find((t) => t.id === stored.activeCollectionTabId);
      if (preferred) return preferred;
    }

    const active = tabs.find((t) => t.active);
    if (active) return active;

    return tabs[tabs.length - 1];
  }

  async function resolveTargetTab(params) {
    if (params.tabId != null) {
      if (isLinkedInUrl(params.tabUrl)) {
        return { id: params.tabId, url: params.tabUrl };
      }

      try {
        const tab = await new Promise((resolve, reject) => {
          chrome.tabs.get(params.tabId, (t) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(t);
          });
        });
        if (tab?.url) return tab;
      } catch (e) {
        // fall through
      }

      if (params.tabUrl) {
        return { id: params.tabId, url: params.tabUrl };
      }
    }

    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
    return tabs?.[0] || null;
  }

  async function startSmartCollect(params) {
    const { keywords, scrollCount, excludeKeywords, includeUnique, windowId } = params;

    if (!keywords?.trim()) {
      return { success: false, error: "Please enter search keywords!" };
    }

    const processedKeywords = processKeywords(keywords);
    if (!processedKeywords) {
      return { success: false, error: "Please enter search keywords!" };
    }

    const searchUrl = buildSearchUrl(processedKeywords);
    const startedAt = Date.now();

    await setFlowState({
      keywords,
      scrollCount,
      excludeKeywords,
      collectedEmails: [],
      collectionError: "",
      collectionCompleteToast: false,
      collectionNoEmails: false,
    });

    let targetTab = await resolveTargetTab(params);
    let url = targetTab?.url || params.tabUrl || "";

    if (!isLinkedInUrl(url)) {
      const existing = await findExistingLinkedInTab(windowId);
      if (existing) {
        targetTab = existing;
        url = existing.url || "";
      }
    }

    const context = detectCollectionContext(url, processedKeywords);

    const baseIntent = {
      keywords: keywords.trim(),
      processedKeywords,
      scrollCount: parseInt(scrollCount || "20", 10),
      excludeKeywords: excludeKeywords || "",
      includeUnique: includeUnique !== false,
      searchUrl,
      startedAt,
    };

    try {
      if (context === "offLinkedIn") {
        const intent = { ...baseIntent, targetTabId: null };

        await setFlowState({
          collectionFlowState: COLLECTION_FLOW_STATE.OPENING_LINKEDIN,
          collectionState: "collecting",
          collectionIntent: intent,
        });

        const tabId = await createLinkedInTab(searchUrl);

        await setFlowState({
          collectionIntent: { ...baseIntent, targetTabId: tabId },
          activeCollectionTabId: tabId,
          collectionFlowState: COLLECTION_FLOW_STATE.WAITING_FOR_PAGE,
          collectionWatchToken: Date.now(),
        });

        schedulePopupReopen(tabId);
        waitForSearchReady(tabId, { ...baseIntent, targetTabId: tabId }, true);
        return { success: true };
      }

      if (!targetTab?.id) {
        await fail("Unable to open LinkedIn");
        return { success: false, error: "Unable to open LinkedIn" };
      }

      const tabId = targetTab.id;
      const intent = { ...baseIntent, targetTabId: tabId };

      if (context === "linkedInOther") {
        await setFlowState({
          collectionFlowState: COLLECTION_FLOW_STATE.NAVIGATING_TO_SEARCH,
          collectionState: "collecting",
          collectionIntent: intent,
          activeCollectionTabId: tabId,
        });

        await navigateToSearch(tabId, searchUrl, COLLECTION_FLOW_STATE.NAVIGATING_TO_SEARCH);
        await setFlowState({
          collectionFlowState: COLLECTION_FLOW_STATE.WAITING_FOR_PAGE,
          collectionWatchToken: Date.now(),
        });

        schedulePopupReopen(tabId);
        waitForSearchReady(tabId, intent, true);
        return { success: true };
      }

      if (context === "searchMismatch") {
        await setFlowState({
          collectionFlowState: COLLECTION_FLOW_STATE.WAITING_FOR_PAGE,
          collectionState: "collecting",
          collectionIntent: intent,
          activeCollectionTabId: tabId,
          collectionWatchToken: Date.now(),
        });

        await tryUpdateSearch(tabId, processedKeywords, searchUrl, intent);
        schedulePopupReopen(tabId);
        return { success: true };
      }

      // searchReady — still poll briefly in case DOM is still hydrating
      await setFlowState({
        collectionFlowState: COLLECTION_FLOW_STATE.WAITING_FOR_PAGE,
        collectionState: "collecting",
        collectionIntent: intent,
        activeCollectionTabId: tabId,
        collectionWatchToken: Date.now(),
      });

      waitForSearchReady(tabId, intent);
      return { success: true };
    } catch (e) {
      await fail("Unable to open LinkedIn");
      return { success: false, error: "Unable to open LinkedIn" };
    }
  }

  function cleanupStalePopupTabs() {
    const now = Date.now();
    Object.keys(pendingPopupTabs).forEach((tabId) => {
      if (now - pendingPopupTabs[tabId].timestamp > 20000) {
        delete pendingPopupTabs[tabId];
      }
    });
  }

  async function resumeWaitingFlow() {
    const data = await getFlowData();
    const intent = data.collectionIntent;
    const flowState = data.collectionFlowState;

    if (!intent?.targetTabId) {
      return { resumed: false };
    }

    const waitingStates = [
      COLLECTION_FLOW_STATE.WAITING_FOR_PAGE,
      COLLECTION_FLOW_STATE.NAVIGATING_TO_SEARCH,
      COLLECTION_FLOW_STATE.OPENING_LINKEDIN,
    ];
    if (!waitingStates.includes(flowState)) {
      return { resumed: false };
    }

    activeWaits.delete(intent.targetTabId);
    await setFlowState({ collectionWatchToken: Date.now() });
    waitForSearchReady(intent.targetTabId, intent, true);
    return { resumed: true };
  }

  return {
    startSmartCollect,
    onTabUpdated,
    onTabRemoved,
    handleSearchPageReady,
    resumeWaitingFlow,
    cleanupStalePopupTabs,
  };
})();
