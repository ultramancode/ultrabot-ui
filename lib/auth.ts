import { API_BASE_URL } from './constants';

export interface User {
  id: string;
  email: string;
  type: 'regular' | 'guest';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

export function setAuth(authResponse: AuthResponse): void {
  if (typeof window === 'undefined') return;
  
  // localStorage에 저장
  localStorage.setItem(TOKEN_KEY, authResponse.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(authResponse.user));
  
  // 쿠키에도 저장 (미들웨어에서 사용)
  document.cookie = `auth_token=${authResponse.access_token}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
  document.cookie = `auth_user=${encodeURIComponent(JSON.stringify(authResponse.user))}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  
  // localStorage에서 제거
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  
  // 쿠키에서도 제거
  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    console.log('Attempting login for:', email);
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('Login response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error('Login failed:', error);
      throw new Error(error.detail || 'Login failed');
    }

    const authResponse: AuthResponse = await response.json();
    console.log('Login successful for:', email);
    
    setAuth(authResponse);
    return authResponse;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Registration failed');
  }

  const authResponse: AuthResponse = await response.json();
  setAuth(authResponse);
  return authResponse;
}

export async function createGuest(): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/guest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Guest creation failed');
  }

  const authResponse: AuthResponse = await response.json();
  setAuth(authResponse);
  return authResponse;
}

export async function verifyToken(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

export function logout(): void {
  clearAuth();
  window.location.href = '/login';
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// 기존 코드와의 호환성을 위한 객체 형태 export
const AuthService = {
  getToken,
  getUser,
  setAuth,
  clearAuth,
  login,
  register,
  createGuest,
  verifyToken,
  logout,
  getAuthHeaders,
};

export default AuthService; 