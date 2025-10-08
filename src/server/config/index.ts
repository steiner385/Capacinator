export const config = {
  features: {
    get audit() {
      return process.env.AUDIT_ENABLED === 'true' || process.env.NODE_ENV === 'e2e';
    }
  }
};