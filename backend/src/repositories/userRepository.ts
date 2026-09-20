import { pool } from '../db';
import { queries } from '../db/queries';
import { UserAuthProfile, UserRow } from '../types/rows';

export const userRepository = {
  async findAuthProfile(authId: string | undefined): Promise<UserAuthProfile | undefined> {
    const result = await pool.query<UserAuthProfile>(queries.getUserAuthProfile, [authId]);
    return result.rows[0];
  },

  async findById(id: number): Promise<UserRow | undefined> {
    const result = await pool.query<UserRow>(queries.getUserById, [id]);
    return result.rows[0];
  },

  async upsertFromFirebase(
    authId: string,
    email: string | null,
    displayName: string,
    campus: string
  ): Promise<UserRow> {
    const result = await pool.query<UserRow>(queries.upsertUser, [
      authId,
      email,
      displayName,
      'student',
      campus,
    ]);
    return result.rows[0];
  },

  async updateProfile(
    id: number,
    displayName: string,
    campus: string
  ): Promise<UserRow | undefined> {
    const result = await pool.query<UserRow>(queries.updateUserProfile, [displayName, campus, id]);
    return result.rows[0];
  },

  async registerDeviceToken(userId: number, token: string): Promise<void> {
    await pool.query(queries.upsertDeviceToken, [userId, token]);
  },
};
