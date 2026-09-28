document.getElementById("openDemo").addEventListener("click", () => {
  document.getElementById("demo").scrollIntoView({ behavior: "smooth", block: "start" });
});
document.getElementById("openDashboard").addEventListener("click", () => {
  location.href = "dashboard.html";
});
document.getElementById("openCalibration").addEventListener("click", () => {
  location.href = "calibration.html";
});
