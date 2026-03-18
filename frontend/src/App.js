import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ToastProvider, useAuth } from './context';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WorkflowList from './pages/WorkflowList';
import WorkflowEditor from './pages/WorkflowEditor';
import ExecuteWorkflow from './pages/ExecuteWorkflow';
import AuditLog from './pages/AuditLog';
import ExecutionDetail from './pages/ExecutionDetail';
import RuleTester from './pages/RuleTester';

// Guard must live INSIDE AuthProvider so useAuth() works
function Guard({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Guard><Layout /></Guard>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"             element={<Dashboard />} />
        <Route path="workflows"             element={<WorkflowList />} />
        <Route path="workflows/new"         element={<WorkflowEditor />} />
        <Route path="workflows/:id/edit"    element={<WorkflowEditor />} />
        <Route path="workflows/:id/execute" element={<ExecuteWorkflow />} />
        <Route path="executions"            element={<AuditLog />} />
        <Route path="executions/:id"        element={<ExecutionDetail />} />
        <Route path="rule-tester"           element={<RuleTester />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
