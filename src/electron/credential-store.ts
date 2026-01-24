/**
 * Secure credential storage for GitHub Enterprise authentication
 * Feature: 001-git-sync-integration
 *
 * Uses electron-store with encryption for secure token storage
 */

import Store from 'electron-store';
import type { GitCredential } from '../../shared/types/git-entities.js';

// Initialize encrypted store for credentials
const credentialStore = new Store<{ credentials: GitCredential | null }>({
  name: 'git-credentials',
  encryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-dev-key-change-in-production',
  defaults: {
    credentials: null,
  },
}) as any; // Type assertion to work around electron-store type inference issues

/**
 * Store GitHub Enterprise credentials securely
 *
 * @param credential - Git credential to store
 */
export function storeGitCredential(credential: GitCredential): void {
  credentialStore.set('credentials', {
    ...credential,
    lastUsedAt: new Date(),
  });
}

/**
 * Retrieve stored GitHub Enterprise credentials
 *
 * @returns Stored credential or null if not found
 */
export function getGitCredential(): GitCredential | null {
  return credentialStore.get('credentials');
}

/**
 * Update last used timestamp for credential
 */
export function updateCredentialLastUsed(): void {
  const credential = getGitCredential();
  if (credential) {
    storeGitCredential({
      ...credential,
      lastUsedAt: new Date(),
    });
  }
}

/**
 * Check if stored credential is expired
 *
 * @returns True if credential is expired or missing
 */
export function isCredentialExpired(): boolean {
  const credential = getGitCredential();
  if (!credential || !credential.expiresAt) {
    return false; // No expiration set
  }

  return new Date(credential.expiresAt) < new Date();
}

/**
 * Clear stored credentials (logout)
 */
export function clearGitCredential(): void {
  credentialStore.set('credentials', null);
}

/**
 * Check if credentials are configured
 *
 * @returns True if valid credentials exist
 */
export function hasGitCredential(): boolean {
  const credential = getGitCredential();
  return credential !== null && !isCredentialExpired();
}

/**
 * Get repository URL from stored credentials
 *
 * @returns Repository URL or null
 */
export function getRepositoryUrl(): string | null {
  const credential = getGitCredential();
  return credential?.repositoryUrl || null;
}

/**
 * Get authentication token from stored credentials
 *
 * @returns Token or null
 */
export function getAuthToken(): string | null {
  const credential = getGitCredential();
  if (!credential || isCredentialExpired()) {
    return null;
  }

  updateCredentialLastUsed();
  return credential.token;
}
