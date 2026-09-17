(function () {
  var stored = localStorage.getItem("theme");
  if (stored !== "light") document.documentElement.classList.add("dark");
})();
