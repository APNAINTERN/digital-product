import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import { registerWithPassword } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setInfo(null);

    try {
      const data = await registerWithPassword(name.trim(), email.trim(), password);

      if (data.needsEmailConfirmation || !data.token) {
        const message =
          data.info ||
          'Account created. Confirm your email, then sign in. (Or disable Confirm email in Supabase Auth settings.)';
        setInfo(message);
        toast.success('Account created — confirm email to sign in');
        return;
      }

      setAuth(data);
      toast.success('Account created successfully');
      navigate('/app', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create account';
      toast.error(message);
      setInfo(message);
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
            placeholder="you@gmail.com"
            required
          />
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            Use a real email (Gmail etc.). After deploy, Vercel must have DATABASE_URL set to your Supabase
            Postgres URI or account creation will fail.
          </p>
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

        {info ? (
          <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-[rgb(var(--muted-foreground))]">
            {info}
          </div>
        ) : null}

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
