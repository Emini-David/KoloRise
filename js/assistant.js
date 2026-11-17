const root = document.createElement("div");
root.innerHTML = `
  <section class="assistant-panel" id="koloriseAssistant" aria-label="KoloRise personal assistant" hidden>
    <header class="assistant-head"><div><strong>KoloRise</strong><span>Your personal assistant</span></div><button class="assistant-close" type="button" aria-label="Close assistant">×</button></header>
    <div class="assistant-messages" role="log" aria-live="off" aria-relevant="additions"></div>
    <p class="assistant-sr-only" role="status" aria-live="polite"></p>
    <div class="assistant-suggestions" aria-label="Suggested questions">
      <button type="button">What is KoloRise?</button><button type="button">How do I save?</button><button type="button">How do demo loans work?</button>
    </div>
    <form class="assistant-form"><input type="text" maxlength="500" placeholder="Ask a KoloRise question…" aria-label="Your question" required><button type="submit">Send</button></form>
    <p class="assistant-disclaimer">KoloRise is a demo. This assistant does not provide financial advice.</p>
  </section>`;
document.body.append(root);

const launcher = document.querySelector(".assistant-launcher");
const panel = root.querySelector(".assistant-panel");
const messages = root.querySelector(".assistant-messages");
const form = root.querySelector(".assistant-form");
const input = form.querySelector("input");
const sendButton = form.querySelector("button[type='submit']");
const suggestions = [...root.querySelectorAll(".assistant-suggestions button")];
const announcement = root.querySelector(".assistant-sr-only");
const signUpUrl = new URL("../auth/signUp.html", import.meta.url).href;
const signInUrl = new URL("../auth/signIn.html", import.meta.url).href;
const dashboardUrl = new URL("../dashboard.html", import.meta.url).href;

