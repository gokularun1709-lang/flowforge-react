import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, useToast } from '../context';

export default function Register() {
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'user' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await register(form);
      toast('Account created!', 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow" />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">⚡</div>
          <span className="logo-text" style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20 }}>FlowForge</span>
          <span className="logo-version">v1.0</span>
        </div>
        <div className="auth-title">Create account</div>
        <div className="auth-sub">Join FlowForge today</div>
        <form onSubmit={submit}>
          {['name','email'].map(k => (
            <div className="form-group" key={k}>
              <label>{k === 'name' ? 'Full Name' : 'Email Address'}</label>
              <input className="input" type={k === 'email' ? 'email' : 'text'} value={form[k]} onChange={set(k)} required />
            </div>
          ))}
          <div className="form-group">
            <label>Password</label>
            <input className="input" type="password" value={form.password} onChange={set('password')} minLength={6} required />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select className="input" value={form.role} onChange={set('role')}>
              <option value="user">User</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <div style={{ color:'var(--red)', fontSize:13, marginBottom:12, padding:'8px 12px', background:'var(--red-bg)', borderRadius:7 }}>{error}</div>}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Create Account →'}
          </button>
        </form>
        <div className="auth-footer">Already have an account? <Link to="/login" className="auth-link">Sign in</Link></div>
      </div>
    </div>
  );
}
