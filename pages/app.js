(function () {
  const header = document.querySelector(".site-header");

  function onScroll() {
    if (!header) return;
    header.style.borderBottomColor =
      window.scrollY > 8 ? "var(--stroke)" : "var(--stroke-soft)";
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", id);
    });
  });
})();
