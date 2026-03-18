import React, { useState } from 'react';
import { validateRule } from '../services/api';

const EXAMPLES = [
  { condition: "amount > 100 && country == 'US'",               data: { amount: 250, country: 'US' } },
  { condition: "priority == 'High' || amount > 5000",           data: { priority: 'Low', amount: 6000 } },
  { condition: "contains(department, 'Fin')",                   data: { department: 'Finance' } },
  { condition: "startsWith(country, 'U')",                      data: { country: 'US' } },
  { condition: "role_level == 'Senior' || role_level == 'Lead'",data: { role_level: 'Senior' } },
  { condition: 'DEFAULT',                                        data: {} },
];

export default function RuleTester() {
  const [condition, setCondition] = useState('');
  const [dataStr, setDataStr] = useState('{}');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState('');

  const test = async () => {
    setDataError('');
    let parsed;
    try { parsed = JSON.parse(dataStr || '{}'); }
    catch { setDataError('Invalid JSON'); return; }
    setLoading(true);
    try {
      const r = await validateRule({ condition, sample_data: parsed });
      setResult(r.data.data);
    } catch { setResult({ valid: false, result: null, message: 'Server error' }); }
    finally { setLoading(false); }
  };

  const loadExample = ex => {
    setCondition(ex.condition);
    setDataStr(JSON.stringify(ex.data, null, 2));
    setResult(null);
  };

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:4 }}>🧪 Rule Tester</div>
        <div style={{ color:'var(--text3)', fontSize:13 }}>Test rule conditions before adding them to your workflow steps</div>
      </div>

      <div className="grid-2 start">
        {/* Input panel */}
        <div className="card">
          <div className="card-header"><span className="card-title">Condition</span></div>
          <div className="form-group">
            <label>Condition Expression</label>
            <input className="input mono" value={condition} onChange={e=>setCondition(e.target.value)}
              placeholder="amount > 100 && country == 'US'" onKeyDown={e=>e.key==='Enter'&&test()} />
          </div>
          <div className="form-group">
            <label>Sample Data (JSON)</label>
            <textarea className="input mono" rows={6} value={dataStr} onChange={e=>setDataStr(e.target.value)}
              placeholder={'{\n  "amount": 250,\n  "country": "US"\n}'} />
            {dataError && <div style={{ color:'var(--red)', fontSize:12, marginTop:4 }}>{dataError}</div>}
          </div>
          <button className="btn btn-primary" onClick={test} disabled={loading||!condition}>
            {loading ? <><span className="spinner"/>Evaluating…</> : '▶ Evaluate'}
          </button>

          <div className="divider" />

          <div className="card-header" style={{ marginBottom:10 }}><span className="card-title">Quick Examples</span></div>
          {EXAMPLES.map((ex, i) => (
            <div key={i} onClick={() => loadExample(ex)}
              style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', marginBottom:6, cursor:'pointer', transition:'border-color .17s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
              <div className="mono muted" style={{ fontSize:11, color:'var(--yellow)' }}>{ex.condition}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>data: {JSON.stringify(ex.data)}</div>
            </div>
          ))}
        </div>

        {/* Result + reference */}
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-header"><span className="card-title">Result</span></div>
            {!result ? (
              <div className="empty"><div className="empty-icon">🔬</div><h3>Awaiting evaluation</h3><p>Enter a condition and click Evaluate</p></div>
            ) : (
              <div style={{ textAlign:'center', padding:'24px 0' }}>
                <div style={{ fontSize:52, marginBottom:12 }}>{!result.valid ? '❌' : result.result ? '✅' : '🚫'}</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22,
                  color: !result.valid ? 'var(--red)' : result.result ? 'var(--green)' : 'var(--red)' }}>
                  {!result.valid ? 'SYNTAX ERROR' : result.result ? 'CONDITION TRUE' : 'CONDITION FALSE'}
                </div>
                <div style={{ fontSize:13, color:'var(--text3)', marginTop:6 }}>{result.message}</div>
                <div style={{ background:'var(--bg)', borderRadius:8, padding:12, marginTop:16, textAlign:'left' }}>
                  <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5, fontWeight:700, letterSpacing:.8 }}>EXPRESSION</div>
                  <div className="mono" style={{ fontSize:12, color:'var(--yellow)' }}>{condition}</div>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Supported Syntax</span></div>
            {[
              { title:'Comparison', color:'var(--blue)', items:['==', '!=', '<', '>', '<=', '>='] },
              { title:'Logical',    color:'var(--yellow)', items:['&& (AND)', '|| (OR)'] },
              { title:'String Functions', color:'var(--green)', items:['contains(field, "val")', 'startsWith(field, "prefix")', 'endsWith(field, "suffix")'] },
              { title:'Special', color:'var(--accent2)', items:['DEFAULT  → always matches (fallback)'] },
            ].map(section => (
              <div key={section.title} style={{ background:'var(--bg)', borderRadius:8, padding:'10px 12px', marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:.8, marginBottom:7 }}>{section.title}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {section.items.map(it => (
                    <span key={it} className="mono" style={{ fontSize:11, background:`${section.color}15`, color:section.color, padding:'3px 8px', borderRadius:5, border:`1px solid ${section.color}30` }}>{it}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
