import { mapAlertRow } from '../utils/serializers';

describe('mapAlertRow', () => {
  it('maps snake_case Postgres columns to camelCase fields', () => {
    const row = {
      id: 1,
      user_id: 42,
      type: 'medical',
      description: 'Someone fainted',
      latitude: '40.7128',
      longitude: '-74.0060',
      building: 'Library',
      floor: '2',
      status: 'active',
      priority: 'high',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      resolved_at: null,
      reporter_name: 'Jane Doe',
      reporter_phone: '+15555550100',
      client_alert_id: 'abc-123',
    };

    expect(mapAlertRow(row)).toEqual({
      id: 1,
      userId: 42,
      type: 'medical',
      description: 'Someone fainted',
      latitude: 40.7128,
      longitude: -74.006,
      building: 'Library',
      floor: '2',
      status: 'active',
      priority: 'high',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      resolvedAt: null,
      reporterName: 'Jane Doe',
      reporterPhone: '+15555550100',
      clientAlertId: 'abc-123',
    });
  });

  it('defaults optional reporter fields to null instead of undefined', () => {
    const row = {
      id: 1,
      user_id: 42,
      type: 'fire',
      description: null,
      latitude: null,
      longitude: null,
      building: null,
      floor: null,
      status: 'active',
      priority: 'low',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      resolved_at: null,
      client_alert_id: 'def-456',
    };

    const mapped = mapAlertRow(row);
    expect(mapped.reporterName).toBeNull();
    expect(mapped.reporterPhone).toBeNull();
    expect(mapped.latitude).toBeNull();
    expect(mapped.longitude).toBeNull();
  });
});
