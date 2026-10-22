import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { FamilyService } from '../family/family.service';
import {
  ParentRecordsService,
  ParentReportService,
  ParentService,
  ParentTasksService,
  ParentWishesService,
  type ParentOverviewDto,
} from './parent.service';

@NeedLogin()
@Controller('api/v2/parent')
export class ParentController {
  constructor(
    private readonly parent: ParentService,
    private readonly tasks: ParentTasksService,
    private readonly wishes: ParentWishesService,
    private readonly reports: ParentReportService,
    private readonly records: ParentRecordsService,
    private readonly family: FamilyService,
  ) {}

  private async familyId(req: Request): Promise<string> {
    const family = await this.family.ensureFamily(req.userContext.userId!);
    return family.id;
  }

  /** 概览：孩子并列卡片 + 待我处理 + 待定价心愿（不含任何排名） */
  @Get('overview')
  async overview(@Req() req: Request): Promise<ParentOverviewDto> {
    return this.parent.overview(await this.familyId(req));
  }

  /* ---------- 任务 ---------- */
  @Get('tasks')
  async listTasks(@Query('childId') childId: string) {
    return this.tasks.listTasks(childId);
  }

  @Post('tasks')
  async createTask(
    @Req() req: Request,
    @Body()
    body: {
      childId: string;
      name: string;
      cycleType?: string;
      cycleTarget?: number;
      starReward?: number;
      photoRequired?: boolean;
      needConfirm?: boolean;
    },
  ) {
    return this.tasks.createTask(await this.familyId(req), body);
  }

  @Post('tasks/:taskId/active')
  async setActive(
    @Param('taskId') taskId: string,
    @Body() body: { childId: string; isActive: boolean },
  ) {
    return this.tasks.setActive(body.childId, taskId, body.isActive);
  }

  /* ---------- 心愿 ---------- */
  @Get('wishes')
  async listWishes(@Req() req: Request) {
    return this.wishes.list(await this.familyId(req));
  }

  @Post('wishes/:wishId/price')
  async priceWish(
    @Param('wishId') wishId: string,
    @Body() body: { childId: string; starCost: number; note?: string },
  ) {
    return this.wishes.price(body.childId, wishId, body.starCost, body.note);
  }

  @Post('wishes/:wishId/defer')
  async deferWish(
    @Param('wishId') wishId: string,
    @Body() body: { childId: string; reason: string },
  ) {
    return this.wishes.defer(body.childId, wishId, body.reason);
  }

  /* ---------- 报告 ---------- */
  @Get('reports')
  async listReports(@Req() req: Request) {
    return this.reports.list(await this.familyId(req));
  }

  @Post('reports')
  async ensureReport(
    @Req() req: Request,
    @Body() body: { childId: string; rangeType?: '7d' | '30d' },
  ) {
    return this.reports.ensure({
      familyAccountId: await this.familyId(req),
      childId: body.childId,
      rangeType: body.rangeType,
    });
  }

  /* ---------- 记录 ---------- */
  @Get('records/month')
  async month(@Query('childId') childId: string, @Query('month') month: string) {
    return this.records.month(childId, month);
  }

  @Get('records/day')
  async day(@Query('childId') childId: string, @Query('date') date: string) {
    return this.records.day(childId, date);
  }

  /* ---------- 孩子 ---------- */
  @Get('children')
  async children(@Req() req: Request) {
    return this.family.listChildren(await this.familyId(req));
  }
}
