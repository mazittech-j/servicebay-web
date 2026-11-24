import { regions } from './regions.mjs';

// Busy periods stay in source. The website receives only the
// public team labels and free windows, with an expiry time for this snapshot.
export const dispatchSchedule = {
  validUntil: null,
  teams: [],
};

const hour = 60 * 60 * 1000;
const horizon = 14 * 24 * hour;
const timestamp = value => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
const interval = ([start, end]) => [timestamp(start), timestamp(end)];

export function createDispatchFeed(schedule, now = Date.now()) {
  const expires = timestamp(schedule.validUntil);
  if (!Number.isFinite(expires) || expires <= now) return { validUntil: null, slots: [] };

  const slots = [];
  const latest = now + horizon;
  for (const team of schedule.teams) {
    if (!Object.hasOwn(regions, team.country) || !team.areas.length || !team.properties.length) continue;
    const busy = team.busy.map(interval);
    if (busy.some(([start, end]) => !(start < end))) continue;
    for (const [shiftStart, shiftEnd] of team.shifts.map(interval)) {
      if (!(shiftStart < shiftEnd)) continue;
      const first = shiftStart + Math.max(0, Math.ceil((now - shiftStart) / hour)) * hour;
      for (let start = first; start + hour <= Math.min(shiftEnd, latest); start += hour) {
        if (busy.some(([from, to]) => start < to && start + hour > from)) continue;
        slots.push({
          country: team.country,
          areas: team.areas,
          properties: team.properties,
          team: team.label,
          start: new Date(start).toISOString(),
          end: new Date(start + hour).toISOString(),
        });
      }
    }
  }
  slots.sort((left, right) => left.start.localeCompare(right.start));
  return { validUntil: new Date(expires).toISOString(), slots };
}
