import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { matches, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import {
  authMiddleware,
  requireMentee,
  requireMentor,
  requireUser,
} from '../middleware/auth.js';
import { z } from 'zod';

const matchRoutes = new Hono();

// Validation schemas
const createMatchRequestSchema = z.object({
  mentorId: z.number().int().positive(),
  message: z.string().min(1).max(500),
  menteeId: z.number().int().positive().optional(), // Accept but ignore for frontend compatibility
});

// POST /match-requests - Create match request (mentee only)
matchRoutes.post(
  '/match-requests',
  authMiddleware,
  requireMentee,
  async (c) => {
    try {
      const currentUser = c.get('user');
      const body = await c.req.json();

      const validationResult = createMatchRequestSchema.safeParse(body);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');

        return c.json(
          {
            error: 'Bad request - invalid payload format',
            message: errorMessages,
          },
          400
        );
      }

      const { mentorId, menteeId, message } = validationResult.data;

      // Verify mentee ID matches current user
      if (menteeId !== currentUser.id) {
        return c.json(
          {
            error: 'Bad request - invalid payload format',
            message: 'menteeId must match authenticated user',
          },
          400
        );
      }

      // Check if mentor exists
      const mentor = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(eq(users.id, mentorId), eq(users.role, 'mentor')))
        .get();

      if (!mentor) {
        return c.json(
          {
            error: 'Bad request - invalid payload or mentor not found',
            message: 'The specified mentor does not exist',
          },
          400
        );
      }

      // Check if mentee already has a pending request to this mentor
      const existingRequest = await db
        .select({ id: matches.id })
        .from(matches)
        .where(
          and(
            eq(matches.menteeId, currentUser.id),
            eq(matches.mentorId, mentorId),
            eq(matches.status, 'pending')
          )
        )
        .get();

      if (existingRequest) {
        return c.json(
          {
            error: 'Bad request - invalid payload or mentor not found',
            message: 'You already have a pending request to this mentor',
          },
          400
        );
      }

      // Create match request
      const [newMatch] = await db
        .insert(matches)
        .values({
          mentorId,
          menteeId: currentUser.id,
          status: 'pending',
          message,
        })
        .returning();

      return c.json({
        id: newMatch.id,
        mentorId: newMatch.mentorId,
        menteeId: newMatch.menteeId,
        message: newMatch.message,
        status: newMatch.status,
        createdAt: newMatch.createdAt,
        updatedAt: newMatch.updatedAt,
      });
    } catch (error) {
      console.error('Create match request error:', error);
      return c.json(
        {
          error: 'Internal server error',
          message: 'Failed to create match request',
        },
        500
      );
    }
  }
);

// GET /match-requests/incoming - Get incoming match requests (mentor only)
matchRoutes.get(
  '/match-requests/incoming',
  authMiddleware,
  requireMentor,
  async (c) => {
    try {
      const currentUser = c.get('user');

      const incomingRequests = await db
        .select({
          id: matches.id,
          mentorId: matches.mentorId,
          menteeId: matches.menteeId,
          message: matches.message,
          status: matches.status,
          createdAt: matches.createdAt,
          updatedAt: matches.updatedAt,
          mentee: {
            name: users.name,
            email: users.email,
            profileImage: users.profileImage,
          },
        })
        .from(matches)
        .leftJoin(users, eq(matches.menteeId, users.id))
        .where(eq(matches.mentorId, currentUser.id))
        .orderBy(matches.createdAt);

      return c.json(incomingRequests);
    } catch (error) {
      console.error('Get incoming match requests error:', error);
      return c.json(
        {
          error: 'Internal server error',
          message: 'Failed to fetch incoming match requests',
        },
        500
      );
    }
  }
);

// GET /match-requests/outgoing - Get outgoing match requests (mentee only)
matchRoutes.get(
  '/match-requests/outgoing',
  authMiddleware,
  requireMentee,
  async (c) => {
    try {
      const currentUser = c.get('user');

      const outgoingRequests = await db
        .select({
          id: matches.id,
          mentorId: matches.mentorId,
          menteeId: matches.menteeId,
          message: matches.message,
          status: matches.status,
          createdAt: matches.createdAt,
          updatedAt: matches.updatedAt,
          mentor: {
            name: users.name,
            email: users.email,
            profileImage: users.profileImage,
          },
        })
        .from(matches)
        .leftJoin(users, eq(matches.mentorId, users.id))
        .where(eq(matches.menteeId, currentUser.id))
        .orderBy(matches.createdAt);

      return c.json(outgoingRequests);
    } catch (error) {
      console.error('Get outgoing match requests error:', error);
      return c.json(
        {
          error: 'Internal server error',
          message: 'Failed to fetch outgoing match requests',
        },
        500
      );
    }
  }
);

