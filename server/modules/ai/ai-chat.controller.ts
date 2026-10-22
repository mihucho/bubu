import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { FamilyService } from '../family/family.service';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { AiChatService } from './ai-chat.service';
import { MemoryService } from './memory.service';
import { AiQuotaService } from './quota.service';

@NeedLogin()
@Controller('api/v2/ai')
export class AiChatController {
  constructor(
    private readonly ai: AiChatService,
    private readonly family: FamilyService,
    private readonly memory: MemoryService,
    private readonly quota: AiQuotaService,
  ) {}

  /** 额度与可用性：前端进页面先问一次，决定是能聊还是显示降级页 */
  @Get('quota')
  async getQuota(
    @Req() req: Request,
    @Query('side') side: 'kid' | 'parent' = 'kid',
    @Query('inDoubao') inDoubao = 'false',
  ) {
    const family = await this.family.ensureFamily(req.userContext.userId!);
    return this.quota.status(family.id, side, inDoubao === 'true');
  }

  @Post('chat')
  async send(
    @Req() req: Request,
    @Body()
    body: {
      childId: string;
      message: string;
      side?: 'kid' | 'parent';
      inDoubao?: boolean;
    },
  ) {
    const side = body.side ?? 'kid';
    const family = await this.family.ensureFamily(req.userContext.userId!);
    const gate = await this.quota.check({
      familyAccountId: family.id,
      childId: body.childId,
      side,
      inDoubao: body.inDoubao ?? false,
    });
    if (!gate.allowed) {
      // 三道闸都在这里兜：不在豆包内 / 今天用完 / 连点太快
      return { blocked: gate.reason, quota: gate, reply: '' };
    }
    return this.ai.reply(body.childId, body.message, side);
  }

  /** 确认卡：家长点了才落库 */
  @Post('proposal/apply')
  async apply(
    @Req() req: Request,
    @Body() body: { kind: string; payload: Record<string, unknown> },
  ) {
    const family = await this.family.ensureFamily(req.userContext.userId!);
    return this.ai.applyProposal({
      familyAccountId: family.id,
      kind: body.kind,
      payload: body.payload,
    });
  }

  @Get('history')
  async history(@Query('childId') childId: string) {
    return this.ai.history(childId);
  }

  /** 布布记住的（孩子端与家长端都能看、都能删） */
  @Get('memory')
  async memoryFacts(@Query('childId') childId: string) {
    return this.memory.facts(childId);
  }

  @Post('memory/:factId/forget')
  async forget(
    @Query('childId') childId: string,
    @Param('factId') factId: string,
  ) {
    return this.memory.forget(childId, factId);
  }
}
