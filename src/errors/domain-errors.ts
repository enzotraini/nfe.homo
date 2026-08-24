import { AppError } from "./app-error.js";

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super({
      code: "VALIDATION_ERROR",
      message,
      statusCode: 400,
      details,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super({
      code: "NOT_FOUND",
      message,
      statusCode: 404,
      details,
    });
  }
}

export class SefinRejectionError extends AppError {
  constructor(message: string, details?: unknown) {
    super({
      code: "SEFIN_REJECTION",
      message,
      statusCode: 422,
      details,
    });
  }
}

export class SefinUnavailableError extends AppError {
  constructor(message: string, cause?: unknown) {
    super({
      code: "SEFIN_UNAVAILABLE",
      message,
      statusCode: 502,
      cause,
    });
  }
}

export class CertificateError extends AppError {
  constructor(message: string, cause?: unknown) {
    super({
      code: "CERTIFICATE_ERROR",
      message,
      statusCode: 500,
      cause,
    });
  }
}
