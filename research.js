const VERSION = "2026-09-27-v1";
const participant = document.getElementById("participantId");
const consent = document.getElementById("consent");
chrome.storage.local.get(["researchSettings"]).then(({ researchSettings }) => {
  if (!researchSettings) return;
  participant.value = researchSettings.participantId || "";
  consent.checked = Boolean(researchSettings.consented);
});
document.getElementById("saveResearch").addEventListener("click", async () => {
  const code = participant.value.trim();
  if (!code || !consent.checked) {
    document.getElementById("status").textContent = "Введите код и подтвердите согласие.";
    return;
  }
  const { profile = {} } = await chrome.storage.local.get("profile");
  await chrome.storage.local.set({
    researchSettings: { participantId: code, consented: true, consentVersion: VERSION, consentedAt: Date.now() },
    profile: { ...profile, researchMode: true }
  });
  document.getElementById("status").textContent = "Исследовательский режим включён.";
});