const answers = [
  {
    match: /^(hi|hello|hey|good morning|good afternoon|good evening)[!.?,\s]*$/i,
    text: "Hello! I can explain KoloRise, help you set a savings goal, walk you through demo deposits and loan applications, or answer questions about the founder. What would you like to do?"
  },
  {
    match: /\b(who is|tell me about|about)\b.*\b(ogunfadewo|david|founder|ceo|owner|man behind|person behind|mind behind|creator)\b|\b(who|name of)\b.*\b(behind|founded|started|created|made)\b.*\b(kolorise|kolo rise|innovation|project)\b|\b(ogunfadewo david ayodele|david ayodele)\b/i,
    text: "Ogunfadewo David Ayodele is the founder, CEO, and CTO of KoloRise. The website introduces him as David Ayodele. KoloRise grew from his idea to bring the familiar kóló savings tradition into the digital world. You can read his story on the home page.",
    action: ["Read the founder story", "../index.html#founder"]
  },
  {
    match: /\b(meaning|origin|culture|traditional|yoruba)\b.*\b(kolo|kolorise)\b|\b(kolo|kolorise)\b.*\b(mean|origin|culture|traditional|yoruba)\b|\b(what is|what's)\b.*\bkolo\b/i,
    text: "In the KoloRise story, kóló refers to a traditional handmade money box or piggy bank, especially in Yoruba communities. It stands for discipline, patience, and consistency. “Rise” represents progress toward meaningful goals. The name joins that saving tradition with the idea of growth.",
    action: ["Read the KoloRise story", "../index.html#story"]
  },
  {
    match: /\b(what is|what's|explain|about)\b.*\b(kolorise|kolo rise|project|app|platform)\b|\b(kolorise|kolo rise)\b.*\b(about|project|app|platform)\b/i,
    text: "KoloRise is a goal-based savings and loan workflow demo inspired by the Nigerian kóló savings tradition. You can create goals, record virtual deposits, submit a demo loan application, and track simulated repayments. It does not hold or transfer real money."
  },
  {
    match: /\b(chatbot|assistant|ai|artificial intelligence)\b/i,
    text: "I’m KoloRise. In this version, I answer from a set of project-specific help topics in the website. I do not use an external AI service, and this chat is not saved to your KoloRise account."
  },
  {
    match: /\b(real money|real bank|transfer money|withdraw|cash out|is this real|actual loan)\b/i,
    text: "No. KoloRise is currently a demo. Deposits, payouts, loan balances, and repayments are practice records only; the app does not connect to a bank or move money."
  },
  {
    match: /\b(sign ?up|create account|register|join|new account)\b/i,
    text: "Choose Create Account, enter your name and email, set a password of at least 8 characters, and confirm it before submitting. You can also use Google sign-up. After signing in, open your dashboard to create a savings goal.",
    action: ["Create an account", signUpUrl]
  },
  {
    match: /\b(unauthorized.domain|authorized domain|popup blocked|google sign|google login|sign in error|can't sign in|cannot sign in)\b/i,
    text: "For a Google sign-in unauthorized-domain error, add your site hostname (for example, kolorise.vercel.app) in Firebase Console > Authentication > Settings > Authorized domains for the Firebase project used by this site. Enter only the hostname, without https:// or a page path. If a popup is blocked, allow popups for the site and try again."
  },
  {
    match: /\b(sign ?in|log ?in|login|forgot password|reset password)\b/i,
    text: "Open Sign In and use the email and password for your account, or continue with Google. If you forgot your password, enter your email first and choose Forgot password. Google sign-in also requires your site domain to be authorized in Firebase Authentication.",
    action: ["Go to sign in", signInUrl]
  },
  {
    match: /\b(create|set up|start|make)\b.*\b(goal|saving goal|savings goal)\b|\b(goal|saving goal|savings goal)\b.*\b(create|set up|start|make)\b/i,
    text: "After signing in, open your dashboard and choose Create a goal. Give it a name, describe what you are saving for, and set a target amount in NGN. Then save the goal. You can create multiple goals.",
    action: ["Open dashboard", dashboardUrl]
  },
  {
    match: /\b(automatic|automate|schedule|recurring|reminder|notification)\b/i,
    text: "The current dashboard records demo deposits manually. It does not schedule transfers, automate savings, or send reminders, and it never moves real money. You can still use a goal target to plan what you want to save toward."
  },
  {
    match: /\b(save|deposit|add money|add funds|record.*deposit|saving)\b/i,
    text: "In your dashboard, create a goal first if you do not have one. Then choose Record demo deposit, select the goal, enter an amount no greater than the remaining target, and record it. This updates the practice balance only; no money is deposited or transferred.",
    action: ["Open dashboard", dashboardUrl]
  },
  {
    match: /\b(loan|borrow|apply|application|eligib|requirement)\b/i,
    text: "To apply for a demo loan, open your dashboard and choose Apply for a demo loan. Enter an amount, choose a 3, 6, 9, or 12 month term, select a savings goal, and describe the purpose in at least 8 characters. That goal must have at least half the requested amount saved. For example, NGN 50,000 saved supports a request of up to NGN 100,000. A staff member reviews the application; approval is not guaranteed and this is not real credit.",
    action: ["Open dashboard", dashboardUrl]
  },
  {
    match: /\b(approved|rejected|declined|pending|review|payout|disburse)\b/i,
    text: "New demo loan applications start as Pending and wait for staff review. If approved, your dashboard lets you record a simulated payout; that creates a demo loan and activity record. If rejected, no payout is available. No real funds are issued."
  },
  {
    match: /\b(repay|repayment|payment|installment|instalment|interest|due date)\b/i,
    text: "For a demo application, the dashboard shows a simple amount-per-month estimate based on the requested amount and term, with 0% interest in this learning demo. After a demo payout, you can record repayments against the tracked balance. These entries do not collect or transfer money."
  },
  {
    match: /\b(track|existing loan|debt|loan balance)\b/i,
    text: "You can use Track a loan on your dashboard to record the name, current balance, and optional due date for an existing loan or debt. This is only a personal tracker; it does not connect to the lender or change what you owe."
  },
  {
    match: /\b(data|privacy|secure|security|password|account details)\b/i,
    text: "KoloRise uses Firebase Authentication and stores account records in Firestore. The app's rules restrict users to their own records. This assistant cannot access your account, password, balances, or private records. Do not share passwords or sensitive personal information in chat."
  },
  {
    match: /\b(help|what can you do|support|contact|question)\b/i,
    text: "I can explain the KoloRise demo, account access, savings goals and deposits, loan eligibility and review, demo payouts and repayments, and the founder story. I cannot view your account or provide financial, legal, or lending advice. Ask me a specific question or choose one of the suggested topics."
  }
];

function addMessage(text, isUser = false, action) {
  const bubble = document.createElement("p");
  bubble.className = `assistant-message${isUser ? " user" : ""}`;
  bubble.textContent = text;
  messages.append(bubble);
  if (action) {
    const link = document.createElement("a");
    link.className = "assistant-action";
    link.href = action[1].startsWith("../") ? new URL(action[1], import.meta.url).href : action[1];
    link.textContent = action[0];
    messages.append(link);
  }
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

function respond(question) {
  const normalized = question.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const answer = answers.find((entry) => entry.match.test(normalized));
  if (answer) return typeResponse(answer.text, answer.action);
  return typeResponse("I’m not sure about that yet. I can help with what KoloRise is, the founder, signing up, savings goals, demo deposits, loan eligibility and review, demo repayments, or account access. KoloRise is a demo, so I can’t answer questions about real loan approval or money transfers.");
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function typeResponse(text, action) {
  const typing = document.createElement("div");
  typing.className = "assistant-typing-row";
  typing.setAttribute("aria-hidden", "true");
  const avatar = document.createElement("span");
  avatar.className = "assistant-typing-avatar";
  avatar.textContent = "K";
  const typingBubble = document.createElement("span");
  typingBubble.className = "assistant-typing-bubble";
  for (let index = 0; index < 3; index += 1) {
    const dot = document.createElement("span");
    dot.className = "assistant-typing-dot";
    typingBubble.append(dot);
  }
  typing.append(avatar, typingBubble);
  messages.append(typing);
  announcement.textContent = "A reply is being prepared.";
  messages.scrollTop = messages.scrollHeight;
  await wait(500);
  typing.remove();

  const bubble = addMessage("");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    bubble.textContent = text;
  } else {
    const step = 2;
    const chunks = Math.ceil(text.length / step);
    const interval = Math.max(12, Math.min(28, 1900 / chunks));
    for (let index = 0; index < text.length; index += step) {
      bubble.textContent = text.slice(0, index + step);
      messages.scrollTop = messages.scrollHeight;
      await wait(interval);
    }
  }
  if (action) {
    const link = document.createElement("a");
    link.className = "assistant-action";
    link.href = action[1].startsWith("../") ? new URL(action[1], import.meta.url).href : action[1];
    link.textContent = action[0];
    messages.append(link);
  }
  announcement.textContent = text;
  messages.scrollTop = messages.scrollHeight;
  await wait(900);
  announcement.textContent = "";
}

async function ask(question) {
  addMessage(question, true);
  sendButton.disabled = true;
  input.disabled = true;
  suggestions.forEach((button) => { button.disabled = true; });
  try {
    await respond(question);
  } catch (error) {
    console.error("KoloRise chatbot response failed:", error);
    addMessage("Sorry, something went wrong while preparing my reply. Please try again.");
  } finally {
    sendButton.disabled = false;
    input.disabled = false;
    suggestions.forEach((button) => { button.disabled = false; });
    if (!panel.hidden) input.focus();
  }
}

function openAssistant() {
  panel.hidden = false;
  launcher.setAttribute("aria-expanded", "true");
  launcher.setAttribute("aria-label", "Close KoloRise chatbot");
  if (!messages.childElementCount) {
    addMessage("Hi! I’m KoloRise. Ask me about the project, its founder, how to save, or how demo loan applications work.");
  }
  input.focus();
}

function closeAssistant() {
  panel.hidden = true;
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-label", "Open KoloRise chatbot");
  launcher.focus();
}

launcher.addEventListener("click", () => panel.hidden ? openAssistant() : closeAssistant());
root.querySelector(".assistant-close").addEventListener("click", closeAssistant);
root.querySelectorAll(".assistant-suggestions button").forEach((button) => {
  button.addEventListener("click", () => {
    ask(button.textContent);
  });
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = input.value.trim();
  if (!question) return;
  input.value = "";
  ask(question);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !panel.hidden) closeAssistant();
});
