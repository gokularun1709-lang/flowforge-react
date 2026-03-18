const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── User ──────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role:     { type: String, enum: ['admin','manager','user'], default: 'user' }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = function(p) { return bcrypt.compare(p, this.password); };
userSchema.methods.toJSON = function() { const o = this.toObject(); delete o.password; return o; };

// ── Workflow ──────────────────────────────────────────
const workflowSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  description:   { type: String },
  version:       { type: Number, default: 1 },
  is_active:     { type: Boolean, default: true },
  input_schema:  { type: mongoose.Schema.Types.Mixed, default: {} },
  start_step_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Step', default: null },
  created_by:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags:          [String],
  execution_count: { type: Number, default: 0 },
  success_count:   { type: Number, default: 0 },
  avg_duration_ms: { type: Number, default: 0 }
}, { timestamps: true });

// ── Step ─────────────────────────────────────────────
const stepSchema = new mongoose.Schema({
  workflow_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
  name:        { type: String, required: true },
  step_type:   { type: String, enum: ['task','approval','notification'], required: true },
  order:       { type: Number, required: true },
  metadata:    { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// ── Rule ─────────────────────────────────────────────
const ruleSchema = new mongoose.Schema({
  step_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Step', required: true },
  workflow_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
  condition:   { type: String, required: true },
  next_step_id:{ type: mongoose.Schema.Types.ObjectId, ref: 'Step', default: null },
  priority:    { type: Number, required: true },
  is_default:  { type: Boolean, default: false },
  description: { type: String },
  hit_count:   { type: Number, default: 0 },
  last_triggered: { type: Date, default: null }
}, { timestamps: true });
ruleSchema.index({ step_id: 1, priority: 1 });

// ── Execution ─────────────────────────────────────────
const stepLogSchema = new mongoose.Schema({
  step_id:   String,
  step_name: String,
  step_type: String,
  status:    { type: String, enum: ['pending','in_progress','completed','failed','skipped'] },
  evaluated_rules: [{
    condition: String,
    result: Boolean,
    is_default: Boolean,
    _id: false
  }],
  selected_next_step: { type: String, default: null },
  approver_name:  { type: String, default: null },
  error_message:  { type: String, default: null },
  started_at:  Date,
  ended_at:    Date,
  duration_ms: { type: Number, default: 0 },
  iteration:   { type: Number, default: 1 }
}, { _id: false });

const executionSchema = new mongoose.Schema({
  workflow_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
  workflow_name:     String,
  workflow_version:  Number,
  status:            { type: String, enum: ['pending','in_progress','completed','failed','canceled'], default: 'pending' },
  data:              { type: mongoose.Schema.Types.Mixed, required: true },
  logs:              [stepLogSchema],
  current_step_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Step', default: null },
  current_step_name: { type: String, default: null },
  retries:           { type: Number, default: 0 },
  triggered_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  triggered_by_name: String,
  priority:          { type: String, enum: ['low','medium','high','critical'], default: 'medium' },
  notes:             String,
  started_at:  { type: Date, default: null },
  ended_at:    { type: Date, default: null },
  duration_ms: { type: Number, default: 0 }
}, { timestamps: true });
executionSchema.index({ workflow_id: 1, status: 1 });
executionSchema.index({ createdAt: -1 });

module.exports = {
  User:      mongoose.model('User',      userSchema),
  Workflow:  mongoose.model('Workflow',  workflowSchema),
  Step:      mongoose.model('Step',      stepSchema),
  Rule:      mongoose.model('Rule',      ruleSchema),
  Execution: mongoose.model('Execution', executionSchema)
};
