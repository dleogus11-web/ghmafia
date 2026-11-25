import type { ReactNode } from 'react';
import type { TeamId } from '@/types';
import { Badge } from '@/components/ui/badge';

export function TeamBadge({ team, children }: { team: TeamId | null; children: ReactNode }) {
  const variant = team === 'mafia' ? 'mafia' : team === 'rat' ? 'rat' : team === 'citizen' ? 'citizen' : 'default';
  return <Badge variant={variant}>{children}</Badge>;
}
