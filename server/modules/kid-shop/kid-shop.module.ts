import { Module } from '@nestjs/common';
import { KidShopController } from './kid-shop.controller';
import { KidShopService } from './kid-shop.service';
import { StarsModule } from '../stars/stars.module';

@Module({
  imports: [StarsModule],
  controllers: [KidShopController],
  providers: [KidShopService],
  exports: [KidShopService],
})
export class KidShopModule {}
