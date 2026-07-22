import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Pool } from 'pg';

// --- CONFIGURATION ---
const JWT_SECRET = process.env.JWT_SECRET || 'ifastx_secret_2024';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'ifastx_refresh_2024';

/**
 * GENERATE TOKENS
 * Creates both access and refresh tokens for a user session.
 */
export const generateTokens = (user: { id: string; role: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * VERIFY ACCESS TOKEN
 * Standard middleware helper to decode the primary session token.
 */
export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; role: string };
  } catch (err) {
    return null;
  }
};

/**
 * ROTATE TOKENS (REFRESH LOGIC)
 * Validates a refresh token against the database and issues a new pair.
 */
export const rotateTokens = async (userId: string, refreshToken: string, pool: Pool) => {
  try {
    // 1. Verify the refresh token structure/signature
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { id: string };

    if (decoded.id !== userId) {
      throw new Error('Unauthorized: Token identity mismatch');
    }

    // 2. Check database for existing refresh token (Persistence Check)
    const result = await pool.query(
      'SELECT id, role, refresh_token FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    // Security check: Match current refresh token to prevent reuse attacks if one-time use is enforced
    if (user.refresh_token !== refreshToken) {
      throw new Error('Token revoked or already used');
    }

    // 3. Issue new tokens
    const tokens = generateTokens({ id: user.id, role: user.role });

    // 4. Update DB with new refresh token
    await pool.query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [tokens.refreshToken, userId]
    );

    return tokens;
  } catch (err: any) {
    console.error('[Security] Rotation Failed:', err.message);
    throw new Error('Session expired. Please log in again.');
  }
};

/**
 * PASSWORD MANAGEMENT
 */
export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

/**
 * API KEY GENERATION
 * Generates a secure, cryptographically random key for external API access.
 */
export const generateApiKey = () => {
  const bytes = crypto.randomBytes(24).toString('hex');
  return `sk_live_${bytes}`;
};

/**
 * SUBSCRIPTION ENFORCEMENT
 * Checks if a user's subscription is valid and not suspended.
 */
export const checkSubscriptionAccess = (user: any) => {
  if (!user.subscription) return false;
  
  if (user.subscription.status === 'suspended') return false;
  
  if (user.subscription.expiryDate) {
    const now = new Date();
    const expiry = new Date(user.subscription.expiryDate);
    if (expiry < now) return false;
  }

  return true;
};

/**
 * RBAC HELPER
 * Ensures a user has the minimum required role for an operation.
 */
export const hasRole = (userRole: string, requiredRole: string) => {
  const roles = ['admin', 'reseller', 'superadmin'];
  const userIdx = roles.indexOf(userRole);
  const reqIdx = roles.indexOf(requiredRole);
  
  return userIdx >= reqIdx;
};
