import { useEffect, type ReactNode } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingCard } from './StatusCards';

/** 로그인한 교사만 들어갈 수 있는 페이지 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.history.replace(`/login?from=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [isLoading, isAuthenticated, router]);
  if (isLoading || !isAuthenticated) return <LoadingCard text="로그인 상태를 확인하는 중…" />;
  return <>{children}</>;
}
