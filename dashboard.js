function average(items, key) { return items.length ? items.reduce((s, x) => s + x[key], 0) / items.length : 0; }
const HAS_EXTENSION_API = typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
async function getResults() {
  if (HAS_EXTENSION_API) return (await chrome.storage.local.get("results")).results || [];
  return JSON.parse(localStorage.getItem("readapt:results") || "[]");
}
function mins(seconds) { return `${(seconds / 60).toFixed(1)} мин`; }
function escapeHtml(value) { const d = document.createElement("div"); d.textContent = value; return d.innerHTML; }

function metric(label, value, note) {
  return `<article class="metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
}

function renderSummary(results) {
  const standard = results.filter((r) => r.mode === "standard");
  const personal = results.filter((r) => r.mode === "personalized");
  const scoreDelta = average(personal, "comprehensionPercent") - average(standard, "comprehensionPercent");
  document.getElementById("summary").innerHTML = [
    metric("Сессии", results.length, `${standard.length} обычных · ${personal.length} персональных`),
    metric("Среднее понимание", results.length ? `${Math.round(average(results, "comprehensionPercent"))}%` : "—", "доля правильных ответов"),
    metric("Эффект профиля", standard.length && personal.length ? `${scoreDelta >= 0 ? "+" : ""}${Math.round(scoreDelta)} п.п.` : "—", "разница в понимании"),
    metric("Усталость", results.length ? `${average(results, "fatigue").toFixed(1)} / 5` : "—", "меньше — лучше")
  ].join("");
}

function renderChart(results) {
  const chart = document.getElementById("chart");
  if (!results.length) { chart.innerHTML = `<div class="empty">Пока нет данных. Начните эксперимент на странице с длинной статьёй.</div>`; return; }
  chart.innerHTML = results.slice(-12).map((r) => `<div class="bar-wrap" title="${escapeHtml(r.title)}: ${r.comprehensionPercent}%">
    <div class="bar ${r.mode}" style="height:${Math.max(4, r.comprehensionPercent)}%"><span>${r.comprehensionPercent}%</span></div><small>${new Date(r.createdAt).toLocaleDateString("ru", {day:"2-digit",month:"2-digit"})}</small>
  </div>`).join("");
}

function renderComparison(results) {
  const standard = results.filter((r) => r.mode === "standard");
  const personal = results.filter((r) => r.mode === "personalized");
  const value = (items, key, suffix = "") => items.length ? `${average(items, key).toFixed(key === "comprehensionPercent" ? 0 : 1)}${suffix}` : "—";
  const deltaScore = standard.length && personal.length ? average(personal, "comprehensionPercent") - average(standard, "comprehensionPercent") : null;
  const deltaFatigue = standard.length && personal.length ? average(personal, "fatigue") - average(standard, "fatigue") : null;
  document.getElementById("comparison").innerHTML = `<table class="comparison-table"><thead><tr><th>Метрика</th><th>Обычный</th><th>Персональный</th><th>Разница</th></tr></thead><tbody>
    <tr><td>Понимание</td><td>${value(standard,"comprehensionPercent","%")}</td><td>${value(personal,"comprehensionPercent","%")}</td><td class="${deltaScore >= 0 ? "positive" : "caution"}">${deltaScore === null ? "—" : `${deltaScore >= 0 ? "+" : ""}${deltaScore.toFixed(0)} п.п.`}</td></tr>
    <tr><td>Время</td><td>${value(standard,"durationSeconds"," сек")}</td><td>${value(personal,"durationSeconds"," сек")}</td><td>—</td></tr>
    <tr><td>Усталость</td><td>${value(standard,"fatigue"," / 5")}</td><td>${value(personal,"fatigue"," / 5")}</td><td class="${deltaFatigue <= 0 ? "positive" : "caution"}">${deltaFatigue === null ? "—" : `${deltaFatigue >= 0 ? "+" : ""}${deltaFatigue.toFixed(1)}`}</td></tr></tbody></table>`;
  const minGroup = Math.min(standard.length, personal.length);
  document.getElementById("evidenceNote").textContent = minGroup < 5 ? `Предварительно: нужно ещё ${5 - minGroup} сессий в каждом условии` : `${results.length} наблюдений`;
}

function renderHistory(results) {
  const history = document.getElementById("history");
  if (!results.length) { history.innerHTML = `<div class="empty">Результаты появятся здесь после первого теста.</div>`; return; }
  history.innerHTML = `<div class="table"><div class="tr header"><span>Статья</span><span>Режим</span><span>Понимание</span><span>Время</span><span>Усталость</span></div>${[...results].reverse().map((r) => `<div class="tr"><span><a href="${escapeHtml(r.url)}" target="_blank">${escapeHtml(r.title || "Без названия")}</a><small>${new Date(r.createdAt).toLocaleString("ru")}</small></span><span><b class="pill ${r.mode}">${r.mode === "standard" ? "Обычный" : "Персональный"}</b></span><span>${r.comprehensionPercent}%</span><span>${mins(r.durationSeconds)}</span><span>${r.fatigue} / 5</span></div>`).join("")}</div>`;
}

async function init() {
  const results = await getResults();
  renderSummary(results); renderComparison(results); renderChart(results); renderHistory(results);
  document.getElementById("exportData").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), results }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "readapt-results.json"; a.click(); URL.revokeObjectURL(a.href);
  });
  document.getElementById("exportCsv").addEventListener("click", () => {
    const fields = ["id","createdAt","participantId","researchMode","mode","title","url","durationSeconds","comprehensionPercent","fatigue"];
    const escape = (value) => `"${String(value ?? "").replaceAll('"','""')}"`;
    const csv = [fields.join(","), ...results.map((row) => fields.map((key) => escape(row[key])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "readapt-results.csv"; a.click(); URL.revokeObjectURL(a.href);
  });
}
init();
