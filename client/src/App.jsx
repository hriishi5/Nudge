import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';

// Pages
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InvoicesPage from './pages/InvoicesPage.jsx';
import InvoiceDetailPage from './pages/InvoiceDetailPage.jsx';
import InvoiceUploadPage from './pages/InvoiceUploadPage.jsx';
import VendorsPage from './pages/VendorsPage.jsx';
import VendorDetailPage from './pages/VendorDetailPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import AssistantPage from './pages/AssistantPage.jsx';
import Form3CDPage from './pages/Form3CDPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AuditLogPage from './pages/AuditLogPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Authenticated Tenant Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/invoices/upload" element={<InvoiceUploadPage />} />
              <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/vendors/:id" element={<VendorDetailPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/reports/form-3cd" element={<Form3CDPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/audit-log" element={<AuditLogPage />} />
            </Route>

            {/* Default Redirection */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
