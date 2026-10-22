import { Module } from '@nestjs/common';
import { StarsService } from './stars.service';

/**
 * 星星模块：全局唯一写入口。
 * 其他模块注入 `StarsService` 即可，禁止自行 UPDATE `child_profiles.available_stars`。
 */
@Module({
  providers: [StarsService],
  exports: [StarsService],
})
export class StarsModule {}
