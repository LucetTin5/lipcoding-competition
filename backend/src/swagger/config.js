import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const loadOpenAPISpec = () => {
  try {
    // Load the OpenAPI spec from the root directory
    const specPath = join(__dirname, '../../../openapi.yaml');
    const specContent = readFileSync(specPath, 'utf-8');
    return specContent;
  } catch (error) {
    console.error('Failed to load OpenAPI spec:', error);
    return null;
  }
};

export const loadOpenAPIJSON = () => {
  // 항상 동적으로 생성된 스펙을 반환
  return generateDynamicOpenAPISpec();
};

// 서버의 실제 API 구조를 기반으로 OpenAPI 스펙을 동적 생성
export const generateDynamicOpenAPISpec = () => {
  return {
    openapi: '3.0.1',
    info: {
      title: 'Mentor-Mentee Matching API',
      description:
        'API for matching mentors and mentees in a mentoring platform - Generated from server routes',
      version: '1.0.0',
      contact: {
        name: 'Mentor-Mentee Matching App',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:8080/api',
        description: 'Local development server',
      },
    ],
    security: [
      {
        BearerAuth: [],
      },
    ],
    paths: {
      '/signup': {
        post: {
          operationId: 'signup',
          tags: ['Authentication'],
          summary: 'User registration',
          description: 'Register a new user as either a mentor or mentee',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SignupRequest',
                },
              },
            },
          },
          responses: {
            201: {
              description: 'User successfully created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          email: { type: 'string' },
                          name: { type: 'string' },
                          role: { type: 'string', enum: ['mentor', 'mentee'] },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Bad request - invalid payload format',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/login': {
        post: {
          operationId: 'login',
          tags: ['Authentication'],
          summary: 'User login',
          description: 'Authenticate user and return JWT token',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginRequest',
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['token'],
                    properties: {
                      token: { type: 'string' },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/users/me': {
        get: {
          operationId: 'getCurrentUser',
          tags: ['User Profile'],
          summary: 'Get current user information',
          responses: {
            200: {
              description: 'User information retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      { $ref: '#/components/schemas/MentorProfile' },
                      { $ref: '#/components/schemas/MenteeProfile' },
                    ],
                  },
                },
              },
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        put: {
          operationId: 'updateCurrentUser',
          tags: ['User Profile'],
          summary: 'Update current user profile',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', minLength: 1, maxLength: 100 },
                    bio: { type: 'string', maxLength: 1000 },
                    profileImage: { type: 'string' },
                    techStack: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Profile updated successfully',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      { $ref: '#/components/schemas/MentorProfile' },
                      { $ref: '#/components/schemas/MenteeProfile' },
                    ],
                  },
                },
              },
            },
            400: {
              description: 'Bad request - invalid input',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/users/profile': {
        put: {
          operationId: 'updateUserProfile',
          tags: ['User Profile'],
          summary: 'Update user profile with role-specific validation',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      type: 'object',
                      required: ['id', 'name', 'role'],
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string', minLength: 1, maxLength: 100 },
                        role: { type: 'string', enum: ['mentor'] },
                        bio: { type: 'string', maxLength: 1000 },
                        image: {
                          type: 'string',
                          description: 'Base64 encoded image',
                        },
                        skills: {
                          type: 'array',
                          items: { type: 'string', maxLength: 50 },
                          maxItems: 20,
                        },
                      },
                    },
                    {
                      type: 'object',
                      required: ['id', 'name', 'role'],
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string', minLength: 1, maxLength: 100 },
                        role: { type: 'string', enum: ['mentee'] },
                        bio: { type: 'string', maxLength: 1000 },
                        image: {
                          type: 'string',
                          description: 'Base64 encoded image',
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Profile updated successfully',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      { $ref: '#/components/schemas/MentorProfile' },
                      { $ref: '#/components/schemas/MenteeProfile' },
                    ],
                  },
                },
              },
            },
            400: {
              description: 'Bad request - validation failed',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            403: {
              description: 'Forbidden - cannot update other users',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/users/upload-image': {
        post: {
          operationId: 'uploadProfileImage',
          tags: ['User Profile'],
          summary: 'Upload profile image',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['image'],
                  properties: {
                    image: {
                      type: 'string',
                      format: 'binary',
                      description: 'Image file (JPEG, PNG, WebP, max 5MB)',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Image uploaded successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['imageUrl'],
                    properties: {
                      imageUrl: { type: 'string', format: 'uri' },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Bad request - invalid file',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            413: {
              description: 'File too large',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/mentors': {
        get: {
          operationId: 'getMentors',
          tags: ['Mentors'],
          summary: 'Get list of mentors (mentee only)',
          parameters: [
            {
              name: 'skill',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description: 'Filter mentors by skill',
            },
            {
              name: 'orderBy',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['skill', 'name'] },
              description: 'Sort mentors by skill or name',
            },
          ],
          responses: {
            200: {
              description: 'Mentor list retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/MentorListItem' },
                  },
                },
              },
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/match-requests': {
        post: {
          operationId: 'createMatchRequest',
          tags: ['Match Requests'],
          summary: 'Send match request (mentee only)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['mentorId', 'menteeId', 'message'],
                  properties: {
                    mentorId: { type: 'integer' },
                    menteeId: { type: 'integer' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Match request sent successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MatchRequest' },
                },
              },
            },
            400: {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/match-requests/incoming': {
        get: {
          operationId: 'getIncomingMatchRequests',
          tags: ['Match Requests'],
          summary: 'Get incoming match requests (mentor only)',
          responses: {
            200: {
              description: 'Incoming match requests retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/MatchRequest' },
                  },
                },
              },
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/match-requests/outgoing': {
        get: {
          operationId: 'getOutgoingMatchRequests',
          tags: ['Match Requests'],
          summary: 'Get outgoing match requests (mentee only)',
          responses: {
            200: {
              description: 'Outgoing match requests retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        mentorId: { type: 'integer' },
                        menteeId: { type: 'integer' },
                        status: {
                          type: 'string',
                          enum: [
                            'pending',
                            'accepted',
                            'rejected',
                            'cancelled',
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/match-requests/{id}/accept': {
        put: {
          operationId: 'acceptMatchRequest',
          tags: ['Match Requests'],
          summary: 'Accept match request (mentor only)',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              description: 'Match request ID',
            },
          ],
          responses: {
            200: {
              description: 'Match request accepted successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MatchRequest' },
                },
              },
            },
            404: {
              description: 'Match request not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/match-requests/{id}/reject': {
        put: {
          operationId: 'rejectMatchRequest',
          tags: ['Match Requests'],
          summary: 'Reject match request (mentor only)',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              description: 'Match request ID',
            },
          ],
          responses: {
            200: {
              description: 'Match request rejected successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MatchRequest' },
                },
              },
            },
            404: {
              description: 'Match request not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/match-requests/{id}': {
        delete: {
          operationId: 'cancelMatchRequest',
          tags: ['Match Requests'],
          summary: 'Cancel match request (mentee only)',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              description: 'Match request ID',
            },
          ],
          responses: {
            200: {
              description: 'Match request cancelled successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MatchRequest' },
                },
              },
            },
            404: {
              description: 'Match request not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            500: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoint',
        },
      },
      schemas: {
        SignupRequest: {
          type: 'object',
          required: ['email', 'password', 'name', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            role: { type: 'string', enum: ['mentor', 'mentee'] },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'string' },
          },
        },
        MentorProfile: {
          type: 'object',
          required: ['id', 'email', 'role', 'profile'],
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['mentor'] },
            profile: {
              type: 'object',
              required: ['name', 'bio', 'imageUrl', 'skills'],
              properties: {
                name: { type: 'string' },
                bio: { type: 'string' },
                imageUrl: { type: 'string' },
                skills: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
        MenteeProfile: {
          type: 'object',
          required: ['id', 'email', 'role', 'profile'],
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['mentee'] },
            profile: {
              type: 'object',
              required: ['name', 'bio', 'imageUrl'],
              properties: {
                name: { type: 'string' },
                bio: { type: 'string' },
                imageUrl: { type: 'string' },
              },
            },
          },
        },
        MentorListItem: {
          type: 'object',
          required: ['id', 'email', 'role', 'profile'],
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['mentor'] },
            profile: {
              type: 'object',
              required: ['name', 'bio', 'imageUrl', 'skills'],
              properties: {
                name: { type: 'string' },
                bio: { type: 'string' },
                imageUrl: { type: 'string' },
                skills: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
        MatchRequest: {
          type: 'object',
          required: ['id', 'mentorId', 'menteeId', 'message', 'status'],
          properties: {
            id: { type: 'integer' },
            mentorId: { type: 'integer' },
            menteeId: { type: 'integer' },
            message: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'rejected', 'cancelled'],
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'User Profile',
        description: 'User profile management endpoints',
      },
      {
        name: 'Mentors',
        description: 'Mentor listing endpoints',
      },
      {
        name: 'Match Requests',
        description: 'Match request management endpoints',
      },
    ],
  };
};

export const openAPIJSON = generateDynamicOpenAPISpec();
