import { auth, db } from "./config/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, orderBy, query,
  serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { ROUTES } from "./routes.js";

const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const errorBox = $("#dashboardError");
let activeUser = null;
let goals = [];
let loans = [];
let applications = [];

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

function setBusy(button, busy, label) {
  if (busy) {
    button.dataset.label = button.textContent;
    button.disabled = true;
    button.textContent = label;
  } else {
    button.disabled = false;
    if (button.dataset.label) button.textContent = button.dataset.label;
  }
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function dateText(timestamp) {
  const date = timestamp?.toDate?.();
  return date ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(date) : "Just now";
}

function formMessage(id, message) {
  const node = $(id);
  node.textContent = message;
  node.hidden = !message;
}

function closeForms() {
  ["#newGoalForm", "#depositForm", "#newLoanForm", "#repaymentForm", "#loanApplicationForm"].forEach((selector) => { $(selector).hidden = true; });
  ["#goalFormMessage", "#depositFormMessage", "#loanFormMessage", "#repaymentFormMessage", "#applicationFormMessage"].forEach((selector) => formMessage(selector, ""));
}

function renderGoals() {
  const list = $("#goalsList");
  list.replaceChildren();
  const active = goals.filter((goal) => goal.data.status === "active");
  $("#goalCount").textContent = String(active.length);
  fillGoalOptions();
  if (!goals.length) {
    list.append(make("p", "empty-state", "You have no goals yet. Create one to get started."));
    return;
  }
  goals.forEach(({ id, data }) => {
    const row = make("article", "dashboard-row");
    const main = make("div", "list-row-main");
    const title = make("h3", "row-title", data.name);
    const target = Number(data.targetAmount) || 0;
    const saved = Number(data.savedAmount) || 0;
    const percent = target ? Math.min(100, Math.round(saved / target * 100)) : 0;
    main.append(title, make("p", "row-meta", data.description || "No goal description added."), make("p", "row-meta", `${money.format(saved)} saved of ${money.format(target)} · ${percent}%`));
    const bar = make("div", "progress-track");
    const fill = make("div", "progress-fill");
    fill.style.width = `${percent}%`;
    bar.append(fill);
    main.append(bar);
    const side = make("div", "list-row-side");
    side.append(make("span", "badge-status", data.status === "active" ? "Active" : "Complete"));
    row.append(main, side);
    list.append(row);
  });
}

function fillGoalOptions() {
  const select = $("#depositGoal");
  const previous = select.value;
  select.replaceChildren(new Option("Choose a goal", ""));
  goals.filter(({ data }) => data.status === "active").forEach(({ id, data }) => select.add(new Option(data.name, id)));
  if (goals.some(({ id, data }) => id === previous && data.status === "active")) select.value = previous;
  $("#newDepositButton").disabled = !goals.some(({ data }) => data.status === "active");

  const applicationSelect = $("#applicationGoal");
  const selectedGoal = applicationSelect.value;
  applicationSelect.replaceChildren(new Option("Choose a goal", ""));
  goals.forEach(({ id, data }) => applicationSelect.add(new Option(`${data.name} (${money.format(Number(data.savedAmount) || 0)} saved)`, id)));
  if (goals.some(({ id }) => id === selectedGoal)) applicationSelect.value = selectedGoal;
  updateEligibilityMessage();
}

function updateEligibilityMessage() {
  const goal = goals.find(({ id }) => id === $("#applicationGoal").value);
  const amount = Number($("#applicationAmount").value);
  const message = $("#eligibilityMessage");
  message.classList.remove("eligibility-ok", "eligibility-no");
  if (!Number.isFinite(amount) || amount <= 0) {
    message.textContent = "Enter a loan amount and choose the savings goal you want to use for eligibility.";
    return false;
  }
  const required = Math.ceil(amount / 2);
  const saved = Number(goal?.data.savedAmount) || 0;
  if (!goal) {
    message.textContent = `You need at least ${money.format(required)} saved in one goal. Choose a goal to check your savings.`;
    return false;
  }
  if (saved >= required) {
    message.textContent = `Eligible for this demo request: ${money.format(saved)} saved, and ${money.format(required)} is required (50% of the request).`;
    message.classList.add("eligibility-ok");
    return true;
  }
  message.textContent = `Not eligible yet: this request needs ${money.format(required)} saved in this goal. You have ${money.format(saved)}. Add savings first or request a smaller amount.`;
  message.classList.add("eligibility-no");
  return false;
}

function renderApplications() {
  const list = $("#loanApplicationsList");
  list.replaceChildren();
  if (!applications.length) {
    list.append(make("p", "empty-state", "No loan applications yet. The demo form will check your savings before accepting a request."));
    return;
  }
  applications.forEach(({ id, data }) => {
    const row = make("article", "dashboard-row");
    const main = make("div", "list-row-main");
    main.append(make("h3", "row-title", `${money.format(Number(data.requestedAmount) || 0)} request · ${data.purpose}`));
    main.append(make("p", "row-meta", `Goal: ${data.goalName} · Savings at request: ${money.format(Number(data.savingsAtApplication) || 0)} · ${data.termMonths} month(s)`));
    main.append(make("p", "row-meta", `Approx. ${money.format(Math.ceil(data.requestedAmount / data.termMonths))} per month in this 0% interest demo.`));
    const side = make("div", "list-row-side");
    side.append(make("span", "badge-status", data.status));
    if (data.status === "pending") {
      const approve = make("button", "btn btn-outline", "Simulate approval");
      approve.type = "button";
      approve.addEventListener("click", () => decideApplication(id, "approved"));
      const reject = make("button", "btn btn-outline", "Simulate decline");
      reject.type = "button";
      reject.addEventListener("click", () => decideApplication(id, "rejected"));
      side.append(approve, reject);
    } else if (data.status === "approved") {
      const payout = make("button", "btn btn-primary", "Record demo payout");
      payout.type = "button";
      payout.addEventListener("click", () => recordDemoPayout(id, data));
      side.append(payout);
    }
    row.append(main, side);
    list.append(row);
  });
}

// This is a pretend review for the demo. A real lender decision belongs on a trusted server.
async function decideApplication(applicationId, decision) {
  const app = applications.find((item) => item.id === applicationId);
  if (!app || app.data.status !== "pending") return;
  showError("");
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "users", activeUser.uid, "loanApplications", applicationId), { status: decision, updatedAt: serverTimestamp() });
    await batch.commit();
    await refresh();
  } catch (error) {
    console.error("Could not update demo application:", error);
    showError("We could not update the demo application. Check your connection and Firestore rules.");
  }
}

