import { IsEmail, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class CreateAnniversaryReminderDto {
  @IsUUID()
  personId!: string;

  @IsEmail({}, { message: 'Email chưa đúng định dạng.' })
  @MaxLength(191)
  email!: string;
}

export class UnsubscribeAnniversaryReminderDto {
  @IsString()
  @Length(20, 64)
  token!: string;
}
