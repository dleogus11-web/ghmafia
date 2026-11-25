import { useEffect, useState, type FormEvent } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Msg } from '@/components/common/StatusCards';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { isMock } from '@/lib/env';

export default function LoginPage() {
  useTimeOfDay('day');
  const { login, signup, isAuthenticated } = useAuth();
  const router = useRouter();
  const rawFrom = new URLSearchParams(window.location.search).get('from') ?? '';
  const from = rawFrom.startsWith('/host') ? rawFrom : '/host';
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.history.replace(from);
  }, [isAuthenticated, from, router]);
  if (isAuthenticated) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = mode === 'signin' ? await login({ email, password }) : await signup({ email, password, displayName: displayName.trim() || undefined });
      if (!r.ok) setMsg({ text: r.message, error: true });
      else if (r.needsEmailConfirm) setMsg({ text: '가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.', error: false });
      else router.history.replace(from);
    } catch {
      setMsg({ text: '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.', error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[460px] flex-col gap-4 pt-[6vh]">
      <Link to="/" className="font-display text-lg">
        ← 교실 마피아
      </Link>
      <Card>
        <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)}>
          <h1 className="text-[1.8rem]">{mode === 'signin' ? '선생님 로그인' : '선생님 가입'}</h1>
          {mode === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dname">표시 이름 (선택)</Label>
              <Input id="dname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="예: 6-2 담임" />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pw">비밀번호</Label>
            <Input
              id="pw"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {msg && <Msg error={msg.error}>{msg.text}</Msg>}
          <Button type="submit" variant="default" size="lg" disabled={busy}>
            {busy ? '처리 중…' : mode === 'signin' ? '로그인' : '가입하기'}
          </Button>
          <Button type="button" variant="link" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? '처음이신가요? 가입하기' : '이미 계정이 있어요 · 로그인'}
          </Button>
          {isMock && <p className="text-sm text-muted-foreground">목업 모드: 아무 이메일과 4자 이상 비밀번호로 로그인돼요.</p>}
        </form>
      </Card>
    </main>
  );
}
