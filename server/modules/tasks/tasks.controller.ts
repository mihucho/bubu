import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { TasksService } from './tasks.service';
import type { Task } from '@shared/api.interface';

@NeedLogin()
@Controller('api/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async getWeekTasks(@Req() req: Request): Promise<Task[]> {
    return this.tasksService.getWeekTasks(req.userContext.userId!);
  }

  @Post(':id/checkin')
  async checkIn(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ task: Task; profile: import('@shared/api.interface').KidProfile }> {
    return this.tasksService.checkIn(req.userContext.userId!, id);
  }

  @Post('reorder')
  async reorder(
    @Req() req: Request,
    @Body() body: { ids: string[] },
  ): Promise<Task[]> {
    return this.tasksService.reorder(req.userContext.userId!, body.ids);
  }
}
