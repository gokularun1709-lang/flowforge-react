const jwt = require('jsonwebtoken');
const { User, Workflow, Step, Rule, Execution } = require('../models');
const execService = require('../services/execution');
const { evaluate } = require('../services/ruleEngine');

const token = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
const ok = (res, data, msg, status = 200) => res.status(status).json({ success: true, message: msg, data });
const fail = (res, msg, status = 400) => res.status(status).json({ success: false, message: msg });

// ── AUTH ──────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (await User.findOne({ email })) return fail(res, 'Email already registered', 409);
    const user = await User.create({ name, email, password, role });
    ok(res, { token: token(user._id), user }, 'Registered', 201);
  } catch (e) { next(e); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) return fail(res, 'Invalid credentials', 401);
    user.password = undefined;
    ok(res, { token: token(user._id), user }, 'Login successful');
  } catch (e) { next(e); }
};

exports.getMe = (req, res) => ok(res, req.user, 'OK');

// ── WORKFLOWS ─────────────────────────────────────────
exports.createWorkflow = async (req, res, next) => {
  try {
    const wf = await Workflow.create({ ...req.body, created_by: req.user._id, version: 1, is_active: true });
    ok(res, wf, 'Workflow created', 201);
  } catch (e) { next(e); }
};

exports.getWorkflows = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const q = {};
    if (search) q.name = { $regex: search, $options: 'i' };
    if (status === 'active') q.is_active = true;
    if (status === 'inactive') q.is_active = false;
    const total = await Workflow.countDocuments(q);
    const workflows = await Workflow.find(q).populate('created_by','name email')
      .sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit);
    const data = await Promise.all(workflows.map(async w => ({
      ...w.toJSON(), step_count: await Step.countDocuments({ workflow_id: w._id })
    })));
    res.json({ success: true, data, pagination: { total, page:+page, limit:+limit, pages: Math.ceil(total/limit) } });
  } catch (e) { next(e); }
};

exports.getWorkflow = async (req, res, next) => {
  try {
    const wf = await Workflow.findById(req.params.id).populate('created_by','name email');
    if (!wf) return fail(res, 'Workflow not found', 404);
    const steps = await Step.find({ workflow_id: wf._id }).sort({ order: 1 });
    const stepsWithRules = await Promise.all(steps.map(async s => ({
      ...s.toObject(), rules: await Rule.find({ step_id: s._id }).populate('next_step_id','name step_type').sort({ priority: 1 })
    })));
    ok(res, { ...wf.toJSON(), steps: stepsWithRules }, 'OK');
  } catch (e) { next(e); }
};

exports.updateWorkflow = async (req, res, next) => {
  try {
    const wf = await Workflow.findByIdAndUpdate(req.params.id,
      { ...req.body, $inc: { version: 1 } }, { new: true });
    if (!wf) return fail(res, 'Not found', 404);
    ok(res, wf, 'Updated (new version)');
  } catch (e) { next(e); }
};

exports.deleteWorkflow = async (req, res, next) => {
  try {
    const steps = await Step.find({ workflow_id: req.params.id });
    for (const s of steps) await Rule.deleteMany({ step_id: s._id });
    await Step.deleteMany({ workflow_id: req.params.id });
    await Workflow.findByIdAndDelete(req.params.id);
    ok(res, null, 'Deleted');
  } catch (e) { next(e); }
};

exports.setStartStep = async (req, res, next) => {
  try {
    const wf = await Workflow.findByIdAndUpdate(req.params.id,
      { start_step_id: req.body.step_id }, { new: true });
    ok(res, wf, 'Start step set');
  } catch (e) { next(e); }
};

// ── STEPS ─────────────────────────────────────────────
exports.addStep = async (req, res, next) => {
  try {
    const step = await Step.create({ ...req.body, workflow_id: req.params.workflow_id });
    const count = await Step.countDocuments({ workflow_id: req.params.workflow_id });
    if (count === 1)
      await Workflow.findByIdAndUpdate(req.params.workflow_id, { start_step_id: step._id });
    ok(res, step, 'Step added', 201);
  } catch (e) { next(e); }
};

exports.getSteps = async (req, res, next) => {
  try {
    const steps = await Step.find({ workflow_id: req.params.workflow_id }).sort({ order: 1 });
    const data = await Promise.all(steps.map(async s => ({
      ...s.toObject(),
      rules: await Rule.find({ step_id: s._id }).populate('next_step_id','name step_type').sort({ priority: 1 })
    })));
    ok(res, data, 'OK');
  } catch (e) { next(e); }
};

exports.updateStep = async (req, res, next) => {
  try {
    const s = await Step.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!s) return fail(res, 'Not found', 404);
    ok(res, s, 'Updated');
  } catch (e) { next(e); }
};

