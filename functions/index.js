const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

initializeApp();
const db = getFirestore();
const REGION = "europe-west1";

function staff(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to continue.");
  const role = request.auth.token.role;
  if (role !== "admin" && role !== "support") {
    throw new HttpsError("permission-denied", "Staff access is required.");
  }
  return { uid: request.auth.uid, email: request.auth.token.email || "", role };
}

function requireAdmin(request) {
  const actor = staff(request);
  if (actor.role !== "admin") throw new HttpsError("permission-denied", "Administrator access is required for this action.");
  return actor;
}

function timestampMillis(value) {
  return value && typeof value.toMillis === "function" ? value.toMillis() : null;
}

function cleanUser(snapshot) {
  const data = snapshot.data();
  return {
    uid: snapshot.id,
    fullName: data.fullName || "KoloRise user",
    email: data.email || "",
    createdAt: timestampMillis(data.createdAt)
  };
}

exports.getAdminOverview = onCall({ region: REGION }, async (request) => {
  staff(request);
  const [users, goals, pendingApplications, activeLoans, transactions] = await Promise.all([
    db.collection("users").count().get(),
    db.collectionGroup("goals").where("status", "==", "active").count().get(),
    db.collectionGroup("loanApplications").where("status", "==", "pending").count().get(),
    db.collectionGroup("loans").where("status", "==", "active").count().get(),
    db.collectionGroup("transactions").count().get()
  ]);
  return {
    users: users.data().count,
    activeGoals: goals.data().count,
    pendingApplications: pendingApplications.data().count,
    activeLoans: activeLoans.data().count,
    demoTransactions: transactions.data().count
  };
});

exports.listAdminUsers = onCall({ region: REGION }, async (request) => {
  staff(request);
  const limit = Math.min(Math.max(Number(request.data?.limit) || 100, 1), 200);
  const snapshot = await db.collection("users").orderBy("createdAt", "desc").limit(limit).get();
  return { users: snapshot.docs.map(cleanUser) };
});

exports.getAdminUserSummary = onCall({ region: REGION }, async (request) => {
  staff(request);
  const uid = request.data?.uid;
  if (typeof uid !== "string" || !uid || uid.includes("/")) {
    throw new HttpsError("invalid-argument", "Choose a valid user record.");
  }
  const userRef = db.collection("users").doc(uid);
  const [profile, goals, applications, loans, transactions] = await Promise.all([
    userRef.get(),
    userRef.collection("goals").orderBy("createdAt", "desc").limit(20).get(),
    userRef.collection("loanApplications").orderBy("createdAt", "desc").limit(20).get(),
    userRef.collection("loans").orderBy("createdAt", "desc").limit(20).get(),
    userRef.collection("transactions").orderBy("createdAt", "desc").limit(10).get()
  ]);
  if (!profile.exists) throw new HttpsError("not-found", "The user record could not be found.");
  const summarize = (snapshot, fields) => snapshot.docs.map((document) => {
    const data = document.data();
    return Object.fromEntries([...fields.map((field) => [field, data[field] ?? null]), ["createdAt", timestampMillis(data.createdAt)]]);
  });
  return {
    user: cleanUser(profile),
    goals: summarize(goals, ["name", "targetAmount", "savedAmount", "status"]),
    applications: summarize(applications, ["requestedAmount", "purpose", "termMonths", "status", "reviewNote"]),
    loans: summarize(loans, ["name", "startingAmount", "remainingAmount", "status"]),
    transactions: summarize(transactions, ["type", "amount", "demo"])
  };
});

exports.listPendingApplications = onCall({ region: REGION }, async (request) => {
  staff(request);
  const limit = Math.min(Math.max(Number(request.data?.limit) || 100, 1), 200);
  const snapshot = await db.collectionGroup("loanApplications")
    .where("status", "==", "pending")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const rows = await Promise.all(snapshot.docs.map(async (application) => {
    const userRef = application.ref.parent.parent;
    const userSnapshot = await userRef.get();
    const data = application.data();
    return {
      id: application.id,
      uid: userRef.id,
      fullName: userSnapshot.exists ? userSnapshot.get("fullName") || "KoloRise user" : "Unknown user",
      email: userSnapshot.exists ? userSnapshot.get("email") || "" : "",
      requestedAmount: data.requestedAmount,
      purpose: data.purpose,
      termMonths: data.termMonths,
      goalName: data.goalName,
      savingsAtApplication: data.savingsAtApplication,
      createdAt: timestampMillis(data.createdAt)
    };
  }));
  return { applications: rows };
});

exports.listAdminAudit = onCall({ region: REGION }, async (request) => {
  staff(request);
  const limit = Math.min(Math.max(Number(request.data?.limit) || 50, 1), 100);
  const snapshot = await db.collection("adminAuditLogs").orderBy("createdAt", "desc").limit(limit).get();
  return { entries: snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data(), createdAt: timestampMillis(entry.get("createdAt")) })) };
});

exports.reviewLoanApplication = onCall({ region: REGION }, async (request) => {
  const actor = requireAdmin(request);
  const { uid, applicationId, decision } = request.data || {};
  const reason = typeof request.data?.reason === "string" ? request.data.reason.trim() : "";
  if (typeof uid !== "string" || typeof applicationId !== "string" || !["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Choose a valid application and decision.");
  }
  if (reason.length < 8 || reason.length > 1000) {
    throw new HttpsError("invalid-argument", "Add a review note between 8 and 1000 characters.");
  }

  const applicationRef = db.doc(`users/${uid}/loanApplications/${applicationId}`);
  const auditRef = db.collection("adminAuditLogs").doc();
  const notificationRef = db.collection("users/" + uid + "/notifications").doc();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(applicationRef);
    if (!snapshot.exists) throw new HttpsError("not-found", "The application could not be found.");
    const before = snapshot.data();
    if (before.status !== "pending") throw new HttpsError("failed-precondition", "This application has already been reviewed.");
    const now = FieldValue.serverTimestamp();
    transaction.update(applicationRef, {
      status: decision,
      reviewNote: reason,
      reviewedBy: actor.uid,
      reviewedAt: now,
      updatedAt: now
    });
    transaction.create(auditRef, {
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: `loan_application_${decision}`,
      targetUid: uid,
      targetId: applicationId,
      reason,
      previousStatus: before.status,
      newStatus: decision,
      createdAt: now
    });
    transaction.create(notificationRef, {
      type: "application_" + decision,
      title: decision === "approved" ? "Demo application approved" : "Demo application declined",
      message: decision === "approved"
        ? "Staff approved your demo loan request. You can record a simulated payout from your dashboard."
        : "Staff declined your demo loan request. Review the note on your application for more information.",
      read: false,
      createdAt: now
    });
  });
  return { success: true };
});
