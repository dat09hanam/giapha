import { AmbassadorStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAmbassadorDto {
  @IsString()
  @MinLength(2, { message: 'Họ và tên cần ít nhất 2 ký tự.' })
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @Matches(/^0\d{9}$/, { message: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.' })
  phone!: string;

  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @MaxLength(191)
  email!: string;

  @Equals(true, { message: 'Bạn cần đồng ý với Chính sách bảo mật và Quy định sử dụng dịch vụ.' })
  agreed!: boolean;
}

export class UpdateAmbassadorDto {
  @IsOptional()
  @IsEnum(AmbassadorStatus)
  status?: AmbassadorStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string | null;
}

export class PayCommissionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  ids!: string[];

  /** E.g. the bank transfer reference, so the payment can be traced later. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
