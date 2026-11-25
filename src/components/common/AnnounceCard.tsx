import type { Announcement } from '@/types';
import { Card } from '@/components/ui/card';

/** 학생 화면·교사 화면에 똑같이 보이는 안내 */
export function AnnounceCard({ announce, eyebrow }: { announce: Announcement | null; eyebrow?: string }) {
  if (!announce) return null;
  return (
    <Card className="gap-1.5" aria-live="polite">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h2 className="text-[1.45rem]">{announce.title}</h2>
      {announce.lines.map((l, i) => (
        <p key={i} className="text-[1.02rem]">
          {l}
        </p>
      ))}
    </Card>
  );
}
