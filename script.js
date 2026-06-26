/*
  LoviesLedger app logic
  This file controls account login, local saving, monthly budget history, vacation trip budgets, and investment projections.
  Data is saved in the browser with localStorage, so it stays on this device/browser.
*/

const storageKeys = {
  users: "clearledger.users",
  session: "clearledger.session",
  budgets: "clearledger.budgets",
  vacations: "clearledger.vacations",
  investments: "clearledger.investments"
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const monthlyCategories = [
  { key: "expenses", title: "Expenses", help: "Add every recurring expense and the monthly amount.", item: "Expense", placeholder: "Rent, groceries, phone", className: "costs", recurringDefault: true },
  { key: "purchases", title: "Purchases", help: "Add anything you spend money on, like clothes, shoes, or restaurants.", item: "Purchase", placeholder: "Clothes, shoes, restaurant", className: "purchases", recurringDefault: false },
  { key: "gifts", title: "Gifts", help: "Add money spent on gifts for birthdays, holidays, thank-yous, and surprises.", item: "Gift", placeholder: "Birthday gift, holiday present", className: "gifts", recurringDefault: false },
  { key: "monthlyInvestments", title: "Investments", help: "Add money invested this month, separate from savings.", item: "Investment", placeholder: "Index fund, brokerage, retirement", className: "monthly-investments", recurringDefault: false }
];

const vacationCategories = [
  { key: "travel", title: "Travel", help: "Planes, buses, taxis, rideshares, trains, parking, and fuel.", item: "Travel", placeholder: "Flight, taxi, bus", className: "travel" },
  { key: "hotels", title: "Hotels", help: "Hotels, rentals, resort fees, deposits, and lodging taxes.", item: "Hotel", placeholder: "Hotel, Airbnb, resort fee", className: "hotels" },
  { key: "food", title: "Food", help: "Restaurants, groceries, coffee, snacks, and trip meals.", item: "Food", placeholder: "Restaurant, groceries", className: "food" },
  { key: "activities", title: "Activities", help: "Museums, attractions, tours, events, and entertainment.", item: "Activity", placeholder: "Museum, attraction, tour", className: "activities" },
  { key: "other", title: "Other", help: "Insurance, phone plans, visas, supplies, and extra trip costs.", item: "Other", placeholder: "Insurance, phone plan", className: "other-trip" }
];

const projectionYearOptions = [5, 10, 20, 30];

let mode = "login";
let currentUser = "";
let currentMonth = monthKey(new Date());
let currentTripId = "";

const loginScreen = document.querySelector("#loginScreen");
const appScreen = document.querySelector("#appScreen");
const authForm = document.querySelector("#authForm");
const loginTab = document.querySelector("#loginTab");
const signupTab = document.querySelector("#signupTab");
const authTitle = document.querySelector("#authTitle");
const authHelper = document.querySelector("#authHelper");
const authSubmit = document.querySelector("#authSubmit");
const authMessage = document.querySelector("#authMessage");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const userEmail = document.querySelector("#userEmail");
const avatar = document.querySelector("#avatar");
const logoutButton = document.querySelector("#logoutButton");
const monthlyNav = document.querySelector("#monthlyNav");
const vacationNav = document.querySelector("#vacationNav");
const investmentsNav = document.querySelector("#investmentsNav");
const monthlyPage = document.querySelector("#monthlyPage");
const vacationPage = document.querySelector("#vacationPage");
const investmentsPage = document.querySelector("#investmentsPage");
const budgetForm = document.querySelector("#budgetForm");
const vacationForm = document.querySelector("#vacationForm");
const investmentsForm = document.querySelector("#investmentsForm");
const budgetMonth = document.querySelector("#budgetMonth");
const nextMonthButton = document.querySelector("#nextMonthButton");
const tripPicker = document.querySelector("#tripPicker");
const tripList = document.querySelector("#tripList");
const newTripButton = document.querySelector("#newTripButton");
const clearButton = document.querySelector("#clearButton");
const clearVacationButton = document.querySelector("#clearVacationButton");
const addInvestmentButton = document.querySelector("#addInvestmentButton");
const refreshMarketButton = document.querySelector("#refreshMarketButton");
const clearInvestmentsButton = document.querySelector("#clearInvestmentsButton");
const monthlyInputs = document.querySelector("#monthlyInputs");
const vacationInputs = document.querySelector("#vacationInputs");
const investmentRows = document.querySelector("#investmentRows");
const monthlySummary = document.querySelector("#monthlySummary");
const vacationSummary = document.querySelector("#vacationSummary");
const investmentSummary = document.querySelector("#investmentSummary");
const marketQuotes = document.querySelector("#marketQuotes");
const monthlyBreakdown = document.querySelector("#monthlyBreakdown");
const vacationBreakdown = document.querySelector("#vacationBreakdown");
const investmentBreakdown = document.querySelector("#investmentBreakdown");

const fields = {
  monthlyIncome: document.querySelector("#monthlyIncome"),
  extraIncome: document.querySelector("#extraIncome"),
  savePercent: document.querySelector("#savePercent"),
  charityPercent: document.querySelector("#charityPercent"),
  tripName: document.querySelector("#tripName"),
  tripBudget: document.querySelector("#tripBudget"),
  annualReturn: document.querySelector("#annualReturn"),
  projectionYears: document.querySelector("#projectionYears")
};

const results = {
  spendingLeft: document.querySelector("#spendingLeft"),
  statusPill: document.querySelector("#statusPill"),
  vacationLeft: document.querySelector("#vacationLeft"),
  vacationStatus: document.querySelector("#vacationStatus"),
  investmentFutureValue: document.querySelector("#investmentFutureValue"),
  investmentStatus: document.querySelector("#investmentStatus"),
  marketInfoStatus: document.querySelector("#marketInfoStatus")
};

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUsers() { return readJson(storageKeys.users, {}); }
function getBudgets() { return readJson(storageKeys.budgets, {}); }
function getVacations() { return readJson(storageKeys.vacations, {}); }
function getInvestments() { return readJson(storageKeys.investments, {}); }

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(month, amount) {
  const [year, monthIndex] = month.split("-").map(Number);
  return monthKey(new Date(year, monthIndex - 1 + amount, 1));
}

function numberValue(input) {
  return Math.max(0, Number(input.value) || 0);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function itemDefaults(recurring = false) {
  return [{ name: "", amount: "", recurring }];
}

function normalizeItem(item, recurringDefault = false) {
  return {
    name: item?.name ?? "",
    amount: item?.amount ?? "",
    recurring: Boolean(item?.recurring ?? recurringDefault)
  };
}

function emptyMonthlyBudget() {
  return {
    monthlyIncome: "",
    extraIncome: "",
    savePercent: "",
    charityPercent: "",
    expenses: itemDefaults(true),
    purchases: itemDefaults(false),
    gifts: itemDefaults(false),
    monthlyInvestments: itemDefaults(false)
  };
}

function normalizeMonthlyBudget(budget = emptyMonthlyBudget()) {
  const empty = emptyMonthlyBudget();
  return {
    monthlyIncome: budget.monthlyIncome ?? "",
    extraIncome: budget.extraIncome ?? "",
    savePercent: budget.savePercent ?? "",
    charityPercent: budget.charityPercent ?? "",
    expenses: (budget.expenses?.length ? budget.expenses : empty.expenses).map((item) => normalizeItem(item, true)),
    purchases: (budget.purchases?.length ? budget.purchases : empty.purchases).map((item) => normalizeItem(item, false)),
    gifts: (budget.gifts?.length ? budget.gifts : empty.gifts).map((item) => normalizeItem(item, false)),
    monthlyInvestments: (budget.monthlyInvestments?.length ? budget.monthlyInvestments : empty.monthlyInvestments).map((item) => normalizeItem(item, false))
  };
}

function recurringItems(items) {
  const recurring = items.filter((item) => item.recurring).map((item) => ({ ...item }));
  return recurring.length ? recurring : itemDefaults(false);
}

function newMonthFromPrevious(previousBudget) {
  const previous = normalizeMonthlyBudget(previousBudget);
  return {
    monthlyIncome: previous.monthlyIncome,
    extraIncome: previous.extraIncome,
    savePercent: previous.savePercent,
    charityPercent: previous.charityPercent,
    expenses: recurringItems(previous.expenses).map((item) => ({ ...item, recurring: true })),
    purchases: recurringItems(previous.purchases),
    gifts: recurringItems(previous.gifts),
    monthlyInvestments: recurringItems(previous.monthlyInvestments)
  };
}

function ensureUserBudget(budgets, email) {
  const existing = budgets[email];
  if (existing?.months) {
    existing.activeMonth ||= currentMonth;
    return existing;
  }
  budgets[email] = {
    activeMonth: currentMonth,
    months: { [currentMonth]: existing ? normalizeMonthlyBudget(existing) : emptyMonthlyBudget() }
  };
  return budgets[email];
}

function latestMonthBefore(months, targetMonth) {
  const previousMonths = Object.keys(months).filter((month) => month < targetMonth).sort();
  return previousMonths[previousMonths.length - 1];
}

function getMonthBudget(userBudget, month) {
  if (!userBudget.months[month]) {
    const previousMonth = latestMonthBefore(userBudget.months, month);
    userBudget.months[month] = previousMonth ? newMonthFromPrevious(userBudget.months[previousMonth]) : emptyMonthlyBudget();
  }
  return normalizeMonthlyBudget(userBudget.months[month]);
}

function emptyVacationBudget() {
  return {
    id: makeTripId(),
    createdAt: new Date().toISOString(),
    tripName: "",
    tripBudget: "",
    travel: itemDefaults(false),
    hotels: itemDefaults(false),
    food: itemDefaults(false),
    activities: itemDefaults(false),
    other: itemDefaults(false)
  };
}

function makeTripId() {
  return `trip-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeVacationBudget(vacation = emptyVacationBudget()) {
  const empty = emptyVacationBudget();
  const normalized = {
    id: vacation.id || makeTripId(),
    createdAt: vacation.createdAt || new Date().toISOString(),
    tripName: vacation.tripName ?? "",
    tripBudget: vacation.tripBudget ?? ""
  };
  vacationCategories.forEach((category) => {
    normalized[category.key] = (vacation[category.key]?.length ? vacation[category.key] : empty[category.key]).map((item) => normalizeItem(item, false));
  });
  return normalized;
}

function ensureVacationAccount(vacations, email) {
  const existing = vacations[email];
  if (existing?.trips) {
    if (!existing.activeTripId || !existing.trips[existing.activeTripId]) {
      existing.activeTripId = Object.keys(existing.trips)[0] || "";
    }
    return existing;
  }

  const firstTrip = normalizeVacationBudget(existing || emptyVacationBudget());
  vacations[email] = {
    activeTripId: firstTrip.id,
    trips: {
      [firstTrip.id]: firstTrip
    }
  };
  return vacations[email];
}

function getTripTitle(trip) {
  return trip.tripName || `Trip from ${new Date(trip.createdAt).toLocaleDateString()}`;
}

function renderTripPicker(account) {
  const trips = Object.values(account.trips).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  tripList.innerHTML = trips.map((trip) => `<option value="${escapeHtml(getTripTitle(trip))}" data-id="${trip.id}"></option>`).join("");
  const activeTrip = account.trips[currentTripId];
  tripPicker.value = activeTrip ? getTripTitle(activeTrip) : "";
}

function findTripByPickerValue(account, value) {
  return Object.values(account.trips).find((trip) => getTripTitle(trip) === value);
}

function emptyInvestmentPlan() {
  return {
    annualReturn: 7.5,
    projectionYears: 10,
    funds: [{ name: "", startingAmount: "", contributionAmount: "", contributionFrequency: "monthly" }]
  };
}

function normalizeFund(fund = {}) {
  return {
    name: fund.name ?? "",
    startingAmount: fund.startingAmount ?? fund.amount ?? "",
    contributionAmount: fund.contributionAmount ?? "",
    contributionFrequency: fund.contributionFrequency || "monthly"
  };
}

function normalizeInvestmentPlan(plan = emptyInvestmentPlan()) {
  const empty = emptyInvestmentPlan();
  return {
    annualReturn: Number(plan.annualReturn) || 7.5,
    projectionYears: Number(plan.projectionYears) || 10,
    funds: (plan.funds?.length ? plan.funds : empty.funds).map(normalizeFund)
  };
}

function ensureInvestmentPlan(investments, email) {
  investments[email] = normalizeInvestmentPlan(investments[email]);
  return investments[email];
}

function contributionsPerYear(frequency) {
  if (frequency === "weekly") return 52;
  if (frequency === "biweekly") return 26;
  if (frequency === "quarterly") return 4;
  if (frequency === "yearly") return 1;
  return 12;
}

function futureValue(startingAmount, contributionAmount, frequency, annualReturnPercent, years) {
  const periodsPerYear = contributionsPerYear(frequency);
  const totalPeriods = Math.max(0, Math.round(years * periodsPerYear));
  const periodRate = (annualReturnPercent / 100) / periodsPerYear;
  let value = startingAmount;

  for (let period = 0; period < totalPeriods; period += 1) {
    value = value * (1 + periodRate) + contributionAmount;
  }

  return value;
}

function uniqueTickers(funds) {
  return [...new Set(
    funds
      .map((fund) => String(fund.name || "").trim().toUpperCase())
      .filter(Boolean)
      .map((ticker) => ticker.replace(/\s+/g, ""))
  )];
}

function stooqSymbol(ticker) {
  return ticker.includes(".") ? ticker.toLowerCase() : `${ticker.toLowerCase()}.us`;
}

function yahooSymbol(ticker) {
  return ticker.includes(".") ? ticker.split(".")[0].toUpperCase() : ticker.toUpperCase();
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (const character of line) {
    if (character === '"') {
      inQuotes = !inQuotes;
    } else if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current);
  return values;
}

function parseStooqQuote(csvText) {
  const [headerLine, valueLine] = csvText.trim().split(/\r?\n/);
  if (!headerLine || !valueLine) return null;
  const headers = parseCsvLine(headerLine);
  const values = parseCsvLine(valueLine);
  const quote = Object.fromEntries(headers.map((header, index) => [header.toLowerCase(), values[index]]));
  if (!quote.close || quote.close === "N/D") return null;
  return quote;
}

function quoteLinks(ticker) {
  const yahooTicker = encodeURIComponent(yahooSymbol(ticker));
  const stooqTicker = encodeURIComponent(stooqSymbol(ticker));
  return `
    <div class="quote-links">
      <a href="https://finance.yahoo.com/quote/${yahooTicker}" target="_blank" rel="noopener">Yahoo Finance</a>
      <a href="https://stooq.com/q/?s=${stooqTicker}" target="_blank" rel="noopener">Stooq</a>
    </div>
  `;
}

function renderQuoteCard(ticker, quote) {
  if (!quote) {
    return `
      <div class="quote-card">
        <h4>${escapeHtml(ticker)}</h4>
        <p class="helper">Live quote was not available from the public source.</p>
        ${quoteLinks(ticker)}
      </div>
    `;
  }

  return `
    <div class="quote-card">
      <h4>${escapeHtml(ticker)}</h4>
      <dl>
        <dt>Last price</dt><dd>${money.format(Number(quote.close) || 0)}</dd>
        <dt>Open</dt><dd>${quote.open && quote.open !== "N/D" ? money.format(Number(quote.open) || 0) : "N/A"}</dd>
        <dt>High</dt><dd>${quote.high && quote.high !== "N/D" ? money.format(Number(quote.high) || 0) : "N/A"}</dd>
        <dt>Low</dt><dd>${quote.low && quote.low !== "N/D" ? money.format(Number(quote.low) || 0) : "N/A"}</dd>
        <dt>Volume</dt><dd>${quote.volume && quote.volume !== "N/D" ? Number(quote.volume).toLocaleString() : "N/A"}</dd>
        <dt>Date</dt><dd>${escapeHtml(quote.date || "N/A")}</dd>
      </dl>
      ${quoteLinks(ticker)}
    </div>
  `;
}

function setMode(nextMode) {
  mode = nextMode;
  const isLogin = mode === "login";
  loginTab.classList.toggle("active", isLogin);
  signupTab.classList.toggle("active", !isLogin);
  authTitle.textContent = isLogin ? "Welcome back" : "Create your account";
  authHelper.textContent = isLogin ? "Sign in to open your finance tracker." : "Create a local account to start tracking your money.";
  authSubmit.textContent = isLogin ? "Log in" : "Create account";
  authMessage.textContent = "";
  passwordInput.autocomplete = isLogin ? "current-password" : "new-password";
}

function showPage(pageName) {
  const isVacation = pageName === "vacation";
  const isInvestments = pageName === "investments";
  monthlyPage.classList.toggle("active", !isVacation && !isInvestments);
  vacationPage.classList.toggle("active", isVacation);
  investmentsPage.classList.toggle("active", isInvestments);
  monthlyNav.classList.toggle("active", !isVacation && !isInvestments);
  vacationNav.classList.toggle("active", isVacation);
  investmentsNav.classList.toggle("active", isInvestments);
}

function showApp(email) {
  currentUser = email;
  loginScreen.classList.remove("active");
  appScreen.classList.add("active");
  userEmail.textContent = email;
  avatar.textContent = email.trim().charAt(0).toUpperCase() || "U";
  const budgets = getBudgets();
  const userBudget = ensureUserBudget(budgets, email);
  currentMonth = userBudget.activeMonth || currentMonth;
  writeJson(storageKeys.budgets, budgets);
  loadMonthlyBudget(currentMonth);
  loadVacationBudget();
  loadInvestmentPlan();
  calculateMonthly();
  calculateVacation();
  calculateInvestments();
}

function showLogin() {
  currentUser = "";
  appScreen.classList.remove("active");
  loginScreen.classList.add("active");
  passwordInput.value = "";
  emailInput.focus();
}

function handleAuth(event) {
  event.preventDefault();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const users = getUsers();

  if (!email || password.length < 6) {
    authMessage.textContent = "Use an email and a password with at least 6 characters.";
    return;
  }
  if (mode === "signup") {
    if (users[email]) {
      authMessage.textContent = "That account already exists. Try logging in.";
      return;
    }
    users[email] = { password };
    writeJson(storageKeys.users, users);
    localStorage.setItem(storageKeys.session, email);
    showApp(email);
    return;
  }
  if (!users[email] || users[email].password !== password) {
    authMessage.textContent = "Email or password does not match.";
    return;
  }
  localStorage.setItem(storageKeys.session, email);
  showApp(email);
}

function renderCategoryInputs(container, categories, type) {
  container.innerHTML = categories.map((category) => `
    <div class="divider"></div>
    <div class="section-title">
      <div>
        <h2>${category.title}</h2>
        <p class="helper">${category.help}</p>
      </div>
    </div>
    <div id="${type}-${category.key}-rows"></div>
    <div class="actions">
      <button type="button" class="secondary" data-add="${type}-${category.key}">+ Add ${category.item.toLowerCase()}</button>
    </div>
  `).join("");
}

function makeRow(type, category, item = {}) {
  const row = document.createElement("div");
  const recurringDefault = type === "monthly" ? category.recurringDefault : false;
  const normalized = normalizeItem(item, recurringDefault);
  row.className = "item-row";
  row.innerHTML = `
    <div>
      <label>${category.item} name</label>
      <input class="item-name" type="text" placeholder="${escapeHtml(category.placeholder)}" value="${escapeHtml(normalized.name)}">
    </div>
    <div>
      <label>Amount</label>
      <input class="item-amount" type="number" min="0" step="0.01" placeholder="0" value="${escapeHtml(normalized.amount)}">
    </div>
    <label class="recurring-field">
      <input class="item-recurring" type="checkbox" ${normalized.recurring ? "checked" : ""}>
      Monthly
    </label>
    <button class="icon-button" type="button" aria-label="Remove ${category.item.toLowerCase()}">×</button>
  `;
  row.querySelector(".icon-button").addEventListener("click", () => {
    row.remove();
    saveAll();
  });
  row.querySelectorAll("input").forEach((input) => input.addEventListener("input", saveAll));
  document.querySelector(`#${type}-${category.key}-rows`).append(row);
}

function makeInvestmentRow(fund = {}) {
  const normalized = normalizeFund(fund);
  const row = document.createElement("div");
  row.className = "investment-row";
  row.innerHTML = `
    <div class="wide-field">
      <label>Index fund</label>
      <input class="fund-name" type="text" placeholder="VTI, VOO, FZROX" value="${escapeHtml(normalized.name)}">
    </div>
    <div>
      <label>Starting</label>
      <input class="fund-starting" type="number" min="0" step="0.01" placeholder="1000" value="${escapeHtml(normalized.startingAmount)}">
    </div>
    <div>
      <label>Add</label>
      <input class="fund-contribution" type="number" min="0" step="0.01" placeholder="100" value="${escapeHtml(normalized.contributionAmount)}">
    </div>
    <div class="wide-field">
      <label>How often</label>
      <select class="fund-frequency">
        <option value="weekly" ${normalized.contributionFrequency === "weekly" ? "selected" : ""}>Weekly</option>
        <option value="biweekly" ${normalized.contributionFrequency === "biweekly" ? "selected" : ""}>Every 2 weeks</option>
        <option value="monthly" ${normalized.contributionFrequency === "monthly" ? "selected" : ""}>Monthly</option>
        <option value="quarterly" ${normalized.contributionFrequency === "quarterly" ? "selected" : ""}>Quarterly</option>
        <option value="yearly" ${normalized.contributionFrequency === "yearly" ? "selected" : ""}>Yearly</option>
      </select>
    </div>
    <button class="icon-button" type="button" aria-label="Remove index fund">×</button>
  `;
  row.querySelector(".icon-button").addEventListener("click", () => {
    row.remove();
    saveInvestmentPlan();
    calculateInvestments();
  });
  row.querySelectorAll("input, select").forEach((input) => {
    ["input", "change"].forEach((eventName) => input.addEventListener(eventName, () => {
      saveInvestmentPlan();
      calculateInvestments();
    }));
  });
  investmentRows.append(row);
}

function collectRows(type, category) {
  return [...document.querySelectorAll(`#${type}-${category.key}-rows .item-row`)].map((row) => ({
    name: row.querySelector(".item-name").value.trim(),
    amount: numberValue(row.querySelector(".item-amount")),
    recurring: row.querySelector(".item-recurring").checked
  }));
}

function collectMonthlyBudget() {
  const budget = {
    monthlyIncome: numberValue(fields.monthlyIncome),
    extraIncome: numberValue(fields.extraIncome),
    savePercent: numberValue(fields.savePercent),
    charityPercent: numberValue(fields.charityPercent)
  };
  monthlyCategories.forEach((category) => {
    budget[category.key] = collectRows("monthly", category);
  });
  return budget;
}

function collectVacationBudget() {
  const vacation = {
    id: currentTripId || makeTripId(),
    createdAt: new Date().toISOString(),
    tripName: fields.tripName.value.trim(),
    tripBudget: numberValue(fields.tripBudget)
  };
  vacationCategories.forEach((category) => {
    vacation[category.key] = collectRows("vacation", category);
  });
  return vacation;
}

function collectInvestmentPlan() {
  return {
    annualReturn: numberValue(fields.annualReturn),
    projectionYears: Math.max(1, Number(fields.projectionYears.value) || 10),
    funds: [...investmentRows.querySelectorAll(".investment-row")].map((row) => ({
      name: row.querySelector(".fund-name").value.trim(),
      startingAmount: numberValue(row.querySelector(".fund-starting")),
      contributionAmount: numberValue(row.querySelector(".fund-contribution")),
      contributionFrequency: row.querySelector(".fund-frequency").value
    }))
  };
}

function saveMonthlyBudget() {
  if (!currentUser) return;
  const budgets = getBudgets();
  const userBudget = ensureUserBudget(budgets, currentUser);
  userBudget.activeMonth = currentMonth;
  userBudget.months[currentMonth] = collectMonthlyBudget();
  writeJson(storageKeys.budgets, budgets);
}

function saveVacationBudget() {
  if (!currentUser) return;
  const vacations = getVacations();
  const account = ensureVacationAccount(vacations, currentUser);
  const previousTrip = account.trips[currentTripId] || {};
  const nextTrip = collectVacationBudget();
  nextTrip.id = currentTripId || nextTrip.id;
  nextTrip.createdAt = previousTrip.createdAt || nextTrip.createdAt;
  currentTripId = nextTrip.id;
  account.activeTripId = currentTripId;
  account.trips[currentTripId] = nextTrip;
  writeJson(storageKeys.vacations, vacations);
  renderTripPicker(account);
}

function saveInvestmentPlan() {
  if (!currentUser) return;
  const investments = getInvestments();
  investments[currentUser] = collectInvestmentPlan();
  writeJson(storageKeys.investments, investments);
}

function saveAll() {
  saveMonthlyBudget();
  saveVacationBudget();
  saveInvestmentPlan();
  calculateMonthly();
  calculateVacation();
  calculateInvestments();
}

function loadMonthlyBudget(month = currentMonth) {
  const budgets = getBudgets();
  const userBudget = ensureUserBudget(budgets, currentUser);
  currentMonth = month || userBudget.activeMonth || currentMonth;
  userBudget.activeMonth = currentMonth;
  const budget = getMonthBudget(userBudget, currentMonth);
  userBudget.months[currentMonth] = budget;
  writeJson(storageKeys.budgets, budgets);

  budgetMonth.value = currentMonth;
  fields.monthlyIncome.value = budget.monthlyIncome || "";
  fields.extraIncome.value = budget.extraIncome || "";
  fields.savePercent.value = budget.savePercent || "";
  fields.charityPercent.value = budget.charityPercent || "";
  monthlyCategories.forEach((category) => {
    document.querySelector(`#monthly-${category.key}-rows`).innerHTML = "";
    const rows = budget[category.key]?.length ? budget[category.key] : itemDefaults(category.recurringDefault);
    rows.forEach((item) => makeRow("monthly", category, item));
  });
}

function loadVacationBudget() {
  const vacations = getVacations();
  const account = ensureVacationAccount(vacations, currentUser);
  currentTripId = account.activeTripId;
  const vacation = normalizeVacationBudget(account.trips[currentTripId] || emptyVacationBudget());
  currentTripId = vacation.id;
  account.activeTripId = currentTripId;
  account.trips[currentTripId] = vacation;
  writeJson(storageKeys.vacations, vacations);
  renderTripPicker(account);
  fields.tripName.value = vacation.tripName || "";
  fields.tripBudget.value = vacation.tripBudget || "";
  vacationCategories.forEach((category) => {
    document.querySelector(`#vacation-${category.key}-rows`).innerHTML = "";
    const rows = vacation[category.key]?.length ? vacation[category.key] : itemDefaults(false);
    rows.forEach((item) => makeRow("vacation", category, item));
  });
}

function loadInvestmentPlan() {
  const investments = getInvestments();
  const plan = ensureInvestmentPlan(investments, currentUser);
  writeJson(storageKeys.investments, investments);

  fields.annualReturn.value = plan.annualReturn || 7.5;
  fields.projectionYears.value = plan.projectionYears || 10;
  investmentRows.innerHTML = "";
  const funds = plan.funds?.length ? plan.funds : emptyInvestmentPlan().funds;
  funds.forEach(makeInvestmentRow);
}

function sum(items) {
  return items.reduce((total, item) => total + (Number(item.amount) || 0), 0);
}

function renderSummary(container, categories, totals) {
  container.innerHTML = categories.map((category) => `
    <div class="metric ${category.className}">
      <span>${category.title}</span>
      <strong>${money.format(totals[category.key] || 0)}</strong>
    </div>
  `).join("");
}

function renderBreakdown(container, categories, budget, emptyWord) {
  container.innerHTML = categories.map((category) => {
    const filled = (budget[category.key] || []).filter((item) => item.name || item.amount);
    const list = filled.length ? filled.map((item) => `
      <div class="list-item">
        <span>${escapeHtml(item.name || `Unnamed ${category.item.toLowerCase()}`)}<small class="item-meta">${item.recurring ? "Monthly" : "One-time"}</small></span>
        <strong>${money.format(Number(item.amount) || 0)}</strong>
      </div>
    `).join("") : `<div class="empty">Your ${emptyWord} for ${category.title.toLowerCase()} will appear here.</div>`;
    return `<h3>${category.title}</h3><div class="list">${list}</div>`;
  }).join("");
}

function calculateMonthly() {
  const budget = collectMonthlyBudget();
  const totalIncome = budget.monthlyIncome + budget.extraIncome;
  const saveAmount = totalIncome * (budget.savePercent / 100);
  const charityAmount = totalIncome * (budget.charityPercent / 100);
  const totals = {
    expenses: sum(budget.expenses),
    purchases: sum(budget.purchases),
    gifts: sum(budget.gifts),
    monthlyInvestments: sum(budget.monthlyInvestments)
  };
  const spendingLeft = totalIncome - saveAmount - charityAmount - totals.expenses - totals.purchases - totals.gifts - totals.monthlyInvestments;
  results.spendingLeft.textContent = money.format(spendingLeft);
  results.statusPill.textContent = spendingLeft < 0 ? "Over budget" : "Balanced";
  results.statusPill.classList.toggle("warning", spendingLeft < 0);
  monthlySummary.innerHTML = `
    <div class="metric save"><span>Need to save</span><strong>${money.format(saveAmount)}</strong></div>
    <div class="metric give"><span>Charity</span><strong>${money.format(charityAmount)}</strong></div>
  `;
  renderSummary(monthlySummary, monthlyCategories, totals);
  monthlySummary.insertAdjacentHTML("afterbegin", `
    <div class="metric save"><span>Need to save</span><strong>${money.format(saveAmount)}</strong></div>
    <div class="metric give"><span>Charity</span><strong>${money.format(charityAmount)}</strong></div>
  `);
  renderBreakdown(monthlyBreakdown, monthlyCategories, budget, "items");
}

function calculateVacation() {
  const vacation = collectVacationBudget();
  const totals = {};
  vacationCategories.forEach((category) => {
    totals[category.key] = sum(vacation[category.key]);
  });
  const spent = Object.values(totals).reduce((total, value) => total + value, 0);
  const left = vacation.tripBudget - spent;
  results.vacationLeft.textContent = money.format(left);
  results.vacationStatus.textContent = left < 0 ? "Over trip budget" : "Planned";
  results.vacationStatus.classList.toggle("warning", left < 0);
  renderSummary(vacationSummary, vacationCategories, totals);
  renderBreakdown(vacationBreakdown, vacationCategories, vacation, "trip costs");
}

function calculateInvestments() {
  const plan = collectInvestmentPlan();
  const annualReturn = plan.annualReturn || 7.5;
  const mainYears = Math.max(1, plan.projectionYears || 10);
  const funds = plan.funds.filter((fund) => fund.name || fund.startingAmount || fund.contributionAmount);
  const currentInvested = sum(funds.map((fund) => ({ amount: fund.startingAmount })));
  const projectedValue = funds.reduce((total, fund) => (
    total + futureValue(fund.startingAmount, fund.contributionAmount, fund.contributionFrequency, annualReturn, mainYears)
  ), 0);
  const addedByUser = funds.reduce((total, fund) => (
    total + fund.startingAmount + (fund.contributionAmount * contributionsPerYear(fund.contributionFrequency) * mainYears)
  ), 0);
  const estimatedGrowth = Math.max(0, projectedValue - addedByUser);

  results.investmentFutureValue.textContent = money.format(projectedValue);
  results.investmentStatus.textContent = `${annualReturn}% assumed`;
  investmentSummary.innerHTML = `
    <div class="metric invested"><span>Invested now</span><strong>${money.format(currentInvested)}</strong></div>
    <div class="metric contributed"><span>You add by ${mainYears} years</span><strong>${money.format(Math.max(0, addedByUser - currentInvested))}</strong></div>
    <div class="metric growth"><span>Estimated growth</span><strong>${money.format(estimatedGrowth)}</strong></div>
  `;

  const timelineYears = [...new Set([...projectionYearOptions, mainYears])].sort((a, b) => a - b);
  const timeline = timelineYears.map((years) => {
    const value = funds.reduce((total, fund) => (
      total + futureValue(fund.startingAmount, fund.contributionAmount, fund.contributionFrequency, annualReturn, years)
    ), 0);
    return `
      <div class="list-item">
        <span>${years} years<small class="item-meta">At ${annualReturn}% annual return</small></span>
        <strong>${money.format(value)}</strong>
      </div>
    `;
  }).join("");

  const fundList = funds.length ? funds.map((fund) => {
    const value = futureValue(fund.startingAmount, fund.contributionAmount, fund.contributionFrequency, annualReturn, mainYears);
    return `
      <div class="list-item">
        <span>${escapeHtml(fund.name || "Unnamed index fund")}<small class="item-meta">${money.format(fund.contributionAmount)} ${fund.contributionFrequency}</small></span>
        <strong>${money.format(value)}</strong>
      </div>
    `;
  }).join("") : '<div class="empty">Your index funds will appear here after you add them.</div>';

  investmentBreakdown.innerHTML = `
    <h3>Future timeline</h3>
    <div class="list">${timeline || '<div class="empty">Add an index fund to see future estimates.</div>'}</div>
    <h3>By index fund</h3>
    <div class="list">${fundList}</div>
  `;
}

async function refreshMarketInfo() {
  const plan = collectInvestmentPlan();
  const tickers = uniqueTickers(plan.funds);

  if (!tickers.length) {
    results.marketInfoStatus.textContent = "Add ticker symbols like VOO, VTI, SPY, or QQQ, then refresh public prices.";
    marketQuotes.innerHTML = "";
    return;
  }

  results.marketInfoStatus.textContent = "Loading public market prices...";
  marketQuotes.innerHTML = tickers.map((ticker) => `
    <div class="quote-card">
      <h4>${escapeHtml(ticker)}</h4>
      <p class="helper">Loading...</p>
    </div>
  `).join("");

  try {
    const cards = await Promise.all(tickers.map(async (ticker) => {
      const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol(ticker))}&f=sd2t2ohlcv&h&e=csv`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Quote request failed for ${ticker}`);
      const quote = parseStooqQuote(await response.text());
      return renderQuoteCard(ticker, quote);
    }));

    marketQuotes.innerHTML = cards.join("");
    results.marketInfoStatus.textContent = "Showing public quote data. Prices may be delayed and are not financial advice.";
  } catch (error) {
    marketQuotes.innerHTML = tickers.map((ticker) => renderQuoteCard(ticker, null)).join("");
    results.marketInfoStatus.textContent = "The public quote request was blocked or unavailable. Use the public links below for current prices.";
  }
}

