import { alertRepository } from '../repositories/alertRepository';
import { StatsByDayRow, StatsByPriorityRow, StatsByStatusRow, StatsByTypeRow } from '../types/rows';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface AlertStatistics {
  totalAlerts: number;
  activeAlerts: number;
  investigatingAlerts: number;
  resolvedAlerts: number;
  byType: { label: string; count: number }[];
  byPriority: { label: string; count: number }[];
  byDayOfWeek: { label: string; count: number }[];
  mostCommonType: string | null;
  busiestDay: string | null;
}

export const buildAlertStatistics = (rows: {
  byType: StatsByTypeRow[];
  byPriority: StatsByPriorityRow[];
  byStatus: StatsByStatusRow[];
  byDayOfWeek: StatsByDayRow[];
}): AlertStatistics => {
  const totalAlerts = rows.byStatus.reduce((sum, row) => sum + row.count, 0);
  const statusCounts: Record<string, number> = {};
  rows.byStatus.forEach((row) => {
    statusCounts[row.status] = row.count;
  });

  // Postgres DOW is 0 (Sun) .. 6 (Sat); rotate into a Mon..Sun array, defaulting to 0.
  const dowCounts = new Array<number>(7).fill(0);
  rows.byDayOfWeek.forEach((row) => {
    const mondayFirstIndex = (row.dow + 6) % 7;
    dowCounts[mondayFirstIndex] = row.count;
  });
  const byDayOfWeek = DAY_LABELS.map((label, i) => ({ label, count: dowCounts[i] }));

  const busiestDay = byDayOfWeek.reduce(
    (max, entry) => (entry.count > max.count ? entry : max),
    byDayOfWeek[0]
  );

  return {
    totalAlerts,
    activeAlerts: statusCounts['active'] ?? 0,
    investigatingAlerts: statusCounts['investigating'] ?? 0,
    resolvedAlerts: statusCounts['resolved'] ?? 0,
    byType: rows.byType.map((row) => ({ label: row.type, count: row.count })),
    byPriority: rows.byPriority.map((row) => ({ label: row.priority, count: row.count })),
    byDayOfWeek,
    mostCommonType: rows.byType[0]?.type ?? null,
    busiestDay: totalAlerts > 0 ? busiestDay.label : null,
  };
};

export const loadAlertStatistics = async (): Promise<AlertStatistics> =>
  buildAlertStatistics(await alertRepository.statistics());
