import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../services/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, restore the session if a token exists.
  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api.get('/auth/me').then((d) => setUser(d.user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const finish = (d) => { setToken(d.token); setUser(d.user); return d.user; };

  const value = {
    user,
    loading,
    login: async (email, password) => finish(await api.post('/auth/login', { email, password })),
    register: async (form) => finish(await api.post('/auth/register', form)),
    logout: () => { setToken(null); setUser(null); },
    updateProfile: async (form) => { const d = await api.put('/auth/profile', form); setUser(d.user); return d.user; },
    deleteAccount: async (confirmText) => {
      const res = await api.del('/auth/account', { confirmText });
      setToken(null);
      setUser(null);
      return res;
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
