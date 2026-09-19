import 'express';

// Firebase owns identity (uid/email); our own `users` table owns app data (id/role),
// resolved separately by the resolveUser middleware once a profile exists.
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: {
        firebaseUid: string;
        email: string | null;
        id?: number;
        role?: string;
      };
    }
  }
}
