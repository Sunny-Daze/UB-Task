import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

type User = {
  id: string;
  username: string;
  role: 'user' | 'admin';
};

type AuthCtx = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, role: 'user' | 'admin') => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>(null as any);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const t = localStorage.getItem('token');
      if (!t) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        const u = res.data.data;
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const persist = (u: User, t: string) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    setToken(t);
  };

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    const { user, token } = res.data.data;
    persist(user, token);
  };

  const signup = async (username: string, password: string, role: 'user' | 'admin') => {
    const res = await api.post('/auth/signup', { username, password, role });
    const { user, token } = res.data.data;
    persist(user, token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  return (
    <Ctx.Provider value={{ user, token, loading, login, signup, logout }}>{children}</Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
