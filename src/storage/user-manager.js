/**
 * User Manager
 *
 * Manages user identity for the commenting system.
 * Generates and persists a unique user ID using localStorage.
 * Designed to be extensible for future multi-user and AI chat features.
 */

const USER_ID_KEY = 'hotnote_user_id';
const USER_NAME_KEY = 'hotnote_user_name';

/**
 * Get or generate a persistent user ID
 * @returns {string} UUID v4 string
 */
export function getUserId() {
  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    // Generate a new UUID using the browser's crypto API
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
    console.log('Generated new user ID:', userId);
  }

  return userId;
}

/**
 * Get the user's display name (optional)
 * @returns {string} Display name or 'Anonymous User' if not set
 */
export function getUserDisplayName() {
  return localStorage.getItem(USER_NAME_KEY) || 'Anonymous User';
}

/**
 * Set the user's display name
 * @param {string} name - Display name to set
 */
export function setUserDisplayName(name) {
  if (name && typeof name === 'string') {
    const trimmed = name.trim();
    if (trimmed) {
      localStorage.setItem(USER_NAME_KEY, trimmed);
    }
  }
}

/**
 * Check if a user ID belongs to the current user
 * @param {string} userId - User ID to check
 * @returns {boolean} True if it's the current user
 */
export function isCurrentUser(userId) {
  return userId === getUserId();
}

/**
 * Get user info object
 * @returns {{id: string, displayName: string}} User info
 */
export function getUserInfo() {
  return {
    id: getUserId(),
    displayName: getUserDisplayName(),
  };
}

/**
 * Clear user data (for testing or reset purposes)
 * WARNING: This will remove the user ID, creating a new identity on next access
 */
export function clearUserData() {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  console.log('User data cleared');
}
