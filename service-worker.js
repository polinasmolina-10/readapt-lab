const DEFAULT_PROFILE = {
  fontFamily: "system",
  fontSize: 18,
  lineHeight: 1.65,
  letterSpacing: 0,
  wordSpacing: 0,
  columnWidth: 72,
  background: "#fffaf0",
  distractionFree: false,
  readingRuler: false,
  enabled: true
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(["profile", "results"]);
  if (!stored.profile) await chrome.storage.local.set({ profile: DEFAULT_PROFILE });
  if (!stored.results) await chrome.storage.local.set({ results: [] });
  chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "OPEN_QUIZ") return;
  chrome.storage.local.set({ activeExperiment: message.payload }).then(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL("quiz.html") });
    sendResponse({ ok: true });
  });
  return true;
});
