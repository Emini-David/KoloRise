import { auth } from "./config/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { ROUTES } from "./routes.js";

const path = window.location.pathname.toLowerCase();
const isDashboard = path.endsWith("/dashboard.html") || path.endsWith("dashboard.html");
const isSignIn = path.endsWith("/signin.html") || path.endsWith("signin.html");
const isSignUp = path.endsWith("/signup.html") || path.endsWith("signup.html");
const isAuthPage = isSignIn || isSignUp;
const isLandingPage = path.endsWith("/") || path.endsWith("/index.html") || path.endsWith("index.html");

// Firebase tells us whether someone is signed in. Use that answer to protect
// the dashboard and to show the right links on the home page.
onAuthStateChanged(auth, (user) => {
  if (user && isAuthPage && !sessionStorage.getItem("koloriseAuthInProgress")) {
    window.location.replace(ROUTES.dashboard);
    return;
  }

  if (!user && isDashboard) {
    window.location.replace(ROUTES.signIn);
    return;
  }

  if (user && isLandingPage) {
    const navActions = document.querySelector(".nav-actions");
    if (!navActions || navActions.dataset.signedIn === "true") return;
    navActions.dataset.signedIn = "true";
    navActions.replaceChildren();

    const dashboardLink = document.createElement("a");
    dashboardLink.href = ROUTES.dashboard;
    dashboardLink.className = "btn btn-primary";
    dashboardLink.textContent = "Dashboard";

    const signOutButton = document.createElement("button");
    signOutButton.type = "button";
    signOutButton.className = "btn-text";
    signOutButton.textContent = "Sign out";
    signOutButton.addEventListener("click", async () => {
      signOutButton.disabled = true;
      try {
        await signOut(auth);
        window.location.reload();
      } catch (error) {
        console.error("Could not sign out:", error);
        signOutButton.disabled = false;
      }
    });

    navActions.append(dashboardLink, signOutButton);
  }
});
