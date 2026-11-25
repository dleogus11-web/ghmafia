import { Link } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { isMock } from '@/lib/env';

/** 교사 화면 상단(로그인 정보·목업 표시) */
export function AppHeader() {
  const { user, logout } = useAuth();
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Link to="/" className="font-display text-lg">
        교실 마피아
      </Link>
      {isMock && <span className="rounded-full border border-warn px-2 py-px text-xs text-warn">목업 모드 · 같은 브라우저 탭끼리만 연결</span>}
      <div className="flex-1" />
      {user && (
        <>
          <span className="text-muted-foreground">{user.displayName ?? user.email}</span>
          <Button size="sm" variant="ghost" onClick={() => void logout()}>
            <LogOut /> 로그아웃
          </Button>
        </>
      )}
    </div>
  );
}
