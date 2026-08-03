import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export const RegisterPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const { data } = await api.post<AuthResponse>('/auth/register', { name, email, password });
      setAuth(data);
      toast.success('Workspace created. Check your inbox to verify your email.');
      navigate('/app', { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create account'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Start your free audit"
      subtitle="Create a workspace for audits, AI recommendations, saved sites, and usage tracking."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jordan Lee"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
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
          <Label htmlFor="password">Password</Label>
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

        <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-[rgb(var(--muted-foreground))]">
          Demo credentials: <span className="font-semibold text-[rgb(var(--foreground))]">demo@seovision.ai</span> /
          <span className="font-semibold text-[rgb(var(--foreground))]"> Demo123!</span>
        </div>

        <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          Create workspace
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[rgb(var(--muted-foreground))]">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-[rgb(var(--primary))]">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};
