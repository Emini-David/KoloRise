const { applicationDefault, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const [uid, role] = process.argv.slice(2);
const projectId = process.env.GCLOUD_PROJECT;
if (!uid || !["admin", "support", "none"].includes(role)) {
  console.error("Usage: node scripts/set-admin-role.js <firebase-user-uid> <admin|support|none>");
  process.exit(1);
}
if (!projectId) {
  console.error("Set GCLOUD_PROJECT to the Firebase project ID before changing staff roles.");
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId });

async function main() {
  const auth = getAuth();
  const user = await auth.getUser(uid);
  const claims = { ...user.customClaims };
  if (role === "none") delete claims.role;
  else claims.role = role;
  await auth.setCustomUserClaims(uid, claims);
  console.log(`Updated staff role for ${uid}: ${role}. The user must refresh their ID token to receive the change.`);
}

main().catch((error) => {
  console.error("Could not update staff role:", error.message);
  process.exitCode = 1;
});
