import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Trims text and turns an empty optional field into null, so "cleared" is stored as null. */
const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const trimmedOrNull = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || null : value;

const PHONE = /^\+?[0-9][0-9 .()-]{6,28}$/;
const URL_OPTIONS = { protocols: ['https', 'http'], require_protocol: true };

export class SiteContactDto {
  @Transform(trimmed)
  @IsString()
  @Matches(PHONE, { message: 'Số hotline chỉ gồm chữ số, dấu cách, dấu chấm hoặc gạch nối.' })
  @MaxLength(30)
  phone!: string;

  @IsOptional()
  @Transform(trimmedOrNull)
  @IsString()
  @Matches(PHONE, { message: 'Số Zalo chỉ gồm chữ số, dấu cách, dấu chấm hoặc gạch nối.' })
  @MaxLength(30)
  zalo?: string | null;

  @Transform(trimmed)
  @IsEmail({}, { message: 'Email liên hệ không hợp lệ.' })
  @MaxLength(191)
  email!: string;

  @Transform(trimmed)
  @IsString()
  @MinLength(2, { message: 'Địa chỉ cần ít nhất 2 ký tự.' })
  @MaxLength(200)
  address!: string;

  @Transform(trimmed)
  @IsString()
  @MinLength(2, { message: 'Giờ làm việc cần ít nhất 2 ký tự.' })
  @MaxLength(100)
  hours!: string;

  @IsOptional()
  @Transform(trimmedOrNull)
  @IsUrl(URL_OPTIONS, { message: 'Link Facebook phải là địa chỉ web đầy đủ (https://…).' })
  @MaxLength(500)
  facebookUrl?: string | null;

  @IsOptional()
  @Transform(trimmedOrNull)
  @IsUrl(URL_OPTIONS, { message: 'Link YouTube phải là địa chỉ web đầy đủ (https://…).' })
  @MaxLength(500)
  youtubeUrl?: string | null;

  @IsOptional()
  @Transform(trimmedOrNull)
  @IsUrl(URL_OPTIONS, { message: 'Link TikTok phải là địa chỉ web đầy đủ (https://…).' })
  @MaxLength(500)
  tiktokUrl?: string | null;
}
