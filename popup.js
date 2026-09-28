const DEFAULT_PROFILE = { fontFamily: "system", fontSize: 18, lineHeight: 1.65, letterSpacing: 0, wordSpacing: 0, columnWidth: 72, background: "#fffaf0", distractionFree: false, readingRuler: false, paragraphFocus: false, researchMode: false, enabled: true };
const FIELD_IDS = ["fontFamily", "fontSize", "lineHeight", "letterSpacing", "wordSpacing", "columnWidth", "background", "distractionFree", "readingRuler", "paragraphFocus", "researchMode", "enabled"];
const outputs = { fontSize: (v) => `${v} px`, lineHeight: (v) => `${v}×`, letterSpacing: (v) => `${v} px`, wordSpacing: (v) => `${v} px`, columnWidth: (v) => `${v} зн.` };
const PRESETS = {
  calm: { fontFamily: "serif", fontSize: 19, lineHeight: 1.75, letterSpacing: 0.1, wordSpacing: 1, columnWidth: 68, background: "#fffaf0", distractionFree: true, readingRuler: false, paragraphFocus: false },
  focus: { fontFamily: "lexend", fontSize: 20, lineHeight: 1.8, letterSpacing: 0.3, wordSpacing: 1.5, columnWidth: 58, background: "#f3f7f1", distractionFree: true, readingRuler: true, paragraphFocus: true },
  night: { fontFamily: "system", fontSize: 19, lineHeight: 1.7, letterSpacing: 0.1, wordSpacing: 1, columnWidth: 68, background: "#18221f", distractionFree: true, readingRuler: true, paragraphFocus: false }
};
const HAS_EXTENSION_API = typeof chrome !== "undefined" && Boolean(chrome.storage?.local);

