/**
 * Configuration file for API endpoints and environment variables
 */

const config = {
  backend: {
    //baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://simplebillingbackend.onrender.com',
    baseUrl: 'https://simplebillingbackend.onrender.com',
    endpoints: {
      extractText: '/extract-text',
    }
  }
} as const;

export default config;