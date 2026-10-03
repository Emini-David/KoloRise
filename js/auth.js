import { auth, db } from "./config/firebase-config.js";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { ROUTES } from "./routes.js";

const signInForm = document.querySelector("#signInForm");
const signUpForm = document.querySelector("#signUpForm");
const errorBox = document.querySelector("#errorBox");
const googleButtons = document.querySelectorAll("[data-google-auth]");
const AUTH_PROGRESS_KEY = "koloriseAuthInProgress";

function showMessage(message, isError = true) {
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.style.display = message ? "block" : "none";
  errorBox.classList.toggle("success-msg", !isError);
}

function friendlyError(error) {
  const messages = {
    "auth/email-already-in-use": "That email already has an account. Try signing in instead.",
    "auth/invalid-credential": "The email or password is incorrect. Please try again.",
    "auth/user-not-found": "We could not find an account with that email.",
    "auth/wrong-password": "The email or password is incorrect. Please try again.",
    "auth/weak-password": "Choose a stronger password with at least 8 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/popup-closed-by-user": "The Google sign-in window was closed before finishing.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow popups and try again.",
    "auth/unauthorized-domain": "This website address is not allowed in Firebase Authentication yet."
  };
  return messages[error?.code] || "Something went wrong. Check your connection and Firebase setup, then try again.";
}

async function saveProfile(user, fullName = "") {
  const profileRef = doc(db, "users", user.uid);
  const profile = await getDoc(profileRef);
  if (profile.exists()) return;

  const name = (fullName || user.displayName || "KoloRise User").trim();
  await setDoc(profileRef, {
    fullName: name,
    email: user.email || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

function busy(button, isBusy, busyText) {
  if (!button) return;
  if (isBusy) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = busyText;
  } else {
    button.disabled = false;
    if (button.dataset.originalText) button.textContent = button.dataset.originalText;
  }
}

if (signUpForm) {
  signUpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage("");
    const button = signUpForm.querySelector('[type="submit"]');
    const fullName = document.querySelector("#fullName").value.trim();
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    const confirmPassword = document.querySelector("#confirmPassword").value;

    if (fullName.length < 2) return showMessage("Please enter your name (at least 2 letters).");
    if (password !== confirmPassword) return showMessage("The two passwords do not match. Please check them.");

    busy(button, true, "Creating account...");
    sessionStorage.setItem(AUTH_PROGRESS_KEY, "true");
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: fullName });
      await saveProfile(result.user, fullName);
      sessionStorage.removeItem(AUTH_PROGRESS_KEY);
      window.location.replace(ROUTES.dashboard);
    } catch (error) {
      sessionStorage.removeItem(AUTH_PROGRESS_KEY);
      console.error("Account creation failed:", error);
      showMessage(friendlyError(error));
      busy(button, false);
    }
  });
}

if (signInForm) {
  signInForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage("");
    const button = signInForm.querySelector('[type="submit"]');
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    busy(button, true, "Signing in...");
    sessionStorage.setItem(AUTH_PROGRESS_KEY, "true");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await saveProfile(result.user);
      sessionStorage.removeItem(AUTH_PROGRESS_KEY);
      window.location.replace(ROUTES.dashboard);
    } catch (error) {
      sessionStorage.removeItem(AUTH_PROGRESS_KEY);
      console.error("Sign in failed:", error);
      showMessage(friendlyError(error));
      busy(button, false);
    }
  });
}

const forgotPassword = document.querySelector("#forgotPassword");
if (forgotPassword) {
  forgotPassword.addEventListener("click", async (event) => {
    event.preventDefault();
    const email = document.querySelector("#email").value.trim();
    if (!email) return showMessage("Enter your email address first, then choose Forgot password.");
    try {
      await sendPasswordResetEmail(auth, email);
      showMessage("Password reset instructions have been sent to your email.", false);
    } catch (error) {
      console.error("Password reset failed:", error);
      showMessage(friendlyError(error));
    }
  });
}

googleButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    showMessage("");
    busy(button, true, "Connecting to Google...");
    sessionStorage.setItem(AUTH_PROGRESS_KEY, "true");
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await saveProfile(result.user);
      sessionStorage.removeItem(AUTH_PROGRESS_KEY);
      window.location.replace(ROUTES.dashboard);
    } catch (error) {
      sessionStorage.removeItem(AUTH_PROGRESS_KEY);
      console.error("Google sign in failed:", error);
      showMessage(friendlyError(error));
      busy(button, false);
    }
  });
});
