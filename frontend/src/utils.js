export const fmtDuration = ms => {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms/1000).toFixed(1)}s`;
  return `${Math.floor(ms/60000)}m ${Math.round((ms%60000)/1000)}s`;
};

export const fmtDate = iso => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
};

export const relTime = iso => {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return 'just now';
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
};

export const statusClass = s => ({
  completed: 'badge-green', failed: 'badge-red',
  in_progress: 'badge-blue', pending: 'badge-yellow', canceled: 'badge-gray'
}[s] || 'badge-gray');

export const stepIcon = t => ({ task: '⚙️', approval: '✅', notification: '🔔' }[t] || '❓');

export const successRate = wf => {
  if (!wf.execution_count) return 0;
  return Math.round((wf.success_count / wf.execution_count) * 100);
};
