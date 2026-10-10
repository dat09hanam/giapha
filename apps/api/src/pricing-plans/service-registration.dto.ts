import { ServiceRegistrationStatus } from '@prisma/client';
import {
  Equals,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateServiceRegistrationDto {
  @IsUUID()
  planId!: string;

  @IsString()
  @MinLength(2, { message: 'Họ và tên cần ít nhất 2 ký tự.' })
  @MaxLength(100)
  fullName!: string;

  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @MaxLength(191)
  email!: string;

  @IsString()
  @Matches(/^0\d{9}$/, { message: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.' })
  phone!: string;

  @Equals(true, { message: 'Bạn cần đồng ý với Chính sách bảo mật và Quy định sử dụng dịch vụ.' })
  agreed!: boolean;
}

export class UpdateServiceRegistrationDto {
  @IsOptional()
  @IsEnum(ServiceRegistrationStatus)
  status?: ServiceRegistrationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string | null;
}
