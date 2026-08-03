import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Bookmark,
  CreditCard,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Shield,
  Sparkles,
  Sun,
  User,
  X,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

const navItems = [
  { label: 'Dashboard', href: '/app', icon: LayoutDashboard, end: true },
  { label: 'Analyze', href: '/app/analyze', icon: Search },
  { label: 'Reports', href: '/app/reports', icon: BarChart3 },
  { label: 'Saved Sites', href: '/app/saved', icon: Bookmark },
  { label: 'Billing', href: '/app/billing', icon: CreditCard },
  { label: 'Usage', href: '/app/usage', icon: Gauge },
  { label: 'Profile', href: '/app/profile', icon: User },
];

export const BrandMark = () => (
  <div className="flex items-center gap-3">
    <div className="relative grid size-11 place-items-center overflow-hidden rounded-2xl border border-teal-300/30 bg-slate-950 shadow-lg shadow-teal-500/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.45),transparent_45%),linear-gradient(135deg,rgba(13,148,136,0.55),rgba(15,23,42,0.95))]" />
      <span className="relative font-display text-sm font-extrabold tracking-[-0.08em] text-white">SV</span>
    </div>
    <div>
      <div className="font-display text-base font-bold leading-tight text-[rgb(var(--foreground))]">SEO Vision AI</div>
      <div className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Organic growth cockpit</div>
    </div>
  </div>
);

const getInitials = (name: string | null | undefined, email: string | undefined) => {
  const source = name?.trim() || email || 'SV';
  return source
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

export const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const cycleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links =
    user?.role === 'ADMIN'
      ? [
          ...navItems,
          { label: 'Admin', href: '/app/admin', icon: Shield },
          { label: 'Users', href: '/app/admin/users', icon: User },
          { label: 'All Reports', href: '/app/admin/reports', icon: BarChart3 },
          { label: 'Messages', href: '/app/admin/messages', icon: Bell },
          { label: 'Settings', href: '/app/admin/settings', icon: Gauge },
        ]
      : navItems;

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition lg:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--background)/0.88)] px-4 py-5 backdrop-blur-2xl transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-8 flex items-center justify-between">
          <BrandMark />
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">
          {links.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-[rgb(var(--muted-foreground))] transition',
                    'hover:bg-[rgb(var(--primary)/0.08)] hover:text-[rgb(var(--foreground))]',
                    isActive &&
                      'border border-teal-300/20 bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--foreground))] shadow-lg shadow-teal-500/10',
                  )
                }
              >
                <Icon className="size-4 text-[rgb(var(--primary))]" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-[rgb(var(--border))] pt-4">
          <Button variant="outline" fullWidth className="justify-start" onClick={cycleTheme}>
            {theme === 'light' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            Theme: {theme}
          </Button>
          <Button variant="ghost" fullWidth className="justify-start" onClick={handleLogout}>
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-[rgb(var(--border))] bg-[rgb(var(--background)/0.78)] backdrop-blur-2xl">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="size-5" />
              </Button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--primary))]">
                  Workspace
                </p>
                <h1 className="font-display text-lg font-semibold">Growth intelligence</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Badge variant="teal" className="hidden sm:inline-flex">
                <Sparkles className="mr-1 size-3" />
                {user?.plan ?? 'FREE'}
              </Badge>
              <Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => navigate('/app/notifications')}>
                <Bell className="size-5" />
              </Button>
              <div className="hidden items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.42)] py-1.5 pl-2 pr-3 sm:flex">
                <div className="grid size-8 place-items-center rounded-xl bg-[rgb(var(--primary)/0.16)] text-xs font-bold text-[rgb(var(--primary))]">
                  {getInitials(user?.name, user?.email)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user?.name ?? 'SEO strategist'}</p>
                  <p className="truncate text-xs text-[rgb(var(--muted-foreground))]">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_8%,rgba(45,212,191,0.12),transparent_24rem),radial-gradient(circle_at_10%_35%,rgba(245,158,11,0.08),transparent_22rem)]" />
          <Outlet />
        </main>
      </div>

      <div className="pointer-events-none fixed bottom-5 right-5 hidden items-center gap-2 rounded-full border border-teal-300/20 bg-slate-950/80 px-3 py-2 text-xs font-semibold text-teal-100 shadow-2xl shadow-teal-500/10 backdrop-blur sm:flex">
        <Zap className="size-3.5 text-teal-300" />
        Live API ready
      </div>
    </div>
  );
};
