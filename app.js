import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { addDoc, updateDoc, setDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { setupDatePickers } from "./date-picker.js?v=4";
import { personalInsights, monthContributions, canEditRun, localDate } from "./insights.js?v=11";

import { monthWeeks } from "./weeks.js";

import { renderRunOverview } from "./run-overview.js?v=6";

import { installmentKey, paymentInstallments, memberPaymentBalance, renderPaymentTable } from "./payment-ledger.js?v=2";

import { renderWeeklyOverview } from "./weekly-overview.js?v=1";

import { creditedDistance, distanceBreakdown, originalRegistrationDate, registrationDate } from "./run-distance.js?v=3";

import { comparisonRows } from "./chart-display.js?v=2";

import { renderPrizes } from "./prizes.js?v=3";

import { setupNavigation } from "./navigation.js?v=1";

import { renderRecentActivity } from "./dashboard-activity.js?v=6";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (id) => document.getElementById(id);
const state = { user: null, member: null, isAdmin: false, members: [], runs: [], unsubscribe: [] };
state.payments = new Map();
state.paymentItems = new Map();
state.paymentItemsReady = false;
state.paymentItemsFailed = false;
state.paymentsReady = false;
state.paymentsFailed = false;
const pendingPayments = new Map();
const isAdminLogin = /\/admin(?:\/index\.html)?\/?$/.test(location.pathname);
$("memberLoginPanel").classList.toggle("hidden", isAdminLogin);
$("adminLoginPanel").classList.toggle("hidden", !isAdminLogin);
const navigation = setupNavigation({isAdminLogin});
const openedRunMembers = new Set();
const selectedWeeks = new Map();
let editingRunId = null;
let savingRun = false;
const km = (value) => Number(value).toLocaleString("sk", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const editable = (run) => canEditRun(run, state.user?.uid, state.member?.id, state.isAdmin);
const monthValue = () => $("monthInput").value;
const dateInMonth = (date, month) => date.startsWith(`${month}-`);
const money = (value) => `${value.toFixed(2).replace(".", ",")} €`;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const initials = (name) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
const memberPhoto = (member) => member.nick ? `./assets/members/${encodeURIComponent(member.nick)}.svg` : "";

function runsFor(memberId, month) {
  return state.runs.filter((run) => run.memberId === memberId && dateInMonth(run.date, month));
}

const paymentsAvailable = () => state.paymentsReady && !state.paymentsFailed && state.paymentItemsReady && !state.paymentItemsFailed;
function renderPayment(member, month) {
  if (!paymentsAvailable()) return '<div class="payment-status payment-unknown">Stav platieb nedostupn&#253;</div>';
  const row = monthContributions([member], state.runs, month).rows[0];
  const balance = memberPaymentBalance(row,month,state.paymentItems,state.payments.get(`${month}_${member.id}`),pendingPayments);
  const text = balance.remaining === 0 ? 'Zaplaten&#233;' : balance.paid > 0 ? `Zost&#225;va ${money(balance.remaining)}` : 'Nezaplaten&#233;';
  return `<div class="payment-status ${balance.remaining === 0 ? 'paid' : 'unpaid'}"><span class="payment-dot" aria-hidden="true"></span>${text}</div>`;
}

document.addEventListener("change", async (event) => {
  const checkbox = event.target.closest(".installment-checkbox");
  if (!checkbox || !state.isAdmin || !paymentsAvailable()) return;
  const {memberId, month, itemId} = checkbox.dataset;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return;
  const member = state.members.find(member => member.id === memberId);
  if (!member) return;
  const row = monthContributions([member], state.runs, month).rows[0];
  const item = paymentInstallments(row).find(item => item.itemId === itemId);
  if (!item || !item.closed || item.amount <= 0) return;
  const key = installmentKey(memberId, month, itemId);
  if (pendingPayments.has(key)) return;
  const userId = state.user.uid;
  const data = {memberId, month, itemId, amount:item.amount, paid:checkbox.checked, updatedBy:userId, updatedAt:serverTimestamp()};
  pendingPayments.set(key, data);
  $("paymentError").textContent = "";
  render();
  try {
    await setDoc(doc(db, "paymentItems", key), data);
  } catch (error) {
    if (state.user?.uid === userId) $("paymentError").textContent = "Platbu sa nepodarilo uložiť. Skús to znova.";
    console.error(error);
  } finally {
    pendingPayments.delete(key);
    if (state.user?.uid === userId) render();
  }
});

function render() {
  const month = monthValue();
  const { rows, weeks } = monthContributions(state.members, state.runs, month);
  renderPersonalOverview(month);
  $("chartMonthLabel").textContent = month;
  const chartRows = comparisonRows(rows);
  const maxDistance = Math.max(...chartRows.map(row => row.distance), 0);
  $("distanceChart").innerHTML = chartRows.length ? chartRows.map((row) => {
    const distance = row.distance;
    const width = maxDistance ? Math.max((distance / maxDistance) * 100, distance ? 3 : 0) : 0;
    const photo = memberPhoto(row.member);
    return `<div class="chart-row"><span class="chart-name">${escapeHtml(row.member.name)}</span><div class="chart-track"><div class="chart-bar" style="width:${width}%"><span class="chart-avatar"><span>${escapeHtml(initials(row.member.name))}</span>${photo ? `<img src="${photo}" alt="${escapeHtml(row.member.name)}" onerror="this.remove()">` : ""}</span></div></div><strong class="chart-value">${km(distance)} km</strong></div>`;
  }).join("") : "<p class=\"muted\">Najprv pridajte členov.</p>";
  const selectableMembers = state.isAdmin ? state.members : state.members.filter((member) => member.id === state.member?.id);
  const previousMember = $("memberSelect").value;
  $("memberSelect").innerHTML = selectableMembers.map((member) => `<option value="${member.id}">${escapeHtml(member.name)}</option>`).join("");
  if (selectableMembers.some((member) => member.id === previousMember)) $("memberSelect").value = previousMember;
  $("memberSelect").disabled = !state.isAdmin || !!editingRunId;
  $("weeklyTable").innerHTML = renderWeeklyOverview(rows,weeks,month,{selected:selectedWeeks.get(month),memberPhoto});
  $("paymentLedgerTable").innerHTML = renderPaymentTable(rows, weeks, month, {records:state.paymentItems, legacyRecords:state.payments, pending:pendingPayments, ready:paymentsAvailable(), isAdmin:state.isAdmin});
  $("monthlyTable").innerHTML = renderRunOverview(rows, month, { renderPayment, editable, opened: openedRunMembers, memberPhoto });
  $("membersList").innerHTML = state.members.map((member) => `<div class="member-row"><span><strong>${escapeHtml(member.name)}</strong><small class="member-nick">@${escapeHtml(member.nick || "bez nicku")}</small></span><button class="button danger delete-member" data-id="${member.id}" aria-label="Odstrániť člena ${escapeHtml(member.name)}">Odstrániť</button></div>`).join("");
}

function renderPersonalOverview(month) {
  const contribution = monthContributions(state.members, state.runs, month);
  $("monthlyPrizes").innerHTML = renderPrizes(contribution.pool, comparisonRows(contribution.rows));
  $("recentActivity").innerHTML = renderRecentActivity(contribution.rows,{memberPhoto});
  $("monthlyPool").innerHTML = `<span class="eyebrow">Spoločný pool · ${escapeHtml(month)}</span><strong>${money(contribution.pool)}</strong><span class="pool-breakdown">Základ ${money(contribution.base)} <span>+ pokuty ${money(contribution.penalties)}</span></span><small>Pokuty iba za ukončené týždne (${contribution.closedWeeks}/${contribution.weeks.length}).</small>`;
  const select = $("personalMemberSelect");
  const previous = select.value;
  select.innerHTML = state.members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}</option>`).join("");
  if (state.members.some((member) => member.id === previous)) select.value = previous;
  $("personalMemberLabel").classList.toggle("hidden", !state.isAdmin);
  const memberId = state.isAdmin ? select.value : state.member?.id;
  if (!memberId) {
    $("summaryGrid").innerHTML = '<p class="muted">Pre osobné štatistiky najprv pridaj člena.</p>';
    $("historyChart").replaceChildren();
    $("historyDescription").textContent = "";
    $("weeklyOverview").innerHTML = '<p class="muted">Pre týždenný prehľad najprv pridaj člena.</p>';
    return;
  }
  const stats = personalInsights(state.runs, memberId, month);
  const { completed, required } = stats.goal;
  const progress = required ? Math.min(completed / required, 1) : 1;
  const goalLabel = required ? `${completed} z ${required} behov` : "Bez povinného behu";
  const metrics = (values) => [["Kilometre", `${km(values.total)} km`], ["Počet behov", values.count], ["Priemerný beh", `${km(values.average)} km`], ["Najdlhší beh", `${km(values.longest)} km`]].map(([label, value]) => `<div class="personal-stat"><span class="muted">${label}</span><strong>${value}</strong></div>`).join("");
  $("summaryGrid").innerHTML = metrics(stats);
  $("weeklyOverview").innerHTML = `<div class="week-goal" title="Do cie&#318;a sa po&#269;&#237;taj&#250; iba behy od 3,0 km."><span class="muted">Aktuálny týždeň <small>· ${stats.goal.start.split("-").reverse().join(".")} – ${stats.goal.end.split("-").reverse().join(".")}</small></span><strong>${goalLabel}${required && completed >= required ? ' <span class="ok">✓</span>' : ""}</strong><progress max="1" value="${progress}" aria-label="Týždenný cieľ: ${goalLabel}, behy od 3 km"></progress></div>${metrics(stats.weekly)}`;
  const maximum = Math.max(...stats.history.map((item) => item.distance), 1);
  $("historyChart").innerHTML = stats.history.map((item) => {
    const date = new Date(`${item.month}-01T12:00:00`);
    const label = date.toLocaleDateString("sk", { month: "short" });
    const full = date.toLocaleDateString("sk", { month: "long", year: "numeric" });
    return `<div class="history-column" aria-label="${full}: ${km(item.distance)} km"><span class="history-value">${km(item.distance)}</span><div class="history-track"><div class="history-bar${item.month === month ? " selected" : ""}" style="height:${item.distance / maximum * 100}%"></div></div><span class="history-label">${label}</span></div>`;
  }).join("");
  $("historyDescription").textContent = `${stats.history[0].month} – ${month} · ${km(stats.history.reduce((sum, item) => sum + item.distance, 0))} km spolu${stats.history.every((item) => !item.distance) ? " · Zatiaľ bez záznamov." : ""}`;
}

function resetRunForm() {
  editingRunId = null;
  $("runForm").reset();
  $("runDateInput").value = localDate();
  $("runDateInput").dispatchEvent(new Event("change", { bubbles: true }));
  $("runFormTitle").textContent = "Pridať beh";
  $("runEyebrow").textContent = "Nový záznam";
  $("saveRunButton").textContent = "Pridať beh";
  $("cancelEditButton").classList.add("hidden");
  $("memberSelect").disabled = !state.isAdmin;
  $("runError").textContent = "";
  updateDistancePreview();
}

$("weeklyTable").addEventListener("click", (event) => {
  const button = event.target.closest(".week-choice");
  if (!button || button.dataset.weekMonth !== monthValue()) return;
  const month = monthValue();
  const week = button.dataset.weekStart;
  if (!monthWeeks(month).some(item => item.start === week && item.requiredRuns > 0)) return;
  selectedWeeks.set(month, week);
  render();
  $("weeklyTable").querySelector(`[data-week-start="${week}"]`)?.focus();
});

$("monthlyTable").addEventListener("click", (event) => {
  const button = event.target.closest(".ledger-toggle");
  if (!button) return;
  const key = `${button.dataset.runMonth}_${button.dataset.runMember}`;
  if (openedRunMembers.has(key)) openedRunMembers.delete(key);
  else openedRunMembers.add(key);
  const open = openedRunMembers.has(key);
  document.getElementById(button.getAttribute("aria-controls")).hidden = !open;
  button.setAttribute("aria-expanded", String(open));
  button.innerHTML = `${open ? 'Skry&#357;' : 'Zobrazi&#357;'} behy <span aria-hidden="true">${open ? '&#8722;' : '+'}</span>`;
});

$("personalMemberSelect").addEventListener("change", () => renderPersonalOverview(monthValue()));
for (const period of ["monthly", "weekly"]) {
  $(`${period}OverviewButton`).addEventListener("click", () => {
    for (const item of ["monthly", "weekly"]) {
      $(`${item}Overview`).hidden = item !== period;
      $(`${item}OverviewButton`).setAttribute("aria-pressed", String(item === period));
    }
  });
}
let overviewDate = localDate();
setInterval(() => {
  const today = localDate();
  if (today !== overviewDate) {
    overviewDate = today;
    updateDistancePreview();
    if (state.user) render();
  }
}, 60000);
$("cancelEditButton").addEventListener("click", resetRunForm);
document.addEventListener("click", (event) => {
  const button = event.target.closest(".edit-run");
  if (!button || savingRun) return;
  const run = state.runs.find((item) => item.id === button.dataset.id);
  if (!editable(run)) return;
  editingRunId = run.id;
  $("memberSelect").value = run.memberId;
  $("memberSelect").disabled = true;
  $("runDateInput").value = run.date;
  $("runDateInput").dispatchEvent(new Event("change", { bubbles: true }));
  $("runDistanceInput").value = run.distance;
  $("runIndoorInput").checked = run.indoor === true;
  updateDistancePreview();
  $("runFormTitle").textContent = "Upraviť beh";
  $("runEyebrow").textContent = "Úprava záznamu";
  $("saveRunButton").textContent = "Uložiť zmeny";
  $("cancelEditButton").classList.remove("hidden");
  $("runError").textContent = "";
  $("runMessage").textContent = "";
  $("runCard").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
  $("runDistanceInput").focus({ preventScroll: true });
});

async function loadData() {
  state.unsubscribe.push(onSnapshot(query(collection(db, "members"), orderBy("name")), (snapshot) => {
    state.members = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); render();
  }));
  state.unsubscribe.push(onSnapshot(collection(db, "runs"), (snapshot) => {
    state.runs = snapshot.docs.map((item) => ({ id: item.id, ...item.data({ serverTimestamps: "estimate" }) })); render();
  }));
  state.unsubscribe.push(onSnapshot(collection(db, "payments"), (snapshot) => {
    state.payments = new Map(snapshot.docs.map((item) => [item.id, item.data()]));
    state.paymentsReady = true;
    state.paymentsFailed = false;
    render();
  }, (error) => {
    state.paymentsReady = false;
    state.paymentsFailed = true;
    $("paymentError").textContent = "Stav platieb sa nepodarilo načítať.";
    render();
    console.error(error);
  }));
  state.unsubscribe.push(onSnapshot(collection(db, "paymentItems"), (snapshot) => {
    state.paymentItems = new Map(snapshot.docs.map((item) => [item.id, item.data()]));
    state.paymentItemsReady = true;
    state.paymentItemsFailed = false;
    render();
  }, (error) => {
    state.paymentItemsReady = false;
    state.paymentItemsFailed = true;
    $("paymentError").textContent = "Stav platieb sa nepodarilo načítať.";
    render();
    console.error(error);
  }));

}

onAuthStateChanged(auth, async (user) => {
  $("loadingView").classList.add("hidden");
  if (!user) {
    state.unsubscribe.splice(0).forEach((unsubscribe) => unsubscribe());
    state.user = null;
    state.isAdmin = false;
    state.members = [];
    state.runs = [];
    openedRunMembers.clear();
    selectedWeeks.clear();
    state.payments.clear();
    state.paymentItems.clear();
    state.paymentItemsReady = false;
    state.paymentItemsFailed = false;
    state.paymentsReady = false;
    state.paymentsFailed = false;
    pendingPayments.clear();
    $("paymentError").textContent = "";
    $("membersCard").classList.add("hidden");
    $("loginView").classList.remove("hidden");
    $("appView").classList.add("hidden");
    $("logoutButton").classList.add("hidden");
    return;
  }
  state.user = user;
  if (isAdminLogin && user.isAnonymous) {
    $("loginView").classList.remove("hidden");
    $("appView").classList.add("hidden");
    $("logoutButton").classList.add("hidden");
    return;
  }
  if (user.isAnonymous && !state.member) {
    const savedMemberId = localStorage.getItem("doxbeh-member-id");
    if (savedMemberId) {
      const savedMember = await getDoc(doc(db, "members", savedMemberId));
      if (savedMember.exists()) state.member = { id: savedMember.id, ...savedMember.data() };
      else localStorage.removeItem("doxbeh-member-id");
    }
  }
  if (user.isAnonymous && !state.member) { $("loginView").classList.remove("hidden"); $("appView").classList.add("hidden"); $("logoutButton").classList.add("hidden"); return; }
  $("loginView").classList.add("hidden"); $("appView").classList.remove("hidden"); $("logoutButton").classList.remove("hidden");
  const profile = await getDoc(doc(db, "admins", user.uid));
  if (auth.currentUser?.uid !== user.uid) return;
  state.isAdmin = profile.exists();
  $("userLabel").textContent = user.isAnonymous ? state.member.name : `${user.email}${state.isAdmin ? " · Admin" : ""}`;
  $("membersCard").classList.toggle("hidden", !state.isAdmin);
  render();
  if (!state.unsubscribe.length) await loadData();
});

$("memberLoginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("memberLoginError").textContent = "";
  try {
    if (!auth.currentUser) await signInAnonymously(auth);
    const snapshot = await getDocs(collection(db, "members"));
    const nick = $("nickInput").value.trim().toLowerCase();
    const member = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).find((item) => item.nick?.toLowerCase() === nick);
    if (!member) throw new Error("unknown-nick");
    const access = await getDoc(doc(db, "settings", "access"));
    if (!access.exists() || access.data().memberPin !== $("memberPinInput").value) throw new Error("wrong-pin");
    state.member = member;
    state.isAdmin = false;
    localStorage.setItem("doxbeh-member-id", member.id);
    $("userLabel").textContent = member.name;
    $("loginView").classList.add("hidden");
    $("appView").classList.remove("hidden");
    $("logoutButton").classList.remove("hidden");
    if (!state.unsubscribe.length) await loadData();
    render();
  } catch (error) {
    if (error.message === "unknown-nick") $("memberLoginError").textContent = "Tento nick nepoznám. Skontroluj ho alebo kontaktuj admina.";
    else if (error.message === "wrong-pin") $("memberLoginError").textContent = "Nesprávny PIN.";
    else if (error.code === "auth/operation-not-allowed") $("memberLoginError").textContent = "Vo Firebase nie je zapnuté Anonymous prihlasovanie.";
    else if (error.code === "permission-denied") $("memberLoginError").textContent = "Firebase Rules nepovoľujú čítanie členov alebo PIN-u.";
    else $("memberLoginError").textContent = `Prihlásenie sa nepodarilo (${error.code || "neznáma chyba"}).`;
    if (auth.currentUser?.isAnonymous) await signOut(auth);
    console.error(error);
  }
});

function runFormValues() {
  const existing = editingRunId ? state.runs.find(run => run.id === editingRunId) : null;
  return {date:$("runDateInput").value, distance:Number($("runDistanceInput").value), indoor:$("runIndoorInput").checked, recordedOn:existing ? originalRegistrationDate(existing) : registrationDate(), penaltyVersion:1};
}
function updateDistancePreview() {
  const values=runFormValues();
  if (!Number.isFinite(values.distance) || values.distance <= 0 || !values.date) {
    $("runDistancePreview").innerHTML = '<span class="muted">Zadaj vzdialenos&#357; a zobraz&#237; sa po&#269;et zapo&#269;&#237;tan&#253;ch kilometrov.</span>';
    return;
  }
  const value=distanceBreakdown(values);
  $("runDistancePreview").innerHTML = `<div><span>P&#244;vodn&#225; vzdialenos&#357;</span><b>${km(value.original)} km</b></div>${value.indoorRate?`<div class="distance-penalty"><span>Interi&#233;rov&#253; beh (&minus;10 %)</span><b>&minus;${km(value.indoorLoss)} km</b></div>`:''}${value.lateRate?`<div class="distance-penalty"><span>Neskor&#253; z&#225;pis (&minus;50 % zo zvy&#353;ku)</span><b>&minus;${km(value.lateLoss)} km</b></div>`:''}<div class="distance-final"><span>Zapo&#269;&#237;ta sa</span><strong>${km(value.credited)} km</strong></div><small>${value.original>=3?'&#10003; Sp&#314;&#328;a limit 3 km pod&#318;a p&#244;vodnej vzdialenosti.':'Pod limitom 3 km pre t&#253;&#382;denn&#233; plnenie.'}${value.indoorRate&&value.lateRate?' Najprv &minus;10 % za interi&#233;r, potom &minus;50 % zo zvy&#353;ku.':''}${editingRunId?' Rozhoduje p&#244;vodn&#253; de&#328; z&#225;pisu.':''}</small>`;
}
$("runDistanceInput").addEventListener("input",updateDistancePreview);
$("runIndoorInput").addEventListener("change",updateDistancePreview);
$("runDateInput").addEventListener("change",updateDistancePreview);
$("runForm").addEventListener("reset",()=>setTimeout(updateDistancePreview,0));

$("monthInput").value = localDate().slice(0, 7);
$("runDateInput").value = localDate();
$("monthInput").addEventListener("change", render);
setupDatePickers([$("monthInput"), $("runDateInput")]);
updateDistancePreview();
$("logoutButton").addEventListener("click", async () => {
  localStorage.removeItem("doxbeh-member-id");
  state.member = null;
  state.isAdmin = false;
  resetRunForm();
  await signOut(auth);
  await navigation.showOverview();
});
$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault(); $("loginError").textContent = "";
  try { await signInWithEmailAndPassword(auth, $("emailInput").value, $("passwordInput").value); }
  catch (error) { $("loginError").textContent = "Prihlásenie sa nepodarilo. Skontrolujte e-mail a heslo."; console.error(error); }
});
$("runForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (savingRun) return;
  const date = $("runDateInput").value;
  const distance = Number($("runDistanceInput").value);
  if (!date || !Number.isFinite(distance) || distance < 0.1 || distance > 500) return;
  const runId = editingRunId;
  const values = runFormValues();
  savingRun = true;
  $("saveRunButton").disabled = true;
  $("cancelEditButton").disabled = true;
  $("runError").textContent = "";
  try {
    if (runId) {
      const run = state.runs.find((item) => item.id === runId);
      if (!editable(run)) throw new Error("run-not-editable");
      await updateDoc(doc(db, "runs", runId), values);
    } else {
      const memberId = state.isAdmin ? $("memberSelect").value : state.member.id;
      if (!memberId) throw new Error("missing-member");
      await addDoc(collection(db, "runs"), { memberId, ...values, createdBy: state.user.uid, createdAt: serverTimestamp() });
    }
    resetRunForm();
    render();
    $("runMessage").textContent = runId ? "Zmeny boli uložené." : "Beh bol uložený.";
    setTimeout(() => $("runMessage").textContent = "", 3500);
  } catch (error) {
    $("runError").textContent = runId && error.code === "permission-denied" ? "Úpravu nepovoľujú pravidlá databázy. Kontaktuj admina; tvoje zmeny zostali vo formulári." : "Beh sa nepodarilo uložiť. Skús to znova.";
    console.error(error);
  } finally {
    savingRun = false;
    $("saveRunButton").disabled = false;
    $("cancelEditButton").disabled = false;
  }
});
$("memberForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("memberError").textContent = "";
  try {
    const name = $("memberNameInput").value.trim();
    const nick = $("memberNickInput").value.trim().toLowerCase();
    const existing = await getDocs(collection(db, "members"));
    if (existing.docs.some((item) => item.data().nick?.toLowerCase() === nick)) throw new Error("duplicate-nick");
    await addDoc(collection(db, "members"), { name, nick, createdAt: serverTimestamp() });
    $("memberNameInput").value = "";
    $("memberNickInput").value = "";
  } catch (error) {
    $("memberError").textContent = error.message === "duplicate-nick" ? "Tento nick už používa iný člen." : "Člena sa nepodarilo pridať. Skontrolujte administrátorské oprávnenia.";
    console.error(error);
  }
});
let pendingDelete = null;
const confirmDialog = $("confirmDialog");
document.addEventListener("click", (event) => {
  const runButton = event.target.closest(".delete-run");
  const memberButton = event.target.closest(".delete-member");
  if (!runButton && !memberButton) return;
  if (runButton && !editable(state.runs.find((run) => run.id === runButton.dataset.id))) return;
  if (memberButton && !state.isAdmin) return;
  pendingDelete = runButton
    ? { collection: "runs", id: runButton.dataset.id, message: "Naozaj zmazať tento beh?" }
    : { collection: "members", id: memberButton.dataset.id, message: "Naozaj odstrániť člena? Jeho staré behy zostanú v databáze." };
  $("confirmMessage").textContent = pendingDelete.message;
  $("confirmTitle").textContent = runButton ? "Odstrániť beh?" : "Odstrániť člena?";
  confirmDialog.showModal();
});
confirmDialog.addEventListener("close", async () => {
  if (confirmDialog.returnValue !== "confirm" || !pendingDelete) {
    pendingDelete = null;
    return;
  }
  const target = pendingDelete;
  pendingDelete = null;
  if (target.collection === "runs") {
    if (!editable(state.runs.find((run) => run.id === target.id))) return;
  } else if (!state.isAdmin) return;
  try {
    await deleteDoc(doc(db, target.collection, target.id));
    if (target.collection === "runs" && editingRunId === target.id) resetRunForm();
    $("recordsError").textContent = "";
  } catch (error) {
    $("recordsError").textContent = error.code === "permission-denied"
      ? "Odstránenie nepovoľujú pravidlá databázy. Treba publikovať aktuálne pravidlá Firebase alebo overiť vlastníctvo záznamu." : "Záznam sa nepodarilo odstrániť. Skús to znova.";
    console.error(error);
  }
});
