import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkflow, createWorkflow, updateWorkflow, getSteps, addStep, updateStep, deleteStep as apiDeleteStep, getRules, addRule, updateRule, deleteRule as apiDeleteRule, setStartStep } from '../services/api';
import { useToast } from '../context';
import { stepIcon } from '../utils';

// ── Shared small components ───────────────
const FieldRow = ({ label, children, hint }) => (
  <div className="form-group">
    <label>{label}</label>
    {children}
    {hint && <div className="hint">{hint}</div>}
  </div>
);

// ── Step Modal ────────────────────────────
function StepModal({ step, workflowId, stepsCount, onSave, onClose }) {
  const [form, setForm] = useState({
    name: step?.name || '', step_type: step?.step_type || 'task',
    order: step?.order || stepsCount + 1,
    assignee_email: step?.metadata?.assignee_email || '',
    instructions: step?.metadata?.instructions || '',
    sla_minutes: step?.metadata?.sla_minutes || '',
    escalation_email: step?.metadata?.escalation_email || '',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name) { toast('Name required', 'error'); return; }
    setSaving(true);
    const payload = {
      name: form.name, step_type: form.step_type, order: +form.order,
      metadata: { assignee_email: form.assignee_email, instructions: form.instructions,
        sla_minutes: form.sla_minutes ? +form.sla_minutes : null,
        escalation_email: form.escalation_email }
    };
    try {
      if (step) await updateStep(step._id, payload);
      else await addStep(workflowId, payload);
      toast(`Step ${step ? 'updated' : 'added'}`, 'success');
      onSave();
    } catch { toast('Save failed', 'error'); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{step ? 'Edit' : 'Add'} Step</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <FieldRow label="Step Name *"><input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Manager Approval" /></FieldRow>
        <div className="grid-2">
          <FieldRow label="Type *">
            <select className="input" value={form.step_type} onChange={set('step_type')}>
              <option value="task">⚙️ Task</option>
              <option value="approval">✅ Approval</option>
              <option value="notification">🔔 Notification</option>
            </select>
          </FieldRow>
          <FieldRow label="Order"><input className="input" type="number" min={1} value={form.order} onChange={set('order')} /></FieldRow>
        </div>
        <FieldRow label="Assignee Email"><input className="input" type="email" value={form.assignee_email} onChange={set('assignee_email')} placeholder="manager@company.com" /></FieldRow>
        <FieldRow label="Instructions / Template"><textarea className="input" rows={2} value={form.instructions} onChange={set('instructions')} placeholder="Step instructions…" /></FieldRow>
        <div className="grid-2">
          <FieldRow label="SLA (minutes)"><input className="input" type="number" value={form.sla_minutes} onChange={set('sla_minutes')} placeholder="60" /></FieldRow>
          <FieldRow label="Escalation Email"><input className="input" type="email" value={form.escalation_email} onChange={set('escalation_email')} placeholder="admin@company.com" /></FieldRow>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="spinner"/> : 'Save Step'}</button>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Rule Modal ────────────────────────────
function RuleModal({ rule, stepId, allSteps, currentStepId, onSave, onClose }) {
  const otherSteps = allSteps.filter(s => s._id !== currentStepId);
  const nextId = rule?.next_step_id?._id || rule?.next_step_id || '';
  const [form, setForm] = useState({
    condition: rule?.condition || '', priority: rule?.priority || 1,
    next_step_id: nextId, description: rule?.description || '',
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.condition) { toast('Condition required', 'error'); return; }
    setSaving(true);
    const payload = { condition: form.condition, priority: +form.priority, next_step_id: form.next_step_id || null, description: form.description };
    try {
      if (rule) await updateRule(rule._id, payload);
      else await addRule(stepId, payload);
      toast('Rule saved', 'success'); onSave();
    } catch { toast('Save failed', 'error'); } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{rule ? 'Edit' : 'Add'} Rule</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <FieldRow label="Condition *" hint="Use DEFAULT as a fallback rule">
          <input className="input mono" value={form.condition} onChange={set('condition')} placeholder="amount > 100 && country == 'US'" />
        </FieldRow>
        <FieldRow label="Next Step">
          <select className="input" value={form.next_step_id} onChange={set('next_step_id')}>
            <option value="">— End Workflow —</option>
            {otherSteps.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </FieldRow>
        <div className="grid-2">
          <FieldRow label="Priority"><input className="input" type="number" min={1} value={form.priority} onChange={set('priority')} /></FieldRow>
          <FieldRow label="Description"><input className="input" value={form.description} onChange={set('description')} placeholder="Optional note" /></FieldRow>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="spinner"/> : 'Save Rule'}</button>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Editor ───────────────────────────
export default function WorkflowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [tab, setTab] = useState('info');
  const [wf, setWf] = useState(null);
  const [wfId, setWfId] = useState(id || null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:'', description:'', tags:'', is_active:true });
  const [schemaFields, setSchemaFields] = useState([]);
  const [steps, setSteps] = useState([]);
  const [selectedStep, setSelectedStep] = useState(null);
  const [stepModal, setStepModal] = useState(null);  // null | 'new' | stepObj
  const [ruleModal, setRuleModal] = useState(null);  // null | 'new' | ruleObj
  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!id) return;
    getWorkflow(id).then(r => {
      const w = r.data.data;
      setWf(w); setWfId(w._id);
      setForm({ name:w.name, description:w.description||'', tags:(w.tags||[]).join(', '), is_active:w.is_active });
      const fields = Object.entries(w.input_schema||{}).map(([k,v]) => ({
        id: Math.random(), name:k, type:v.type||'string', required:!!v.required,
        allowed_values: (v.allowed_values||[]).join(',')
      }));
      setSchemaFields(fields);
      setSteps(w.steps||[]);
    });
  }, [id]);

  const reloadSteps = useCallback(() => {
    if (!wfId) return;
    getSteps(wfId).then(r => {
      setSteps(r.data.data);
      if (selectedStep) {
        const updated = r.data.data.find(s => s._id === selectedStep._id);
        setSelectedStep(updated||null);
      }
    });
  }, [wfId, selectedStep]);

  const buildSchema = () => {
    const s = {};
    schemaFields.forEach(f => {
      if (!f.name.trim()) return;
      s[f.name.trim()] = { type:f.type, required:f.required,
        allowed_values: f.allowed_values ? f.allowed_values.split(',').map(x=>x.trim()).filter(Boolean) : [] };
    });
    return s;
  };

  const save = async () => {
    if (!form.name.trim()) { toast('Workflow name required', 'error'); return; }
    setSaving(true);
    const payload = { name:form.name, description:form.description,
      tags: form.tags.split(',').map(s=>s.trim()).filter(Boolean),
      is_active: form.is_active, input_schema: buildSchema() };
    try {
      if (wfId) { await updateWorkflow(wfId, payload); toast('Workflow updated (new version)', 'success'); }
      else {
        const r = await createWorkflow(payload); setWfId(r.data.data._id);
        toast('Workflow created!', 'success');
      }
      navigate('/workflows');
    } catch { toast('Save failed', 'error'); } finally { setSaving(false); }
  };

  const delStep = async s => {
    if (!window.confirm(`Delete "${s.name}" and its rules?`)) return;
    await apiDeleteStep(s._id);
    if (selectedStep?._id === s._id) setSelectedStep(null);
    reloadSteps(); toast('Step deleted', 'info');
  };

  const delRule = async r => {
    if (!window.confirm('Delete this rule?')) return;
    await apiDeleteRule(r._id); reloadSteps(); toast('Rule deleted', 'info');
  };

  const sortedRules = selectedStep?.rules ? [...selectedStep.rules].sort((a,b)=>a.priority-b.priority) : [];
  const startStepId = wf?.start_step_id?._id || wf?.start_step_id || steps[0]?._id;

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22 }}>{id ? 'Edit Workflow' : 'New Workflow'}</div>
          <div style={{ color:'var(--text3)', fontSize:13 }}>{wf ? `Version ${wf.version}` : 'Create a new automation pipeline'}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline" onClick={()=>navigate('/workflows')}>← Back</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<span className="spinner"/>:'💾 Save'}</button>
        </div>
      </div>

      <div className="tabs">
        {['info','steps','flow'].map((t,i)=>(
          <button key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>
            {['① Info','② Steps & Rules','③ Flow'][i]}
          </button>
        ))}
      </div>

      {/* TAB: INFO */}
      {tab==='info' && (
        <div className="grid-2 start">
          <div className="card">
            <div className="card-header"><span className="card-title">Basic Info</span></div>
            <FieldRow label="Workflow Name *"><input className="input" value={form.name} onChange={setF('name')} placeholder="e.g. Expense Approval" /></FieldRow>
            <FieldRow label="Description"><textarea className="input" rows={3} value={form.description} onChange={setF('description')} placeholder="What does this workflow do?" /></FieldRow>
            <FieldRow label="Tags (comma-separated)"><input className="input" value={form.tags} onChange={setF('tags')} placeholder="finance, approval, hr" /></FieldRow>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <label className="req-check">
                <input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} />
                Active
              </label>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Input Schema</span>
              <button className="btn btn-outline btn-sm" onClick={()=>setSchemaFields(f=>[...f,{id:Math.random(),name:'',type:'string',required:false,allowed_values:''}])}>+ Field</button>
            </div>
            {!schemaFields.length && <div style={{ color:'var(--text3)', fontSize:13, textAlign:'center', padding:20 }}>No fields. Click "+ Field" to add.</div>}
            {schemaFields.map(f => (
              <div className="schema-field" key={f.id}>
                <div className="schema-row">
                  <input className="input mono" style={{ flex:1 }} placeholder="field_name" value={f.name}
                    onChange={e=>setSchemaFields(fs=>fs.map(x=>x.id===f.id?{...x,name:e.target.value}:x))} />
                  <select className="input" style={{ width:100 }} value={f.type}
                    onChange={e=>setSchemaFields(fs=>fs.map(x=>x.id===f.id?{...x,type:e.target.value}:x))}>
                    <option value="string">string</option><option value="number">number</option>
                    <option value="boolean">boolean</option><option value="date">date</option>
                  </select>
                  <label className="req-check">
                    <input type="checkbox" checked={f.required} onChange={e=>setSchemaFields(fs=>fs.map(x=>x.id===f.id?{...x,required:e.target.checked}:x))} />
                    Req
                  </label>
                  <button className="btn-icon" onClick={()=>setSchemaFields(fs=>fs.filter(x=>x.id!==f.id))} style={{ color:'var(--red)' }}>✕</button>
                </div>
                <input className="input mono" style={{ fontSize:11 }} placeholder="Allowed values: High,Medium,Low"
                  value={f.allowed_values}
                  onChange={e=>setSchemaFields(fs=>fs.map(x=>x.id===f.id?{...x,allowed_values:e.target.value}:x))} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: STEPS */}
      {tab==='steps' && (
        <>
          {!wfId ? (
            <div className="card"><div className="empty"><div className="empty-icon">💾</div><h3>Save workflow info first</h3><p>Go to "Info" tab and save before adding steps</p></div></div>
          ) : (
            <div className="grid-2 start">
              {/* Steps list */}
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15 }}>Steps</div>
                  <button className="btn btn-primary btn-sm" onClick={()=>setStepModal('new')}>+ Add Step</button>
                </div>
                {!steps.length && <div className="empty"><div className="empty-icon">📦</div><h3>No steps yet</h3></div>}
                {[...steps].sort((a,b)=>a.order-b.order).map(s => (
                  <div key={s._id} className={`step-card${selectedStep?._id===s._id?' selected':''}`} onClick={()=>setSelectedStep(s)}>
                    <div className={`step-badge ${s.step_type}`}>{stepIcon(s.step_type)}</div>
                    <div className="step-info">
                      <div className="step-name">
                        {s.name}
                        {s._id===startStepId && <span className="start-tag">START</span>}
                      </div>
                      <div className="step-meta">{s.step_type.toUpperCase()} · Order {s.order} · {s.rules?.length||0} rules</div>
                    </div>
                    <div className="step-acts">
                      <button className="btn-icon" onClick={e=>{e.stopPropagation();setStepModal(s);}}>✏️</button>
                      <button className="btn-icon" style={{ color:'var(--red)' }} onClick={e=>{e.stopPropagation();delStep(s);}}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rules panel */}
              <div>
                {!selectedStep ? (
                  <div className="card"><div className="empty"><div className="empty-icon">👆</div><h3>Select a step</h3><p>Click a step to manage its rules</p></div></div>
                ) : (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">{stepIcon(selectedStep.step_type)} {selectedStep.name}</span>
                      <button className="btn btn-primary btn-sm" onClick={()=>setRuleModal('new')}>+ Rule</button>
                    </div>
                    {!sortedRules.length && <div style={{ color:'var(--text3)', fontSize:13, textAlign:'center', padding:16 }}>No rules. Workflow ends here.</div>}
                    {sortedRules.map(r => {
                      const isDefault = r.is_default || r.condition==='DEFAULT';
                      const nextName = r.next_step_id?.name || '⛔ End Workflow';
                      return (
                        <div className="rule-row" key={r._id}>
                          <div className="rule-pri">{r.priority}</div>
                          <div className={`rule-cond${isDefault?' is-default':''}`}>{isDefault?'🔧 DEFAULT':r.condition}</div>
                          <div className="rule-arrow">→</div>
                          <div className="rule-next">{nextName}</div>
                          {r.hit_count>0 && <span className="rule-hits">{r.hit_count} hits</span>}
                          <div className="rule-acts">
                            <button className="btn-icon" onClick={()=>setRuleModal(r)}>✏️</button>
                            <button className="btn-icon" style={{ color:'var(--red)' }} onClick={()=>delRule(r)}>🗑</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB: FLOW */}
      {tab==='flow' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Flow Preview</span></div>
          <div className="flow-canvas">
            {!steps.length ? <div className="empty" style={{ width:'100%' }}><div className="empty-icon">🗺️</div><h3>Add steps to see flow</h3></div> : (
              <div className="flow-row">
                {[...steps].sort((a,b)=>a.order-b.order).map((s,i,arr) => (
                  <React.Fragment key={s._id}>
                    <div className={`flow-node ${s.step_type}${s._id===startStepId?' start':''}`}>
                      <div className="flow-node-type">{s.step_type}</div>
                      <div className="flow-node-name">{s.name}</div>
                      <div className="flow-node-rules">{s.rules?.length||0} rules</div>
                    </div>
                    {i<arr.length-1 && <div className="flow-arrow">→</div>}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {stepModal && (
        <StepModal
          step={stepModal==='new'?null:stepModal}
          workflowId={wfId} stepsCount={steps.length}
          onSave={()=>{setStepModal(null);reloadSteps();}}
          onClose={()=>setStepModal(null)} />
      )}
      {ruleModal && (
        <RuleModal
          rule={ruleModal==='new'?null:ruleModal}
          stepId={selectedStep?._id} allSteps={steps} currentStepId={selectedStep?._id}
          onSave={()=>{setRuleModal(null);reloadSteps();}}
          onClose={()=>setRuleModal(null)} />
      )}
    </div>
  );
}
