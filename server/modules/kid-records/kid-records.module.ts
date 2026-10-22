import { Module } from '@nestjs/common';
import { KidRecordsController } from './kid-records.controller';
import { KidRecordsService } from './kid-records.service';
import { StarsModule } from '../stars/stars.module';

@Module({
  imports: [StarsModule],
  controllers: [KidRecordsController],
  providers: [KidRecordsService],
  exports: [KidRecordsService],
})
export class KidRecordsModule {}
