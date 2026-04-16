import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.getCurrentUser();
        if (response.data.success) {
          setUser(response.data.data);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authAPI.login(username, password);
      if (response.data.success) {
        setUser(response.data.data);
        return { success: true };
      }
      return { success: false, error: response.data.error || '登录失败' };
    } catch (error) {
      const errorMsg = error.response?.data?.error || '登录失败，请稍后重试';
      return { success: false, error: errorMsg };
    }
  };

  const register = async (username, password) => {
    try {
      const response = await authAPI.register(username, password);
      if (response.data.success) {
        setUser(response.data.data);
        return { success: true };
      }
      return { success: false, error: response.data.error || '注册失败' };
    } catch (error) {
      const errorMsg = error.response?.data?.error || '注册失败，请稍后重试';
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
  };

  const updateUserInfo = (newUserInfo) => {
    setUser(newUserInfo);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUserInfo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
