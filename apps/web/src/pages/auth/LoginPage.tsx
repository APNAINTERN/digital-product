import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import { loginWithPassword } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('demo@seovision.ai');
  const [password, setPassword] = useState('Demo123!');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/app';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const data = await loginWithPassword(email, password);
      setAuth(data);
      toast.success('Welcome back to SEO Vision AI');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to SEO Vision AI"
      subtitle="Analyze any website, unlock SEO scores, competitor intel, and AI growth plans."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-semibold text-[rgb(var(--primary))]">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <div className="rounded-2xl border border-teal-300/20 bg-teal-400/10 px-4 py-3 text-sm text-[rgb(var(--muted-foreground))]">
          {isSupabaseConfigured ? (
            <>
              Auth via <span className="font-semibold text-[rgb(var(--foreground))]">Supabase</span>. First time?
              use <Link to="/register" className="font-semibold text-[rgb(var(--primary))]">Create workspace</Link>.
            </>
          ) : (
            <>
              Demo credentials: <span className="font-semibold text-[rgb(var(--foreground))]">demo@seovision.ai</span> /
              <span className="font-semibold text-[rgb(var(--foreground))]"> Demo123!</span>
            </>
          )}
        </div>

        <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[rgb(var(--muted-foreground))]">
        New here?{' '}
        <Link to="/register" className="font-semibold text-[rgb(var(--primary))]">
          Create a free account
        </Link>
      </p>
    </AuthLayout>
  );
};
