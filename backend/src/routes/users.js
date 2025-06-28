import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, requireUser } from '../middleware/auth.js';
import { z } from 'zod';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const userRoutes = new Hono();

// Enhanced validation schemas
const updateMentorProfileSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  role: z.literal('mentor'),
  bio: z.string().max(1000, 'Bio too long').optional(),
  image: z.string().optional(), // Base64 encoded image
  skills: z
    .array(z.string().min(1).max(50))
    .max(20, 'Too many skills')
    .optional(),
});

const updateMenteeProfileSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  role: z.literal('mentee'),
  bio: z.string().max(1000, 'Bio too long').optional(),
  image: z.string().optional(), // Base64 encoded image
});

// Legacy schema for /me endpoint
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  bio: z.string().max(1000).optional(),
  profileImage: z.string().optional(),
  techStack: z.array(z.string()).optional(),
});

// Get current user profile
userRoutes.get('/me', authMiddleware, requireUser, async (c) => {
  try {
    const currentUser = c.get('user');

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.id))
      .get();

    if (!user) {
      return c.json(
        {
          error: 'User not found',
          message: 'User profile not found',
        },
        404
      );
    }

    // Format response based on OpenAPI spec
    const baseProfile = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    if (user.role === 'mentor') {
      return c.json({
        ...baseProfile,
        profile: {
          name: user.name,
          bio: user.bio || '',
          imageUrl: user.profileImage || `/images/mentor/${user.id}`,
          skills: user.techStack ? JSON.parse(user.techStack) : [],
        },
      });
    } else {
      return c.json({
        ...baseProfile,
        profile: {
          name: user.name,
          bio: user.bio || '',
          imageUrl: user.profileImage || `/images/mentee/${user.id}`,
        },
      });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch user profile',
      },
      500
    );
  }
});

// Update user profile (OpenAPI spec compliant)
userRoutes.put('/profile', authMiddleware, requireUser, async (c) => {
  try {
    const currentUser = c.get('user');
    const body = await c.req.json();

    // Validate based on user role
    let validationResult;
    if (currentUser.role === 'mentor') {
      validationResult = updateMentorProfileSchema.safeParse(body);
    } else {
      validationResult = updateMenteeProfileSchema.safeParse(body);
    }

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

    const updateData = validationResult.data;

    // Verify user ID matches current user
    if (updateData.id !== currentUser.id) {
      return c.json(
        {
          error: 'Access denied',
          message: 'You can only update your own profile',
        },
        403
      );
    }

    // Prepare updates
    const updates = {
      updatedAt: new Date(),
    };

    if (updateData.name) updates.name = updateData.name;
    if (updateData.bio !== undefined) updates.bio = updateData.bio;

    // Handle profile image
    if (updateData.image) {
      try {
        const imageUrl = await saveProfileImage(
          updateData.image,
          currentUser.role,
          currentUser.id
        );
        updates.profileImage = imageUrl;
      } catch (imageError) {
        console.error('Profile image save error:', imageError);
        return c.json(
          {
            error: 'Image processing failed',
            message: 'Failed to save profile image',
          },
          400
        );
      }
    }

    // Handle mentor skills
    if (updateData.skills && currentUser.role === 'mentor') {
      updates.techStack = JSON.stringify(updateData.skills);
    }

    // Update user in database
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, currentUser.id))
      .returning();

    // Format response based on user role
    const baseProfile = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    };

    if (updatedUser.role === 'mentor') {
      return c.json({
        ...baseProfile,
        profile: {
          name: updatedUser.name,
          bio: updatedUser.bio || '',
          imageUrl:
            updatedUser.profileImage || `/images/mentor/${updatedUser.id}`,
          skills: updatedUser.techStack
            ? JSON.parse(updatedUser.techStack)
            : [],
        },
      });
    } else {
      return c.json({
        ...baseProfile,
        profile: {
          name: updatedUser.name,
          bio: updatedUser.bio || '',
          imageUrl:
            updatedUser.profileImage || `/images/mentee/${updatedUser.id}`,
        },
      });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'Failed to update user profile',
      },
      500
    );
  }
});

