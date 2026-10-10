import { IsString, MaxLength, MinLength } from 'class-validator';

export const MAX_SUGGESTION_CONTENT_LENGTH = 2000;

export class CreateEditSuggestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  proposerName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(MAX_SUGGESTION_CONTENT_LENGTH)
  content!: string;
}
