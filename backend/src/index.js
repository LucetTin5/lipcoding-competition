import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import mentorRoutes from './routes/mentors.js';
import matchRoutes from './routes/matches.js';
import {
  loadOpenAPISpec,
  loadOpenAPIJSON,
  generateDynamicOpenAPISpec,
} from './swagger/config.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['*'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check
app.get('/', (c) => {
  return c.json({
    message: 'Mentor-Mentee Matching API',
    version: '1.0.0',
    status: 'healthy',
  });
});

// API routes
const api = new Hono();
api.route('/', authRoutes);
api.route('/users', userRoutes);
api.route('/mentors', mentorRoutes);
api.route('/', matchRoutes);

app.route('/api', api);

// Swagger UI
app.get(
  '/swagger-ui',
  swaggerUI({
    url: '/openapi.json',
  })
);

// OpenAPI spec endpoint
app.get('/openapi.json', (c) => {
  const openAPIData = generateDynamicOpenAPISpec();
  return c.json(openAPIData);
});

// Serve OpenAPI YAML if requested
app.get('/openapi.yaml', (c) => {
  const spec = loadOpenAPISpec();
  if (spec) {
    c.header('Content-Type', 'application/x-yaml');
    return c.text(spec);
  }
  return c.json({ error: 'OpenAPI spec not found' }, 404);
});

// Static file serving for uploaded images
app.get('/uploads/*', async (c) => {
  try {
    const filePath = c.req.path.substring(1); // Remove leading '/'
    const fullPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      filePath
    );

    const fileContent = await readFile(fullPath);
    const ext = filePath.split('.').pop()?.toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'svg') contentType = 'image/svg+xml';

    c.header('Content-Type', contentType);
    c.header('Cache-Control', 'public, max-age=31536000'); // 1 year cache

    return c.body(fileContent);
  } catch (error) {
    return c.json({ error: 'File not found' }, 404);
  }
});

// Default avatar serving
app.get('/assets/*', async (c) => {
  try {
    const filePath = c.req.path.substring(1); // Remove leading '/'
    const fullPath = join(dirname(fileURLToPath(import.meta.url)), filePath);

    const fileContent = await readFile(fullPath);
    const ext = filePath.split('.').pop()?.toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === 'svg') contentType = 'image/svg+xml';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';

    c.header('Content-Type', contentType);
    c.header('Cache-Control', 'public, max-age=31536000'); // 1 year cache

    return c.body(fileContent);
  } catch (error) {
    return c.json({ error: 'Asset not found' }, 404);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not found',
      message: 'The requested endpoint does not exist',
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: 'An unexpected error occurred',
    },
    500
  );
});

const port = process.env.PORT || 8080;

console.log(`🚀 Server is running on http://localhost:${port}`);
console.log(`📚 Swagger UI available at http://localhost:${port}/swagger-ui`);
console.log(
  `📋 OpenAPI spec available at http://localhost:${port}/openapi.json`
);

serve({
  fetch: app.fetch,
  port: Number(port),
});