async function storageGet(keys) {
  if (HAS_EXTENSION_API) return chrome.storage.local.get(keys);
  const list = Array.isArray(keys) ? keys : [keys];
  return Object.fromEntries(list.map((key) => [key, JSON.parse(localStorage.getItem(`readapt:${key}`) || "null")]));
}
async function storageSet(values) {
  if (HAS_EXTENSION_API) return chrome.storage.local.set(values);
  Object.entries(values).forEach(([key, value]) => localStorage.setItem(`readapt:${key}`, JSON.stringify(value)));
}
async function currentTab() {
  if (!HAS_EXTENSION_API) return null;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToPage(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    return chrome.tabs.sendMessage(tabId, message);
  }
}
function readProfile() {
  return Object.fromEntries(FIELD_IDS.map((id) => {
    const el = document.getElementById(id);
    return [id, el.type === "checkbox" ? el.checked : el.type === "range" ? Number(el.value) : el.value];
  }));
}
function render(profile) {
  FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el.type === "checkbox") el.checked = Boolean(profile[id]); else el.value = profile[id];
    if (outputs[id]) document.getElementById(`${id}Out`).textContent = outputs[id](profile[id]);
  });
}
function showStatus(text) {
  const status = document.getElementById("status"); status.textContent = text;
  setTimeout(() => { if (status.textContent === text) status.textContent = ""; }, 2000);
}
async function applyAndSave() {
  const profile = readProfile(); render(profile); await storageSet({ profile });
  if (!HAS_EXTENSION_API) return showStatus("Сохранено локально");
  try { const tab = await currentTab(); await sendToPage(tab.id, { type: "APPLY_PROFILE", profile }); showStatus("Сохранено"); }
  catch { showStatus("Откройте обычную веб-страницу"); }
}
async function startExperiment() {
  const tab = await currentTab(); let article;
  if (HAS_EXTENSION_API) {
    if (!tab?.url?.startsWith("http")) return showStatus("Нужна статья в интернете");
    try { article = await sendToPage(tab.id, { type: "EXTRACT_ARTICLE" }); }
    catch { return showStatus("Обновите страницу и повторите"); }
  } else {
    article = { title: "Текст автономного теста", url: "", text: document.getElementById("articleText").value.trim() };
  }
  if (!article?.text || article.text.length < 500) return showStatus("Добавьте не менее 500 знаков текста");
  const profile = readProfile();
  const state = await storageGet(["results", "researchSettings"]);
  if (profile.researchMode && !state.researchSettings?.consented) return showStatus("Сначала настройте исследование");
  const standardCount = (state.results || []).filter((r) => r.researchMode && r.mode === "standard").length;
  const personalCount = (state.results || []).filter((r) => r.researchMode && r.mode === "personalized").length;
  const mode = profile.researchMode && standardCount !== personalCount
    ? (standardCount < personalCount ? "standard" : "personalized")
    : (Math.random() < 0.5 ? "standard" : "personalized");
  await storageSet({ activeExperiment: { id: crypto.randomUUID(), mode, startedAt: Date.now(), article, profile, tabId: tab?.id || null, researchMode: profile.researchMode, participantId: state.researchSettings?.participantId || null, consentVersion: state.researchSettings?.consentVersion || null } });
  if (HAS_EXTENSION_API) await sendToPage(tab.id, { type: "APPLY_PROFILE", profile: { ...profile, enabled: mode === "personalized" } });
  document.getElementById("startExperiment").classList.add("hidden");
  document.getElementById("finishExperiment").classList.remove("hidden");
  document.getElementById("articleText")?.setAttribute("readonly", "");
  document.getElementById("experimentHint").textContent = profile.researchMode
    ? "Условие назначено случайно и скрыто. Прочитайте текст как обычно."
    : mode === "standard" ? "Сессия A: прочитайте текст в обычном режиме." : "Сессия B: прочитайте текст с персональным профилем.";
}
async function finishExperiment() {
  const { activeExperiment } = await storageGet("activeExperiment");
  if (!activeExperiment) return showStatus("Сессия не найдена");
  activeExperiment.finishedAt = Date.now();
  if (HAS_EXTENSION_API) { await chrome.runtime.sendMessage({ type: "OPEN_QUIZ", payload: activeExperiment }); window.close(); }
  else { await storageSet({ activeExperiment }); location.href = "quiz.html"; }
}
async function init() {
  const { profile, activeExperiment } = await storageGet(["profile", "activeExperiment"]);
  render({ ...DEFAULT_PROFILE, ...profile });
  FIELD_IDS.forEach((id) => document.getElementById(id).addEventListener("input", applyAndSave));
  document.getElementById("startExperiment").addEventListener("click", startExperiment);
  document.getElementById("finishExperiment").addEventListener("click", finishExperiment);
  document.getElementById("dashboard").addEventListener("click", () => HAS_EXTENSION_API ? chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") }) : location.href = "dashboard.html");
  document.getElementById("calibrate").addEventListener("click", () => HAS_EXTENSION_API ? chrome.tabs.create({ url: chrome.runtime.getURL("calibration.html") }) : location.href = "calibration.html");
  document.getElementById("researchSetup").addEventListener("click", () => HAS_EXTENSION_API ? chrome.tabs.create({ url: chrome.runtime.getURL("research.html") }) : location.href = "research.html");
  document.getElementById("saveSite").addEventListener("click", async () => {
    if (!HAS_EXTENSION_API) return showStatus("Доступно в расширении");
    try {
      const tab = await currentTab();
      const host = new URL(tab.url).hostname;
      const { siteProfiles = {} } = await storageGet("siteProfiles");
      await storageSet({ siteProfiles: { ...siteProfiles, [host]: readProfile() } });
      showStatus(`Сохранено для ${host}`);
    } catch { showStatus("Откройте обычный сайт"); }
  });
  document.getElementById("readAloud").addEventListener("click", async () => {
    if (!HAS_EXTENSION_API) return showStatus("Озвучивание доступно в расширении");
    try {
      const tab = await currentTab();
      const result = await sendToPage(tab.id, { type: "TOGGLE_SPEECH" });
      document.getElementById("readAloud").textContent = result.speaking ? "Остановить" : "Читать вслух";
    } catch { showStatus("Откройте статью"); }
  });
  document.getElementById("preset").addEventListener("change", async (event) => {
    const values = PRESETS[event.target.value];
    if (!values) return;
    render({ ...readProfile(), ...values });
    await applyAndSave();
  });
  if (!HAS_EXTENSION_API) { document.getElementById("standaloneInput").classList.remove("hidden"); document.getElementById("experimentHint").textContent = "Автономный режим: вставьте текст статьи, затем начните эксперимент."; }
  if (activeExperiment) {
    document.getElementById("startExperiment").classList.add("hidden"); document.getElementById("finishExperiment").classList.remove("hidden");
    document.getElementById("experimentHint").textContent = `Идёт сессия: ${activeExperiment.mode === "standard" ? "обычный" : "персональный"} режим.`;
  }
}
init();
