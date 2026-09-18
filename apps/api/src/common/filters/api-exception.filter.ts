import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

type ErrorPayload = {
  statusCode: number;
  message: string | string[];
};

const STATUS_MESSAGES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Dữ liệu gửi lên không hợp lệ.',
  [HttpStatus.UNAUTHORIZED]: 'Bạn cần đăng nhập hoặc phiên đăng nhập đã hết hạn.',
  [HttpStatus.FORBIDDEN]: 'Bạn không có quyền thực hiện thao tác này.',
  [HttpStatus.NOT_FOUND]: 'Không tìm thấy tài nguyên được yêu cầu.',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'Phương thức gọi API không được hỗ trợ.',
  [HttpStatus.REQUEST_TIMEOUT]: 'Yêu cầu xử lý quá lâu. Vui lòng thử lại.',
  [HttpStatus.CONFLICT]: 'Dữ liệu bị trùng hoặc xung đột với dữ liệu hiện có.',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'Dữ liệu gửi lên vượt quá giới hạn cho phép.',
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'Định dạng dữ liệu gửi lên không được hỗ trợ.',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Dữ liệu gửi lên chưa thể xử lý.',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Hệ thống gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.',
  [HttpStatus.BAD_GATEWAY]: 'Máy chủ trung gian không nhận được phản hồi hợp lệ.',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Dịch vụ đang tạm thời gián đoạn. Vui lòng thử lại sau.',
  [HttpStatus.GATEWAY_TIMEOUT]: 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.',
};

const MESSAGE_TRANSLATIONS: Record<string, string> = {
  'Bad Request': STATUS_MESSAGES[HttpStatus.BAD_REQUEST]!,
  Unauthorized: STATUS_MESSAGES[HttpStatus.UNAUTHORIZED]!,
  Forbidden: STATUS_MESSAGES[HttpStatus.FORBIDDEN]!,
  'Not Found': STATUS_MESSAGES[HttpStatus.NOT_FOUND]!,
  'Internal server error': STATUS_MESSAGES[HttpStatus.INTERNAL_SERVER_ERROR]!,
  'Validation failed (uuid is expected)': 'Mã định danh phải đúng định dạng UUID.',
};

const VIETNAMESE_CHARACTER_PATTERN =
  /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

function fallbackMessage(status: number): string {
  return STATUS_MESSAGES[status] ?? `Yêu cầu không thành công do máy chủ trả về mã lỗi ${status}.`;
}

function extractMessages(exception: unknown): { status: number; messages: string[] } {
  if (!(exception instanceof HttpException)) {
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, messages: [] };
  }

  const status = exception.getStatus();
  const response: unknown = exception.getResponse();

  if (typeof response === 'string') {
    return { status, messages: [response] };
  }

  if (typeof response === 'object' && response !== null && 'message' in response) {
    const message = response.message;
    if (typeof message === 'string') {
      return { status, messages: [message] };
    }
    if (Array.isArray(message)) {
      return {
        status,
        messages: message.filter((item): item is string => typeof item === 'string'),
      };
    }
  }

  return { status, messages: [] };
}

function localizeMessage(message: string, status: number): string {
  const trimmed = message.trim();
  const translated = MESSAGE_TRANSLATIONS[trimmed];
  if (translated) return translated;

  if (/^Cannot (GET|POST|PATCH|PUT|DELETE) /i.test(trimmed)) {
    return 'Không tìm thấy API được yêu cầu.';
  }

  if (/uuid/i.test(trimmed) && /valid|expected|failed/i.test(trimmed)) {
    return 'Mã định danh phải đúng định dạng UUID.';
  }

  return VIETNAMESE_CHARACTER_PATTERN.test(trimmed) ? trimmed : fallbackMessage(status);
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const { status, messages } = extractMessages(exception);
    const localized = [
      ...new Set(
        (messages.length > 0 ? messages : [fallbackMessage(status)]).map((message) =>
          localizeMessage(message, status),
        ),
      ),
    ];

    const payload: ErrorPayload = {
      statusCode: status,
      message: localized.length === 1 ? localized[0]! : localized,
    };

    void response.status(status).send(payload);
  }
}
