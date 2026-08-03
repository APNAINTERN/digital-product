import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { BarChart3, Bell, Settings, Shield, Users } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { hydrateAuthStore } from '@/stores/authStore'
import { hydrateThemeStore } from '@/stores/themeStore'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import DashboardPage from '@/pages/app/DashboardPage'
import AnalyzePage from '@/pages/app/AnalyzePage'
import ReportsPage from '@/pages/app/ReportsPage'
import ReportDetailPage from '@/pages/app/ReportDetailPage'
import SavedWebsitesPage from '@/pages/app/SavedWebsitesPage'
import BillingPage from '@/pages/app/BillingPage'
import UsagePage from '@/pages/app/UsagePage'
import ProfilePage from '@/pages/app/ProfilePage'
import NotificationsPage from '@/pages/app/NotificationsPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminReportsPage from '@/pages/admin/AdminReportsPage'
import AdminMessagesPage from '@/pages/admin/AdminMessagesPage'
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage'
import './App.css'

const queryClient = new QueryClient()

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: Shield },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/messages', label: 'Messages', icon: Bell },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

function AdminLayout() {
  return (
    <div className="app-frame">
      <aside className="sidebar sidebar--admin">
        <Link className="brand" to="/admin"><span>AD</span><strong>SEO Vision Admin</strong></Link>
        <nav>
          {adminNav.map((item) => {
            const Icon = item.icon
            return <Link key={item.to} to={item.to}><Icon size={18} /> {item.label}</Link>
          })}
        </nav>
        <Link className="icon-link" to="/app">Back to app</Link>
      </aside>
      <main className="main-panel"><Outlet /></main>
    </div>
  )
}

function App() {
  useEffect(() => {
    hydrateAuthStore()
    hydrateThemeStore()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<LandingPage />} path="/" />
          <Route element={<LoginPage />} path="/login" />
          <Route element={<RegisterPage />} path="/register" />
          <Route element={<ForgotPasswordPage />} path="/forgot-password" />
          <Route element={<ResetPasswordPage />} path="/reset-password" />
          <Route element={<VerifyEmailPage />} path="/verify-email" />
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>} path="/app">
            <Route element={<DashboardPage />} index />
            <Route element={<DashboardPage />} path="dashboard" />
            <Route element={<AnalyzePage />} path="analyze" />
            <Route element={<ReportsPage />} path="reports" />
            <Route element={<ReportDetailPage />} path="reports/:id" />
            <Route element={<SavedWebsitesPage />} path="saved" />
            <Route element={<SavedWebsitesPage />} path="websites" />
            <Route element={<BillingPage />} path="billing" />
            <Route element={<UsagePage />} path="usage" />
            <Route element={<ProfilePage />} path="profile" />
            <Route element={<NotificationsPage />} path="notifications" />
          </Route>
          <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>} path="/admin">
            <Route element={<AdminDashboardPage />} index />
            <Route element={<AdminUsersPage />} path="users" />
            <Route element={<AdminReportsPage />} path="reports" />
            <Route element={<AdminMessagesPage />} path="messages" />
            <Route element={<AdminSettingsPage />} path="settings" />
          </Route>
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#071725',
            border: '1px solid rgba(34, 211, 238, .28)',
            color: '#e2f8ff',
          },
        }}
      />
    </QueryClientProvider>
  )
}

export default App
