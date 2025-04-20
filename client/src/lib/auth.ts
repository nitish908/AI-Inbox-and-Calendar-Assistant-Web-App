// This file handles authentication and OAuth flows

import { apiRequest } from "./queryClient";

export interface AuthState {
  isAuthenticated: boolean;
  user?: {
    id: number;
    username: string;
    email: string;
    displayName?: string;
    profileImage?: string;
  };
}

// Initial auth state
export const initialAuthState: AuthState = {
  isAuthenticated: false,
};

// Check if user is authenticated
export async function checkAuth(): Promise<AuthState> {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });

    if (!response.ok) {
      return initialAuthState;
    }

    const user = await response.json();
    return {
      isAuthenticated: true,
      user,
    };
  } catch (error) {
    return initialAuthState;
  }
}

// Log in with username and password
export async function login(username: string, password: string): Promise<AuthState> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const user = await response.json();
    return {
      isAuthenticated: true,
      user,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      isAuthenticated: false,
    };
  } finally {
    // Cleanup if needed
  }
}

// Log out
export async function logout(): Promise<void> {
  await apiRequest('POST', '/api/auth/logout');
}

// Initiate OAuth flow for a service
export async function initiateOAuth(service: string): Promise<void> {
  try {
    const response = await fetch(`/api/auth/${service}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OAuth initialization failed for ${service}`);
    }

    const data = await response.json();
    window.location.href = data.authUrl;
  } catch (error) {
    console.error('OAuth error:', error);
    throw error;
  }
}

// Get connected services
export async function getConnectedServices(): Promise<string[]> {
  const response = await fetch('/api/connections');
  if (!response.ok) {
    throw new Error('Failed to get connected services');
  }

  const data = await response.json();
  return data.connections.map((conn: any) => conn.service);
}