import { IsEmail, MaxLength } from 'class-validator';

export class ChangeClanHeadEmailDto {
  @IsEmail({}, { message: 'Email Trưởng họ không hợp lệ.' })
  @MaxLength(191)
  email!: string;
}
