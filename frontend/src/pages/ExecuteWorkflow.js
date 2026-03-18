import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getWorkflow, executeWorkflow, getExecution } from '../services/api';
import { useToast } from '../context';
import { fmtDuration, statusClass, stepIcon } from '../utils';

function RuleEvals({ rules }) {
  return (
    <div style={{ marginBottom:7 }}>
      {rules.map((r,i) => (
        <div key={i} className={`rule-eval ${r.result?'pass':'fail'}`}>
          <div className="chk">{r.result?'✓':'✕'}</div>
          <div className="cond">{r.condition}</div>
          <span style={{ fontSize:10, fontWeight:700, color:r.result?'var(--green)':'var(--red)' }}>{r.result?'MATCH':'SKIP'}</span>
        </div>
      ))}
    </div>
  );
}

export default function ExecuteWorkflow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const pollRef = useRef(null);

  const [wf, setWf] = useState(null);
  const [formData, setFormData] = useState({});
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');
  const [running, setRunning] = useState(false);
  const [exec, setExec] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getWorkflow(id).then(r => setWf(r.data.data));
    return () => clearInterval(pollRef.current);
  }, [id]);

  const poll = (execId) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      const r = await getExecution(execId);
      setExec(r.data.data);
      if (!['pending','in_progress'].includes(r.data.data.status) || attempts > 20) {
        clearInterval(pollRef.current);
      }
    }, 700);
  };

  const run = async () => {
    setError('');
    const schema = wf?.input_schema || {};
    const data = {};
    for (const [k, cfg] of Object.entries(schema)) {
      let v = formData[k];
      if (cfg.required && (v === undefined || v === null || v === '')) { setError(`Field "${k}" is required`); return; }
      if (v !== undefined && v !== '') {
        if (cfg.type === 'number') v = parseFloat(v);
        else if (cfg.type === 'boolean') v = v === 'true';
      }
      data[k] = v;
    }
    setRunning(true);
    try {
      const r = await executeWorkflow(id, { data, priority, notes });
      setExec(r.data.data);
      poll(r.data.data._id);
      toast('Execution started!', 'success');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to start');
      toast('Execution failed to start', 'error');
    } finally { setRunning(false); }
  };

  const schema = wf?.input_schema || {};

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22 }}>Execute Workflow</div>
          <div style={{ color:'var(--text3)', fontSize:13 }}>{wf?.name || '…'}</div>
        </div>
        <button className="btn btn-outline" onClick={()=>navigate('/workflows')}>← Back</button>
      </div>

      <div className="grid-2 start">
        {/* Input form */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Input Data</span>
            {wf && <span className="badge badge-gray mono">v{wf.version}</span>}
          </div>

          {Object.entries(schema).map(([k, cfg]) => (
            <div className="form-group" key={k}>
              <label>
                {k} {cfg.required && <span style={{ color:'var(--red)' }}>*</span>}
                <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0, color:'var(--text3)', marginLeft:6 }}>
                  ({cfg.type}{cfg.allowed_values?.length ? ' · '+cfg.allowed_values.join('|') : ''})
                </span>
              </label>
              {cfg.allowed_values?.length ? (
                <select className="input" value={formData[k]||''} onChange={e=>setFormData(d=>({...d,[k]:e.target.value}))}>
                  <option value="">Select…</option>
                  {cfg.allowed_values.map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              ) : cfg.type==='number' ? (
                <input className="input" type="number" value={formData[k]||''} onChange={e=>setFormData(d=>({...d,[k]:e.target.value}))} placeholder={`Enter ${k}`} />
              ) : cfg.type==='boolean' ? (
                <select className="input" value={formData[k]||''} onChange={e=>setFormData(d=>({...d,[k]:e.target.value}))}>
                  <option value="">Select…</option><option value="true">True</option><option value="false">False</option>
                </select>
              ) : (
                <input className="input" value={formData[k]||''} onChange={e=>setFormData(d=>({...d,[k]:e.target.value}))} placeholder={`Enter ${k}`} />
              )}
            </div>
          ))}

          <div className="form-group">
            <label>Priority</label>
            <select className="input" value={priority} onChange={e=>setPriority(e.target.value)}>
              {['low','medium','high','critical'].map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea className="input" rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Context for this execution…" />
          </div>

          {error && <div style={{ color:'var(--red)', fontSize:13, background:'var(--red-bg)', padding:'8px 12px', borderRadius:7, marginBottom:12 }}>{error}</div>}
          <button className="btn btn-primary btn-full" onClick={run} disabled={running||!wf}>
            {running ? <><span className="spinner"/> Running…</> : '▶ Start Execution'}
          </button>
        </div>

        {/* Result */}
        <div>
          {!exec ? (
            <div className="card"><div className="empty"><div className="empty-icon">⚡</div><h3>Ready to execute</h3><p>Fill inputs and click Start Execution</p></div></div>
          ) : (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Execution Result</span>
                <span className={`badge ${statusClass(exec.status)}`}><span className="dot"/>{exec.status.replace('_',' ')}</span>
              </div>
              <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <div style={{ background:'var(--bg)', padding:'8px 14px', borderRadius:8, fontSize:12, color:'var(--text2)', border:'1px solid var(--border)' }}>
                  Steps: <strong>{exec.logs.length}</strong>
                </div>
                <div style={{ background:'var(--bg)', padding:'8px 14px', borderRadius:8, fontSize:12, color:'var(--text2)', border:'1px solid var(--border)' }}>
                  Duration: <strong className="mono">{fmtDuration(exec.duration_ms)}</strong>
                </div>
              </div>
              <div className="timeline">
                {exec.logs.map((log,i) => (
                  <div key={i} className={`tl-step ${log.status}`}>
                    <div className="tl-card">
                      <div className="tl-header">
                        <span>{stepIcon(log.step_type)}</span>
                        <span className="tl-name">{log.step_name}</span>
                        <span className={`badge ${statusClass(log.status)}`}>{log.status}</span>
                        <span className="tl-dur">{fmtDuration(log.duration_ms)}</span>
                      </div>
                      {log.error_message && <div className="tl-error">⚠️ {log.error_message}</div>}
                      {log.evaluated_rules?.length > 0 && <RuleEvals rules={log.evaluated_rules} />}
                      {log.selected_next_step ? <div className="tl-next">→ Next: <strong>{log.selected_next_step}</strong></div>
                        : log.status==='completed' ? <div className="tl-end">⛔ Workflow ended</div> : null}
                    </div>
                  </div>
                ))}
                {['pending','in_progress'].includes(exec.status) && (
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', color:'var(--text3)', fontSize:13 }}>
                    <span className="spinner"/>Processing…
                  </div>
                )}
              </div>
              <div style={{ marginTop:14, display:'flex', gap:8 }}>
                <Link to={`/executions/${exec._id}`} className="btn btn-outline btn-sm">View Full Logs</Link>
                <Link to="/executions" className="btn btn-outline btn-sm">Audit Log</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
