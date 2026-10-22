import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { KidHomeService } from './kid-home.service';
import { StarsService } from '../stars/stars.service';
import type { KidHomeDto } from '@shared/api.interface';

@NeedLogin()
@Controller('api/v2/kid')
export class KidHomeController {
  constructor(
    private readonly home: KidHomeService,
    private readonly stars: StarsService,
  ) {}

  /** 孩子端首页全部数据（一次取完，避免多请求闪烁） */
  @Get('home')
  async getHome(@Query('childId') childId: string): Promise<KidHomeDto> {
    if (!childId) throw new BadRequestException('CHILD_ID_REQUIRED');
    return this.home.getHome(childId);
  }

  /** 星星余额（对账用：可比较缓存与流水） */
  @Get(':childId/stars')
  async getStars(@Param('childId') childId: string) {
    const balance = await this.stars.balance(childId);
    return { childId, balance };
  }

  /** 用流水重算余额 —— 家长端「对账」按钮用 */
  @Post(':childId/stars/recompute')
  async recompute(@Param('childId') childId: string) {
    return this.stars.recomputeBalance(childId);
  }

  /** 补发星星（家长手动奖励；必须走 ledger） */
  @Post(':childId/stars/grant')
  async grant(
    @Req() req: Request,
    @Param('childId') childId: string,
    @Body() body: { familyAccountId: string; amount: number; title?: string; idempotencyKey?: string },
  ) {
    return this.stars.grant({
      childId,
      familyAccountId: body.familyAccountId,
      amount: body.amount,
      reason: 'parent_note',
      title: body.title,
      idempotencyKey: body.idempotencyKey,
    });
  }
}
