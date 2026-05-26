import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

/**
 * Express middleware to authenticate users via their secure 'omni_gt_...' API key.
 * Supports token extraction from:
 * 1. Authorization header (e.g. Bearer omni_gt_12345)
 * 2. Query parameters (e.g. ?apiKey=omni_gt_12345 or ?token=omni_gt_12345)
 */
export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let apiKey: string | undefined;

    // 1. Try to extract from Authorization Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      apiKey = authHeader.substring(7).trim();
    }

    // 2. Try to extract from Query Parameters if header was not provided
    if (!apiKey) {
      const qApiKey = req.query.apiKey || req.query.token;
      if (typeof qApiKey === 'string') {
        apiKey = qApiKey.trim();
      }
    }

    if (!apiKey) {
      res.status(401).json({
        error: 'Unauthorized: API Key is required. Provide it as Bearer token or apiKey/token query parameter.',
      });
      return;
    }

    if (!apiKey.startsWith('omni_gt_')) {
      res.status(401).json({
        error: 'Unauthorized: Invalid API Key format. Must start with "omni_gt_".',
      });
      return;
    }

    // Look up the tenant associated with this API key
    const user = await User.findOne({ apiKey });
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized: Invalid API Key.',
      });
      return;
    }

    // Attach user/tenant details to request
    req.user = user;
    next();
  } catch (error: any) {
    console.error('Error during API key authentication:', error);
    res.status(500).json({ error: 'Internal Server Error during authentication.' });
  }
}
