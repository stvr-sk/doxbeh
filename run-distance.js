export function registrationDate(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Bratislava',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function originalRegistrationDate(run) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(run?.recordedOn || '')) return run.recordedOn;
  if (typeof run?.createdAt?.toDate === 'function') return registrationDate(run.createdAt.toDate());
  return run?.date || registrationDate();
}
export function distanceBreakdown(run) {
  const original = Math.max(0, Number(run.distance) || 0);
  const enabled = run.penaltyVersion === 1;
  const indoorRate = enabled && run.indoor === true ? 0.1 : 0;
  const lateRate = enabled && run.recordedOn >= '2026-11-14' && run.date < run.recordedOn ? 0.5 : 0;
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const afterIndoor = original * (1 - indoorRate);
  const credited = round(afterIndoor * (1 - lateRate));
  return {original,credited,indoorRate,lateRate,rate:1-(1-indoorRate)*(1-lateRate),indoorLoss:round(original*indoorRate),lateLoss:round(afterIndoor*lateRate),loss:round(original-credited)};
}
export const creditedDistance = run => distanceBreakdown(run).credited;
