const { blacklist, linkPatterns } = require("./reviewBlacklist");

const normalizeText = (text) => {
  const rawLower = String(text || "").toLowerCase();
  const noDiacritics = rawLower
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
  const cleaned = noDiacritics.replace(/[^a-z0-9\s]/g, " ");
  const normalized = cleaned.replace(/\s+/g, " ").trim();

  return { rawLower, normalized };
};

const containsBlacklistedWord = (text) => {
  if (!text) return false;
  return blacklist.some((term) => text.includes(term));
};

const containsLinkPattern = (text) => {
  if (!text) return false;
  return linkPatterns.some((pattern) => pattern.test(text));
};

const detectReviewViolation = (text) => {
  const { rawLower, normalized } = normalizeText(text);

  if (containsBlacklistedWord(normalized)) {
    return { isViolation: true, reason: "BLACKLIST", normalized };
  }

  if (containsLinkPattern(rawLower)) {
    return { isViolation: true, reason: "LINK", normalized };
  }

  return { isViolation: false, reason: null, normalized };
};

module.exports = {
  detectReviewViolation,
  normalizeText,
};
