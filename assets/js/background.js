// background.js - Service worker for maintaining state
importScripts(
  "outreach-templates.js",
  "collection-utils.js",
  "collection-flow-manager.js"
);

chrome.runtime.onInstalled.addListener(() => {
  console.log("ReachIn installed");

  chrome.storage.local.get(
    [
      "theme",
      "scrollSpeed",
      "outreachTemplate",
      "outreachTemplates",
      "preferredMailClient",
      "includeUnique",
      "collectionFlowState",
    ],
    (data) => {
      const defaults = {};
      if (!data.theme) defaults.theme = "system";
      if (!data.scrollSpeed) defaults.scrollSpeed = "2000";
      if (data.includeUnique === undefined) defaults.includeUnique = true;
      if (!data.preferredMailClient) defaults.preferredMailClient = "gmail";
      if (!data.outreachTemplate) defaults.outreachTemplate = "jobApplication";
      if (!data.collectionFlowState) defaults.collectionFlowState = COLLECTION_FLOW_STATE.IDLE;
      if (!data.outreachTemplates || !data.outreachTemplates.length) {
        defaults.outreachTemplates = DEFAULT_OUTREACH_TEMPLATES;
      }
      if (Object.keys(defaults).length) {
        chrome.storage.local.set(defaults);
      }
    }
  );
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startSmartCollect") {
    CollectionFlowManager.startSmartCollect({
      keywords: request.keywords,
      scrollCount: request.scrollCount,
      excludeKeywords: request.excludeKeywords,
      includeUnique: request.includeUnique,
      tabId: request.tabId,
      tabUrl: request.tabUrl,
      windowId: request.windowId,
    }).then(sendResponse);
    return true;
  }

  if (request.action === "resumeCollectionFlow") {
    CollectionFlowManager.resumeWaitingFlow().then(sendResponse);
    return true;
  }

  if (request.action === "searchPageReady" && sender.tab?.id) {
    CollectionFlowManager.handleSearchPageReady(sender.tab.id).then(sendResponse);
    return true;
  }

  if (request.action === "getCollectionFlow") {
    chrome.storage.local.get(
      [
        "collectionFlowState",
        "collectionIntent",
        "collectionError",
        "scrollProgress",
        "collectedEmails",
        "activeCollectionTabId",
      ],
      (data) => {
        sendResponse(data);
      }
    );
    return true;
  }

  if (request.action === "openPopupOnTabReady") {
    sendResponse({ success: true });
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  CollectionFlowManager.onTabUpdated(tabId, changeInfo, tab);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  CollectionFlowManager.onTabRemoved(tabId);
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.collectionFlowState) {
    console.log(
      "Collection flow state:",
      changes.collectionFlowState.newValue
    );
  }
});

setInterval(() => {
  CollectionFlowManager.cleanupStalePopupTabs();
}, 30000);
