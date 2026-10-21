import { Module } from '@nestjs/common';
import { KidController } from './kid.controller';
import { KidService } from './kid.service';

@Module({
  controllers: [KidController],
  providers: [KidService],
})
export class KidModule {}
