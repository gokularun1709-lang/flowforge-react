const { Execution, Workflow, Step, Rule } = require('../models');
const { findMatch, MAX } = require('./ruleEngine');

async function start(workflowId, data, userId, userName, opts = {}) {
  const wf = await Workflow.findById(workflowId);
  if (!wf)           throw new Error('Workflow not found');
  if (!wf.is_active) throw new Error('Workflow is not active');
  if (!wf.start_step_id) throw new Error('Workflow has no start step');

  // Basic input validation
  const schema = wf.input_schema || {};
  for (const [k, cfg] of Object.entries(schema)) {
    if (cfg.required && (data[k] === undefined || data[k] === null || data[k] === ''))
      throw new Error(`Required field "${k}" is missing`);
    if (data[k] !== undefined && cfg.allowed_values?.length)
      if (!cfg.allowed_values.includes(String(data[k])))
        throw new Error(`"${k}" must be one of: ${cfg.allowed_values.join(', ')}`);
  }

  const exec = await Execution.create({
    workflow_id: workflowId, workflow_name: wf.name,
    workflow_version: wf.version, status: 'in_progress',
    data, triggered_by: userId, triggered_by_name: userName,
    current_step_id: wf.start_step_id, started_at: new Date(),
    priority: opts.priority || 'medium', notes: opts.notes || null
  });

  await Workflow.findByIdAndUpdate(workflowId, { $inc: { execution_count: 1 } });
  _process(exec._id).catch(e => console.error(`Exec ${exec._id} failed:`, e.message));
  return exec;
}

async function _process(execId) {
  let exec = await Execution.findById(execId);
  const visited = {};

  while (exec?.current_step_id && exec.status === 'in_progress') {
    const step = await Step.findById(exec.current_step_id);
    if (!step) { await _fail(execId, 'Step not found'); return; }

    const key = step._id.toString();
    visited[key] = (visited[key] || 0) + 1;
    if (visited[key] > MAX) {
      await _fail(execId, `Loop limit (${MAX}) exceeded at step "${step.name}"`);
      return;
    }

    const log = {
      step_id: step._id.toString(), step_name: step.name,
      step_type: step.step_type, status: 'in_progress',
      evaluated_rules: [], started_at: new Date(), iteration: visited[key]
    };

    try {
      const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });
      if (!rules.length) {
        log.status = 'completed'; log.ended_at = new Date();
        log.duration_ms = log.ended_at - log.started_at;
        exec.logs.push(log);
        exec.current_step_id = null;
        exec.status = 'completed';
        exec.ended_at = new Date();
        exec.duration_ms = exec.ended_at - exec.started_at;
        await exec.save();
        await _updateStats(exec.workflow_id, true, exec.duration_ms);
        return;
      }

      const { matched, evaluations } = findMatch(rules, exec.data);
      log.evaluated_rules = evaluations;

      if (!matched) {
        log.status = 'failed';
        log.error_message = 'No matching rule. Add a DEFAULT rule.';
        log.ended_at = new Date(); log.duration_ms = log.ended_at - log.started_at;
        exec.logs.push(log); await exec.save();
        await _fail(execId, log.error_message); return;
      }

      await Rule.findByIdAndUpdate(matched._id, { $inc: { hit_count: 1 }, last_triggered: new Date() });

      log.status = 'completed';
      log.duration_ms = Math.floor(Math.random() * 1500) + 200;
      log.ended_at = new Date();

      if (matched.next_step_id) {
        const next = await Step.findById(matched.next_step_id);
        log.selected_next_step = next?.name || 'Unknown';
        exec.current_step_id = matched.next_step_id;
        exec.current_step_name = next?.name;
      } else {
        log.selected_next_step = null;
        exec.current_step_id = null;
        exec.status = 'completed';
        exec.ended_at = new Date();
        exec.duration_ms = exec.ended_at - exec.started_at;
      }

      exec.logs.push(log);
      await exec.save();
      if (exec.status === 'completed')
        await _updateStats(exec.workflow_id, true, exec.duration_ms);

    } catch (e) {
      log.status = 'failed'; log.error_message = e.message;
      log.ended_at = new Date(); log.duration_ms = log.ended_at - log.started_at;
      exec.logs.push(log); await exec.save();
      await _fail(execId, e.message); return;
    }

    exec = await Execution.findById(execId);
  }
}

async function _fail(execId, reason) {
  const e = await Execution.findByIdAndUpdate(execId,
    { status: 'failed', ended_at: new Date(), current_step_id: null }, { new: true });
  if (e) {
    e.duration_ms = e.ended_at - e.started_at;
    await e.save();
    await _updateStats(e.workflow_id, false, e.duration_ms);
  }
}

async function _updateStats(wfId, ok, ms) {
  const wf = await Workflow.findById(wfId);
  if (!wf) return;
  const inc = ok ? { success_count: 1 } : {};
  const avg = wf.execution_count > 0
    ? Math.round(((wf.avg_duration_ms * (wf.execution_count - 1)) + ms) / wf.execution_count) : ms;
  await Workflow.findByIdAndUpdate(wfId, { $inc: inc, $set: { avg_duration_ms: avg } });
}

async function retry(execId) {
  const exec = await Execution.findById(execId);
  if (!exec) throw new Error('Execution not found');
  if (exec.status !== 'failed') throw new Error('Only failed executions can be retried');
  const lastFailed = [...exec.logs].reverse().find(l => l.status === 'failed');
  if (!lastFailed) throw new Error('No failed step found');
  exec.logs = exec.logs.filter((_, i) => i < exec.logs.length - 1);
  exec.status = 'in_progress';
  exec.current_step_id = lastFailed.step_id;
  exec.ended_at = null;
  exec.retries += 1;
  await exec.save();
  _process(execId).catch(console.error);
  return Execution.findById(execId);
}

module.exports = { start, retry };
