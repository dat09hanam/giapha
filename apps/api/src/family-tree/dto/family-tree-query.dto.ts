import { IsOptional, Matches } from 'class-validator';

export class FamilyTreeQueryDto {
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  family?: string;
}
