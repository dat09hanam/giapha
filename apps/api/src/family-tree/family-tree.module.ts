import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { FamilyTreeController } from './family-tree.controller.js';
import { FamilyTreeService } from './family-tree.service.js';
import { PeopleController } from './people.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [FamilyTreeController, PeopleController],
  providers: [FamilyTreeService],
})
export class FamilyTreeModule {}
