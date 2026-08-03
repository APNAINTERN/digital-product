import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import { requestPasswordReset } from '@/lib/auth';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const nextMessage = await requestPasswordReset(email);
      setMessage(nextMessage);
      toast.success('Reset instructions requested');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to request reset email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we will send a secure reset link if an account exists."
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
        {message ? (
          <div className="rounded-2xl border border-teal-300/20 bg-teal-400/10 px-4 py-3 text-sm text-[rgb(var(--muted-foreground))]">
            {message}
          </div>
        ) : null}
        <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[rgb(var(--muted-foreground))]">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-[rgb(var(--primary))]">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};
