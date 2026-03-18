import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getExecutions, cancelExecution, retryExecution } from '../services/api';
import { fmtDate, fmtDuration, statusClass } from '../utils';
import { useToast } from '../context';

export default function AuditLog() {
  const [execs, setExecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    getExecutions({ status, page, limit: 10 }).then(r => {
      setExecs(r.data.data);
      setPagination(r.data.pagination);
    }).finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  const cancel = async id => {
    try { await cancelExecution(id); toast('Canceled', 'info'); load(); }
    catch { toast('Failed', 'error'); }
  };
  const retry = async id => {
    try { await retryExecution(id); toast('Retrying…', 'success'); load(); }
    catch { toast('Retry failed', 'error'); }
  };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:4 }}>Audit Log</div>
          <div style={{ color:'var(--text3)', fontSize:13 }}>All workflow execution history</div>
        </div>
        <select className="input" style={{ width:150 }} value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="in_progress">In Progress</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>ID</th><th>Workflow</th><th>Ver</th>
            <th>Status</th><th>Started By</th><th>Duration</th>
            <th>Started At</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {loading ? [1,2,3].map(i=>(
              <tr key={i}><td colSpan={8}><div className="skeleton" style={{ height:48, borderRadius:8 }} /></td></tr>
            )) : !execs.length ? (
              <tr><td colSpan={8}><div className="empty"><div className="empty-icon">📋</div><h3>No executions found</h3></div></td></tr>
            ) : execs.map(e => (
              <tr key={e._id}>
                <td><span className="mono muted" style={{ fontSize:11 }}>{e._id.slice(-8)}…</span></td>
                <td><span style={{ fontWeight:600 }}>{e.workflow_name}</span></td>
                <td><span className="badge badge-gray mono">v{e.workflow_version}</span></td>
                <td><span className={`badge ${statusClass(e.status)}`}><span className="dot"/>{e.status.replace('_',' ')}</span></td>
                <td style={{ fontSize:13 }}>{e.triggered_by_name}</td>
                <td><span className="mono muted" style={{ fontSize:12 }}>{fmtDuration(e.duration_ms)}</span></td>
                <td><span style={{ fontSize:12, color:'var(--text3)' }}>{fmtDate(e.started_at)}</span></td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <Link to={`/executions/${e._id}`} className="btn btn-outline btn-sm">📋 Logs</Link>
                    {e.status==='failed' && <button className="btn btn-success btn-sm" onClick={()=>retry(e._id)}>↺</button>}
                    {['pending','in_progress'].includes(e.status) && <button className="btn btn-danger btn-sm" onClick={()=>cancel(e._id)}>✕</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:16 }}>
          <button className="btn btn-outline btn-sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
          <span style={{ fontSize:13, color:'var(--text2)' }}>Page {page} / {pagination.pages} · {pagination.total} total</span>
          <button className="btn btn-outline btn-sm" disabled={page>=pagination.pages} onClick={()=>setPage(p=>p+1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
