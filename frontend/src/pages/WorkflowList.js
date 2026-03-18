import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getWorkflows, deleteWorkflow } from '../services/api';
import { statusClass, successRate, fmtDuration } from '../utils';
import { useToast } from '../context';

export default function WorkflowList() {
  const [wfs, setWfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [confirm, setConfirm] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    getWorkflows({ search, status, page, limit: 10 }).then(r => {
      setWfs(r.data.data);
      setPagination(r.data.pagination);
    }).finally(() => setLoading(false));
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);

  const doDelete = async () => {
    try {
      await deleteWorkflow(confirm._id);
      toast(`"${confirm.name}" deleted`, 'success');
      setConfirm(null); load();
    } catch { toast('Delete failed', 'error'); }
  };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:4 }}>Workflows</div>
          <div style={{ color:'var(--text3)', fontSize:13 }}>Manage your automation pipelines</div>
        </div>
        <Link to="/workflows/new" className="btn btn-primary">+ New Workflow</Link>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:18 }}>
        <input className="input" style={{ flex:1 }} placeholder="Search workflows…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
        <select className="input" style={{ width:140 }} value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>Workflow</th><th>Steps</th><th>Version</th>
            <th>Status</th><th>Success Rate</th><th>Runs</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {loading ? [1,2,3].map(i=>(
              <tr key={i}><td colSpan={7}><div className="skeleton" style={{ height:50, borderRadius:8 }} /></td></tr>
            )) : !wfs.length ? (
              <tr><td colSpan={7}>
                <div className="empty"><div className="empty-icon">🗂️</div><h3>No workflows found</h3><p>Click "New Workflow" to create one</p></div>
              </td></tr>
            ) : wfs.map(w => {
              const rate = successRate(w);
              return (
                <tr key={w._id}>
                  <td>
                    <div style={{ fontWeight:600, fontSize:14 }}>{w.name}</div>
                    {w.description && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.description}</div>}
                    <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
                      {(w.tags||[]).map(t=><span className="tag" key={t}>{t}</span>)}
                    </div>
                  </td>
                  <td><span className="badge badge-blue">{w.step_count??0} steps</span></td>
                  <td><span className="badge badge-gray mono">v{w.version}</span></td>
                  <td>
                    {w.is_active
                      ? <span className="badge badge-green"><span className="dot"/>Active</span>
                      : <span className="badge badge-gray">Inactive</span>}
                  </td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div className="progress-bar" style={{ width:60 }}><div className="progress-fill" style={{ width:`${rate}%` }} /></div>
                      <span className="mono" style={{ fontSize:12, color:'var(--text2)' }}>{rate}%</span>
                    </div>
                  </td>
                  <td><span className="mono" style={{ fontSize:13 }}>{w.execution_count}</span></td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-outline btn-sm" onClick={()=>navigate(`/workflows/${w._id}/edit`)}>✏️ Edit</button>
                      <button className="btn btn-success btn-sm" onClick={()=>navigate(`/workflows/${w._id}/execute`)}>▶ Run</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>setConfirm(w)}>🗑</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:16 }}>
          <button className="btn btn-outline btn-sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
          <span style={{ fontSize:13, color:'var(--text2)' }}>Page {page} of {pagination.pages}</span>
          <button className="btn btn-outline btn-sm" disabled={page>=pagination.pages} onClick={()=>setPage(p=>p+1)}>Next →</button>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirm && (
        <div className="modal-overlay" onClick={()=>setConfirm(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">⚠️ Delete Workflow</span>
              <button className="modal-close" onClick={()=>setConfirm(null)}>✕</button>
            </div>
            <p style={{ color:'var(--text2)', marginBottom:20, fontSize:14 }}>
              Delete "<strong>{confirm.name}</strong>"? All steps, rules will be permanently removed.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-danger" onClick={doDelete}>Delete</button>
              <button className="btn btn-outline" onClick={()=>setConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
