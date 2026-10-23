import { IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

/** An empty string clears the field. */
export class ChangeClanHeadContactDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @ValidateIf((input: ChangeClanHeadContactDto) => input.phone !== '')
  @Matches(/^0\d{9}$/, { message: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.' })
  phone!: string;
}
