(() => {
  if (window.__readaptLoaded) return;
  window.__readaptLoaded = true;

  const STYLE_ID = "readapt-styles";
  const RULER_ID = "readapt-reading-ruler";
  const ROOT_CLASS = "readapt-active";
  const DISTRACTION_CLASS = "readapt-distraction-free";
  const PARAGRAPH_CLASS = "readapt-paragraph-focus";
  let speaking = false;
  const FONT_STACKS = {
    system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    lexend: "Lexend, Verdana, Arial, sans-serif",
    mono: "'Atkinson Hyperlegible Mono', Consolas, monospace"
  };

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.documentElement.appendChild(style);
    }
    return style;
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  }

  function textColorFor(background) {
    const [r, g, b] = hexToRgb(background);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.52 ? "#17202a" : "#f7f7f2";
  }

  function cssFor(profile) {
    const font = FONT_STACKS[profile.fontFamily] || FONT_STACKS.system;
    const color = textColorFor(profile.background);
    return `
      html.${ROOT_CLASS}, html.${ROOT_CLASS} body {
        background: ${profile.background} !important;
        color: ${color} !important;
      }
      html.${ROOT_CLASS} body :is(p, li, blockquote, dd, dt, figcaption) {
        font-family: ${font} !important;
        font-size: ${profile.fontSize}px !important;
        line-height: ${profile.lineHeight} !important;
        letter-spacing: ${profile.letterSpacing}px !important;
        word-spacing: ${profile.wordSpacing}px !important;
        color: ${color} !important;
      }
      html.${ROOT_CLASS} body :is(main, article, [role="main"]) {
        max-width: ${profile.columnWidth}ch !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }
      html.${DISTRACTION_CLASS} body :is(header, nav, aside, footer, [role="banner"], [role="navigation"], [role="complementary"],
        [class*="advert" i], [class*="sidebar" i], [class*="social" i], [class*="cookie" i], [class*="popup" i]) {
        display: none !important;
      }
      html.${DISTRACTION_CLASS} body { max-width: ${profile.columnWidth + 10}ch !important; margin: 0 auto !important; }
      html.${PARAGRAPH_CLASS} body :is(p, li, blockquote) { opacity: .22 !important; transition: opacity .15s ease !important; }
      html.${PARAGRAPH_CLASS} body :is(p, li, blockquote):hover,
      html.${PARAGRAPH_CLASS} body :is(p, li, blockquote):focus-within { opacity: 1 !important; }
      #${RULER_ID} {
        position: fixed; z-index: 2147483646; pointer-events: none; left: 0; right: 0;
        height: ${Math.round(profile.fontSize * profile.lineHeight)}px;
        background: rgba(255, 207, 64, .20); border-top: 1px solid rgba(196, 131, 0, .35);
        border-bottom: 1px solid rgba(196, 131, 0, .35); display: none;
      }
    `;
  }

  function updateRuler(profile) {
    let ruler = document.getElementById(RULER_ID);
    if (profile.readingRuler) {
      if (!ruler) {
        ruler = document.createElement("div");
        ruler.id = RULER_ID;
        document.documentElement.appendChild(ruler);
      }
      ruler.style.display = "block";
    } else if (ruler) {
      ruler.remove();
    }
  }

  function applyProfile(profile) {
    const enabled = profile?.enabled !== false;
    document.documentElement.classList.toggle(ROOT_CLASS, enabled);
    document.documentElement.classList.toggle(DISTRACTION_CLASS, enabled && Boolean(profile.distractionFree));
    document.documentElement.classList.toggle(PARAGRAPH_CLASS, enabled && Boolean(profile.paragraphFocus));
    ensureStyle().textContent = enabled ? cssFor(profile) : "";
    updateRuler(enabled ? profile : { readingRuler: false });
  }

  function moveRuler(event) {
    const ruler = document.getElementById(RULER_ID);
    if (ruler) ruler.style.top = `${Math.max(0, event.clientY - ruler.offsetHeight / 2)}px`;
  }

  function extractArticle() {
    const root = document.querySelector("article, main, [role='main']") || document.body;
    const blocks = [...root.querySelectorAll("p, li")]
      .map((node) => node.innerText.replace(/\s+/g, " ").trim())
      .filter((text) => text.length >= 80);
    const title = document.querySelector("h1")?.innerText.trim() || document.title;
    return { title, url: location.href, text: blocks.join("\n\n").slice(0, 30000) };
  }

  function toggleSpeech() {
    if (speaking) {
      speechSynthesis.cancel();
      speaking = false;
      return false;
    }
    const article = extractArticle();
    if (!article.text) return false;
    const utterance = new SpeechSynthesisUtterance(article.text.slice(0, 12000));
    utterance.lang = document.documentElement.lang || "ru-RU";
    utterance.rate = 0.95;
    utterance.onend = () => { speaking = false; };
    speechSynthesis.speak(utterance);
    speaking = true;
    return true;
  }

  document.addEventListener("mousemove", moveRuler, { passive: true });
  chrome.storage.local.get(["profile", "siteProfiles"]).then(({ profile, siteProfiles }) => {
    const siteProfile = siteProfiles?.[location.hostname];
    if (siteProfile || profile) applyProfile(siteProfile || profile);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "APPLY_PROFILE") {
      applyProfile(message.profile);
      sendResponse({ ok: true });
    }
    if (message.type === "EXTRACT_ARTICLE") sendResponse(extractArticle());
    if (message.type === "TOGGLE_SPEECH") sendResponse({ speaking: toggleSpeech() });
    return true;
  });
})();
