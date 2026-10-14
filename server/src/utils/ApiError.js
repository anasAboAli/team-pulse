export class ApiError extends Error {
  constructor(status, message, code = 'ERROR', details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'طلب غير صالح', details) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'يجب تسجيل الدخول أولاً', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'ليس لديك صلاحية لتنفيذ هذا الإجراء', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'العنصر المطلوب غير موجود') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message, code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }

  static unprocessable(message, details) {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }
}
