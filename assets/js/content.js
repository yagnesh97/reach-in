// content.js
(function () {
  // Check if already initialized to prevent double execution
  if (window.__linkedinEmailCollectorInitialized) {
    return;
  }
  window.__linkedinEmailCollectorInitialized = true;

  let cachedEmails = new Set();

  // Load cached emails from storage
  chrome.storage.local.get(["cachedEmails"], function (result) {
    if (result.cachedEmails) {
      cachedEmails = new Set(result.cachedEmails);
    }
  });

  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.action === "collectEmails") {
      scrollAndExtract(
        request.scrollCount,
        request.scrollSpeed || 2000,
        request.excludeKeywords,
        request.includeUnique,
        sendResponse
      );
      return true; // Indicates we will respond asynchronously
    } else if (request.action === "clearCache") {
      cachedEmails.clear();
      chrome.storage.local.remove(["cachedEmails"]);
      sendResponse({ success: true });
    } else if (request.action === "updateSearchInput") {
      const success = updateLinkedInSearch(request.keywords);
      sendResponse({ success: success });
      return true;
    } else if (request.action === "checkSearchPageReady") {
      sendResponse(checkSearchPageReady(request.keywords));
      return true;
    }
  });

  function getUrlSearchKeywords() {
    try {
      const params = new URL(window.location.href).searchParams;
      const keywords = params.get("keywords");
      if (!keywords) return "";
      return decodeURIComponent(keywords.replace(/\+/g, " "));
    } catch (e) {
      return "";
    }
  }

  function normalizeKeywordsForComparison(keywords) {
    if (!keywords) return [];
    return keywords
      .replace(/"/g, "")
      .replace(/\s+AND\s+/gi, ",")
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean)
      .sort();
  }

  function keywordsMatch(urlKeywords, processedKeywords) {
    const fromUrl = normalizeKeywordsForComparison(urlKeywords);
    const expected = normalizeKeywordsForComparison(processedKeywords);
    if (fromUrl.length === 0 || expected.length === 0) return false;
    if (fromUrl.length !== expected.length) return false;
    return fromUrl.every((k, i) => k === expected[i]);
  }

  function isSearchPageDomReady() {
    const loaders = document.querySelectorAll(
      '.artdeco-loader, [aria-label="Loading"], .search-results__loader, .search-results__loader-state'
    );
    const hasVisibleLoader = [...loaders].some(
      (el) => el.offsetParent !== null || el.getClientRects().length > 0
    );
    if (hasVisibleLoader) return false;

    const resultSelectors = [
      ".feed-shared-update-v2",
      "[data-chameleon-result-urn]",
      ".reusable-search__result-container",
      ".search-marvel-srp",
      ".search-results-container li",
      'div[data-finite-scroll-hotkey-context] .scaffold-finite-scroll__content > *',
      "main article",
      "main [data-urn]",
      ".entity-result",
      ".update-components-actor",
      ".feed-shared-actor",
    ];

    for (const sel of resultSelectors) {
      if (document.querySelector(sel)) return true;
    }

    const emptyState = document.querySelector(
      ".search-no-results-placeholder, .search-reusables__no-results"
    );
    if (emptyState) return true;

    const main = document.querySelector("main");
    if (main && main.innerText.trim().length > 50) return true;

    return document.readyState === "complete" && document.body.innerText.length > 500;
  }

  function getSearchInputKeywords() {
    const searchInput = document.querySelector(
      ".search-global-typeahead__input"
    );
    if (!searchInput?.value) return "";
    return searchInput.value.trim();
  }

  function checkSearchPageReady(expectedKeywords, pollCount = 0) {
    const url = window.location.href;
    if (!url.includes("linkedin.com/search/results/content")) {
      return { ready: false, keywordsMatch: false, domReady: false };
    }

    const urlKeywords = getUrlSearchKeywords();
    const inputKeywords = getSearchInputKeywords();
    const keywordsOk =
      keywordsMatch(urlKeywords, expectedKeywords) ||
      keywordsMatch(inputKeywords, expectedKeywords);
    const domReady = isSearchPageDomReady();
    const pageSettled =
      document.readyState === "complete" || document.readyState === "interactive";

    // After a few polls, keywords on the search URL are enough — DOM selectors vary
    const ready =
      keywordsOk &&
      pageSettled &&
      (domReady || pollCount >= 2);

    return {
      ready,
      keywordsMatch: keywordsOk,
      domReady,
    };
  }

  function updateLinkedInSearch(keywords) {
    try {
      // Find the LinkedIn search input
      const searchInput = document.querySelector(
        ".search-global-typeahead__input"
      );

      if (!searchInput) {
        console.log("Search input not found");
        return false;
      }

      // Clear existing value and set new keywords
      searchInput.value = "";
      searchInput.focus();

      // Set the value
      searchInput.value = keywords;

      // Trigger input event
      const inputEvent = new Event("input", {
        bubbles: true,
        cancelable: true,
      });
      searchInput.dispatchEvent(inputEvent);

      // Wait a moment for any autocomplete to appear, then trigger search
      setTimeout(() => {
        // Simulate Enter key press
        const enterEvent = new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        });
        searchInput.dispatchEvent(enterEvent);

        // Also try keyup event
        const enterUpEvent = new KeyboardEvent("keyup", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        });
        searchInput.dispatchEvent(enterUpEvent);

        // Try triggering form submit if search is in a form
        const form = searchInput.closest("form");
        if (form) {
          form.submit();
        }

        // Close the search suggestions dropdown
        setTimeout(() => {
          // Blur the input to close suggestions
          searchInput.blur();

          // Try to find and close the overlay/dropdown
          const overlay = document.querySelector(
            ".search-global-typeahead__overlay"
          );
          if (overlay) {
            overlay.style.display = "none";
          }

          // Click outside to close dropdown
          document.body.click();
        }, 200);
      }, 300);

      return true;
    } catch (error) {
      console.error("Error updating search:", error);
      return false;
    }
  }

  function getScrollRoot() {
    return document.querySelector("main") || document.documentElement;
  }

  function scrollPage() {
    const scrollRoot = getScrollRoot();
    scrollRoot.scrollBy(0, scrollRoot.clientHeight);
  }

  function scrollAndExtract(
    scrollCount,
    scrollSpeed,
    excludeKeywords,
    includeUnique,
    callback
  ) {
    let count = 0;

    function setScrollProgress(current, phase) {
      chrome.storage.local.set({
        scrollProgress: { current, total: scrollCount, phase },
      });
    }

    setScrollProgress(0, "scrolling");

    const interval = setInterval(() => {
      scrollPage();
      count++;
      setScrollProgress(count, "scrolling");

      // Click any "see more" buttons that are currently visible
      document
        .querySelectorAll('button.see-more:not([data-clicked="true"])')
        .forEach((button) => {
          button.click();
          button.setAttribute("data-clicked", "true");
        });

      // Also try other common "show more" button selectors on LinkedIn
      document
        .querySelectorAll(
          'button[aria-label*="see more"], button[aria-label*="Show more"]'
        )
        .forEach((button) => {
          if (!button.getAttribute("data-clicked")) {
            button.click();
            button.setAttribute("data-clicked", "true");
          }
        });

      if (count >= scrollCount) {
        clearInterval(interval);
        finishExtraction(scrollCount, excludeKeywords, includeUnique, callback);
      }
    }, scrollSpeed);
  }

  function finishExtraction(scrollCount, excludeKeywords, includeUnique, callback) {
    chrome.storage.local.set({
      scrollProgress: {
        current: scrollCount,
        total: scrollCount,
        phase: "extracting",
      },
    });

    // Final pass to click any remaining "see more" buttons
    document
      .querySelectorAll('button.see-more:not([data-clicked="true"])')
      .forEach((button) => {
        button.click();
        button.setAttribute("data-clicked", "true");
      });

    document
      .querySelectorAll(
        'button[aria-label*="see more"], button[aria-label*="Show more"]'
      )
      .forEach((button) => {
        if (!button.getAttribute("data-clicked")) {
          button.click();
          button.setAttribute("data-clicked", "true");
        }
      });

    // Wait for content to expand
    setTimeout(() => {
      const emails = extractEmails(excludeKeywords, includeUnique);

      // Update cached emails in storage if collecting unique emails
      if (includeUnique) {
        const combinedEmails = [...cachedEmails];
        chrome.storage.local.set({ cachedEmails: combinedEmails });
      }

      chrome.storage.local.remove("scrollProgress");
      callback({ emails: emails });
    }, 2000);
  }

  function extractEmails(excludeKeywords, includeUnique) {
    const foundEmails = new Set();

    // Extract emails from mailto links
    document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
      const email = link
        .getAttribute("href")
        .replace(/^mailto:/, "")
        .split("?")[0]
        .toLowerCase();
      if (isValidEmail(email) && !shouldExclude(email, excludeKeywords)) {
        foundEmails.add(email);
      }
    });

    // Extract emails from text content
    const allText = document.body.innerText;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matchedEmails = allText.match(emailRegex) || [];

    matchedEmails.forEach((email) => {
      const lowerEmail = email.toLowerCase();
      if (
        isValidEmail(lowerEmail) &&
        !shouldExclude(lowerEmail, excludeKeywords)
      ) {
        foundEmails.add(lowerEmail);
      }
    });

    // Filter out already cached emails if uniqueness is required
    let resultEmails = [...foundEmails];
    if (includeUnique) {
      resultEmails = resultEmails.filter((email) => !cachedEmails.has(email));

      // Add newly found emails to the cache
      resultEmails.forEach((email) => cachedEmails.add(email));
    }

    // Sort emails alphabetically
    return resultEmails.sort();
  }

  function isValidEmail(email) {
    // Basic email validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function shouldExclude(email, excludeKeywords) {
    if (!excludeKeywords || excludeKeywords.length === 0) {
      return false;
    }

    return excludeKeywords.some((keyword) => {
      const trimmedKeyword = keyword.trim();
      return trimmedKeyword && email.includes(trimmedKeyword);
    });
  }

  const FLOW_WATCH_STATES = new Set([
    "WAITING_FOR_PAGE",
    "OPENING_LINKEDIN",
    "NAVIGATING_TO_SEARCH",
  ]);
  const FLOW_WATCH_INTERVAL_MS = 1500;
  let flowWatchTimer = null;
  let flowWatchPolls = 0;

  function stopFlowWatch() {
    if (flowWatchTimer) {
      clearInterval(flowWatchTimer);
      flowWatchTimer = null;
    }
    flowWatchPolls = 0;
  }

  function startFlowWatch(expectedKeywords) {
    stopFlowWatch();

    const tick = () => {
      flowWatchPolls += 1;
      const status = checkSearchPageReady(expectedKeywords, flowWatchPolls);
      if (!status.ready) return;

      if (flowWatchTimer) {
        clearInterval(flowWatchTimer);
        flowWatchTimer = null;
      }

      chrome.runtime.sendMessage({ action: "searchPageReady" }, (response) => {
        if (chrome.runtime.lastError || !response?.handled) {
          flowWatchTimer = setInterval(tick, FLOW_WATCH_INTERVAL_MS);
          return;
        }
        stopFlowWatch();
      });
    };

    tick();
    flowWatchTimer = setInterval(tick, FLOW_WATCH_INTERVAL_MS);
  }

  function maybeStartFlowWatch() {
    chrome.storage.local.get(
      ["collectionFlowState", "collectionIntent"],
      (data) => {
        if (!FLOW_WATCH_STATES.has(data.collectionFlowState)) {
          stopFlowWatch();
          return;
        }

        const keywords = data.collectionIntent?.processedKeywords;
        if (!keywords || !window.location.href.includes("linkedin.com")) {
          return;
        }

        startFlowWatch(keywords);
      }
    );
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.collectionFlowState || changes.collectionIntent || changes.collectionWatchToken) {
      maybeStartFlowWatch();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", maybeStartFlowWatch);
  } else {
    maybeStartFlowWatch();
  }
})();
