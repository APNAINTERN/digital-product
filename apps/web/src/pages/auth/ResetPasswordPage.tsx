import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';

type AuthResponse = {
  token: string;
  user: User;
};

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = searchParams.get('token') ?? '';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      toast.error('Reset token is missing.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await api.post<AuthResponse>('/auth/reset-password', { token, password });
      setAuth(data);
      toast.success('Password updated');
      navigate('/app', { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to reset password'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Use a strong password to restore secure access to your SEO Vision AI workspace."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {!token ? (
          <div className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            This reset link is missing a token. Request a fresh password reset email.
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            placeholder="At least 8 characters"
            required
          />
        </div>
        <Button type="submit" fullWidth size="lg" disabled={isSubmitting || !token}>
          {isSubmitting ? <Spinner /> : null}
          Reset password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[rgb(var(--muted-foreground))]">
        Need another link?{' '}
        <Link to="/forgot-password" className="font-semibold text-[rgb(var(--primary))]">
          Request reset
        </Link>
      </p>
    </AuthLayout>
  );
};