// Write the loan, application status, and incoming activity together so they cannot get out of sync.
async function recordDemoPayout(applicationId, application) {
  if (application.status !== "approved") return;
  showError("");
  const loanId = doc(collection(db, "users", activeUser.uid, "loans")).id;
  const loanRef = doc(db, "users", activeUser.uid, "loans", loanId);
  const applicationRef = doc(db, "users", activeUser.uid, "loanApplications", applicationId);
  const transactionRef = doc(collection(db, "users", activeUser.uid, "transactions"));
  const batch = writeBatch(db);
  batch.update(applicationRef, { status: "disbursed", loanId, updatedAt: serverTimestamp() });
  batch.set(loanRef, {
    name: application.purpose,
    startingAmount: application.requestedAmount,
    remainingAmount: application.requestedAmount,
    dueDate: "",
    status: "active",
    applicationId,
    createdAt: serverTimestamp()
  });
  batch.set(transactionRef, {
    type: "loan_disbursement",
    amount: application.requestedAmount,
    loanId,
    loanName: application.purpose,
    demo: true,
    createdAt: serverTimestamp()
  });
  try {
    await batch.commit();
    await refresh();
  } catch (error) {
    console.error("Could not record demo payout:", error);
    showError("We could not record the demo payout. Check your connection and Firestore rules.");
  }
}

