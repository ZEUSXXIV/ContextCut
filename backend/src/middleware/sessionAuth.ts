import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { Session } from '../models/Session';

/**
 * Express middleware to authenticate users using secure signed cookie sessions.
 * Expects the cookie to be named 'session_token' and signed using cookie-parser.
 */
export async function sessionAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionToken = req.signedCookies?.session_token;

    if (!sessionToken) {
      res.status(401).json({ error: 'Unauthorized: Session token is missing.' });
      return;
    }

    // Find the session and populate the referenced User
    const session = await Session.findOne({ sessionToken }).populate('userId');
    if (!session) {
      res.status(401).json({ error: 'Unauthorized: Invalid session.' });
      return;
    }

    // Check expiry
    if (session.expiresAt && session.expiresAt < new Date()) {
      await Session.deleteOne({ _id: session._id });
      res.status(401).json({ error: 'Unauthorized: Session has expired.' });
      return;
    }

    const user = session.userId as any; // Cast as populated user
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User not found for this session.' });
      return;
    }

    // Attach user to the request context
    req.user = user;
    next();
  } catch (error) {
    console.error('Session auth middleware error:', error);
    res.status(500).json({ error: 'Internal Server Error during session authentication.' });
  }
}
