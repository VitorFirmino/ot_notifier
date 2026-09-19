(function () {
  var stored = localStorage.getItem("theme");
  var theme = stored === "light" || stored === "dark"
    ? stored
    : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);
})();
