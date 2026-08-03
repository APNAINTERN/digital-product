import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';

type MeResponse = {
  user: User;
};

type ProtectedRouteProps = {
  children: ReactNode;
};

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get<MeResponse>('/auth/me');
      return data.user;
    },
    enabled: isHydrated && Boolean(token) && !user,
    retry: false,
  });

  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data);
    }
  }, [meQuery.data, setUser]);

  useEffect(() => {
    if (meQuery.isError) {
      logout();
    }
  }, [logout, meQuery.isError]);

  if (!isHydrated) {
    return <FullPageLoader />;
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!user && meQuery.isLoading) {
    return <FullPageLoader />;
  }

  return <>{children}</>;
};

const FullPageLoader = () => (
  <div className="grid min-h-screen place-items-center bg-[rgb(var(--background))]">
    <div className="glass flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold">
      <Spinner />
      Loading SEO Vision AI
    </div>
  </div>
);