// PUT /match-requests/:id/accept - Accept match request (mentor only)
matchRoutes.put(
  '/match-requests/:id/accept',
  authMiddleware,
  requireMentor,
  async (c) => {
    try {
      const currentUser = c.get('user');
      const matchId = parseInt(c.req.param('id'));

      if (isNaN(matchId)) {
        return c.json(
          {
            error: 'Match request not found',
            message: 'Invalid match request ID',
          },
          404
        );
      }

      // Check if match exists and belongs to this mentor
      const existingMatch = await db
        .select()
        .from(matches)
        .where(
          and(
            eq(matches.id, matchId),
            eq(matches.mentorId, currentUser.id),
            eq(matches.status, 'pending')
          )
        )
        .get();

      if (!existingMatch) {
        return c.json(
          {
            error: 'Match request not found',
            message:
              'The specified match request does not exist or is not pending',
          },
          404
        );
      }

      // Update match status to accepted
      const [updatedMatch] = await db
        .update(matches)
        .set({
          status: 'accepted',
          updatedAt: new Date(),
        })
        .where(eq(matches.id, matchId))
        .returning();

      return c.json({
        id: updatedMatch.id,
        mentorId: updatedMatch.mentorId,
        menteeId: updatedMatch.menteeId,
        message: updatedMatch.message,
        status: updatedMatch.status,
      });
    } catch (error) {
      console.error('Accept match request error:', error);
      return c.json(
        {
          error: 'Internal server error',
          message: 'Failed to accept match request',
        },
        500
      );
    }
  }
);

// PUT /match-requests/:id/reject - Reject match request (mentor only)
matchRoutes.put(
  '/match-requests/:id/reject',
  authMiddleware,
  requireMentor,
  async (c) => {
    try {
      const currentUser = c.get('user');
      const matchId = parseInt(c.req.param('id'));

      if (isNaN(matchId)) {
        return c.json(
          {
            error: 'Match request not found',
            message: 'Invalid match request ID',
          },
          404
        );
      }

      // Check if match exists and belongs to this mentor
      const existingMatch = await db
        .select()
        .from(matches)
        .where(
          and(
            eq(matches.id, matchId),
            eq(matches.mentorId, currentUser.id),
            eq(matches.status, 'pending')
          )
        )
        .get();

      if (!existingMatch) {
        return c.json(
          {
            error: 'Match request not found',
            message:
              'The specified match request does not exist or is not pending',
          },
          404
        );
      }

      // Update match status to rejected
      const [updatedMatch] = await db
        .update(matches)
        .set({
          status: 'rejected',
          updatedAt: new Date(),
        })
        .where(eq(matches.id, matchId))
        .returning();

      return c.json({
        id: updatedMatch.id,
        mentorId: updatedMatch.mentorId,
        menteeId: updatedMatch.menteeId,
        message: updatedMatch.message,
        status: updatedMatch.status,
      });
    } catch (error) {
      console.error('Reject match request error:', error);
      return c.json(
        {
          error: 'Internal server error',
          message: 'Failed to reject match request',
        },
        500
      );
    }
  }
);

// DELETE /match-requests/:id - Cancel match request (mentee only)
matchRoutes.delete(
  '/match-requests/:id',
  authMiddleware,
  requireMentee,
  async (c) => {
    try {
      const currentUser = c.get('user');
      const matchId = parseInt(c.req.param('id'));

      if (isNaN(matchId)) {
        return c.json(
          {
            error: 'Match request not found',
            message: 'Invalid match request ID',
          },
          404
        );
      }

      // Check if match exists and belongs to this mentee
      const existingMatch = await db
        .select()
        .from(matches)
        .where(
          and(eq(matches.id, matchId), eq(matches.menteeId, currentUser.id))
        )
        .get();

      if (!existingMatch) {
        return c.json(
          {
            error: 'Match request not found',
            message:
              'The specified match request does not exist or does not belong to you',
          },
          404
        );
      }

      // Update match status to cancelled
      const [updatedMatch] = await db
        .update(matches)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(matches.id, matchId))
        .returning();

      return c.json({
        id: updatedMatch.id,
        mentorId: updatedMatch.mentorId,
        menteeId: updatedMatch.menteeId,
        message: updatedMatch.message,
        status: updatedMatch.status,
      });
    } catch (error) {
      console.error('Cancel match request error:', error);
      return c.json(
        {
          error: 'Internal server error',
          message: 'Failed to cancel match request',
        },
        500
      );
    }
  }
);

export default matchRoutes;
