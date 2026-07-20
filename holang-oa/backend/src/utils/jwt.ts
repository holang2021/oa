import jwt, { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'holang-crm-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  id: string;
  name: string;
  role: string;
}

/**
 * Generate JWT token
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JwtPayload | null {
  return jwt.decode(token) as JwtPayload | null;
}
