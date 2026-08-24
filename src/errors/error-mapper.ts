import { ZodError } from "zod";
import { AppError, isAppError } from "./app-error.js";

export type ErrorResponseBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type MappedError = {
  statusCode: number;
  body: ErrorResponseBody;
};

export function mapErrorToHttp(error: unknown): MappedError {
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Parâmetros inválidos",
          details: error.issues,
        },
      },
    };
  }

  if (isAppError(error)) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro interno do servidor",
      },
    },
  };
}

export function toLoggableError(error: unknown): Record<string, unknown> {
  if (isAppError(error)) {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      cause: serializeUnknown(error.cause),
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: serializeUnknown(error.cause),
    };
  }

  return { value: serializeUnknown(error) };
}

function serializeUnknown(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  return value;
}

export function assertNever(_value: never): AppError {
  return new AppError({
    code: "INTERNAL_ERROR",
    message: "Estado inesperado",
    statusCode: 500,
  });
}
