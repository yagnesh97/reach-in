// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const collectButton = document.getElementById("collectButton");
  const copyButton = document.getElementById("copyButton");
  const historyButton = document.getElementById("historyButton");
  const settingsButton = document.getElementById("settingsButton");
  const backFromHistory = document.getElementById("backFromHistory");
  const backFromSettings = document.getElementById("backFromSettings");
  const appTitle = document.getElementById("appTitle");

  const keywordsInput = document.getElementById("keywords");
  const scrollCountInput = document.getElementById("scrollCount");
  const excludeKeywordsInput = document.getElementById("excludeKeywords");
  const includeUniqueCheckbox = document.getElementById("includeUnique");

  const resultContainer = document.getElementById("resultContainer");
  const emailList = document.getElementById("emailList");
  const emailCount = document.getElementById("emailCount");
  const statusText = document.getElementById("statusText");
  const scrollProgressContainer = document.getElementById("scrollProgressContainer");
  const scrollProgressFill = document.getElementById("scrollProgressFill");
  const scrollProgressText = document.getElementById("scrollProgressText");
  const collectionFlowProgress = document.getElementById("collectionFlowProgress");

  const outreachContainer = document.getElementById("outreachContainer");
  const outreachTemplateSelect = document.getElementById("outreachTemplate");
  const outreachSubjectInput = document.getElementById("outreachSubject");
  const outreachBodyInput = document.getElementById("outreachBody");
  const openDraftButton = document.getElementById("openDraftButton");

  const mainView = document.getElementById("mainView");
  const historyView = document.getElementById("historyView");
  const settingsView = document.getElementById("settingsView");
  const historyList = document.getElementById("historyList");
  const emptyHistory = document.getElementById("emptyHistory");

  const themeSelect = document.getElementById("themeSelect");
  const scrollSpeedSelect = document.getElementById("scrollSpeedSelect");
  const preferredMailClientSelect = document.getElementById("preferredMailClient");
  const defaultTemplateSelect = document.getElementById("defaultTemplateSelect");
  const storageUsage = document.getElementById("storageUsage");
  const clearStorageButton = document.getElementById("clearStorageButton");
  const templateManageSelect = document.getElementById("templateManageSelect");
  const templateNameInput = document.getElementById("templateNameInput");
  const templateSubjectInput = document.getElementById("templateSubjectInput");
  const templateBodyInput = document.getElementById("templateBodyInput");
  const saveTemplateButton = document.getElementById("saveTemplateButton");
  const addTemplateButton = document.getElementById("addTemplateButton");
  const deleteTemplateButton = document.getElementById("deleteTemplateButton");
  const resetTemplateButton = document.getElementById("resetTemplateButton");
  const unsavedIndicator = document.getElementById("unsavedIndicator");

  let collectedEmails = [];
  let currentTabUrl = "";
  let currentTabId = null;
  let placeholderIndex = 0;
  let generatedSubject = "";
  let generatedBody = "";
  let outreachTemplates = [];
  let preferredMailClient = MAIL_CLIENTS.gmail;
  let templateEditorBaseline = null;

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

  init();

  function init() {
    initStaticIcons();
    loadSettings();
    loadOutreachTemplatesAndRefreshUI(() => {
      resetStateOnOpen();
      checkCurrentTab();
      startPlaceholderRotation();
      setupEventListeners();
      setupStorageListener();
    });
  }

  function initStaticIcons() {
    document.getElementById("appTitleIcon").appendChild(renderIcon(Icons.home));
    historyButton.appendChild(renderIcon(Icons.history));
    settingsButton.appendChild(renderIcon(Icons.settings));
    backFromHistory.appendChild(renderIcon(Icons.back));
    backFromSettings.appendChild(renderIcon(Icons.back));
    copyButton.appendChild(renderIcon(Icons.copy));
    document.getElementById("openDraftIcon").appendChild(renderIcon(Icons.mail));
    document.getElementById("emptyHistoryIcon").appendChild(renderIcon(Icons.history));
    document.getElementById("saveTemplateIcon").appendChild(renderIcon(Icons.save));
    document.getElementById("addTemplateIcon").appendChild(renderIcon(Icons.plus));
    document.getElementById("deleteTemplateIcon").appendChild(renderIcon(Icons.delete));
    document.getElementById("resetTemplateIcon").appendChild(renderIcon(Icons.rotateCcw));
    document.getElementById("clearStorageIcon").appendChild(renderIcon(Icons.delete));
    document.getElementById("privacyLinkIcon").appendChild(renderIcon(Icons.externalLink));
    updateOpenDraftButtonLabel();
  }

  function updateOpenDraftButtonLabel() {
    const label = getMailClientDraftLabel(preferredMailClient);
    openDraftButton.setAttribute("aria-label", label);
    openDraftButton.setAttribute("title", label);
  }

  /* =============== RESET STATE =============== */
  function resetStateOnOpen() {
    chrome.storage.local.get(
      ["collectionFlowState", "activeCollectionTabId"],
      (data) => {
        const inProgress = isFlowInProgress(data.collectionFlowState);
        if (inProgress && data.activeCollectionTabId) {
          chrome.tabs.get(data.activeCollectionTabId, (tab) => {
            if (chrome.runtime.lastError || !tab) {
              chrome.storage.local.set({
                collectionFlowState: COLLECTION_FLOW_STATE.ERROR,
                collectionError: "Collection interrupted",
                collectionState: "idle",
                activeCollectionTabId: null,
                collectionIntent: null,
              });
            }
          });
        }
        loadState();
      }
    );
  }

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
      [
        "theme",
        "scrollSpeed",
        "includeUnique",
        "preferredMailClient",
        "outreachTemplate",
      ],
      (data) => {
        themeSelect.value = data.theme || "system";
        scrollSpeedSelect.value = data.scrollSpeed || "2000";
        includeUniqueCheckbox.checked = data.includeUnique !== false;
        preferredMailClient = data.preferredMailClient || MAIL_CLIENTS.gmail;
        preferredMailClientSelect.value = preferredMailClient;

        applyTheme(themeSelect.value);
        calculateStorageUsage();
        updateOpenDraftButtonLabel();
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
    chrome.storage.local.set({ theme: e.target.value });
    applyTheme(e.target.value);
    showToast("Settings saved", "success");
  });

  scrollSpeedSelect.addEventListener("change", (e) => {
    chrome.storage.local.set({ scrollSpeed: e.target.value });
    showToast("Settings saved", "success");
  });

  includeUniqueCheckbox.addEventListener("change", (e) => {
    chrome.storage.local.set({ includeUnique: e.target.checked });
    showToast("Settings saved", "success");
  });

  preferredMailClientSelect.addEventListener("change", (e) => {
    preferredMailClient = e.target.value;
    chrome.storage.local.set({ preferredMailClient });
    updateOpenDraftButtonLabel();
    showToast("Settings saved", "success");
  });

  defaultTemplateSelect.addEventListener("change", (e) => {
    const templateId = e.target.value;
    chrome.storage.local.set({ outreachTemplate: templateId });
    outreachTemplateSelect.value = templateId;
    applySelectedTemplate(true);
    showToast("Default template updated", "success");
  });

  clearStorageButton.addEventListener("click", () => {
    if (
      confirm(
        "This will clear all data including history and cached emails. Continue?"
      )
    ) {
      chrome.storage.local.clear(() => {
        chrome.storage.local.set({
          theme: "system",
          scrollSpeed: "2000",
          includeUnique: true,
          preferredMailClient: MAIL_CLIENTS.gmail,
          collectionFlowState: COLLECTION_FLOW_STATE.IDLE,
          outreachTemplates: DEFAULT_OUTREACH_TEMPLATES,
          outreachTemplate: "jobApplication",
        });
        showToast("All data cleared", "success");
        calculateStorageUsage();
        loadHistory();
        loadOutreachTemplatesAndRefreshUI();
        loadSettings();
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
        "collectionFlowState",
        "collectionError",
        "collectionState",
        "collectedEmails",
        "activeCollectionTabId",
        "outreachTemplate",
        "generatedSubject",
        "generatedBody",
        "scrollProgress",
        "preferredMailClient",
        "includeUnique",
        "collectionCompleteToast",
      ],
      (data) => {
        if (data.keywords) keywordsInput.value = data.keywords;
        if (data.scrollCount) scrollCountInput.value = data.scrollCount;
        if (data.excludeKeywords)
          excludeKeywordsInput.value = data.excludeKeywords;

        if (data.preferredMailClient) {
          preferredMailClient = data.preferredMailClient;
          preferredMailClientSelect.value = preferredMailClient;
          updateOpenDraftButtonLabel();
        }

        if (data.includeUnique !== undefined) {
          includeUniqueCheckbox.checked = data.includeUnique;
        }

        let flowState =
          data.collectionFlowState || COLLECTION_FLOW_STATE.IDLE;
        if (
          !data.collectionFlowState &&
          data.collectionState === "collecting"
        ) {
          flowState = COLLECTION_FLOW_STATE.COLLECTING;
        }

        loadOutreachTemplatesAndRefreshUI(() => {
          const selectedId = data.outreachTemplate || "jobApplication";
          if (
            outreachTemplates.some((template) => template.id === selectedId)
          ) {
            outreachTemplateSelect.value = selectedId;
            defaultTemplateSelect.value = selectedId;
          }

          generatedSubject = data.generatedSubject || "";
          generatedBody = data.generatedBody || "";
          outreachSubjectInput.value = generatedSubject;
          outreachBodyInput.value = generatedBody;

          if (!generatedSubject && !generatedBody) {
            applySelectedTemplate(false);
          }

          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs?.[0];
            currentTabId = activeTab?.id || null;
            currentTabUrl = activeTab?.url || "";

            if (
              activeTab &&
              data.collectedEmails?.length &&
              data.activeCollectionTabId === activeTab.id
            ) {
              collectedEmails = data.collectedEmails;
              displayEmails(collectedEmails);
            } else if (flowState !== COLLECTION_FLOW_STATE.COMPLETED) {
              hideResults();
            }

            renderCollectionFlow(
              flowState,
              data.collectionError || "",
              data.scrollProgress
            );

            if (
              flowState === COLLECTION_FLOW_STATE.WAITING_FOR_PAGE ||
              flowState === COLLECTION_FLOW_STATE.NAVIGATING_TO_SEARCH ||
              flowState === COLLECTION_FLOW_STATE.OPENING_LINKEDIN
            ) {
              chrome.runtime.sendMessage({ action: "resumeCollectionFlow" });
            }

            if (data.collectionCompleteToast) {
              showToast("Collection complete", "success");
              chrome.storage.local.set({ collectionCompleteToast: false });
            }
          });
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

      chrome.storage.local.get(
        ["collectionFlowState", "collectedEmails", "activeCollectionTabId"],
        (data) => {
          if (
            data.collectionFlowState === COLLECTION_FLOW_STATE.COMPLETED &&
            data.collectedEmails?.length &&
            data.activeCollectionTabId === tab.id
          ) {
            collectedEmails = data.collectedEmails;
            displayEmails(collectedEmails);
          }
          renderCollectionFlow(
            data.collectionFlowState || COLLECTION_FLOW_STATE.IDLE,
            "",
            null
          );
        }
      );
    });
  }

  function setCollectButtonInProgress(inProgress) {
    if (inProgress) {
      collectButton.textContent = "Collecting...";
      collectButton.disabled = true;
    } else {
      collectButton.textContent = "Collect";
      collectButton.disabled = false;
    }
  }

  function getFlowStepStatuses(flowState) {
    const afterOpening = [
      COLLECTION_FLOW_STATE.NAVIGATING_TO_SEARCH,
      COLLECTION_FLOW_STATE.WAITING_FOR_PAGE,
      COLLECTION_FLOW_STATE.PREPARING_COLLECTION,
      COLLECTION_FLOW_STATE.COLLECTING,
      COLLECTION_FLOW_STATE.COMPLETED,
    ];
    const afterLoading = [
      COLLECTION_FLOW_STATE.COLLECTING,
      COLLECTION_FLOW_STATE.COMPLETED,
    ];

    return {
      opening:
        flowState === COLLECTION_FLOW_STATE.OPENING_LINKEDIN
          ? "active"
          : afterOpening.includes(flowState)
            ? "done"
            : "pending",
      loading: [
        COLLECTION_FLOW_STATE.NAVIGATING_TO_SEARCH,
        COLLECTION_FLOW_STATE.WAITING_FOR_PAGE,
        COLLECTION_FLOW_STATE.PREPARING_COLLECTION,
      ].includes(flowState)
        ? "active"
        : afterLoading.includes(flowState)
          ? "done"
          : "pending",
      collecting:
        flowState === COLLECTION_FLOW_STATE.COLLECTING
          ? "active"
          : flowState === COLLECTION_FLOW_STATE.COMPLETED
            ? "done"
            : "pending",
      complete:
        flowState === COLLECTION_FLOW_STATE.COMPLETED ? "done" : "pending",
    };
  }

  function renderCollectionFlow(flowState, errorMessage, scrollProgress) {
    const inProgress = isFlowInProgress(flowState);
    setCollectButtonInProgress(inProgress);

    if (
      flowState === COLLECTION_FLOW_STATE.IDLE ||
      flowState === COLLECTION_FLOW_STATE.ERROR
    ) {
      collectionFlowProgress.classList.add("hidden");
    } else {
      collectionFlowProgress.classList.remove("hidden");
      const statuses = getFlowStepStatuses(flowState);

      collectionFlowProgress.querySelectorAll(".flow-step").forEach((stepEl) => {
        const step = stepEl.dataset.step;
        const status = statuses[step] || "pending";
        stepEl.className = `flow-step flow-step-${status}`;

        const iconEl = stepEl.querySelector(".flow-step-icon");
        iconEl.innerHTML = "";
        if (status === "done") {
          iconEl.appendChild(renderIcon(Icons.check));
        }
      });
    }

    if (flowState === COLLECTION_FLOW_STATE.COLLECTING) {
      showScrollProgress();
      if (scrollProgress) {
        updateScrollProgress(scrollProgress);
      }
    } else {
      hideScrollProgress();
    }

    if (flowState === COLLECTION_FLOW_STATE.ERROR && errorMessage) {
      updateStatus(errorMessage);
    } else if (flowState !== COLLECTION_FLOW_STATE.ERROR) {
      updateStatus("");
    }
  }

  function handleCollectionStorageChanges(changes) {
    if (changes.collectionFlowState) {
      const flowState = changes.collectionFlowState.newValue;
      chrome.storage.local.get(
        ["collectionError", "scrollProgress", "collectedEmails", "activeCollectionTabId"],
        (data) => {
          renderCollectionFlow(
            flowState,
            data.collectionError || "",
            data.scrollProgress
          );

          if (flowState === COLLECTION_FLOW_STATE.COMPLETED) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              const activeTab = tabs?.[0];
              if (
                data.collectedEmails?.length &&
                data.activeCollectionTabId === activeTab?.id
              ) {
                collectedEmails = data.collectedEmails;
                displayEmails(collectedEmails);
              } else if (changes.collectionNoEmails?.newValue) {
                updateStatus("No emails found on this page.");
              }
              chrome.storage.local.set({ collectionNoEmails: false });
            });
          }
        }
      );
    }

    if (changes.collectedEmails?.newValue?.length) {
      chrome.storage.local.get(["activeCollectionTabId", "collectionFlowState"], (data) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (
            data.collectionFlowState === COLLECTION_FLOW_STATE.COMPLETED &&
            data.activeCollectionTabId === tabs[0]?.id
          ) {
            collectedEmails = changes.collectedEmails.newValue;
            displayEmails(collectedEmails);
          }
        });
      });
    }

    if (changes.collectionCompleteToast?.newValue) {
      showToast("Collection complete", "success");
      chrome.storage.local.set({ collectionCompleteToast: false });
    }

    if (changes.collectionNoEmails?.newValue) {
      updateStatus("No emails found on this page.");
      chrome.storage.local.set({ collectionNoEmails: false });
    }

    if (changes.scrollProgress) {
      chrome.storage.local.get(["collectionFlowState"], (data) => {
        if (data.collectionFlowState === COLLECTION_FLOW_STATE.COLLECTING) {
          showScrollProgress();
          updateScrollProgress(changes.scrollProgress.newValue);
        }
      });
    }

    if (changes.collectionError?.newValue) {
      updateStatus(changes.collectionError.newValue);
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
    appTitle.addEventListener("click", () => switchView("main"));
    openDraftButton.addEventListener("click", openMailDraft);
    outreachTemplateSelect.addEventListener("change", () =>
      applySelectedTemplate(true)
    );
    outreachSubjectInput.addEventListener("input", saveOutreachEdits);
    outreachBodyInput.addEventListener("input", saveOutreachEdits);
    templateManageSelect.addEventListener("change", () => {
      loadTemplateIntoEditor(templateManageSelect.value);
      updateTemplateActionButtons();
      resetTemplateEditorBaseline();
    });
    templateNameInput.addEventListener("input", updateDirtyState);
    templateSubjectInput.addEventListener("input", updateDirtyState);
    templateBodyInput.addEventListener("input", updateDirtyState);
    saveTemplateButton.addEventListener("click", saveTemplate);
    addTemplateButton.addEventListener("click", addNewTemplate);
    deleteTemplateButton.addEventListener("click", deleteTemplate);
    resetTemplateButton.addEventListener("click", resetTemplateToDefault);
  }

  /* =============== COLLECT EMAILS =============== */
  function handleCollect() {
    const keywords = keywordsInput.value.trim();
    const scrollCount = parseInt(scrollCountInput.value || "20", 10);
    const excludeKeywords = excludeKeywordsInput.value.trim();

    hideResults();
    collectedEmails = [];

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs?.[0];

      chrome.runtime.sendMessage(
        {
          action: "startSmartCollect",
          keywords,
          scrollCount,
          excludeKeywords,
          includeUnique: includeUniqueCheckbox.checked,
          tabId: activeTab?.id,
          tabUrl: activeTab?.url || "",
          windowId: activeTab?.windowId,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            updateStatus("Communication error: " + chrome.runtime.lastError.message);
            return;
          }
          if (!response?.success) {
            updateStatus(response?.error || "Unable to start collection");
            return;
          }
          updateStatus("");
          chrome.storage.local.get(
            ["collectionFlowState", "collectionError", "scrollProgress"],
            (data) => {
              renderCollectionFlow(
                data.collectionFlowState || COLLECTION_FLOW_STATE.IDLE,
                data.collectionError || "",
                data.scrollProgress
              );
            }
          );
        }
      );
    });
  }

  /* =============== COPY EMAILS =============== */
  function handleCopy() {
    if (!collectedEmails.length) return;

    navigator.clipboard.writeText(collectedEmails.join(", ")).then(() => {
      setButtonIcon(copyButton, Icons.check);
      copyButton.classList.add("is-success");
      showToast("Emails copied", "success");
      setTimeout(() => {
        setButtonIcon(copyButton, Icons.copy);
        copyButton.classList.remove("is-success");
      }, 1500);
    });
  }

  /* =============== HISTORY =============== */
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
        historyList.appendChild(createHistoryItem(item));
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

    const header = document.createElement("div");
    header.className = "history-header";

    const info = document.createElement("div");
    info.className = "history-info";
    info.innerHTML = `
      <div class="history-date">${formattedDate}</div>
      <div class="history-keywords">${escapeHtml(item.keywords)}</div>
      <div class="history-count">${item.count} emails collected</div>
    `;

    const toggleBtn = createIconButton(Icons.chevronDown, {
      label: "Expand emails",
      className: "btn btn-icon history-toggle-btn",
    });
    toggleBtn.dataset.id = item.id;

    header.appendChild(info);
    header.appendChild(toggleBtn);

    const emailsContainer = document.createElement("div");
    emailsContainer.className = "history-emails-container hidden";
    emailsContainer.id = emailsListId;

    const emailsListEl = document.createElement("div");
    emailsListEl.className = "history-emails-list";
    emailsListEl.textContent = item.emails.join("\n");

    const actions = document.createElement("div");
    actions.className = "history-emails-actions";

    const copyBtn = createIconButton(Icons.copy, {
      label: "Copy Emails",
      className: "btn btn-icon btn-success-icon",
    });
    copyBtn.dataset.id = item.id;

    const deleteBtn = createIconButton(Icons.delete, {
      label: "Delete",
      className: "btn btn-icon btn-danger",
    });
    deleteBtn.dataset.id = item.id;

    actions.appendChild(copyBtn);
    actions.appendChild(deleteBtn);
    emailsContainer.appendChild(emailsListEl);
    emailsContainer.appendChild(actions);

    div.appendChild(header);
    div.appendChild(emailsContainer);

    toggleBtn.addEventListener("click", () => {
      const isHidden = emailsContainer.classList.contains("hidden");
      if (isHidden) {
        emailsContainer.classList.remove("hidden");
        toggleBtn.classList.add("is-expanded");
        toggleBtn.setAttribute("aria-label", "Collapse emails");
        toggleBtn.setAttribute("title", "Collapse emails");
      } else {
        emailsContainer.classList.add("hidden");
        toggleBtn.classList.remove("is-expanded");
        toggleBtn.setAttribute("aria-label", "Expand emails");
        toggleBtn.setAttribute("title", "Expand emails");
      }
    });

    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(item.emails.join(", ")).then(() => {
        setButtonIcon(copyBtn, Icons.check);
        copyBtn.classList.add("is-success");
        showToast("Emails copied", "success");
        setTimeout(() => {
          setButtonIcon(copyBtn, Icons.copy);
          copyBtn.classList.remove("is-success");
        }, 1500);
      });
    });

    deleteBtn.addEventListener("click", () => {
      deleteHistoryItem(item.id);
    });

    return div;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function deleteHistoryItem(id) {
    chrome.storage.local.get(["history"], (data) => {
      let history = data.history || [];
      history = history.filter((item) => item.id !== id);
      chrome.storage.local.set({ history }, () => {
        loadHistory();
        showToast("History item deleted", "success");
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
        loadOutreachTemplatesAndRefreshUI(() => {
          if (templateManageSelect.value) {
            loadTemplateIntoEditor(templateManageSelect.value);
            resetTemplateEditorBaseline();
          }
          updateTemplateActionButtons();
        });
        break;
      case "main":
      default:
        mainView.classList.remove("hidden");
        checkCurrentTab();
        loadOutreachTemplatesAndRefreshUI();
        break;
    }
  }

  /* =============== OUTREACH TEMPLATES =============== */
  function loadOutreachTemplatesAndRefreshUI(callback) {
    chrome.storage.local.get(["outreachTemplates", "outreachTemplate"], (data) => {
      outreachTemplates =
        data.outreachTemplates && data.outreachTemplates.length
          ? data.outreachTemplates
          : DEFAULT_OUTREACH_TEMPLATES;

      if (!data.outreachTemplates || !data.outreachTemplates.length) {
        chrome.storage.local.set({ outreachTemplates });
      }

      populateOutreachTemplateSelect();
      populateTemplateManageSelect();
      populateDefaultTemplateSelect();

      const selectedId = data.outreachTemplate || "jobApplication";
      if (outreachTemplates.some((t) => t.id === selectedId)) {
        outreachTemplateSelect.value = selectedId;
        defaultTemplateSelect.value = selectedId;
      }

      if (templateManageSelect.options.length && !templateManageSelect.value) {
        templateManageSelect.value = outreachTemplates[0].id;
      }

      if (callback) callback();
    });
  }

  function populateSelect(select, templates) {
    select.innerHTML = "";
    templates.forEach((template) => {
      const option = document.createElement("option");
      option.value = template.id;
      option.textContent = template.name;
      select.appendChild(option);
    });
  }

  function populateOutreachTemplateSelect() {
    populateSelect(outreachTemplateSelect, outreachTemplates);
  }

  function populateTemplateManageSelect() {
    populateSelect(templateManageSelect, outreachTemplates);
  }

  function populateDefaultTemplateSelect() {
    populateSelect(defaultTemplateSelect, outreachTemplates);
  }

  function getTemplateById(id) {
    return outreachTemplates.find((template) => template.id === id);
  }

  function applySelectedTemplate(persistTemplate = true) {
    const templateId = outreachTemplateSelect.value;
    const template = getTemplateById(templateId);
    if (!template) return;

    generatedSubject = template.subject;
    generatedBody = template.body;
    outreachSubjectInput.value = generatedSubject;
    outreachBodyInput.value = generatedBody;

    const payload = { generatedSubject, generatedBody };
    if (persistTemplate) {
      payload.outreachTemplate = templateId;
      defaultTemplateSelect.value = templateId;
    }
    chrome.storage.local.set(payload);
  }

  function getEditorValues() {
    return {
      name: templateNameInput.value,
      subject: templateSubjectInput.value,
      body: templateBodyInput.value,
    };
  }

  function resetTemplateEditorBaseline() {
    templateEditorBaseline = getEditorValues();
    updateDirtyState();
  }

  function updateDirtyState() {
    if (!templateEditorBaseline) {
      saveTemplateButton.disabled = true;
      unsavedIndicator.classList.add("hidden");
      return;
    }

    const current = getEditorValues();
    const isDirty =
      current.name !== templateEditorBaseline.name ||
      current.subject !== templateEditorBaseline.subject ||
      current.body !== templateEditorBaseline.body;

    saveTemplateButton.disabled = !isDirty;
    unsavedIndicator.classList.toggle("hidden", !isDirty);
  }

  function loadTemplateIntoEditor(templateId) {
    const template = getTemplateById(templateId);
    if (!template) return;

    templateNameInput.value = template.name;
    templateSubjectInput.value = template.subject;
    templateBodyInput.value = template.body;
    resetTemplateEditorBaseline();
  }

  function updateTemplateActionButtons() {
    const template = getTemplateById(templateManageSelect.value);
    const isBuiltIn = template?.builtIn === true;

    deleteTemplateButton.disabled = isBuiltIn;
    deleteTemplateButton.classList.toggle("hidden", isBuiltIn);
    resetTemplateButton.classList.toggle("hidden", !isBuiltIn);
  }

  function saveTemplate() {
    const templateId = templateManageSelect.value;
    const name = templateNameInput.value.trim();
    const subject = templateSubjectInput.value.trim();
    const body = templateBodyInput.value.trim();

    if (!name || !subject || !body) {
      updateStatus("Template name, subject, and body are required.");
      return;
    }

    const index = outreachTemplates.findIndex(
      (template) => template.id === templateId
    );
    if (index === -1) return;

    outreachTemplates[index] = {
      ...outreachTemplates[index],
      name,
      subject,
      body,
    };

    chrome.storage.local.set({ outreachTemplates }, () => {
      populateOutreachTemplateSelect();
      populateTemplateManageSelect();
      populateDefaultTemplateSelect();
      templateManageSelect.value = templateId;
      updateTemplateActionButtons();
      resetTemplateEditorBaseline();
      flashButtonSuccess(saveTemplateButton);
      showToast("Template saved", "success");
      updateStatus("");
    });
  }

  function addNewTemplate() {
    const newTemplate = {
      id: "custom_" + Date.now(),
      name: "New Template",
      subject: "",
      body: "",
      builtIn: false,
    };

    outreachTemplates.push(newTemplate);

    chrome.storage.local.set({ outreachTemplates }, () => {
      populateOutreachTemplateSelect();
      populateTemplateManageSelect();
      populateDefaultTemplateSelect();
      templateManageSelect.value = newTemplate.id;
      loadTemplateIntoEditor(newTemplate.id);
      updateTemplateActionButtons();
      showToast("New template created", "success");
    });
  }

  function deleteTemplate() {
    const templateId = templateManageSelect.value;
    const template = getTemplateById(templateId);

    if (!template || template.builtIn) return;
    if (outreachTemplates.length <= 1) {
      updateStatus("At least one template is required.");
      return;
    }

    if (!confirm(`Delete template "${template.name}"?`)) return;

    outreachTemplates = outreachTemplates.filter(
      (item) => item.id !== templateId
    );

    chrome.storage.local.get(["outreachTemplate"], (data) => {
      const updates = { outreachTemplates };
      if (data.outreachTemplate === templateId) {
        updates.outreachTemplate = outreachTemplates[0].id;
      }

      chrome.storage.local.set(updates, () => {
        populateOutreachTemplateSelect();
        populateTemplateManageSelect();
        populateDefaultTemplateSelect();
        templateManageSelect.value = outreachTemplates[0].id;
        loadTemplateIntoEditor(outreachTemplates[0].id);
        updateTemplateActionButtons();
        showToast("Template deleted", "success");
      });
    });
  }

  function resetTemplateToDefault() {
    const templateId = templateManageSelect.value;
    const defaultTemplate = DEFAULT_OUTREACH_TEMPLATES.find(
      (template) => template.id === templateId
    );

    if (!defaultTemplate) return;
    if (!confirm(`Reset "${defaultTemplate.name}" to default content?`)) return;

    const index = outreachTemplates.findIndex(
      (template) => template.id === templateId
    );
    if (index === -1) return;

    outreachTemplates[index] = { ...defaultTemplate };

    chrome.storage.local.set({ outreachTemplates }, () => {
      loadTemplateIntoEditor(templateId);
      showToast("Template reset to default", "success");
    });
  }

  function openMailDraft() {
    if (!collectedEmails.length) {
      updateStatus("Collect emails first");
      return;
    }

    const subject = outreachSubjectInput.value.trim();
    const body = outreachBodyInput.value.trim();

    if (!subject || !body) {
      updateStatus("Subject and message are required");
      return;
    }

    const draftUrl = buildMailDraftUrl(preferredMailClient, {
      bcc: collectedEmails,
      subject,
      body,
    });

    chrome.tabs.create({ url: draftUrl });
    showToast("Draft opened", "success");
    updateStatus("");
  }

  function saveOutreachEdits() {
    generatedSubject = outreachSubjectInput.value;
    generatedBody = outreachBodyInput.value;
    chrome.storage.local.set({
      generatedSubject,
      generatedBody,
    });
  }

  /* =============== SCROLL PROGRESS =============== */
  function showScrollProgress() {
    scrollProgressContainer.classList.remove("hidden");
  }

  function hideScrollProgress() {
    scrollProgressContainer.classList.add("hidden");
    scrollProgressFill.style.width = "0%";
    scrollProgressText.textContent = "Scrolling 0/0";
  }

  function updateScrollProgress(progress) {
    if (!progress) return;

    const current = progress.current || 0;
    const total = progress.total || 0;
    const percent = total > 0 ? Math.min(100, (current / total) * 100) : 0;

    scrollProgressFill.style.width = `${percent}%`;

    if (progress.phase === "extracting") {
      scrollProgressText.textContent = "Extracting emails...";
    } else {
      scrollProgressText.textContent = `Scrolling ${current}/${total}`;
    }
  }

  function setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== "local") return;
      handleCollectionStorageChanges(changes);
    });
  }

  /* =============== HELPERS =============== */
  function updateStatus(text) {
    statusText.textContent = text;
    if (text) {
      statusText.classList.remove("hidden");
    } else {
      statusText.classList.add("hidden");
    }
  }

  function hideResults() {
    resultContainer.classList.add("hidden");
    outreachContainer.classList.add("hidden");
    collectedEmails = [];
  }

  function displayEmails(emails) {
    resultContainer.classList.remove("hidden");
    outreachContainer.classList.remove("hidden");
    emailCount.textContent = `Found ${emails.length} email${
      emails.length === 1 ? "" : "s"
    }`;
    emailList.textContent = emails.join("\n");
    applySelectedTemplate(true);
  }

  chrome.tabs.onActivated.addListener(() => {
    checkCurrentTab();
    loadState();
  });
});