function clearRows(type, categories) {
  categories.forEach((category) => {
    document.querySelector(`#${type}-${category.key}-rows`).innerHTML = "";
    makeRow(type, category, { recurring: type === "monthly" ? category.recurringDefault : false });
  });
}

renderCategoryInputs(monthlyInputs, monthlyCategories, "monthly");
renderCategoryInputs(vacationInputs, vacationCategories, "vacation");

monthlyInputs.addEventListener("click", (event) => {
  const addKey = event.target.dataset.add;
  if (!addKey) return;
  const key = addKey.replace("monthly-", "");
  makeRow("monthly", monthlyCategories.find((category) => category.key === key));
  saveAll();
});

vacationInputs.addEventListener("click", (event) => {
  const addKey = event.target.dataset.add;
  if (!addKey) return;
  const key = addKey.replace("vacation-", "");
  makeRow("vacation", vacationCategories.find((category) => category.key === key));
  saveAll();
});

addInvestmentButton.addEventListener("click", () => {
  makeInvestmentRow();
  saveInvestmentPlan();
  calculateInvestments();
  investmentRows.lastElementChild?.querySelector(".fund-name").focus();
});

refreshMarketButton.addEventListener("click", refreshMarketInfo);

loginTab.addEventListener("click", () => setMode("login"));
signupTab.addEventListener("click", () => setMode("signup"));
authForm.addEventListener("submit", handleAuth);
monthlyNav.addEventListener("click", () => showPage("monthly"));
vacationNav.addEventListener("click", () => showPage("vacation"));
investmentsNav.addEventListener("click", () => showPage("investments"));

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(storageKeys.session);
  showLogin();
});

