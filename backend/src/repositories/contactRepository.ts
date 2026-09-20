import { pool } from '../db';
import { queries } from '../db/queries';
import { ContactRow } from '../types/rows';

export interface NewContact {
  name: string;
  role: string;
  phone: string;
  email: string;
  department: string;
}

export const contactRepository = {
  async listAvailable(): Promise<ContactRow[]> {
    const result = await pool.query<ContactRow>(queries.getAvailableContacts);
    return result.rows;
  },

  async listAll(): Promise<ContactRow[]> {
    const result = await pool.query<ContactRow>(queries.getAllContacts);
    return result.rows;
  },

  async create(contact: NewContact): Promise<ContactRow> {
    const result = await pool.query<ContactRow>(queries.createContact, [
      contact.name,
      contact.role,
      contact.phone,
      contact.email,
      contact.department,
    ]);
    return result.rows[0];
  },

  async setAvailability(id: string | number, available: boolean): Promise<ContactRow | undefined> {
    const result = await pool.query<ContactRow>(queries.updateContactAvailability, [available, id]);
    return result.rows[0];
  },
};
