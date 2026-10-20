import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';
import { DEMO_CREDENTIALS, DEMO_ADMIN_CREDENTIALS } from './authConstants';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('smartgrade_token'));
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('smartgrade_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Validate active session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('smartgrade_token');
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setAuthLoading(false);
        return;
      }

      try {
        const res = await authApi.getMe();
        if (res.data) {
          setUser(res.data);
          localStorage.setItem('smartgrade_user', JSON.stringify(res.data));
        }
      } catch (err) {
        console.warn('Session verification failed, logging out:', err);
        localStorage.removeItem('smartgrade_token');
        localStorage.removeItem('smartgrade_user');
        setToken(null);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authApi.login({ 
        email: email.trim(), 
        password: password.trim() 
      });
      const { access_token, user_id, full_name, role } = res.data;
      
      const userData = {
        id: user_id,
        email: email.trim(),
        full_name: full_name || 'Prof. Eleanor Vance',
        role: role || 'teacher'
      };

      localStorage.setItem('smartgrade_token', access_token);
      localStorage.setItem('smartgrade_user', JSON.stringify(userData));
      setToken(access_token);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Incorrect email or password.';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName, email, password, role = 'teacher') => {
    setLoading(true);
    try {
      await authApi.register({
        full_name: fullName.trim(),
        email: email.trim(),
        password: password.trim(),
        role: role
      });
      // Automatically log in newly registered user
      return await login(email, password);
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Registration failed.';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async () => {
    return await login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
  };

  const adminDemoLogin = async () => {
    return await login(DEMO_ADMIN_CREDENTIALS.email, DEMO_ADMIN_CREDENTIALS.password);
  };

  const logout = () => {
    localStorage.removeItem('smartgrade_token');
    localStorage.removeItem('smartgrade_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        token, 
        loading, 
        authLoading, 
        login, 
        register,
        demoLogin, 
        adminDemoLogin,
        logout,
        demoCredentials: DEMO_CREDENTIALS,
        demoAdminCredentials: DEMO_ADMIN_CREDENTIALS
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