budgetMonth.addEventListener("change", () => {
  if (!budgetMonth.value) return;
  saveMonthlyBudget();
  loadMonthlyBudget(budgetMonth.value);
  calculateMonthly();
});

nextMonthButton.addEventListener("click", () => {
  saveMonthlyBudget();
  loadMonthlyBudget(addMonths(currentMonth, 1));
  calculateMonthly();
});

tripPicker.addEventListener("change", () => {
  if (!currentUser) return;
  const selectedValue = tripPicker.value;
  saveVacationBudget();
  const vacations = getVacations();
  const account = ensureVacationAccount(vacations, currentUser);
  const selectedTrip = findTripByPickerValue(account, selectedValue);
  if (!selectedTrip) {
    renderTripPicker(account);
    return;
  }
  currentTripId = selectedTrip.id;
  account.activeTripId = currentTripId;
  writeJson(storageKeys.vacations, vacations);
  loadVacationBudget();
  calculateVacation();
});

newTripButton.addEventListener("click", () => {
  if (!currentUser) return;
  saveVacationBudget();
  const vacations = getVacations();
  const account = ensureVacationAccount(vacations, currentUser);
  const newTrip = emptyVacationBudget();
  currentTripId = newTrip.id;
  account.activeTripId = currentTripId;
  account.trips[currentTripId] = newTrip;
  writeJson(storageKeys.vacations, vacations);
  loadVacationBudget();
  calculateVacation();
  fields.tripName.focus();
});

