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
    }
  });

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

  function scrollAndExtract(
    scrollCount,
    scrollSpeed,
    excludeKeywords,
    includeUnique,
    callback
  ) {
    let count = 0;
    const interval = setInterval(() => {
      window.scrollBy(0, window.innerHeight);
      count++;

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
        finishExtraction(excludeKeywords, includeUnique, callback);
      }
    }, scrollSpeed);
  }

  function finishExtraction(excludeKeywords, includeUnique, callback) {
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
})();
