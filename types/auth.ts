// User type - update this to match your backend user schema
export interface User {
  id: string;
  email: string;
  name?: string;
  // Add other user fields as needed
}

// Auth error types
export class AuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  session?: {
    token: string;
    expiresAt: Date;
  };
}
