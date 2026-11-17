import { app, auth } from "./config/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";

const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const functions = getFunctions(app, "europe-west1");
const getOverview = httpsCallable(functions, "getAdminOverview");
const listUsers = httpsCallable(functions, "listAdminUsers");
const getUserSummary = httpsCallable(functions, "getAdminUserSummary");
const listApplications = httpsCallable(functions, "listPendingApplications");
const listAudit = httpsCallable(functions, "listAdminAudit");
const reviewApplication = httpsCallable(functions, "reviewLoanApplication");
let users = [];
let currentRole = "";

function node(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
}

function notice(message, isError = false) {
  const element = $("#adminNotice");
  element.textContent = message;
  element.hidden = !message;
  element.classList.toggle("is-error", isError);
}

function dateLabel(milliseconds) {
  if (!milliseconds) return "—";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(milliseconds));
}

function callableError(error) {
  if (error.code === "functions/permission-denied") return "Your account does not have permission to perform this action.";
  if (error.code === "functions/unauthenticated") return "Your session expired. Sign in again.";
  return error.message || "The request failed. Try again.";
}

function renderMetrics(data) {
  const metrics = [
    ["Registered users", data.users],
    ["Active savings goals", data.activeGoals],
    ["Pending applications", data.pendingApplications],
    ["Active tracked loans", data.activeLoans],
    ["Demo transactions", data.demoTransactions]
  ];
  const grid = $("#metricsGrid");
  grid.replaceChildren(...metrics.map(([label, value]) => {
    const card = node("article", "metric-card");
    card.append(node("span", "", label), node("strong", "", String(value)));
    return card;
  }));
}

function renderUsers() {
  const body = $("#usersTable");
  const term = $("#userSearch").value.trim().toLowerCase();
  const visible = users.filter((user) => `${user.fullName} ${user.email} ${user.uid}`.toLowerCase().includes(term));
  body.replaceChildren();
  if (!visible.length) {
    const row = node("tr");
    const cell = node("td", "", users.length ? "No matching users in the loaded records." : "No users found.");
    cell.colSpan = 5;
    row.append(cell);
    body.append(row);
  } else {
    visible.forEach((user) => {
      const row = node("tr");
      row.append(node("td", "", user.fullName), node("td", "", user.email), node("td", "uid-cell", user.uid), node("td", "", dateLabel(user.createdAt)));
      const actionCell = node("td");
      const view = node("button", "profile-button", "View summary");
      view.type = "button";
      view.addEventListener("click", () => showUserSummary(user, view));
      actionCell.append(view);
      row.append(actionCell);
      body.append(row);
    });
  }
  $("#usersFootnote").textContent = `Showing ${visible.length} of ${users.length} most recently created user records (maximum 200 loaded).`;
}

async function showUserSummary(user, button) {
  const panel = $("#userSummary");
  panel.hidden = false;
  panel.replaceChildren(node("p", "empty-state", `Loading ${user.fullName}'s account summary…`));
  try {
    const result = await getUserSummary({ uid: user.uid });
    const summary = result.data;
    panel.replaceChildren();
    const heading = node("div", "summary-panel-heading");
    heading.append(node("h3", "", `${summary.user.fullName} · Account summary`));
    const close = node("button", "profile-button", "Close");
    close.type = "button";
    close.addEventListener("click", () => { panel.hidden = true; });
    heading.append(close);
    panel.append(heading, node("p", "application-meta", `${summary.user.email} · UID ${summary.user.uid}`));
    const sections = [
      ["Savings goals", summary.goals, (item) => `${item.name} · ${money.format(Number(item.savedAmount) || 0)} of ${money.format(Number(item.targetAmount) || 0)} · ${item.status}`],
      ["Loan applications", summary.applications, (item) => `${money.format(Number(item.requestedAmount) || 0)} · ${item.status} · ${item.purpose}${item.reviewNote ? ` · Staff note: ${item.reviewNote}` : ""}`],
      ["Tracked loans", summary.loans, (item) => `${item.name} · ${money.format(Number(item.remainingAmount) || 0)} remaining · ${item.status}`],
      ["Recent demo activity", summary.transactions, (item) => `${item.type} · ${money.format(Number(item.amount) || 0)} · ${dateLabel(item.createdAt)}`]
    ];
    sections.forEach(([title, items, describe]) => {
      const section = node("div", "summary-panel-section");
      section.append(node("h4", "", `${title} (${items.length})`));
      if (!items.length) section.append(node("p", "application-meta", "No records."));
      else items.forEach((item) => section.append(node("p", "application-meta", describe(item))));
      panel.append(section);
    });
  } catch (error) {
    console.error("Could not load user summary:", error);
    panel.replaceChildren(node("p", "admin-notice is-error", callableError(error)));
  }
}

