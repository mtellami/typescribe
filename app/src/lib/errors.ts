import type { ApiErrorResponse } from './contracts';

export type ErrorCode = ApiErrorResponse['error']['code'];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
