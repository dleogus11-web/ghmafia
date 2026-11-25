/* 브라우저 저장소 래퍼 — 사용할 수 없는 환경(사파리 비공개 모드, 테스트)에서는 메모리로 대체 */

export interface KeyValueStore {
  get<T>(key: string): T | null;
  set(key: string, value: unknown): void;
  del(key: string): void;
}

function make(kind: 'localStorage' | 'sessionStorage'): KeyValueStore {
  const mem = new Map<string, string>();
  const backend = (): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> => {
    try {
      const s = (globalThis as unknown as Record<string, Storage | undefined>)[kind];
      if (s) return s;
    } catch {
      /* 접근 차단 */
    }
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => void mem.set(k, v),
      removeItem: (k) => void mem.delete(k),
    };
  };
  return {
    get<T>(key: string): T | null {
      try {
        const raw = backend().getItem(key);
        return raw == null ? null : (JSON.parse(raw) as T);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        backend().setItem(key, JSON.stringify(value));
      } catch {
        /* 용량 초과 등 */
      }
    },
    del(key) {
      try {
        backend().removeItem(key);
      } catch {
        /* noop */
      }
    },
  };
}

export const localStore = make('localStorage');
export const sessionStore = make('sessionStorage');
