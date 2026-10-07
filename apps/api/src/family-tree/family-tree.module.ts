import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DemoFamilyController } from './demo-family.controller.js';
import { DemoFamilyService } from './demo-family.service.js';
import { FamilyTreeController } from './family-tree.controller.js';
import { FamilyTreeService } from './family-tree.service.js';
import { PeopleController } from './people.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [FamilyTreeController, PeopleController, DemoFamilyController],
  providers: [FamilyTreeService, DemoFamilyService],
})
export class FamilyTreeModule {}
