import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { addDoc, updateDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { setupDatePickers } from "./date-picker.js?v=4";
import { personalInsights, canEditRun, localDate } from "./insights.js?v=6";

import { monthWeeks } from "./weeks.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (id) => document.getElementById(id);
const state = { user: null, member: null, isAdmin: false, members: [], runs: [], unsubscribe: [] };
const isAdminLogin = /\/admin(?:\/index\.html)?\/?$/.test(location.pathname);
$("memberLoginPanel").classList.toggle("hidden", isAdminLogin);
$("adminLoginPanel").classList.toggle("hidden", !isAdminLogin);
if (isAdminLogin) document.title = "Admin · Doxbeh";
let editingRunId = null;
let savingRun = false;
const km = (value) => Number(value).toLocaleString("sk", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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

function render() {
  const month = monthValue();
  const weeks = monthWeeks(month).filter((week) => week.requiredRuns > 0);
  const rows = state.members.map((member) => {
    const runs = runsFor(member.id, month);
    let extra = 0;
    const statuses = weeks.map((week) => {
      const count = runs.filter((run) => run.date >= week.countStart && run.date <= week.end).length;
      const missingRuns = Math.max(week.requiredRuns - count, 0);
      extra += missingRuns * 2.5;
      return { ...week, count, missingRuns };
    });
    return { member, runs, extra, total: 10 + extra, statuses };
  });
  const maxDistance = Math.max(...rows.map((row) => row.runs.reduce((sum, run) => sum + Number(run.distance || 0), 0)), 0);
  renderPersonalOverview(month);
  $("chartMonthLabel").textContent = month;
  const chartRows = rows.map((row) => ({ ...row, distance: row.runs.reduce((sum, run) => sum + Number(run.distance || 0), 0) }))
    .sort((a, b) => b.distance - a.distance || a.member.name.localeCompare(b.member.name, "sk"));
  $("distanceChart").innerHTML = chartRows.length ? chartRows.map((row) => {
    const distance = row.distance;
    const width = maxDistance ? Math.max((distance / maxDistance) * 100, distance ? 3 : 0) : 0;
    const photo = memberPhoto(row.member);
    return `<div class="chart-row"><span class="chart-name">${escapeHtml(row.member.name)}</span><div class="chart-track"><div class="chart-bar" style="width:${width}%">${distance ? `<span class="chart-avatar"><span>${escapeHtml(initials(row.member.name))}</span>${photo ? `<img src="${photo}" alt="${escapeHtml(row.member.name)}" onerror="this.remove()">` : ""}</span>` : ""}</div></div><strong class="chart-value">${distance.toFixed(1)} km</strong></div>`;
  }).join("") : "<p class=\"muted\">Najprv pridajte členov.</p>";
  const selectableMembers = state.isAdmin ? state.members : state.members.filter((member) => member.id === state.member?.id);
  const previousMember = $("memberSelect").value;
  $("memberSelect").innerHTML = selectableMembers.map((member) => `<option value="${member.id}">${escapeHtml(member.name)}</option>`).join("");
  if (selectableMembers.some((member) => member.id === previousMember)) $("memberSelect").value = previousMember;
  $("memberSelect").disabled = !state.isAdmin || !!editingRunId;
  $("weeklyTable").innerHTML = rows.length ? `<table><thead><tr><th>Člen</th>${weeks.map((week) => `<th>${week.label}<br><small>min. ${week.requiredRuns} ${week.requiredRuns === 1 ? "beh" : "behy"}</small></th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.member.name)}</td>${row.statuses.map((week) => `<td class="${week.count >= week.requiredRuns ? "ok" : "warning"}">${week.count}/${week.requiredRuns}</td>`).join("")}</tr>`).join("")}</tbody></table>` : "<p class=\"muted\">Najprv pridajte členov.</p>";
  $("monthlyTable").innerHTML = rows.length ? `<div class="member-summary-grid">${rows.map((row) => `<article class="member-summary"><div class="member-summary-head"><div><strong>${escapeHtml(row.member.name)}</strong><span class="member-nick">${row.runs.length} ${row.runs.length === 1 ? "beh" : "behov"} · ${row.runs.reduce((sum, run) => sum + Number(run.distance || 0), 0).toFixed(1)} km</span></div><strong class="member-total">${money(row.total)}</strong></div><div class="member-metrics"><span><small>Príplatok</small><b>${money(row.extra)}</b></span><span><small>Základ</small><b>10,00 €</b></span></div><div class="run-list">${row.runs.length ? row.runs.sort((a, b) => b.date.localeCompare(a.date)).map((run) => `<div class="run-item"><span>${run.date}</span><b>${run.distance || "—"} km</b><span class="run-actions">${editable(run) ? `<button type="button" class="button secondary edit-run" data-id="${escapeHtml(run.id)}" aria-label="Upravi&#357; beh z ${run.date}">Upravi&#357;</button>` : ""}${editable(run) ? `<button type="button" class="button danger delete-run" data-id="${escapeHtml(run.id)}" title="Zmazať beh" aria-label="Zmazať beh z ${run.date}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button>` : ""}</span></div>`).join("") : "<span class=\"muted\">V tomto mesiaci zatiaľ nemá žiadny beh.</span>"}</div></article>`).join("")}</div>` : "<p class=\"muted\">Žiadne záznamy.</p>";
  $("membersList").innerHTML = state.members.map((member) => `<div class="member-row"><span><strong>${escapeHtml(member.name)}</strong><small class="member-nick">@${escapeHtml(member.nick || "bez nicku")}</small></span><button class="button danger delete-member" data-id="${member.id}" aria-label="Odstrániť člena ${escapeHtml(member.name)}">Odstrániť</button></div>`).join("");
}

function renderPersonalOverview(month) {
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
    return;
  }
  const stats = personalInsights(state.runs, memberId, month);
  const { completed, required } = stats.goal;
  const progress = required ? Math.min(completed / required, 1) : 1;
  const goalLabel = required ? `${completed} z ${required} behov` : "Bez povinného behu";
  $("summaryGrid").innerHTML = `<div class="week-goal"><span class="muted">Tento týždeň <small>· aktuálny mesiac</small></span><strong>${goalLabel}${required && completed >= required ? ' <span class="ok">✓</span>' : ""}</strong><progress max="1" value="${progress}" aria-label="Týždenný cieľ: ${goalLabel}"></progress></div>${[["Kilometre", `${km(stats.total)} km`], ["Počet behov", stats.count], ["Priemerný beh", `${km(stats.average)} km`], ["Najdlhší beh", `${km(stats.longest)} km`]].map(([label, value]) => `<div class="personal-stat"><span class="muted">${label}</span><strong>${value}</strong></div>`).join("")}`;
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
}

$("personalMemberSelect").addEventListener("change", () => renderPersonalOverview(monthValue()));
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
    state.runs = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); render();
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

$("monthInput").value = localDate().slice(0, 7);
$("runDateInput").value = localDate();
$("monthInput").addEventListener("change", render);
setupDatePickers([$("monthInput"), $("runDateInput")]);
$("logoutButton").addEventListener("click", async () => {
  localStorage.removeItem("doxbeh-member-id");
  state.member = null;
  state.isAdmin = false;
  resetRunForm();
  await signOut(auth);
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
  savingRun = true;
  $("saveRunButton").disabled = true;
  $("cancelEditButton").disabled = true;
  $("runError").textContent = "";
  try {
    if (runId) {
      const run = state.runs.find((item) => item.id === runId);
      if (!editable(run)) throw new Error("run-not-editable");
      await updateDoc(doc(db, "runs", runId), { date, distance });
    } else {
      const memberId = state.isAdmin ? $("memberSelect").value : state.member.id;
      if (!memberId) throw new Error("missing-member");
      await addDoc(collection(db, "runs"), { memberId, date, distance, createdBy: state.user.uid, createdAt: serverTimestamp() });
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
