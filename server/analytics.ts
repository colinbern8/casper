import { ISSUE_CATEGORIES, TICKET_PRIORITIES, type AnalyticsSummary, type SupportCase, type Ticket } from '../src/types';

const HOUR = 3_600_000;

/** The value at fraction `q` (0 to 1) of sorted numbers, by the nearest-rank method. Null when empty. */
export function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const rank = Math.ceil(q * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
}

const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

/**
 * Admin analytics for the last `days` days: tickets opened in the period (per school, by category),
 * time to resolve for tickets resolved in the period, and how student self-help chats ended.
 * Pure: give it the data and a clock.
 */
export function computeAnalytics(tickets: Ticket[], cases: SupportCase[], now = new Date(), days = 30): AnalyticsSummary {
  const from = now.getTime() - days * 24 * HOUR;
  const opened = tickets.filter(t => Date.parse(t.createdAt) >= from);
  const resolvedInPeriod = tickets.filter(t => t.status === 'resolved' && t.resolvedAt && Date.parse(t.resolvedAt) >= from);
  const hours = (t: Ticket) => (Date.parse(t.resolvedAt!) - Date.parse(t.createdAt)) / HOUR;

  const schools = new Map<string, { open: number; resolved: number }>();
  for (const t of opened) {
    const row = schools.get(t.school) ?? { open: 0, resolved: 0 };
    if (t.status === 'resolved') row.resolved += 1;
    else row.open += 1;
    schools.set(t.school, row);
  }

  const timeToResolve = TICKET_PRIORITIES.map(priority => {
    const list = resolvedInPeriod.filter(t => t.priority === priority).map(hours).sort((a, b) => a - b);
    return { priority, resolved: list.length, medianHours: round1(quantile(list, 0.5)), p90Hours: round1(quantile(list, 0.9)) };
  }).filter(r => r.resolved > 0);

  const categories = ISSUE_CATEGORIES.map(category => ({ category, count: opened.filter(t => t.category === category).length }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  const recentCases = cases.filter(c => Date.parse(c.createdAt) >= from);
  const count = (o: SupportCase['outcome']) => recentCases.filter(c => c.outcome === o).length;
  const selfHelp = { resolved: count('resolved'), escalated: count('escalated'), blocked: count('blocked'), open: count('open') };
  const finished = selfHelp.resolved + selfHelp.escalated + selfHelp.blocked;

  return {
    days,
    generatedAt: now.toISOString(),
    totals: {
      tickets: opened.length,
      open: opened.filter(t => t.status !== 'resolved').length,
      resolved: opened.filter(t => t.status === 'resolved').length,
      medianHoursToResolve: round1(quantile(resolvedInPeriod.map(hours).sort((a, b) => a - b), 0.5)),
    },
    perSchool: [...schools.entries()].map(([school, v]) => ({ school, ...v })).sort((a, b) => b.open + b.resolved - (a.open + a.resolved) || a.school.localeCompare(b.school)),
    timeToResolve,
    topCategories: categories,
    selfHelp: { ...selfHelp, selfResolvedRate: finished ? Math.round((selfHelp.resolved / finished) * 100) / 100 : null },
  };
}
