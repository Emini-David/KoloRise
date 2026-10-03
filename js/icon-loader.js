const spriteUrl = new URL("../assets/icons/kolo-icons.svg", import.meta.url).href;
const svgNamespace = "http://www.w3.org/2000/svg";

// Replace each named icon placeholder with the matching drawing from our icon file.
document.querySelectorAll("[data-lucide]").forEach((placeholder) => {
  const iconName = placeholder.getAttribute("data-lucide");
  if (!iconName) return;

  const icon = document.createElementNS(svgNamespace, "svg");
  icon.classList.add("icon");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");

  const use = document.createElementNS(svgNamespace, "use");
  use.setAttribute("href", `${spriteUrl}#${iconName}`);
  icon.append(use);
  placeholder.replaceWith(icon, ...placeholder.childNodes);
});
