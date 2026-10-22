import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { KidTasksService, type CheckinResult } from './kid-tasks.service';

@NeedLogin()
@Controller('api/v2')
export class KidTasksController {
  constructor(private readonly tasks: KidTasksService) {}

  /** 孩子打卡（+1） */
  @Post('tasks/:taskId/checkin')
  async checkin(
    @Param('taskId') taskId: string,
    @Body() body: { childId: string; note?: string; media?: unknown[]; idempotencyKey?: string },
  ): Promise<CheckinResult> {
    return this.tasks.checkin({
      childId: body.childId,
      taskId,
      note: body.note,
      media: body.media,
      idempotencyKey: body.idempotencyKey,
    });
  }

  /** 家长确认 */
  @Post('checkins/:checkinId/confirm')
  async confirm(
    @Req() req: Request,
    @Param('checkinId') checkinId: string,
    @Body() body: { childId: string },
  ): Promise<CheckinResult> {
    return this.tasks.confirm(body.childId, checkinId, req.userContext.userId);
  }

  /** 家长驳回 */
  @Post('checkins/:checkinId/reject')
  async reject(@Param('checkinId') checkinId: string, @Body() body: { childId: string }) {
    return this.tasks.reject(body.childId, checkinId);
  }

  /** 待确认列表 */
  @Get('checkins/pending')
  async pending(@Query('childId') childId: string) {
    return this.tasks.listPending(childId);
  }
}
