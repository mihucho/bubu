import { Module } from '@nestjs/common';
import { KidTasksController } from './kid-tasks.controller';
import { KidTasksService } from './kid-tasks.service';
import { StarsModule } from '../stars/stars.module';

@Module({
  imports: [StarsModule],
  controllers: [KidTasksController],
  providers: [KidTasksService],
  exports: [KidTasksService],
})
export class KidTasksModule {}
