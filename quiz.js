const STOPWORDS = new Set("который которая которые этого этой также только чтобы после перед между через очень более может было были быть или для как что это при его ее их над под без the and that with from this have were been into about which when where your more than then them they will would could should".split(" "));
const HAS_EXTENSION_API = typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
async function storageGet(key) {
  if (HAS_EXTENSION_API) return chrome.storage.local.get(key);
  return { [key]: JSON.parse(localStorage.getItem(`readapt:${key}`) || "null") };
}
async function storageSet(values) {
  if (HAS_EXTENSION_API) return chrome.storage.local.set(values);
  Object.entries(values).forEach(([key, value]) => localStorage.setItem(`readapt:${key}`, JSON.stringify(value)));
}

function words(text) {
  return text.match(/[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё-]{4,}/g) || [];
}

function seededShuffle(items, seed) {
  const result = [...items];
  let value = seed || 1;
  for (let i = result.length - 1; i > 0; i--) {
    value = (value * 9301 + 49297) % 233280;
    const j = Math.floor((value / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateQuiz(text, count = 3) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 90 && s.length <= 280);
  const pool = words(text).filter((w) => !STOPWORDS.has(w.toLowerCase()));
  const frequencies = pool.reduce((acc, word) => {
    const key = word.toLowerCase(); acc[key] = (acc[key] || 0) + 1; return acc;
  }, {});
  const candidates = sentences.map((sentence, index) => {
    const viable = words(sentence).filter((w) => !STOPWORDS.has(w.toLowerCase()) && w.length >= 6);
    const answer = viable.sort((a, b) => (frequencies[b.toLowerCase()] || 0) - (frequencies[a.toLowerCase()] || 0) || b.length - a.length)[0];
    return answer ? { sentence, answer, index } : null;
  }).filter(Boolean);
  const picked = seededShuffle(candidates, text.length).slice(0, count);
  return picked.map((item, qIndex) => {
    const answerLower = item.answer.toLowerCase();
    const distractors = seededShuffle([...new Set(pool.filter((w) => {
      const lower = w.toLowerCase();
      return lower !== answerLower && Math.abs(w.length - item.answer.length) <= 3;
    }).map((w) => w.toLowerCase()))], item.index + text.length)
      .slice(0, 3);
    const options = seededShuffle([item.answer, ...distractors], qIndex + item.index + 7);
    return { prompt: item.sentence.replace(item.answer, "______"), answer: item.answer, options };
  }).filter((q) => q.options.length >= 3);
}

function renderQuestion(question, index) {
  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");
  legend.textContent = `${index + 1}. Восстановите пропущенное слово`;
  fieldset.appendChild(legend);
  const quote = document.createElement("p"); quote.className = "quote"; quote.textContent = question.prompt; fieldset.appendChild(quote);
  question.options.forEach((option) => {
    const label = document.createElement("label"); label.className = "option";
    const input = document.createElement("input"); input.type = "radio"; input.name = `q${index}`; input.value = option; input.required = true;
    label.append(input, document.createTextNode(option)); fieldset.appendChild(label);
  });
  return fieldset;
}

async function init() {
  const { activeExperiment } = await storageGet("activeExperiment");
  if (!activeExperiment) {
    document.getElementById("quizView").innerHTML = "<h1>Активная сессия не найдена</h1><p>Начните эксперимент из меню расширения.</p>"; return;
  }
  const questions = generateQuiz(activeExperiment.article.text);
  if (!questions.length) {
    document.getElementById("quizForm").innerHTML = "<p>Не удалось создать вопросы для этой страницы. Попробуйте более длинную статью.</p>"; return;
  }
  questions.forEach((q, i) => document.getElementById("quizForm").appendChild(renderQuestion(q, i)));
  const fatigue = document.getElementById("fatigue");
  fatigue.addEventListener("input", () => document.getElementById("fatigueOut").textContent = `${fatigue.value} / 5`);
  document.getElementById("submitQuiz").addEventListener("click", async () => {
    const unanswered = questions.some((_q, i) => !document.querySelector(`input[name=q${i}]:checked`));
    if (unanswered) return document.getElementById("quizForm").reportValidity();
    const correct = questions.reduce((sum, q, i) => sum + (document.querySelector(`input[name=q${i}]:checked`).value.toLowerCase() === q.answer.toLowerCase() ? 1 : 0), 0);
    const now = Date.now();
    const result = {
      id: activeExperiment.id, createdAt: now, mode: activeExperiment.mode,
      title: activeExperiment.article.title, url: activeExperiment.article.url,
      durationSeconds: Math.max(1, Math.round(((activeExperiment.finishedAt || now) - activeExperiment.startedAt) / 1000)),
      score: correct, total: questions.length, comprehensionPercent: Math.round(correct / questions.length * 100),
      fatigue: Number(fatigue.value), profile: activeExperiment.profile,
      researchMode: Boolean(activeExperiment.researchMode), participantId: activeExperiment.participantId || null,
      consentVersion: activeExperiment.consentVersion || null
    };
    const stored = await storageGet("results");
    await storageSet({ results: [...(stored.results || []), result], activeExperiment: null });
    if (HAS_EXTENSION_API && activeExperiment.tabId) {
      try { await chrome.tabs.sendMessage(activeExperiment.tabId, { type: "APPLY_PROFILE", profile: activeExperiment.profile }); } catch {}
    }
    document.getElementById("quizView").classList.add("hidden");
    document.getElementById("doneView").classList.remove("hidden");
    document.getElementById("scoreText").textContent = `Понимание: ${result.comprehensionPercent}%. Время чтения: ${Math.round(result.durationSeconds / 60 * 10) / 10} мин.`;
  });
}
init();
