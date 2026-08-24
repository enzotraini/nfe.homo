export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "SEFIN_REJECTION"
  | "SEFIN_UNAVAILABLE"
  | "CERTIFICATE_ERROR"
  | "INTERNAL_ERROR";

export type AppErrorOptions = {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: unknown;
  cause?: unknown;
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
