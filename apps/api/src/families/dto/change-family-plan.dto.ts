import { IsUUID } from 'class-validator';

export class ChangeFamilyPlanDto {
  @IsUUID('all', { message: 'Hãy chọn gói dịch vụ.' })
  planId!: string;
}
