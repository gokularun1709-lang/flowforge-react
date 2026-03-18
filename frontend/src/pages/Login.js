import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, useToast } from '../context';

export default function Login() {
  const [email, setEmail] = useState('admin@flowforge.io');
  const [password, setPassword] = useState('Admin@1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const fill = role => {
    const c = { admin: ['admin@flowforge.io','Admin@1234'], manager: ['manager@flowforge.io','Manager@1234'], user: ['user@flowforge.io','User@1234'] };
    setEmail(c[role][0]); setPassword(c[role][1]);
  };

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const u = await login(email, password);
      toast(`Welcome back, ${u.name}! 👋`, 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow" />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">⚡</div>
          <span className="logo-text" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20 }}>FlowForge</span>
          <span className="logo-version">v1.0</span>
        </div>
        <div className="auth-title">Welcome back</div>
        <div className="auth-sub">Sign in to your workflow engine</div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email Address</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@flowforge.io" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(245,86,114,.3)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>{error}</div>}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign In →'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register" className="auth-link">Register</Link>
        </div>

        <div className="demo-creds">
          <div className="demo-title">Quick Login</div>
          <div className="demo-btns">
            {['admin','manager','user'].map(r => (
              <button key={r} className="demo-btn" onClick={() => fill(r)}>{r.charAt(0).toUpperCase()+r.slice(1)}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
