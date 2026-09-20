import { buildAlertStatistics } from '../services/alertStatistics';

const empty = { byType: [], byPriority: [], byStatus: [], byDayOfWeek: [] };

describe('buildAlertStatistics', () => {
  it('returns zeros and nulls when there are no alerts', () => {
    const stats = buildAlertStatistics(empty);

    expect(stats.totalAlerts).toBe(0);
    expect(stats.busiestDay).toBeNull();
    expect(stats.mostCommonType).toBeNull();
    expect(stats.byDayOfWeek.map((day) => day.count)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(stats.byDayOfWeek.map((day) => day.label)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
  });

  it('totals statuses and splits them into the named counters', () => {
    const stats = buildAlertStatistics({
      ...empty,
      byStatus: [
        { status: 'active', count: 4 },
        { status: 'investigating', count: 2 },
        { status: 'resolved', count: 9 },
      ],
    });

    expect(stats).toMatchObject({
      totalAlerts: 15,
      activeAlerts: 4,
      investigatingAlerts: 2,
      resolvedAlerts: 9,
    });
  });

  it('maps Postgres Sunday-first weekdays onto a Monday-first week', () => {
    const stats = buildAlertStatistics({
      ...empty,
      byStatus: [{ status: 'active', count: 6 }],
      byDayOfWeek: [
        { dow: 0, count: 1 },
        { dow: 1, count: 2 },
        { dow: 6, count: 3 },
      ],
    });

    expect(stats.byDayOfWeek).toEqual([
      { label: 'Mon', count: 2 },
      { label: 'Tue', count: 0 },
      { label: 'Wed', count: 0 },
      { label: 'Thu', count: 0 },
      { label: 'Fri', count: 0 },
      { label: 'Sat', count: 3 },
      { label: 'Sun', count: 1 },
    ]);
    expect(stats.busiestDay).toBe('Sat');
  });

  it('reports the most common type and keeps type and priority breakdowns', () => {
    const stats = buildAlertStatistics({
      ...empty,
      byType: [
        { type: 'fire', count: 5 },
        { type: 'medical', count: 2 },
      ],
      byPriority: [{ priority: 'high', count: 7 }],
    });

    expect(stats.mostCommonType).toBe('fire');
    expect(stats.byType).toEqual([
      { label: 'fire', count: 5 },
      { label: 'medical', count: 2 },
    ]);
    expect(stats.byPriority).toEqual([{ label: 'high', count: 7 }]);
  });
});
