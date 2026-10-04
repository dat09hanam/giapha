import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { EditSuggestionsController } from './edit-suggestions.controller.js';
import { EditSuggestionsService } from './edit-suggestions.service.js';

@Module({
  imports: [AuthModule],
  controllers: [EditSuggestionsController],
  providers: [EditSuggestionsService],
})
export class EditSuggestionsModule {}
