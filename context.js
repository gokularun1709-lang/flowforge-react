import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { login as apiLogin, register as apiRegister } from './services/api';

// ── Auth Context ──────────────────────────
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ff_user') || 'null'); }
    catch { return null; }
  });

  const loginFn = useCallback(async (email, password) => {
    const res = await apiLogin({ email, password });
    localStorage.setItem('ff_token', res.data.data.token);
    localStorage.setItem('ff_user',  JSON.stringify(res.data.data.user));
    setUser(res.data.data.user);
    return res.data.data.user;
  }, []);

  const registerFn = useCallback(async (payload) => {
    const res = await apiRegister(payload);
    localStorage.setItem('ff_token', res.data.data.token);
    localStorage.setItem('ff_user',  JSON.stringify(res.data.data.user));
    setUser(res.data.data.user);
    return res.data.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ff_token');
    localStorage.removeItem('ff_user');
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, login: loginFn, register: registerFn, logout, isLoggedIn: !!user }}>
      {children}
    </AuthCtx.Provider>
  );
}
export const useAuth = () => useContext(AuthCtx);

// ── Toast Context ─────────────────────────
const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const toast = useCallback((msg, type = 'info') => {
    const id = ++counter.current;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
