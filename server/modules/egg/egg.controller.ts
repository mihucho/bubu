import {
  Controller,
  Get,
  Post,
  Param,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { EggService } from './egg.service';
import type { EggTask } from '@shared/api.interface';

@NeedLogin()
@Controller('api/egg')
export class EggController {
  constructor(private readonly eggService: EggService) {}

  @Get('today')
  async getTodayTasks(@Req() req: Request): Promise<EggTask[]> {
    return this.eggService.getTodayTasks(req.userContext.userId!);
  }

  @Post(':id/complete')
  async completeTask(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ task: EggTask; profile: import('@shared/api.interface').KidProfile }> {
    return this.eggService.completeTask(req.userContext.userId!, id);
  }
}
