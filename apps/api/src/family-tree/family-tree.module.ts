import { Module } from '@nestjs/common';

import { FamilyTreeController } from './family-tree.controller.js';
import { FamilyTreeService } from './family-tree.service.js';

@Module({
  controllers: [FamilyTreeController],
  providers: [FamilyTreeService],
})
export class FamilyTreeModule {}
