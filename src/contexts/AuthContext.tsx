import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'super_admin' | 'org_admin' | 'user';
  organization_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isSuperAdmin: () => boolean;
  isOrgAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Token storage key
const TOKEN_KEY = 'wa_flow_access_token';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Helper to get stored token (for API calls)
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setAccessToken(storedToken);
      } else {
        // Invalid token, clear it
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setAccessToken(null);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store token
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setAccessToken(data.access_token);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setAccessToken(null);
      setUser(null);
    }
  };

  const isSuperAdmin = () => user?.role === 'super_admin';
  const isOrgAdmin = () => user?.role === 'org_admin' || user?.role === 'super_admin';

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, login, logout, isSuperAdmin, isOrgAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
