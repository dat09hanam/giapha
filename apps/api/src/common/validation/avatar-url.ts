/**
 * An avatar is either an absolute URL kept from an external source, or a path
 * produced by our own media upload (`/media/<uuid>.<ext>`).
 */
export const AVATAR_URL_PATTERN =
  /^(?:https?:\/\/\S+|\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp))$/;

export const AVATAR_URL_MESSAGE =
  'Ảnh đại diện phải là ảnh đã tải lên hoặc một đường dẫn bắt đầu bằng http:// hoặc https://.';
