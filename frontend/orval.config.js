import { defineConfig } from 'orval';

export default defineConfig({
  mentor: {
    input: {
      target: 'http://localhost:8080/openapi.json',
    },
    output: {
      target: './src/api/generated.js',
      client: 'axios',
      baseUrl: 'http://localhost:8080/api',
      override: {
        mutator: {
          path: './src/api/axios-instance.js',
          name: 'axiosInstance',
        },
      },
    },
  },
});
