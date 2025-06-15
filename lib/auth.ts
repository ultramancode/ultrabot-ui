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

class AuthService {
  private static TOKEN_KEY = 'auth_token';
  private static USER_KEY = 'auth_user';

  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  static setAuth(authResponse: AuthResponse): void {
    if (typeof window === 'undefined') return;
    
    // localStorage에 저장
    localStorage.setItem(this.TOKEN_KEY, authResponse.access_token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(authResponse.user));
    
    // 쿠키에도 저장 (미들웨어에서 사용)
    document.cookie = `auth_token=${authResponse.access_token}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
    document.cookie = `auth_user=${encodeURIComponent(JSON.stringify(authResponse.user))}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
  }

  static clearAuth(): void {
    if (typeof window === 'undefined') return;
    
    // localStorage에서 제거
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    // 쿠키에서도 제거
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }

  static async login(email: string, password: string): Promise<AuthResponse> {
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
      
      this.setAuth(authResponse);
      return authResponse;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  static async register(email: string, password: string): Promise<AuthResponse> {
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
    this.setAuth(authResponse);
    return authResponse;
  }

  static async createGuest(): Promise<AuthResponse> {
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
    this.setAuth(authResponse);
    return authResponse;
  }

  static async verifyToken(): Promise<boolean> {
    const token = this.getToken();
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

  static logout(): void {
    this.clearAuth();
    window.location.href = '/login';
  }

  static getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
}

export default AuthService; 