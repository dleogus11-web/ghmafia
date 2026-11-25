export type ServiceErrorCode = 'config' | 'network' | 'unauthorized' | 'unknown';

/** services 레이어가 던지는 공통 에러. UI 는 code 로만 분기합니다. */
export class ServiceError extends Error {
  constructor(public code: ServiceErrorCode, message: string) {
    super(message);
    this.name = 'ServiceError';
  }
}

export const serviceErrorCode = (e: unknown): ServiceErrorCode =>
  e instanceof ServiceError ? e.code : 'unknown';
