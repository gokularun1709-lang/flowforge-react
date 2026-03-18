import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats, getWorkflows } from '../services/api';
import { fmtDate, fmtDuration, statusClass, relTime } from '../utils';

const STAT_CARDS = [
  { key:'total',       label:'Total Executions', icon:'⚡', color:'var(--accent)' },
  { key:'completed',   label:'Completed',         icon:'✓',  color:'var(--green)' },
  { key:'failed',      label:'Failed',            icon:'✕',  color:'var(--red)' },
  { key:'successRate', label:'Success Rate',       icon:'◎',  color:'var(--yellow)', suffix:'%' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [wfs, setWfs] = useState([]);

  useEffect(() => {
    getStats().then(r => setStats(r.data.data));
    getWorkflows({ limit: 5 }).then(r => setWfs(r.data.data));
  }, []);

  return (
    <div>
      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:4 }}>Dashboard</div>
        <div style={{ color:'var(--text3)', fontSize:13 }}>Overview of your workflow engine</div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        {STAT_CARDS.map(s => (
          <div className="stat-card" key={s.key} style={{ '--stat-color': s.color }}>
            <div className="stat-icon" style={{ background: s.color+'15' }}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>
              {stats ? (stats[s.key] ?? '—') + (s.suffix||'') : <div className="skeleton" style={{ height:36, width:60, borderRadius:6 }} />}
            </div>
            <div className="stat-sub">All time</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Recent executions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Executions</span>
            <Link to="/executions" className="btn btn-outline btn-sm">View All</Link>
          </div>
          {!stats ? (
            [1,2,3].map(i => <div key={i} className="skeleton" style={{ height:50, borderRadius:8, marginBottom:8 }} />)
          ) : !stats.recentExecutions?.length ? (
            <div className="empty"><div className="empty-icon">📋</div><h3>No executions yet</h3></div>
          ) : stats.recentExecutions.map(e => (
            <Link to={`/executions/${e._id}`} key={e._id}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)', textDecoration:'none', transition:'all .15s' }}>
              <div className={`dot`} style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background: e.status==='completed'?'var(--green)':e.status==='failed'?'var(--red)':'var(--accent)' }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.workflow_name}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{e.triggered_by_name} · {relTime(e.started_at)}</div>
              </div>
              <span className={`badge ${statusClass(e.status)}`}>{e.status.replace('_',' ')}</span>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-header"><span className="card-title">Quick Actions</span></div>
            {[
              { to:'/workflows/new', icon:'➕', title:'New Workflow',   sub:'Design an automation pipeline', color:'var(--accent)' },
              { to:'/workflows',     icon:'▶',  title:'Run Workflow',   sub:'Execute an existing workflow',  color:'var(--blue)' },
              { to:'/rule-tester',   icon:'🧪', title:'Test a Rule',    sub:'Validate condition expressions', color:'var(--green)' },
            ].map(a => (
              <Link to={a.to} key={a.to} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px', borderRadius:10, border:'1px solid var(--border)', marginBottom:8, transition:'all .17s', textDecoration:'none', background:'var(--surface2)' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=a.color}
                onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                <div style={{ fontSize:22, width:40, textAlign:'center' }}>{a.icon}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600 }}>{a.title}</div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:1 }}>{a.sub}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Workflow health */}
          <div className="card">
            <div className="card-header"><span className="card-title">Workflow Health</span></div>
            {wfs.map(w => {
              const rate = w.execution_count ? Math.round((w.success_count/w.execution_count)*100) : 100;
              const col = rate >= 80 ? 'var(--green)' : rate >= 50 ? 'var(--yellow)' : 'var(--red)';
              return (
                <div key={w._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ fontSize:18 }}>{w.execution_count ? '⚡' : '💤'}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:5 }}>{w.name}</div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width:`${rate}%`, background:col }} /></div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:col, minWidth:38, textAlign:'right' }}>{rate}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
