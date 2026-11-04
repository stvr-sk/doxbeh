import assert from 'node:assert/strict';
import {groupRunRows, renderRunOverview} from '../run-overview.js';
const rows=[
 {member:{id:'empty',name:'Empty'},runs:[],total:10,extra:0},
 {member:{id:'short',name:'Short'},runs:[{id:'s',memberId:'short',date:'2026-11-02',distance:2}],total:10,extra:0},
 {member:{id:'runner',name:'Runner <script>'},runs:[{id:'r1',memberId:'runner',date:'2026-11-01',distance:3},{id:'r2',memberId:'runner',date:'2026-11-02',distance:5}],total:12.5,extra:2.5}
];
const {active,inactive}=groupRunRows(rows);
assert.deepEqual(active.map(r=>r.member.id),['runner','short']);
assert.deepEqual(inactive.map(r=>r.member.id),['empty']);
assert.equal(rows[0].member.id,'empty','Original order is preserved');
assert.equal(rows[2].runs[0].id,'r1','Original run ordering is preserved');
const calls=[];
const options={renderPayment:(member,month)=>{calls.push([member.id,month]);return '<span>Payment</span>';},editable:run=>run.id==='r1',opened:new Set(['2026-11_runner'])};
const html=renderRunOverview(rows,'2026-11',options);
assert.equal(calls.length,3);assert(calls.every(([,month])=>month==='2026-11'));
assert(html.indexOf('Runner &lt;script&gt;')<html.indexOf('Empty'));
assert(!html.includes('<script>'));
assert(html.replace(/<[^>]*>/g, '').includes('2 z 3'));
assert(html.includes('8,0'));
assert(html.includes('Pod limitom'));
assert(html.includes('Sp&#314;&#328;a limit'));
assert(html.includes('2 sp&#314;&#328;aj&#250; limit'));
assert.equal((html.match(/class="ledger-member has-runs"/g)||[]).length,2);
assert.equal((html.match(/class="ledger-member no-runs"/g)||[]).length,1);
assert.equal((html.match(/class="ledger-toggle"/g)||[]).length,2);
assert.equal((html.match(/class="button secondary edit-run"/g)||[]).length,1);
assert.equal((html.match(/class="button danger delete-run"/g)||[]).length,1);
assert(html.includes('id="runs-2026-11_runner" class="ledger-details" >'));
assert(html.includes('id="runs-2026-11_short" class="ledger-details" hidden'));
assert(html.indexOf('2026-11-02')<html.lastIndexOf('2026-11-01'));
const otherMonth=renderRunOverview(rows,'2026-12',options);
assert(otherMonth.includes('id="runs-2026-12_runner" class="ledger-details" hidden'));
assert(renderRunOverview([], '2026-11',options).includes('muted'));
assert(!renderRunOverview([rows[0]],'2026-11',options).includes('ledger-toggle'));
console.log('PASS: activity grouping and sort, short-run participation, totals, escaped names, permissions, payment integration, expandable details, month isolation and empty state.');

const photoRows = [{member:{id:'photo',name:'Test Runner',nick:'test.runner'},runs:[],total:10,extra:0}];
const photoHtml = renderRunOverview(photoRows,'2026-11',options);
assert(photoHtml.includes('src="./assets/members/test.runner.svg"'));
assert(photoHtml.includes('<span>TR</span>'));
assert(photoHtml.includes('onerror="this.remove()"'));
assert(!renderRunOverview([rows[0]],'2026-11',options).includes('<img'));
assert(renderRunOverview(photoRows,'2026-11',{...options,memberPhoto:()=> './assets/custom.png'}).includes('src="./assets/custom.png"'));
console.log('PASS: member photos including inactive members, initials underneath, missing-image fallback, shared photo source.');
