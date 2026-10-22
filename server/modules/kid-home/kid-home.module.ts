import { Module } from '@nestjs/common';
import { KidHomeController } from './kid-home.controller';
import { KidHomeService } from './kid-home.service';
import { StarsModule } from '../stars/stars.module';

@Module({
  imports: [StarsModule],
  controllers: [KidHomeController],
  providers: [KidHomeService],
  exports: [KidHomeService],
})
export class KidHomeModule {}
