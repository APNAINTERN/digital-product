import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { LandingPage } from '@/pages/LandingPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import DashboardPage from '@/pages/app/DashboardPage';
import AnalyzePage from '@/pages/app/AnalyzePage';
import ReportsPage from '@/pages/app/ReportsPage';
import ReportDetailPage from '@/pages/app/ReportDetailPage';
import SavedWebsitesPage from '@/pages/app/SavedWebsitesPage';
import BillingPage from '@/pages/app/BillingPage';
import UsagePage from '@/pages/app/UsagePage';
import ProfilePage from '@/pages/app/ProfilePage';
import NotificationsPage from '@/pages/app/NotificationsPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminReportsPage from '@/pages/admin/AdminReportsPage';
import AdminMessagesPage from '@/pages/admin/AdminMessagesPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const AdminLayout = () => (
  <Routes>
    <Route index element={<AdminDashboardPage />} />
    <Route path="users" element={<AdminUsersPage />} />
    <Route path="reports" element={<AdminReportsPage />} />
    <Route path="messages" element={<AdminMessagesPage />} />
    <Route path="settings" element={<AdminSettingsPage />} />
    <Route path="*" element={<Navigate to="/app/admin" replace />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgb(15 23 42)',
            color: 'rgb(248 250 252)',
            border: '1px solid rgb(45 212 191 / 0.18)',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="analyze" element={<AnalyzePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/:id" element={<ReportDetailPage />} />
          <Route path="saved" element={<SavedWebsitesPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="usage" element={<UsagePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="admin/*" element={<AdminLayout />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
