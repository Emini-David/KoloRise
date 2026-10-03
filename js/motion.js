const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Respect the visitor's setting. Some people turn off movement to feel more comfortable.
if (!reduceMotion && "IntersectionObserver" in window) {
  // Count the home page numbers smoothly when they first become visible.
  const animateStat = (element) => {
    if (element.dataset.countStarted === "true") return;
    element.dataset.countStarted = "true";
    const target = Number(element.dataset.countTarget);
    const decimals = Number(element.dataset.countDecimals) || 0;
    const prefix = element.dataset.countPrefix || "";
    const suffix = element.dataset.countSuffix || "";
    const startedAt = performance.now();
    const duration = 1400;

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = (target * eased).toLocaleString("en-NG", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      element.textContent = `${prefix}${value}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  // These are the parts of the page that gently appear as the visitor scrolls.
  const targets = document.querySelectorAll(
    ".hero-content, .hero-visual, .hero-stats, .trust-item, .story-grid > *, .goals-grid > *, .steps-grid > *, .features-grid > *, .founder-content, .summary-card, .dashboard-heading, .dashboard-section, .auth-card, .footer"
  );

  targets.forEach((element, index) => {
    element.classList.add("motion-reveal");
    element.style.setProperty("--motion-delay", `${(index % 4) * 65}ms`);
  });

  document.documentElement.classList.add("motion-enabled");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("motion-visible");
      if (entry.target.matches(".hero-stats")) {
        entry.target.querySelectorAll("[data-count-target]").forEach(animateStat);
      }
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });

  targets.forEach((element) => observer.observe(element));
}
