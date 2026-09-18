export type ApiErrorKind = 'http' | 'network' | 'invalid-response' | 'unknown';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly kind: ApiErrorKind,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const ENGLISH_MESSAGE_TRANSLATIONS: Record<string, string> = {
  'Authentication is required': 'Bạn cần đăng nhập để thực hiện thao tác này.',
  'Session is invalid or expired':
    'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
  'Username or password is incorrect': 'Tên đăng nhập hoặc mật khẩu không đúng.',
  'Account is not active': 'Tài khoản đã bị khóa hoặc không còn hoạt động.',
  'Family was not found': 'Không tìm thấy dòng họ hoặc dòng họ không còn hoạt động.',
  'Person was not found': 'Không tìm thấy thành viên trong dòng họ này.',
  'Family slug is invalid':
    'Đường dẫn dòng họ không hợp lệ; chỉ dùng chữ thường, số và dấu gạch ngang.',
  'Family URL or generated username already exists':
    'Đường dẫn dòng họ hoặc tên đăng nhập được tạo tự động đã tồn tại.',
  'Too many authentication attempts':
    'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.',
};

const VIETNAMESE_CHARACTER_PATTERN =
  /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

function statusMessage(status: number, action: string): string {
  switch (status) {
    case 400:
      return `Không thể ${action} vì dữ liệu gửi lên không hợp lệ.`;
    case 401:
      return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.';
    case 403:
      return `Bạn không có quyền ${action}.`;
    case 404:
      return `Không tìm thấy dữ liệu cần thiết để ${action}.`;
    case 405:
      return `Không thể ${action} vì phương thức gọi API không được hỗ trợ.`;
    case 408:
      return `Không thể ${action} vì yêu cầu xử lý quá lâu. Vui lòng thử lại.`;
    case 409:
      return `Không thể ${action} vì dữ liệu bị trùng hoặc đã thay đổi.`;
    case 413:
      return `Không thể ${action} vì dữ liệu gửi lên vượt quá giới hạn cho phép.`;
    case 415:
      return `Không thể ${action} vì định dạng dữ liệu không được hỗ trợ.`;
    case 422:
      return `Không thể ${action} vì dữ liệu chưa thể xử lý.`;
    case 429:
      return `Không thể ${action} vì bạn thao tác quá nhanh. Vui lòng thử lại sau.`;
    case 500:
      return `Không thể ${action} vì hệ thống gặp lỗi. Vui lòng thử lại sau.`;
    case 502:
      return `Không thể ${action} vì máy chủ trung gian nhận phản hồi không hợp lệ.`;
    case 503:
      return `Không thể ${action} vì dịch vụ đang tạm thời gián đoạn.`;
    case 504:
      return `Không thể ${action} vì máy chủ phản hồi quá lâu.`;
    default:
      return `Không thể ${action} vì máy chủ trả về mã lỗi ${status}.`;
  }
}

function messagesFromBody(body: unknown): string[] {
  if (typeof body === 'string') return [body];
  if (typeof body !== 'object' || body === null || !('message' in body)) return [];

  const message = body.message;
  if (typeof message === 'string') return [message];
  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === 'string');
  }

  return [];
}

function translateLegacyValidation(message: string): string | null {
  const property = /^property (.+) should not exist$/i.exec(message)?.[1];
  if (property) return `Trường ${property} không được hệ thống hỗ trợ.`;

  const minLength = /^(\w+) must be longer than or equal to (\d+) characters$/i.exec(message);
  if (minLength) return `Trường ${minLength[1]} phải có ít nhất ${minLength[2]} ký tự.`;

  const maxLength = /^(\w+) must be shorter than or equal to (\d+) characters$/i.exec(message);
  if (maxLength) return `Trường ${maxLength[1]} không được vượt quá ${maxLength[2]} ký tự.`;

  const stringField = /^(\w+) must be a string$/i.exec(message)?.[1];
  if (stringField) return `Trường ${stringField} phải là văn bản.`;

  return null;
}

function localizeMessage(message: string, status: number, action: string): string {
  const trimmed = message.trim();
  const translated = ENGLISH_MESSAGE_TRANSLATIONS[trimmed] ?? translateLegacyValidation(trimmed);
  if (translated) return translated;

  return VIETNAMESE_CHARACTER_PATTERN.test(trimmed) ? trimmed : statusMessage(status, action);
}

async function responseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiFetch<T>(url: string, init: RequestInit, action: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiRequestError(
        `Không thể ${action} vì yêu cầu đã hết thời gian chờ. Vui lòng thử lại.`,
        null,
        'network',
      );
    }

    throw new ApiRequestError(
      `Không thể kết nối đến máy chủ để ${action}. Hãy kiểm tra kết nối mạng và thử lại.`,
      null,
      'network',
    );
  }

  const body = await responseBody(response);

  if (!response.ok) {
    const localizedMessages = [
      ...new Set(
        messagesFromBody(body).map((message) => localizeMessage(message, response.status, action)),
      ),
    ];
    throw new ApiRequestError(
      localizedMessages.length > 0
        ? localizedMessages.join(' ')
        : statusMessage(response.status, action),
      response.status,
      'http',
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (body === null) {
    throw new ApiRequestError(
      `Máy chủ không trả về dữ liệu cần thiết để ${action}.`,
      response.status,
      'invalid-response',
    );
  }

  return body as T;
}

export function getApiErrorMessage(error: unknown, action: string): string {
  if (error instanceof ApiRequestError) return error.message;

  if (error instanceof Error && VIETNAMESE_CHARACTER_PATTERN.test(error.message)) {
    return error.message;
  }

  return `Không thể ${action} do lỗi không xác định. Vui lòng thử lại.`;
}
