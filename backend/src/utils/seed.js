require('dotenv').config();
const mongoose = require('mongoose');
const { User, Workflow, Step, Rule, Execution } = require('../models');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected');

  await Promise.all([User, Workflow, Step, Rule, Execution].map(M => M.deleteMany({})));
  console.log('🧹 Cleared');

  // Users
  const admin   = await User.create({ name: 'Admin User',    email: 'admin@flowforge.io',   password: 'Admin@1234',   role: 'admin' });
  const manager = await User.create({ name: 'Sarah Manager', email: 'manager@flowforge.io', password: 'Manager@1234', role: 'manager' });
  const user    = await User.create({ name: 'John Employee', email: 'user@flowforge.io',    password: 'User@1234',    role: 'user' });
  console.log('👥 Users created');

  // ── Workflow 1: Expense Approval ─────────────────────
  const wf1 = await Workflow.create({
    name: 'Expense Approval', created_by: admin._id, version: 3, is_active: true,
    description: 'Multi-level expense approval with finance and CEO review',
    tags: ['finance', 'approval'],
    input_schema: {
      amount:     { type: 'number', required: true,  description: 'Expense amount USD' },
      country:    { type: 'string', required: true },
      department: { type: 'string', required: false },
      priority:   { type: 'string', required: true, allowed_values: ['High','Medium','Low'] }
    }
  });

  const s1 = await Step.create({ workflow_id: wf1._id, name: 'Manager Approval',     step_type: 'approval',     order: 1, metadata: { assignee_email: 'manager@flowforge.io', sla_minutes: 60, escalation_email: 'admin@flowforge.io' } });
  const s2 = await Step.create({ workflow_id: wf1._id, name: 'Finance Notification', step_type: 'notification', order: 2, metadata: { notification_channel: 'email', template: 'finance_alert' } });
  const s3 = await Step.create({ workflow_id: wf1._id, name: 'CEO Approval',         step_type: 'approval',     order: 3, metadata: { assignee_email: 'ceo@flowforge.io', sla_minutes: 120 } });
  const s4 = await Step.create({ workflow_id: wf1._id, name: 'Task Completion',      step_type: 'task',         order: 4, metadata: { instructions: 'Process payment' } });
  const s5 = await Step.create({ workflow_id: wf1._id, name: 'Task Rejection',       step_type: 'task',         order: 5, metadata: { instructions: 'Notify rejection' } });

  await Workflow.findByIdAndUpdate(wf1._id, { start_step_id: s1._id });

  await Rule.create([
    { step_id: s1._id, workflow_id: wf1._id, condition: "amount > 100 && country == 'US' && priority == 'High'", next_step_id: s2._id, priority: 1, description: 'High-value US → Finance' },
    { step_id: s1._id, workflow_id: wf1._id, condition: "amount <= 100 || department == 'HR'",                   next_step_id: s3._id, priority: 2, description: 'Small or HR → CEO' },
    { step_id: s1._id, workflow_id: wf1._id, condition: "priority == 'Low' && country != 'US'",                  next_step_id: s5._id, priority: 3 },
    { step_id: s1._id, workflow_id: wf1._id, condition: 'DEFAULT', next_step_id: s5._id, priority: 4, is_default: true },
    { step_id: s2._id, workflow_id: wf1._id, condition: 'amount > 5000', next_step_id: s3._id, priority: 1 },
    { step_id: s2._id, workflow_id: wf1._id, condition: 'DEFAULT',       next_step_id: s4._id, priority: 2, is_default: true },
    { step_id: s3._id, workflow_id: wf1._id, condition: "priority == 'High'", next_step_id: s4._id, priority: 1 },
    { step_id: s3._id, workflow_id: wf1._id, condition: 'DEFAULT',            next_step_id: s5._id, priority: 2, is_default: true }
  ]);

  // ── Workflow 2: Employee Onboarding ──────────────────
  const wf2 = await Workflow.create({
    name: 'Employee Onboarding', created_by: admin._id, version: 1, is_active: true,
    description: 'Automated onboarding pipeline for new hires',
    tags: ['hr', 'onboarding'],
    input_schema: {
      department:    { type: 'string', required: true, allowed_values: ['Engineering','Sales','HR','Finance','Marketing'] },
      role_level:    { type: 'string', required: true, allowed_values: ['Junior','Mid','Senior','Lead','Director'] },
      employee_name: { type: 'string', required: true },
      remote:        { type: 'boolean', required: false }
    }
  });

  const o1 = await Step.create({ workflow_id: wf2._id, name: 'Send Welcome Email',       step_type: 'notification', order: 1, metadata: { notification_channel: 'email' } });
  const o2 = await Step.create({ workflow_id: wf2._id, name: 'IT Setup',                 step_type: 'task',         order: 2, metadata: { assignee_email: 'it@flowforge.io' } });
  const o3 = await Step.create({ workflow_id: wf2._id, name: 'Manager Introduction',     step_type: 'approval',     order: 3, metadata: { assignee_email: 'manager@flowforge.io' } });
  const o4 = await Step.create({ workflow_id: wf2._id, name: 'Senior Onboarding Track',  step_type: 'task',         order: 4, metadata: { instructions: 'Extended leadership onboarding' } });
  const o5 = await Step.create({ workflow_id: wf2._id, name: 'Onboarding Complete',      step_type: 'notification', order: 5, metadata: { notification_channel: 'ui' } });

  await Workflow.findByIdAndUpdate(wf2._id, { start_step_id: o1._id });
  await Rule.create([
    { step_id: o1._id, workflow_id: wf2._id, condition: 'DEFAULT', next_step_id: o2._id, priority: 1, is_default: true },
    { step_id: o2._id, workflow_id: wf2._id, condition: 'DEFAULT', next_step_id: o3._id, priority: 1, is_default: true },
    { step_id: o3._id, workflow_id: wf2._id, condition: "role_level == 'Senior' || role_level == 'Lead' || role_level == 'Director'", next_step_id: o4._id, priority: 1 },
    { step_id: o3._id, workflow_id: wf2._id, condition: 'DEFAULT', next_step_id: o5._id, priority: 2, is_default: true },
    { step_id: o4._id, workflow_id: wf2._id, condition: 'DEFAULT', next_step_id: o5._id, priority: 1, is_default: true }
  ]);

  // ── Sample executions ────────────────────────────────
  await Execution.create({
    workflow_id: wf1._id, workflow_name: 'Expense Approval', workflow_version: 3,
    status: 'completed', data: { amount: 250, country: 'US', department: 'Finance', priority: 'High' },
    triggered_by: user._id, triggered_by_name: 'John Employee', priority: 'high',
    started_at: new Date(Date.now() - 3600000), ended_at: new Date(Date.now() - 3590000), duration_ms: 10000,
    logs: [
      { step_id: s1._id.toString(), step_name: 'Manager Approval', step_type: 'approval', status: 'completed',
        evaluated_rules: [
          { condition: "amount > 100 && country == 'US' && priority == 'High'", result: true },
          { condition: "amount <= 100 || department == 'HR'", result: false }
        ],
        selected_next_step: 'Finance Notification', approver_name: 'Sarah Manager',
        started_at: new Date(Date.now() - 3600000), ended_at: new Date(Date.now() - 3598000), duration_ms: 2000 },
      { step_id: s2._id.toString(), step_name: 'Finance Notification', step_type: 'notification', status: 'completed',
        evaluated_rules: [{ condition: 'amount > 5000', result: false }, { condition: 'DEFAULT', result: true, is_default: true }],
        selected_next_step: 'Task Completion',
        started_at: new Date(Date.now() - 3598000), ended_at: new Date(Date.now() - 3590000), duration_ms: 8000 }
    ]
  });

  await Execution.create({
    workflow_id: wf1._id, workflow_name: 'Expense Approval', workflow_version: 3,
    status: 'failed', data: { amount: 50, country: 'IN', department: 'Sales', priority: 'Low' },
    triggered_by: user._id, triggered_by_name: 'John Employee', priority: 'medium',
    started_at: new Date(Date.now() - 7200000), ended_at: new Date(Date.now() - 7190000), duration_ms: 10000,
    logs: [
      { step_id: s1._id.toString(), step_name: 'Manager Approval', step_type: 'approval', status: 'failed',
        evaluated_rules: [
          { condition: "amount > 100 && country == 'US' && priority == 'High'", result: false },
          { condition: "amount <= 100 || department == 'HR'", result: true }
        ],
        selected_next_step: 'Task Rejection', error_message: 'Rejection path triggered',
        started_at: new Date(Date.now() - 7200000), ended_at: new Date(Date.now() - 7190000), duration_ms: 10000 }
    ]
  });

  await Workflow.updateOne({ _id: wf1._id }, { execution_count: 2, success_count: 1, avg_duration_ms: 10000 });
  console.log('✅ Sample executions created\n');
  console.log('────────────────────────────────────────');
  console.log('  admin@flowforge.io   / Admin@1234');
  console.log('  manager@flowforge.io / Manager@1234');
  console.log('  user@flowforge.io    / User@1234');
  console.log('────────────────────────────────────────\n');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
