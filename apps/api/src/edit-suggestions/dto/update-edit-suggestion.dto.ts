import { SuggestionStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateEditSuggestionDto {
  @IsEnum(SuggestionStatus)
  status!: SuggestionStatus;
}
