import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[460px] flex-col gap-4 pt-[10vh]">
      <Card>
        <h1 className="text-[2rem]">페이지를 찾을 수 없어요</h1>
        <Button asChild variant="default" className="self-start">
          <Link to="/">처음으로</Link>
        </Button>
      </Card>
    </main>
  );
}
