/**
 * Environment-based configuration for API and Socket connections.
 *
 * Variables are read from .env.development (local dev) or .env.production (builds):
 *   EXPO_PUBLIC_API_URL    - Base URL for REST API endpoints
 *   EXPO_PUBLIC_SOCKET_URL - URL for Socket.io connection (defaults to API URL if not set)
 */

function getApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (url) return url;
  if (__DEV__) {
    console.warn(
      "EXPO_PUBLIC_API_URL not set — falling back to http://localhost:3001"
    );
    return "http://localhost:3001";
  }
  throw new Error(
    "EXPO_PUBLIC_API_URL environment variable is required in production"
  );
}

function getSocketUrl(): string {
  const url = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (url) return url;
  // Default to the API URL when no separate socket URL is configured
  return getApiUrl();
}

export const API_BASE_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();
