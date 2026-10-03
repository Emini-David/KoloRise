document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const navMenu = document.getElementById("primaryNavigation");
  if (!menuToggle || !navMenu) return;

  const mobileViewport = window.matchMedia("(max-width: 768px)");

  const setMenuOpen = (isOpen) => {
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    navMenu.classList.toggle("is-open", isOpen);
  };

  menuToggle.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  navMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuOpen(false);
  });

  document.addEventListener("pointerdown", (event) => {
    if (!mobileViewport.matches || !navMenu.classList.contains("is-open")) return;
    if (!navMenu.contains(event.target) && !menuToggle.contains(event.target)) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !navMenu.classList.contains("is-open")) return;
    setMenuOpen(false);
    menuToggle.focus();
  });

  mobileViewport.addEventListener("change", (event) => {
    if (!event.matches) setMenuOpen(false);
  });
});
