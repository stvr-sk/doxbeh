import assert from 'node:assert/strict';
import {recentRuns,renderRecentActivity} from '../dashboard-activity.js';
const rows=[{member:{id:'a',name:'A <script>'},runs:[{date:'2026-11-12',distance:5,indoor:true,penaltyVersion:1,recordedOn:'2026-11-14'},{date:'2026-11-16',distance:4}]},{member:{id:'b',name:'B'},runs:[{date:'2026-11-15',distance:7},{date:'2026-11-14',distance:3},{date:'2026-11-20',distance:50}]}];
const snapshot=JSON.stringify(rows);
assert.deepEqual(recentRuns(rows,'2026-11-17').map(item=>item.run.date),['2026-11-16','2026-11-15','2026-11-14','2026-11-12']);
assert.equal(JSON.stringify(rows),snapshot);
const html=renderRecentActivity(rows,{today:'2026-11-17',memberPhoto:()=> './photo.svg'});
assert.equal((html.match(/class="recent-run"/g)||[]).length,4);
assert(html.includes('A &lt;script&gt;'));assert(!html.includes('A <script>'));assert(html.includes('src="./photo.svg"'));assert(!html.includes('50,0'));
const adjusted=renderRecentActivity([rows[0]],{today:'2026-11-13'});assert(adjusted.includes('2,25'));assert(adjusted.includes('P&#244;vodn&#225; vzdialenos&#357; 5 km'));
assert(renderRecentActivity([]).includes('recent-empty'));
console.log('PASS: recent run sorting and limit, future-date exclusion, credited distance, photos, escaped names, empty state and source preservation.');

const sameDay=[
 {member:{id:'a',name:'A'},runs:[{id:'old',date:'2026-11-17',distance:3,createdAt:{seconds:100,nanoseconds:1}},{id:'newest',date:'2026-11-17',distance:3,createdAt:{seconds:101,nanoseconds:0}}]},
 {member:{id:'b',name:'Z'},runs:[{id:'second',date:'2026-11-17',distance:3,createdAt:{seconds:100,nanoseconds:3}}]},
 {member:{id:'c',name:'C'},runs:[{id:'third',date:'2026-11-17',distance:3,createdAt:{seconds:100,nanoseconds:2}},{id:'oldest',date:'2026-11-17',distance:3,createdAt:{seconds:99,nanoseconds:0}}]}
];
assert.deepEqual(recentRuns(sameDay,'2026-11-17').map(item=>item.run.id),['newest','second','third','old','oldest']);
const fallback=[{member:{id:'a',name:'A'},runs:[{id:'missing',date:'2026-11-17',distance:3},{id:'date',date:'2026-11-17',distance:3,createdAt:new Date(2000)},{id:'millis',date:'2026-11-17',distance:3,createdAt:{toMillis:()=>3000}}]}];
assert.deepEqual(recentRuns(fallback,'2026-11-17').map(item=>item.run.id),['millis','date','missing']);
console.log('PASS: five same-day runs sorted by creation time; subsecond precision, multiple runs per member and missing-timestamp fallback.');

const withTime = (createdAt) => renderRecentActivity([{member:{id:'a',name:'A'},runs:[{date:'2026-11-17',distance:3,createdAt}]}],{today:'2026-11-17'});
assert(withTime({seconds:Date.parse('2026-11-17T13:05:00Z')/1000}).includes('>17.11. 14:05</time>'));
assert(withTime(new Date('2026-07-17T13:05:00Z')).includes('>17.7. 15:05</time>'));
assert(withTime(undefined).includes('Nezn&#225;my'));
assert(!withTime(undefined).includes('<time'));
assert(withTime(new Date('2026-11-18T00:05:00Z')).includes('>18.11. 01:05</time>'));
assert(withTime(new Date('2026-11-18T00:05:00Z')).includes('&#268;as pridania'));
const sixRuns=[{member:{id:'a',name:'A'},runs:Array.from({length:10},(_,i)=>({id:i,date:'2026-11-17',distance:3,createdAt:{seconds:i}}))}];
assert.deepEqual(recentRuns(sixRuns,'2026-11-17').map(item=>item.run.id),[9,8,7,6,5,4,3,2]);
assert.equal((renderRecentActivity(sixRuns,{today:'2026-11-17'}).match(/class="recent-run"/g)||[]).length,8);
console.log('PASS: creation time beside run date, Bratislava winter/summer time and missing timestamp.');

assert(renderRecentActivity(sixRuns,{today:'2026-11-17'}).includes('tabindex="0" role="region"'));
