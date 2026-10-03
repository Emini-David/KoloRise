// Work out the website's main folder so links keep working from every page.
const siteRoot = new URL("../", import.meta.url);

// Keep page addresses in one place; this avoids typing different links by mistake.
export const ROUTES = Object.freeze({
  home: new URL("index.html", siteRoot).href,
  signIn: new URL("auth/signIn.html", siteRoot).href,
  dashboard: new URL("dashboard.html", siteRoot).href
});