function renderApplications(applications) {
  const list = $("#applicationsList");
  list.replaceChildren();
  if (!applications.length) {
    list.append(node("p", "empty-state", "There are no pending applications."));
    return;
  }
  applications.forEach((application) => {
    const card = node("article", "admin-card");
    const top = node("div", "application-top");
    const identity = node("div");
    identity.append(node("h3", "", application.fullName), node("p", "application-meta", `${application.email} · ${dateLabel(application.createdAt)}`));
    top.append(identity, node("span", "application-amount", money.format(Number(application.requestedAmount) || 0)));
    card.append(top,
      node("p", "application-purpose", application.purpose || "No purpose supplied."),
      node("p", "application-meta", `Term: ${application.termMonths} months · Goal: ${application.goalName} · Savings at request: ${money.format(Number(application.savingsAtApplication) || 0)} · User ID: ${application.uid}`));
    const controls = node("div", "review-controls");
    const reason = document.createElement("textarea");
    reason.placeholder = "Required staff review note (at least 8 characters)";
    reason.maxLength = 1000;
    reason.setAttribute("aria-label", `Review note for ${application.fullName}'s application`);
    const approve = node("button", "btn btn-primary", "Approve demo request");
    const reject = node("button", "btn btn-outline", "Decline request");
    approve.type = reject.type = "button";
    approve.addEventListener("click", () => decide(application, "approved", reason, approve, reject));
    reject.addEventListener("click", () => decide(application, "rejected", reason, approve, reject));
    if (currentRole !== "admin") {
      approve.disabled = reject.disabled = true;
      approve.title = reject.title = "Only an administrator can record a decision.";
    }
    controls.append(reason, approve, reject);
    card.append(controls);
    list.append(card);
  });
}

async function decide(application, decision, reason, approve, reject) {
  const note = reason.value.trim();
  if (note.length < 8) {
    notice("Add a review note of at least 8 characters before recording a decision.", true);
    reason.focus();
    return;
  }
  notice("");
  approve.disabled = reject.disabled = true;
  try {
    await reviewApplication({ uid: application.uid, applicationId: application.id, decision, reason: note });
    notice(`Application ${decision} and audit entry recorded.`);
    await loadData();
  } catch (error) {
    console.error("Application review failed:", error);
    notice(callableError(error), true);
    approve.disabled = reject.disabled = currentRole !== "admin";
  }
}

function renderAudit(entries) {
  const list = $("#auditList");
  list.replaceChildren();
  if (!entries.length) {
    list.append(node("p", "empty-state", "No admin actions have been recorded yet."));
    return;
  }
  entries.forEach((entry) => {
    const row = node("article", "audit-row");
    const details = node("div");
    details.append(node("p", "audit-action", entry.action.replaceAll("_", " ")),
      node("p", "audit-meta", `By ${entry.actorEmail || entry.actorUid} · User ${entry.targetUid} · Application ${entry.targetId}`),
      node("p", "audit-meta", `Note: ${entry.reason}`));
    row.append(details, node("time", "audit-date", dateLabel(entry.createdAt)));
    list.append(row);
  });
}

async function loadData() {
  $("#refreshButton").disabled = true;
  try {
    const [overview, userResult, applicationResult, auditResult] = await Promise.all([
      getOverview(), listUsers({ limit: 200 }), listApplications({ limit: 100 }), listAudit({ limit: 50 })
    ]);
    renderMetrics(overview.data);
    users = userResult.data.users;
    renderUsers();
    renderApplications(applicationResult.data.applications);
    renderAudit(auditResult.data.entries);
  } catch (error) {
    console.error("Could not load admin data:", error);
    notice(callableError(error), true);
  } finally {
    $("#refreshButton").disabled = false;
  }
}

$("#userSearch").addEventListener("input", renderUsers);
$("#refreshButton").addEventListener("click", loadData);
$("#signOutButton").addEventListener("click", async () => {
  try { await signOut(auth); window.location.replace("auth/signIn.html"); }
  catch (error) { notice(callableError(error), true); }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("auth/signIn.html");
    return;
  }
  try {
    const token = await user.getIdTokenResult();
    currentRole = token.claims.role;
    if (!["admin", "support"].includes(currentRole)) {
      notice("This account is signed in but does not have staff access.", true);
      $("#staffIdentity").textContent = user.email || user.uid;
      $("#staffRole").textContent = "No access";
      $("#refreshButton").disabled = true;
      return;
    }
    $("#staffIdentity").textContent = user.email || user.uid;
    $("#staffRole").textContent = currentRole === "admin" ? "Administrator" : "Support staff · read only";
    await loadData();
  } catch (error) {
    console.error("Staff access check failed:", error);
    notice(callableError(error), true);
  }
});
