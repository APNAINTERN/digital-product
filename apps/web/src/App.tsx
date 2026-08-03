import { useState, type FormEvent } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Bookmark,
  CheckCircle2,
  CreditCard,
  Gauge,
  Globe2,
  Search,
  Settings,
  Shield,
} from 'lucide-react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataBadge } from '@/components/ui/DataBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Progress } from '@/components/ui/Progress';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { api, getApiErrorMessage } from '@/lib/api';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { LandingPage } from '@/pages/LandingPage';
import { useAuthStore } from '@/stores/authStore';
import type { FullAnalysisReport, Pagination, Report, ReportSummary, User } from '@/types';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } },
});

type ReportsResponse = { reports: ReportSummary[]; pagination: Pagination };
type ReportResponse = { report: Report };
type AnalyzeResponse = { reportId: string; status: ReportSummary['status']; progress: number; statusMessage?: string | null };
type Website = { id: string; url: string; domain: string; label?: string | null; createdAt: string };
type WebsitesResponse = { websites: Website[] };
type Notification = { id: string; title: string; message: string; type: string; read: boolean; createdAt: string };
type NotificationsResponse = { notifications: Notification[]; unreadCount: number; pagination: Pagination };
type UsageEntry = { id: string; endpoint: string; method: string; status: number; credits: number; createdAt: string };
type UsageResponse = { usage: UsageEntry[]; totalCredits: number; pagination: Pagination };
type AdminStats = { usersCount?: number; reportsCount?: number; apiUsage?: { requests?: number; credits?: number } };
type MetricIcon = typeof Activity;

const formatDate = (value: string | null | undefined) =>
  value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : 'Not yet';

const PageHeading = ({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) => (
  <div className="mb-8">
    <p className="text-xs font-bold uppercase tracking-[0.26em] text-[rgb(var(--primary))]">{eyebrow}</p>
    <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.05em] sm:text-4xl">{title}</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgb(var(--muted-foreground))]">{description}</p>
  </div>
);

const LoadingModule = () => (
  <Card className="grid min-h-56 place-items-center">
    <div className="flex items-center gap-3 text-sm font-semibold text-[rgb(var(--muted-foreground))]">
      <Spinner />
      Loading module...
    </div>
  </Card>
);

const MetricCard = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: MetricIcon }) => (
  <Card className="p-5">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-[rgb(var(--muted-foreground))]">{label}</p>
        <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      </div>
      <div className="grid size-11 place-items-center rounded-2xl bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]">
        <Icon className="size-5" />
      </div>
    </div>
  </Card>
);

const ReportRow = ({ report }: { report: ReportSummary }) => (
  <Link
    to={`/app/reports/${report.id}`}
    className="flex flex-1 flex-col gap-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.32)] p-4 transition hover:border-[rgb(var(--primary)/0.45)] hover:bg-[rgb(var(--primary)/0.06)] sm:flex-row sm:items-center sm:justify-between"
  >
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate font-semibold">{report.domain}</p>
        <Badge variant={report.status === 'FAILED' ? 'red' : report.status === 'COMPLETED' ? 'teal' : 'amber'}>
          {report.status}
        </Badge>
      </div>
      <p className="mt-1 truncate text-sm text-[rgb(var(--muted-foreground))]">{report.summary ?? report.url}</p>
    </div>
    <div className="flex items-center gap-5 text-right">
      <div>
        <p className="font-display text-2xl font-bold text-teal-300">{report.seoScore ?? '--'}</p>
        <p className="text-xs text-[rgb(var(--muted-foreground))]">{formatDate(report.createdAt)}</p>
      </div>
      <ArrowRight className="size-4 text-[rgb(var(--muted-foreground))]" />
    </div>
  </Link>
);

const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const reportsQuery = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => (await api.get<ReportsResponse>('/reports', { params: { limit: 5 } })).data,
  });
  const reports = reportsQuery.data?.reports ?? [];

  if (reportsQuery.isLoading) return <LoadingModule />;

  return (
    <div>
      <PageHeading
        eyebrow="Dashboard"
        title={`Welcome${user?.name ? `, ${user.name}` : ''}`}
        description="Monitor audit momentum, usage, and recent reports from one growth command center."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Recent reports" value={reports.length} icon={BarChart3} />
        <MetricCard label="Completed audits" value={reports.filter((report) => report.status === 'COMPLETED').length} icon={CheckCircle2} />
        <MetricCard label="API credits used" value={`${user?.apiCallsUsed ?? 0}/${user?.apiCallsLimit ?? 10}`} icon={Gauge} />
      </div>
      <Card className="mt-6 space-y-3">
        <CardHeader>
          <CardTitle>Latest reports</CardTitle>
          <CardDescription>Your most recent SEO analysis runs.</CardDescription>
        </CardHeader>
        {reports.length ? reports.map((report) => <ReportRow key={report.id} report={report} />) : <EmptyState title="No reports yet" description="Run your first audit to populate this dashboard." />}
      </Card>
    </div>
  );
};

