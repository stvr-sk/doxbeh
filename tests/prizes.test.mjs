import assert from 'node:assert/strict';
import {prizeBreakdown,renderPrizes,prizeStandings} from '../prizes.js';
for(const pool of [30,50,100,112.5,165.75]){
 const prizes=prizeBreakdown(pool);
 assert.equal(prizes[0].amount,Math.round((pool-30)*100)/100);
 assert.equal(prizes[1].amount,20);assert.equal(prizes[2].amount,10);
 assert.equal(Math.round(prizes.reduce((sum,item)=>sum+item.amount,0)*100)/100,pool);
}
for(const pool of [0,20,-5,NaN,Infinity])assert.equal(prizeBreakdown(pool),null);
assert(renderPrizes(100).includes('70,00 &euro;'));
assert(renderPrizes(112.5).includes('82,50 &euro;'));
assert(renderPrizes(20).includes('aspo&#328; 30 &euro;'));
assert(!renderPrizes(0).includes('-30,00'));
console.log('PASS: prize allocation, full-pool totals, growing first prize, decimals and insufficient pool.');

const rows=[{member:{id:'b',name:'Second'},distance:12},{member:{id:'a',name:'First <test>'},distance:20},{member:{id:'c',name:'Third'},distance:5}];
assert.deepEqual(prizeStandings(rows).map(item=>item.rows[0].member.id),['a','b','c']);
const html=renderPrizes(100,rows);
assert(html.includes('First &lt;test&gt;'));assert(html.includes('Second'));assert(html.includes('Third'));assert(html.includes('70,00 &euro;'));
assert(!html.includes('prize-leader'));assert(!html.includes('<img'));assert(!html.includes('First <test>'));
const tied=[...rows,{member:{id:'d',name:'Equal'},distance:20}];
const places=prizeStandings(tied);assert.equal(places[0].rows.length,2);assert.equal(places[1].rows.length,0);assert.equal(places[2].rows[0].member.id,'b');
assert(renderPrizes(100,tied).includes('Rem&#237;za'));
assert(prizeStandings([{member:{name:'Zero'},distance:0}]).every(item=>!item.rows.length));
assert.equal((renderPrizes(100,[]).match(/class="prize-names"/g)||[]).length,3);
console.log('PASS: three compact prize blocks with ranked names, no leader banner/photos, ties, zero-distance state and escaping.');
