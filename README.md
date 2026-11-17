# KoloRise

KoloRise is a savings and loan workflow demo. Users can create goals with a purpose, record virtual deposits, apply for a demo loan, receive a staff-recorded decision, and track a simulated payout and repayments. Every amount is a practice record. The app does not connect to a bank, hold money, or send payments.

## Refined project brief

Build a beginner-friendly banking workflow demonstration with Firebase Authentication and Cloud Firestore. Users can sign up or sign in using email and password or Google. They can create described savings goals, add virtual deposits, request a loan for a stated purpose, and track a simulated payout and repayments. A request is accepted only when the selected savings goal has at least half of the requested amount. Clearly label every financial action as a demo. A staff member records the demo application decision through the admin console.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Public landing page |
| `auth/` | Sign-in and account creation pages |
| `dashboard.html` | Signed-in user's dashboard |
| `admin.html` | Staff console for demo operations and loan application review |
| `js/` | Authentication, dashboard behavior, page interactions, and the KoloRise chatbot |
| `functions/` | Trusted Firebase callable functions for staff-only operations |
| `js/config/firebase-config.js` | Firebase web app configuration |
| `styles/` | Page styles |
| `assets/` | Images, logos, and icons |
| `firestore.rules` | Access rules for Firestore data |
| `firebase.json` | Firebase Hosting and Firestore configuration |

## Run locally

Use a local web server, such as VS Code Live Server. The site uses JavaScript modules and Firebase, so opening `index.html` directly with a `file://` URL will not work correctly.

Before running the app, finish the Firebase setup:

1. The browser Firebase config currently points to project `kolorise-9db44`. The CLI default in `.firebaserc` is `kolorise-f81e2`; use an explicit `--project kolorise-9db44` for auth, admin functions, rules, and indexes so they apply to the same project. Confirm that this is the intended project and that it has Authentication and Firestore enabled before deployment.
2. In **Project settings > General > Your apps**, create a Web app if one does not already exist. Copy the Web app values into `js/config/firebase-config.js`, replacing all four `PASTE_YOUR_...` values for the API key, storage bucket, messaging sender ID, and app ID. The project ID and auth domain are already filled in for this project. These browser settings are public identifiers; never paste a service account or private key into the website.
3. In **Authentication > Get started > Sign-in method**, turn on **Email/Password** and **Google**. When Firebase asks, choose a support email for Google sign-in.
4. In **Authentication > Settings > Authorized domains**, add the exact host name shown in your local server address (usually `localhost`) and the host name where you deploy the site. Do not include `https://` or a page path.
5. In **Firestore Database > Create database**, create the database. Choose a region close to your expected users. The security rules and collection-group index are in `firestore.rules` and `firestore.indexes.json`.
6. Open `index.html` using a local web server such as VS Code Live Server. Do not double-click the file; Firebase modules need an `http://` or `https://` address.
7. Try the demo: create an account, create a savings goal and add a demo deposit. Apply for no more than twice the amount saved in that goal (for example, NGN 50,000 saved supports a NGN 100,000 request). A staff member must review the application before a demo payout can be recorded; then record a repayment.

Google sign-in opens Google's sign-in window. The allowed host names in Firebase Authentication must match where you run the site.

## Admin console setup

The staff console is at `/admin.html`. Staff access is assigned with Firebase Authentication custom claims; adding a profile field or opening the page does not grant access. The `admin` role can review applications. The `support` role can view the overview, user directory, pending applications, and audit history, but cannot record decisions.

## KoloRise chatbot

The floating guide appears on the home, sign-in, sign-up, and user dashboard pages. It answers curated questions about KoloRise, the founder, account access, savings goals, demo deposits, loan eligibility and review, payouts, and repayments. It does not use an external AI service, save chat history, or access a signed-in user's records. Questions outside its help topics receive a scope-limited fallback response. Update its answers in `js/assistant.js` when the product flow changes.

1. Install the Functions dependencies with `cd functions` and `npm install`, then return to the project root.
2. Set up Application Default Credentials for an operator account with permission to manage Firebase Authentication and deploy Cloud Functions. Do not place service-account keys in the website or commit them.
3. In PowerShell, set `$env:GCLOUD_PROJECT="kolorise-9db44"`, then assign the first administrator using `node functions/scripts/set-admin-role.js FIREBASE_USER_UID admin`. Use `support` for read-only staff, or `none` to remove a staff role. The script preserves unrelated custom claims and refuses to run without an explicit project ID.
4. Deploy to the same Firebase project as the web config: `firebase deploy --project kolorise-9db44 --only functions,firestore:rules,firestore:indexes`. Cloud Functions deployment may require the Firebase project to use the Blaze billing plan.
5. Sign in at `/admin.html`. After changing a user's custom claims, have that user sign out and sign in again (or refresh their token) to receive the updated role.

The admin endpoints verify the custom claim on every request. Application decisions and append-only audit entries are written together by a trusted function. Firestore client rules no longer let users approve or reject their own applications; users can record a demo payout only after staff approval. The admin page is public static hosting, but its data and actions remain protected by the callable functions.

## Profile and notifications

Users can edit their display name in the dashboard profile panel or restore it to the name from their sign-in account. The authentication email is read-only in the dashboard. The notification center shows recent profile, savings, loan-tracking, and staff-review updates, with unread counts and read controls.

## Data and security

Each user's profile, goals, loan applications, loans, and transaction records are stored under `users/{uid}`. Firestore rules restrict access to the signed-in user's own records. The 50% check is repeated in the rules, so changing the browser code alone cannot submit an ineligible request. Keep the deployed rules in sync with `firestore.rules`.

The Firebase web configuration in `js/config/firebase-config.js` is included in the public client app. Its API key identifies the project; restrict its use in Google Cloud and protect user data with Firebase Authentication and Firestore rules. Never put service account credentials, private keys, or other server secrets in this project or any file served by Firebase Hosting. Keep those values in a trusted server environment and out of Git.

Deposits, payouts, and repayments are demo records only. Staff review here is not a real lending decision. A production service that moves money also needs identity checks, affordability assessment, a trusted payment provider, and additional operational, security, and regulatory work. The browser code is a Firebase client; this demo is not a banking or payment service.
