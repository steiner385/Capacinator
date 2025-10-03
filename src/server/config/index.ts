export const config = {
  features: {
    audit: process.env.AUDIT_ENABLED === 'true' || process.env.NODE_ENV === 'e2e'
  }
};