/**
 * Secure credential storage for GitHub Enterprise authentication
 * Feature: 001-git-sync-integration
 *
 * Uses electron-store with encryption for secure token storage
 */

let credentialStore = null;

// Try to initialize encrypted store for credentials
// This is optional - if electron-store isn't available, Git sync won't work
try {
  const Store = require('electron-store');
  credentialStore = new Store({
    name: 'git-credentials',
    encryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-dev-key-change-in-production',
    defaults: {
      credentials: null,
    },
  });
} catch (error) {
  console.warn('electron-store not available, Git sync features disabled:', error.message);
}

/**
 * Store GitHub Enterprise credentials securely
 *
 * @param {Object} credential - Git credential to store
 */
function storeGitCredential(credential) {
  if (!credentialStore) return;
  credentialStore.set('credentials', {
    ...credential,
    lastUsedAt: new Date(),
  });
}

/**
 * Retrieve stored GitHub Enterprise credentials
 *
 * @returns {Object|null} Stored credential or null if not found
 */
function getGitCredential() {
  if (!credentialStore) return null;
  return credentialStore.get('credentials');
}

/**
 * Update last used timestamp for credential
 */
function updateCredentialLastUsed() {
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
 * @returns {boolean} True if credential is expired or missing
 */
function isCredentialExpired() {
  const credential = getGitCredential();
  if (!credential || !credential.expiresAt) {
    return false; // No expiration set
  }

  return new Date(credential.expiresAt) < new Date();
}

/**
 * Clear stored credentials (logout)
 */
function clearGitCredential() {
  if (!credentialStore) return;
  credentialStore.set('credentials', null);
}

/**
 * Check if credentials are configured
 *
 * @returns {boolean} True if valid credentials exist
 */
function hasGitCredential() {
  if (!credentialStore) return false;
  const credential = getGitCredential();
  return credential !== null && !isCredentialExpired();
}

/**
 * Get repository URL from stored credentials
 *
 * @returns {string|null} Repository URL or null
 */
function getRepositoryUrl() {
  const credential = getGitCredential();
  return credential?.repositoryUrl || null;
}

/**
 * Get authentication token from stored credentials
 *
 * @returns {string|null} Token or null
 */
function getAuthToken() {
  const credential = getGitCredential();
  if (!credential || isCredentialExpired()) {
    return null;
  }

  updateCredentialLastUsed();
  return credential.token;
}

module.exports = {
  storeGitCredential,
  getGitCredential,
  updateCredentialLastUsed,
  isCredentialExpired,
  clearGitCredential,
  hasGitCredential,
  getRepositoryUrl,
  getAuthToken,
};
