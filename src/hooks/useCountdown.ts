import { useEffect, useState } from 'react';
import { formatCountdown } from '@/lib/utils';

/** 종료 시각(ms)까지 남은 시간을 mm:ss 로, 1초마다 갱신 */
export function useCountdown(endMs: number | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endMs) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [endMs]);
  return formatCountdown(endMs, now);
}
