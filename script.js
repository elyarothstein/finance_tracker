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
  investments: "clearledger.investments",
  helperChats: "clearledger.helperChats"
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// These category arrays are the blueprint for the rows that appear on the Monthly and Vacation pages.
// To add a new category later, add one object here and the app will render its inputs automatically.
const monthlyCategories = [
  { key: "rent", title: "Rent", help: "Add rent payments here so the app can track housing costs automatically.", item: "Rent", placeholder: "Apartment rent", className: "rent-costs", recurringDefault: true },
  { key: "utilities", title: "Utilities", help: "Add necessary utility bills like electricity, water, internet, heat, and phone.", item: "Utility", placeholder: "Electric, internet, water", className: "utility-costs", recurringDefault: true },
  { key: "groceries", title: "Groceries", help: "Add grocery spending here so the app can recognize food-at-home costs automatically.", item: "Grocery", placeholder: "Supermarket, grocery delivery", className: "grocery-costs", recurringDefault: false, merchantLabel: "Store" },
  { key: "gas", title: "Gas", help: "Add gas and fuel spending here so the app can track transportation fuel costs.", item: "Gas", placeholder: "Gas station, fuel", className: "gas-costs", recurringDefault: false, merchantLabel: "Gas station" },
  { key: "expenses", title: "Other necessary expenses", help: "Expenses are necessary purchases. Use this for essentials that are not rent, utilities, groceries, or gas.", item: "Expense", placeholder: "Insurance, medical, childcare", className: "costs", recurringDefault: true },
  { key: "restaurants", title: "Restaurants", help: "Add restaurant, takeout, coffee shop, and food delivery spending here.", item: "Restaurant", placeholder: "Restaurant, takeout, coffee", className: "restaurant-costs", recurringDefault: false, merchantLabel: "Restaurant" },
  { key: "purchases", title: "Purchases", help: "Add general spending like clothes, shoes, electronics, and personal items.", item: "Purchase", placeholder: "Clothes, shoes, electronics", className: "purchases", recurringDefault: false },
  { key: "gifts", title: "Gifts", help: "Add money spent on gifts for birthdays, holidays, thank-yous, and surprises.", item: "Gift", placeholder: "Birthday gift, holiday present", className: "gifts", recurringDefault: false },
  { key: "monthlyInvestments", title: "Investments", help: "Add money invested this month, separate from savings.", item: "Investment", placeholder: "Index fund, brokerage, retirement", className: "monthly-investments", recurringDefault: false }
];

const vacationCategories = [
  { key: "travel", title: "Travel", help: "Planes, buses, taxis, rideshares, trains, parking, and fuel.", item: "Travel", placeholder: "Flight, taxi, bus", className: "travel", merchantLabel: "Airline or brand" },
  { key: "hotels", title: "Hotels", help: "Hotels, rentals, resort fees, deposits, and lodging taxes.", item: "Hotel", placeholder: "Hotel, Airbnb, resort fee", className: "hotels", merchantLabel: "Hotel brand" },
  { key: "food", title: "Food", help: "Restaurants, groceries, coffee, snacks, and trip meals.", item: "Food", placeholder: "Restaurant, groceries", className: "food", merchantLabel: "Restaurant/store" },
  { key: "activities", title: "Activities", help: "Museums, attractions, tours, events, and entertainment.", item: "Activity", placeholder: "Museum, attraction, tour", className: "activities" },
  { key: "other", title: "Other", help: "Insurance, phone plans, visas, supplies, and extra trip costs.", item: "Other", placeholder: "Insurance, phone plan", className: "other-trip" }
];

const projectionYearOptions = [5, 10, 20, 30];

// These variables remember what the user is currently looking at.
let mode = "login";
let currentUser = "";
let currentMonth = monthKey(new Date());
let currentTripId = "";

// These constants connect JavaScript to the matching ids in index.html.
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
const summaryNav = document.querySelector("#summaryNav");
const creditCardsNav = document.querySelector("#creditCardsNav");
const monthlyPage = document.querySelector("#monthlyPage");
const vacationPage = document.querySelector("#vacationPage");
const investmentsPage = document.querySelector("#investmentsPage");
const summaryPage = document.querySelector("#summaryPage");
const creditCardsPage = document.querySelector("#creditCardsPage");
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
const refreshSummaryButton = document.querySelector("#refreshSummaryButton");
const refreshCardsButton = document.querySelector("#refreshCardsButton");
const monthlyInputs = document.querySelector("#monthlyInputs");
const vacationInputs = document.querySelector("#vacationInputs");
const investmentRows = document.querySelector("#investmentRows");
const monthlySummary = document.querySelector("#monthlySummary");
const vacationSummary = document.querySelector("#vacationSummary");
const investmentSummary = document.querySelector("#investmentSummary");
const historySummary = document.querySelector("#historySummary");
const cardSignalSummary = document.querySelector("#cardSignalSummary");
const marketQuotes = document.querySelector("#marketQuotes");
const monthlyBreakdown = document.querySelector("#monthlyBreakdown");
const vacationBreakdown = document.querySelector("#vacationBreakdown");
const investmentBreakdown = document.querySelector("#investmentBreakdown");
const historyTableWrap = document.querySelector("#historyTableWrap");
const vacationHistoryWrap = document.querySelector("#vacationHistoryWrap");
const cardRecommendations = document.querySelector("#cardRecommendations");
const merchantBreakdown = document.querySelector("#merchantBreakdown");
const cardLibrary = document.querySelector("#cardLibrary");
const helperToggle = document.querySelector("#helperToggle");
const helperPanel = document.querySelector("#helperPanel");
const helperClose = document.querySelector("#helperClose");
const helperMessages = document.querySelector("#helperMessages");
const helperForm = document.querySelector("#helperForm");
const helperInput = document.querySelector("#helperInput");

