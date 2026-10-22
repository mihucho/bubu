import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { MemoryService } from './memory.service';
import { AiQuotaService } from './quota.service';
import { ParentModule } from '../parent/parent.module';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [ParentModule, FamilyModule],
  controllers: [AiChatController],
  providers: [AiChatService, MemoryService, AiQuotaService],
  exports: [AiChatService, MemoryService, AiQuotaService],
})
export class AiChatModule {}
