import { Hono } from 'hono';
import bcrypt from 'bcrypt';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateToken } from '../middleware/auth.js';
import { z } from 'zod';

const auth = new Hono();

// Enhanced validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(100, 'Password must be less than 100 characters'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  role: z.enum(['mentor', 'mentee'], {
    errorMap: () => ({ message: 'Role must be either "mentor" or "mentee"' }),
  }),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// User registration
auth.post('/signup', async (c) => {
  try {
    const body = await c.req.json();

    // Validate input
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      return c.json(
        {
          error: 'Validation failed',
          message: errorMessages,
        },
        400
      );
    }

    const { email, password, name, role } = validationResult.data;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (existingUser) {
      return c.json(
        {
          error: 'User already exists',
          message: 'A user with this email already exists',
        },
        400
      );
    }

    // Hash password with higher salt rounds for security
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with timestamp
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log(`New user registered: ${email} as ${role}`);

    return c.json(
      {
        message: 'User created successfully',
        userId: newUser.id,
      },
      201
    );
  } catch (error) {
    console.error('Signup error:', error);

    // Handle specific database errors
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return c.json(
        {
          error: 'User already exists',
          message: 'A user with this email already exists',
        },
        400
      );
    }

    return c.json(
      {
        error: 'Internal server error',
        message: 'Failed to create user. Please try again later.',
      },
      500
    );
  }
});

// User login
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();

    // Validate input
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      return c.json(
        {
          error: 'Validation failed',
          message: errorMessages,
        },
        400
      );
    }

    const { email, password } = validationResult.data;

    // Find user by email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!user) {
      // Same error message for security (don't reveal if email exists)
      return c.json(
        {
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
        },
        401
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return c.json(
        {
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
        },
        401
      );
    }

    // Generate JWT token
    const token = generateToken(user);

    // Update last login time
    await db
      .update(users)
      .set({ updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .execute();

    console.log(`User logged in: ${email}`);

    // Return token and basic user info (as per OpenAPI spec)
    return c.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      200
    );
  } catch (error) {
    console.error('Login error:', error);

    return c.json(
      {
        error: 'Internal server error',
        message: 'Login failed. Please try again later.',
      },
      500
    );
  }
});

// Token validation endpoint (useful for frontend to check if token is still valid)
auth.get('/validate', async (c) => {
  try {
    const authorization = c.req.header('Authorization');

    if (!authorization) {
      return c.json(
        {
          error: 'No token provided',
          message: 'Authorization header is required',
        },
        401
      );
    }

    const token = authorization.replace('Bearer ', '');

    // Use our auth middleware validation logic
    const { validateToken, getUserFromToken } = await import(
      '../middleware/auth.js'
    );

    const decoded = validateToken(token);
    if (!decoded) {
      return c.json(
        {
          error: 'Invalid token',
          message: 'Token is invalid or expired',
        },
        401
      );
    }

    // Check if user still exists
    const user = await getUserFromToken(token);
    if (!user) {
      return c.json(
        {
          error: 'User not found',
          message: 'User associated with token no longer exists',
        },
        401
      );
    }

    return c.json(
      {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
      },
      200
    );
  } catch (error) {
    console.error('Token validation error:', error);
    return c.json(
      {
        error: 'Validation failed',
        message: 'Unable to validate token',
      },
      500
    );
  }
});

// Password strength checker (helper endpoint)
auth.post('/check-password', async (c) => {
  try {
    const body = await c.req.json();
    const { password } = z.object({ password: z.string() }).parse(body);

    const checks = {
      length: password.length >= 6,
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;
    let strength = 'weak';
    if (score >= 4) strength = 'strong';
    else if (score >= 3) strength = 'medium';

    return c.json(
      {
        strength,
        score,
        checks,
        valid: checks.length,
      },
      200
    );
  } catch (error) {
    return c.json(
      {
        error: 'Invalid request',
        message: 'Password is required',
      },
      400
    );
  }
});

export default auth;
