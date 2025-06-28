import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';
import {
  authMiddleware,
  requireMentee,
  requireUser,
} from '../middleware/auth.js';
import { z } from 'zod';

const mentorRoutes = new Hono();

// Validation schema for query parameters (OpenAPI spec compliant)
const getMentorsQuerySchema = z.object({
  skill: z.string().min(1).max(50).optional(),
  orderBy: z.enum(['skill', 'name']).optional(),
});

// Get all mentors with filtering and sorting (OpenAPI spec compliant)
mentorRoutes.get('/', authMiddleware, requireMentee, async (c) => {
  try {
    // Parse and validate query parameters
    const queryParams = {
      skill: c.req.query('skill'),
      orderBy: c.req.query('orderBy'),
    };

    const validationResult = getMentorsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      return c.json(
        {
          error: 'Invalid query parameters',
          message: errorMessages,
        },
        400
      );
    }

    const { skill, orderBy } = validationResult.data;

    // Build base query
    let query = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        bio: users.bio,
        profileImage: users.profileImage,
        techStack: users.techStack,
        createdAt: users.createdAt,
      })
      .from(users);

    // Apply filters
    const conditions = [eq(users.role, 'mentor')];

    // Filter by skill (exact or partial match)
    if (skill) {
      conditions.push(like(users.techStack, `%"${skill}"%`));
    }

    // Apply conditions
    query = query.where(and(...conditions));

    // Apply ordering
    if (orderBy === 'name') {
      query = query.orderBy(asc(users.name));
    } else if (orderBy === 'skill') {
      query = query.orderBy(asc(users.techStack));
    } else {
      // Default order by creation date (newest first)
      query = query.orderBy(desc(users.createdAt));
    }

    const mentors = await query;

    // Transform results to match OpenAPI spec
    const formattedMentors = mentors.map((mentor) => ({
      id: mentor.id,
      email: mentor.email,
      role: 'mentor',
      profile: {
        name: mentor.name,
        bio: mentor.bio || '',
        imageUrl: mentor.profileImage || `/images/mentor/${mentor.id}`,
        skills: mentor.techStack ? JSON.parse(mentor.techStack) : [],
      },
    }));

    return c.json(formattedMentors);
  } catch (error) {
    console.error('Get mentors error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch mentors',
      },
      500
    );
  }
});

export default mentorRoutes;
