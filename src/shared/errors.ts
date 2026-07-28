export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'PRODUCT_NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'RESERVATION_NOT_FOUND'
  | 'INSUFFICIENT_STOCK'
  | 'DUPLICATE_IDEMPOTENCY_KEY'
  | 'STATE_CONFLICT'
  | 'INTERNAL_ERROR';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  PRODUCT_NOT_FOUND: 404,
  ORDER_NOT_FOUND: 404,
  RESERVATION_NOT_FOUND: 404,
  INSUFFICIENT_STOCK: 409,
  DUPLICATE_IDEMPOTENCY_KEY: 409,
  STATE_CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}
