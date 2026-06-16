// Shared collection helpers (popup + background)
const COLLECTION_FLOW_STATE = Object.freeze({
  IDLE: "IDLE",
  OPENING_LINKEDIN: "OPENING_LINKEDIN",
  NAVIGATING_TO_SEARCH: "NAVIGATING_TO_SEARCH",
  WAITING_FOR_PAGE: "WAITING_FOR_PAGE",
  PREPARING_COLLECTION: "PREPARING_COLLECTION",
  COLLECTING: "COLLECTING",
  COMPLETED: "COMPLETED",
  ERROR: "ERROR",
});

const IN_PROGRESS_FLOW_STATES = new Set([
  COLLECTION_FLOW_STATE.OPENING_LINKEDIN,
  COLLECTION_FLOW_STATE.NAVIGATING_TO_SEARCH,
  COLLECTION_FLOW_STATE.WAITING_FOR_PAGE,
  COLLECTION_FLOW_STATE.PREPARING_COLLECTION,
  COLLECTION_FLOW_STATE.COLLECTING,
]);

const NAVIGATION_TIMEOUT_MS = 60000;
const COLLECTION_START_DELAY_MS = 1500;
const PAGE_READY_INITIAL_DELAY_MS = 2000;
const PAGE_READY_POLL_INTERVAL_MS = 2000;

function processKeywords(input) {
  const keywords = input
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (keywords.length === 0) return "";

  return keywords.map((k) => `"${k}"`).join(" AND ");
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

function getCurrentSearchKeywords(url) {
  try {
    const urlObj = new URL(url);
    const keywords = urlObj.searchParams.get("keywords");
    if (!keywords) return "";
    return decodeURIComponent(keywords.replace(/\+/g, " "));
  } catch (e) {
    return "";
  }
}

function buildSearchUrl(processedKeywords) {
  return (
    "https://www.linkedin.com/search/results/content/?keywords=" +
    encodeURIComponent(processedKeywords) +
    "&origin=GLOBAL_SEARCH_HEADER&sortBy=date_posted"
  );
}

function isLinkedInUrl(url) {
  return Boolean(url && url.includes("linkedin.com"));
}

function isLinkedInSearchUrl(url) {
  return Boolean(url && url.includes("linkedin.com/search/results/content"));
}

function detectCollectionContext(url, processedKeywords) {
  if (!isLinkedInUrl(url)) {
    return "offLinkedIn";
  }
  if (!isLinkedInSearchUrl(url)) {
    return "linkedInOther";
  }
  const currentSearchKeywords = getCurrentSearchKeywords(url);
  if (!keywordsMatch(currentSearchKeywords, processedKeywords)) {
    return "searchMismatch";
  }
  return "searchReady";
}

function parseExcludeKeywords(excludeKeywords) {
  return excludeKeywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function isFlowInProgress(state) {
  return IN_PROGRESS_FLOW_STATES.has(state);
}