function renderLoans() {
  const list = $("#loansList");
  list.replaceChildren();
  const outstanding = loans.reduce((sum, { data }) => sum + (Number(data.remainingAmount) || 0), 0);
  $("#loanBalance").textContent = money.format(outstanding);
  $("#loanBalanceHint").textContent = `${loans.filter(({ data }) => data.status === "active").length} active tracked loan(s)`;
  if (!loans.length) {
    list.append(make("p", "empty-state", "No loans tracked. Add one if you want to remember its balance."));
    return;
  }
  loans.forEach(({ id, data }) => {
    const row = make("article", "dashboard-row");
    const main = make("div", "list-row-main");
    main.append(make("h3", "row-title", data.name), make("p", "row-meta", `${money.format(Number(data.remainingAmount) || 0)} remaining${data.dueDate ? ` · Due ${data.dueDate}` : ""}`));
    const side = make("div", "list-row-side");
    side.append(make("span", "badge-status", data.status === "paid" ? "Paid" : "Active"));
    if (data.status === "active") {
      const repay = make("button", "btn btn-outline", "Record repayment");
      repay.type = "button";
      repay.addEventListener("click", () => openRepayment(id, data));
      side.append(repay);
    }
    row.append(main, side);
    list.append(row);
  });
}

function renderTransactions(transactions) {
  const list = $("#transactionsList");
  list.replaceChildren();
  $("#transactionCount").textContent = String(transactions.length);
  if (!transactions.length) {
    list.append(make("p", "empty-state", "Your demo deposits and repayments will appear here."));
    return;
  }
  transactions.slice(0, 10).forEach(({ data }) => {
    const row = make("article", "dashboard-row");
    const main = make("div", "list-row-main");
    const label = data.type === "deposit" ? `Deposit · ${data.goalName}` : data.type === "loan_disbursement" ? `Demo loan payout · ${data.loanName}` : `Repayment · ${data.loanName}`;
    main.append(make("h3", "row-title", label), make("p", "row-meta", `${dateText(data.createdAt)} · Demo record`));
    const sign = data.type === "loan_repayment" ? "−" : "+";
    row.append(main, make("strong", `row-value ${data.type === "loan_repayment" ? "cash-out" : "cash-in"}`, `${sign} ${money.format(Number(data.amount) || 0)}`));
    list.append(row);
  });
}

async function loadDashboard(user) {
  showError("");
  $("#userEmail").textContent = user.email || "Google account";
  const profileSnap = await getDoc(doc(db, "users", user.uid));
  const name = profileSnap.exists() ? profileSnap.data().fullName : user.displayName;
  $("#userName").textContent = (name || user.email?.split("@")[0] || "there").split(" ")[0];

  const userPath = (name) => collection(db, "users", user.uid, name);
  const [goalSnap, loanSnap, transactionSnap, applicationSnap] = await Promise.all([
    getDocs(query(userPath("goals"), orderBy("createdAt", "desc"))),
    getDocs(query(userPath("loans"), orderBy("createdAt", "desc"))),
    getDocs(query(userPath("transactions"), orderBy("createdAt", "desc"))),
    getDocs(query(userPath("loanApplications"), orderBy("createdAt", "desc")))
  ]);
  goals = goalSnap.docs.map((item) => ({ id: item.id, data: item.data() }));
  loans = loanSnap.docs.map((item) => ({ id: item.id, data: item.data() }));
  applications = applicationSnap.docs.map((item) => ({ id: item.id, data: item.data() }));
  const transactions = transactionSnap.docs.map((item) => ({ id: item.id, data: item.data() }));
  $("#savingsBalance").textContent = money.format(goals.reduce((sum, goal) => sum + (Number(goal.data.savedAmount) || 0), 0));
  renderGoals();
  renderApplications();
  renderLoans();
  renderTransactions(transactions);
}

async function refresh() {
  try {
    await loadDashboard(activeUser);
  } catch (error) {
    console.error("Could not load dashboard:", error);
    showError("We could not load your information. Check your internet connection and Firestore rules, then refresh the page.");
  }
}

$("#signOutBtn").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  setBusy(button, true, "Signing out...");
  try { await signOut(auth); window.location.replace(ROUTES.signIn); }
  catch (error) { console.error("Sign out failed:", error); showError("Could not sign out. Please try again."); setBusy(button, false); }
});

