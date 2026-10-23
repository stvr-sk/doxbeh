import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { personalInsights, monthContributions, canEditRun, localDate } from "../insights.js";
import { monthWeeks } from "../weeks.js";

const elements = new Map();
const events = {};
const writes = [];
const element = (id) => {
  if (!elements.has(id)) elements.set(id, {
    value: id === "monthInput" ? "2026-10" : "", innerHTML: "", textContent: "",
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, dispatchEvent() {}, replaceChildren() {}
  });
  return elements.get(id);
};
let failWrite = false;
const context = {
  console: { error() {} }, Date, Number, String, Math, Array, Map, Event,
  location: { pathname: "/" }, setTimeout() {}, setInterval() {},
  document: { getElementById: element, addEventListener(type, fn) { (events[type] ??= []).push(fn); } },
  firebaseConfig: {}, initializeApp: () => ({}), getAuth: () => ({}), getFirestore: () => ({}),
  setupDatePickers() {}, onAuthStateChanged() {},
  personalInsights, monthContributions, canEditRun, localDate, monthWeeks,
  doc: (_, collection, id) => ({ collection, id }), serverTimestamp: () => "server-time",
  async setDoc(ref, data) {
    if (failWrite) throw new Error("offline");
    writes.push({ ref, data });
    context.test.state.payments.set(ref.id, data);
  }
};
vm.createContext(context);
const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
vm.runInContext(source + "\nglobalThis.test = {state, renderPayment, pendingPayments};", context);
const { state, renderPayment, pendingPayments } = context.test;
const member = { id: "a", name: "A" };
state.user = { uid: "admin" };
state.member = member;
state.members = [member, { id: "b", name: "B" }];
state.paymentsReady = true;
assert(renderPayment(member, "2026-10").includes("Nezaplatené"));
assert(!renderPayment(member, "2026-10").includes('type="checkbox"'));
const change = async (memberId, month, checked) => {
  const checkbox = { dataset: { memberId, month }, checked };
  for (const handler of events.change) await handler({ target: { closest: () => checkbox } });
};
await change("a", "2026-10", true);
assert.equal(writes.length, 0, "Member cannot record payment");
state.isAdmin = true;
await change("a", "2026-10", true);
assert.equal(writes[0].ref.id, "2026-10_a");
assert.equal(writes[0].data.paid, true);
assert.equal(writes[0].data.updatedBy, "admin");
assert(renderPayment(member, "2026-10").includes("Zaplatené"));
assert(renderPayment(member, "2026-11").includes("Nezaplatené"));
assert(renderPayment({ id: "b", name: "B" }, "2026-10").includes("Nezaplatené"));
await change("a", "2026-10", false);
assert.equal(state.payments.get("2026-10_a").paid, false);
assert.equal(state.payments.size, 1, "Repeated changes use the same document");
failWrite = true;
await change("a", "2026-10", true);
assert.equal(state.payments.get("2026-10_a").paid, false);
assert.equal(pendingPayments.size, 0);
assert(element("paymentError").textContent.includes("nepodarilo"));
state.paymentsFailed = true;
assert(renderPayment(member, "2026-10").includes("Stav nedostupný"));
assert(renderPayment(member, "2026-10").includes("disabled"));
const previousWrites = writes.length;
await change("a", "2026-10", true);
assert.equal(writes.length, previousWrites);
console.log("PASS: admin-only controls and writes, member visibility, month/member isolation, uncheck, failure rollback and unavailable-state handling. Firebase writes mocked.");
