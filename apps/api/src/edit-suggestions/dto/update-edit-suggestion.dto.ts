import { SuggestionStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateEditSuggestionDto {
  /** PENDING reopens a suggestion; RESOLVED and DISMISSED close it. */
  @IsEnum(SuggestionStatus)
  status!: SuggestionStatus;
}