$("#newGoalButton").addEventListener("click", () => { closeForms(); $("#newGoalForm").hidden = false; $("#newGoalName").focus(); });
$("#newLoanApplicationButton").addEventListener("click", () => { closeForms(); $("#loanApplicationForm").hidden = false; $("#applicationAmount").focus(); updateEligibilityMessage(); });
$("#newDepositButton").addEventListener("click", () => { closeForms(); $("#depositForm").hidden = false; $("#depositGoal").focus(); });
$("#newLoanButton").addEventListener("click", () => { closeForms(); $("#newLoanForm").hidden = false; $("#loanName").focus(); });
$("#trackLoanFromSummary").addEventListener("click", () => { closeForms(); $("#newLoanForm").hidden = false; $("#loanName").focus(); });
$("#cancelGoalButton").addEventListener("click", closeForms);
$("#cancelDepositButton").addEventListener("click", closeForms);
$("#cancelLoanButton").addEventListener("click", closeForms);
$("#cancelRepaymentButton").addEventListener("click", closeForms);
$("#cancelApplicationButton").addEventListener("click", closeForms);
$("#applicationAmount").addEventListener("input", updateEligibilityMessage);
$("#applicationGoal").addEventListener("change", updateEligibilityMessage);

$("#newGoalForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $("#saveGoalButton");
  const name = $("#newGoalName").value.trim();
  const description = $("#newGoalDescription").value.trim();
  const targetAmount = Number($("#newGoalTarget").value);
  if (name.length < 2 || description.length < 5 || !Number.isFinite(targetAmount) || targetAmount <= 0) return formMessage("#goalFormMessage", "Add a goal name, a short description and a target amount greater than zero.");
  formMessage("#goalFormMessage", ""); showError(""); setBusy(button, true, "Saving...");
  try {
    const ref = doc(collection(db, "users", activeUser.uid, "goals"));
    await writeBatch(db).set(ref, { name, description, targetAmount, savedAmount: 0, status: "active", createdAt: serverTimestamp() }).commit();
    form.reset(); closeForms(); await refresh();
  } catch (error) { console.error("Could not save goal:", error); formMessage("#goalFormMessage", "Could not save this goal. Check your connection and Firestore rules."); }
  finally { setBusy(button, false); }
});

$("#loanApplicationForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#submitApplicationButton");
  const amount = Number($("#applicationAmount").value);
  const goal = goals.find(({ id }) => id === $("#applicationGoal").value);
  const purpose = $("#applicationPurpose").value.trim();
  const termMonths = Number($("#applicationTerm").value);
  if (!updateEligibilityMessage() || !goal) return formMessage("#applicationFormMessage", "This request does not meet the 50% savings requirement yet.");
  if (purpose.length < 8 || ![3, 6, 9, 12].includes(termMonths)) return formMessage("#applicationFormMessage", "Describe what the loan is for and choose a repayment period.");
  formMessage("#applicationFormMessage", ""); showError(""); setBusy(button, true, "Submitting...");
  try {
    const ref = doc(collection(db, "users", activeUser.uid, "loanApplications"));
    const batch = writeBatch(db);
    batch.set(ref, {
      requestedAmount: amount,
      purpose,
      termMonths,
      goalId: goal.id,
      goalName: goal.data.name,
      savingsAtApplication: Number(goal.data.savedAmount) || 0,
      status: "pending",
      createdAt: serverTimestamp()
    });
    await batch.commit();
    event.currentTarget.reset(); closeForms(); await refresh();
  } catch (error) {
    console.error("Could not submit loan application:", error);
    formMessage("#applicationFormMessage", error.code === "permission-denied" ? "The application did not pass Firebase's savings eligibility check. Refresh your savings and try again." : "Could not submit the application. Check your connection and Firestore rules.");
  } finally { setBusy(button, false); }
});

