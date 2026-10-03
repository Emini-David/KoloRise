# KoloRise

KoloRise is a savings and loan workflow demo. Users can create goals with a purpose, record virtual deposits, apply for a demo loan, simulate a decision and payout, and track repayments. Every amount is a practice record. The app does not connect to a bank, hold money, or send payments.

## Refined project brief

Build a beginner-friendly banking workflow demonstration with Firebase Authentication and Cloud Firestore. Users can sign up or sign in using email and password or Google. They can create described savings goals, add virtual deposits, request a loan for a stated purpose, and track a simulated payout and repayments. A request is accepted only when the selected savings goal has at least half of the requested amount. Clearly label every financial action as a demo. Demo approval is self-simulated so the complete flow can be shown without a lender account.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Public landing page |
| `auth/` | Sign-in and account creation pages |
| `dashboard.html` | Signed-in user's dashboard |
| `js/` | Authentication, dashboard behavior, and page interactions |
| `js/config/firebase-config.js` | Firebase web app configuration |
| `styles/` | Page styles |
| `assets/` | Images, logos, and icons |
| `firestore.rules` | Access rules for Firestore data |
| `firebase.json` | Firebase Hosting and Firestore configuration |

## Run locally

Use a local web server, such as VS Code Live Server. The site uses JavaScript modules and Firebase, so opening `index.html` directly with a `file://` URL will not work correctly.

Before running the app, finish the Firebase setup:

1. Open Firebase Console and choose the `kolorise-f81e2` project from `.firebaserc`.
2. In **Project settings > General > Your apps**, create a Web app if one does not already exist. Copy the Web app values into `js/config/firebase-config.js`, replacing all four `PASTE_YOUR_...` values for the API key, storage bucket, messaging sender ID, and app ID. The project ID and auth domain are already filled in for this project. These browser settings are public identifiers; never paste a service account or private key into the website.
3. In **Authentication > Get started > Sign-in method**, turn on **Email/Password** and **Google**. When Firebase asks, choose a support email for Google sign-in.
4. In **Authentication > Settings > Authorized domains**, add the exact host name shown in your local server address (usually `localhost`) and the host name where you deploy the site. Do not include `https://` or a page path.
5. In **Firestore Database > Create database**, create the database. Choose a region close to your expected users. Then publish this project's `firestore.rules` file. With Firebase CLI installed and signed in, run `firebase deploy --only firestore:rules` from this project folder.
6. Open `index.html` using a local web server such as VS Code Live Server. Do not double-click the file; Firebase modules need an `http://` or `https://` address.
7. Try the demo: create an account, create a savings goal and add a demo deposit. Apply for no more than twice the amount saved in that goal (for example, NGN 50,000 saved supports a NGN 100,000 request). Simulate the decision, record the demo payout, then record a repayment.

Google sign-in opens Google's sign-in window. The allowed host names in Firebase Authentication must match where you run the site.

## Data and security

Each user's profile, goals, loan applications, loans, and transaction records are stored under `users/{uid}`. Firestore rules restrict access to the signed-in user's own records. The 50% check is repeated in the rules, so changing the browser code alone cannot submit an ineligible request. Keep the deployed rules in sync with `firestore.rules`.

The Firebase web configuration in `js/config/firebase-config.js` is included in the public client app. Its API key identifies the project; restrict its use in Google Cloud and protect user data with Firebase Authentication and Firestore rules. Never put service account credentials, private keys, or other server secrets in this project or any file served by Firebase Hosting. Keep those values in a trusted server environment and out of Git.

Deposits, payouts, and repayments are demo records only. The user can simulate approval in this learning demo. A real lender must make that decision on a trusted server with staff permissions; never let a customer approve their own real loan. A production service that moves money also needs a trusted server, a payment provider, and additional operational, security, and regulatory work. The browser code is a Firebase client; this demo is not a banking or payment service.