const AnalyzePage = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const mutation = useMutation({
    mutationFn: async () => (await api.post<AnalyzeResponse>('/analyze', { url })).data,
    onSuccess: (data) => {
      toast.success('Analysis queued');
      navigate(`/app/reports/${data.reportId}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Unable to start analysis')),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <div>
      <PageHeading eyebrow="Analyze" title="Launch a website audit" description="Submit a URL and SEO Vision AI will crawl, analyze, benchmark, and generate a structured report." />
      <Card className="max-w-3xl">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="audit-url">Website URL</Label>
            <Input id="audit-url" type="url" placeholder="https://example.com" value={url} onChange={(event) => setUrl(event.target.value)} required />
          </div>
          <Button type="submit" size="lg" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner /> : <Search className="size-4" />}
            Start audit
          </Button>
        </form>
      </Card>
    </div>
  );
};

const ReportsPage = () => {
  const client = useQueryClient();
  const reportsQuery = useQuery({
    queryKey: ['reports'],
    queryFn: async () => (await api.get<ReportsResponse>('/reports')).data,
  });
  const favoriteMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/reports/${id}/favorite`),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['reports'] }),
  });

  if (reportsQuery.isLoading) return <LoadingModule />;

  const reports = reportsQuery.data?.reports ?? [];
  return (
    <div>
      <PageHeading eyebrow="Reports" title="Audit library" description="Search-ready report history with progress, scores, and export-ready details." />
      <div className="grid gap-4">
        {reports.length ? reports.map((report) => (
          <Card key={report.id} className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <ReportRow report={report} />
              <Button variant="ghost" onClick={() => favoriteMutation.mutate(report.id)}>
                <Bookmark className="size-4" />
                {report.favorite ? 'Saved' : 'Save'}
              </Button>
            </div>
          </Card>
        )) : <EmptyState title="No reports yet" description="Run an audit to begin building your SEO intelligence library." />}
      </div>
    </div>
  );
};

