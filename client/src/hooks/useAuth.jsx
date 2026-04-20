import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('millpro_token');
    const stored = localStorage.getItem('millpro_user');
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
        // Verify token is still valid
        authAPI.me().then(res => {
          const u = res.data;
          setUser(u);
          localStorage.setItem('millpro_user', JSON.stringify(u));
        }).catch(() => {
          logout();
        }).finally(() => setLoading(false));
      } catch {
        logout();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback((token, userData) => {
    localStorage.setItem('millpro_token', token);
    localStorage.setItem('millpro_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('millpro_token');
    localStorage.removeItem('millpro_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
