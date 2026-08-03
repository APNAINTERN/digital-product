import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, MailWarning } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Spinner } from '@/components/ui/Spinner';
import { api, getApiErrorMessage } from '@/lib/api';

type MessageResponse = {
  message: string;
};

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const verifyQuery = useQuery({
    queryKey: ['auth', 'verify-email', token],
    queryFn: async () => {
      const { data } = await api.get<MessageResponse>('/auth/verify-email', { params: { token } });
      return data;
    },
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    if (verifyQuery.isSuccess) {
      toast.success(verifyQuery.data.message);
    }
  }, [verifyQuery.data?.message, verifyQuery.isSuccess]);

  useEffect(() => {
    if (verifyQuery.isError) {
      toast.error(getApiErrorMessage(verifyQuery.error, 'Unable to verify email'));
    }
  }, [verifyQuery.error, verifyQuery.isError]);

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Confirm your email address to unlock the full SEO Vision AI workflow."
    >
      <div className="space-y-6 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]">
          {verifyQuery.isLoading ? (
            <Spinner className="size-7" />
          ) : verifyQuery.isSuccess ? (
            <CheckCircle2 className="size-8" />
          ) : (
            <MailWarning className="size-8" />
          )}
        </div>

        {!token ? (
          <p className="text-sm leading-6 text-[rgb(var(--muted-foreground))]">
            This verification link is missing a token. Open the latest email from SEO Vision AI or request a new one
            from your profile.
          </p>
        ) : verifyQuery.isSuccess ? (
          <p className="text-sm leading-6 text-[rgb(var(--muted-foreground))]">{verifyQuery.data.message}</p>
        ) : verifyQuery.isError ? (
          <p className="text-sm leading-6 text-[rgb(var(--muted-foreground))]">
            {getApiErrorMessage(verifyQuery.error, 'The verification link is invalid or expired.')}
          </p>
        ) : (
          <p className="text-sm leading-6 text-[rgb(var(--muted-foreground))]">Verifying your email address...</p>
        )}

        <Link
          to="/login"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[rgb(var(--primary))] px-5 text-sm font-semibold text-[rgb(var(--primary-foreground))] shadow-lg shadow-teal-500/20 transition hover:brightness-110"
        >
          Continue to sign in
        </Link>
      </div>
    </AuthLayout>
  );
};
