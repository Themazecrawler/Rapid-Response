type Timestamp = Date | string;

export type AlertRow = {
  id: number;
  user_id: number;
  type: string;
  description: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  building: string | null;
  floor: string | null;
  status: string;
  priority: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  resolved_at: Timestamp | null;
  reporter_name?: string | null;
  reporter_phone?: string | null;
  client_alert_id?: string | null;
};

export type UserRow = {
  id: number;
  email: string | null;
  display_name: string | null;
  role: string;
  campus: string | null;
  created_at: Timestamp;
};

export type UserAuthProfile = {
  id: number;
  role: string;
};

export type ContactRow = {
  id: number;
  name: string;
  role: string;
  phone: string;
  email: string;
  department: string;
  available: boolean;
};

export type CountRow = { count: number };
export type StatsByTypeRow = CountRow & { type: string };
export type StatsByPriorityRow = CountRow & { priority: string };
export type StatsByStatusRow = CountRow & { status: string };
export type StatsByDayRow = CountRow & { dow: number };