const fields = {
  monthlyIncome: document.querySelector("#monthlyIncome"),
  incomeFrequency: document.querySelector("#incomeFrequency"),
  extraIncome: document.querySelector("#extraIncome"),
  savePercent: document.querySelector("#savePercent"),
  charityPercent: document.querySelector("#charityPercent"),
  tripName: document.querySelector("#tripName"),
  tripMonth: document.querySelector("#tripMonth"),
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

// localStorage can only save strings, so these helpers turn objects into JSON and back again.
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

function monthlyIncomeFrom(amount, frequency = "monthly") {
  // Weekly and biweekly income are converted into a monthly estimate for the budget math.
  if (frequency === "weekly") return amount * 52 / 12;
  if (frequency === "biweekly") return amount * 26 / 12;
  return amount;
}

function escapeHtml(value) {
  // This keeps typed text safe when we place it back into the page with innerHTML.
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
  // Normalizing keeps older saved data working even after the app gains new fields.
  return {
    name: item?.name ?? "",
    amount: item?.amount ?? "",
    recurring: Boolean(item?.recurring ?? recurringDefault),
    subcategory: item?.subcategory || "other",
    merchant: item?.merchant ?? ""
  };
}

function emptyMonthlyBudget() {
  return {
    monthlyIncome: "",
    incomeFrequency: "monthly",
    extraIncome: "",
    savePercent: "",
    charityPercent: "",
    rent: itemDefaults(true),
    utilities: itemDefaults(true),
    groceries: itemDefaults(false),
    gas: itemDefaults(false),
    expenses: itemDefaults(true),
    restaurants: itemDefaults(false),
    purchases: itemDefaults(false),
    gifts: itemDefaults(false),
    monthlyInvestments: itemDefaults(false)
  };
}

function normalizeMonthlyBudget(budget = emptyMonthlyBudget()) {
  const empty = emptyMonthlyBudget();
  // Older versions stored rent, utilities, groceries, and gas inside "expenses".
  // This migration moves those old rows into the newer separate categories.
  const oldExpenses = budget.expenses?.length ? budget.expenses.map((item) => normalizeItem(item, true)) : [];
  const promotedSubcategories = ["rent", "utilities", "groceries", "gas"];
  const migratedItems = (subcategory) => oldExpenses.filter((item) => item.subcategory === subcategory);
  const remainingExpenses = oldExpenses.filter((item) => !promotedSubcategories.includes(item.subcategory));
  return {
    monthlyIncome: budget.monthlyIncome ?? "",
    incomeFrequency: budget.incomeFrequency || "monthly",
    extraIncome: budget.extraIncome ?? "",
    savePercent: budget.savePercent ?? "",
    charityPercent: budget.charityPercent ?? "",
    rent: (budget.rent?.length ? budget.rent : migratedItems("rent").length ? migratedItems("rent") : empty.rent).map((item) => normalizeItem(item, true)),
    utilities: (budget.utilities?.length ? budget.utilities : migratedItems("utilities").length ? migratedItems("utilities") : empty.utilities).map((item) => normalizeItem(item, true)),
    groceries: (budget.groceries?.length ? budget.groceries : migratedItems("groceries").length ? migratedItems("groceries") : empty.groceries).map((item) => normalizeItem(item, false)),
    gas: (budget.gas?.length ? budget.gas : migratedItems("gas").length ? migratedItems("gas") : empty.gas).map((item) => normalizeItem(item, false)),
    expenses: (remainingExpenses.length ? remainingExpenses : empty.expenses).map((item) => normalizeItem(item, true)),
    restaurants: (budget.restaurants?.length ? budget.restaurants : empty.restaurants).map((item) => normalizeItem(item, false)),
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
  // When a new month starts, only rows marked Monthly copy forward automatically.
  return {
    monthlyIncome: previous.monthlyIncome,
    incomeFrequency: previous.incomeFrequency || "monthly",
    extraIncome: previous.extraIncome,
    savePercent: previous.savePercent,
    charityPercent: previous.charityPercent,
    rent: recurringItems(previous.rent).map((item) => ({ ...item, recurring: true })),
    utilities: recurringItems(previous.utilities).map((item) => ({ ...item, recurring: true })),
    groceries: recurringItems(previous.groceries),
    gas: recurringItems(previous.gas),
    expenses: recurringItems(previous.expenses).map((item) => ({ ...item, recurring: true })),
    restaurants: recurringItems(previous.restaurants),
    purchases: recurringItems(previous.purchases),
    gifts: recurringItems(previous.gifts),
    monthlyInvestments: recurringItems(previous.monthlyInvestments)
  };
}

function ensureUserBudget(budgets, email) {
  // Every user has their own saved month history inside the budgets object.
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
    // If the user opens a month for the first time, start it from the closest previous month.
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
    tripMonth: monthKey(new Date()),
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
  const createdAt = vacation.createdAt || new Date().toISOString();
  const normalized = {
    id: vacation.id || makeTripId(),
    createdAt,
    tripName: vacation.tripName ?? "",
    tripMonth: vacation.tripMonth || monthKey(new Date(createdAt)),
    tripBudget: vacation.tripBudget ?? ""
  };
  vacationCategories.forEach((category) => {
    normalized[category.key] = (vacation[category.key]?.length ? vacation[category.key] : empty[category.key]).map((item) => normalizeItem(item, false));
  });
  return normalized;
}

function ensureVacationAccount(vacations, email) {
  // Vacation data is saved as many trips, with one active trip selected at a time.
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
  // Compound interest: every period grows the current value, then adds the user's contribution.
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
  // Stooq returns public quote data as CSV, so this turns one CSV row into a JavaScript object.
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
  // Switches the login form between "Log in" and "Create account".
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
  // Only one app page should be active at a time.
  const isVacation = pageName === "vacation";
  const isInvestments = pageName === "investments";
  const isSummary = pageName === "summary";
  const isCreditCards = pageName === "creditCards";
  monthlyPage.classList.toggle("active", !isVacation && !isInvestments && !isSummary && !isCreditCards);
  vacationPage.classList.toggle("active", isVacation);
  investmentsPage.classList.toggle("active", isInvestments);
  summaryPage.classList.toggle("active", isSummary);
  creditCardsPage.classList.toggle("active", isCreditCards);
  monthlyNav.classList.toggle("active", !isVacation && !isInvestments && !isSummary && !isCreditCards);
  vacationNav.classList.toggle("active", isVacation);
  investmentsNav.classList.toggle("active", isInvestments);
  summaryNav.classList.toggle("active", isSummary);
  creditCardsNav.classList.toggle("active", isCreditCards);

  if (isSummary) {
    renderHistorySummary();
  }
  if (isCreditCards) {
    renderCreditCardGuide();
  }
}

function showApp(email) {
  // After login, load everything saved for this account and calculate the visible totals.
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
  renderHistorySummary();
  renderCreditCardGuide();
}

function showLogin() {
  currentUser = "";
  appScreen.classList.remove("active");
  loginScreen.classList.add("active");
  passwordInput.value = "";
  emailInput.focus();
}

function handleAuth(event) {
  // This is a simple local demo login. Accounts are saved only in this browser.
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
  // Builds the category sections from monthlyCategories or vacationCategories.
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
  // Creates one editable row for categories like groceries, gas, gifts, travel, or hotels.
  const row = document.createElement("div");
  const recurringDefault = type === "monthly" ? category.recurringDefault : false;
  const normalized = normalizeItem(item, recurringDefault);
  const merchantField = category.merchantLabel ? `
    <div>
      <label>${category.merchantLabel}</label>
      <input class="item-merchant" type="text" placeholder="Costco, Target, Southwest" value="${escapeHtml(normalized.merchant)}">
    </div>
  ` : "";
  row.className = category.merchantLabel ? "item-row merchant-row" : "item-row";
  row.innerHTML = `
    <div>
      <label>${category.item} name</label>
      <input class="item-name" type="text" placeholder="${escapeHtml(category.placeholder)}" value="${escapeHtml(normalized.name)}">
    </div>
    ${merchantField}
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
  row.querySelectorAll("input, select").forEach((input) => {
    ["input", "change"].forEach((eventName) => input.addEventListener(eventName, saveAll));
  });
  document.querySelector(`#${type}-${category.key}-rows`).append(row);
}

function makeInvestmentRow(fund = {}) {
  // Creates one editable index-fund row on the Investments page.
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
  // Reads all row inputs from the page and turns them into saveable objects.
  return [...document.querySelectorAll(`#${type}-${category.key}-rows .item-row`)].map((row) => ({
    name: row.querySelector(".item-name").value.trim(),
    merchant: row.querySelector(".item-merchant")?.value.trim() || "",
    amount: numberValue(row.querySelector(".item-amount")),
    recurring: row.querySelector(".item-recurring").checked
  }));
}

function collectMonthlyBudget() {
  const budget = {
    monthlyIncome: numberValue(fields.monthlyIncome),
    incomeFrequency: fields.incomeFrequency.value,
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
    tripMonth: fields.tripMonth.value || monthKey(new Date()),
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
  // Most typing in the app comes here: save the data, then refresh the totals.
  saveMonthlyBudget();
  saveVacationBudget();
  saveInvestmentPlan();
  calculateMonthly();
  calculateVacation();
  calculateInvestments();
}

function loadMonthlyBudget(month = currentMonth) {
  // Puts saved monthly data back into the form fields and category rows.
  const budgets = getBudgets();
  const userBudget = ensureUserBudget(budgets, currentUser);
  currentMonth = month || userBudget.activeMonth || currentMonth;
  userBudget.activeMonth = currentMonth;
  const budget = getMonthBudget(userBudget, currentMonth);
  userBudget.months[currentMonth] = budget;
  writeJson(storageKeys.budgets, budgets);

  budgetMonth.value = currentMonth;
  fields.monthlyIncome.value = budget.monthlyIncome || "";
  fields.incomeFrequency.value = budget.incomeFrequency || "monthly";
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
  // Puts the selected trip back into the vacation form.
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
  fields.tripMonth.value = vacation.tripMonth || monthKey(new Date(vacation.createdAt));
  fields.tripBudget.value = vacation.tripBudget || "";
  vacationCategories.forEach((category) => {
    document.querySelector(`#vacation-${category.key}-rows`).innerHTML = "";
    const rows = vacation[category.key]?.length ? vacation[category.key] : itemDefaults(false);
    rows.forEach((item) => makeRow("vacation", category, item));
  });
}

function loadInvestmentPlan() {
  // Puts the saved investment plan back into the Investments page.
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

function monthLabel(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric"
  });
}

function monthlyRollup(month, budget) {
  // Used by the Summary page to turn one saved month into category totals.
  const normalized = normalizeMonthlyBudget(budget);
  const monthlyIncome = monthlyIncomeFrom(Number(normalized.monthlyIncome) || 0, normalized.incomeFrequency);
  const extraIncome = Number(normalized.extraIncome) || 0;
  const income = monthlyIncome + extraIncome;
  const savings = income * ((Number(normalized.savePercent) || 0) / 100);
  const charity = income * ((Number(normalized.charityPercent) || 0) / 100);
  const rent = sum(normalized.rent);
  const utilities = sum(normalized.utilities);
  const groceries = sum(normalized.groceries);
  const gas = sum(normalized.gas);
  const expenses = sum(normalized.expenses);
  const restaurants = sum(normalized.restaurants);
  const purchases = sum(normalized.purchases);
  const gifts = sum(normalized.gifts);
  const investments = sum(normalized.monthlyInvestments);
  const totalSpending = rent + utilities + groceries + gas + expenses + restaurants + purchases + gifts;
  const moneyLeft = income - savings - charity - totalSpending - investments;

  return {
    month,
    monthlyIncome,
    extraIncome,
    income,
    savings,
    charity,
    investments,
    rent,
    utilities,
    groceries,
    gas,
    expenses,
    restaurants,
    purchases,
    gifts,
    totalSpending,
    moneyLeft
  };
}

function historyRows() {
  return [
    { key: "monthlyIncome", label: "Income as monthly estimate" },
    { key: "extraIncome", label: "Extra income" },
    { key: "income", label: "Total income" },
    { key: "savings", label: "Savings" },
    { key: "charity", label: "Charity" },
    { key: "investments", label: "Investments" },
    { key: "rent", label: "Rent" },
    { key: "utilities", label: "Utilities" },
    { key: "groceries", label: "Groceries" },
    { key: "gas", label: "Gas" },
    { key: "expenses", label: "Other necessary expenses" },
    { key: "restaurants", label: "Restaurants" },
    { key: "purchases", label: "Purchases" },
    { key: "gifts", label: "Gifts" },
    { key: "totalSpending", label: "Total spending categories" },
    { key: "moneyLeft", label: "Money left for spending" }
  ];
}

function vacationCostBreakdown(trip) {
  const normalized = normalizeVacationBudget(trip);
  const totals = vacationCategories.reduce((summary, category) => {
    summary[category.key] = sum(normalized[category.key]);
    return summary;
  }, {});
  const totalSpent = Object.values(totals).reduce((total, value) => total + value, 0);

  return {
    ...normalized,
    ...totals,
    totalSpent,
    moneyLeft: (Number(normalized.tripBudget) || 0) - totalSpent
  };
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
  // Shows a readable list of the items entered in each category.
  container.innerHTML = categories.map((category) => {
    const filled = (budget[category.key] || []).filter((item) => item.name || item.amount);
    const list = filled.length ? filled.map((item) => `
      <div class="list-item">
        <span>${escapeHtml(item.name || `Unnamed ${category.item.toLowerCase()}`)}<small class="item-meta">${escapeHtml(itemMetaText(category, item))}</small></span>
        <strong>${money.format(Number(item.amount) || 0)}</strong>
      </div>
    `).join("") : `<div class="empty">Your ${emptyWord} for ${category.title.toLowerCase()} will appear here.</div>`;
    return `<h3>${category.title}</h3><div class="list">${list}</div>`;
  }).join("");
}

function itemMetaText(category, item) {
  const timing = item.recurring ? "Monthly" : "One-time";
  return item.merchant ? `${timing} · ${item.merchant}` : timing;
}

function calculateMonthly() {
  // Main monthly budget math: income minus savings, charity, categories, and investments.
  const budget = collectMonthlyBudget();
  const totalIncome = monthlyIncomeFrom(budget.monthlyIncome, budget.incomeFrequency) + budget.extraIncome;
  const saveAmount = totalIncome * (budget.savePercent / 100);
  const charityAmount = totalIncome * (budget.charityPercent / 100);
  const totals = {
    rent: sum(budget.rent),
    utilities: sum(budget.utilities),
    groceries: sum(budget.groceries),
    gas: sum(budget.gas),
    expenses: sum(budget.expenses),
    restaurants: sum(budget.restaurants),
    purchases: sum(budget.purchases),
    gifts: sum(budget.gifts),
    monthlyInvestments: sum(budget.monthlyInvestments)
  };
  const spendingLeft = totalIncome - saveAmount - charityAmount - totals.rent - totals.utilities - totals.groceries - totals.gas - totals.expenses - totals.restaurants - totals.purchases - totals.gifts - totals.monthlyInvestments;
  results.spendingLeft.textContent = money.format(spendingLeft);
  results.statusPill.textContent = spendingLeft < 0 ? "Over budget" : "Balanced";
  results.statusPill.classList.toggle("warning", spendingLeft < 0);
  renderSummary(monthlySummary, monthlyCategories, totals);
  monthlySummary.insertAdjacentHTML("afterbegin", `
    <div class="metric save"><span>Need to save</span><strong>${money.format(saveAmount)}</strong></div>
    <div class="metric give"><span>Charity</span><strong>${money.format(charityAmount)}</strong></div>
  `);
  renderBreakdown(monthlyBreakdown, monthlyCategories, budget, "items");
}

function calculateVacation() {
  // Adds up the selected trip and shows whether the trip is within its budget.
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
  // Estimates future investment value using the user's contribution schedule and return assumption.
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

function addCardSignal(signals, category, item) {
  // A "signal" is spending data the Credit Cards page can use for recommendations.
  const amount = Number(item.amount) || 0;
  if (!amount) return;

  signals.categoryTotals[category] = (signals.categoryTotals[category] || 0) + amount;

  const merchant = String(item.merchant || item.name || "").trim();
  if (!merchant) return;

  const merchantKey = merchant.toLowerCase();
  signals.merchantTotals[merchantKey] ||= { name: merchant, total: 0 };
  signals.merchantTotals[merchantKey].total += amount;
  signals.categoryMerchants[category] ||= {};
  signals.categoryMerchants[category][merchantKey] ||= { name: merchant, total: 0 };
  signals.categoryMerchants[category][merchantKey].total += amount;
}

function collectCardSignals() {
  // Looks across saved months and trips for categories that matter for card rewards.
  const signals = {
    categoryTotals: {},
    merchantTotals: {},
    categoryMerchants: {}
  };

  const monthlyCardCategories = [
    { key: "groceries", label: "Groceries" },
    { key: "gas", label: "Gas" },
    { key: "restaurants", label: "Restaurants" }
  ];
  const vacationCardCategories = [
    { key: "travel", label: "Airlines and travel" },
    { key: "hotels", label: "Hotels" },
    { key: "food", label: "Vacation food" }
  ];

  const budgets = getBudgets();
  const savedMonths = budgets[currentUser]?.months || {};
  Object.values(savedMonths).map(normalizeMonthlyBudget).forEach((budget) => {
    monthlyCardCategories.forEach((category) => {
      budget[category.key].forEach((item) => addCardSignal(signals, category.label, item));
    });
  });

  const vacations = getVacations();
  const savedTrips = vacations[currentUser]?.trips || {};
  Object.values(savedTrips).map(normalizeVacationBudget).forEach((trip) => {
    vacationCardCategories.forEach((category) => {
      trip[category.key].forEach((item) => addCardSignal(signals, category.label, item));
    });
  });

  return signals;
}

function sortedTotals(totals) {
  return Object.entries(totals).sort(([, a], [, b]) => b - a);
}

function sortedMerchantList(merchantMap = {}) {
  return Object.values(merchantMap).sort((a, b) => b.total - a.total);
}

function topMerchant(signals, category) {
  return sortedMerchantList(signals.categoryMerchants[category])[0];
}

function addRecommendation(recommendations, title, body, reason) {
  // Prevents the same recommendation from being shown twice.
  if (recommendations.some((recommendation) => recommendation.title === title)) return;
  recommendations.push({ title, body, reason });
}

function merchantIncludes(merchant, words) {
  // Checks whether a typed store/brand name contains any brand names from a list.
  const name = String(merchant?.name || "").toLowerCase();
  return words.some((word) => name.includes(word));
}

const cardBrandGroups = {
  // These lists are not card offers. They only help the app recognize common store, airline, and hotel names.
  warehouse: [
    "costco", "sam's club", "sams club", "sam's", "sams", "bj's", "bjs", "bj’s", "restaurant depot"
  ],
  bigBox: [
    "target", "walmart", "wal-mart", "meijer", "fred meyer", "super target", "supercenter"
  ],
  grocery: [
    "aldi", "albertsons", "bashas", "big y", "bi-lo", "bravo", "brookshire", "c-town", "central market",
    "cub", "dierbergs", "dillons", "fairway", "fareway", "food 4 less", "food city", "food lion",
    "foodtown", "fred meyer", "fresh market", "fry's", "frys", "giant", "giant eagle", "giant food",
    "hannaford", "harris teeter", "heb", "h-e-b", "hy-vee", "ingles", "jewel-osco", "king soopers",
    "kroger", "lidl", "lowes foods", "market basket", "martin's", "martins", "met food", "piggly wiggly",
    "price chopper", "publix", "raley's", "raleys", "randalls", "ralphs", "safeway", "save a lot",
    "schnucks", "shoprite", "smart & final", "smart and final", "sprouts", "stater bros", "stop & shop",
    "supervalu", "tom thumb", "tops", "trader joe", "trader joe's", "vons", "wegmans", "weiss", "whole foods",
    "winn-dixie", "winco"
  ],
  gas: [
    "76", "7-eleven", "7 eleven", "ampm", "arco", "bp", "casey's", "caseys", "chevron", "citgo", "circle k",
    "conoco", "costco", "cumberland farms", "exxon", "flying j", "getgo", "gulf", "hess", "kum & go",
    "kum and go", "kwik trip", "love's", "loves", "marathon", "mobil", "murphy", "pilot", "phillips 66",
    "quiktrip", "quicktrip", "racetrac", "raceway", "royal farms", "sheetz", "shell", "sinclair", "speedway",
    "sunoco", "texaco", "thorntons", "valero", "wawa"
  ],
  airline: [
    "aer lingus", "aero mexico", "aeromexico", "air canada", "air france", "air india", "air new zealand",
    "alaska", "allegiant", "american airlines", "american air", "ana", "avianca", "british airways",
    "cathay", "delta", "emirates", "etihad", "frontier", "hawaiian", "iberia", "jetblue", "klm",
    "korean air", "latam", "lufthansa", "qantas", "qatar", "sas", "singapore airlines", "southwest",
    "spirit", "sun country", "swiss", "tap air", "turkish airlines", "united", "virgin atlantic",
    "virgin australia", "westjet"
  ],
  hotel: [
    "accor", "airbnb", "aloft", "best western", "cambria", "canopy", "candlewood", "choice hotels",
    "comfort inn", "comfort suites", "conrad", "courtyard", "crowne plaza", "days inn", "doubletree",
    "drury", "embassy suites", "extended stay", "fairfield", "four seasons", "hampton", "hilton",
    "holiday inn", "home2", "homewood", "hotel indigo", "hyatt", "hyatt house", "hyatt place", "ihg",
    "intercontinental", "jw marriott", "la quinta", "marriott", "motel 6", "omni", "park hyatt",
    "quality inn", "radisson", "ramada", "red roof", "renaissance", "residence inn", "ritz-carlton",
    "sheraton", "sonesta", "springhill", "st. regis", "st regis", "staybridge", "super 8", "towneplace",
    "travelodge", "truhotel", "tru by hilton", "waldorf", "westin", "wingate", "world of hyatt",
    "wyndham"
  ]
};

const creditCardLibrary = [
  {
    name: "Chase Sapphire Preferred Card",
    issuer: "Chase",
    annualFee: "$95",
    rewardTags: ["travel", "restaurants", "gas", "grocery delivery"],
    brandTags: [],
    rewards: ["5x points on travel purchased through Chase Travel", "3x points on dining, gas stations, EV charging, select streaming, and online grocery purchases", "2x points on other travel", "1x point on other purchases"],
    benefits: ["Points can be used through Chase Ultimate Rewards", "Travel and purchase protections may apply", "No foreign transaction fees"],
    important: "Good to compare if travel and restaurants are major spending categories.",
    source: "https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred"
  },
  {
    name: "Chase Freedom Unlimited",
    issuer: "Chase",
    annualFee: "$0",
    rewardTags: ["flat cash back", "restaurants", "drugstores", "travel"],
    brandTags: [],
    rewards: ["5% cash back on travel purchased through Chase Travel", "3% cash back on dining and drugstore purchases", "1.5% cash back on other purchases"],
    benefits: ["Simple everyday rewards", "Can pair with some Chase travel cards for more redemption options"],
    important: "Useful to compare when spending is spread across many categories.",
    source: "https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited"
  },
  {
    name: "Chase Freedom Flex",
    issuer: "Chase",
    annualFee: "$0",
    rewardTags: ["rotating categories", "restaurants", "drugstores", "travel"],
    brandTags: [],
    rewards: ["5% cash back in rotating quarterly categories after activation, up to the quarterly limit", "5% cash back on travel purchased through Chase Travel", "3% cash back on dining and drugstores", "1% cash back on other purchases"],
    benefits: ["Strong when the quarterly categories match the user's spending", "No annual fee"],
    important: "Best for users willing to track changing bonus categories.",
    source: "https://creditcards.chase.com/cash-back-credit-cards/freedom/flex"
  },
  {
    name: "American Express Gold Card",
    issuer: "American Express",
    annualFee: "$325",
    rewardTags: ["restaurants", "groceries", "flights"],
    brandTags: [],
    rewards: ["4x Membership Rewards points at restaurants", "4x points at U.S. supermarkets up to the annual cap, then 1x", "3x points on flights booked with airlines or Amex Travel", "1x point on other purchases"],
    benefits: ["Dining and Uber credits may offset part of the annual fee if used", "Strong food-focused rewards"],
    important: "Compare only if restaurant and U.S. supermarket spending is high enough to justify the annual fee.",
    source: "https://www.americanexpress.com/us/credit-cards/card/gold-card/"
  },
  {
    name: "Blue Cash Preferred Card from American Express",
    issuer: "American Express",
    annualFee: "$95",
    rewardTags: ["groceries", "gas", "transit", "streaming"],
    brandTags: [],
    rewards: ["6% cash back at U.S. supermarkets up to the annual cap, then 1%", "6% cash back on select U.S. streaming subscriptions", "3% cash back at U.S. gas stations and on transit", "1% cash back on other purchases"],
    benefits: ["High supermarket rewards for families or frequent grocery shoppers", "Statement credit style cash back"],
    important: "Check the grocery cap and whether your stores count as U.S. supermarkets.",
    source: "https://www.americanexpress.com/us/credit-cards/card/blue-cash-preferred/"
  },
  {
    name: "Citi Double Cash Card",
    issuer: "Citi",
    annualFee: "$0",
    rewardTags: ["flat cash back"],
    brandTags: [],
    rewards: ["Earns up to 2% cash back: 1% when you buy and 1% as you pay"],
    benefits: ["Simple rewards without category tracking", "Good baseline card to compare against category cards"],
    important: "A strong comparison card when spending is mixed across many places.",
    source: "https://www.citi.com/credit-cards/citi-double-cash-credit-card"
  },
  {
    name: "Wells Fargo Active Cash Card",
    issuer: "Wells Fargo",
    annualFee: "$0",
    rewardTags: ["flat cash back"],
    brandTags: [],
    rewards: ["Unlimited 2% cash rewards on purchases"],
    benefits: ["Simple flat rewards", "Cell phone protection may apply when paying the phone bill with the card"],
    important: "Useful to compare as a no-annual-fee everyday spending card.",
    source: "https://creditcards.wellsfargo.com/active-cash-credit-card/"
  },
  {
    name: "Capital One Savor Cash Rewards Credit Card",
    issuer: "Capital One",
    annualFee: "$0",
    rewardTags: ["restaurants", "groceries", "entertainment", "streaming"],
    brandTags: [],
    rewards: ["3% cash back on dining, entertainment, popular streaming services, and grocery stores", "1% cash back on other purchases"],
    benefits: ["No annual fee", "Good for dining and entertainment-heavy spending"],
    important: "Grocery rewards usually exclude superstores like Walmart and Target, so check your main stores.",
    source: "https://www.capitalone.com/credit-cards/savor/"
  },
  {
    name: "Capital One Venture Rewards Credit Card",
    issuer: "Capital One",
    annualFee: "$95",
    rewardTags: ["travel", "flat miles"],
    brandTags: [],
    rewards: ["2x miles on every purchase", "5x miles on hotels, vacation rentals, and rental cars booked through Capital One Travel"],
    benefits: ["Global Entry or TSA PreCheck credit may apply", "No foreign transaction fees"],
    important: "Good to compare when travel matters but spending is spread across many categories.",
    source: "https://www.capitalone.com/credit-cards/venture/"
  },
  {
    name: "Discover it Cash Back",
    issuer: "Discover",
    annualFee: "$0",
    rewardTags: ["rotating categories"],
    brandTags: [],
    rewards: ["5% cash back in rotating categories after activation, up to the quarterly limit", "1% cash back on other purchases"],
    benefits: ["Discover Cashback Match for new cardmembers may apply", "No annual fee"],
    important: "Best for users willing to activate and track quarterly categories.",
    source: "https://www.discover.com/credit-cards/cash-back/it-card.html"
  },
  {
    name: "Costco Anywhere Visa Card by Citi",
    issuer: "Citi",
    annualFee: "$0 with paid Costco membership",
    rewardTags: ["gas", "travel", "restaurants", "warehouse"],
    brandTags: ["costco"],
    rewards: ["4% cash back on eligible gas and EV charging up to the annual cap, then 1%", "3% cash back on restaurants and eligible travel", "2% cash back at Costco and Costco.com", "1% cash back on other purchases"],
    benefits: ["Designed for Costco members", "Useful when Costco gas or warehouse spending is high"],
    important: "Requires a Costco membership and rewards are tied to Costco's certificate process.",
    source: "https://www.citi.com/credit-cards/citi-costco-anywhere-visa-credit-card"
  },
  {
    name: "Target Circle Card Credit Card",
    issuer: "Target",
    annualFee: "$0",
    rewardTags: ["target", "big box"],
    brandTags: ["target"],
    rewards: ["5% discount at Target and Target.com on eligible purchases"],
    benefits: ["Extra return time and shipping benefits may apply", "Simple store-specific savings"],
    important: "Only makes sense if Target is a frequent shopping place.",
    source: "https://www.target.com/circlecard"
  },
  {
    name: "Southwest Rapid Rewards Plus Credit Card",
    issuer: "Chase",
    annualFee: "$99",
    rewardTags: ["airline", "travel"],
    brandTags: ["southwest"],
    rewards: ["Rewards on Southwest purchases", "Rewards on select everyday and travel categories"],
    benefits: ["Anniversary points", "Companion Pass qualifying points may apply"],
    important: "Compare when Southwest is one of your most-used airlines.",
    source: "https://creditcards.chase.com/travel-credit-cards/southwest/plus"
  },
  {
    name: "United Explorer Card",
    issuer: "Chase",
    annualFee: "$150",
    rewardTags: ["airline", "travel", "restaurants", "hotels"],
    brandTags: ["united"],
    rewards: ["Rewards on United purchases", "Rewards on dining and hotel stays", "1x mile on other purchases"],
    benefits: ["First checked bag free may apply", "Priority boarding and United Club one-time passes may apply"],
    important: "Compare when United is a frequent airline for the user.",
    source: "https://creditcards.chase.com/travel-credit-cards/united/united-explorer"
  },
  {
    name: "Marriott Bonvoy Boundless Credit Card",
    issuer: "Chase",
    annualFee: "$95",
    rewardTags: ["hotels", "gas", "groceries", "restaurants"],
    brandTags: ["marriott", "sheraton", "westin", "ritz-carlton", "st. regis", "courtyard", "fairfield", "residence inn"],
    rewards: ["Rewards at Marriott Bonvoy hotels", "Bonus rewards in select everyday categories", "Rewards on other purchases"],
    benefits: ["Free Night Award may apply each account anniversary", "Marriott Bonvoy elite night credits may apply"],
    important: "Compare when Marriott-family hotels appear often in trip spending.",
    source: "https://creditcards.chase.com/travel-credit-cards/marriott-bonvoy/boundless"
  },
  {
    name: "Hilton Honors American Express Surpass Card",
    issuer: "American Express",
    annualFee: "$150",
    rewardTags: ["hotels", "restaurants", "groceries", "gas"],
    brandTags: ["hilton", "hampton", "doubletree", "embassy suites", "homewood", "waldorf", "conrad"],
    rewards: ["High Hilton Honors points at Hilton properties", "Bonus points at U.S. restaurants, U.S. supermarkets, and U.S. gas stations", "Points on other purchases"],
    benefits: ["Hilton Honors Gold status may apply", "Hilton statement credits and Free Night Reward opportunities may apply"],
    important: "Compare when Hilton-family hotels appear often and benefits offset the annual fee.",
    source: "https://www.americanexpress.com/us/credit-cards/card/hilton-honors-surpass/"
  },
  {
    name: "World of Hyatt Credit Card",
    issuer: "Chase",
    annualFee: "$95",
    rewardTags: ["hotels", "restaurants", "airline", "transit", "fitness"],
    brandTags: ["hyatt", "hyatt place", "hyatt house", "park hyatt", "world of hyatt"],
    rewards: ["Rewards at Hyatt hotels", "Bonus rewards in dining, airline tickets purchased directly, local transit, commuting, and fitness clubs", "Rewards on other purchases"],
    benefits: ["Annual Free Night Award may apply", "World of Hyatt status and elite night credits may apply"],
    important: "Compare when Hyatt-family hotels appear often in vacation spending.",
    source: "https://creditcards.chase.com/travel-credit-cards/world-of-hyatt-credit-card"
  }
];

function buildCreditCardRecommendations(signals) {
  // Turns spending signals into general card types worth comparing.
  // The app says "compare" because card terms, fees, and approval rules can change.
  const recommendations = [];
  const topGrocer = topMerchant(signals, "Groceries");
  const topGas = topMerchant(signals, "Gas");
  const topRestaurant = topMerchant(signals, "Restaurants");
  const topTravel = topMerchant(signals, "Airlines and travel");
  const topHotel = topMerchant(signals, "Hotels");
  const categoryTotals = signals.categoryTotals;

  if (merchantIncludes(topGrocer, cardBrandGroups.warehouse) || merchantIncludes(topGas, cardBrandGroups.warehouse)) {
    addRecommendation(
      recommendations,
      "Compare warehouse club cards",
      "A warehouse club shows up as a top store or gas station, so compare that store's card with cards that earn well at warehouse clubs and gas stations.",
      `Best signal: ${(topGrocer?.name || topGas?.name || "Warehouse club")}`
    );
  }

  if (merchantIncludes(topGrocer, ["target"])) {
    addRecommendation(
      recommendations,
      "Compare Target-focused cards",
      "Target is one of the strongest grocery or household spending signals, so a Target card could be useful if most of those purchases happen there.",
      `Best signal: ${topGrocer.name}`
    );
  }

  if (merchantIncludes(topGrocer, cardBrandGroups.bigBox)) {
    addRecommendation(
      recommendations,
      "Compare big-box store cards",
      "A lot of grocery-style spending is happening at a store like Target, Walmart, or Meijer, so compare that store's card with general grocery and flat cash-back cards.",
      `Best signal: ${topGrocer.name}`
    );
  }

  if (merchantIncludes(topGrocer, cardBrandGroups.grocery)) {
    addRecommendation(
      recommendations,
      "Compare supermarket rewards cards",
      "A grocery chain appears often, so compare grocery rewards cards and check whether that store counts as a supermarket for the card.",
      `Best signal: ${topGrocer.name}`
    );
  }

  if (merchantIncludes(topGas, cardBrandGroups.gas)) {
    addRecommendation(
      recommendations,
      "Compare gas rewards cards",
      "One gas station brand appears often, so compare that station's card with a general gas rewards card.",
      `Best signal: ${topGas.name}`
    );
  }

  if (merchantIncludes(topTravel, ["southwest"])) {
    addRecommendation(
      recommendations,
      "Compare Southwest travel cards",
      "Southwest appears in travel spending, so a Southwest card may be worth comparing with a flexible travel card.",
      `Best signal: ${topTravel.name}`
    );
  }

  if (merchantIncludes(topTravel, cardBrandGroups.airline)) {
    addRecommendation(
      recommendations,
      "Compare airline cards",
      "One airline appears often, so compare that airline's card with a flexible travel card before deciding.",
      `Best signal: ${topTravel.name}`
    );
  }

  if (merchantIncludes(topHotel, cardBrandGroups.hotel)) {
    addRecommendation(
      recommendations,
      "Compare hotel cards",
      "One hotel brand appears often, so a hotel card for that brand may be worth comparing with a flexible travel card.",
      `Best signal: ${topHotel.name}`
    );
  }

  if ((categoryTotals.Restaurants || 0) > 0) {
    addRecommendation(
      recommendations,
      "Compare dining rewards cards",
      "Restaurant spending is tracked separately, so a card with strong dining rewards could match this spending pattern.",
      `Tracked restaurants: ${money.format(categoryTotals.Restaurants || 0)}`
    );
  }

  if ((categoryTotals.Groceries || 0) > 0) {
    addRecommendation(
      recommendations,
      "Compare grocery rewards cards",
      "Groceries are a repeating category in the tracker, so a grocery rewards card could be useful if the rewards beat a simple cash-back card.",
      `Tracked groceries: ${money.format(categoryTotals.Groceries || 0)}`
    );
  }

  if (!recommendations.length || sortedTotals(categoryTotals).length >= 4) {
    addRecommendation(
      recommendations,
      "Compare flat cash-back cards",
      "When spending is spread across many places, a simple flat cash-back card can be easier than chasing a different card for every category.",
      "Best for mixed spending"
    );
  }

  return recommendations.slice(0, 6);
}

function cardMatchesMerchant(card, merchantEntries) {
  return card.brandTags.some((brand) => (
    merchantEntries.some((merchant) => merchant.name.toLowerCase().includes(brand))
  ));
}

function scoreCreditCard(card, signals) {
  const categoryTotals = signals.categoryTotals;
  const merchantEntries = sortedMerchantList(signals.merchantTotals);
  let score = 0;

  if (cardMatchesMerchant(card, merchantEntries)) score += 10;
  if ((categoryTotals.Groceries || 0) && card.rewardTags.includes("groceries")) score += 4;
  if ((categoryTotals.Gas || 0) && card.rewardTags.includes("gas")) score += 4;
  if ((categoryTotals.Restaurants || 0) && card.rewardTags.includes("restaurants")) score += 4;
  if ((categoryTotals["Airlines and travel"] || 0) && (card.rewardTags.includes("travel") || card.rewardTags.includes("airline"))) score += 4;
  if ((categoryTotals.Hotels || 0) && card.rewardTags.includes("hotels")) score += 4;
  if (sortedTotals(categoryTotals).length >= 4 && (card.rewardTags.includes("flat cash back") || card.rewardTags.includes("flat miles"))) score += 3;
  if (!Object.keys(categoryTotals).length && card.annualFee === "$0") score += 1;

  return score;
}

function buildSpecificCardMatches(signals) {
  // Scores every card, then shows the strongest matches first.
  return creditCardLibrary
    .map((card) => ({ ...card, score: scoreCreditCard(card, signals) }))
    .filter((card) => card.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 8);
}

function renderCardDetail(card) {
  const rewards = card.rewards.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const benefits = card.benefits.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `
    <article class="credit-card-detail">
      <div>
        <span>${escapeHtml(card.issuer)} - annual fee: ${escapeHtml(card.annualFee)}</span>
        <h4>${escapeHtml(card.name)}</h4>
        <p>${escapeHtml(card.important)}</p>
      </div>
      <div class="card-detail-columns">
        <div>
          <strong>Rewards</strong>
          <ul>${rewards}</ul>
        </div>
        <div>
          <strong>Benefits</strong>
          <ul>${benefits}</ul>
        </div>
      </div>
      <a href="${escapeHtml(card.source)}" target="_blank" rel="noopener">Check current terms</a>
    </article>
  `;
}

function renderCreditCardGuide() {
  // Saves the latest inputs, collects signals, then displays credit card comparison ideas.
  if (!currentUser) return;
  saveMonthlyBudget();
  saveVacationBudget();

  const signals = collectCardSignals();
  const categoryEntries = sortedTotals(signals.categoryTotals);
  const merchantEntries = sortedMerchantList(signals.merchantTotals);
  const trackedTotal = categoryEntries.reduce((total, [, value]) => total + value, 0);
  const topCategory = categoryEntries[0];
  const topStore = merchantEntries[0];

  cardSignalSummary.innerHTML = `
    <div class="metric invested"><span>Tracked card spending</span><strong>${money.format(trackedTotal)}</strong></div>
    <div class="metric save"><span>Top category</span><strong>${topCategory ? escapeHtml(topCategory[0]) : "None yet"}</strong></div>
    <div class="metric growth"><span>Top merchant</span><strong>${topStore ? escapeHtml(topStore.name) : "Add store names"}</strong></div>
  `;

  const matchedCards = buildSpecificCardMatches(signals);
  const generalRecommendations = buildCreditCardRecommendations(signals);
  cardRecommendations.innerHTML = matchedCards.length ? matchedCards.map((card) => renderCardDetail(card)).join("") : generalRecommendations.map((recommendation) => `
    <div class="recommendation-card">
      <span>${escapeHtml(recommendation.reason)}</span>
      <h4>${escapeHtml(recommendation.title)}</h4>
      <p>${escapeHtml(recommendation.body)}</p>
    </div>
  `).join("");

  cardLibrary.innerHTML = creditCardLibrary.map((card) => renderCardDetail(card)).join("");

  if (!trackedTotal) {
    merchantBreakdown.innerHTML = '<div class="empty">Add store or brand names in groceries, gas, restaurants, vacation travel, or hotels to see card suggestions.</div>';
    return;
  }

  const merchantRows = categoryEntries.map(([category, total]) => {
    const merchants = sortedMerchantList(signals.categoryMerchants[category]).slice(0, 3);
    const merchantText = merchants.length
      ? merchants.map((merchant) => `${escapeHtml(merchant.name)} (${money.format(merchant.total)})`).join(", ")
      : "No store or brand names yet";
    return `
      <tr>
        <td>${escapeHtml(category)}</td>
        <td>${money.format(total)}</td>
        <td>${merchantText}</td>
      </tr>
    `;
  }).join("");

  merchantBreakdown.innerHTML = `
    <div class="history-table-wrap">
      <table class="history-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Total</th>
            <th>Top places</th>
          </tr>
        </thead>
        <tbody>${merchantRows}</tbody>
      </table>
    </div>
  `;
}

const helperAnswers = [
  {
    title: "Monthly budget",
    keywords: ["start", "monthly", "budget", "income", "paycheck", "weekly", "biweekly", "every two weeks"],
    answer: "Start on the Monthly page. Enter your income amount, choose whether you get paid monthly, weekly, or every 2 weeks, then add extra income if you have any. LoviesLedger turns that into a monthly estimate and updates the money-left number automatically."
  },
  {
    title: "Savings and charity",
    keywords: ["save", "savings", "saving", "charity", "donate", "tzedakah", "percent", "percentage"],
    answer: "Savings and charity are percentage goals based on your total monthly income. For example, if your monthly income is $4,000 and savings is 20%, the app shows $800 for savings before calculating spending money left."
  },
  {
    title: "Expenses",
    keywords: ["expense", "expenses", "rent", "mortgage", "utilities", "grocery", "groceries", "gas", "bill", "bills", "necessary"],
    answer: "Expenses are necessary purchases only. Use them for rent, mortgage, utilities, groceries, gas, insurance, medical bills, childcare, and similar essentials. Keeping these separate helps the app understand your real spending habits."
  },
  {
    title: "Purchases and gifts",
    keywords: ["purchase", "purchases", "shopping", "clothes", "shoes", "restaurant", "restaurants", "gift", "gifts"],
    answer: "Purchases are flexible spending like clothes, shoes, electronics, restaurants, or personal items. Gifts are separate so birthdays, holidays, and presents do not get mixed into normal purchases."
  },
  {
    title: "Recurring monthly items",
    keywords: ["recurring", "repeat", "monthly purchase", "every month", "subscription", "one time", "one-time"],
    answer: "Mark an item as Monthly if it repeats every month. When you start the next month, recurring monthly items copy forward automatically, while one-time purchases do not."
  },
  {
    title: "Vacation budgets",
    keywords: ["vacation", "trip", "travel", "flight", "airline", "hotel", "museum", "activity", "taxi", "uber"],
    answer: "Use the Vacation page for trips. It separates travel, hotels, food, activities, and other trip costs. Each trip is saved, so the Summary page can show previous vacations and total trip costs."
  },
  {
    title: "Investments",
    keywords: ["investment", "invest", "index", "fund", "compound", "interest", "return", "stock", "etf", "voo", "vti", "spy"],
    answer: "The Investments page is for index funds. Enter what you already have, how much you add, how often you add it, and the assumed annual return. The default 7.5% is only a long-term estimate, not a guarantee."
  },
  {
    title: "Credit cards",
    keywords: ["credit", "card", "cash back", "points", "miles", "rewards", "costco", "target", "southwest", "hotel", "airline"],
    answer: "The Credit Cards page looks at spending categories and merchant names like Costco, Target, Southwest, Hilton, groceries, gas, and restaurants. It suggests cards to research, but you should check current fees, rewards, interest rates, and terms before applying."
  },
  {
    title: "Summary page",
    keywords: ["summary", "history", "previous", "last month", "total", "year", "all months", "past"],
    answer: "The Summary page adds up saved months. It shows income, extra income, savings, charity, investments, expenses, purchases, gifts, money left, and vacation history."
  },
  {
    title: "Privacy",
    keywords: ["private", "privacy", "secure", "safe", "password", "data", "localstorage", "github"],
    answer: "This no-hosting version saves data in this browser with localStorage. Do not put real bank passwords, secret API keys, or private banking information into public GitHub files."
  },
  {
    title: "Financial advice",
    keywords: ["advice", "guarantee", "guaranteed", "risk", "should i buy", "which stock", "recommend stock"],
    answer: "I can explain how the app works, but I cannot guarantee returns or give personalized financial advice. Investment projections and credit card suggestions are educational estimates only."
  }
];

function getHelperChatKey() {
  return `${storageKeys.helperChats}.${currentUser || "guest"}`;
}

function getHelperHistory() {
  return readJson(getHelperChatKey(), []);
}

function saveHelperHistory(history) {
  writeJson(getHelperChatKey(), history.slice(-40));
}

function helperBotReply(message) {
  // This is the no-hosting helper brain. Later, this function can call a hosted AI API instead.
  const text = message.toLowerCase();
  const scoredAnswers = helperAnswers.map((entry) => ({
    ...entry,
    score: entry.keywords.reduce((total, keyword) => total + (text.includes(keyword) ? 1 : 0), 0)
  })).sort((a, b) => b.score - a.score);
  const best = scoredAnswers[0];

  if (best?.score > 0) {
    return best.answer;
  }

  return "I can help with monthly budgets, expenses, recurring purchases, vacations, investments, summaries, credit cards, and privacy. Try asking: \"How do recurring purchases work?\" or \"What counts as expenses?\"";
}

function renderHelperMessages() {
  const history = getHelperHistory();
  const starter = [{
    sender: "bot",
    text: "Hi, I’m the LoviesLedger helper. Ask me how to use the budget, vacation, investment, summary, or credit card pages."
  }];
  const messages = history.length ? history : starter;

  helperMessages.innerHTML = messages.map((message) => `
    <div class="helper-message ${message.sender === "user" ? "from-user" : "from-bot"}">
      ${escapeHtml(message.text)}
    </div>
  `).join("");
  helperMessages.scrollTop = helperMessages.scrollHeight;
}

function addHelperMessage(sender, text) {
  const history = getHelperHistory();
  history.push({ sender, text, time: new Date().toISOString() });
  saveHelperHistory(history);
  renderHelperMessages();
}

function openHelper() {
  helperPanel.classList.add("active");
  helperToggle.setAttribute("aria-expanded", "true");
  renderHelperMessages();
  helperInput.focus();
}

function closeHelper() {
  helperPanel.classList.remove("active");
  helperToggle.setAttribute("aria-expanded", "false");
}

function renderHistorySummary() {
  // Builds the Summary page table from every saved monthly budget.
  if (!currentUser) return;
  saveMonthlyBudget();
  saveVacationBudget();

  const budgets = getBudgets();
  const userBudget = budgets[currentUser]?.months ? budgets[currentUser] : ensureUserBudget(budgets, currentUser);
  const months = Object.keys(userBudget.months).sort();
  const rollups = months.map((month) => monthlyRollup(month, userBudget.months[month]));
  const rows = historyRows();

  if (!rollups.length) {
    historySummary.innerHTML = "";
    historyTableWrap.innerHTML = '<div class="empty">Saved monthly totals will appear here after you add a month.</div>';
  } else {
    const totals = rows.reduce((summary, row) => {
      summary[row.key] = rollups.reduce((total, month) => total + month[row.key], 0);
      return summary;
    }, {});

    historySummary.innerHTML = `
      <div class="metric invested"><span>Total income</span><strong>${money.format(totals.income)}</strong></div>
      <div class="metric save"><span>Total savings</span><strong>${money.format(totals.savings)}</strong></div>
      <div class="metric give"><span>Total charity</span><strong>${money.format(totals.charity)}</strong></div>
      <div class="metric monthly-investments"><span>Total investments</span><strong>${money.format(totals.investments)}</strong></div>
    `;

    const headerCells = rollups.map((rollup) => `<th>${monthLabel(rollup.month)}</th>`).join("");
    const bodyRows = rows.map((row) => {
      const monthCells = rollups.map((rollup) => `<td>${money.format(rollup[row.key])}</td>`).join("");
      return `
        <tr>
          <td>${row.label}</td>
          ${monthCells}
          <td>${money.format(totals[row.key])}</td>
        </tr>
      `;
    }).join("");

    historyTableWrap.innerHTML = `
      <div class="history-table-wrap">
        <table class="history-table">
          <thead>
            <tr>
              <th>Category</th>
              ${headerCells}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
            <tr class="history-total-row">
              <td>Number of saved months</td>
              ${rollups.map(() => "<td>1</td>").join("")}
              <td>${rollups.length}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  renderVacationHistorySummary();
}

function renderVacationHistorySummary() {
  // Builds the vacation history table from every saved trip.
  const vacations = getVacations();
  const account = vacations[currentUser]?.trips ? vacations[currentUser] : ensureVacationAccount(vacations, currentUser);
  const trips = Object.values(account.trips)
    .map(vacationCostBreakdown)
    .filter((trip) => trip.tripName || trip.tripBudget || trip.totalSpent)
    .sort((a, b) => String(a.tripMonth).localeCompare(String(b.tripMonth)));

  if (!trips.length) {
    vacationHistoryWrap.innerHTML = '<div class="empty">Saved vacation totals will appear here after you add a trip.</div>';
    return;
  }

  const totals = vacationCategories.reduce((summary, category) => {
    summary[category.key] = trips.reduce((total, trip) => total + trip[category.key], 0);
    return summary;
  }, {});
  const totalSpent = trips.reduce((total, trip) => total + trip.totalSpent, 0);
  const totalBudget = trips.reduce((total, trip) => total + (Number(trip.tripBudget) || 0), 0);

  const rows = trips.map((trip) => `
    <tr>
      <td>${escapeHtml(trip.tripName || "Unnamed trip")}</td>
      <td>${monthLabel(trip.tripMonth)}</td>
      <td>${money.format(trip.travel)}</td>
      <td>${money.format(trip.hotels)}</td>
      <td>${money.format(trip.food)}</td>
      <td>${money.format(trip.activities)}</td>
      <td>${money.format(trip.other)}</td>
      <td>${money.format(trip.totalSpent)}</td>
      <td>${money.format(Number(trip.tripBudget) || 0)}</td>
      <td>${money.format(trip.moneyLeft)}</td>
    </tr>
  `).join("");

  vacationHistoryWrap.innerHTML = `
    <div class="history-table-wrap">
      <table class="history-table">
        <thead>
          <tr>
            <th>Vacation</th>
            <th>Month</th>
            <th>Travel</th>
            <th>Hotels</th>
            <th>Food</th>
            <th>Activities</th>
            <th>Other</th>
            <th>Total spent</th>
            <th>Budget</th>
            <th>Left</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="history-total-row">
            <td>All vacations</td>
            <td>${trips.length}</td>
            <td>${money.format(totals.travel)}</td>
            <td>${money.format(totals.hotels)}</td>
            <td>${money.format(totals.food)}</td>
            <td>${money.format(totals.activities)}</td>
            <td>${money.format(totals.other)}</td>
            <td>${money.format(totalSpent)}</td>
            <td>${money.format(totalBudget)}</td>
            <td>${money.format(totalBudget - totalSpent)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

async function refreshMarketInfo() {
  // Loads public market prices for typed ticker symbols. If the request fails, public links are still shown.
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
  // Resets a page back to one empty row per category.
  categories.forEach((category) => {
    document.querySelector(`#${type}-${category.key}-rows`).innerHTML = "";
    makeRow(type, category, { recurring: type === "monthly" ? category.recurringDefault : false });
  });
}

renderCategoryInputs(monthlyInputs, monthlyCategories, "monthly");
renderCategoryInputs(vacationInputs, vacationCategories, "vacation");

// Event listeners connect user actions, like clicks and typing, to the functions above.
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
summaryNav.addEventListener("click", () => showPage("summary"));
creditCardsNav.addEventListener("click", () => showPage("creditCards"));
refreshSummaryButton.addEventListener("click", renderHistorySummary);
refreshCardsButton.addEventListener("click", renderCreditCardGuide);
helperToggle.addEventListener("click", () => {
  if (helperPanel.classList.contains("active")) {
    closeHelper();
  } else {
    openHelper();
  }
});
helperClose.addEventListener("click", closeHelper);
helperForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = helperInput.value.trim();
  if (!question) return;
  helperInput.value = "";
  addHelperMessage("user", question);
  addHelperMessage("bot", helperBotReply(question));
});
document.querySelectorAll("[data-helper-question]").forEach((button) => {
  button.addEventListener("click", () => {
    const question = button.dataset.helperQuestion;
    addHelperMessage("user", question);
    addHelperMessage("bot", helperBotReply(question));
  });
});

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
  fields.incomeFrequency.value = "monthly";
  fields.extraIncome.value = "";
  fields.savePercent.value = "";
  fields.charityPercent.value = "";
  clearRows("monthly", monthlyCategories);
  saveAll();
});

clearVacationButton.addEventListener("click", () => {
  fields.tripName.value = "";
  fields.tripMonth.value = monthKey(new Date());
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
