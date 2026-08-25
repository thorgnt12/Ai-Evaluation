import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({
    id: 1,
    email: 'teacher@smartgrade.edu',
    full_name: 'Prof. Eleanor Vance',
    role: 'teacher'
  });
  const [token, setToken] = useState(localStorage.getItem('smartgrade_token') || 'demo-token');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && token !== 'demo-token') {
      authApi.getMe()
        .then(res => setUser(res.data))
        .catch(() => {
          // Fallback to default teacher for instant testing
          setUser({
            id: 1,
            email: 'teacher@smartgrade.edu',
            full_name: 'Prof. Eleanor Vance',
            role: 'teacher'
          });
        });
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const { access_token, user_id, full_name, role } = res.data;
      localStorage.setItem('smartgrade_token', access_token);
      setToken(access_token);
      setUser({ id: user_id, email, full_name, role });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('smartgrade_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