// Helper function to save profile image
async function saveProfileImage(base64Image, role, userId) {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(__dirname, '../../uploads/images', role);
    await mkdir(uploadsDir, { recursive: true });

    // Decode base64 image
    const matches = base64Image.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image format');
    }

    const imageType = matches[1];
    const imageData = matches[2];

    // Validate image type
    if (!['jpeg', 'jpg', 'png', 'gif'].includes(imageType.toLowerCase())) {
      throw new Error('Unsupported image type');
    }

    const buffer = Buffer.from(imageData, 'base64');

    // Check file size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error('Image file too large (max 5MB)');
    }

    const filename = `${userId}.${imageType}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    return `/images/${role}/${userId}`;
  } catch (error) {
    console.error('Save profile image error:', error);
    throw error;
  }
}

// Legacy update endpoint (for backward compatibility)
userRoutes.put('/me', authMiddleware, requireUser, async (c) => {
  try {
    const currentUser = c.get('user');
    const body = await c.req.json();

    const validationResult = updateProfileSchema.safeParse(body);
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

    const updateData = validationResult.data;

    const updates = {
      updatedAt: new Date(),
    };

    if (updateData.name) updates.name = updateData.name;
    if (updateData.bio !== undefined) updates.bio = updateData.bio;
    if (updateData.profileImage !== undefined)
      updates.profileImage = updateData.profileImage;
    if (updateData.techStack && currentUser.role === 'mentor') {
      updates.techStack = JSON.stringify(updateData.techStack);
    }

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, currentUser.id))
      .returning();

    return c.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      bio: updatedUser.bio,
      profileImage:
        updatedUser.profileImage ||
        `/images/${updatedUser.role}/${updatedUser.id}`,
      techStack: updatedUser.techStack ? JSON.parse(updatedUser.techStack) : [],
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'Failed to update user profile',
      },
      500
    );
  }
});

// Get profile image
userRoutes.get('/images/:role/:id', async (c) => {
  try {
    const { role, id } = c.req.param();

    // Validate parameters
    if (!['mentor', 'mentee'].includes(role)) {
      return c.json(
        {
          error: 'Invalid role',
          message: 'Role must be either "mentor" or "mentee"',
        },
        400
      );
    }

    const userId = parseInt(id);
    if (isNaN(userId) || userId <= 0) {
      return c.json(
        {
          error: 'Invalid user ID',
          message: 'User ID must be a positive integer',
        },
        400
      );
    }

    // Check if user exists and has the correct role
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      return c.json(
        {
          error: 'User not found',
          message: 'User with specified ID does not exist',
        },
        404
      );
    }

    if (user.role !== role) {
      return c.json(
        {
          error: 'Role mismatch',
          message: 'User role does not match requested role',
        },
        400
      );
    }

    // Try to find image file
    const uploadsDir = join(__dirname, '../../uploads/images', role);
    const extensions = ['jpg', 'jpeg', 'png', 'gif'];

    for (const ext of extensions) {
      try {
        const filepath = join(uploadsDir, `${userId}.${ext}`);
        const imageBuffer = await readFile(filepath);

        // Set appropriate content type
        const mimeTypes = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
        };

        c.header('Content-Type', mimeTypes[ext]);
        c.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

        return c.body(imageBuffer);
      } catch (error) {
        // File doesn't exist, continue to next extension
        continue;
      }
    }

    // No image found, return default avatar
    try {
      const defaultImagePath = join(
        __dirname,
        '../../assets/default-avatar.svg'
      );
      const defaultImage = await readFile(defaultImagePath, 'utf-8');

      c.header('Content-Type', 'image/svg+xml');
      c.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

      return c.text(defaultImage);
    } catch (error) {
      // Default image not found, return 404
      return c.json(
        {
          error: 'Image not found',
          message: 'Profile image not available',
        },
        404
      );
    }
  } catch (error) {
    console.error('Get profile image error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve profile image',
      },
      500
    );
  }
});

// Image upload endpoint
userRoutes.post('/upload-image', authMiddleware, requireUser, async (c) => {
  try {
    const currentUser = c.get('user');
    const formData = await c.req.formData();
    const imageFile = formData.get('image');

    if (!imageFile || typeof imageFile === 'string') {
      return c.json(
        {
          error: 'Bad request',
          message: 'No image file provided',
        },
        400
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return c.json(
        {
          error: 'Bad request',
          message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed',
        },
        400
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageFile.size > maxSize) {
      return c.json(
        {
          error: 'File too large',
          message: 'File size must be less than 5MB',
        },
        413
      );
    }

    // Get user role for directory structure
    const userRecord = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1);

    if (userRecord.length === 0) {
      return c.json(
        {
          error: 'User not found',
          message: 'User not found',
        },
        404
      );
    }

    const role = userRecord[0].role;

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(__dirname, '../../uploads/images', role);
    await mkdir(uploadsDir, { recursive: true });

    // Generate filename
    const ext = imageFile.type.split('/')[1];
    const filename = `${currentUser.id}_${Date.now()}.${ext}`;
    const filepath = join(uploadsDir, filename);

    // Save file
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filepath, buffer);

    // Return the image URL
    const imageUrl = `http://localhost:8080/uploads/images/${role}/${filename}`;

    return c.json({
      imageUrl,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'Failed to upload image',
      },
      500
    );
  }
});

export default userRoutes;
