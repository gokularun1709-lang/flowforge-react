const router = require('express').Router();
const c = require('../controllers');
const { protect } = require('../middleware/auth');

// Auth
router.post('/auth/register', c.register);
router.post('/auth/login',    c.login);
router.get('/auth/me',        protect, c.getMe);

// Workflows
router.get('/workflows',              protect, c.getWorkflows);
router.post('/workflows',             protect, c.createWorkflow);
router.get('/workflows/:id',          protect, c.getWorkflow);
router.put('/workflows/:id',          protect, c.updateWorkflow);
router.delete('/workflows/:id',       protect, c.deleteWorkflow);
router.put('/workflows/:id/start-step', protect, c.setStartStep);
router.post('/workflows/:workflow_id/execute', protect, c.startExecution);
router.get('/workflows/:workflow_id/steps',    protect, c.getSteps);
router.post('/workflows/:workflow_id/steps',   protect, c.addStep);

// Steps
router.put('/steps/:id',    protect, c.updateStep);
router.delete('/steps/:id', protect, c.deleteStep);

// Rules
router.get('/steps/:step_id/rules',  protect, c.getRules);
router.post('/steps/:step_id/rules', protect, c.addRule);
router.put('/rules/:id',    protect, c.updateRule);
router.delete('/rules/:id', protect, c.deleteRule);
router.post('/rules/validate', protect, c.validateRule);

// Executions
router.get('/executions',         protect, c.getExecutions);
router.get('/executions/stats',   protect, c.getStats);
router.get('/executions/:id',     protect, c.getExecution);
router.post('/executions/:id/cancel', protect, c.cancelExecution);
router.post('/executions/:id/retry',  protect, c.retryExecution);

module.exports = router;
