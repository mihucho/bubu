import { Module } from '@nestjs/common';
import { EggController } from './egg.controller';
import { EggService } from './egg.service';

@Module({
  controllers: [EggController],
  providers: [EggService],
})
export class EggModule {}
