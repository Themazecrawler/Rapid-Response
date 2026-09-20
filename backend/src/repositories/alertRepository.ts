import { pool } from '../db';
import { queries } from '../db/queries';
import {
  AlertRow,
  StatsByDayRow,
  StatsByPriorityRow,
  StatsByStatusRow,
  StatsByTypeRow,
} from '../types/rows';

export interface NewAlert {
  userId: number;
  type: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  building: string | null;
  floor: string | null;
  priority: string;
  reporterPhone: string | null;
  clientAlertId: string;
}

export const alertRepository = {
  async create(alert: NewAlert): Promise<AlertRow | undefined> {
    const result = await pool.query<AlertRow>(queries.createAlert, [
      alert.userId,
      alert.type,
      alert.description,
      alert.latitude,
      alert.longitude,
      alert.building,
      alert.floor,
      'active',
      alert.priority,
      alert.reporterPhone,
      alert.clientAlertId,
    ]);
    return result.rows[0];
  },

  async findByClientAlertId(clientAlertId: string): Promise<AlertRow | undefined> {
    const result = await pool.query<AlertRow>(queries.getAlertByClientId, [clientAlertId]);
    return result.rows[0];
  },

  async findWithReporterById(id: number): Promise<AlertRow | undefined> {
    const result = await pool.query<AlertRow>(queries.getAlertWithReporterById, [id]);
    return result.rows[0];
  },

  async listAfterId(afterId: number, limit: number): Promise<AlertRow[]> {
    const result = await pool.query<AlertRow>(queries.getAlertsAfterId, [afterId, limit]);
    return result.rows;
  },

  async listRecent(limit: number, offset: number): Promise<AlertRow[]> {
    const result = await pool.query<AlertRow>(queries.getRecentAlerts, [limit, offset]);
    return result.rows;
  },

  async listByUser(userId: number, limit: number, offset: number): Promise<AlertRow[]> {
    const result = await pool.query<AlertRow>(queries.getAlertsByUser, [userId, limit, offset]);
    return result.rows;
  },

  async statistics(): Promise<{
    byType: StatsByTypeRow[];
    byPriority: StatsByPriorityRow[];
    byStatus: StatsByStatusRow[];
    byDayOfWeek: StatsByDayRow[];
  }> {
    const [byType, byPriority, byStatus, byDayOfWeek] = await Promise.all([
      pool.query<StatsByTypeRow>(queries.statsByType),
      pool.query<StatsByPriorityRow>(queries.statsByPriority),
      pool.query<StatsByStatusRow>(queries.statsByStatus),
      pool.query<StatsByDayRow>(queries.statsByDayOfWeek),
    ]);
    return {
      byType: byType.rows,
      byPriority: byPriority.rows,
      byStatus: byStatus.rows,
      byDayOfWeek: byDayOfWeek.rows,
    };
  },
};
