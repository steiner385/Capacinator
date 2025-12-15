/**
 * Server Configuration Module
 *
 * Re-exports centralized environment configuration and feature flags.
 */

export {
  env,
  getEnv,
  resetEnv,
  isAuditEnabled,
  isTableAudited,
  type EnvConfig,
  type Environment,
  type ServerConfig,
  type DatabaseConfig,
  type AuthConfig,
  type FileUploadConfig,
  type EmailConfig,
  type SmtpConfig,
  type LoggingConfig,
  type ClientLoggingConfig,
  type AuditConfig,
  type AppConfig,
  type FeatureFlags,
} from './env.js';

// Legacy config export for backward compatibility
// TODO: Remove this after all usages are migrated to env.*
import { env } from './env.js';

export const config = {
  features: {
    get audit() {
      return env.audit.enabled;
    }
  }
};
