import { localDate } from './weeks.js';
const escape = (value) => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const money = amount => `${Number(amount).toFixed(2).replace('.', ',')} &euro;`;
export const installmentKey = (memberId, month, itemId) => `${month}_${memberId}_${itemId}`;
export function paymentInstallments(row) {
  return [{itemId:'base', label:'Z&#225;klad', amount:10, closed:true}, ...row.statuses.map(week => ({itemId:week.start, label:week.label, amount:week.closed ? week.missingRuns * 2.5 : 0, closed:week.closed}))];
}
export function installmentStatus(row, month, item, records, legacy, pending = new Map()) {
  const key = installmentKey(row.member.id, month, item.itemId);
  const record = pending.get(key) || records.get(key);
  let legacyDate;
  const timestamp = legacy?.updatedAt;
  if (typeof timestamp?.toDate === 'function') legacyDate = localDate(timestamp.toDate());
  const inherited = !record && legacy?.paid === true && (item.itemId === 'base' || (legacyDate && row.statuses.find(week => week.start === item.itemId)?.end < legacyDate));
  const credit = record ? record.paid === true ? Number(record.amount) || 0 : 0 : inherited ? item.amount : 0;
  const paidAmount = Math.min(item.amount, Math.max(credit, 0));
  return {...item, key, inherited:!!inherited, pending:pending.has(key), paidAmount, remaining:Math.max(item.amount - paidAmount, 0), paid:item.closed && paidAmount >= item.amount};
}
export function memberPaymentBalance(row, month, records, legacy, pending) {
  const items = paymentInstallments(row).map(item => installmentStatus(row,month,item,records,legacy,pending));
  return {items, due:items.reduce((sum,item)=>sum+item.amount,0), paid:items.reduce((sum,item)=>sum+item.paidAmount,0), remaining:items.reduce((sum,item)=>sum+item.remaining,0)};
}
export function renderPaymentTable(rows, weeks, month, {records, legacyRecords, pending, ready, isAdmin}) {
  if (!rows.length) return '<p class="muted">Najprv pridaj &#269;lenov.</p>';
  const headings = ['<th scope="col">0. Z&#225;klad<br><small>Mesa&#269;n&#253; pr&#237;spevok</small></th>', ...weeks.map((week,index) => `<th scope="col">${index+1}. t&#253;&#382;de&#328;<br><small>${escape(week.label.replace(/ \(.*\)/,''))}</small></th>`)];
  let totalDue = 0, totalPaid = 0;
  const body = rows.map(row => {
    const balance = memberPaymentBalance(row,month,records,legacyRecords.get(`${month}_${row.member.id}`),pending);
    totalDue += balance.due; totalPaid += balance.paid;
    const cells = balance.items.map(item => {
      if (!item.closed) return '<td class="installment-future"><span>&mdash;</span><small>Neukon&#269;en&#253;</small></td>';
      if (!item.amount) return '<td class="installment-zero"><span>0,00 &euro;</span><small>Bez pokuty</small></td>';
      if (!ready) return `<td><span class="installment-amount">${money(item.amount)}</span><small class="muted">Stav nedostupn&#253;</small></td>`;
      const text = item.pending ? 'Uklad&#225;m&#8230;' : item.paid ? 'Zaplaten&#233;' : item.paidAmount ? `Doplati&#357; ${money(item.remaining)}` : 'Nezaplaten&#233;';
      const control = isAdmin ? `<label class="installment-check"><input type="checkbox" class="installment-checkbox" data-member-id="${escape(row.member.id)}" data-month="${month}" data-item-id="${item.itemId}" ${item.paid ? 'checked' : ''} ${item.pending ? 'disabled' : ''} aria-label="Zaplaten&#233;: ${escape(row.member.name)}, ${month}, ${item.itemId === 'base' ? 'z&#225;klad' : escape(item.label)}"><span>${text}</span></label>` : `<small>${text}</small>`;
      return `<td class="installment-cell ${item.paid ? 'settled' : 'outstanding'}"><strong class="installment-amount">${money(item.amount)}</strong>${control}${item.inherited ? '<small class="installment-inherited">Star&#353;ie ozna&#269;enie mesiaca</small>' : ''}</td>`;
    }).join('');
    return `<tr><th scope="row">${escape(row.member.name)}</th>${cells}<td class="installment-balance ${ready && balance.remaining === 0 ? 'balance-settled' : ''}"><strong>${ready ? money(balance.remaining) : '&mdash;'}</strong><small>${ready ? balance.remaining === 0 ? '&#10003; Zaplaten&#233;' : `z ${money(balance.due)}` : 'Stav nedostupn&#253;'}</small></td></tr>`;
  }).join('');
  return `<table class="installments-table"><caption class="sr-only">Evidencia platieb za ${month}</caption><thead><tr><th scope="col">&#268;len</th>${headings.join('')}<th scope="col">Zost&#225;va</th></tr></thead><tbody>${body}</tbody><tfoot><tr><th scope="row" colspan="${weeks.length+2}">${ready ? `Zaplaten&#233; ${money(totalPaid)} z ${money(totalDue)}` : 'Stav platieb nedostupn&#253;'}</th><td><strong>${ready ? money(totalDue-totalPaid) : '&mdash;'}</strong></td></tr></tfoot></table>`;
}
