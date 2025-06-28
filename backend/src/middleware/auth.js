import jwt from 'jsonwebtoken';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const authMiddleware = async (c, next) => {
  const authorization = c.req.header('Authorization');

  if (!authorization) {
    return c.json(
      {
        error: 'Authorization header is required',
        message: 'Please provide a valid token',
      },
      401
    );
  }

  const token = authorization.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user still exists in database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.sub))
      .get();

    if (!user) {
      return c.json(
        {
          error: 'Invalid token',
          message: 'User not found',
        },
        401
      );
    }

    // Add user data to context
    c.set('user', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    c.set('token', decoded);
    await next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return c.json(
        {
          error: 'Token expired',
          message: 'Token has expired, please login again',
        },
        401
      );
    } else if (error.name === 'JsonWebTokenError') {
      return c.json(
        {
          error: 'Invalid token',
          message: 'Token is malformed or invalid',
        },
        401
      );
    } else {
      return c.json(
        {
          error: 'Authentication failed',
          message: 'Token verification failed',
        },
        401
      );
    }
  }
};

// Role-based access control middleware
export const requireRole = (allowedRoles) => {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json(
        {
          error: 'Authentication required',
          message: 'Please login to access this resource',
        },
        401
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          error: 'Insufficient permissions',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        },
        403
      );
    }

    await next();
  };
};

// Mentor-only access
export const requireMentor = requireRole(['mentor']);

// Mentee-only access
export const requireMentee = requireRole(['mentee']);

// Both mentor and mentee access
export const requireUser = requireRole(['mentor', 'mentee']);

export const generateToken = (user) => {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    // RFC 7519 standard claims
    iss: 'mentor-mentee-api',
    sub: user.id.toString(), // Ensure sub is string
    aud: 'mentor-mentee-app',
    exp: now + 3600, // 1 hour expiration
    nbf: now,
    iat: now,
    jti: `${user.id}-${now}-${Math.random().toString(36).substr(2, 9)}`, // More unique JTI
    // Custom claims
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
};

// Token validation utility (for testing purposes)
export const validateToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Extract user info from token without middleware
export const getUserFromToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.sub))
      .get();

    return user || null;
  } catch (error) {
    return null;
  }
};
