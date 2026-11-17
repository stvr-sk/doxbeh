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
    listeners:{}, checked:false, addEventListener(type,fn) {this.listeners[type]=fn;}, dispatchEvent() {}, replaceChildren() {}, reset() {}
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
  comparisonRows, renderPrizes,
  personalInsights, monthContributions, canEditRun, localDate, monthWeeks, renderRunOverview, installmentKey, paymentInstallments, memberPaymentBalance, renderPaymentTable, renderWeeklyOverview,
  doc: (_, collection, id) => ({ collection, id }), serverTimestamp: () => "server-time",
  async addDoc(ref,data) {writes.push({type:"create",data});},
  async updateDoc(ref,data) {writes.push({type:"update",ref,data});},
  collection:()=>({}),
  async setDoc(ref, data) {
    if (failWrite) throw new Error("offline");
    writes.push({ ref, data });
    context.test.state.paymentItems.set(ref.id, data);
  }
};
vm.createContext(context);
const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
vm.runInContext(source + "\nglobalThis.test = {state, runFormValues, updateDistancePreview, setEdit:(id)=>editingRunId=id};", context);
const {state,runFormValues,updateDistancePreview,setEdit}=context.test;
state.user={uid:'u'};state.member={id:'a',name:'A'};state.members=[state.member];
const today=registrationDate();const day=new Date(today+'T12:00:00');day.setDate(day.getDate()-1);const yesterday=registrationDate(day);
element('runDateInput').value=yesterday;element('runDistanceInput').value='5';element('runIndoorInput').checked=true;
updateDistancePreview();assert.equal(element('runDistancePreview').innerHTML.includes('&minus;50 % zo zvy&#353;ku'),today >= '2026-11-14');assert(element('runDistancePreview').innerHTML.includes(today >= '2026-11-14'?'2,25 km':'4,5 km'));assert(element('runDistancePreview').innerHTML.includes('Sp&#314;&#328;a limit'));
assert.equal(runFormValues().recordedOn,today);
await element('runForm').listeners.submit({preventDefault(){}});
assert.equal(writes[0].type,'create');assert.equal(writes[0].data.distance,5);assert.equal(writes[0].data.indoor,true);assert.equal(writes[0].data.recordedOn,today);assert.equal(writes[0].data.penaltyVersion,1);assert.equal(writes[0].data.createdBy,'u');
state.runs=[{id:'old',memberId:'a',createdBy:'u',distance:5,date:yesterday,recordedOn:yesterday,indoor:false,penaltyVersion:1}];setEdit('old');element('runDateInput').value=yesterday;element('runDistanceInput').value='6';element('runIndoorInput').checked=false;
assert.equal(runFormValues().recordedOn,yesterday,'Editing retains original registration date');
await element('runForm').listeners.submit({preventDefault(){}});assert.equal(writes[1].type,'update');assert.equal(writes[1].data.recordedOn,yesterday);assert.equal(writes[1].data.distance,6);assert.equal(writes[1].data.indoor,false);
console.log('PASS: live combined-penalty preview, create payload keeps original distance, indoor flag and registration date, edit preserves original registration date. Firebase calls mocked.');
