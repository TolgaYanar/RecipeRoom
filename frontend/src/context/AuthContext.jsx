import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Synchronous init from localStorage — prevents flash on page refresh
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('rr_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('rr_token'));
  const [showAuth, setShowAuth] = useState(false);

  // Handles pre-B03 shape { user_id, username, email, user_type }
  // and post-B03 shape   { user: {...}, token: '...' }
  const login = useCallback((userData, tokenString) => {
    const u = userData.user ?? userData;
    const t = tokenString ?? userData.token ?? null;
    setUser(u);
    setToken(t);
    localStorage.setItem('rr_user', JSON.stringify(u));
    if (t) localStorage.setItem('rr_token', t);
    else localStorage.removeItem('rr_token');
    setShowAuth(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('rr_user');
    localStorage.removeItem('rr_token');
  }, []);

  const openAuth  = useCallback(() => setShowAuth(true),  []);
  const closeAuth = useCallback(() => setShowAuth(false), []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, showAuth, openAuth, closeAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
