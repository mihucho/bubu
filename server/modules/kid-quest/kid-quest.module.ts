import { Module } from '@nestjs/common';
import { KidQuestController } from './kid-quest.controller';
import { KidBadgeService, KidQuestService, MessageService } from './kid-quest.service';
import { StarsModule } from '../stars/stars.module';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [StarsModule, FamilyModule],
  controllers: [KidQuestController],
  providers: [KidQuestService, KidBadgeService, MessageService],
  exports: [KidQuestService, KidBadgeService, MessageService],
})
export class KidQuestModule {}
