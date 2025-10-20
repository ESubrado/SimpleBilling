/**
 * Configuration file for API endpoints and environment variables
 */

const config = {
  backend: {
    baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000',
    endpoints: {
      extractText: '/extract-text',
    }
  }
} as const;

export default config;