$("#depositForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#saveDepositButton");
  const goalId = $("#depositGoal").value;
  const amount = Number($("#depositAmount").value);
  const goal = goals.find((item) => item.id === goalId);
  if (!goal || !Number.isFinite(amount) || amount <= 0) return formMessage("#depositFormMessage", "Choose a goal and enter an amount greater than zero.");
  if ((Number(goal.data.savedAmount) || 0) + amount > Number(goal.data.targetAmount)) return formMessage("#depositFormMessage", "That deposit is more than the amount left to reach this goal.");
  formMessage("#depositFormMessage", ""); showError(""); setBusy(button, true, "Recording...");
  try {
    const goalRef = doc(db, "users", activeUser.uid, "goals", goalId);
    const transactionRef = doc(collection(db, "users", activeUser.uid, "transactions"));
    const batch = writeBatch(db);
    batch.update(goalRef, { savedAmount: (Number(goal.data.savedAmount) || 0) + amount, updatedAt: serverTimestamp() });
    batch.set(transactionRef, { type: "deposit", amount, goalId, goalName: goal.data.name, demo: true, createdAt: serverTimestamp() });
    await batch.commit();
    event.currentTarget.reset(); closeForms(); await refresh();
  } catch (error) { console.error("Could not record deposit:", error); formMessage("#depositFormMessage", "Could not record the demo deposit. Check your connection and Firestore rules."); }
  finally { setBusy(button, false); }
});

$("#newLoanForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#saveLoanButton");
  const name = $("#loanName").value.trim();
  const startingAmount = Number($("#loanStartingAmount").value);
  const dueDate = $("#loanDueDate").value || "";
  if (name.length < 2 || !Number.isFinite(startingAmount) || startingAmount <= 0) return formMessage("#loanFormMessage", "Enter a loan name and a balance greater than zero.");
  formMessage("#loanFormMessage", ""); showError(""); setBusy(button, true, "Saving...");
  try {
    const ref = doc(collection(db, "users", activeUser.uid, "loans"));
    const batch = writeBatch(db);
    batch.set(ref, { name, startingAmount, remainingAmount: startingAmount, dueDate, status: "active", createdAt: serverTimestamp() });
    await batch.commit();
    event.currentTarget.reset(); closeForms(); await refresh();
  } catch (error) { console.error("Could not save loan:", error); formMessage("#loanFormMessage", "Could not save this loan. Check your connection and Firestore rules."); }
  finally { setBusy(button, false); }
});

function openRepayment(loanId, loan) {
  closeForms();
  $("#repaymentForm").hidden = false;
  $("#repaymentForm").dataset.loanId = loanId;
  $("#repaymentLoanName").textContent = `${loan.name} · ${money.format(Number(loan.remainingAmount) || 0)} remaining`;
  $("#repaymentAmount").max = String(loan.remainingAmount);
  $("#repaymentAmount").focus();
}

$("#repaymentForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $("#saveRepaymentButton");
  const loanId = form.dataset.loanId;
  const loan = loans.find((item) => item.id === loanId);
  const amount = Number($("#repaymentAmount").value);
  if (!loan || !Number.isFinite(amount) || amount <= 0 || amount > loan.data.remainingAmount) return formMessage("#repaymentFormMessage", "Enter an amount greater than zero and no more than the remaining balance.");
  formMessage("#repaymentFormMessage", ""); showError(""); setBusy(button, true, "Recording...");
  try {
    const remainingAmount = Number(loan.data.remainingAmount) - amount;
    const loanRef = doc(db, "users", activeUser.uid, "loans", loanId);
    const transactionRef = doc(collection(db, "users", activeUser.uid, "transactions"));
    const batch = writeBatch(db);
    batch.update(loanRef, { remainingAmount, status: remainingAmount === 0 ? "paid" : "active", updatedAt: serverTimestamp() });
    batch.set(transactionRef, { type: "loan_repayment", amount, loanId, loanName: loan.data.name, demo: true, createdAt: serverTimestamp() });
    await batch.commit();
    form.reset(); closeForms(); await refresh();
  } catch (error) { console.error("Could not record repayment:", error); formMessage("#repaymentFormMessage", "Could not record the demo repayment. Check your connection and Firestore rules."); }
  finally { setBusy(button, false); }
});

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  activeUser = user;
  refresh();
});
