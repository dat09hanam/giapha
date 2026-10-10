import { IsBase64, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

const MAX_BASE64_LENGTH = 3_000_000;

export class UploadFamilyMediaDto {
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(MAX_BASE64_LENGTH)
  @IsBase64()
  data!: string;
}
