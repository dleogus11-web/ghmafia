export const rand = (n: number) => Math.floor(Math.random() * n);

export const pickOne = <T>(a: readonly T[]): T => a[rand(a.length)];

export function shuffle<T>(input: readonly T[]): T[] {
  const a = input.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 짧은 id (플레이어 id 등) */
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** 추측하기 어려운 무작위 문자열(실시간 우편함 이름 등) */
export function secret(n: number, alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'): string {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => alphabet[x % alphabet.length]).join('');
}

/** 6자리 방 코드 */
export const roomCode = () => String(100000 + rand(900000));
