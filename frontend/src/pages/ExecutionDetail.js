import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getExecution, cancelExecution, retryExecution } from '../services/api';
import { fmtDate, fmtDuration, statusClass, stepIcon } from '../utils';
import { useToast } from '../context';

export default function ExecutionDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [exec, setExec] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => getExecution(id).then(r => { setExec(r.data.data); setLoading(false); });
  useEffect(() => { load(); }, [id]);

  const cancel = async () => {
    try { await cancelExecution(id); toast('Canceled', 'info'); load(); }
    catch(e) { toast(e.response?.data?.message||'Failed', 'error'); }
  };
  const retry = async () => {
    try { await retryExecution(id); toast('Retrying…', 'success'); load(); }
    catch(e) { toast(e.response?.data?.message||'Failed', 'error'); }
  };

  if (loading) return <div style={{ padding:40, color:'var(--text3)', textAlign:'center' }}>Loading…</div>;
  if (!exec)   return <div style={{ padding:40, color:'var(--red)', textAlign:'center' }}>Execution not found.</div>;

  const priorityClass = { critical:'badge-red', high:'badge-yellow', medium:'badge-blue', low:'badge-gray' };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22 }}>Execution Detail</div>
          <div style={{ color:'var(--text3)', fontSize:13, fontFamily:'JetBrains Mono,monospace' }}>{exec._id}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {exec.status==='failed' && <button className="btn btn-success btn-sm" onClick={retry}>↺ Retry</button>}
          {['pending','in_progress'].includes(exec.status) && <button className="btn btn-danger btn-sm" onClick={cancel}>✕ Cancel</button>}
          <Link to="/executions" className="btn btn-outline">← Audit Log</Link>
        </div>
      </div>

      <div className="grid-2 start">
        {/* Left: Summary + Data */}
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-header"><span className="card-title">Summary</span></div>
            <div className="meta-grid">
              {[
                ['Status',     <span className={`badge ${statusClass(exec.status)}`}><span className="dot"/>{exec.status.replace('_',' ')}</span>],
                ['Workflow',   <span style={{ fontWeight:600 }}>{exec.workflow_name}</span>],
                ['Version',    <span className="badge badge-gray mono">v{exec.workflow_version}</span>],
                ['Started By', exec.triggered_by_name],
                ['Duration',   <span className="mono" style={{ fontWeight:700 }}>{fmtDuration(exec.duration_ms)}</span>],
                ['Steps',      <span className="mono" style={{ fontWeight:700 }}>{exec.logs.length}</span>],
                ['Priority',   <span className={`badge ${priorityClass[exec.priority]||'badge-gray'}`}>{exec.priority||'medium'}</span>],
                ['Started',    <span style={{ fontSize:12 }}>{fmtDate(exec.started_at)}</span>],
                ['Ended',      <span style={{ fontSize:12 }}>{exec.ended_at ? fmtDate(exec.ended_at) : '—'}</span>],
              ].map(([lbl, val]) => (
                <div className="meta-item" key={lbl}>
                  <div className="meta-label">{lbl}</div>
                  <div className="meta-val">{val}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Input Data</span></div>
            <pre className="code-block">{JSON.stringify(exec.data, null, 2)}</pre>
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="card">
          <div className="card-header"><span className="card-title">Step Timeline</span></div>
          <div className="timeline">
            {!exec.logs.length && <div style={{ color:'var(--text3)', fontSize:13 }}>No step logs recorded.</div>}
            {exec.logs.map((log, i) => (
              <div key={i} className={`tl-step ${log.status}`}>
                <div className="tl-card">
                  <div className="tl-header">
                    <span>{stepIcon(log.step_type)}</span>
                    <span className="tl-name">{log.step_name}</span>
                    <span className={`badge ${statusClass(log.status)}`}>{log.status}</span>
                    <span className="tl-dur">{fmtDuration(log.duration_ms)}</span>
                  </div>
                  {log.approver_name && <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>👤 {log.approver_name}</div>}
                  {log.error_message && <div className="tl-error">⚠️ {log.error_message}</div>}
                  {log.evaluated_rules?.length > 0 && (
                    <div style={{ marginBottom:6 }}>
                      {log.evaluated_rules.map((r,j) => (
                        <div key={j} className={`rule-eval ${r.result?'pass':'fail'}`}>
                          <div className="chk">{r.result?'✓':'✕'}</div>
                          <div className="cond">{r.condition}</div>
                          <span style={{ fontSize:10, fontWeight:700, color:r.result?'var(--green)':'var(--red)' }}>{r.result?'MATCH':'SKIP'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {log.selected_next_step
                    ? <div className="tl-next">→ Routed to: <strong>{log.selected_next_step}</strong></div>
                    : log.status==='completed' ? <div className="tl-end">⛔ Workflow ended here</div> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
