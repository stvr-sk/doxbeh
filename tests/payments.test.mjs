import { renderRecentActivity } from "../dashboard-activity.js";
import { renderPrizes } from "../prizes.js";
import { comparisonRows } from "../chart-display.js";
import { creditedDistance, distanceBreakdown, originalRegistrationDate, registrationDate } from "../run-distance.js";
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { personalInsights, monthContributions, canEditRun, localDate } from "../insights.js";
import { renderRunOverview } from "../run-overview.js";
import { installmentKey, paymentInstallments, memberPaymentBalance, renderPaymentTable } from "../payment-ledger.js";
import { renderWeeklyOverview } from "../weekly-overview.js";
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
  setupDatePickers() {}, setupNavigation:()=>({showOverview(){}}), onAuthStateChanged() {},
  creditedDistance, distanceBreakdown, originalRegistrationDate, registrationDate,
  comparisonRows, renderPrizes, renderRecentActivity,
  personalInsights, monthContributions, canEditRun, localDate, monthWeeks, renderRunOverview, installmentKey, paymentInstallments, memberPaymentBalance, renderPaymentTable, renderWeeklyOverview,
  doc: (_, collection, id) => ({ collection, id }), serverTimestamp: () => "server-time",
  async setDoc(ref, data) {
    if (failWrite) throw new Error("offline");
    writes.push({ ref, data });
    context.test.state.paymentItems.set(ref.id, data);
  }
};
vm.createContext(context);
const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
vm.runInContext(source + "\nglobalThis.test = {state, renderPayment, pendingPayments};", context);
const {state,renderPayment,pendingPayments}=context.test;
const member={id:'a',name:'A'};
state.user={uid:'admin'};state.member=member;state.members=[member,{id:'b',name:'B'}];state.paymentsReady=true;state.paymentItemsReady=true;
const change=async(memberId,month,itemId,checked)=>{const checkbox={dataset:{memberId,month,itemId},checked};for(const handler of events.change)await handler({target:{closest:()=>checkbox}});};
assert(renderPayment(member,'2026-10').includes('Nezaplaten'));
await change('a','2026-10','base',true);assert.equal(writes.length,0);
state.isAdmin=true;
await change('a','2026-10','base',true);
assert.equal(writes[0].ref.collection,'paymentItems');assert.equal(writes[0].ref.id,'2026-10_a_base');assert.equal(writes[0].data.amount,10);assert.equal(writes[0].data.paid,true);assert.equal(writes[0].data.updatedBy,'admin');
assert(renderPayment(member,'2026-10').includes('Zost'));
assert(renderPayment(member,'2026-11').includes('Nezaplaten'));
await change('a','2026-10','base',false);assert.equal(state.paymentItems.get('2026-10_a_base').paid,false);assert.equal(state.paymentItems.size,1);
failWrite=true;await change('a','2026-10','base',true);assert.equal(state.paymentItems.get('2026-10_a_base').paid,false);assert.equal(pendingPayments.size,0);assert(element('paymentError').textContent.includes('nepodarilo'));
failWrite=false;const count=writes.length;
await change('a','2099-11','2099-11-02',true);assert.equal(writes.length,count,'Cannot pay future weekly fine');
await change('a','2026-10','not-a-week',true);assert.equal(writes.length,count);
await change('missing','2026-10','base',true);assert.equal(writes.length,count);
state.paymentItemsFailed=true;assert(renderPayment(member,'2026-10').includes('nedostupn'));await change('a','2026-10','base',true);assert.equal(writes.length,count);
console.log('PASS: admin-only saves, base amount and document identity, month isolation, uncheck, rollback, closed-week validation, invalid member and unavailable state. Firebase calls mocked.');
