import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RequestPlanChangeDto {
  @IsUUID()
  planId!: string;

  @IsString()
  @MinLength(2, { message: 'Họ và tên cần ít nhất 2 ký tự.' })
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @Matches(/^0\d{9}$/, { message: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.' })
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @MaxLength(191)
  email?: string;
}