clearButton.addEventListener("click", () => {
  fields.monthlyIncome.value = "";
  fields.extraIncome.value = "";
  fields.savePercent.value = "";
  fields.charityPercent.value = "";
  clearRows("monthly", monthlyCategories);
  saveAll();
});

clearVacationButton.addEventListener("click", () => {
  fields.tripName.value = "";
  fields.tripBudget.value = "";
  clearRows("vacation", vacationCategories);
  saveAll();
});

clearInvestmentsButton.addEventListener("click", () => {
  fields.annualReturn.value = "7.5";
  fields.projectionYears.value = "10";
  investmentRows.innerHTML = "";
  makeInvestmentRow();
  marketQuotes.innerHTML = "";
  results.marketInfoStatus.textContent = "Add ticker symbols like VOO, VTI, SPY, or QQQ, then refresh public prices.";
  saveInvestmentPlan();
  calculateInvestments();
});

budgetForm.addEventListener("input", saveAll);
vacationForm.addEventListener("input", saveAll);
investmentsForm.addEventListener("input", () => {
  saveInvestmentPlan();
  calculateInvestments();
});
investmentsForm.addEventListener("change", () => {
  saveInvestmentPlan();
  calculateInvestments();
});

const session = localStorage.getItem(storageKeys.session);
if (session && getUsers()[session]) {
  showApp(session);
} else {
  showLogin();
}