const ReportDetailPage = () => {
  const { id } = useParams();
  const reportQuery = useQuery({
    queryKey: ['reports', id],
    queryFn: async () => (await api.get<ReportResponse>(`/reports/${id}`)).data.report,
    enabled: Boolean(id),
  });

  if (reportQuery.isLoading) return <LoadingModule />;
  if (!reportQuery.data) return <EmptyState title="Report not found" description="This report may have been deleted or is unavailable." />;

  const report = reportQuery.data;
  const analysis = report.data as FullAnalysisReport | null | undefined;

  return (
    <div>
      <PageHeading eyebrow="Report" title={report.domain} description={report.summary ?? report.url} />
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Performance snapshot</CardTitle>
            <CardDescription>Status: {report.statusMessage ?? report.status}</CardDescription>
          </CardHeader>
          <div className="grid grid-cols-3 gap-3 text-center">
            <ScoreRing score={report.seoScore} size={96} label="SEO" />
            <ScoreRing score={report.performanceScore} size={96} label="Perf" />
            <ScoreRing score={report.healthScore} size={96} label="Health" />
          </div>
          <Progress className="mt-6" value={report.progress} label="Report progress" />
        </Card>
        <Card>
          <Tabs
            items={[
              {
                value: 'summary',
                label: 'Summary',
                content: (
                  <div className="space-y-4 text-sm leading-7 text-[rgb(var(--muted-foreground))]">
                    <p>{analysis?.ai?.executiveSummary ?? report.summary ?? 'Loading module...'}</p>
                    <div className="flex flex-wrap gap-2">
                      <DataBadge confidence="VERIFIED" />
                      <DataBadge confidence="ESTIMATED" />
                      <DataBadge confidence="AI_GENERATED" />
                    </div>
                  </div>
                ),
              },
              {
                value: 'keywords',
                label: 'Keywords',
                content: (
                  <div className="space-y-2">
                    {(analysis?.keywordAnalysis?.rankingKeywords ?? []).slice(0, 6).map((keyword) => (
                      <div key={keyword.keyword} className="flex items-center justify-between rounded-2xl bg-[rgb(var(--foreground)/0.04)] p-3 text-sm">
                        <span>{keyword.keyword}</span>
                        <Badge confidence={keyword.confidence ?? 'ESTIMATED'}>Pos. {keyword.estimatedPosition ?? '--'}</Badge>
                      </div>
                    ))}
                    {(analysis?.keywordAnalysis?.rankingKeywords ?? []).length === 0 ? <p className="text-sm text-[rgb(var(--muted-foreground))]">Loading module...</p> : null}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
};

const SavedSitesPage = () => {
  const client = useQueryClient();
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const websitesQuery = useQuery({
    queryKey: ['websites'],
    queryFn: async () => (await api.get<WebsitesResponse>('/websites')).data.websites,
  });
  const createMutation = useMutation({
    mutationFn: async () => api.post('/websites', { url, label: label || null }),
    onSuccess: () => {
      setUrl('');
      setLabel('');
      toast.success('Site saved');
      void client.invalidateQueries({ queryKey: ['websites'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Unable to save site')),
  });

  return (
    <div>
      <PageHeading eyebrow="Saved sites" title="Reusable website targets" description="Keep recurring audit targets close." />
      <Card className="mb-6 max-w-3xl">
        <form className="grid gap-4 md:grid-cols-[1fr_0.8fr_auto]" onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
          <Input type="url" placeholder="https://example.com" value={url} onChange={(event) => setUrl(event.target.value)} required />
          <Input placeholder="Label" value={label} onChange={(event) => setLabel(event.target.value)} />
          <Button type="submit" disabled={createMutation.isPending}>Save site</Button>
        </form>
      </Card>
      {websitesQuery.isLoading ? <LoadingModule /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {(websitesQuery.data ?? []).map((website) => (
            <Card key={website.id}>
              <Globe2 className="mb-4 size-6 text-[rgb(var(--primary))]" />
              <CardTitle>{website.label ?? website.domain}</CardTitle>
              <CardDescription>{website.url}</CardDescription>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const BillingPage = () => (
  <div>
    <PageHeading eyebrow="Billing" title="Plan controls" description="Upgrade path placeholder wired for plan-aware product surfaces." />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {['FREE', 'STARTER', 'PRO', 'ENTERPRISE'].map((plan) => (
        <Card key={plan}>
          <CreditCard className="mb-4 size-6 text-[rgb(var(--primary))]" />
          <CardTitle>{plan}</CardTitle>
          <CardDescription>Loading module...</CardDescription>
        </Card>
      ))}
    </div>
  </div>
);

const UsagePage = () => {
  const usageQuery = useQuery({ queryKey: ['usage'], queryFn: async () => (await api.get<UsageResponse>('/usage')).data });
  if (usageQuery.isLoading) return <LoadingModule />;

  return (
    <div>
      <PageHeading eyebrow="Usage" title="API credit activity" description="Review consumed credits and recent API events." />
      <MetricCard label="Total credits" value={usageQuery.data?.totalCredits ?? 0} icon={Activity} />
      <div className="mt-6 space-y-3">
        {(usageQuery.data?.usage ?? []).map((entry) => (
          <Card key={entry.id} className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{entry.method} {entry.endpoint}</p>
                <p className="text-sm text-[rgb(var(--muted-foreground))]">{formatDate(entry.createdAt)}</p>
              </div>
              <Badge variant={entry.status >= 400 ? 'red' : 'teal'}>{entry.credits} credit</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [name, setName] = useState(user?.name ?? '');
  const mutation = useMutation({
    mutationFn: async () => (await api.patch<{ user: User }>('/auth/me', { name })).data.user,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success('Profile updated');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Unable to update profile')),
  });

  return (
    <div>
      <PageHeading eyebrow="Profile" title="Account settings" description="Manage identity and workspace preferences." />
      <Card className="max-w-2xl">
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
          <div className="space-y-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="rounded-2xl bg-[rgb(var(--foreground)/0.04)] p-4 text-sm text-[rgb(var(--muted-foreground))]">
            {user?.email} - {user?.plan} - {user?.role}
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner /> : <Settings className="size-4" />}
            Save profile
          </Button>
        </form>
      </Card>
    </div>
  );
};

const NotificationsPage = () => {
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<NotificationsResponse>('/notifications')).data,
  });
  if (notificationsQuery.isLoading) return <LoadingModule />;

  return (
    <div>
      <PageHeading eyebrow="Notifications" title="Workspace updates" description="Analysis completion and system alerts." />
      <div className="space-y-3">
        {(notificationsQuery.data?.notifications ?? []).map((notification) => (
          <Card key={notification.id} className="p-4">
            <div className="flex gap-3">
              <Bell className="mt-1 size-5 text-[rgb(var(--primary))]" />
              <div>
                <p className="font-semibold">{notification.title}</p>
                <p className="text-sm text-[rgb(var(--muted-foreground))]">{notification.message}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const AdminPage = () => {
  const statsQuery = useQuery({ queryKey: ['admin', 'stats'], queryFn: async () => (await api.get<AdminStats>('/admin/stats')).data });
  if (statsQuery.isLoading) return <LoadingModule />;

  return (
    <div>
      <PageHeading eyebrow="Admin" title="Platform overview" description="Administrative reporting shell for team operators." />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Users" value={statsQuery.data?.usersCount ?? 'Loading module...'} icon={Shield} />
        <MetricCard label="Reports" value={statsQuery.data?.reportsCount ?? 'Loading module...'} icon={BarChart3} />
        <MetricCard label="Requests" value={statsQuery.data?.apiUsage?.requests ?? 'Loading module...'} icon={Activity} />
      </div>
    </div>
  );
};

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
        <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="analyze" element={<AnalyzePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/:id" element={<ReportDetailPage />} />
          <Route path="saved" element={<SavedSitesPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="usage" element={<UsagePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="admin/*" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