exports.deleteStep = async (req, res, next) => {
  try {
    await Rule.deleteMany({ step_id: req.params.id });
    await Step.findByIdAndDelete(req.params.id);
    await Workflow.updateOne({ start_step_id: req.params.id }, { $unset: { start_step_id: '' } });
    ok(res, null, 'Deleted');
  } catch (e) { next(e); }
};

// ── RULES ─────────────────────────────────────────────
exports.addRule = async (req, res, next) => {
  try {
    const step = await Step.findById(req.params.step_id);
    if (!step) return fail(res, 'Step not found', 404);
    const is_default = req.body.condition?.trim().toUpperCase() === 'DEFAULT';
    const rule = await Rule.create({ ...req.body, step_id: req.params.step_id, workflow_id: step.workflow_id, is_default });
    ok(res, rule, 'Rule added', 201);
  } catch (e) { next(e); }
};

exports.getRules = async (req, res, next) => {
  try {
    const rules = await Rule.find({ step_id: req.params.step_id })
      .populate('next_step_id','name step_type').sort({ priority: 1 });
    ok(res, rules, 'OK');
  } catch (e) { next(e); }
};

exports.updateRule = async (req, res, next) => {
  try {
    if (req.body.condition)
      req.body.is_default = req.body.condition.trim().toUpperCase() === 'DEFAULT';
    const rule = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('next_step_id','name step_type');
    if (!rule) return fail(res, 'Not found', 404);
    ok(res, rule, 'Updated');
  } catch (e) { next(e); }
};

exports.deleteRule = async (req, res, next) => {
  try {
    await Rule.findByIdAndDelete(req.params.id);
    ok(res, null, 'Deleted');
  } catch (e) { next(e); }
};

exports.validateRule = async (req, res, next) => {
  try {
    const { condition, sample_data = {} } = req.body;
    if (!condition) return fail(res, 'Condition required');
    const isDefault = condition.trim().toUpperCase() === 'DEFAULT';
    if (isDefault) return ok(res, { valid: true, result: true, message: 'DEFAULT always matches' }, 'OK');
    try {
      const result = evaluate(condition, sample_data);
      ok(res, { valid: true, result, message: 'Valid condition' }, 'OK');
    } catch (e) {
      ok(res, { valid: false, result: null, message: e.message }, 'OK');
    }
  } catch (e) { next(e); }
};

// ── EXECUTIONS ────────────────────────────────────────
exports.startExecution = async (req, res, next) => {
  try {
    const exec = await execService.start(
      req.params.workflow_id, req.body.data,
      req.user._id, req.user.name,
      { priority: req.body.priority, notes: req.body.notes }
    );
    ok(res, exec, 'Execution started', 201);
  } catch (e) { next(e); }
};

exports.getExecutions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, workflow_id } = req.query;
    const q = {};
    if (status) q.status = status;
    if (workflow_id) q.workflow_id = workflow_id;
    const total = await Execution.countDocuments(q);
    const data = await Execution.find(q).populate('triggered_by','name email')
      .sort({ createdAt: -1 }).skip((page-1)*limit).limit(+limit);
    res.json({ success: true, data, pagination: { total, page:+page, limit:+limit, pages: Math.ceil(total/limit) } });
  } catch (e) { next(e); }
};

exports.getExecution = async (req, res, next) => {
  try {
    const e = await Execution.findById(req.params.id).populate('triggered_by','name email');
    if (!e) return fail(res, 'Not found', 404);
    ok(res, e, 'OK');
  } catch (e) { next(e); }
};

exports.cancelExecution = async (req, res, next) => {
  try {
    const e = await Execution.findById(req.params.id);
    if (!e) return fail(res, 'Not found', 404);
    if (!['pending','in_progress'].includes(e.status)) return fail(res, 'Cannot cancel');
    const updated = await Execution.findByIdAndUpdate(req.params.id,
      { status: 'canceled', ended_at: new Date() }, { new: true });
    ok(res, updated, 'Canceled');
  } catch (e) { next(e); }
};

exports.retryExecution = async (req, res, next) => {
  try {
    const e = await execService.retry(req.params.id);
    ok(res, e, 'Retrying');
  } catch (e) { next(e); }
};

exports.getStats = async (req, res, next) => {
  try {
    const [total, completed, failed, inProgress] = await Promise.all([
      Execution.countDocuments(),
      Execution.countDocuments({ status: 'completed' }),
      Execution.countDocuments({ status: 'failed' }),
      Execution.countDocuments({ status: 'in_progress' })
    ]);
    const recent = await Execution.find().sort({ createdAt: -1 }).limit(5);
    ok(res, {
      total, completed, failed, inProgress,
      successRate: total ? Math.round((completed/total)*100) : 0,
      recentExecutions: recent
    }, 'OK');
  } catch (e) { next(e); }
};
